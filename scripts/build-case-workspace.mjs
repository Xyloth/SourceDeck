import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import mammoth from "mammoth";
import WordExtractor from "word-extractor";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

// Project-agnostic: pass the case folder as argv[2], or set SOURCEDECK_CASE_FOLDER in the
// environment (e.g. via .env.local that you export). No specific case path is baked in.
const inputFolder = process.argv[2] ?? process.env.SOURCEDECK_CASE_FOLDER;
if (!inputFolder) {
  console.error(
    "Usage: node scripts/build-case-workspace.mjs <caseFolder> [workspace.json] [report.md]\n" +
      "Or set SOURCEDECK_CASE_FOLDER to the case folder path.",
  );
  process.exit(1);
}
const outputFile =
  process.argv[3] ?? path.join(inputFolder, "sourcedeck-workspace.json");
const reportFile =
  process.argv[4] ?? path.join(inputFolder, "sourcedeck-pressure-test-report.md");

const supportedExtensions = new Set([".docx", ".doc", ".pdf", ".txt", ".md", ".csv"]);
const issueKeywords = [
  {
    category: "Change order",
    words: ["change order", "amendment", "scope change", "addendum", "revision"],
  },
  {
    category: "Support escalation",
    words: ["escalation", "incident", "ticket", "severity", "outage", "critical"],
  },
  {
    category: "Service level agreement",
    words: ["sla", "service", "uptime", "schedule", "support", "target", "plan"],
  },
  {
    category: "Acceptance criteria",
    words: ["acceptance", "criteria", "milestone", "deliverable", "definition"],
  },
  {
    category: "Billing and invoices",
    words: ["invoice", "billing", "overage", "credit", "payment", "charge"],
  },
  {
    category: "Uptime data",
    words: ["data", "report", "tracker", "frequency", "duration", "rate", "monthly"],
  },
];

function makeId(prefix, value = "") {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
  return `${prefix}_${slug || Math.random().toString(36).slice(2, 9)}`;
}

function slugForFile(filePath) {
  return path
    .basename(filePath, path.extname(filePath))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function repairTextArtifacts(text) {
  return text
    .replace(/â€™|â€˜/g, "'")
    .replace(/â€œ|â€/g, '"')
    .replace(/â€“|â€”/g, "-")
    .replace(/Â /g, " ")
    .replace(/Â/g, "");
}

function titleFromFile(filePath) {
  return repairTextArtifacts(path.basename(filePath, path.extname(filePath))).replace(/[_-]+/g, " ");
}

function exhibitLabel(index) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  if (index < alphabet.length) return `Exhibit ${alphabet[index]}`;
  return `Exhibit ${index + 1}`;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value)
      .filter(([, entryValue]) => typeof entryValue !== "undefined")
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalJson(entryValue)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function contentAddressBytes(bytes) {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

function contentAddressText(text) {
  return `sha256:${createHash("sha256").update(text).digest("hex")}`;
}

function mediaTypeForExtension(extension) {
  const normalized = extension.toLowerCase();
  if (normalized === ".pdf") return "application/pdf";
  if (normalized === ".docx") {
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if (normalized === ".doc") return "application/msword";
  if (normalized === ".txt" || normalized === ".md" || normalized === ".csv") return "text/plain";
  return "application/octet-stream";
}

function createSourceVaultManifest({ documentId, filePath, extension, bytes, createdAt }) {
  const contentHash = contentAddressBytes(bytes);
  const original = {
    format: "sourcedeck.source-vault-blob.v1",
    recordId: `source-vault:original_file:${contentHash}`,
    documentId,
    kind: "original_file",
    mediaType: mediaTypeForExtension(extension),
    contentHash,
    byteLength: bytes.byteLength,
    createdAt,
    payload: { encoding: "base64", data: bytes.toString("base64") },
    metadata: {
      fileName: path.basename(filePath),
      fileType: extension.replace(".", "").toUpperCase(),
      sourcePath: filePath,
    },
  };
  const withoutHash = {
    format: "sourcedeck.source-vault-manifest.v1",
    vaultId: `source-vault:${documentId}`,
    documentId,
    createdAt,
    original,
    pageImages: [],
    metadata: {
      fileName: path.basename(filePath),
      fileType: extension.replace(".", "").toUpperCase(),
      localPreloader: true,
    },
  };
  return {
    ...withoutHash,
    manifestHash: contentAddressText(canonicalJson(withoutHash)),
  };
}

function cleanText(text) {
  return repairTextArtifacts(text)
    .replace(/\u0000/g, " ")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function reportPreview(text) {
  return repairTextArtifacts(text)
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "")
    .slice(0, 220);
}

function detectDates(text) {
  const matches = text.match(
    /\b(?:\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}|\b(?:19|20)\d{2}\b)\b/gi,
  );
  return Array.from(new Set(matches ?? [])).slice(0, 24);
}

function normalizeDetectedDate(value, fallback) {
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  const year = value.match(/\b(19|20)\d{2}\b/)?.[0];
  return year ? `${year}-01-01` : fallback;
}

function detectEntities(text) {
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4}\b/g);
  const noisy = new Set([
    "Nationwide Children",
    "Center Autism Spectrum Disorders",
    "Severe Behavior Program",
  ]);
  return Array.from(new Set(matches ?? []))
    .filter((item) => !noisy.has(item))
    .slice(0, 18);
}

