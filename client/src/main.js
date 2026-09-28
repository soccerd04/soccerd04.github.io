import { CAPABILITIES, IMPLEMENTATIONS, SECTORS } from "./taxonomy.js";

const form = document.querySelector("#fact-check-form");
const statusEl = document.querySelector("#status");
const resultsEl = document.querySelector("#results");
const submitBtn = document.querySelector("#submit-btn");
const referenceEl = document.querySelector("#reference");
const deliverableEl = document.querySelector("#deliverable");
const sectorEl = document.querySelector("#sector");
const capabilityEl = document.querySelector("#capability");
const implementationsEl = document.querySelector("#implementations");
const ackEl = document.querySelector("#ack");
const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

buildSelectOptions(sectorEl, SECTORS);
buildSelectOptions(capabilityEl, CAPABILITIES);
buildImplementationChips();
wireCounters();
wireFileInputs();

if (import.meta.env.PROD && !apiBase) {
  setStatus(
    "This public build is missing its API URL. Redeploy GitHub Pages after VITE_API_URL is set.",
    true
  );
}

function buildSelectOptions(selectEl, items) {
  for (const { value, label } of items) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    selectEl.append(option);
  }
}

function buildImplementationChips() {
  for (const { value, label } of IMPLEMENTATIONS) {
    const chip = document.createElement("label");
    chip.className = "chip";

    const input = document.createElement("input");
    input.type = "checkbox";
    input.value = value;
    input.name = "implementations";

    const text = document.createElement("span");
    text.textContent = label;

    chip.append(input, text);
    implementationsEl.append(chip);
  }
}

function selectedImplementations() {
  return [...implementationsEl.querySelectorAll("input[type=checkbox]")]
    .filter((input) => input.checked)
    .map((input) => input.value);
}

function wireCounters() {
  const pairs = [
    [referenceEl, document.querySelector("#reference-count")],
    [deliverableEl, document.querySelector("#deliverable-count")],
  ];

  for (const [input, output] of pairs) {
    const update = () => {
      const count = input.value.length;
      output.textContent = `${count.toLocaleString()} character${
        count === 1 ? "" : "s"
      }`;
    };
    input.addEventListener("input", update);
    input.dataset.update = "true";
    update();
  }
}

function wireFileInputs() {
  const pairs = [
    ["#reference-file", referenceEl, "#reference-file-status"],
    ["#deliverable-file", deliverableEl, "#deliverable-file-status"],
  ];

  for (const [inputSelector, textarea, statusSelector] of pairs) {
    const fileInput = document.querySelector(inputSelector);
    const fileStatus = document.querySelector(statusSelector);

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      fileStatus.textContent = `Reading ${file.name}…`;
      fileStatus.className = "file-status";

      try {
        const { extractText } = await import("./parse.js");
        const text = await extractText(file);
        textarea.value = text;
        textarea.dispatchEvent(new Event("input"));
        fileStatus.textContent = `${file.name} loaded`;
        fileStatus.className = "file-status ok";
      } catch (err) {
        fileStatus.textContent =
          err instanceof Error ? err.message : "Could not read that file.";
        fileStatus.className = "file-status error";
      } finally {
        fileInput.value = "";
      }
    });
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const reference = referenceEl.value.trim();
  const deliverable = deliverableEl.value.trim();

  if (!reference || !deliverable) {
    setStatus("Add both the reference material and the document to check.", true);
    return;
  }

  if (!ackEl.checked) {
    setStatus(
      "Confirm the confidentiality acknowledgement before running the check.",
      true
    );
    return;
  }

  setStatus("Checking the document against your reference…");
  resultsEl.hidden = true;
  submitBtn.disabled = true;

  try {
    if (import.meta.env.PROD && !apiBase) {
      throw new Error(
        "GitHub Pages cannot call OpenAI by itself. Run the app locally with npm run dev, or connect a backend that stores the API key."
      );
    }

    const payload = {
      reference,
      deliverable,
      sector: sectorEl.value || null,
      capability: capabilityEl.value || null,
      implementations: selectedImplementations(),
    };
    const data = await postFactCheck(payload);

    statusEl.hidden = true;
    renderResults(data);
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Something went wrong.", true);
  } finally {
    submitBtn.disabled = false;
  }
});

async function postFactCheck(payload, attempt = 1) {
  let response;
  try {
    response = await fetch(`${apiBase}/api/fact-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    if (attempt < 3) {
      setStatus("Waking the verification service…");
      await wait(3000 * attempt);
      return postFactCheck(payload, attempt + 1);
    }
    throw err;
  }

  const data = await readJson(response);
  if (!response.ok) {
    throw new Error(data.error || "Request failed.");
  }
  return data;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function readJson(response) {
  const raw = await response.text();
  if (!raw) {
    throw new Error(
      "The server returned an empty response. If you are on soccerd04.github.io, there is no API on GitHub Pages — use npm run dev locally."
    );
  }

  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(
      "The server did not return JSON. GitHub Pages only serves the website files, not the OpenAI backend."
    );
  }
}

function setStatus(message, isError = false) {
  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function renderResults(data) {
  const issues = Array.isArray(data.issues) ? data.issues : [];
  const passed = data.verdict === "pass";

  const truncationNote =
    data.truncated?.reference || data.truncated?.deliverable
      ? `<p class="results-note">One or both documents were longer than the review limit and were shortened, so later sections were not checked.</p>`
      : "";

  const issueHtml = issues.length
    ? `<div class="issue-list">${issues.map(renderIssue).join("")}</div>`
    : `<p class="empty">No unsupported or contradicted claims were found.</p>`;

  resultsEl.hidden = false;
  resultsEl.innerHTML = `
    <div class="results-head">
      <span class="verdict ${passed ? "pass" : "issues_found"}">${
        passed ? "No issues found" : "Issues found"
      }</span>
      <span class="results-count">${issues.length} flagged claim${
        issues.length === 1 ? "" : "s"
      }</span>
    </div>
    <p class="summary">${escapeHtml(data.summary || "")}</p>
    ${truncationNote}
    ${issueHtml}
  `;
}

function renderIssue(issue) {
  const severity = ["high", "medium", "low"].includes(issue.severity)
    ? issue.severity
    : "low";
  const area = issue.area && issue.area !== "General" ? issue.area : "";

  return `
    <article class="issue ${severity}">
      <div class="issue-head">
        <h3>${escapeHtml(issue.claim || "Unnamed claim")}</h3>
        <span class="issue-meta">
          ${area ? `<span class="area">${escapeHtml(area)}</span>` : ""}
          <span class="severity">${severity}</span>
        </span>
      </div>
      <dl>
        <dt>Problem</dt>
        <dd>${escapeHtml(issue.problem || "Not specified.")}</dd>
        <dt>Reference</dt>
        <dd>${escapeHtml(issue.from_reference || "Not found in the reference.")}</dd>
      </dl>
    </article>`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
