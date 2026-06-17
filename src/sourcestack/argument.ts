import { resolveEvidenceCardSource } from "./kernel";
import type { Claim, EvidenceCard, IssueTheory, SourceGraph, VerificationStatus } from "./types";

export type IssueProofPath = {
  strongestPath: EvidenceCard[];
  weakestLink?: EvidenceCard;
  blockedCardIds: string[];
  packetReadiness: "ready" | "blocked_by_unverified_cards" | "missing_records" | "needs_review";
  reasons: string[];
};

export type ClaimProofPath = IssueProofPath & {
  claimId: string;
  claim?: Claim;
};

export type IssueTheoryProofPath = IssueProofPath & {
  issueTheoryId: string;
  issueTheory?: IssueTheory;
  claimProofs: ClaimProofPath[];
  blockedClaimIds: string[];
};

const packetUsableClaimStatuses = new Set<VerificationStatus>(["cited", "verified"]);

function uniquePreservingOrder(values: string[]) {
  return Array.from(new Set(values));
}

function duplicateValues(values: string[]) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  values.forEach((value) => {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  });
  return Array.from(duplicates);
}

function cardProofScore(card: EvidenceCard) {
  const strength = card.strengthScore;
  return (
    strength.overall * 0.45 +
    strength.directness * 0.18 +
    strength.sourceTier * 0.12 +
    strength.authentication * 0.12 +
    strength.anchorQuality * 0.08 +
    strength.humanVerification * 0.05 -
    strength.contradictionLoad * 0.2
  );
}

export function computeIssueProofPath(
  graph: SourceGraph,
  cardIds: string[],
  options: { maxCards?: number } = {},
): IssueProofPath {
  const maxCards = options.maxCards ?? 4;
  const resolved: EvidenceCard[] = [];
  const blockedCardIds: string[] = [];
  const reasons: string[] = [];
  const seenCardIds = new Set<string>();

  cardIds.forEach((cardId) => {
    if (seenCardIds.has(cardId)) {
      if (!blockedCardIds.includes(cardId)) blockedCardIds.push(cardId);
      reasons.push(`${cardId}: duplicate evidence card reference`);
      return;
    }
    seenCardIds.add(cardId);
    const card = graph.evidenceCards[cardId];
    if (!card) {
      blockedCardIds.push(cardId);
      reasons.push(`${cardId}: missing evidence card`);
      return;
    }
    const resolution = resolveEvidenceCardSource(card, graph);
    if (card.verificationStatus !== "verified") {
      blockedCardIds.push(cardId);
      reasons.push(`${cardId}: ${card.verificationStatus}, not verified`);
      return;
    }
    if (!resolution.ok) {
      blockedCardIds.push(cardId);
      reasons.push(`${cardId}: ${resolution.reason}`);
      return;
    }
    if (!resolution.quoteExact || !resolution.spanBackedBySource || !resolution.anchorUsable) {
      blockedCardIds.push(cardId);
      reasons.push(`${cardId}: quote, source backing, or anchor is not packet-usable`);
      return;
    }
    resolved.push(card);
  });

  const sorted = resolved.sort((left, right) => cardProofScore(right) - cardProofScore(left));
  const weakestLink = sorted.length
    ? sorted.reduce((weakest, card) =>
        cardProofScore(card) < cardProofScore(weakest) ? card : weakest,
      )
    : undefined;
  const packetReadiness = blockedCardIds.length
    ? "blocked_by_unverified_cards"
    : sorted.length
      ? "ready"
      : "needs_review";

  return {
    strongestPath: sorted.slice(0, maxCards),
    weakestLink,
    blockedCardIds,
    packetReadiness,
    reasons,
  };
}

