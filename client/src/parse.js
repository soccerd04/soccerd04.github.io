// Loaded on demand so the PDF and DOCX parsers stay out of the initial bundle.
import mammoth from "mammoth/mammoth.browser.js";
import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const PLAIN_TEXT = /\.(txt|md|markdown|csv|tsv|json|rtf)$/i;

export const ACCEPTED_FILE_TYPES = ".pdf,.docx,.txt,.md,.markdown,.csv,.tsv,.json";

export async function extractText(file) {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("That file is larger than 15 MB. Please upload a smaller file.");
  }

  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    return readPdf(file);
  }

  if (name.endsWith(".docx")) {
    return readDocx(file);
  }

  if (name.endsWith(".doc")) {
    throw new Error("Legacy .doc files are not supported. Save the file as .docx or PDF.");
  }

  if (PLAIN_TEXT.test(name) || file.type.startsWith("text/")) {
    return (await file.text()).trim();
  }

  throw new Error("Unsupported file type. Use PDF, DOCX, TXT, MD, CSV, or JSON.");
}

async function readPdf(file) {
  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;

  try {
    const pages = [];
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .map((item) => item.str)
          .join(" ")
          .replace(/[ \t]+/g, " ")
          .trim()
      );
    }

    const text = pages.filter(Boolean).join("\n\n").trim();
    if (!text) {
      throw new Error(
        "No selectable text found. This PDF is likely a scan, so paste the text instead."
      );
    }

    return text;
  } finally {
    await doc.destroy();
  }
}

async function readDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const { value } = await mammoth.extractRawText({ arrayBuffer });
  const text = String(value || "").trim();

  if (!text) {
    throw new Error("That DOCX file appears to contain no text.");
  }

  return text;
}
