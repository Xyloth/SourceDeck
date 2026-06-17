import type { DurableSourceArtifact } from "./sourceArtifacts";

export type RedactionToken = {
  token: string;
  original: string;
  category: string;
};

export type SourceArtifactDisclosureLeak = {
  artifactId: string;
  pageId?: string;
  kind: "payload" | "page" | "layout_block";
  excerpt: string;
  reason: string;
};

export type RedactionBridgeResult = {
  redactedText: string;
  tokens: RedactionToken[];
  residualLeaks: string[];
};

export type RedactedExportGate =
  | {
      ok: true;
      redactedText: string;
      tokens: RedactionToken[];
      residualLeaks: [];
      sourceLeaks?: [];
    }
  | {
      ok: false;
      redactedText: string;
      tokens: RedactionToken[];
      residualLeaks: string[];
      sourceLeaks?: SourceArtifactDisclosureLeak[];
      report: string;
    };

// Luhn checksum: keeps credit-card detection high-precision so an arbitrary long digit string
// (an exhibit number, a long reference) is not mistaken for a payment card.
function passesLuhn(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = digits.charCodeAt(index) - 48;
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

const sensitivePatterns: Array<{
  category: string;
  pattern: RegExp;
  validate?: (match: string) => boolean;
}> = [
  // credit_card runs before phone so a 13-19 digit card is claimed as a whole unit (phones are
  // 10 digits, so this never touches them); Luhn validation rejects non-card digit strings.
  { category: "credit_card", pattern: /\b\d(?:[ -]?\d){12,18}\b/g, validate: passesLuhn },
  { category: "email", pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi },
  { category: "phone", pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g },
  { category: "ssn", pattern: /\b\d{3}-\d{2}-\d{4}\b/g },
  { category: "dob", pattern: /\b(?:DOB|date of birth)\s*[:#-]?\s*\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/gi },
  {
    category: "account",
    pattern: /\b(?:account|acct|student|patient|member|claim)\s*(?:id|number|no\.?|#)\s*[:#-]?\s*[A-Z0-9-]{4,}\b/gi,
  },
  {
    // Street address: a leading street number, up to four street-name words, then a street suffix.
    // Street-name words must start uppercase or a digit ("Main", "4th"), so a lowercase word before
    // a suffix abbreviation (e.g. a medical dosage "5 mg Dr.") is not mis-read as an address. The
    // leading-number + capitalized-name + suffix structure keeps this high-precision.
    category: "street_address",
    pattern:
      /\b\d{1,6}\s+(?:[A-Z0-9][A-Za-z0-9.'-]*\s+){0,4}(?:Street|Avenue|Boulevard|Road|Lane|Drive|Court|Place|Terrace|Circle|Highway|Parkway|Way|St|Ave|Blvd|Rd|Ln|Dr|Ct|Pl|Ter|Cir|Hwy|Pkwy)\b/g,
  },
  {
    // An honorific followed by one or two capitalized name words ("Dr. Jane Smith", "Mr Jones").
    // Requiring an honorific keeps this from flagging every capitalized word.
    category: "honorific_name",
    pattern: /\b(?:Mr|Mrs|Ms|Mx|Dr|Prof|Professor)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g,
  },
];

function makeToken(category: string, count: number) {
  return `[${category.toUpperCase()}_${count}]`;
}

export function applyDeterministicRedactionBridge(
  text: string,
  manualTerms: string[] = [],
): RedactionBridgeResult {
  let redactedText = text;
  const tokens: RedactionToken[] = [];
  const counts = new Map<string, number>();
  const seen = new Map<string, string>();

  const tokenFor = (category: string, original: string) => {
    const key = `${category}:${original}`;
    const existing = seen.get(key);
    if (existing) return existing;
    const count = (counts.get(category) ?? 0) + 1;
    counts.set(category, count);
    const token = makeToken(category, count);
    seen.set(key, token);
    tokens.push({ token, original, category });
    return token;
  };

  sensitivePatterns.forEach(({ category, pattern, validate }) => {
    redactedText = redactedText.replace(pattern, (match) =>
      validate && !validate(match) ? match : tokenFor(category, match),
    );
  });

  manualTerms
    .map((term) => term.trim())
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
    .forEach((term) => {
      const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      redactedText = redactedText.replace(new RegExp(escaped, "g"), (match) =>
        tokenFor("manual", match),
      );
    });

  return {
    redactedText,
    tokens,
    residualLeaks: detectResidualSensitiveText(redactedText, manualTerms),
  };
}

function normalizeResidualProbe(value: string) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function detectResidualSensitiveText(text: string, manualTerms: string[] = []) {
  const automaticLeaks = sensitivePatterns.flatMap(({ category, pattern, validate }) => {
    const matches = text.match(pattern) ?? [];
    return matches
      .filter((match) => !validate || validate(match))
      .map((match) => `${category}:${match}`);
  });
  const normalizedText = normalizeResidualProbe(text);
  const manualLeaks = manualTerms
    .map((term) => term.trim())
    .filter(Boolean)
    .filter((term) => normalizedText.includes(normalizeResidualProbe(term)))
    .map((term) => `manual:${term}`);
  return Array.from(new Set([...automaticLeaks, ...manualLeaks]));
}

export function redactPacketForExport(
  content: string,
  manualTerms: string[] = [],
): RedactedExportGate {
  const result = applyDeterministicRedactionBridge(content, manualTerms);
  if (!result.residualLeaks.length) {
    return {
      ok: true,
      redactedText: result.redactedText,
      tokens: result.tokens,
      residualLeaks: [],
    };
  }
  const report = [
    "# SourceDeck Redaction Hard-Wall Report",
    "",
    "Redacted packet export was blocked because deterministic leak scanning found sensitive text after redaction.",
    "",
    "## Residual Leaks",
    ...result.residualLeaks.map((leak, index) => `${index + 1}. ${leak}`),
    "",
    `Tokens applied: ${result.tokens.length}`,
  ].join("\n");
  return {
    ok: false,
    redactedText: result.redactedText,
    tokens: result.tokens,
    residualLeaks: result.residualLeaks,
    report,
  };
}

function normalizedProbeIncludes(haystack: string, needle: string) {
  const normalizedHaystack = normalizeResidualProbe(haystack);
  const normalizedNeedle = normalizeResidualProbe(needle);
  return normalizedNeedle.length > 0 && normalizedHaystack.includes(normalizedNeedle);
}

function payloadText(artifact: DurableSourceArtifact) {
  if (artifact.payload.encoding !== "utf8") return undefined;
  return artifact.payload.data;
}

function leakProbe(text: string, manualTerms: string[]) {
  return applyDeterministicRedactionBridge(text, manualTerms).redactedText;
}

function disclosureExcerpt(text: string) {
  return text.replace(/\s+/g, " ").trim().slice(0, 180);
}

export function detectSourceArtifactDisclosureLeaks(
  content: string,
  artifacts: DurableSourceArtifact[],
  options: {
    manualTerms?: string[];
    allowedQuotes?: string[];
    minProbeCharacters?: number;
  } = {},
): SourceArtifactDisclosureLeak[] {
  const manualTerms = options.manualTerms ?? [];
  const minProbeCharacters = options.minProbeCharacters ?? 80;
  const allowedQuotes = options.allowedQuotes ?? [];
  const leaks: SourceArtifactDisclosureLeak[] = [];

  const allowed = (probe: string) =>
    allowedQuotes.some((quote) => normalizedProbeIncludes(quote, probe));

  const checkProbe = (
    artifact: DurableSourceArtifact,
    kind: SourceArtifactDisclosureLeak["kind"],
    text: string | undefined,
    pageId?: string,
  ) => {
    const trimmed = text?.trim();
    if (!trimmed || trimmed.length < minProbeCharacters || allowed(trimmed)) return;
    const redactedProbe = leakProbe(trimmed, manualTerms);
    if (!redactedProbe.trim() || allowed(redactedProbe)) return;
    if (normalizedProbeIncludes(content, redactedProbe)) {
      leaks.push({
        artifactId: artifact.artifactId,
        pageId,
        kind,
        excerpt: disclosureExcerpt(trimmed),
        reason: `${kind} text appears in redacted export outside an allowed quote`,
      });
    }
  };

  artifacts.forEach((artifact) => {
    checkProbe(artifact, "payload", payloadText(artifact));
    artifact.pages.forEach((page) => {
      checkProbe(artifact, "page", page.text, page.id);
      page.geometry.blocks.forEach((block) => {
        checkProbe(artifact, "layout_block", block.text, page.id);
      });
    });
  });

  return leaks;
}

export function redactSourceBackedPacketForExport(
  content: string,
  artifacts: DurableSourceArtifact[],
  options: {
    manualTerms?: string[];
    allowedQuotes?: string[];
    minProbeCharacters?: number;
  } = {},
): RedactedExportGate {
  const redacted = redactPacketForExport(content, options.manualTerms ?? []);
  const sourceLeaks = detectSourceArtifactDisclosureLeaks(redacted.redactedText, artifacts, options);
  if (redacted.ok && !sourceLeaks.length) {
    return { ...redacted, sourceLeaks: [] };
  }
  const residualLeaks = redacted.residualLeaks;
  const report = [
    "# SourceDeck Redaction Hard-Wall Report",
    "",
    "Redacted packet export was blocked because deterministic leak scanning found sensitive text or source-artifact disclosure after redaction.",
    "",
    "## Residual Leaks",
    residualLeaks.length
      ? residualLeaks.map((leak, index) => `${index + 1}. ${leak}`).join("\n")
      : "None",
    "",
    "## Source Artifact Disclosure Leaks",
    sourceLeaks.length
      ? sourceLeaks
          .map(
            (leak, index) =>
              `${index + 1}. ${leak.artifactId}${leak.pageId ? ` ${leak.pageId}` : ""} ${leak.kind}: ${leak.excerpt}`,
          )
          .join("\n")
      : "None",
    "",
    `Tokens applied: ${redacted.tokens.length}`,
  ].join("\n");
  return {
    ok: false,
    redactedText: redacted.redactedText,
    tokens: redacted.tokens,
    residualLeaks,
    sourceLeaks,
    report,
  };
}
