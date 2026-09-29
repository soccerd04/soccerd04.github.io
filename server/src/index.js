import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLensGuidance, CAPABILITIES, IMPLEMENTATIONS, SECTORS } from "./knowledge.js";

loadEnvFile(join(dirname(fileURLToPath(import.meta.url)), "..", ".env"));

const PORT = Number(process.env.PORT) || 8787;
const DEFAULT_OPENAI_MODEL = "azure.gpt-4.1-nano";
const DEFAULT_OPENAI_API_URL =
  "https://genai-sharedservice-americas.pwcinternal.com/v1/chat/completions";
const DEFAULT_WORKERS_AI_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const MAX_TEXT_LENGTH = 24_000;
const MAX_BODY_BYTES = 8_000_000;

const ALLOWED_ORIGINS = new Set([
  "https://soccerd04.github.io",
]);

const SYSTEM_PROMPT =
  "You are a meticulous document reviewer. Use only the supplied reference as factual truth.";

const FACT_CHECK_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "A concise summary of the review.",
    },
    verdict: {
      type: "string",
      enum: ["pass", "issues_found"],
    },
    annotations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim: { type: "string" },
          classification: {
            type: "string",
            enum: ["grounded", "inferred", "unsupported"],
          },
          explanation: { type: "string" },
          reference_quote: { type: "string" },
          area: {
            type: "string",
            description:
              "The capability, sector, implementation type, or 'General' that this issue belongs to.",
          },
        },
        required: [
          "claim",
          "classification",
          "explanation",
          "reference_quote",
          "area",
        ],
        additionalProperties: false,
      },
    },
    action_items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          action: { type: "string" },
          priority: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
          rationale: { type: "string" },
        },
        required: ["action", "priority", "rationale"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "verdict", "annotations", "action_items"],
  additionalProperties: false,
};

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && !isAllowedOrigin(origin)) {
    sendJson(res, 403, { error: "Origin is not allowed." });
    return;
  }

  applyCors(res, origin);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      const provider = resolveProvider();
      sendJson(res, 200, {
        ok: true,
        provider: provider || "none",
        model: provider ? resolveModel(provider) : null,
        ready: Boolean(provider),
        sectors: Object.keys(SECTORS).length,
        capabilities: Object.keys(CAPABILITIES).length,
        implementations: Object.keys(IMPLEMENTATIONS).length,
      });
      return;
    }

    if (req.method !== "POST" || url.pathname !== "/api/fact-check") {
      sendJson(res, 404, { error: "Not found." });
      return;
    }

    const rawBody = await readBody(req, MAX_BODY_BYTES);
    let body;
    try {
      body = JSON.parse(rawBody);
    } catch {
      sendJson(res, 400, { error: "Request body must be valid JSON." });
      return;
    }

    const rawReference = String(body?.reference ?? "").trim();
    const rawDeliverable = String(body?.deliverable ?? "").trim();

    if (!rawReference || !rawDeliverable) {
      sendJson(res, 400, {
        error:
          "Both the reference material and the document to check are required.",
      });
      return;
    }

    const provider = resolveProvider();
    if (!provider) {
      sendJson(res, 500, {
        error:
          "No AI provider is configured. Copy server/.env.example to server/.env and set either CLOUDFLARE_API_TOKEN (with CLOUDFLARE_ACCOUNT_ID) or OPENAI_API_KEY.",
      });
      return;
    }

    const sector = SECTORS[body?.sector] ? body.sector : null;
    const capability = CAPABILITIES[body?.capability]
      ? body.capability
      : null;
    const implementations = Array.isArray(body?.implementations)
      ? body.implementations
          .filter((key) => Boolean(IMPLEMENTATIONS[key]))
          .slice(0, 8)
      : [];

    const reference = rawReference.slice(0, MAX_TEXT_LENGTH);
    const deliverable = rawDeliverable.slice(0, MAX_TEXT_LENGTH);
    const truncated = {
      reference: rawReference.length > MAX_TEXT_LENGTH,
      deliverable: rawDeliverable.length > MAX_TEXT_LENGTH,
    };

    const prompt = buildPrompt({
      reference,
      deliverable,
      sector,
      capability,
      implementations,
    });
    const parsed =
      provider === "openai"
        ? await runOpenAI(prompt)
        : await runCloudflare(prompt);

    sendJson(res, 200, {
      summary: String(parsed.summary || ""),
      verdict: parsed.verdict === "pass" ? "pass" : "issues_found",
      annotations: normalizeAnnotations(parsed.annotations),
      action_items: normalizeActionItems(parsed.action_items),
      provider,
      model: resolveModel(provider),
      truncated,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The review failed.";
    sendJson(res, 502, { error: message });
  }
});

server.listen(PORT, () => {
  console.log(`CheckThat API listening on http://localhost:${PORT}`);
});

// Cloudflare needs no OpenAI billing, so it is preferred until an OpenAI key exists.
function resolveProvider() {
  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }
  if (process.env.CLOUDFLARE_API_TOKEN && process.env.CLOUDFLARE_ACCOUNT_ID) {
    return "cloudflare";
  }
  return null;
}

function resolveModel(provider) {
  return provider === "openai"
    ? process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL
    : process.env.WORKERS_AI_MODEL || DEFAULT_WORKERS_AI_MODEL;
}

