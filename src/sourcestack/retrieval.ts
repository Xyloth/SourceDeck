export type RetrievalTier = "top" | "middle" | "far";
export type SearchLaneFilter = "exact" | "smart";

export type ParsedSearchCommand = {
  raw: string;
  text: string;
  exactPhrases: string[];
  filters: {
    document: string[];
    exhibit: string[];
    page: number[];
    tag: string[];
    type: string[];
    status: string[];
    lane: SearchLaneFilter[];
  };
  hasFilters: boolean;
};

export type SearchFilterCandidate = {
  documentTitle?: string;
  fileName?: string;
  exhibit?: string;
  page?: number;
  tags?: string[];
  type?: string;
  status?: string;
  lane?: SearchLaneFilter;
};

const stopSearchTerms = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "but",
  "for",
  "from",
  "has",
  "have",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "that",
  "the",
  "they",
  "this",
  "to",
  "was",
  "were",
  "what",
  "when",
  "where",
  "who",
  "why",
  "with",
]);

export function normalizeSearchText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function searchTokens(value: string) {
  return normalizeSearchText(value)
    .split(/\s+/)
    .filter((token) => token.length > 1 && !stopSearchTerms.has(token));
}

function unquoteSearchToken(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

function pushFilter(
  filters: ParsedSearchCommand["filters"],
  key: keyof ParsedSearchCommand["filters"],
  rawValue: string,
) {
  const value = unquoteSearchToken(rawValue);
  if (!value) return;
  if (key === "page") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed) && parsed > 0) filters.page.push(parsed);
    return;
  }
  if (key === "lane") {
    const normalized = normalizeSearchText(value);
    if (normalized === "exact" || normalized === "smart") filters.lane.push(normalized);
    return;
  }
  (filters[key] as string[]).push(value);
}

export function parseSearchCommand(input: string): ParsedSearchCommand {
  const filters: ParsedSearchCommand["filters"] = {
    document: [],
    exhibit: [],
    page: [],
    tag: [],
    type: [],
    status: [],
    lane: [],
  };
  const commandPattern =
    /(?:^|\s)(doc|document|file|record|exhibit|page|p|tag|type|status|lane):("[^"]+"|'[^']+'|\S+)/gi;
  let text = input.replace(commandPattern, (_match, rawKey: string, rawValue: string) => {
    const key = rawKey.toLowerCase();
    if (key === "doc" || key === "document" || key === "file" || key === "record") {
      pushFilter(filters, "document", rawValue);
    } else if (key === "p" || key === "page") {
      pushFilter(filters, "page", rawValue);
    } else if (key === "exhibit") {
      pushFilter(filters, "exhibit", rawValue);
    } else if (key === "tag") {
      pushFilter(filters, "tag", rawValue);
    } else if (key === "type") {
      pushFilter(filters, "type", rawValue);
    } else if (key === "status") {
      pushFilter(filters, "status", rawValue);
    } else if (key === "lane") {
      pushFilter(filters, "lane", rawValue);
    }
    return " ";
  });

  const exactPhrases = Array.from(text.matchAll(/"([^"]+)"|'([^']+)'/g))
    .map((match) => (match[1] ?? match[2] ?? "").trim())
    .filter(Boolean);
  text = text.replace(/["']/g, " ").replace(/\s+/g, " ").trim();

  return {
    raw: input,
    text,
    exactPhrases,
    filters,
    hasFilters: Object.values(filters).some((values) => values.length > 0),
  };
}

function normalizedIncludes(haystack: string, needle: string) {
  const normalizedNeedle = normalizeSearchText(needle);
  if (!normalizedNeedle) return true;
  return normalizeSearchText(haystack).includes(normalizedNeedle);
}

function anyFilterValueMatches(values: string[], haystacks: string[]) {
  if (!values.length) return true;
  return values.some((value) => haystacks.some((haystack) => normalizedIncludes(haystack, value)));
}

export function searchFiltersMatch(command: ParsedSearchCommand, candidate: SearchFilterCandidate) {
  const { filters } = command;
  if (
    !anyFilterValueMatches(filters.document, [
      candidate.documentTitle ?? "",
      candidate.fileName ?? "",
    ])
  ) {
    return false;
  }
  if (!anyFilterValueMatches(filters.exhibit, [candidate.exhibit ?? ""])) return false;
  if (!anyFilterValueMatches(filters.type, [candidate.type ?? ""])) return false;
  if (!anyFilterValueMatches(filters.status, [candidate.status ?? ""])) return false;
  if (
    filters.tag.length &&
    !filters.tag.some((value) => (candidate.tags ?? []).some((tag) => normalizedIncludes(tag, value)))
  ) {
    return false;
  }
  if (filters.page.length && !filters.page.includes(candidate.page ?? -1)) return false;
  if (filters.lane.length && (!candidate.lane || !filters.lane.includes(candidate.lane))) {
    return false;
  }
  return true;
}

export function editDistanceWithin(left: string, right: string, maxDistance: number) {
  if (Math.abs(left.length - right.length) > maxDistance) return maxDistance + 1;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array<number>(right.length + 1);
  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;
    let rowMin = current[0];
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + cost);
      rowMin = Math.min(rowMin, current[j]);
    }
    if (rowMin > maxDistance) return maxDistance + 1;
    for (let j = 0; j <= right.length; j += 1) previous[j] = current[j];
  }
  return previous[right.length];
}

