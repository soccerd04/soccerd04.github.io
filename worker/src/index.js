const ALLOWED_ORIGINS = new Set([
  "https://soccerd04.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
]);

const MAX_TEXT_LENGTH = 24_000;
const MAX_BODY_BYTES = 2_000_000;

const FACT_CHECK_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "A concise summary of the investigation.",
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
        },
        required: ["claim", "severity", "problem", "from_reference"],
      },
    },
  },
  required: ["summary", "verdict", "issues"],
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
          provider: "Cloudflare Workers AI",
          model:
            env.WORKERS_AI_MODEL ||
            "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
          ready: Boolean(env.AI),
        },
        200,
        cors
      );
    }

    if (request.method !== "POST" || url.pathname !== "/api/fact-check") {
      return json({ error: "Not found." }, 404, cors);
    }

    if (!env.AI) {
      return json({ error: "Worker is missing its Workers AI binding." }, 500, cors);
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

    const reference = String(body?.reference ?? "").trim();
    const deliverable = String(body?.deliverable ?? "").trim();

    if (!reference || !deliverable) {
      return json(
        {
          error:
            "Both reference material and the AI-generated deliverable are required.",
        },
        400,
        cors
      );
    }

    if (
      reference.length > MAX_TEXT_LENGTH ||
      deliverable.length > MAX_TEXT_LENGTH
    ) {
      return json(
        {
          error: `Each document must be ${MAX_TEXT_LENGTH.toLocaleString()} characters or fewer.`,
        },
        413,
        cors
      );
    }

    try {
      const result = await factCheck(reference, deliverable, env);
      return json(result, 200, cors);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Fact check failed.";
      return json({ error: message }, 502, cors);
    }
  },
};

async function factCheck(reference, deliverable, env) {
  const model =
    env.WORKERS_AI_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
  const output = await env.AI.run(model, {
    messages: [
      {
        role: "system",
        content:
          "You are a meticulous consulting document investigator. Use only the supplied reference as factual truth.",
      },
      {
        role: "user",
        content: buildPrompt(reference, deliverable),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: FACT_CHECK_SCHEMA,
    },
    max_tokens: 1400,
  });

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

  return {
    summary: String(parsed.summary || ""),
    verdict: parsed.verdict === "pass" ? "pass" : "issues_found",
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
  };
}

function buildPrompt(reference, deliverable) {
  return `You are a careful consulting document investigator. Fact-check the AI-generated deliverable against the trusted reference material.

Compare the deliverable to the reference only. Do not use outside knowledge as if it were a source of truth.

Flag a fact-check issue when the deliverable:
- contradicts the reference
- invents names, dates, fees, scope, SLAs, or commitments not in the reference
- restates a fact incorrectly
- presents speculation as a confirmed fact

Do not flag style, tone, missing polish, or reasonable synthesis that stays faithful to the reference.

TRUSTED REFERENCE MATERIAL:
${reference}

AI-GENERATED DELIVERABLE:
${deliverable}`;
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
