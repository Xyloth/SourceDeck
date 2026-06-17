import { detectPromptInjection, type PromptInjectionFinding } from "./promptInjection";
import { verifySourceVaultManifest, type SourceVaultManifest } from "./sourceVault";
import type { SourceArtifactBlock, SourceArtifactPage } from "./sourceArtifacts";
import type { ContentAddress } from "./types";

export type OcrJobState = "planned" | "blocked";

export type OcrJobPlan = {
  id: string;
  state: OcrJobState;
  documentId: string;
  vaultId: string;
  pageId: string;
  pageIndex: number;
  pageImageRecordId: string;
  pageImageContentHash: ContentAddress;
  reason?: string;
};

export type OcrPlanningResult =
  | { ok: true; vaultId: string; jobs: OcrJobPlan[] }
  | { ok: false; vaultId: string; jobs: OcrJobPlan[]; reason: string };

export type OcrPageResult = {
  jobId: string;
  pageImageRecordId: string;
  pageImageContentHash: ContentAddress;
  text: string;
  confidence: number;
  blocks?: SourceArtifactBlock[];
};

export type OcrGateResult =
  | {
      ok: true;
      page: Pick<SourceArtifactPage, "index" | "text" | "ocrQuality" | "geometry">;
    }
  | {
      ok: false;
      state: "rejected" | "quarantined_prompt_injection";
      reason: string;
      findings?: PromptInjectionFinding[];
    };

function validOcrQuad(quad: [number, number, number, number]) {
  const [x, y, width, height] = quad;
  return (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Number.isFinite(width) &&
    Number.isFinite(height) &&
    x >= 0 &&
    y >= 0 &&
    width > 0 &&
    height > 0
  );
}

export async function planOcrJobsFromVault(
  manifest: SourceVaultManifest,
  options: {
    existingPages?: Array<{ index: number; text?: string; ocrQuality?: number }>;
    minimumAcceptedOcrQuality?: number;
  } = {},
): Promise<OcrPlanningResult> {
  const verification = await verifySourceVaultManifest(manifest);
  if (!verification.ok) {
    return { ok: false, vaultId: manifest.vaultId, jobs: [], reason: verification.reason };
  }
  const minimumAcceptedOcrQuality = options.minimumAcceptedOcrQuality ?? 0.8;
  const existingPages = new Map((options.existingPages ?? []).map((page) => [page.index, page]));
  const jobs = manifest.pageImages
    .filter((pageImage) => {
      const existing = existingPages.get(pageImage.pageIndex);
      return !existing?.text?.trim() || (existing.ocrQuality ?? 0) < minimumAcceptedOcrQuality;
    })
    .map(
      (pageImage): OcrJobPlan => ({
        id: `ocr:${manifest.vaultId}:page:${pageImage.pageIndex}:${pageImage.contentHash}`,
        state: "planned",
        documentId: manifest.documentId,
        vaultId: manifest.vaultId,
        pageId: pageImage.pageId,
        pageIndex: pageImage.pageIndex,
        pageImageRecordId: pageImage.recordId,
        pageImageContentHash: pageImage.contentHash,
      }),
    );
  return { ok: true, vaultId: manifest.vaultId, jobs };
}

export function gateOcrPageResult(job: OcrJobPlan, result: OcrPageResult): OcrGateResult {
  if (job.state !== "planned") {
    return { ok: false, state: "rejected", reason: "OCR job is not planned" };
  }
  if (result.jobId !== job.id) {
    return { ok: false, state: "rejected", reason: "OCR result job mismatch" };
  }
  if (result.pageImageRecordId !== job.pageImageRecordId) {
    return { ok: false, state: "rejected", reason: "OCR result page image record mismatch" };
  }
  if (result.pageImageContentHash !== job.pageImageContentHash) {
    return { ok: false, state: "rejected", reason: "OCR result page image hash mismatch" };
  }
  if (!result.text.trim()) {
    return { ok: false, state: "rejected", reason: "OCR result has no text" };
  }
  if (!Number.isFinite(result.confidence) || result.confidence < 0 || result.confidence > 1) {
    return { ok: false, state: "rejected", reason: "OCR confidence out of range" };
  }
  const findings = detectPromptInjection(result.text);
  if (findings.length) {
    return {
      ok: false,
      state: "quarantined_prompt_injection",
      reason: "OCR text contains source-borne instructions",
      findings,
    };
  }
  const blocks = result.blocks?.length
    ? result.blocks
    : [
        {
          id: `${job.pageId}:ocr:block:0`,
          kind: "text" as const,
          text: result.text,
          confidence: result.confidence,
          quadPoints: [[0, 0, 1, 1] as [number, number, number, number]],
        },
      ];
  const seenBlockIds = new Set<string>([`${job.pageId}:full_text`]);
  for (const block of blocks) {
    if (!block.id.trim()) {
      return { ok: false, state: "rejected", reason: "OCR block id missing" };
    }
    if (seenBlockIds.has(block.id)) {
      return { ok: false, state: "rejected", reason: "OCR duplicate block id" };
    }
    seenBlockIds.add(block.id);
    if (!Number.isFinite(block.confidence) || block.confidence < 0 || block.confidence > 1) {
      return { ok: false, state: "rejected", reason: "OCR block confidence out of range" };
    }
    if (!block.quadPoints.length || !block.quadPoints.every(validOcrQuad)) {
      return { ok: false, state: "rejected", reason: "OCR block quad invalid" };
    }
    if (block.text && !result.text.includes(block.text)) {
      return {
        ok: false,
        state: "rejected",
        reason: "OCR block text is not present in page text",
      };
    }
  }
  return {
    ok: true,
    page: {
      index: job.pageIndex,
      text: result.text,
      ocrQuality: result.confidence,
      geometry: {
        width: Math.max(1, ...blocks.flatMap((block) => block.quadPoints.map((quad) => quad[0] + quad[2]))),
        height: Math.max(1, ...blocks.flatMap((block) => block.quadPoints.map((quad) => quad[1] + quad[3]))),
        unit: "px",
        rotation: 0,
        blocks,
      },
    },
  };
}
