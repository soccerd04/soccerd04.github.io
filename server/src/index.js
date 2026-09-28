import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildLensGuidance, SECTORS, WORKSTREAMS } from "./knowledge.js";

loadEnvFile(join(dirname(fileURLToPath(import.meta.url)), "..", ".env"));

const PORT = Number(process.env.PORT) || 8787;
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
const MAX_TEXT_LENGTH = 24_000;
const MAX_BODY_BYTES = 8_000_000;

const ALLOWED_ORIGINS = new Set([
  "https://soccerd04.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
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
    issues: {
      type: "array",
      items: {
        type: "object",
        properties: {
          claim: { type: "string" },
          severity: {
            type: "string",
            enum: ["high", "medium", "low"],
          },
          problem: { type: "string" },
          from_reference: { type: "string" },
          area: {
            type: "string",
            description:
              "The workstream, sector lens, or 'General' that this issue belongs to.",
          },
        },
        required: ["claim", "severity", "problem", "from_reference", "area"],
        additionalProperties: false,
      },
    },
  },
  required: ["summary", "verdict", "issues"],
  additionalProperties: false,
};

const server = createServer(async (req, res) => {
  const origin = req.headers.origin;
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
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
      const key = process.env.OPENAI_API_KEY;
      sendJson(res, 200, {
        ok: true,
        provider: "openai",
        model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
        ready: Boolean(key),
        sectors: Object.keys(SECTORS).length,
        workstreams: Object.keys(WORKSTREAMS).length,
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

    if (!process.env.OPENAI_API_KEY) {
      sendJson(res, 500, {
        error:
          "OPENAI_API_KEY is not set. Copy server/.env.example to server/.env and add your key.",
      });
      return;
    }

    const sector = SECTORS[body?.sector] ? body.sector : null;
    const workstreams = Array.isArray(body?.workstreams)
      ? body.workstreams.filter((key) => Boolean(WORKSTREAMS[key])).slice(0, 8)
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
      workstreams,
    });
    const parsed = await runOpenAI(prompt);
    const model = process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL;

    sendJson(res, 200, {
      summary: String(parsed.summary || ""),
      verdict: parsed.verdict === "pass" ? "pass" : "issues_found",
      issues: normalizeIssues(parsed.issues),
      provider: "openai",
      model,
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

async function runOpenAI(prompt) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "fact_check",
          strict: true,
          schema: FACT_CHECK_SCHEMA,
        },
      },
    }),
  });

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

  return JSON.parse(raw);
}

function buildPrompt({ reference, deliverable, sector, workstreams }) {
  return `Fact-check the document under review against the trusted reference material.

Compare the document to the reference only. Do not use outside knowledge as if it were a source of truth.

Flag an issue when the document:
- contradicts the reference
- invents names, dates, fees, scope, SLAs, or commitments not in the reference
- restates a fact incorrectly
- presents speculation as a confirmed fact

Do not flag style, tone, missing polish, or reasonable synthesis that stays faithful to the reference.

For each issue, set "area" to the most relevant workstream or sector lens listed below, or "General" when none applies.${buildLensGuidance(
    sector,
    workstreams
  )}

TRUSTED REFERENCE MATERIAL:
${reference}

DOCUMENT UNDER REVIEW:
${deliverable}`;
}

function normalizeIssues(issues) {
  if (!Array.isArray(issues)) {
    return [];
  }

  return issues.map((issue) => ({
    claim: String(issue?.claim || ""),
    severity: ["high", "medium", "low"].includes(issue?.severity)
      ? issue.severity
      : "low",
    problem: String(issue?.problem || ""),
    from_reference: String(issue?.from_reference || ""),
    area: String(issue?.area || "General"),
  }));
}

function applyCors(res, origin) {
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.setHeader("Vary", "Origin");
  if (origin && ALLOWED_ORIGINS.has(origin)) {
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
