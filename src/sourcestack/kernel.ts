import type {
  ContentAddress,
  EvidenceCard,
  GateFailure,
  SourceDocument,
  SourceGraph,
  SourceResolution,
  SourceSpan,
} from "./types";

export function emptySourceGraph(): SourceGraph {
  return {
    documents: {},
    pages: {},
    spans: {},
    mediaSegments: {},
    evidenceCards: {},
    claims: {},
    issueTheories: {},
    edges: [],
    events: {},
    obligations: {},
    recordGaps: {},
    packets: {},
    provenance: {},
    auditEvents: [],
  };
}

export function normalizeForFingerprint(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function stableFingerprint(value: string) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const normalized = normalizeForFingerprint(value);
  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= BigInt(normalized.charCodeAt(index));
    hash = BigInt.asUintN(64, hash * prime);
  }
  return hash.toString(16).padStart(16, "0");
}

export async function sha256Hex(value: string | Uint8Array): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    throw new Error("SHA-256 requires Web Crypto subtle digest support.");
  }
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function contentAddress(value: string | Uint8Array): Promise<ContentAddress> {
  return `sha256:${await sha256Hex(value)}`;
}

export function sourceSpanTerminatesAtSource(span: SourceSpan, graph: SourceGraph) {
  if (span.pageId) {
    const page = graph.pages[span.pageId];
    return Boolean(page && page.documentId === span.documentId && graph.documents[span.documentId]);
  }
  if (span.mediaSegmentId) {
    const segment = graph.mediaSegments[span.mediaSegmentId];
    return Boolean(segment && segment.documentId === span.documentId && graph.documents[span.documentId]);
  }
  return false;
}

export function sourceBackingTextForSpan(span: SourceSpan, graph: SourceGraph) {
  if (span.pageId) {
    const page = graph.pages[span.pageId];
    return page?.layoutBlocks
      .map((block) => block.text ?? "")
      .filter(Boolean)
      .join("\n");
  }
  if (span.mediaSegmentId) {
    const segment = graph.mediaSegments[span.mediaSegmentId];
    const transcriptSpan = segment ? graph.spans[segment.transcriptSpanId] : undefined;
    return transcriptSpan?.exactText ?? "";
  }
  return "";
}

// Geometry/media-only backing (no extracted page text to compare against) is valid ONLY when the
// span is tied to genuine, content-addressed source media: a real media segment, or a page that
// carries a sha256 page-image hash. A floating quad (quadPoints present but no hashed page media)
// is NOT backing — that was a hole that let a fabricated highlight satisfy the packet hard wall.
export function spanBackedByHashedMedia(span: SourceSpan, graph: SourceGraph) {
  if (span.mediaSegmentId) {
    const segment = graph.mediaSegments[span.mediaSegmentId];
    return Boolean(segment && graph.documents[segment.documentId]);
  }
  if (span.pageId && span.quadPoints.length > 0) {
    const page = graph.pages[span.pageId];
    return Boolean(
      page && typeof page.imageHash === "string" && page.imageHash.startsWith("sha256:"),
    );
  }
  return false;
}

export function sourceSpanBackedBySource(span: SourceSpan, graph: SourceGraph) {
  const normalizedSpanText = normalizeForFingerprint(span.exactText);
  if (!normalizedSpanText) return false;
  const normalizedBackingText = normalizeForFingerprint(sourceBackingTextForSpan(span, graph));
  if (normalizedBackingText) {
    return (
      normalizedBackingText.includes(normalizedSpanText) &&
      sourceSpanCharRangeMatchesBacking(span, graph)
    );
  }
  return spanBackedByHashedMedia(span, graph);
}

export function sourceSpanCharRangeMatchesBacking(span: SourceSpan, graph: SourceGraph) {
  if (!span.pageId) return true;
  const backingText = sourceBackingTextForSpan(span, graph);
  if (!backingText) return true;
  const [start, end] = span.charRange;
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 0 ||
    end <= start ||
    end > backingText.length
  ) {
    return false;
  }
  return normalizeForFingerprint(backingText.slice(start, end)) === normalizeForFingerprint(span.exactText);
}

