import { reanchorSpanToText } from "./anchoring";
import { contentAddress, resolveEvidenceCardSource, sourceBackingTextForSpan } from "./kernel";
import { diagnoseEvidenceCard, type EvidenceSourceDiagnostic } from "./diagnostics";
import { gateEvidenceStatusTransition } from "./verification";
import type { EvidenceCard, SourceGraph, SourceSpan, VerificationStatus } from "./types";

// The Verification Workbench is where a human moves evidence through verification states. This
// module is its deterministic core: it tells the reviewer the full source-proof state and the legal
// next-actions, performs an ATTRIBUTABLE, FAIL-CLOSED signoff, and binds that signoff by content
// hash to exactly the source state the reviewer approved - so a later change to the source makes a
// prior signoff detectably stale.

export type WorkbenchAction = {
  to: VerificationStatus;
  allowed: boolean;
  reason?: string;
};

const SIGN_OFF_TARGET_STATES: VerificationStatus[] = [
  "cited",
  "verified",
  "disputed",
  "withdrawn",
  "superseded",
  "anchor_stale",
];

export type VerificationInspectionTarget = {
  documentId: string;
  documentTitle: string;
  documentContentHash: string;
  sourceVaultManifestHash?: string;
  sourceVaultOriginalHash?: string;
  sourceVaultVerified?: boolean;
  pageId?: string;
  pageIndex?: number;
  pageImageHash?: string;
  pageOcrQuality?: number;
  mediaSegmentId?: string;
  mediaSegmentStartTime?: number;
  mediaSegmentEndTime?: number;
  mediaSegmentTranscriptSpanId?: string;
  mediaSegmentConfidence?: number;
  spanId: string;
  charRange: [number, number];
  quadPoints: Array<[number, number, number, number]>;
  exactQuote: string;
  spanExactText: string;
  backingTextPreview: string;
  quoteExact: boolean;
  spanBackedBySource: boolean;
  anchorUsable: boolean;
};

export type VerificationDossier = {
  cardId: string;
  diagnostic: EvidenceSourceDiagnostic;
  inspectionTarget?: VerificationInspectionTarget;
  actions: WorkbenchAction[];
  reanchorRecommended: boolean;
  promotable: boolean;
  proofSnapshotHash: string;
};

export type EvidenceSignoffDecision = "verify" | "dispute" | "withdraw" | "supersede";

export type EvidenceSignoff = {
  format: "sourcedeck.evidence-signoff.v1";
  cardId: string;
  reviewer: string;
  at: string;
  fromStatus: VerificationStatus;
  toStatus: VerificationStatus;
  decision: EvidenceSignoffDecision;
  proofSnapshotHash: string;
};

export type EvidenceSignoffResult =
  | { ok: true; card: EvidenceCard; signoff: EvidenceSignoff }
  | { ok: false; failures: string[] };

export type EvidencePromotionCertificate = {
  format: "sourcedeck.evidence-promotion-certificate.v1";
  cardId: string;
  reviewer: string;
  at: string;
  fromStatus: VerificationStatus;
  toStatus: "verified";
  decision: "verify";
  proofSnapshotHash: string;
  inspectionTargetHash: string;
  inspectionTarget: VerificationInspectionTarget;
  signoff: EvidenceSignoff;
};

export type EvidencePromotionResult =
  | { ok: true; card: EvidenceCard; signoff: EvidenceSignoff; certificate: EvidencePromotionCertificate }
  | { ok: false; failures: string[] };

export type ReanchorEvidenceCardResult =
  | {
      ok: true;
      card: EvidenceCard;
      span: SourceSpan;
      score: number;
      reason: "exact_match" | "token_window_match";
      previousStatus: VerificationStatus;
    }
  | {
      ok: false;
      failures: string[];
      card?: EvidenceCard;
      span?: SourceSpan;
      score?: number;
      reason?: string;
    };

export type SignoffVerification =
  | { ok: true; proofSnapshotHash: string }
  | { ok: false; reason: string; stale?: boolean };

const decisionTargets: Record<EvidenceSignoffDecision, VerificationStatus> = {
  verify: "verified",
  dispute: "disputed",
  withdraw: "withdrawn",
  supersede: "superseded",
};

