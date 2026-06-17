import {
  normalizeForFingerprint,
  sourceSpanBackedBySource,
  sourceSpanTerminatesAtSource,
} from "./kernel";
import type { BitemporalEvent, SourceGraph } from "./types";

export type BitemporalPolarity = "positive" | "negative" | "unknown";

export type BitemporalContradiction = {
  id: string;
  entityKey: string;
  validDate: string;
  positiveEventIds: string[];
  negativeEventIds: string[];
  sourceSpanIds: string[];
  transactionTimes: string[];
  reason: string;
};

const negativePatterns = [
  /\bnot\s+(?:able\s+to\s+)?(?:be\s+)?provided\b/,
  /\bnot\s+(?:delivered|implemented|available|received|present|completed)\b/,
  /\b(?:denied|refused|missed|withheld|absent|unavailable|breached)\b/,
  /\b(?:cannot|can't|could\s+not|won't|will\s+not)\b/,
];

const positivePatterns = [
  /\b(?:provided|delivered|implemented|available|received|present|completed|fulfilled|resumed)\b/,
  /\bwill\s+receive\b/,
  /\bservices?\s+will\s+resume\b/,
];

function eventEntityKey(event: BitemporalEvent) {
  return event.entities
    .map((entity) => normalizeForFingerprint(entity))
    .filter(Boolean)
    .sort()
    .join("|");
}

function validDate(event: BitemporalEvent) {
  return event.validTime.slice(0, 10);
}

export function classifyBitemporalEventPolarity(event: BitemporalEvent): BitemporalPolarity {
  const description = normalizeForFingerprint(event.description);
  if (negativePatterns.some((pattern) => pattern.test(description))) return "negative";
  if (positivePatterns.some((pattern) => pattern.test(description))) return "positive";
  return "unknown";
}

function classifyTextPolarity(value: string): BitemporalPolarity {
  const description = normalizeForFingerprint(value);
  if (negativePatterns.some((pattern) => pattern.test(description))) return "negative";
  if (positivePatterns.some((pattern) => pattern.test(description))) return "positive";
  return "unknown";
}

export function bitemporalEventSourceUsable(graph: SourceGraph, event: BitemporalEvent) {
  const span = graph.spans[event.sourceSpanId];
  return Boolean(
    span &&
      sourceSpanTerminatesAtSource(span, graph) &&
      sourceSpanBackedBySource(span, graph) &&
      span.anchorStatus !== "anchor_stale" &&
      span.anchorStatus !== "unresolved",
  );
}

export function classifyBitemporalEventPolarityFromSource(
  graph: SourceGraph,
  event: BitemporalEvent,
): BitemporalPolarity {
  const span = graph.spans[event.sourceSpanId];
  if (!span || !bitemporalEventSourceUsable(graph, event)) return "unknown";
  const sourcePolarity = classifyTextPolarity(span.exactText);
  const describedPolarity = classifyBitemporalEventPolarity(event);
  if (
    sourcePolarity !== "unknown" &&
    describedPolarity !== "unknown" &&
    sourcePolarity !== describedPolarity
  ) {
    return "unknown";
  }
  return sourcePolarity;
}

export function detectBitemporalContradictions(graph: SourceGraph): BitemporalContradiction[] {
  const buckets = new Map<
    string,
    { entityKey: string; validDate: string; events: BitemporalEvent[] }
  >();

  Object.values(graph.events).forEach((event) => {
    const entityKey = eventEntityKey(event);
    if (!entityKey || classifyBitemporalEventPolarityFromSource(graph, event) === "unknown") {
      return;
    }
    const bucketKey = `${entityKey}::${validDate(event)}`;
    const bucket = buckets.get(bucketKey) ?? {
      entityKey,
      validDate: validDate(event),
      events: [],
    };
    bucket.events.push(event);
    buckets.set(bucketKey, bucket);
  });

  return Array.from(buckets.values())
    .map((bucket) => {
      const positive = bucket.events.filter(
        (event) => classifyBitemporalEventPolarityFromSource(graph, event) === "positive",
      );
      const negative = bucket.events.filter(
        (event) => classifyBitemporalEventPolarityFromSource(graph, event) === "negative",
      );
      if (!positive.length || !negative.length) return undefined;
      return {
        id: `bitemporal:${bucket.entityKey}:${bucket.validDate}`,
        entityKey: bucket.entityKey,
        validDate: bucket.validDate,
        positiveEventIds: positive.map((event) => event.id),
        negativeEventIds: negative.map((event) => event.id),
        sourceSpanIds: Array.from(new Set(bucket.events.map((event) => event.sourceSpanId))),
        transactionTimes: Array.from(new Set(bucket.events.map((event) => event.transactionTime))),
        reason:
          "same entity and valid date contain both delivered/available and denied/missing status events",
      } satisfies BitemporalContradiction;
    })
    .filter((item): item is BitemporalContradiction => Boolean(item));
}