function detectTags(text, fileName) {
  const lower = `${fileName} ${text}`.toLowerCase();
  const tags = new Set(["Imported"]);
  issueKeywords.forEach((issue) => {
    if (issue.words.some((word) => lower.includes(word))) tags.add(issue.category);
  });
  return Array.from(tags);
}

function categoryFor(fragment) {
  const lower = fragment.toLowerCase();
  const match = issueKeywords.find((issue) =>
    issue.words.some((word) => lower.includes(word)),
  );
  return match?.category ?? "Key quote";
}

function scoreFragment(fragment) {
  const lower = fragment.toLowerCase();
  let score = 0;
  issueKeywords.forEach((issue) => {
    issue.words.forEach((word) => {
      if (lower.includes(word)) score += 2;
    });
  });
  if (/\b(must|will|shall|should|required|protocol|criteria|when|if|then)\b/i.test(fragment)) {
    score += 2;
  }
  if (fragment.length >= 80 && fragment.length <= 420) score += 1;
  if (fragment.length > 700) score -= 2;
  return score;
}

function fragmentsFromText(text) {
  return Array.from(
    new Set(
      cleanText(text)
        .split(/\n+|(?<=[.!?])\s+/)
        .map((item) => item.trim().replace(/\s+/g, " "))
        .filter((item) => item.length > 42),
    ),
  );
}

async function readDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  const text = cleanText(result.value);
  return {
    extractedText: text,
    pageTexts: text ? [{ page: 1, text }] : [],
    pages: text ? 1 : 0,
    status: text ? "Indexed" : "Needs OCR",
    warning: text
      ? `${text.length.toLocaleString()} DOCX characters indexed by local preloader.`
      : "DOCX has no extractable text; it likely contains an image, chart, or embedded object that needs OCR.",
  };
}

async function readDoc(filePath) {
  const extractor = new WordExtractor();
  const document = await extractor.extract(filePath);
  const text = cleanText(
    [
      document.getHeaders?.() ?? "",
      document.getBody?.() ?? "",
      document.getFooters?.() ?? "",
      document.getAnnotations?.() ?? "",
      document.getTextboxes?.() ?? "",
    ].join("\n\n"),
  );
  return {
    extractedText: text,
    pageTexts: text ? [{ page: 1, text }] : [],
    pages: text ? 1 : 0,
    status: text ? "Indexed" : "Needs review",
    warning: text
      ? `${text.length.toLocaleString()} legacy DOC characters indexed by local preloader.`
      : "Legacy DOC imported but no text was extracted.",
  };
}

async function readPdf(filePath) {
  const data = new Uint8Array(await fs.readFile(filePath));
  const pdf = await getDocument({ data, disableWorker: true }).promise;
  const pageTexts = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const text = cleanText(content.items.map((item) => item.str).join(" "));
    if (text) pageTexts.push({ page: pageNumber, text });
  }
  const extractedText = cleanText(pageTexts.map((page) => page.text).join("\n\n"));
  return {
    extractedText,
    pageTexts,
    pages: pdf.numPages,
    status: extractedText ? "Indexed" : "Needs OCR",
    warning: extractedText
      ? `${pdf.numPages} PDF pages scanned; ${pageTexts.length} pages had extractable text.`
      : `${pdf.numPages} PDF pages have no extractable text; OCR is required before quote retrieval.`,
  };
}

