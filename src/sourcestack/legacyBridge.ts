import { emptySourceGraph, stableFingerprint } from "./kernel";
import type {
  EvidenceCard,
  SourceDocument as StackDocument,
  SourceGraph,
  SourcePage,
  SourceSpan,
  BitemporalEvent,
  VerificationStatus,
} from "./types";

export type LegacyDocumentInput = {
  id: string;
  title: string;
  type: string;
  date: string;
  author: string;
  pages: number;
  exhibit: string;
  status: "Indexed" | "Needs OCR" | "Needs review";
  extractedText?: string;
  pageTexts?: Array<{
    page: number;
    text: string;
    geometryBlocks?: Array<{
      id: string;
      kind: SourcePage["layoutBlocks"][number]["kind"];
      text?: string;
      confidence?: number;
      quadPoints?: SourceSpan["quadPoints"];
    }>;
  }>;
  sourceArtifact?: {
    artifactId: string;
    contentHash: string;
    byteLength: number;
    sourceVault?: {
      vaultId: string;
      manifestHash: string;
      originalRecordId: string;
      originalContentHash: string;
    };
    pages: Array<{
      id: string;
      index: number;
      textHash: string;
      imageHash?: string;
    }>;
  };
  sourceArtifactVerified?: boolean;
  sourceArtifactFailure?: string;
  sourceVaultManifest?: {
    vaultId: string;
    manifestHash: string;
    original: {
      recordId: string;
      contentHash: string;
    };
    pageImages: Array<{
      recordId: string;
      pageIndex: number;
      contentHash: string;
    }>;
  };
  sourceVaultVerified?: boolean;
  sourceVaultFailure?: string;
};

export type LegacyEvidenceInput = {
  id: string;
  title: string;
  category: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  documentId: string;
  page: number;
  quote: string;
  meaning: string;
  tags: string[];
  confidence: number;
  packetReady?: boolean;
  verificationStatus?: VerificationStatus;
};

function pageId(documentId: string, pageNumber: number) {
  return `${documentId}:page:${pageNumber || 1}`;
}

function spanId(cardId: string) {
  return `${cardId}:span`;
}

function eventId(cardId: string) {
  return `${cardId}:event`;
}

function validTimeFromDocument(document: LegacyDocumentInput | undefined) {
  return document?.date ? `${document.date}T00:00:00.000Z` : new Date().toISOString();
}

function sourceTextForPage(document: LegacyDocumentInput | undefined, pageNumber: number) {
  if (!document) return "";
  return (
    document.pageTexts?.find((page) => page.page === pageNumber)?.text ??
    (pageNumber === 1 ? document.extractedText : undefined) ??
    ""
  );
}

function sourcePageInput(document: LegacyDocumentInput | undefined, pageNumber: number) {
  return document?.pageTexts?.find((page) => page.page === pageNumber);
}

function legacyStrength(
  card: LegacyEvidenceInput,
  verificationStatus: VerificationStatus,
  anchorStatus: SourceSpan["anchorStatus"],
) {
  const humanVerification = verificationStatus === "verified" ? 100 : 0;
  const anchorQuality = anchorStatus === "stable" ? 80 : anchorStatus === "low_confidence" ? 40 : 0;
  return {
    overall: card.confidence,
    sourceTier: card.priority === "Critical" ? 90 : card.priority === "High" ? 78 : 60,
    directness: Math.min(100, card.confidence),
    corroborationCount: 0,
    contradictionLoad: 0,
    authentication: humanVerification,
    currency: 75,
    anchorQuality,
    humanVerification,
    domainWeight: 70,
    reasons: [
      "legacy workspace card adapted into SourceStack",
      verificationStatus === "verified"
        ? "exact quote located inside source text before verification carried forward"
        : "not verified for packet export",
      anchorStatus === "anchor_stale"
        ? "legacy quote could not be located in source text and failed closed"
        : `legacy anchor status: ${anchorStatus}`,
    ],
  };
}