export function resolveEvidenceCardSource(card: EvidenceCard, graph: SourceGraph): SourceResolution {
  const span = graph.spans[card.spanId];
  if (!span) return { ok: false, card, reason: "card span does not exist" };
  if (span.documentId !== card.sourceDocumentId) {
    return { ok: false, card, reason: "card document and span document disagree" };
  }
  const document = graph.documents[card.sourceDocumentId];
  if (!document) return { ok: false, card, reason: "source document does not exist" };
  if (!sourceSpanTerminatesAtSource(span, graph)) {
    return { ok: false, card, reason: "span does not terminate at a page or media segment" };
  }
  if (card.pageId && card.pageId !== span.pageId) {
    return { ok: false, card, reason: "card page and span page disagree" };
  }
  if (card.mediaSegmentId && card.mediaSegmentId !== span.mediaSegmentId) {
    return { ok: false, card, reason: "card media segment and span media segment disagree" };
  }
  const page = span.pageId ? graph.pages[span.pageId] : undefined;
  const mediaSegment = span.mediaSegmentId ? graph.mediaSegments[span.mediaSegmentId] : undefined;
  const normalizedSpan = normalizeForFingerprint(span.exactText);
  const normalizedQuote = normalizeForFingerprint(card.exactQuoteOrSegment);
  const quoteExact = Boolean(normalizedQuote) && normalizedSpan.includes(normalizedQuote);
  const spanBackedBySource = sourceSpanBackedBySource(span, graph);
  const anchorUsable = span.anchorStatus !== "anchor_stale" && span.anchorStatus !== "unresolved";
  return {
    ok: true,
    card,
    span,
    document,
    page,
    mediaSegment,
    quoteExact,
    spanBackedBySource,
    anchorUsable,
  };
}

export function requireResolvedVerifiedCard(card: EvidenceCard, graph: SourceGraph): GateFailure[] {
  const failures: GateFailure[] = [];
  if (card.verificationStatus !== "verified") {
    failures.push({
      cardId: card.id,
      reason: `packet hard wall: card is ${card.verificationStatus}, not verified`,
      severity: "hard_wall",
    });
  }
  const resolution = resolveEvidenceCardSource(card, graph);
  if (!resolution.ok) {
    failures.push({
      cardId: card.id,
      reason: `packet hard wall: ${resolution.reason}`,
      severity: "hard_wall",
    });
    return failures;
  }
  if (!resolution.quoteExact) {
    failures.push({
      cardId: card.id,
      reason: "packet hard wall: exact quote does not resolve inside the source span",
      severity: "hard_wall",
    });
  }
  if (!resolution.spanBackedBySource) {
    failures.push({
      cardId: card.id,
      reason: "packet hard wall: source span text is not backed by page text or media/geometry anchor",
      severity: "hard_wall",
    });
  }
  if (!resolution.anchorUsable) {
    failures.push({
      cardId: card.id,
      reason: `packet hard wall: source anchor is ${resolution.span.anchorStatus}`,
      severity: "hard_wall",
    });
  }
  return failures;
}