async function readPlainText(filePath) {
  const text = cleanText(await fs.readFile(filePath, "utf8"));
  return {
    extractedText: text,
    pageTexts: text ? [{ page: 1, text }] : [],
    pages: text ? 1 : 0,
    status: text ? "Indexed" : "Needs review",
    warning: text
      ? `${text.length.toLocaleString()} text characters indexed by local preloader.`
      : "Text file imported but no text was extracted.",
  };
}

async function readExistingOcrText(filePath, processed) {
  const ocrFolder = path.join(inputFolder, "_casework", "ocr_text");
  let entries = [];
  try {
    entries = await fs.readdir(ocrFolder, { withFileTypes: true });
  } catch {
    return undefined;
  }
  const slug = slugForFile(filePath);
  const extension = path.extname(filePath).toLowerCase();
  const textFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".txt"))
    .map((entry) => entry.name);
  const pageTexts = [];
  if (extension === ".pdf") {
    const pagePattern = new RegExp(
      `^pdf_page_images__${slug}__page_(\\d+)_image_\\d+\\.[a-z0-9]+\\.txt$`,
      "i",
    );
    const byPage = new Map();
    for (const fileName of textFiles) {
      const match = fileName.match(pagePattern);
      if (!match) continue;
      const pageNumber = Number.parseInt(match[1], 10);
      const text = cleanText(await fs.readFile(path.join(ocrFolder, fileName), "utf8"));
      if (!text) continue;
      byPage.set(pageNumber, cleanText([byPage.get(pageNumber) ?? "", text].join("\n\n")));
    }
    [...byPage.entries()]
      .sort(([left], [right]) => left - right)
      .forEach(([page, text]) => pageTexts.push({ page, text }));
  } else {
    const mediaPrefix = `${slug}_media__`;
    const contactSheet = `${slug}_contact_sheet`;
    const matched = textFiles
      .filter((fileName) => fileName.startsWith(mediaPrefix) || fileName.startsWith(contactSheet))
      .sort((left, right) => left.localeCompare(right));
    const text = cleanText(
      (
        await Promise.all(matched.map((fileName) => fs.readFile(path.join(ocrFolder, fileName), "utf8")))
      ).join("\n\n"),
    );
    if (text) pageTexts.push({ page: 1, text });
  }
  const extractedText = cleanText(pageTexts.map((page) => page.text).join("\n\n"));
  if (!extractedText) return undefined;
  return {
    extractedText,
    pageTexts,
    pages: Math.max(processed.pages, pageTexts.length),
    status: "Needs review",
    warning: `Existing OCR sidecar text loaded from _casework (${pageTexts.length} page${pageTexts.length === 1 ? "" : "s"}, ${extractedText.length.toLocaleString()} chars); verify OCR before packet use.`,
    ocrBacked: true,
    ocrSource: ocrFolder,
  };
}

async function processFile(filePath, index) {
  const extension = path.extname(filePath).toLowerCase();
  const stat = await fs.stat(filePath);
  const originalBytes = await fs.readFile(filePath);
  const title = titleFromFile(filePath);
  const documentId = makeId("doc", title);
  const importedAt = new Date().toISOString();
  const sourceVaultManifest = createSourceVaultManifest({
    documentId,
    filePath,
    extension,
    bytes: originalBytes,
    createdAt: importedAt,
  });
  let processed;
  if (extension === ".docx") processed = await readDocx(filePath);
  else if (extension === ".doc") processed = await readDoc(filePath);
  else if (extension === ".pdf") processed = await readPdf(filePath);
  else processed = await readPlainText(filePath);
  const existingOcr = await readExistingOcrText(filePath, processed);
  if (existingOcr && (!processed.extractedText || processed.status === "Needs OCR")) {
    processed = existingOcr;
  }
  const tags = detectTags(processed.extractedText, path.basename(filePath));
  if (processed.ocrBacked) tags.push("OCR sidecar");

  return {
    id: documentId,
    title,
    type: extension.replace(".", "").toUpperCase(),
    date: stat.mtime.toISOString().slice(0, 10),
    author: "Imported local case folder",
    pages: processed.pages,
    exhibit: exhibitLabel(index),
    tags,
    status: processed.status,
    warning: `${processed.warning} Original file vaulted as ${sourceVaultManifest.original.contentHash}.`,
    fileName: path.basename(filePath),
    extractedText: processed.extractedText,
    pageTexts: processed.pageTexts,
    textChars: processed.extractedText.length,
    importedAt,
    detectedDates: detectDates(processed.extractedText),
    detectedEntities: detectEntities(processed.extractedText),
    sourceVaultManifest,
    sourceVaultVerified: true,
    ocrBacked: processed.ocrBacked || undefined,
    ocrSource: processed.ocrSource,
  };
}

