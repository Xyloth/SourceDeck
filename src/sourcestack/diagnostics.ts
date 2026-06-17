import { requireResolvedVerifiedCard, resolveEvidenceCardSource } from "./kernel";
import { gateEvidenceStatusTransition } from "./verification";
import type { AnchorStatus, GateFailure, SourceGraph, VerificationStatus } from "./types";

export type EvidenceSourceDiagnostic = {
  cardId: string;
  assertion?: string;
  verificationStatus?: VerificationStatus;
  documentId?: string;
  documentTitle?: string;
  pageId?: string;
  mediaSegmentId?: string;
  spanId?: string;
  charRange?: [number, number];
  exactTextPreview?: string;
  anchorStatus?: AnchorStatus;
  sourceTerminates: boolean;
  quoteExact: boolean;
  spanBackedBySource: boolean;
  anchorUsable: boolean;
  canPromoteToVerified: boolean;
  packetEligible: boolean;
  hardWallFailures: GateFailure[];
  blockers: string[];
};

function preview(value: string) {
  return value.length > 180 ? `${value.slice(0, 177)}...` : value;
}

export function diagnoseEvidenceCard(
  graph: SourceGraph,
  cardId: string,
): EvidenceSourceDiagnostic {
  const card = graph.evidenceCards[cardId];
  if (!card) {
    return {
      cardId,
      sourceTerminates: false,
      quoteExact: false,
      spanBackedBySource: false,
      anchorUsable: false,
      canPromoteToVerified: false,
      packetEligible: false,
      hardWallFailures: [
        {
          cardId,
          reason: "packet hard wall: selected card does not exist",
          severity: "hard_wall",
        },
      ],
      blockers: ["selected card does not exist"],
    };
  }

  const resolution = resolveEvidenceCardSource(card, graph);
  const hardWallFailures = requireResolvedVerifiedCard(card, graph);
  const transition = gateEvidenceStatusTransition(card, "verified", graph);
  const blockers = hardWallFailures.map((failure) => failure.reason);
  if (!transition.ok && !blockers.includes(transition.reason)) {
    blockers.push(transition.reason);
  }

  if (!resolution.ok) {
    return {
      cardId,
      assertion: card.assertion,
      verificationStatus: card.verificationStatus,
      documentId: card.sourceDocumentId,
      spanId: card.spanId,
      sourceTerminates: false,
      quoteExact: false,
      spanBackedBySource: false,
      anchorUsable: false,
      canPromoteToVerified: false,
      packetEligible: false,
      hardWallFailures,
      blockers: blockers.length ? blockers : [resolution.reason],
    };
  }

  return {
    cardId,
    assertion: card.assertion,
    verificationStatus: card.verificationStatus,
    documentId: resolution.document.id,
    documentTitle: resolution.document.title,
    pageId: resolution.page?.id,
    mediaSegmentId: resolution.mediaSegment?.id,
    spanId: resolution.span.id,
    charRange: resolution.span.charRange,
    exactTextPreview: preview(resolution.span.exactText),
    anchorStatus: resolution.span.anchorStatus,
    sourceTerminates: true,
    quoteExact: resolution.quoteExact,
    spanBackedBySource: resolution.spanBackedBySource,
    anchorUsable: resolution.anchorUsable,
    canPromoteToVerified: transition.ok,
    packetEligible: hardWallFailures.length === 0,
    hardWallFailures,
    blockers,
  };
}

export function diagnoseEvidenceSet(graph: SourceGraph, cardIds: string[]) {
  return cardIds.map((cardId) => diagnoseEvidenceCard(graph, cardId));
}
