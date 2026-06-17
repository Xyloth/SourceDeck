import { contentAddress, emptySourceGraph, stableFingerprint } from "./kernel";
import type {
  ContentAddress,
  SourceGraph,
  SourcePage,
  SourceSensitivity,
  SourceSpan,
} from "./types";

export type ArtifactQuad = [number, number, number, number];

export type SourceArtifactBlock = {
  id: string;
  kind: SourcePage["layoutBlocks"][number]["kind"];
  text?: string;
  confidence: number;
  quadPoints: ArtifactQuad[];
};

export type SourceArtifactPage = {
  id: string;
  documentId: string;
  index: number;
  text: string;
  textHash: ContentAddress;
  imageHash?: ContentAddress;
  ocrQuality: number;
  geometry: {
    width: number;
    height: number;
    unit: "pt" | "px";
    rotation: 0 | 90 | 180 | 270;
    blocks: SourceArtifactBlock[];
  };
  geometryHash: ContentAddress;
  vault?: {
    pageImageRecordId?: string;
    pageImageContentHash?: ContentAddress;
    renderScale?: number;
  };
};

export type DurableSourceArtifact = {
  format: "sourcedeck.source-artifact.v1";
  artifactId: string;
  documentId: string;
  title: string;
  source: string;
  mediaType: string;
  contentHash: ContentAddress;
  byteLength: number;
  ingestedAt: string;
  sensitivity: SourceSensitivity;
  payload: {
    encoding: "utf8" | "base64";
    data: string;
  };
  pages: SourceArtifactPage[];
  sourceVault?: {
    vaultId: string;
    manifestHash: ContentAddress;
    originalRecordId: string;
    originalContentHash: ContentAddress;
  };
  metadata: Record<string, string | number | boolean | null>;
};

export type SourceArtifactVerification =
  | { ok: true; artifactId: string; pageCount: number }
  | { ok: false; artifactId: string; reason: string };

export type ArtifactSpanResolution =
  | { ok: true; span: SourceSpan }
  | { ok: false; reason: string; staleSpan: SourceSpan };

export const SOURCE_ARTIFACT_CASE_STORE_MEDIA_TYPE =
  "application/vnd.sourcedeck.source-artifact+json";

function arrayBufferFrom(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function bytesFromPayload(payload: DurableSourceArtifact["payload"]) {
  if (payload.encoding === "utf8") return new TextEncoder().encode(payload.data);
  if (typeof atob !== "function") {
    throw new Error("Base64 decoding requires atob support.");
  }
  return Uint8Array.from(atob(payload.data), (char) => char.charCodeAt(0));
}

function bytesToBase64(bytes: Uint8Array) {
  if (typeof btoa !== "function") {
    throw new Error("Base64 encoding requires btoa support.");
  }
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary);
}

