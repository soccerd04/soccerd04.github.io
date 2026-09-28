import { buildLensGuidance, SECTORS, WORKSTREAMS } from "./knowledge.js";

const ALLOWED_ORIGINS = new Set([
  "https://soccerd04.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const MAX_TEXT_LENGTH = 24_000;
const MAX_BODY_BYTES = 8_000_000;
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

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
      return json(
        {
          ok: true,
          provider: "openai",
          model: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
          ready: Boolean(env.OPENAI_API_KEY),
          sectors: Object.keys(SECTORS).length,
          workstreams: Object.keys(WORKSTREAMS).length,
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

    if (!env.OPENAI_API_KEY) {
      return json(
        {
          error:
            "OPENAI_API_KEY is not set on the API. Add it as a Cloudflare Worker secret.",
        },
        500,
        cors
      );
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

    try {
      const parsed = await runOpenAI(
        buildPrompt({ reference, deliverable, sector, workstreams }),
        env
      );

      return json(
        {
          summary: String(parsed.summary || ""),
          verdict: parsed.verdict === "pass" ? "pass" : "issues_found",
          issues: normalizeIssues(parsed.issues),
          provider: "openai",
          model: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
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

async function runOpenAI(prompt, env) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || DEFAULT_OPENAI_MODEL,
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
