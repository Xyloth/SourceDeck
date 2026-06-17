import { contentAddress } from "./kernel";
import { packetSigningKeyId, type StoredPacketSigningKey } from "./manifestSigning";
import type { ContentAddress } from "./types";

export type CaseArtifact = {
  id: string;
  contentHash: ContentAddress;
  mediaType: string;
  byteLength: number;
  createdAt: string;
  payload: {
    encoding: "utf8" | "base64";
    data: string;
  };
  metadata: Record<string, string | number | boolean | null>;
};

export type CaseStoreEvent = {
  id: string;
  caseId: string;
  type:
    | "case_created"
    | "artifact_put"
    | "document_indexed"
    | "span_created"
    | "evidence_verified"
    | "evidence_signed_off"
    | "evidence_promoted"
    | "evidence_split"
    | "evidence_merged"
    | "evidence_edited"
    | "evidence_reanchored"
    | "import_quarantined"
    | "source_vault_verified"
    | "signing_key_wrapped"
    | "artifact_verified"
    | "bundle_exported"
    | "packet_exported"
    | "redaction_applied"
    | "security_finding";
  actor: string;
  at: string;
  targetId: string;
  payload: Record<string, unknown>;
  prevHash?: ContentAddress;
  eventHash: ContentAddress;
};

export type ContentAddressedCaseStore = {
  caseId: string;
  createdAt: string;
  artifacts: Record<string, CaseArtifact>;
  events: CaseStoreEvent[];
  headHash?: ContentAddress;
};

export type EventVerificationResult =
  | { ok: true; headHash?: ContentAddress }
  | { ok: false; index: number; eventId: string; reason: string };

export type ArtifactVerificationResult =
  | { ok: true; artifactCount: number }
  | { ok: false; artifactId: string; reason: string };

function bytesFrom(value: string | Uint8Array) {
  return typeof value === "string" ? new TextEncoder().encode(value) : value;
}

function bytesToBase64(bytes: Uint8Array) {
  if (typeof btoa !== "function") {
    throw new Error("Base64 encoding requires btoa support.");
  }
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary);
}

