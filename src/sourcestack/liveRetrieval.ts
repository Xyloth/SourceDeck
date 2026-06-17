import { normalizeForFingerprint, resolveEvidenceCardSource } from "./kernel";
import { verifyEvidenceSignoff, type EvidenceSignoff, type SignoffVerification } from "./workbench";
import type { EvidenceCard, SourceGraph } from "./types";

export type LiveSuggestionOptions = {
  verifiedOnly?: boolean;
  limit?: number;
  minScore?: number;
};

export type LiveEvidenceSuggestion = ReturnType<typeof selectLiveEvidenceSuggestions>[number];

export type LiveEvidenceSuggestionWithSignoff = LiveEvidenceSuggestion & {
  signoff: EvidenceSignoff;
  signoffVerification: SignoffVerification;
};

function tokens(value: string) {
  return new Set(
    normalizeForFingerprint(value)
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 2),
  );
}

function boundedLimit(limit: number | undefined) {
  if (typeof limit === "undefined") return 3;
  if (!Number.isFinite(limit)) return 3;
  return Math.max(0, Math.floor(limit));
}

function boundedMinScore(minScore: number | undefined) {
  if (typeof minScore === "undefined") return 0.25;
  if (!Number.isFinite(minScore)) return 0.25;
  return Math.min(1, Math.max(0, minScore));
}

export function scoreCardForLiveQuery(query: string, card: EvidenceCard) {
  const queryTokens = tokens(query);
  if (!queryTokens.size) return 0;
  const haystackTokens = tokens(
    [card.assertion, card.exactQuoteOrSegment, card.plainLanguageMeaning, card.tags.join(" ")].join(" "),
  );
  let hits = 0;
  queryTokens.forEach((token) => {
    if (haystackTokens.has(token)) hits += 1;
  });
  return hits / queryTokens.size;
}

export function selectLiveEvidenceSuggestions(
  graph: SourceGraph,
  query: string,
  options: LiveSuggestionOptions = {},
) {
  const verifiedOnly = options.verifiedOnly ?? true;
  const limit = boundedLimit(options.limit);
  const minScore = boundedMinScore(options.minScore);
  return Object.values(graph.evidenceCards)
    .map((card) => {
      const resolution = resolveEvidenceCardSource(card, graph);
      const score = scoreCardForLiveQuery(query, card);
      return { card, score, resolution };
    })
    .filter(({ card, resolution, score }) => {
      if (score < minScore) return false;
      if (
        !resolution.ok ||
        !resolution.quoteExact ||
        !resolution.spanBackedBySource ||
        !resolution.anchorUsable
      ) {
        return false;
      }
      return !verifiedOnly || card.verificationStatus === "verified";
    })
    .sort((left, right) => right.score - left.score || left.card.id.localeCompare(right.card.id))
    .slice(0, limit);
}

function latestSignoffByCard(signoffs: EvidenceSignoff[]) {
  const latestByCard = new Map<string, EvidenceSignoff>();
  signoffs.forEach((signoff) => {
    const previous = latestByCard.get(signoff.cardId);
    if (!previous || signoff.at >= previous.at) {
      latestByCard.set(signoff.cardId, signoff);
    }
  });
  return latestByCard;
}

export async function selectLiveEvidenceSuggestionsWithCurrentSignoff(
  graph: SourceGraph,
  query: string,
  signoffs: EvidenceSignoff[],
  options: LiveSuggestionOptions = {},
): Promise<LiveEvidenceSuggestionWithSignoff[]> {
  const suggestions = selectLiveEvidenceSuggestions(graph, query, {
    ...options,
    verifiedOnly: true,
  });
  const latestByCard = latestSignoffByCard(signoffs);
  const checked = await Promise.all(
    suggestions.map(async (suggestion): Promise<LiveEvidenceSuggestionWithSignoff | undefined> => {
      const signoff = latestByCard.get(suggestion.card.id);
      if (!signoff || signoff.decision !== "verify" || signoff.toStatus !== "verified") {
        return undefined;
      }
      const signoffVerification = await verifyEvidenceSignoff(graph, signoff);
      if (!signoffVerification.ok) return undefined;
      return { ...suggestion, signoff, signoffVerification };
    }),
  );
  return checked.filter(
    (suggestion): suggestion is LiveEvidenceSuggestionWithSignoff => Boolean(suggestion),
  );
}