function payloadFromText(text: string): DurableSourceArtifact["payload"] {
  return { encoding: "utf8", data: text };
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => typeof entryValue !== "undefined")
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${canonicalJson(entryValue)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function serializeDurableSourceArtifactForCaseStore(
  artifact: DurableSourceArtifact,
): string {
  return canonicalJson(artifact);
}

function defaultPageBlock(documentId: string, pageIndex: number, text: string): SourceArtifactBlock {
  return {
    id: `${documentId}:page:${pageIndex}:block:0`,
    kind: "text",
    text,
    confidence: 0.99,
    quadPoints: [[72, 72, 468, 18]],
  };
}

function quadWithinPage(quad: ArtifactQuad, width: number, height: number) {
  const [x, y, quadWidth, quadHeight] = quad;
  return (
    Number.isFinite(x) &&
    Number.isFinite(y) &&
    Number.isFinite(quadWidth) &&
    Number.isFinite(quadHeight) &&
    x >= 0 &&
    y >= 0 &&
    quadWidth > 0 &&
    quadHeight > 0 &&
    x + quadWidth <= width &&
    y + quadHeight <= height
  );
}

function canonicalArtifactGeometry(geometry: SourceArtifactPage["geometry"]) {
  return JSON.stringify({
    width: geometry.width,
    height: geometry.height,
    unit: geometry.unit,
    rotation: geometry.rotation,
    blocks: geometry.blocks.map((block) => ({
      id: block.id,
      kind: block.kind,
      text: block.text ?? null,
      confidence: block.confidence,
      quadPoints: block.quadPoints,
    })),
  });
}

// Content-addresses page geometry (dimensions, rotation, and every block's quad/text/confidence)
// so a citation highlight cannot be moved to a different in-bounds region without detection.
export async function hashArtifactPageGeometry(
  geometry: SourceArtifactPage["geometry"],
): Promise<ContentAddress> {
  return contentAddress(canonicalArtifactGeometry(geometry));
}

export async function createTextSourceArtifact(input: {
  documentId: string;
  title: string;
  source: string;
  text: string;
  pages?: Array<{
    index: number;
    text: string;
    imageBytes?: Uint8Array;
    ocrQuality?: number;
    geometry?: SourceArtifactPage["geometry"];
    vault?: SourceArtifactPage["vault"];
  }>;
  sourceVault?: DurableSourceArtifact["sourceVault"];
  sensitivity?: SourceSensitivity;
  metadata?: Record<string, string | number | boolean | null>;
  ingestedAt?: string;
}): Promise<DurableSourceArtifact> {
  const bytes = new TextEncoder().encode(input.text);
  const contentHash = await contentAddress(bytes);
  const pageInputs = input.pages?.length
    ? input.pages
    : [{ index: 1, text: input.text, ocrQuality: 0.99 }];
  const pages: SourceArtifactPage[] = [];
  for (const pageInput of pageInputs) {
    const pageId = `${input.documentId}:page:${pageInput.index}`;
    const geometry: SourceArtifactPage["geometry"] = pageInput.geometry ?? {
      width: 612,
      height: 792,
      unit: "pt",
      rotation: 0,
      blocks: [defaultPageBlock(input.documentId, pageInput.index, pageInput.text)],
    };
    pages.push({
      id: pageId,
      documentId: input.documentId,
      index: pageInput.index,
      text: pageInput.text,
      textHash: await contentAddress(pageInput.text),
      imageHash: pageInput.imageBytes
        ? await contentAddress(new Uint8Array(arrayBufferFrom(pageInput.imageBytes)))
        : undefined,
      ocrQuality: pageInput.ocrQuality ?? 0.99,
      geometry,
      geometryHash: await hashArtifactPageGeometry(geometry),
      vault: pageInput.vault,
    });
  }
  return {
    format: "sourcedeck.source-artifact.v1",
    artifactId: `source-artifact:${contentHash}`,
    documentId: input.documentId,
    title: input.title,
    source: input.source,
    mediaType: "text/plain",
    contentHash,
    byteLength: bytes.byteLength,
    ingestedAt: input.ingestedAt ?? new Date().toISOString(),
    sensitivity: input.sensitivity ?? "unknown",
    payload: payloadFromText(input.text),
    pages,
    sourceVault: input.sourceVault,
    metadata: input.metadata ?? {},
  };
}

export async function verifySourceArtifact(
  artifact: DurableSourceArtifact,
): Promise<SourceArtifactVerification> {
  if (artifact.format !== "sourcedeck.source-artifact.v1") {
    return { ok: false, artifactId: artifact.artifactId, reason: "unsupported artifact format" };
  }
  const bytes = bytesFromPayload(artifact.payload);
  if (bytes.byteLength !== artifact.byteLength) {
    return { ok: false, artifactId: artifact.artifactId, reason: "artifact byte length mismatch" };
  }
  const contentHash = await contentAddress(bytes);
  if (contentHash !== artifact.contentHash) {
    return { ok: false, artifactId: artifact.artifactId, reason: "artifact content hash mismatch" };
  }
  if (artifact.artifactId !== `source-artifact:${artifact.contentHash}`) {
    return { ok: false, artifactId: artifact.artifactId, reason: "source artifact id mismatch" };
  }
  const seenPageIds = new Set<string>();
  const seenPageIndexes = new Set<number>();
  for (const page of artifact.pages) {
    if (page.documentId !== artifact.documentId) {
      return { ok: false, artifactId: artifact.artifactId, reason: "page document mismatch" };
    }
    if (!Number.isInteger(page.index) || page.index < 1) {
      return { ok: false, artifactId: artifact.artifactId, reason: "page index invalid" };
    }
    if (seenPageIds.has(page.id)) {
      return { ok: false, artifactId: artifact.artifactId, reason: "duplicate artifact page id" };
    }
    seenPageIds.add(page.id);
    if (seenPageIndexes.has(page.index)) {
      return { ok: false, artifactId: artifact.artifactId, reason: "duplicate artifact page index" };
    }
    seenPageIndexes.add(page.index);
    if (page.id !== `${artifact.documentId}:page:${page.index}`) {
      return { ok: false, artifactId: artifact.artifactId, reason: "artifact page id mismatch" };
    }
    if (page.vault?.pageImageContentHash && page.imageHash !== page.vault.pageImageContentHash) {
      return { ok: false, artifactId: artifact.artifactId, reason: "page image vault hash mismatch" };
    }
    if ((await contentAddress(page.text)) !== page.textHash) {
      return { ok: false, artifactId: artifact.artifactId, reason: "page text hash mismatch" };
    }
    if (!Number.isFinite(page.ocrQuality) || page.ocrQuality < 0 || page.ocrQuality > 1) {
      return { ok: false, artifactId: artifact.artifactId, reason: "page OCR quality out of range" };
    }
    if (
      !Number.isFinite(page.geometry.width) ||
      !Number.isFinite(page.geometry.height) ||
      page.geometry.width <= 0 ||
      page.geometry.height <= 0
    ) {
      return { ok: false, artifactId: artifact.artifactId, reason: "page geometry dimensions invalid" };
    }
    const seenBlockIds = new Set<string>([`${page.id}:full_text`]);
    for (const block of page.geometry.blocks) {
      if (!block.id.trim()) {
        return { ok: false, artifactId: artifact.artifactId, reason: "artifact block id missing" };
      }
      if (seenBlockIds.has(block.id)) {
        return { ok: false, artifactId: artifact.artifactId, reason: "duplicate artifact block id" };
      }
      seenBlockIds.add(block.id);
      if (!Number.isFinite(block.confidence) || block.confidence < 0 || block.confidence > 1) {
        return { ok: false, artifactId: artifact.artifactId, reason: "block confidence out of range" };
      }
      if (!block.quadPoints.length) {
        return { ok: false, artifactId: artifact.artifactId, reason: "block quad missing" };
      }
      if (!block.quadPoints.every((quad) => quadWithinPage(quad, page.geometry.width, page.geometry.height))) {
        return { ok: false, artifactId: artifact.artifactId, reason: "block quad outside page bounds" };
      }
      if (block.text && !page.text.includes(block.text)) {
        return { ok: false, artifactId: artifact.artifactId, reason: "block text not present in page text" };
      }
    }
    if (!page.geometryHash) {
      return { ok: false, artifactId: artifact.artifactId, reason: "page geometry hash missing" };
    }
    if (page.geometryHash !== (await hashArtifactPageGeometry(page.geometry))) {
      return { ok: false, artifactId: artifact.artifactId, reason: "page geometry hash mismatch" };
    }
  }
  return { ok: true, artifactId: artifact.artifactId, pageCount: artifact.pages.length };
}

export function buildSourceGraphFromArtifacts(artifacts: DurableSourceArtifact[]): SourceGraph {
  const graph = emptySourceGraph();
  artifacts.forEach((artifact) => {
    graph.documents[artifact.documentId] = {
      id: artifact.documentId,
      contentHash: artifact.contentHash,
      source: artifact.source,
      title: artifact.title,
      mime: artifact.mediaType,
      ingestedAt: artifact.ingestedAt,
      metadata: {
        ...artifact.metadata,
        sourceArtifactId: artifact.artifactId,
        sourceVaultId: artifact.sourceVault?.vaultId ?? null,
        sourceVaultManifestHash: artifact.sourceVault?.manifestHash ?? null,
        sourceVaultOriginalHash: artifact.sourceVault?.originalContentHash ?? null,
      },
      sensitivity: artifact.sensitivity,
    };
    artifact.pages.forEach((page) => {
      graph.pages[page.id] = {
        id: page.id,
        documentId: artifact.documentId,
        index: page.index,
        imageHash: page.imageHash,
        ocrQuality: page.ocrQuality,
        layoutBlocks: [
          {
            id: `${page.id}:full_text`,
            kind: "text",
            text: page.text,
            confidence: page.ocrQuality,
          },
          ...page.geometry.blocks.map((block) => ({
            id: block.id,
            kind: block.kind,
            text: block.text,
            confidence: block.confidence,
          })),
        ],
      };
    });
  });
  return graph;
}

export function createArtifactBackedSpan(input: {
  artifact: DurableSourceArtifact;
  pageIndex: number;
  quote: string;
  spanId?: string;
}): ArtifactSpanResolution {
  const page = input.artifact.pages.find((candidate) => candidate.index === input.pageIndex);
  const structuralPath = [`artifact:${input.artifact.artifactId}`, `page:${input.pageIndex}`];
  const fallbackSpan: SourceSpan = {
    id: input.spanId ?? `${input.artifact.documentId}:span:unresolved`,
    documentId: input.artifact.documentId,
    pageId: page?.id,
    quadPoints: [],
    charRange: [0, 0],
    semanticFingerprint: stableFingerprint(input.quote),
    structuralPath,
    exactText: input.quote,
    anchorStatus: "anchor_stale",
    quality: 0,
  };
  if (!page) return { ok: false, reason: "artifact page not found", staleSpan: fallbackSpan };
  const offset = page.text.indexOf(input.quote);
  if (offset < 0) {
    return { ok: false, reason: "quote not found in artifact page text", staleSpan: fallbackSpan };
  }
  // Only claim a highlight quad when a block actually contains the quote. Borrowing the first
  // block's quad on a miss would point the citation highlight at the wrong region of the page;
  // the span stays text-backed via charRange, so leaving quadPoints empty is the honest result.
  const matchingBlock = page.geometry.blocks.find((block) => block.text?.includes(input.quote));
  return {
    ok: true,
    span: {
      id: input.spanId ?? `${input.artifact.documentId}:span:${stableFingerprint(input.quote)}`,
      documentId: input.artifact.documentId,
      pageId: page.id,
      quadPoints: matchingBlock?.quadPoints ?? [],
      charRange: [offset, offset + input.quote.length],
      semanticFingerprint: stableFingerprint(input.quote),
      structuralPath,
      exactText: input.quote,
      anchorStatus: "stable",
      quality: matchingBlock
        ? Math.min(page.ocrQuality, matchingBlock.confidence)
        : page.ocrQuality,
    },
  };
}

export function createBinarySourceArtifactPayload(bytes: Uint8Array): DurableSourceArtifact["payload"] {
  return { encoding: "base64", data: bytesToBase64(bytes) };
}