export function scoreSearchText(query: string, text: string) {
  const normalizedQuery = normalizeSearchText(query);
  const normalizedText = normalizeSearchText(text);
  const queryTerms = searchTokens(query);
  const textTerms = new Set(searchTokens(text));
  const matchedTerms = new Set<string>();
  let score = normalizedQuery && normalizedText.includes(normalizedQuery) ? 9 : 0;

  for (const term of queryTerms) {
    if (textTerms.has(term)) {
      score += 4;
      matchedTerms.add(term);
      continue;
    }
    const textTermList = [...textTerms];
    const partial = textTermList.find(
      (candidate) => candidate.includes(term) || term.includes(candidate),
    );
    if (partial) {
      score += 2;
      matchedTerms.add(term);
      continue;
    }
    const fuzzy = textTermList.find((candidate) => {
      if (term.length < 4 || candidate.length < 4) return false;
      const allowed = term.length > 7 || candidate.length > 7 ? 2 : 1;
      return editDistanceWithin(term, candidate, allowed) <= allowed;
    });
    if (fuzzy) {
      score += 1.25;
      matchedTerms.add(term);
    }
  }

  const denominator = Math.max(12, queryTerms.length * 4 + 9);
  return {
    score: Math.min(1, score / denominator),
    matchedTerms: [...matchedTerms],
    phraseExact: Boolean(normalizedQuery && normalizedText.includes(normalizedQuery)),
  };
}

export function searchTier(score: number, phraseExact: boolean): RetrievalTier | undefined {
  if (phraseExact || score >= 0.72) return "top";
  if (score >= 0.42) return "middle";
  if (score >= 0.2) return "far";
  return undefined;
}

function anchorIndex(text: string, query: string, fallbackQuote = "") {
  const normalizedText = text.toLowerCase();
  const terms = searchTokens(query);
  const firstIndex = terms
    .map((term) => normalizedText.indexOf(term))
    .filter((index) => index >= 0)
    .sort((left, right) => left - right)[0];
  const fallbackIndex = fallbackQuote ? normalizedText.indexOf(fallbackQuote.toLowerCase()) : -1;
  return firstIndex ?? (fallbackIndex >= 0 ? fallbackIndex : 0);
}

export function sourceSnippet(text: string, query: string, fallbackQuote = "") {
  const anchor = anchorIndex(text, query, fallbackQuote);
  const start = Math.max(0, anchor - 140);
  const end = Math.min(text.length, anchor + 300);
  const snippet = text.slice(start, end).replace(/\s+/g, " ").trim();
  return `${start > 0 ? "... " : ""}${snippet}${end < text.length ? " ..." : ""}`;
}

export function sourceExcerpt(text: string, query: string, fallbackQuote = "") {
  const anchor = anchorIndex(text, query, fallbackQuote);
  const start = Math.max(0, anchor - 80);
  const end = Math.min(text.length, anchor + 220);
  return text.slice(start, end).trim();
}