function makeEvidenceCards(documents) {
  return documents.flatMap((document) => {
    if (!document.extractedText) return [];
    return fragmentsFromText(document.extractedText)
      .map((fragment) => ({ fragment, score: scoreFragment(fragment) }))
      .filter((item) => item.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 6)
      .map((item, index) => {
        const category = categoryFor(item.fragment);
        const priority = item.score >= 8 ? "High" : item.score >= 5 ? "Medium" : "Low";
        const quote = item.fragment.slice(0, 560);
        return {
          id: makeId("ev", `${document.title}_${index}_${quote}`),
          title: `${category}: ${document.title}`.slice(0, 96),
          category,
          priority,
          documentId: document.id,
          page: 1,
          quote,
          meaning: "Local preloader flagged this as potentially useful meeting evidence. Verify context before using.",
          strategicUse: "Use as a source-linked prompt for pre-meeting review or live quote retrieval.",
          question: `Can you explain how this language from ${document.exhibit} should be applied in the contract discussion?`,
          likelyDefense: "The other side may argue the quote is general guidance, context-dependent, or not the governing contract term.",
          counter: "Ask for the specific record, data, decision-maker, and written basis that connects or distinguishes this language.",
          tags: Array.from(new Set(["Local preloader", category, ...document.tags])),
          confidence: Math.min(92, 62 + item.score * 4),
          packetReady: false,
          verificationStatus: "cited",
        };
      });
  });
}

function makeIssues(evidenceCards) {
  const groups = new Map();
  evidenceCards.forEach((card) => {
    if (!groups.has(card.category)) groups.set(card.category, []);
    groups.get(card.category).push(card);
  });
  return Array.from(groups.entries()).map(([category, cards], index) => ({
    id: makeId("issue", category),
    title: category,
    description: `${cards.length} source-linked card${cards.length === 1 ? "" : "s"} from the imported case folder.`,
    evidenceIds: cards.slice(0, 10).map((card) => card.id),
    status: "Open",
    meetingPriority: index + 1,
  }));
}

function makeTimeline(documents) {
  return documents.flatMap((document) =>
    document.detectedDates.slice(0, 4).map((date, index) => ({
      id: makeId("time", `${document.id}_${date}_${index}`),
      date: normalizeDetectedDate(date, document.date),
      event: `${document.exhibit}: ${document.title} references ${date}`,
      documentId: document.id,
      page: 1,
      quote:
        fragmentsFromText(document.extractedText).find((fragment) =>
          fragment.toLowerCase().includes(date.toLowerCase()),
        ) ?? document.title,
      issue: document.tags[1] ?? "Imported timeline",
    })),
  );
}

function makeMissingRecords(documents) {
  const missing = documents
    .filter((document) => document.status === "Needs OCR")
    .map((document) => ({
      id: makeId("mr", `ocr_${document.id}`),
      requested: `Searchable/OCR copy of ${document.fileName}`,
      dateRequested: new Date().toISOString().slice(0, 10),
      responsibleParty: "Document custodian",
      status: "Missing",
      relatedIssue: "OCR / searchable record",
      whyItMatters: `${document.exhibit} has ${document.pages} scanned page${document.pages === 1 ? "" : "s"} with no extractable text, so SourceDeck cannot quote-search it yet.`,
      followUp: "Run OCR or request a text-searchable copy before relying on live retrieval.",
    }));

  missing.push({
    id: "mr_decision_records",
    requested: "Change-order approvals, uptime logs, and meeting notes tied to these terms",
    dateRequested: new Date().toISOString().slice(0, 10),
    responsibleParty: "Vendor / account team",
    status: "Missing",
    relatedIssue: "Implementation record",
    whyItMatters: "The imported terms show expectations and definitions, but implementation still needs date-by-date records.",
    followUp: "Ask for the written basis, decision-maker, dates, and logs connecting these documents to the contract decision.",
  });

  return missing;
}

