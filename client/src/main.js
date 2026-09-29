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
    "Interactive frontend preview — live AI review is available only when running CheckThat locally.",
    false
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
        "This public site is a frontend preview and does not send documents to an AI service. Run CheckThat locally for a live review."
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
      "The verification service returned an unexpected response. Please try again."
    );
  }
}

function setStatus(message, isError = false) {
  statusEl.hidden = false;
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function renderResults(data) {
  const annotations = Array.isArray(data.annotations) ? data.annotations : [];
  const actions = Array.isArray(data.action_items) ? data.action_items : [];
  const counts = countClassifications(annotations);

  const truncationNote =
    data.truncated?.reference || data.truncated?.deliverable
      ? `<p class="results-note">One or both documents were longer than the review limit and were shortened, so later sections were not checked.</p>`
      : "";

  const { html: annotatedDocument, unmatched } = annotateDocument(
    deliverableEl.value,
    annotations
  );

  resultsEl.hidden = false;
  resultsEl.innerHTML = `
    <div class="review-legend" aria-label="Claim classification legend">
      ${renderLegendItem("grounded", "Grounded", counts.grounded)}
      ${renderLegendItem("inferred", "Inferred / plausible", counts.inferred)}
      ${renderLegendItem("unsupported", "Unsupported / wrong", counts.unsupported)}
    </div>
    ${truncationNote}
    <section class="annotated-review">
      <div class="section-heading">
        <p>Hover over an underlined claim to see its review.</p>
      </div>
      <div class="annotated-document">${annotatedDocument}</div>
      ${renderUnmatchedAnnotations(unmatched)}
    </section>
    ${renderActionItems(actions)}
  `;

  resultsEl.querySelectorAll(".claim-mark").forEach((mark) => {
    mark.addEventListener("click", () => {
      const isOpen = mark.getAttribute("aria-expanded") === "true";
      resultsEl.querySelectorAll('.claim-mark[aria-expanded="true"]').forEach(
        (openMark) => openMark.setAttribute("aria-expanded", "false")
      );
      mark.setAttribute("aria-expanded", String(!isOpen));
    });
  });
}

function countClassifications(annotations) {
  return annotations.reduce(
    (counts, annotation) => {
      const classification = normalizeClassification(annotation.classification);
      counts[classification] += 1;
      return counts;
    },
    { grounded: 0, inferred: 0, unsupported: 0 }
  );
}

function renderLegendItem(classification, label, count) {
  return `
    <span class="legend-item ${classification}">
      <span class="legend-line" aria-hidden="true"></span>
      ${escapeHtml(label)}
      <strong>${count}</strong>
    </span>`;
}

function annotateDocument(text, annotations) {
  const lowerText = text.toLocaleLowerCase();
  const located = [];
  const unmatched = [];

  for (const annotation of annotations) {
    const claim = String(annotation?.claim || "").trim();
    if (!claim) continue;

    const start = lowerText.indexOf(claim.toLocaleLowerCase());
    if (start === -1) {
      unmatched.push(annotation);
      continue;
    }

    located.push({ start, end: start + claim.length, annotation });
  }

  located.sort((a, b) => a.start - b.start || b.end - a.end);

  const nonOverlapping = [];
  let occupiedUntil = -1;
  for (const item of located) {
    if (item.start < occupiedUntil) {
      unmatched.push(item.annotation);
      continue;
    }
    nonOverlapping.push(item);
    occupiedUntil = item.end;
  }

  let cursor = 0;
  let html = "";
  for (const item of nonOverlapping) {
    html += escapeHtml(text.slice(cursor, item.start));
    html += renderClaimMark(text.slice(item.start, item.end), item.annotation);
    cursor = item.end;
  }
  html += escapeHtml(text.slice(cursor));

  return { html, unmatched };
}

function renderClaimMark(text, annotation) {
  const classification = normalizeClassification(annotation.classification);
  const label = classificationLabel(classification);
  const area =
    annotation.area && annotation.area !== "General"
      ? `<span class="popover-area">${escapeHtml(annotation.area)}</span>`
      : "";

  return `<button
    type="button"
    class="claim-mark ${classification}"
    aria-expanded="false"
  >${escapeHtml(text)}<span class="claim-popover" role="tooltip">
      <span class="popover-head">
        <strong>${label}</strong>
        ${area}
      </span>
      <span class="popover-explanation">${escapeHtml(
        annotation.explanation || "No explanation provided."
      )}</span>
      <span class="popover-label">Reference</span>
      <q>${escapeHtml(
        annotation.reference_quote || "Not found in the reference."
      )}</q>
    </span></button>`;
}

function renderUnmatchedAnnotations(annotations) {
  if (!annotations.length) return "";

  return `
    <details class="unmatched">
      <summary>${annotations.length} additional finding${
        annotations.length === 1 ? "" : "s"
      }</summary>
      <div class="unmatched-list">
        ${annotations
          .map((annotation) => {
            const classification = normalizeClassification(
              annotation.classification
            );
            return `<article class="unmatched-item ${classification}">
              <strong>${escapeHtml(annotation.claim || "Unnamed claim")}</strong>
              <p>${escapeHtml(annotation.explanation || "")}</p>
              <q>${escapeHtml(
                annotation.reference_quote || "Not found in the reference."
              )}</q>
            </article>`;
          })
          .join("")}
      </div>
    </details>`;
}

function renderActionItems(actions) {
  if (!actions.length) {
    return `
      <section class="action-plan">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Next steps</p>
            <h2>No follow-up actions suggested</h2>
          </div>
        </div>
      </section>`;
  }

  return `
    <section class="action-plan">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Next steps</p>
          <h2>Suggested action plan</h2>
        </div>
        <p>${actions.length} focused action${
          actions.length === 1 ? "" : "s"
        } based on this review.</p>
      </div>
      <ul class="action-list">
        ${actions
          .map((item) => {
            const priority = ["high", "medium", "low"].includes(item.priority)
              ? item.priority
              : "medium";
            return `<li>
              <label>
                <input type="checkbox" />
                <span class="action-copy">
                  <span class="action-title">${escapeHtml(item.action)}</span>
                  <span class="action-rationale">${escapeHtml(
                    item.rationale || ""
                  )}</span>
                </span>
                <span class="priority ${priority}">${priority}</span>
              </label>
            </li>`;
          })
          .join("")}
      </ul>
    </section>`;
}

function normalizeClassification(value) {
  return ["grounded", "inferred", "unsupported"].includes(value)
    ? value
    : "unsupported";
}

function classificationLabel(classification) {
  return {
    grounded: "Grounded",
    inferred: "Inferred / plausible",
    unsupported: "Unsupported / wrong",
  }[classification];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