export function findDuplicateDocuments(graph: SourceGraph) {
  const byHash = new Map<ContentAddress, SourceDocument[]>();
  Object.values(graph.documents).forEach((document) => {
    const bucket = byHash.get(document.contentHash) ?? [];
    bucket.push(document);
    byHash.set(document.contentHash, bucket);
  });
  return Array.from(byHash.entries())
    .filter(([, documents]) => documents.length > 1)
    .map(([contentHash, documents]) => ({
      contentHash,
      documentIds: documents.map((document) => document.id),
      titles: documents.map((document) => document.title),
    }));
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

export function graphInvariantFailures(graph: SourceGraph): GateFailure[] {
  const failures: GateFailure[] = [];
  const packetReadyClaimStatuses = new Set(["cited", "verified"]);
  Object.values(graph.evidenceCards).forEach((card) => {
    const resolution = resolveEvidenceCardSource(card, graph);
    if (!resolution.ok) {
      failures.push({
        cardId: card.id,
        reason: `evidence card has no source chain: ${resolution.reason}`,
        severity: "hard_wall",
      });
      return;
    }
    if (!resolution.quoteExact) {
      failures.push({
        cardId: card.id,
        reason: "evidence card quote does not resolve inside its source span",
        severity: "hard_wall",
      });
    }
    if (!resolution.spanBackedBySource) {
      failures.push({
        cardId: card.id,
        reason: "evidence card source span text is not backed by page text or media/geometry anchor",
        severity: "hard_wall",
      });
    }
    if (!resolution.anchorUsable) {
      failures.push({
        cardId: card.id,
        reason: `evidence card source anchor is ${resolution.span.anchorStatus}`,
        severity: "hard_wall",
      });
    }
  });
  Object.values(graph.claims).forEach((claim) => {
    const claimIsPacketReady = packetReadyClaimStatuses.has(claim.verificationStatus);
    if (claimIsPacketReady && !claim.supportingCardIds.length) {
      failures.push({
        claimId: claim.id,
        reason: "packet-ready claim has no supporting evidence cards",
        severity: "hard_wall",
      });
    }
    if (claimIsPacketReady) {
      duplicateValues(claim.supportingCardIds).forEach((cardId) => {
        failures.push({
          cardId,
          claimId: claim.id,
          reason: `packet-ready claim repeats supporting card ${cardId}`,
          severity: "hard_wall",
        });
      });
    }
    claim.supportingCardIds.forEach((cardId) => {
      const card = graph.evidenceCards[cardId];
      if (!card) {
        failures.push({
          claimId: claim.id,
          reason: `claim references missing card ${cardId}`,
          severity: "hard_wall",
        });
        return;
      }
      if (claimIsPacketReady) {
        requireResolvedVerifiedCard(card, graph).forEach((failure) => {
          failures.push({
            cardId,
            claimId: claim.id,
            reason: `packet-ready claim support failed: ${failure.reason}`,
            severity: "hard_wall",
          });
        });
      }
    });
  });
  Object.values(graph.issueTheories).forEach((issueTheory) => {
    if (issueTheory.packetReadiness !== "ready") return;
    if (!issueTheory.claimIds.length) {
      failures.push({
        issueTheoryId: issueTheory.id,
        reason: "issue theory is marked ready with no claims",
        severity: "hard_wall",
      });
    }
    if (!issueTheory.strongestPath.length) {
      failures.push({
        issueTheoryId: issueTheory.id,
        reason: "issue theory is marked ready with no strongest source path",
        severity: "hard_wall",
      });
    }
    duplicateValues(issueTheory.claimIds).forEach((claimId) => {
      failures.push({
        claimId,
        issueTheoryId: issueTheory.id,
        reason: `ready issue theory repeats claim ${claimId}`,
        severity: "hard_wall",
      });
    });
    duplicateValues(issueTheory.strongestPath).forEach((cardId) => {
      failures.push({
        cardId,
        issueTheoryId: issueTheory.id,
        reason: `ready issue theory repeats strongest-path card ${cardId}`,
        severity: "hard_wall",
      });
    });
    issueTheory.strongestPath.forEach((cardId) => {
      const card = graph.evidenceCards[cardId];
      if (!card) {
        failures.push({
          cardId,
          issueTheoryId: issueTheory.id,
          reason: `ready issue theory strongest path references missing card ${cardId}`,
          severity: "hard_wall",
        });
        return;
      }
      requireResolvedVerifiedCard(card, graph).forEach((failure) => {
        failures.push({
          cardId,
          issueTheoryId: issueTheory.id,
          reason: `ready issue theory strongest path failed: ${failure.reason}`,
          severity: "hard_wall",
        });
      });
    });
    issueTheory.claimIds.forEach((claimId) => {
      const claim = graph.claims[claimId];
      if (!claim) {
        failures.push({
          claimId,
          issueTheoryId: issueTheory.id,
          reason: `ready issue theory references missing claim ${claimId}`,
          severity: "hard_wall",
        });
        return;
      }
      if (!packetReadyClaimStatuses.has(claim.verificationStatus)) {
        failures.push({
          claimId: claim.id,
          issueTheoryId: issueTheory.id,
          reason: `ready issue theory references ${claim.verificationStatus} claim ${claim.id}`,
          severity: "hard_wall",
        });
      }
      if (!claim.supportingCardIds.length) {
        failures.push({
          claimId: claim.id,
          issueTheoryId: issueTheory.id,
          reason: `ready issue theory claim ${claim.id} has no supporting evidence cards`,
          severity: "hard_wall",
        });
      }
      claim.supportingCardIds.forEach((cardId) => {
        const card = graph.evidenceCards[cardId];
        if (!card) return;
        requireResolvedVerifiedCard(card, graph).forEach((failure) => {
          failures.push({
            cardId,
            claimId: claim.id,
            issueTheoryId: issueTheory.id,
            reason: `ready issue theory support failed: ${failure.reason}`,
            severity: "hard_wall",
          });
        });
      });
    });
  });
  return failures;
}