export function computeClaimProofPath(
  graph: SourceGraph,
  claimId: string,
  options: { maxCards?: number } = {},
): ClaimProofPath {
  const claim = graph.claims[claimId];
  if (!claim) {
    return {
      claimId,
      strongestPath: [],
      blockedCardIds: [],
      packetReadiness: "missing_records",
      reasons: [`${claimId}: missing claim`],
    };
  }

  const proof = computeIssueProofPath(graph, claim.supportingCardIds, options);
  const reasons = [...proof.reasons];
  let packetReadiness = proof.packetReadiness;

  if (!claim.supportingCardIds.length) {
    reasons.push(`${claim.id}: claim has no supporting evidence cards`);
    packetReadiness = "needs_review";
  }
  if (!packetUsableClaimStatuses.has(claim.verificationStatus)) {
    reasons.push(`${claim.id}: claim is ${claim.verificationStatus}, not packet-usable`);
    packetReadiness =
      claim.verificationStatus === "withdrawn" || claim.verificationStatus === "superseded"
        ? "missing_records"
        : "blocked_by_unverified_cards";
  }

  return {
    claimId,
    claim,
    strongestPath: proof.strongestPath,
    weakestLink: proof.weakestLink,
    blockedCardIds: proof.blockedCardIds,
    packetReadiness,
    reasons,
  };
}

function combineReadiness(readiness: IssueProofPath["packetReadiness"][]) {
  if (readiness.includes("missing_records")) return "missing_records";
  if (readiness.includes("blocked_by_unverified_cards")) {
    return "blocked_by_unverified_cards";
  }
  if (readiness.includes("needs_review")) return "needs_review";
  return readiness.length ? "ready" : "needs_review";
}

export function computeIssueTheoryProofPath(
  graph: SourceGraph,
  issueTheoryId: string,
  options: { maxCards?: number } = {},
): IssueTheoryProofPath {
  const issueTheory = graph.issueTheories[issueTheoryId];
  if (!issueTheory) {
    return {
      issueTheoryId,
      claimProofs: [],
      blockedClaimIds: [issueTheoryId],
      strongestPath: [],
      blockedCardIds: [],
      packetReadiness: "missing_records",
      reasons: [`${issueTheoryId}: missing issue theory`],
    };
  }

  const duplicateClaimIds = duplicateValues(issueTheory.claimIds);
  const claimProofs = uniquePreservingOrder(issueTheory.claimIds).map((claimId) =>
    computeClaimProofPath(graph, claimId, options),
  );
  const blockedClaimIds = uniquePreservingOrder([
    ...claimProofs
      .filter((proof) => proof.packetReadiness !== "ready")
      .map((proof) => proof.claimId),
    ...duplicateClaimIds,
  ]);
  const allSupportingCardIds = Array.from(
    new Set(
      issueTheory.claimIds.flatMap((claimId) => graph.claims[claimId]?.supportingCardIds ?? []),
    ),
  );
  const aggregateProof = computeIssueProofPath(graph, allSupportingCardIds, options);
  const reasons = claimProofs.flatMap((proof) => proof.reasons);
  duplicateClaimIds.forEach((claimId) => {
    reasons.push(`${claimId}: duplicate issue theory claim reference`);
  });
  if (!issueTheory.claimIds.length) {
    reasons.push(`${issueTheory.id}: issue theory has no claims`);
  }
  const basePacketReadiness = issueTheory.claimIds.length
    ? combineReadiness(claimProofs.map((proof) => proof.packetReadiness))
    : "needs_review";
  const packetReadiness =
    duplicateClaimIds.length && basePacketReadiness === "ready"
      ? "needs_review"
      : basePacketReadiness;

  return {
    issueTheoryId,
    issueTheory,
    claimProofs,
    blockedClaimIds,
    strongestPath: aggregateProof.strongestPath,
    weakestLink: aggregateProof.weakestLink,
    blockedCardIds: Array.from(
      new Set([
        ...aggregateProof.blockedCardIds,
        ...claimProofs.flatMap((proof) => proof.blockedCardIds),
      ]),
    ),
    packetReadiness,
    reasons,
  };
}