// A failed fetch here is usually a corporate proxy or VPN, not a bad key.
async function postJson(url, headers, body, label) {
  try {
    return await fetch(url, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    throw new Error(
      `Could not reach ${label}. This is usually a VPN, proxy, or firewall blocking the connection rather than a problem with your key. (${
        error instanceof Error ? error.message : "fetch failed"
      })`
    );
  }
}

async function runCloudflare(prompt) {
  const model = process.env.WORKERS_AI_MODEL || DEFAULT_WORKERS_AI_MODEL;
  const response = await postJson(
    `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`,
    { Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}` },
    {
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: FACT_CHECK_SCHEMA,
      },
      max_tokens: 2000,
    },
    "Cloudflare Workers AI"
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    const detail =
      payload?.errors?.[0]?.message || response.statusText || "unknown error";
    throw new Error(`Cloudflare Workers AI request failed: ${detail}`);
  }

  let parsed = payload?.result?.response;
  if (typeof parsed === "string") {
    parsed = JSON.parse(parsed);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Cloudflare Workers AI returned an empty response.");
  }

  return parsed;
}

async function runOpenAI(prompt) {
  const authHeader = process.env.AI_AUTH_HEADER || "Authorization";
  const authScheme =
    process.env.AI_AUTH_SCHEME === undefined
      ? "Bearer"
      : process.env.AI_AUTH_SCHEME.trim();
  const authValue = authScheme
    ? `${authScheme} ${process.env.OPENAI_API_KEY}`
    : process.env.OPENAI_API_KEY;

  const response = await postJson(
    process.env.OPENAI_API_URL || DEFAULT_OPENAI_API_URL,
    {
      [authHeader]: authValue,
    },
    {
      model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      messages: [
        {
          role: "user",
          content: `${SYSTEM_PROMPT}\n\n${prompt}`,
        },
      ],
    },
    "the PwC GenAI Shared Service"
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      `OpenAI request failed: ${payload?.error?.message || response.statusText}`
    );
  }

  const raw = payload?.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI returned an empty response.");
  }

  return parseModelJson(raw);
}

function buildPrompt({ reference, deliverable, sector, capability, implementations }) {
  return `Fact-check the document under review against the trusted reference material.

Compare the document to the reference only. Do not use outside knowledge as if it were a source of truth.

Flag an issue when the document:
- contradicts the reference
- invents names, dates, fees, scope, SLAs, or commitments not in the reference
- restates a fact incorrectly
- presents speculation as a confirmed fact

Do not flag style, tone, missing polish, or reasonable synthesis that stays faithful to the reference.

Return only valid JSON with this exact shape:
{
  "summary": "concise review summary",
  "verdict": "pass" or "issues_found",
  "annotations": [
    {
      "claim": "an exact, verbatim substring copied from the document under review",
      "classification": "grounded", "inferred", or "unsupported",
      "explanation": "brief reason for the classification",
      "reference_quote": "the exact supporting or contradicting reference excerpt; use Not found in reference when absent",
      "area": "the most relevant selected lens, or General"
    }
  ],
  "action_items": [
    {
      "action": "short, specific next step beginning with a verb",
      "priority": "high", "medium", or "low",
      "rationale": "why this action matters"
    }
  ]
}

Classify each distinct factual claim in the document, up to 30 claims:
- grounded: directly supported by the reference
- inferred: plausible or reasonably inferred, but not stated directly
- unsupported: contradicted by the reference or not supported enough to present as fact

The "claim" must be copied exactly from the document so it can be highlighted. Never paraphrase it.
Create 0 to 5 action items, proportional to the work needed. Focus actions on unsupported and inferred claims. Do not create busywork when everything is grounded.

For each annotation, set "area" to the most relevant sector, capability, or implementation lens listed below, or "General" when none applies.${buildLensGuidance(
    sector,
    capability,
    implementations
  )}

TRUSTED REFERENCE MATERIAL:
${reference}

DOCUMENT UNDER REVIEW:
${deliverable}`;
}

function normalizeAnnotations(annotations) {
  if (!Array.isArray(annotations)) {
    return [];
  }

  return annotations
    .slice(0, 30)
    .map((annotation) => ({
      claim: String(annotation?.claim || ""),
      classification: ["grounded", "inferred", "unsupported"].includes(
        annotation?.classification
      )
        ? annotation.classification
        : "unsupported",
      explanation: String(annotation?.explanation || ""),
      reference_quote: String(
        annotation?.reference_quote || "Not found in reference."
      ),
      area: String(annotation?.area || "General"),
    }))
    .filter((annotation) => annotation.claim);
}

function normalizeActionItems(items) {
  if (!Array.isArray(items)) {
    return [];
  }

  return items
    .slice(0, 5)
    .map((item) => ({
      action: String(item?.action || ""),
      priority: ["high", "medium", "low"].includes(item?.priority)
        ? item.priority
        : "medium",
      rationale: String(item?.rationale || ""),
    }))
    .filter((item) => item.action);
}

function parseModelJson(raw) {
  const trimmed = String(raw).trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    return JSON.parse(withoutFence);
  } catch {
    throw new Error(
      "The AI service returned text instead of the expected JSON response."
    );
  }
}

function isAllowedOrigin(origin) {
  if (ALLOWED_ORIGINS.has(origin)) {
    return true;
  }

  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    );
  } catch {
    return false;
  }
}

function applyCors(res, origin) {
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Vary", "Origin");
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

function readBody(req, maxBytes) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        req.destroy();
        reject(new Error("Request is too large."));
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });

    req.on("error", reject);
  });
}

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const text = readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const eq = trimmed.indexOf("=");
    if (eq <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
