import { resolveEvidenceCardSource } from "./kernel";
import type { EvidenceCard, SourceGraph, VerificationStatus } from "./types";

const legalTransitions: Record<VerificationStatus, VerificationStatus[]> = {
  suggested: ["cited", "withdrawn"],
  cited: ["verified", "disputed", "withdrawn", "anchor_stale"],
  verified: ["disputed", "superseded", "withdrawn", "anchor_stale"],
  disputed: ["verified", "withdrawn", "superseded"],
  superseded: ["withdrawn"],
  withdrawn: [],
  anchor_stale: ["cited", "withdrawn"],
};

export function canTransitionEvidenceStatus(
  from: VerificationStatus,
  to: VerificationStatus,
) {
  return legalTransitions[from].includes(to);
}

export function gateEvidenceStatusTransition(
  card: EvidenceCard,
  to: VerificationStatus,
  graph: SourceGraph,
) {
  if (to === "cited" || to === "verified") {
    const resolution = resolveEvidenceCardSource(card, graph);
    if (!resolution.ok) return { ok: false as const, reason: resolution.reason };
    if (!resolution.quoteExact) {
      return { ok: false as const, reason: "exact quote does not resolve inside source span" };
    }
    if (!resolution.spanBackedBySource) {
      return {
        ok: false as const,
        reason: "source span text is not backed by page text or media/geometry anchor",
      };
    }
    if (to === "verified" && !resolution.anchorUsable) {
      return {
        ok: false as const,
        reason: `cannot verify card while anchor is ${resolution.span.anchorStatus}`,
      };
    }
  }
  if (card.verificationStatus === to) {
    return { ok: true as const, next: card };
  }
  if (!canTransitionEvidenceStatus(card.verificationStatus, to)) {
    return {
      ok: false as const,
      reason: `illegal evidence state transition: ${card.verificationStatus} -> ${to}`,
    };
  }
  return { ok: true as const, next: { ...card, verificationStatus: to } };
}

export function verifiedCardIds(graph: SourceGraph) {
  return Object.values(graph.evidenceCards)
    .filter((card) => {
      const resolution = resolveEvidenceCardSource(card, graph);
      return (
        card.verificationStatus === "verified" &&
        resolution.ok &&
        resolution.quoteExact &&
        resolution.spanBackedBySource
      );
    })
    .map((card) => card.id);
}
