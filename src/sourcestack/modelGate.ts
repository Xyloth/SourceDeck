import { resolveEvidenceCardSource } from "./kernel";
import type { EvidenceCard, ModelJobContract, SourceGraph } from "./types";

export type CandidateEvidenceCard = {
  id: string;
  assertion: string;
  documentId?: string;
  pageId?: string;
  mediaSegmentId?: string;
  spanId?: string;
  exactQuoteOrExcerpt?: string;
  meaning?: string;
  confidence?: number;
};

export type CandidateGateResult = {
  accepted: EvidenceCard[];
  rejected: Array<{ candidateId: string; reason: string }>;
};

export function gateCandidateEvidenceCards(
  contract: ModelJobContract,
  candidates: CandidateEvidenceCard[],
  graph: SourceGraph,
): CandidateGateResult {
  const accepted: EvidenceCard[] = [];
  const rejected: Array<{ candidateId: string; reason: string }> = [];
  const candidateIdCounts = new Map<string, number>();
  candidates.forEach((candidate) => {
    candidateIdCounts.set(candidate.id, (candidateIdCounts.get(candidate.id) ?? 0) + 1);
  });

  candidates.forEach((candidate) => {
    if (!candidate.id.trim()) {
      rejected.push({
        candidateId: candidate.id,
        reason: "model output missing candidate id",
      });
      return;
    }
    if ((candidateIdCounts.get(candidate.id) ?? 0) > 1) {
      rejected.push({
        candidateId: candidate.id,
        reason: "model output duplicate candidate id",
      });
      return;
    }
    if (!candidate.documentId || !candidate.spanId || !candidate.exactQuoteOrExcerpt) {
      rejected.push({
        candidateId: candidate.id,
        reason: "model output missing source references required by job contract",
      });
      return;
    }
    const confidence = candidate.confidence ?? 0.5;
    if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
      rejected.push({
        candidateId: candidate.id,
        reason: "model confidence must be between 0 and 1",
      });
      return;
    }
    if (
      contract.verificationPolicy === "verified_only_destination" ||
      contract.destinationPolicy === "packet"
    ) {
      rejected.push({
        candidateId: candidate.id,
        reason: "model candidates cannot be accepted for verified-only packet destinations",
      });
      return;
    }
    const card: EvidenceCard = {
      id: candidate.id,
      assertion: candidate.assertion,
      sourceDocumentId: candidate.documentId,
      pageId: candidate.pageId,
      mediaSegmentId: candidate.mediaSegmentId,
      spanId: candidate.spanId,
      exactQuoteOrSegment: candidate.exactQuoteOrExcerpt,
      plainLanguageMeaning: candidate.meaning ?? candidate.assertion,
      tags: [contract.jobName],
      issueLinks: [],
      strengthScore: {
        overall: Math.round(confidence * 100),
        sourceTier: 0,
        directness: 0,
        corroborationCount: 0,
        contradictionLoad: 0,
        authentication: 0,
        currency: 0,
        anchorQuality: 0,
        humanVerification: 0,
        domainWeight: 0,
        reasons: ["model candidate gated by source resolver"],
      },
      contradictionLinks: [],
      corroborationLinks: [],
      supersessionLinks: [],
      verificationStatus: "suggested",
      provenanceId: contract.id,
    };
    const resolution = resolveEvidenceCardSource(card, graph);
    if (!resolution.ok || !resolution.quoteExact || !resolution.spanBackedBySource) {
      rejected.push({
        candidateId: candidate.id,
        reason: resolution.ok
          ? resolution.quoteExact
            ? "candidate span text is not backed by source text or media/geometry anchor"
            : "candidate quote does not resolve in span"
          : resolution.reason,
      });
      return;
    }
    if (candidate.pageId && candidate.pageId !== resolution.span.pageId) {
      rejected.push({
        candidateId: candidate.id,
        reason: "candidate page reference does not match resolved span",
      });
      return;
    }
    if (
      candidate.mediaSegmentId &&
      candidate.mediaSegmentId !== resolution.span.mediaSegmentId
    ) {
      rejected.push({
        candidateId: candidate.id,
        reason: "candidate media segment reference does not match resolved span",
      });
      return;
    }
    accepted.push({
      ...card,
      pageId: resolution.span.pageId,
      mediaSegmentId: resolution.span.mediaSegmentId,
      verificationStatus:
        contract.verificationPolicy === "resolve_to_cited" ? "cited" : "suggested",
    });
  });

  return { accepted, rejected };
}