function previewText(value: string) {
  return value.length > 360 ? `${value.slice(0, 357)}...` : value;
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

// Content-addresses exactly the SOURCE-PROOF state a reviewer approves - the document hash, the span
// text and geometry, the quote, and the resolved proof booleans - but NOT the card's own
// verification label. A signoff binds to this hash, so any later change to the underlying source
// (re-OCR, corrected file, moved geometry, quote drift) flips it and the prior signoff is detectably
// stale, while a benign change to the card's status does not.
function proofSnapshotPayload(graph: SourceGraph, card: EvidenceCard) {
  const span = graph.spans[card.spanId];
  const document = graph.documents[card.sourceDocumentId];
  const page = span?.pageId ? graph.pages[span.pageId] : undefined;
  const mediaSegment = span?.mediaSegmentId ? graph.mediaSegments[span.mediaSegmentId] : undefined;
  const resolution = resolveEvidenceCardSource(card, graph);
  return {
    cardId: card.id,
    sourceDocumentId: card.sourceDocumentId,
    documentContentHash: document?.contentHash ?? null,
    sourceVaultManifestHash: document?.metadata.sourceVaultManifestHash ?? null,
    sourceVaultOriginalHash: document?.metadata.sourceVaultOriginalHash ?? null,
    sourceVaultVerified: document?.metadata.sourceVaultVerified ?? null,
    spanId: card.spanId,
    pageId: span?.pageId ?? null,
    pageIndex: page?.index ?? null,
    pageImageHash: page?.imageHash ?? null,
    pageOcrQuality: page?.ocrQuality ?? null,
    mediaSegmentId: span?.mediaSegmentId ?? null,
    mediaSegmentStartTime: mediaSegment?.startTime ?? null,
    mediaSegmentEndTime: mediaSegment?.endTime ?? null,
    mediaSegmentTranscriptSpanId: mediaSegment?.transcriptSpanId ?? null,
    mediaSegmentConfidence: mediaSegment?.confidence ?? null,
    sourceBackingText: span ? sourceBackingTextForSpan(span, graph) : "",
    exactQuote: card.exactQuoteOrSegment,
    spanExactText: span?.exactText ?? null,
    quadPoints: span?.quadPoints ?? [],
    anchorStatus: span?.anchorStatus ?? null,
    quoteExact: resolution.ok ? resolution.quoteExact : false,
    spanBackedBySource: resolution.ok ? resolution.spanBackedBySource : false,
    anchorUsable: resolution.ok ? resolution.anchorUsable : false,
  };
}

export async function proofSnapshotHash(graph: SourceGraph, card: EvidenceCard): Promise<string> {
  return contentAddress(canonicalJson(proofSnapshotPayload(graph, card)));
}

export async function inspectionTargetHash(
  inspectionTarget: VerificationInspectionTarget,
): Promise<string> {
  return contentAddress(canonicalJson(inspectionTarget));
}

export async function buildVerificationDossier(
  graph: SourceGraph,
  cardId: string,
): Promise<VerificationDossier> {
  const card = graph.evidenceCards[cardId];
  const diagnostic = diagnoseEvidenceCard(graph, cardId);
  if (!card) {
    return {
      cardId,
      diagnostic,
      inspectionTarget: undefined,
      actions: SIGN_OFF_TARGET_STATES.map((to) => ({
        to,
        allowed: false,
        reason: "evidence card does not exist",
      })),
      reanchorRecommended: false,
      promotable: false,
      proofSnapshotHash: "",
    };
  }
  const actions: WorkbenchAction[] = SIGN_OFF_TARGET_STATES.map((to) => {
    const gate = gateEvidenceStatusTransition(card, to, graph);
    return { to, allowed: gate.ok, reason: gate.ok ? undefined : gate.reason };
  });
  const resolution = resolveEvidenceCardSource(card, graph);
  const inspectionTarget: VerificationInspectionTarget | undefined = resolution.ok
    ? {
        documentId: resolution.document.id,
        documentTitle: resolution.document.title,
        documentContentHash: resolution.document.contentHash,
        sourceVaultManifestHash:
          typeof resolution.document.metadata.sourceVaultManifestHash === "string"
            ? resolution.document.metadata.sourceVaultManifestHash
            : undefined,
        sourceVaultOriginalHash:
          typeof resolution.document.metadata.sourceVaultOriginalHash === "string"
            ? resolution.document.metadata.sourceVaultOriginalHash
            : undefined,
        sourceVaultVerified:
          typeof resolution.document.metadata.sourceVaultVerified === "boolean"
            ? resolution.document.metadata.sourceVaultVerified
            : undefined,
        pageId: resolution.page?.id,
        pageIndex: resolution.page?.index,
        pageImageHash: resolution.page?.imageHash,
        pageOcrQuality: resolution.page?.ocrQuality,
        mediaSegmentId: resolution.mediaSegment?.id,
        mediaSegmentStartTime: resolution.mediaSegment?.startTime,
        mediaSegmentEndTime: resolution.mediaSegment?.endTime,
        mediaSegmentTranscriptSpanId: resolution.mediaSegment?.transcriptSpanId,
        mediaSegmentConfidence: resolution.mediaSegment?.confidence,
        spanId: resolution.span.id,
        charRange: resolution.span.charRange,
        quadPoints: resolution.span.quadPoints,
        exactQuote: card.exactQuoteOrSegment,
        spanExactText: resolution.span.exactText,
        backingTextPreview: previewText(sourceBackingTextForSpan(resolution.span, graph)),
        quoteExact: resolution.quoteExact,
        spanBackedBySource: resolution.spanBackedBySource,
        anchorUsable: resolution.anchorUsable,
      }
    : undefined;
  const reanchorRecommended =
    diagnostic.anchorStatus === "anchor_stale" ||
    diagnostic.anchorStatus === "unresolved" ||
    !diagnostic.sourceTerminates ||
    !diagnostic.anchorUsable;
  return {
    cardId,
    diagnostic,
    inspectionTarget,
    actions,
    reanchorRecommended,
    promotable: gateEvidenceStatusTransition(card, "verified", graph).ok,
    proofSnapshotHash: await proofSnapshotHash(graph, card),
  };
}

// Reviewer promotion is a two-part deterministic artifact: the signoff binds the source-proof
// snapshot, while the promotion certificate binds the exact inspection target (document/page/media,
// quads, quote, source-vault hashes, and backing preview) the reviewer saw. This prevents a later UI
// or export layer from claiming "human verified" when the inspected page/quad/quote was different
// from the one currently resolving in the graph.
export async function promoteEvidenceWithCertificate(
  graph: SourceGraph,
  cardId: string,
  input: { reviewer: string; at: string },
): Promise<EvidencePromotionResult> {
  const dossier = await buildVerificationDossier(graph, cardId);
  if (!dossier.inspectionTarget) {
    return { ok: false, failures: ["promotion requires a resolvable inspection target"] };
  }
  if (!dossier.promotable) {
    const verifyAction = dossier.actions.find((action) => action.to === "verified");
    return {
      ok: false,
      failures: [verifyAction?.reason ?? "evidence is not promotable to verified"],
    };
  }
  const signed = await signOffEvidenceVerification(graph, cardId, {
    decision: "verify",
    reviewer: input.reviewer,
    at: input.at,
  });
  if (!signed.ok) return signed;
  const targetHash = await inspectionTargetHash(dossier.inspectionTarget);
  return {
    ok: true,
    card: signed.card,
    signoff: signed.signoff,
    certificate: {
      format: "sourcedeck.evidence-promotion-certificate.v1",
      cardId,
      reviewer: signed.signoff.reviewer,
      at: signed.signoff.at,
      fromStatus: signed.signoff.fromStatus,
      toStatus: "verified",
      decision: "verify",
      proofSnapshotHash: signed.signoff.proofSnapshotHash,
      inspectionTargetHash: targetHash,
      inspectionTarget: dossier.inspectionTarget,
      signoff: signed.signoff,
    },
  };
}

// An attributable, fail-closed human signoff. The decision maps to a target state and is gated by
// the same `gateEvidenceStatusTransition` that protects the packet hard wall, so a reviewer cannot
// sign off "verified" on an unbacked, quote-mismatched, or anchor-stale card. The returned signoff
// records who, when, the state change, and the proof-snapshot hash it was made against.
export async function signOffEvidenceVerification(
  graph: SourceGraph,
  cardId: string,
  input: { decision: EvidenceSignoffDecision; reviewer: string; at: string },
): Promise<EvidenceSignoffResult> {
  const card = graph.evidenceCards[cardId];
  if (!card) return { ok: false, failures: ["evidence card does not exist"] };
  const reviewer = input.reviewer.trim();
  if (!reviewer) return { ok: false, failures: ["a reviewer identity is required to sign off"] };
  if (Number.isNaN(Date.parse(input.at))) {
    return { ok: false, failures: ["a valid signoff timestamp is required"] };
  }
  const toStatus = decisionTargets[input.decision];
  const gate = gateEvidenceStatusTransition(card, toStatus, graph);
  if (!gate.ok) return { ok: false, failures: [gate.reason] };
  const snapshot = await proofSnapshotHash(graph, card);
  return {
    ok: true,
    card: gate.next,
    signoff: {
      format: "sourcedeck.evidence-signoff.v1",
      cardId,
      reviewer,
      at: input.at,
      fromStatus: card.verificationStatus,
      toStatus,
      decision: input.decision,
      proofSnapshotHash: snapshot,
    },
  };
}

// Re-checks a stored signoff against the CURRENT graph. If the source proof the reviewer approved
// has changed (re-OCR, corrected file, geometry move), the recomputed snapshot differs and the
// signoff is flagged stale - the deterministic basis for "this verification needs a fresh signoff".
export async function verifyEvidenceSignoff(
  graph: SourceGraph,
  signoff: EvidenceSignoff,
): Promise<SignoffVerification> {
  if (signoff.format !== "sourcedeck.evidence-signoff.v1") {
    return { ok: false, reason: "unsupported evidence signoff format" };
  }
  if (!signoff.reviewer.trim()) {
    return { ok: false, reason: "evidence signoff reviewer is missing" };
  }
  if (Number.isNaN(Date.parse(signoff.at))) {
    return { ok: false, reason: "evidence signoff timestamp is invalid" };
  }
  if (decisionTargets[signoff.decision] !== signoff.toStatus) {
    return { ok: false, reason: "evidence signoff decision and target status disagree" };
  }
  const card = graph.evidenceCards[signoff.cardId];
  if (!card) return { ok: false, reason: "signed-off card no longer exists in the graph" };
  const currentSnapshot = await proofSnapshotHash(graph, card);
  if (currentSnapshot !== signoff.proofSnapshotHash) {
    return {
      ok: false,
      reason: "source proof changed since signoff; re-verification required",
      stale: true,
    };
  }
  return { ok: true, proofSnapshotHash: currentSnapshot };
}

export async function verifyEvidencePromotionCertificate(
  graph: SourceGraph,
  certificate: EvidencePromotionCertificate,
): Promise<SignoffVerification> {
  if (certificate.format !== "sourcedeck.evidence-promotion-certificate.v1") {
    return { ok: false, reason: "unsupported evidence promotion certificate format" };
  }
  if (
    certificate.decision !== "verify" ||
    certificate.toStatus !== "verified" ||
    certificate.signoff.decision !== "verify" ||
    certificate.signoff.toStatus !== "verified"
  ) {
    return { ok: false, reason: "promotion certificate must target verified evidence" };
  }
  if (
    certificate.cardId !== certificate.signoff.cardId ||
    certificate.reviewer !== certificate.signoff.reviewer ||
    certificate.at !== certificate.signoff.at ||
    certificate.fromStatus !== certificate.signoff.fromStatus ||
    certificate.proofSnapshotHash !== certificate.signoff.proofSnapshotHash
  ) {
    return { ok: false, reason: "promotion certificate and signoff disagree" };
  }
  const recordedTargetHash = await inspectionTargetHash(certificate.inspectionTarget);
  if (recordedTargetHash !== certificate.inspectionTargetHash) {
    return { ok: false, reason: "promotion certificate inspection target hash mismatch" };
  }
  const signoffVerification = await verifyEvidenceSignoff(graph, certificate.signoff);
  if (!signoffVerification.ok) return signoffVerification;
  const currentDossier = await buildVerificationDossier(graph, certificate.cardId);
  if (!currentDossier.inspectionTarget) {
    return { ok: false, reason: "promotion certificate no longer has an inspection target" };
  }
  const currentTargetHash = await inspectionTargetHash(currentDossier.inspectionTarget);
  if (currentTargetHash !== certificate.inspectionTargetHash) {
    return {
      ok: false,
      reason: "inspection target changed since promotion; re-verification required",
      stale: true,
    };
  }
  return { ok: true, proofSnapshotHash: signoffVerification.proofSnapshotHash };
}

export type SignoffAuditEntry = {
  cardId: string;
  reviewer: string;
  at: string;
  toStatus: VerificationStatus;
  current: boolean;
  stale: boolean;
  reason?: string;
};

export type SignoffAudit = {
  entries: SignoffAuditEntry[];
  staleCount: number;
};

// Re-checks every stored signoff against the current graph and reports which have gone stale because
// the underlying source changed - the deterministic basis for a "these verifications need a fresh
// signoff" review queue.
export async function auditEvidenceSignoffs(
  graph: SourceGraph,
  signoffs: EvidenceSignoff[],
): Promise<SignoffAudit> {
  const entries = await Promise.all(
    signoffs.map(async (signoff): Promise<SignoffAuditEntry> => {
      const verification = await verifyEvidenceSignoff(graph, signoff);
      return {
        cardId: signoff.cardId,
        reviewer: signoff.reviewer,
        at: signoff.at,
        toStatus: signoff.toStatus,
        current: verification.ok,
        stale: !verification.ok,
        reason: verification.ok ? undefined : verification.reason,
      };
    }),
  );
  return { entries, staleCount: entries.filter((entry) => entry.stale).length };
}

// A signoff as recorded in the append-only trust ledger. Typed structurally so the kernel stays
// decoupled from the case store's concrete event union.
export type RecordedSignoffEvent = {
  type: string;
  actor: string;
  targetId: string;
  at: string;
  payload: Record<string, unknown>;
};

const SIGNOFF_EVENT_TYPE = "evidence_signed_off";
const PROMOTION_EVENT_TYPE = "evidence_promoted";
const SIGNOFF_DECISIONS: EvidenceSignoffDecision[] = [
  "verify",
  "dispute",
  "withdraw",
  "supersede",
];

function reconstructSignoffFromEvent(event: RecordedSignoffEvent): EvidenceSignoff | undefined {
  const { decision, proofSnapshotHash, to, from, reviewer } = event.payload;
  if (
    typeof decision !== "string" ||
    !SIGNOFF_DECISIONS.includes(decision as EvidenceSignoffDecision) ||
    typeof proofSnapshotHash !== "string"
  ) {
    return undefined;
  }
  const decisionValue = decision as EvidenceSignoffDecision;
  return {
    format: "sourcedeck.evidence-signoff.v1",
    cardId: event.targetId,
    reviewer:
      typeof reviewer === "string" && reviewer.trim() ? (reviewer as string) : event.actor,
    at: event.at,
    fromStatus: (typeof from === "string" ? from : "cited") as VerificationStatus,
    toStatus: (typeof to === "string" ? to : decisionTargets[decisionValue]) as VerificationStatus,
    decision: decisionValue,
    proofSnapshotHash,
  };
}

export function promotionCertificateToRecordedEvent(
  certificate: EvidencePromotionCertificate,
): RecordedSignoffEvent {
  return {
    type: PROMOTION_EVENT_TYPE,
    actor: certificate.reviewer,
    targetId: certificate.cardId,
    at: certificate.at,
    payload: {
      decision: certificate.decision,
      from: certificate.fromStatus,
      to: certificate.toStatus,
      reviewer: certificate.reviewer,
      proofSnapshotHash: certificate.proofSnapshotHash,
      inspectionTargetHash: certificate.inspectionTargetHash,
      documentId: certificate.inspectionTarget.documentId,
      pageId: certificate.inspectionTarget.pageId ?? null,
      mediaSegmentId: certificate.inspectionTarget.mediaSegmentId ?? null,
      spanId: certificate.inspectionTarget.spanId,
      sourceVaultManifestHash: certificate.inspectionTarget.sourceVaultManifestHash ?? null,
    },
  };
}

// Reconstructs the LATEST signoff per card from the append-only trust ledger and audits all of them
// against the current graph - the deterministic basis for a case-wide "these verifications need a
// fresh signoff" worklist. Events are append-only and chronological, so the last signoff event for a
// card wins; malformed events (missing decision/hash) are skipped. Promotion-certificate events also
// reconstruct as signoffs so one ledger event powers both chain-of-custody audit and stale-signoff
// detection.
export async function buildSignoffReviewQueue(
  graph: SourceGraph,
  events: RecordedSignoffEvent[],
): Promise<SignoffAudit> {
  const latestByCard = new Map<string, EvidenceSignoff>();
  for (const event of events) {
    if (event.type !== SIGNOFF_EVENT_TYPE && event.type !== PROMOTION_EVENT_TYPE) continue;
    const signoff = reconstructSignoffFromEvent(event);
    if (signoff) latestByCard.set(signoff.cardId, signoff);
  }
  return auditEvidenceSignoffs(graph, [...latestByCard.values()]);
}

const REANCHORABLE_STATUSES: VerificationStatus[] = ["cited", "verified", "anchor_stale"];

// Reanchors an evidence card against the CURRENT source backing text in the graph. A successful
// reanchor may recover OCR/token drift, but it always returns the card to `cited`: any prior human
// verification was made against the old source-proof snapshot and must be re-earned. Disputed,
// withdrawn, and superseded cards are intentionally not reanchorable here so a source relocation
// cannot bury an adverse reviewer decision.
export function reanchorEvidenceCard(
  graph: SourceGraph,
  cardId: string,
  options: { minimumScore?: number } = {},
): ReanchorEvidenceCardResult {
  const card = graph.evidenceCards[cardId];
  if (!card) return { ok: false, failures: ["evidence card does not exist"] };
  if (!REANCHORABLE_STATUSES.includes(card.verificationStatus)) {
    return {
      ok: false,
      failures: [`cannot reanchor evidence in ${card.verificationStatus} status`],
      card,
    };
  }
  const span = graph.spans[card.spanId];
  if (!span) return { ok: false, failures: ["evidence card span does not exist"], card };
  const backingText = sourceBackingTextForSpan(span, graph);
  const reanchored = reanchorSpanToText(span, backingText, options);
  if (!reanchored.ok) {
    return {
      ok: false,
      failures: [`reanchor failed: ${reanchored.reason}`],
      card: { ...card, verificationStatus: "anchor_stale" },
      span: reanchored.span,
      score: reanchored.score,
      reason: reanchored.reason,
    };
  }
  const nextCard: EvidenceCard = {
    ...card,
    exactQuoteOrSegment: reanchored.span.exactText,
    verificationStatus: "cited",
  };
  const draftGraph: SourceGraph = {
    ...graph,
    spans: { ...graph.spans, [reanchored.span.id]: reanchored.span },
    evidenceCards: { ...graph.evidenceCards, [nextCard.id]: nextCard },
  };
  const gate = gateEvidenceStatusTransition(nextCard, "cited", draftGraph);
  if (!gate.ok) {
    return {
      ok: false,
      failures: [`reanchored card did not resolve: ${gate.reason}`],
      card: nextCard,
      span: reanchored.span,
      score: reanchored.score,
      reason: reanchored.reason,
    };
  }
  return {
    ok: true,
    card: nextCard,
    span: reanchored.span,
    score: reanchored.score,
    reason: reanchored.reason,
    previousStatus: card.verificationStatus,
  };
}

export type SplitEvidenceResult =
  | { ok: true; cards: EvidenceCard[]; spans: SourceSpan[] }
  | { ok: false; failures: string[] };

// Deterministically splits one evidence card into narrower children. Each sub-quote MUST be an exact
// substring of the parent span's text, so a split can only ever NARROW within the established source
// - it can never introduce a claim the source does not contain. Children get a precise sub-range,
// shed the parent geometry (no false sub-quad precision - they are text-backed), and revert to
// "cited" so the reviewer must sign off each part afresh. Returns proposed cards/spans; the caller
// commits them to the graph.
export function splitEvidenceCard(
  graph: SourceGraph,
  cardId: string,
  subQuotes: string[],
): SplitEvidenceResult {
  const card = graph.evidenceCards[cardId];
  if (!card) return { ok: false, failures: ["evidence card does not exist"] };
  const span = graph.spans[card.spanId];
  if (!span) return { ok: false, failures: ["evidence card span does not exist"] };
  if (subQuotes.length < 2) {
    return { ok: false, failures: ["a split requires at least two sub-quotes"] };
  }
  const failures: string[] = [];
  const cards: EvidenceCard[] = [];
  const spans: SourceSpan[] = [];
  subQuotes.forEach((subQuote, index) => {
    const trimmed = subQuote.trim();
    const offset = trimmed ? span.exactText.indexOf(trimmed) : -1;
    if (offset < 0) {
      failures.push(`sub-quote ${index + 1} is not an exact substring of the source span`);
      return;
    }
    const childSpanId = `${span.id}::split::${index + 1}`;
    spans.push({
      ...span,
      id: childSpanId,
      quadPoints: [],
      charRange: [span.charRange[0] + offset, span.charRange[0] + offset + trimmed.length],
      exactText: trimmed,
    });
    cards.push({
      ...card,
      id: `${card.id}::split::${index + 1}`,
      spanId: childSpanId,
      exactQuoteOrSegment: trimmed,
      verificationStatus: "cited",
    });
  });
  if (failures.length) return { ok: false, failures };
  return { ok: true, cards, spans };
}

export type MergeEvidenceResult =
  | { ok: true; merged: EvidenceCard; supersededCardIds: string[] }
  | { ok: false; failures: string[] };

// Deterministically consolidates true-duplicate citations - cards that resolve to the SAME source
// document, span, and exact quote - into one canonical card. It REFUSES to merge cards that cite
// different sources: a single card carries exactly one source path, so merging across sources would
// silently destroy provenance (which source would the survivor cite?). The merged card is a new
// entity and reverts to "cited" so its verification is re-attested; the constituents' original
// signoffs remain in the immutable trust ledger.
export function mergeEvidenceCards(graph: SourceGraph, cardIds: string[]): MergeEvidenceResult {
  const uniqueIds = [...new Set(cardIds)];
  if (uniqueIds.length < 2) {
    return { ok: false, failures: ["a merge requires at least two distinct cards"] };
  }
  const missing = uniqueIds.filter((id) => !graph.evidenceCards[id]);
  if (missing.length) {
    return { ok: false, failures: missing.map((id) => `evidence card ${id} does not exist`) };
  }
  const cards = uniqueIds.map((id) => graph.evidenceCards[id]);
  const unresolvedFailures = cards.flatMap((card) => {
    const resolution = resolveEvidenceCardSource(card, graph);
    if (!resolution.ok) return [`${card.id}: ${resolution.reason}`];
    if (!resolution.quoteExact) {
      return [`${card.id}: exact quote does not resolve inside source span`];
    }
    if (!resolution.spanBackedBySource) {
      return [`${card.id}: source span is not backed by source text or media`];
    }
    return [];
  });
  if (unresolvedFailures.length) return { ok: false, failures: unresolvedFailures };
  const first = cards[0];
  // True-duplicate identity is the SOURCE a card rests on - document, span location (page/segment),
  // span text, and exact quote - NOT the span's synthetic id. The legacy bridge mints a distinct
  // span id per card, so identical citations carry different span ids; keying on span id would wrongly
  // refuse to merge genuine duplicates. Page/segment is part of identity so the same sentence
  // appearing on two different pages is never collapsed into one source.
  const sourceIdentity = (card: EvidenceCard): string => {
    const span = graph.spans[card.spanId];
    return canonicalJson({
      doc: card.sourceDocumentId,
      quote: card.exactQuoteOrSegment,
      spanText: span?.exactText ?? null,
      pageId: span?.pageId ?? null,
      mediaSegmentId: span?.mediaSegmentId ?? null,
    });
  };
  const firstIdentity = sourceIdentity(first);
  const sameSource = cards.every((card) => sourceIdentity(card) === firstIdentity);
  if (!sameSource) {
    return {
      ok: false,
      failures: ["cannot merge cards that cite different sources; that would destroy provenance"],
    };
  }
  const sortedIds = [...uniqueIds].sort();
  return {
    ok: true,
    merged: {
      ...first,
      id: `${sortedIds[0]}::merged`,
      verificationStatus: "cited",
    },
    supersededCardIds: sortedIds,
  };
}

export type EditEvidenceQuoteResult =
  | { ok: true; card: EvidenceCard }
  | { ok: false; failures: string[] };

// Source-validated quote edit. The new quote MUST remain an exact substring of the card's source
// span text, so an edit can never re-point a card at text the source does not contain. The edited
// card reverts to "cited": the approved quote changed, so any prior signoff is invalidated and the
// reviewer must sign off afresh.
export function editEvidenceCardQuote(
  graph: SourceGraph,
  cardId: string,
  newQuote: string,
): EditEvidenceQuoteResult {
  const card = graph.evidenceCards[cardId];
  if (!card) return { ok: false, failures: ["evidence card does not exist"] };
  const span = graph.spans[card.spanId];
  if (!span) return { ok: false, failures: ["evidence card span does not exist"] };
  const trimmed = newQuote.trim();
  if (!trimmed) return { ok: false, failures: ["the edited quote cannot be empty"] };
  if (!span.exactText.includes(trimmed)) {
    return {
      ok: false,
      failures: ["the edited quote is not an exact substring of the source span"],
    };
  }
  return {
    ok: true,
    card: { ...card, exactQuoteOrSegment: trimmed, verificationStatus: "cited" },
  };
}
