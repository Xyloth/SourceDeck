import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import {
  appendCaseEvent,
  buildSourceGraphFromArtifacts,
  buildGauntletGraph,
  createContentAddressedCaseStore,
  createSourceStackForensicBundle,
  createSourceVaultBlobRecord,
  createSourceVaultManifest,
  createSourceVaultPageImageRecord,
  createTextSourceArtifact,
  runSourceStackGauntlet,
  sourceVaultPayloadBytes,
} from "../src/sourcestack";

const report = await runSourceStackGauntlet();
const outputDir = path.resolve("reports");
const outputFile = path.join(outputDir, "source-gauntlet-report.md");
const jsonOutputFile = path.join(outputDir, "source-gauntlet-report.json");
const hashesOutputFile = path.join(outputDir, "source-gauntlet-report.hashes.json");
const custodyBundleOutputFile = path.join(outputDir, "source-gauntlet-custody-bundle.json");
const categoryCounts = report.results.reduce<Record<string, number>>((counts, result) => {
  counts[result.category] = (counts[result.category] ?? 0) + 1;
  return counts;
}, {});
const failedCount = report.results.filter((result) => !result.passed).length;

function sha256(value: string) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

const bodyLines = [
  "# SourceStack Evidence Gauntlet Report",
  "",
  `Generated: ${report.generatedAt}`,
  `Overall: ${report.passed ? "PASS" : "FAIL"}`,
  `Cases: ${report.results.length}`,
  `Failures: ${failedCount}`,
  "",
  "## Category Counts",
  "",
  ...Object.entries(categoryCounts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([category, count]) => `- ${category}: ${count}`),
  "",
  "| Case | Category | Result | Detail |",
  "| --- | --- | --- | --- |",
  ...report.results.map((result) =>
    `| ${[
      result.id,
      result.category,
      result.passed ? "PASS" : "FAIL",
      result.detail.replace(/\|/g, "/"),
    ]
      .map((cell) => String(cell))
      .join(" | ")} |`,
  ),
  "",
];
const jsonText = JSON.stringify(report, null, 2);
const markdownBody = bodyLines.join("\n");
const reportHashes: Record<string, string> = {
  markdownBodyHash: sha256(markdownBody),
  jsonReportHash: sha256(jsonText),
};
const lines = [
  ...bodyLines,
  "## Report Hashes",
  "",
  `- Markdown body: ${reportHashes.markdownBodyHash}`,
  `- JSON report: ${reportHashes.jsonReportHash}`,
  "",
];

await mkdir(outputDir, { recursive: true });
await writeFile(outputFile, lines.join("\n"), "utf8");
await writeFile(jsonOutputFile, jsonText, "utf8");

const custodyOriginal = await createSourceVaultBlobRecord({
  documentId: "doc_report_custody",
  kind: "original_file",
  mediaType: "application/pdf",
  bytes: new TextEncoder().encode("gauntlet report original bytes"),
  createdAt: "2026-06-02T00:00:00.000Z",
});
const custodyPageImage = await createSourceVaultPageImageRecord({
  documentId: "doc_report_custody",
  pageId: "doc_report_custody:page:1",
  pageIndex: 1,
  mediaType: "image/png",
  bytes: new TextEncoder().encode("gauntlet report rendered page"),
  width: 612,
  height: 792,
  renderScale: 1,
  createdAt: "2026-06-02T00:00:00.000Z",
});
const custodyVault = await createSourceVaultManifest({
  vaultId: "vault_report_custody",
  documentId: "doc_report_custody",
  original: custodyOriginal,
  pageImages: [custodyPageImage],
  createdAt: "2026-06-02T00:00:00.000Z",
});
const custodyArtifact = await createTextSourceArtifact({
  documentId: "doc_report_custody",
  title: "Gauntlet custody report artifact",
  source: "gauntlet reporter",
  text: "The generated custody bundle includes a durable source artifact and ledger event.",
  pages: [
    {
      index: 1,
      text: "The generated custody bundle includes a durable source artifact and ledger event.",
      imageBytes: sourceVaultPayloadBytes(custodyPageImage.payload),
      vault: {
        pageImageRecordId: custodyPageImage.recordId,
        pageImageContentHash: custodyPageImage.contentHash,
        renderScale: custodyPageImage.renderScale,
      },
    },
  ],
  sourceVault: {
    vaultId: custodyVault.vaultId,
    manifestHash: custodyVault.manifestHash,
    originalRecordId: custodyOriginal.recordId,
    originalContentHash: custodyOriginal.contentHash,
  },
  sensitivity: "unknown",
  ingestedAt: "2026-06-02T00:00:00.000Z",
});
const custodyStore = await createContentAddressedCaseStore(
  "case_report_custody",
  "gauntlet-reporter",
  "2026-06-02T00:00:00.000Z",
);
await appendCaseEvent(custodyStore, {
  id: "case_report_custody:event:vault",
  type: "source_vault_verified",
  actor: "gauntlet-reporter",
  at: "2026-06-02T00:00:00.500Z",
  targetId: custodyVault.vaultId,
  payload: {
    documentId: custodyVault.documentId,
    manifestHash: custodyVault.manifestHash,
    originalContentHash: custodyVault.original.contentHash,
    pageImageCount: custodyVault.pageImages.length,
  },
});
await appendCaseEvent(custodyStore, {
  id: "case_report_custody:event:artifact",
  type: "artifact_verified",
  actor: "gauntlet-reporter",
  at: "2026-06-02T00:00:01.000Z",
  targetId: custodyArtifact.artifactId,
  payload: { contentHash: custodyArtifact.contentHash },
});
const custodyGraphBase = buildGauntletGraph();
const custodyArtifactGraph = buildSourceGraphFromArtifacts([custodyArtifact]);
const custodyGraph = {
  ...custodyGraphBase,
  documents: { ...custodyGraphBase.documents, ...custodyArtifactGraph.documents },
  pages: { ...custodyGraphBase.pages, ...custodyArtifactGraph.pages },
};
const custodyBundle = await createSourceStackForensicBundle(custodyGraph, {
  caseName: "SourceStack custody gauntlet fixture",
  packetCardIds: ["card_verified"],
  sourceArtifacts: [custodyArtifact],
  sourceVaultManifests: [custodyVault],
  caseStore: custodyStore,
});
const custodyBundleText = JSON.stringify(custodyBundle, null, 2);
reportHashes.custodyBundleHash = custodyBundle.bundleHash;
reportHashes.custodyBundleFileHash = sha256(custodyBundleText);
await writeFile(hashesOutputFile, JSON.stringify(reportHashes, null, 2), "utf8");
await writeFile(custodyBundleOutputFile, custodyBundleText, "utf8");

console.log(lines.join("\n"));
console.log(`Wrote ${outputFile}`);
console.log(`Wrote ${jsonOutputFile}`);
console.log(`Wrote ${hashesOutputFile}`);
console.log(`Wrote ${custodyBundleOutputFile}`);

if (!report.passed) {
  process.exitCode = 1;
}
