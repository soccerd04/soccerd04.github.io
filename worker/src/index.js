import { buildLensGuidance, CAPABILITIES, IMPLEMENTATIONS, SECTORS } from "./knowledge.js";

const ALLOWED_ORIGINS = new Set([
  "https://soccerd04.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const MAX_TEXT_LENGTH = 24_000;
const MAX_BODY_BYTES = 8_000_000;
const DEFAULT_WORKERS_AI_MODEL =
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const DEFAULT_OPENAI_MODEL = "azure.gpt-4.1-nano";
const DEFAULT_OPENAI_API_URL =
  "https://genai-sharedservice-americas.pwcinternal.com/v1/chat/completions";

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

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin");
    if (origin && !ALLOWED_ORIGINS.has(origin)) {
      return json({ error: "Origin is not allowed." }, 403);
    }

    const cors = corsHeaders(origin);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      const provider = resolveProvider(env);
      return json(
        {
          ok: true,
          provider,
          model: resolveModel(provider, env),
          ready: provider === "openai" ? true : Boolean(env.AI),
          sectors: Object.keys(SECTORS).length,
          capabilities: Object.keys(CAPABILITIES).length,
          implementations: Object.keys(IMPLEMENTATIONS).length,
        },
        200,
        cors
      );
    }

    if (request.method !== "POST" || url.pathname !== "/api/fact-check") {
      return json({ error: "Not found." }, 404, cors);
    }

    const contentLength = Number(request.headers.get("Content-Length") || 0);
    if (contentLength > MAX_BODY_BYTES) {
      return json({ error: "Request is too large." }, 413, cors);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Request body must be valid JSON." }, 400, cors);
    }

    const rawReference = String(body?.reference ?? "").trim();
    const rawDeliverable = String(body?.deliverable ?? "").trim();

    if (!rawReference || !rawDeliverable) {
      return json(
        {
          error:
            "Both the reference material and the document to check are required.",
        },
        400,
        cors
      );
    }

    const provider = resolveProvider(env);
    if (provider === "workers-ai" && !env.AI) {
      return json(
        { error: "The Cloudflare Workers AI binding is not configured." },
        500,
        cors
      );
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

    try {
      const prompt = buildPrompt({
        reference,
        deliverable,
        sector,
        capability,
        implementations,
      });
      const parsed =
        provider === "openai"
          ? await runOpenAI(prompt, env)
          : await runWorkersAI(prompt, env);

      return json(
        {
          summary: String(parsed.summary || ""),
          verdict: parsed.verdict === "pass" ? "pass" : "issues_found",
          annotations: normalizeAnnotations(parsed.annotations),
          action_items: normalizeActionItems(parsed.action_items),
          provider,
          model: resolveModel(provider, env),
          truncated,
        },
        200,
        cors
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "The review failed.";
      return json({ error: message }, 502, cors);
    }
  },
};

// Workers AI needs no key, so it stays the default until an OpenAI secret exists.
function resolveProvider(env) {
  return env.OPENAI_API_KEY ? "openai" : "workers-ai";
}

function resolveModel(provider, env) {
  return provider === "openai"
    ? env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL
    : env.WORKERS_AI_MODEL || DEFAULT_WORKERS_AI_MODEL;
}

async function runOpenAI(prompt, env) {
  const response = await fetch(env.OPENAI_API_URL || DEFAULT_OPENAI_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
      messages: [
        {
          role: "user",
          content: `${SYSTEM_PROMPT}\n\n${prompt}`,
        },
      ],
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

  return parseModelJson(raw);
}

async function runWorkersAI(prompt, env) {
  const output = await env.AI.run(
    env.WORKERS_AI_MODEL || DEFAULT_WORKERS_AI_MODEL,
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
    }
  );

  let parsed = output?.response;
  if (typeof parsed === "string") {
    parsed = JSON.parse(parsed);
  }

  if (!parsed) {
    const raw = output?.choices?.[0]?.message?.content;
    if (typeof raw === "string") {
      parsed = JSON.parse(raw);
    }
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Workers AI returned an empty or invalid response.");
  }

  return parsed;
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

function corsHeaders(origin) {
  const headers = {
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }

  return headers;
}

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}
