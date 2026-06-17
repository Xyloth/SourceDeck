import { normalizeForFingerprint, stableFingerprint } from "./kernel";
import type { SourceSpan } from "./types";

export type ReanchorResult =
  | {
      ok: true;
      score: number;
      reason: "exact_match" | "token_window_match";
      span: SourceSpan;
    }
  | {
      ok: false;
      score: number;
      reason: "below_threshold" | "empty_source" | "empty_candidate";
      span: SourceSpan;
    };

type TokenPosition = {
  token: string;
  start: number;
  end: number;
};

function tokenPositions(text: string): TokenPosition[] {
  const matches = text.matchAll(/[a-z0-9]+/gi);
  return Array.from(matches).map((match) => ({
    token: match[0].toLowerCase(),
    start: match.index,
    end: match.index + match[0].length,
  }));
}

function jaccard(left: string[], right: string[]) {
  const leftSet = new Set(left);
  const rightSet = new Set(right);
  const intersection = Array.from(leftSet).filter((token) => rightSet.has(token)).length;
  const union = new Set([...leftSet, ...rightSet]).size;
  return union ? intersection / union : 0;
}

export function buildTextSpanAnchor(
  span: Omit<
    SourceSpan,
    "charRange" | "semanticFingerprint" | "exactText" | "anchorStatus" | "quality"
  > & { quote: string; pageText: string },
): SourceSpan {
  const exactIndex = span.pageText.indexOf(span.quote);
  const charRange: [number, number] =
    exactIndex >= 0 ? [exactIndex, exactIndex + span.quote.length] : [0, span.quote.length];
  return {
    id: span.id,
    documentId: span.documentId,
    pageId: span.pageId,
    mediaSegmentId: span.mediaSegmentId,
    quadPoints: span.quadPoints,
    charRange,
    semanticFingerprint: stableFingerprint(`${span.quote} ${span.pageText}`),
    structuralPath: span.structuralPath,
    exactText: span.quote,
    anchorStatus: exactIndex >= 0 ? "stable" : "low_confidence",
    quality: exactIndex >= 0 ? 1 : 0.45,
  };
}

export function reanchorSpanToText(
  span: SourceSpan,
  candidateText: string,
  options: { minimumScore?: number } = {},
): ReanchorResult {
  const minimumScore = options.minimumScore ?? 0.72;
  const sourceText = span.exactText.trim();
  if (!sourceText) {
    return {
      ok: false,
      score: 0,
      reason: "empty_source",
      span: { ...span, anchorStatus: "anchor_stale", quality: 0 },
    };
  }
  if (!candidateText.trim()) {
    return {
      ok: false,
      score: 0,
      reason: "empty_candidate",
      span: { ...span, anchorStatus: "anchor_stale", quality: 0 },
    };
  }

  const exactIndex = candidateText.indexOf(sourceText);
  if (exactIndex >= 0) {
    return {
      ok: true,
      score: 1,
      reason: "exact_match",
      span: {
        ...span,
        charRange: [exactIndex, exactIndex + sourceText.length],
        semanticFingerprint: stableFingerprint(`${sourceText} ${candidateText}`),
        anchorStatus: "stable",
        quality: 1,
      },
    };
  }

  const sourceTokens = tokenPositions(normalizeForFingerprint(sourceText)).map((item) => item.token);
  const candidateTokens = tokenPositions(candidateText);
  if (!sourceTokens.length || !candidateTokens.length) {
    return {
      ok: false,
      score: 0,
      reason: "below_threshold",
      span: { ...span, anchorStatus: "anchor_stale", quality: 0 },
    };
  }

  let bestScore = 0;
  let bestStart = 0;
  let bestEnd = 0;
  const targetLength = sourceTokens.length;
  const windowSizes = Array.from(new Set([targetLength - 2, targetLength - 1, targetLength, targetLength + 1, targetLength + 2]))
    .filter((length) => length > 0 && length <= candidateTokens.length);

  for (const windowSize of windowSizes) {
    for (let index = 0; index <= candidateTokens.length - windowSize; index += 1) {
      const window = candidateTokens.slice(index, index + windowSize);
      const score = jaccard(sourceTokens, window.map((item) => item.token));
      if (score > bestScore) {
        bestScore = score;
        bestStart = window[0].start;
        bestEnd = window.at(-1)?.end ?? window[0].end;
      }
    }
  }

  if (bestScore < minimumScore) {
    return {
      ok: false,
      score: bestScore,
      reason: "below_threshold",
      span: {
        ...span,
        anchorStatus: "anchor_stale",
        quality: bestScore,
      },
    };
  }

  const relocatedText = candidateText.slice(bestStart, bestEnd);
  return {
    ok: true,
    score: bestScore,
    reason: "token_window_match",
    span: {
      ...span,
      charRange: [bestStart, bestEnd],
      exactText: relocatedText,
      semanticFingerprint: stableFingerprint(`${sourceText} ${relocatedText} ${candidateText}`),
      anchorStatus: bestScore >= 0.9 ? "stable" : "low_confidence",
      quality: bestScore,
    },
  };
}