function base64ToBytes(value: string) {
  if (typeof atob !== "function") {
    throw new Error("Base64 decoding requires atob support.");
  }
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function artifactPayloadFromContent(content: string | Uint8Array): CaseArtifact["payload"] {
  return typeof content === "string"
    ? { encoding: "utf8", data: content }
    : { encoding: "base64", data: bytesToBase64(content) };
}

function artifactBytes(artifact: CaseArtifact) {
  return artifact.payload.encoding === "utf8"
    ? new TextEncoder().encode(artifact.payload.data)
    : base64ToBytes(artifact.payload.data);
}

function stableEventPayload(event: Omit<CaseStoreEvent, "eventHash">) {
  return canonicalJson({
    id: event.id,
    caseId: event.caseId,
    type: event.type,
    actor: event.actor,
    at: event.at,
    targetId: event.targetId,
    payload: event.payload,
    prevHash: event.prevHash ?? null,
  });
}

function payloadValue(event: CaseStoreEvent, key: string) {
  return event.payload[key];
}

function payloadString(event: CaseStoreEvent, key: string) {
  const value = payloadValue(event, key);
  return typeof value === "string" && value.trim() ? value : "";
}

function payloadContentAddress(event: CaseStoreEvent, key: string) {
  const value = payloadString(event, key);
  return /^sha256:[a-f0-9]{64}$/i.test(value) ? value : "";
}

function payloadArray(event: CaseStoreEvent, key: string) {
  const value = payloadValue(event, key);
  return Array.isArray(value) ? value : undefined;
}

function payloadFiniteNumber(event: CaseStoreEvent, key: string) {
  const value = payloadValue(event, key);
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

const signoffDecisionTargets: Record<string, string> = {
  verify: "verified",
  dispute: "disputed",
  withdraw: "withdrawn",
  supersede: "superseded",
};

function validateCaseEventSemantics(event: CaseStoreEvent) {
  if (!event.id.trim()) return "event id missing";
  if (!event.actor.trim()) return "event actor missing";
  if (!event.targetId.trim()) return "event target missing";
  if (Number.isNaN(Date.parse(event.at))) return "event timestamp invalid";
  switch (event.type) {
    case "import_quarantined":
      if (
        payloadValue(event, "autoSuggestEvidence") !== false &&
        payloadValue(event, "importTrust") !== "quarantined_prompt_injection"
      ) {
        return "import quarantine event did not disable auto-suggest";
      }
      break;
    case "evidence_verified":
      if (payloadValue(event, "to") !== "verified") {
        return "evidence verification event target status is not verified";
      }
      break;
    case "evidence_signed_off": {
      const decision = payloadString(event, "decision");
      if (!signoffDecisionTargets[decision]) return "evidence signoff event has invalid decision";
      if (payloadValue(event, "to") !== signoffDecisionTargets[decision]) {
        return "evidence signoff event decision and target status disagree";
      }
      if (!payloadString(event, "reviewer")) return "evidence signoff event missing reviewer";
      if (!payloadContentAddress(event, "proofSnapshotHash")) {
        return "evidence signoff event missing or invalid proof hash";
      }
      break;
    }
    case "evidence_promoted":
      if (payloadValue(event, "decision") !== "verify") {
        return "evidence promotion event decision is not verify";
      }
      if (payloadValue(event, "to") !== "verified") {
        return "evidence promotion event target status is not verified";
      }
      if (!payloadContentAddress(event, "proofSnapshotHash")) {
        return "evidence promotion event missing or invalid proof hash";
      }
      if (!payloadContentAddress(event, "inspectionTargetHash")) {
        return "evidence promotion event missing or invalid inspection target hash";
      }
      if (!payloadString(event, "documentId")) return "evidence promotion event missing document id";
      if (!payloadString(event, "spanId")) return "evidence promotion event missing span id";
      break;
    case "evidence_split": {
      const childIds = payloadArray(event, "childIds");
      const subQuotes = payloadArray(event, "subQuotes");
      if (!payloadString(event, "parentId")) return "evidence split event missing parent id";
      if (!childIds?.length || !childIds.every((id) => typeof id === "string" && id.trim())) {
        return "evidence split event missing child ids";
      }
      if (
        !subQuotes?.length ||
        subQuotes.length !== childIds.length ||
        !subQuotes.every((quote) => typeof quote === "string" && quote.trim())
      ) {
        return "evidence split event missing matching sub-quotes";
      }
      break;
    }
    case "evidence_merged": {
      const mergedIds = payloadArray(event, "mergedIds");
      if (!payloadString(event, "survivorId")) return "evidence merge event missing survivor id";
      if (!mergedIds?.length || !mergedIds.every((id) => typeof id === "string" && id.trim())) {
        return "evidence merge event missing merged ids";
      }
      break;
    }
    case "evidence_edited":
      if (!payloadString(event, "newQuote")) return "evidence edit event missing quote";
      break;
    case "evidence_reanchored":
      if (
        !payloadString(event, "result") &&
        (!payloadString(event, "from") || !payloadString(event, "to"))
      ) {
        return "evidence reanchor event missing result";
      }
      if (
        typeof payloadValue(event, "score") !== "undefined" &&
        payloadFiniteNumber(event, "score") === undefined
      ) {
        return "evidence reanchor event score is invalid";
      }
      break;
    case "source_vault_verified":
      if (!payloadString(event, "documentId")) return "source vault event missing document id";
      if (!payloadString(event, "manifestHash")) return "source vault event missing manifest hash";
      if (!payloadString(event, "originalContentHash")) {
        return "source vault event missing original content hash";
      }
      break;
    case "artifact_verified":
      if (!payloadString(event, "contentHash")) return "artifact verification event missing content hash";
      break;
    case "signing_key_wrapped":
      if (payloadValue(event, "custody") !== "encrypted") {
        return "signing key custody event is not encrypted";
      }
      break;
    case "packet_exported":
      if (!payloadString(event, "manifestHash")) return "packet export event missing manifest hash";
      break;
    case "bundle_exported":
      if (!payloadString(event, "bundleHash")) return "bundle export event missing bundle hash";
      if (!payloadString(event, "graphHash")) return "bundle export event missing graph hash";
      break;
    case "redaction_applied":
      if (payloadValue(event, "sourceLeaks") !== 0) {
        return "redaction event recorded unresolved source leaks";
      }
      break;
    default:
      break;
  }
  return "";
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
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

export async function createContentAddressedCaseStore(
  caseId: string,
  actor = "system",
  now = new Date().toISOString(),
): Promise<ContentAddressedCaseStore> {
  const store: ContentAddressedCaseStore = {
    caseId,
    createdAt: now,
    artifacts: {},
    events: [],
  };
  await appendCaseEvent(store, {
    id: `${caseId}:event:created`,
    type: "case_created",
    actor,
    at: now,
    targetId: caseId,
    payload: { caseId },
  });
  return store;
}

export async function putCaseArtifact(
  store: ContentAddressedCaseStore,
  content: string | Uint8Array,
  mediaType: string,
  metadata: Record<string, string | number | boolean | null> = {},
  actor = "system",
  now = new Date().toISOString(),
) {
  const bytes = bytesFrom(content);
  const contentHash = await contentAddress(bytes);
  const artifact: CaseArtifact = {
    id: `artifact:${contentHash}`,
    contentHash,
    mediaType,
    byteLength: bytes.byteLength,
    createdAt: now,
    payload: artifactPayloadFromContent(content),
    metadata,
  };
  store.artifacts[artifact.id] = artifact;
  await appendCaseEvent(store, {
    id: `${store.caseId}:event:${store.events.length + 1}`,
    type: "artifact_put",
    actor,
    at: now,
    targetId: artifact.id,
    payload: {
      contentHash,
      mediaType,
      byteLength: artifact.byteLength,
      metadata,
    },
  });
  return artifact;
}

export async function verifyCaseArtifacts(
  store: Pick<ContentAddressedCaseStore, "artifacts">,
): Promise<ArtifactVerificationResult> {
  const artifactEntries = Object.entries(store.artifacts);
  for (const [artifactKey, artifact] of artifactEntries) {
    if (artifactKey !== artifact.id) {
      return { ok: false, artifactId: artifact.id, reason: "artifact store key mismatch" };
    }
    if (!artifact.payload?.data) {
      return { ok: false, artifactId: artifact.id, reason: "artifact has no durable payload" };
    }
    const bytes = artifactBytes(artifact);
    if (bytes.byteLength !== artifact.byteLength) {
      return { ok: false, artifactId: artifact.id, reason: "artifact byte length mismatch" };
    }
    const contentHash = await contentAddress(bytes);
    if (contentHash !== artifact.contentHash) {
      return { ok: false, artifactId: artifact.id, reason: "artifact content hash mismatch" };
    }
    if (artifact.id !== `artifact:${artifact.contentHash}`) {
      return { ok: false, artifactId: artifact.id, reason: "artifact id content hash mismatch" };
    }
  }
  return { ok: true, artifactCount: artifactEntries.length };
}

export async function appendCaseEvent(
  store: ContentAddressedCaseStore,
  event: Omit<CaseStoreEvent, "caseId" | "prevHash" | "eventHash">,
) {
  const eventWithoutHash: Omit<CaseStoreEvent, "eventHash"> = {
    ...event,
    caseId: store.caseId,
    prevHash: store.headHash,
  };
  const eventHash = await contentAddress(stableEventPayload(eventWithoutHash));
  const nextEvent: CaseStoreEvent = { ...eventWithoutHash, eventHash };
  store.events.push(nextEvent);
  store.headHash = eventHash;
  return nextEvent;
}

export async function verifyCaseEventLog(
  store: Pick<ContentAddressedCaseStore, "caseId" | "events" | "headHash">,
): Promise<EventVerificationResult> {
  let previousHash: ContentAddress | undefined;
  let previousTimestamp = Number.NEGATIVE_INFINITY;
  const seenEventIds = new Set<string>();
  for (let index = 0; index < store.events.length; index += 1) {
    const event = store.events[index];
    if (seenEventIds.has(event.id)) {
      return { ok: false, index, eventId: event.id, reason: "duplicate case event id" };
    }
    seenEventIds.add(event.id);
    if (event.caseId !== store.caseId) {
      return { ok: false, index, eventId: event.id, reason: "event case ID mismatch" };
    }
    const semanticFailure = validateCaseEventSemantics(event);
    if (semanticFailure) {
      return { ok: false, index, eventId: event.id, reason: semanticFailure };
    }
    const eventTimestamp = Date.parse(event.at);
    if (event.type !== "case_created") {
      if (eventTimestamp < previousTimestamp) {
        return { ok: false, index, eventId: event.id, reason: "event timestamp moved backwards" };
      }
      previousTimestamp = eventTimestamp;
    }
    if (event.prevHash !== previousHash) {
      return { ok: false, index, eventId: event.id, reason: "event previous hash mismatch" };
    }
    const recomputed = await contentAddress(
      stableEventPayload({
        id: event.id,
        caseId: event.caseId,
        type: event.type,
        actor: event.actor,
        at: event.at,
        targetId: event.targetId,
        payload: event.payload,
        prevHash: event.prevHash,
      }),
    );
    if (recomputed !== event.eventHash) {
      return { ok: false, index, eventId: event.id, reason: "event hash mismatch" };
    }
    previousHash = event.eventHash;
  }
  if (store.headHash !== previousHash) {
    return {
      ok: false,
      index: store.events.length - 1,
      eventId: store.events.at(-1)?.id ?? "none",
      reason: "store head hash mismatch",
    };
  }
  return { ok: true, headHash: previousHash };
}

// A linear hash chain is tamper-evident only against the next/previous event. A holder of the
// stored object can rewrite any event and RECOMPUTE the whole chain (including headHash), so
// verifyCaseEventLog alone passes a wholesale forgery. The signed head anchor closes that hole:
// it binds an ECDSA signature to (caseId, genesisHash, headHash, eventCount). A re-chained log
// produces a different headHash that the original key never signed, and a forger cannot re-sign
// without the private key. With a pinned trusted key id, an attacker re-signing with their own
// key is also rejected.
const ledgerKeyAlgorithm: EcKeyImportParams = { name: "ECDSA", namedCurve: "P-256" };
const ledgerSignatureAlgorithm: EcdsaParams = { name: "ECDSA", hash: "SHA-256" };

export type CaseLedgerHeadAnchor = {
  format: "sourcedeck.case-ledger-head.v1";
  caseId: string;
  genesisHash: ContentAddress;
  headHash: ContentAddress;
  eventCount: number;
  algorithm: "ECDSA-P256-SHA256";
  publicKeyId: string;
  publicKeyJwk: JsonWebKey;
  signature: string;
  signedAt: string;
};

export type CaseLedgerVerification =
  | { ok: true; headHash: ContentAddress; publicKeyId: string }
  | { ok: false; reason: string };

function ledgerHeadSigningPayload(anchor: {
  caseId: string;
  genesisHash: ContentAddress;
  headHash: ContentAddress;
  eventCount: number;
}) {
  return canonicalJson({
    format: "sourcedeck.case-ledger-head.v1",
    caseId: anchor.caseId,
    genesisHash: anchor.genesisHash,
    headHash: anchor.headHash,
    eventCount: anchor.eventCount,
  });
}

export async function signCaseLedgerHead(
  store: Pick<ContentAddressedCaseStore, "caseId" | "events" | "headHash">,
  storedKey: StoredPacketSigningKey,
  signedAt = new Date().toISOString(),
): Promise<CaseLedgerHeadAnchor> {
  const genesisHash = store.events[0]?.eventHash ?? "";
  const headHash = store.headHash ?? genesisHash;
  const payload = ledgerHeadSigningPayload({
    caseId: store.caseId,
    genesisHash,
    headHash,
    eventCount: store.events.length,
  });
  const privateKey = await globalThis.crypto.subtle.importKey(
    "jwk",
    storedKey.privateKeyJwk,
    ledgerKeyAlgorithm,
    true,
    ["sign"],
  );
  const signature = new Uint8Array(
    await globalThis.crypto.subtle.sign(
      ledgerSignatureAlgorithm,
      privateKey,
      new TextEncoder().encode(payload),
    ),
  );
  return {
    format: "sourcedeck.case-ledger-head.v1",
    caseId: store.caseId,
    genesisHash,
    headHash,
    eventCount: store.events.length,
    algorithm: "ECDSA-P256-SHA256",
    publicKeyId: storedKey.keyId,
    publicKeyJwk: storedKey.publicKeyJwk,
    signature: bytesToBase64(signature),
    signedAt,
  };
}

export async function verifySignedCaseLedger(
  store: Pick<ContentAddressedCaseStore, "caseId" | "events" | "headHash">,
  anchor: CaseLedgerHeadAnchor,
  options: { trustedPublicKeyId?: string; trustedKeyIds?: string[] } = {},
): Promise<CaseLedgerVerification> {
  if (anchor.format !== "sourcedeck.case-ledger-head.v1") {
    return { ok: false, reason: "unsupported case ledger head anchor format" };
  }
  if (anchor.algorithm !== "ECDSA-P256-SHA256") {
    return { ok: false, reason: "unsupported case ledger head signature algorithm" };
  }
  const chain = await verifyCaseEventLog(store);
  if (!chain.ok) {
    return { ok: false, reason: `event log invalid: ${chain.reason}` };
  }
  if (anchor.caseId !== store.caseId) {
    return { ok: false, reason: "case ledger head case id mismatch" };
  }
  if (anchor.eventCount !== store.events.length) {
    return { ok: false, reason: "case ledger head event count mismatch" };
  }
  const genesisHash = store.events[0]?.eventHash ?? "";
  if (anchor.genesisHash !== genesisHash) {
    return { ok: false, reason: "case ledger head genesis hash mismatch" };
  }
  if (anchor.headHash !== (store.headHash ?? genesisHash)) {
    return { ok: false, reason: "case ledger head hash mismatch" };
  }
  const expectedKeyId = await packetSigningKeyId(anchor.publicKeyJwk);
  if (expectedKeyId !== anchor.publicKeyId) {
    return { ok: false, reason: "case ledger head public key id mismatch" };
  }
  if (options.trustedPublicKeyId && options.trustedPublicKeyId !== anchor.publicKeyId) {
    return { ok: false, reason: "case ledger head not signed by the trusted key" };
  }
  if (options.trustedKeyIds && !options.trustedKeyIds.includes(anchor.publicKeyId)) {
    return { ok: false, reason: "case ledger head not signed by a trusted key" };
  }
  const publicKey = await globalThis.crypto.subtle.importKey(
    "jwk",
    anchor.publicKeyJwk,
    ledgerKeyAlgorithm,
    true,
    ["verify"],
  );
  const valid = await globalThis.crypto.subtle.verify(
    ledgerSignatureAlgorithm,
    publicKey,
    base64ToBytes(anchor.signature),
    new TextEncoder().encode(
      ledgerHeadSigningPayload({
        caseId: anchor.caseId,
        genesisHash: anchor.genesisHash,
        headHash: anchor.headHash,
        eventCount: anchor.eventCount,
      }),
    ),
  );
  if (!valid) {
    return { ok: false, reason: "case ledger head signature mismatch" };
  }
  return { ok: true, headHash: anchor.headHash, publicKeyId: anchor.publicKeyId };
}
