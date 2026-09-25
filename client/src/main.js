const form = document.querySelector("#fact-check-form");
const statusEl = document.querySelector("#status");
const resultsEl = document.querySelector("#results");
const submitBtn = document.querySelector("#submit-btn");
const caseDateEl = document.querySelector("#case-date");
const apiBase = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

caseDateEl.textContent = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
}).format(new Date());

if (import.meta.env.PROD && !apiBase) {
  setStatus(
    "Case desk is open. Online investigations will begin once the Cloudflare Worker URL is connected."
  );
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const reference = document.querySelector("#reference").value.trim();
  const deliverable = document.querySelector("#deliverable").value.trim();

  setStatus("Examining the evidence and following every clue…");
  resultsEl.hidden = true;
  submitBtn.disabled = true;

  try {
    const response = await fetch(`${apiBase}/api/fact-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference, deliverable }),
    });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Request failed.");
    }

    statusEl.hidden = true;
    renderResults(data);
  } catch (err) {
    setStatus(err instanceof Error ? err.message : "Something went wrong.");
  } finally {
    submitBtn.disabled = false;
  }
});

function setStatus(message) {
  statusEl.hidden = false;
  statusEl.textContent = message;
}

function renderResults(data) {
  const issues = data.issues || [];
  const issueHtml = issues.length
    ? issues
        .map(
          (issue) => `
        <article class="issue">
          <p class="severity">${escapeHtml(issue.severity || "unspecified")} severity</p>
          <h3>${escapeHtml(issue.claim || "Unnamed claim")}</h3>
          <p>${escapeHtml(issue.problem || "")}</p>
          <p><strong>Reference:</strong> ${escapeHtml(issue.from_reference || "n/a")}</p>
        </article>`
        )
        .join("")
    : "<p>No suspicious facts uncovered. The evidence supports this deliverable.</p>";

  resultsEl.hidden = false;
  resultsEl.innerHTML = `
    <span class="verdict ${escapeHtml(data.verdict || "issues_found")}">${escapeHtml(
      data.verdict === "pass" ? "Case cleared" : "Clues uncovered"
    )}</span>
    <p>${escapeHtml(data.summary || "")}</p>
    ${issueHtml}
  `;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