export function buildLegacySourceGraph(
  documents: LegacyDocumentInput[],
  cards: LegacyEvidenceInput[],
): SourceGraph {
  const graph = emptySourceGraph();

  documents.forEach((document) => {
    const textBasis =
      document.extractedText ??
      document.pageTexts?.map((page) => page.text).join("\n\n") ??
      `${document.title} ${document.exhibit}`;
    const stackDocument: StackDocument = {
      id: document.id,
      contentHash: document.sourceArtifact?.contentHash ?? `legacy:${stableFingerprint(textBasis)}`,
      source: document.exhibit,
      title: document.title,
      mime: document.type,
      ingestedAt: document.date,
      metadata: {
        author: document.author,
        exhibit: document.exhibit,
        status: document.status,
        sourceArtifactId: document.sourceArtifact?.artifactId ?? null,
        sourceArtifactHash: document.sourceArtifact?.contentHash ?? null,
        sourceArtifactVerified: document.sourceArtifactVerified ?? null,
        sourceArtifactFailure: document.sourceArtifactFailure ?? null,
        sourceVaultId:
          document.sourceArtifact?.sourceVault?.vaultId ??
          document.sourceVaultManifest?.vaultId ??
          null,
        sourceVaultManifestHash:
          document.sourceArtifact?.sourceVault?.manifestHash ??
          document.sourceVaultManifest?.manifestHash ??
          null,
        sourceVaultOriginalHash:
          document.sourceArtifact?.sourceVault?.originalContentHash ??
          document.sourceVaultManifest?.original.contentHash ??
          null,
        sourceVaultVerified: document.sourceVaultVerified ?? null,
        sourceVaultFailure: document.sourceVaultFailure ?? null,
      },
      sensitivity: "unknown",
    };
    graph.documents[document.id] = stackDocument;
    const pages = Math.max(1, document.pages || document.pageTexts?.length || 1);
    for (let index = 1; index <= pages; index += 1) {
      const pageInput = sourcePageInput(document, index);
      const artifactPage = document.sourceArtifact?.pages.find((page) => page.index === index);
      const vaultPageImage = document.sourceVaultManifest?.pageImages.find(
        (pageImage) => pageImage.pageIndex === index,
      );
      const text = sourceTextForPage(document, index);
      const geometryLayoutBlocks =
        pageInput?.geometryBlocks?.map((block) => ({
          id: block.id,
          kind: block.kind,
          text: block.text,
          confidence: block.confidence,
        })) ?? [];
      const stackPage: SourcePage = {
        id: pageId(document.id, index),
        documentId: document.id,
        index,
        imageHash:
          vaultPageImage?.contentHash ??
          artifactPage?.imageHash ??
          artifactPage?.textHash ??
          `legacy-page:${stableFingerprint(text || `${document.id}:${index}`)}`,
        ocrQuality: document.status === "Indexed" ? 0.85 : 0.25,
        layoutBlocks: [
          ...(text
            ? [
                {
                  id: `${document.id}:block:${index}:full_text`,
                  kind: "text" as const,
                  text,
                  confidence: document.status === "Indexed" ? 0.85 : 0.25,
                },
              ]
            : []),
          ...geometryLayoutBlocks,
        ],
      };
      graph.pages[stackPage.id] = stackPage;
    }
  });

  cards.forEach((card) => {
    const document = documents.find((item) => item.id === card.documentId);
    const pageNumber = card.page || 1;
    const pageText = sourceTextForPage(document, pageNumber);
    const pageInput = sourcePageInput(document, pageNumber);
    const quoteStart = pageText.indexOf(card.quote);
    const quoteResolved = quoteStart >= 0 && Boolean(card.quote.trim());
    const anchorStatus: SourceSpan["anchorStatus"] = quoteResolved
      ? card.page
        ? "stable"
        : "unresolved"
      : pageText
        ? "anchor_stale"
        : "unresolved";
    const originalVerificationStatus =
      card.verificationStatus ?? (card.packetReady ? "verified" : "cited");
    const verificationStatus: VerificationStatus =
      quoteResolved && anchorStatus === "stable" ? originalVerificationStatus : "anchor_stale";
    const exactText = quoteResolved ? pageText.slice(quoteStart, quoteStart + card.quote.length) : "";
    const matchedGeometryBlock = pageInput?.geometryBlocks?.find((block) => {
      if (!block.text) return false;
      return card.quote.includes(block.text) || block.text.includes(card.quote);
    });
    const sourceSpan: SourceSpan = {
      id: spanId(card.id),
      documentId: card.documentId,
      pageId: pageId(card.documentId, pageNumber),
      quadPoints: quoteResolved ? matchedGeometryBlock?.quadPoints ?? [] : [],
      charRange: quoteResolved ? [quoteStart, quoteStart + card.quote.length] : [0, 0],
      semanticFingerprint: stableFingerprint(`${card.quote} ${pageText}`),
      structuralPath: ["legacy-workspace", card.id],
      exactText,
      anchorStatus,
      quality: quoteResolved && anchorStatus === "stable" ? 0.8 : 0,
    };
    graph.spans[sourceSpan.id] = sourceSpan;
    const evidenceCard: EvidenceCard = {
      id: card.id,
      assertion: card.title,
      sourceDocumentId: card.documentId,
      pageId: sourceSpan.pageId,
      spanId: sourceSpan.id,
      exactQuoteOrSegment: card.quote,
      plainLanguageMeaning: card.meaning,
      tags: card.tags,
      issueLinks: [],
      strengthScore: legacyStrength(card, verificationStatus, anchorStatus),
      contradictionLinks: [],
      corroborationLinks: [],
      supersessionLinks: [],
      verificationStatus,
      provenanceId: "legacy_workspace_adapter",
    };
    graph.evidenceCards[evidenceCard.id] = evidenceCard;
    if (quoteResolved) {
      const event: BitemporalEvent = {
        id: eventId(card.id),
        validTime: validTimeFromDocument(document),
        transactionTime: graph.provenance.legacy_workspace_adapter?.at ?? new Date().toISOString(),
        sourceSpanId: sourceSpan.id,
        entities: Array.from(new Set([card.category, ...card.tags])).slice(0, 8),
        description: `${card.title}. ${card.quote}`,
      };
      graph.events[event.id] = event;
    }
  });

  graph.provenance.legacy_workspace_adapter = {
    id: "legacy_workspace_adapter",
    inputs: ["legacy React localStorage workspace"],
    at: new Date().toISOString(),
    actor: "SourceStack legacy bridge",
  };
  return graph;
}

export function legacyPacketHardWall(
  documents: LegacyDocumentInput[],
  cards: LegacyEvidenceInput[],
) {
  const graph = buildLegacySourceGraph(documents, cards);
  return cards.map((card) => ({
    card,
    sourceCard: graph.evidenceCards[card.id],
    verified: graph.evidenceCards[card.id]?.verificationStatus === "verified",
  }));
}