function buildReport({ folder, documents, evidence, issues, timeline, missingRecords, output }) {
  const lines = [
    "# SourceDeck Case Folder Pressure Test",
    "",
    `Folder: ${folder}`,
    `Workspace JSON: ${output}`,
    `Generated: ${new Date().toLocaleString()}`,
    "",
    "## Extraction Results",
    "",
  ];
  documents.forEach((document) => {
    lines.push(
      `- ${document.exhibit}: ${document.fileName} - ${document.status}, ${document.pages} page(s), ${document.textChars.toLocaleString()} chars. ${document.warning}`,
    );
  });
  lines.push(
    "",
    "## Workspace Built",
    "",
    `- Documents: ${documents.length}`,
    `- Evidence cards: ${evidence.length}`,
    `- Issue maps: ${issues.length}`,
    `- Timeline entries: ${timeline.length}`,
    `- Missing-record rows: ${missingRecords.length}`,
    `- Needs review documents: ${documents.filter((document) => document.status === "Needs review").length}`,
    `- OCR sidecar documents: ${documents.filter((document) => document.ocrBacked).length}`,
    "",
    "## Strongest Preloader Cards",
    "",
  );
  evidence
    .slice()
    .sort((left, right) => right.confidence - left.confidence)
    .slice(0, 12)
    .forEach((card) => {
      const document = documents.find((item) => item.id === card.documentId);
      lines.push(
        `- ${card.priority} / ${card.category} / ${document?.exhibit}: ${reportPreview(card.quote)}`,
      );
    });
  lines.push(
    "",
    "## Build Gaps Exposed",
    "",
    "- OCR is required for scanned PDFs before the behavior-data PDFs become live searchable.",
    "- Image-only DOCX/chart files also need OCR or image extraction before they become quote-searchable.",
    "- Browser import supports DOCX/PDF/text; legacy DOC extraction is available through this local Node preloader.",
    "- Local preloader evidence cards are cited review candidates, not verified packet evidence. Open each card in SourceDeck and verify the source span before packet export.",
    "- Highlighted PDF export still needs true overlay generation against source pages, especially after OCR.",
    "- Evidence cards should support human-confirmed page numbers for Word files because raw DOCX extraction does not preserve page layout.",
  );
  return lines.join("\n");
}

const entries = await fs.readdir(inputFolder, { withFileTypes: true });
const filePaths = entries
  .filter((entry) => entry.isFile())
  .map((entry) => path.join(inputFolder, entry.name))
  .filter((filePath) => !path.basename(filePath).toLowerCase().startsWith("sourcedeck-"))
  .filter((filePath) => supportedExtensions.has(path.extname(filePath).toLowerCase()))
  .sort((left, right) => left.localeCompare(right));

if (!filePaths.length) {
  throw new Error(`No supported files found in ${inputFolder}`);
}

const documents = [];
for (let index = 0; index < filePaths.length; index += 1) {
  documents.push(await processFile(filePaths[index], index));
}

const evidence = makeEvidenceCards(documents);
const issues = makeIssues(evidence);
const timeline = makeTimeline(documents).slice(0, 40);
const missingRecords = makeMissingRecords(documents);

const workspace = {
  caseProfile: {
    name: path.basename(inputFolder),
    role: "Customer / reviewer",
    objective: "Prepare source-grounded questions, quotes, missing-record requests, and meeting-ready evidence packets.",
    meetingDate: "",
  },
  documents,
  evidence,
  issues,
  timeline,
  missingRecords,
  meetingNotes: [],
};

await fs.writeFile(outputFile, `${JSON.stringify(workspace, null, 2)}\n`, "utf8");
await fs.writeFile(
  reportFile,
  buildReport({
    folder: inputFolder,
    documents,
    evidence,
    issues,
    timeline,
    missingRecords,
    output: outputFile,
  }),
  "utf8",
);

console.log(`Wrote ${outputFile}`);
console.log(`Wrote ${reportFile}`);
console.log(
  JSON.stringify(
    {
      documents: documents.length,
      indexed: documents.filter((document) => document.status === "Indexed").length,
      needsOcr: documents.filter((document) => document.status === "Needs OCR").length,
      needsReview: documents.filter((document) => document.status === "Needs review").length,
      ocrBacked: documents.filter((document) => document.ocrBacked).length,
      evidence: evidence.length,
      issues: issues.length,
      timeline: timeline.length,
    },
    null,
    2,
  ),
);
