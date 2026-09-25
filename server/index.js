import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const app = express();
const port = Number(process.env.PORT) || 3001;
const apiKey = process.env.OPENAI_API_KEY;
const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
  /\/$/,
  ""
);

const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "https://soccerd04.github.io",
];
if (process.env.CLIENT_ORIGIN) {
  allowedOrigins.push(process.env.CLIENT_ORIGIN);
}

app.use(cors({ origin: allowedOrigins }));
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, model, hasKey: Boolean(apiKey) });
});

app.post("/api/fact-check", async (req, res) => {
  const reference = String(req.body?.reference ?? "").trim();
  const deliverable = String(req.body?.deliverable ?? "").trim();

  if (!reference || !deliverable) {
    return res.status(400).json({
      error: "Both reference material and the AI-generated deliverable are required.",
    });
  }

  if (!apiKey) {
    return res.status(500).json({
      error: "Server is missing OPENAI_API_KEY. Copy .env.example to .env and add a key.",
    });
  }

  try {
    const result = await runFactCheck({ reference, deliverable });
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fact check failed.";
    res.status(502).json({ error: message });
  }
});

async function runFactCheck({ reference, deliverable }) {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You fact-check consulting deliverables (especially Statements of Work) against trusted reference material.

Compare the deliverable to the reference only. Do not use outside knowledge as if it were a source of truth.

Flag a fact-check issue when the deliverable:
- contradicts the reference
- invents names, dates, fees, scope, SLAs, or commitments not in the reference
- restates a fact incorrectly
- presents speculation as a confirmed fact

Do not flag style, tone, or missing polish. Do not flag reasonable synthesis that stays faithful to the reference.

Return JSON with this shape:
{
  "summary": "one short paragraph",
  "verdict": "pass" | "issues_found",
  "issues": [
    {
      "claim": "quoted or paraphrased claim from the deliverable",
      "severity": "high" | "medium" | "low",
      "problem": "what is wrong",
      "from_reference": "what the reference actually says, or that it is absent"
    }
  ]
}`,
        },
        {
          role: "user",
          content: `REFERENCE MATERIAL:\n${truncate(reference)}\n\nAI-GENERATED DELIVERABLE:\n${truncate(deliverable)}`,
        },
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = payload?.error?.message || response.statusText;
    throw new Error(`LLM request failed: ${detail}`);
  }

  const raw = payload?.choices?.[0]?.message?.content;
  if (!raw) {
    throw new Error("LLM returned an empty response.");
  }

  const parsed = JSON.parse(raw);
  return {
    summary: parsed.summary || "",
    verdict: parsed.verdict === "pass" ? "pass" : "issues_found",
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
  };
}

function truncate(text, max = 24000) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n[truncated for length]`;
}

app.listen(port, () => {
  console.log(`Fact-check API listening on http://localhost:${port}`);
});
