import { contentAddress } from "./kernel";
import type { ContentAddress } from "./types";

export type SourceVaultBlobKind = "original_file" | "rendered_page_image" | "ocr_candidate";

export type SourceVaultPayload = {
  encoding: "base64";
  data: string;
};

export type SourceVaultBlobRecord = {
  format: "sourcedeck.source-vault-blob.v1";
  recordId: string;
  documentId: string;
  kind: SourceVaultBlobKind;
  mediaType: string;
  contentHash: ContentAddress;
  byteLength: number;
  createdAt: string;
  payload: SourceVaultPayload;
  metadata: Record<string, string | number | boolean | null>;
};

export type SourceVaultPageImageRecord = SourceVaultBlobRecord & {
  kind: "rendered_page_image";
  pageId: string;
  pageIndex: number;
  width: number;
  height: number;
  renderScale: number;
  sourcePageTextHash?: ContentAddress;
};

export type SourceVaultManifest = {
  format: "sourcedeck.source-vault-manifest.v1";
  vaultId: string;
  documentId: string;
  artifactId?: string;
  createdAt: string;
  original: SourceVaultBlobRecord;
  pageImages: SourceVaultPageImageRecord[];
  metadata: Record<string, string | number | boolean | null>;
  manifestHash: ContentAddress;
};

export type SourceVaultVerification =
  | {
      ok: true;
      vaultId: string;
      manifestHash: ContentAddress;
      originalHash: ContentAddress;
      pageImageCount: number;
    }
  | { ok: false; vaultId: string; reason: string };

export type SourceVaultStorageVerification =
  | { ok: true; vaultId: string; recordCount: number }
  | { ok: false; vaultId: string; recordId: string; reason: string };

export type SourceVaultStore = {
  put(record: SourceVaultBlobRecord): Promise<void>;
  get(recordId: string): Promise<SourceVaultBlobRecord | undefined>;
  delete?(recordId: string): Promise<void>;
};

// A storage-agnostic record store keyed by recordId. It can hold plaintext blob records or
// encrypted blob records, which lets an encrypting store wrapper (see sourceVaultEncryption.ts)
// seal payloads at rest without the underlying IndexedDB/memory store knowing the difference.
export type SourceVaultRecordLike = { recordId: string; format: string };

export type RawSourceVaultRecordStore<T extends SourceVaultRecordLike = SourceVaultRecordLike> = {
  put(record: T): Promise<void>;
  get(recordId: string): Promise<T | undefined>;
  delete?(recordId: string): Promise<void>;
};

function bytesToBase64(bytes: Uint8Array) {
  if (typeof btoa === "function") {
    const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
    return btoa(binary);
  }
  throw new Error("Base64 encoding requires btoa support.");
}

function base64ToBytes(value: string) {
  if (typeof atob === "function") {
    return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  }
  throw new Error("Base64 decoding requires atob support.");
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

function manifestHashPayload(manifest: Omit<SourceVaultManifest, "manifestHash">) {
  return {
    format: manifest.format,
    vaultId: manifest.vaultId,
    documentId: manifest.documentId,
    artifactId: manifest.artifactId,
    createdAt: manifest.createdAt,
    original: manifest.original,
    pageImages: manifest.pageImages,
    metadata: manifest.metadata,
  };
}

export function sourceVaultPayloadBytes(payload: SourceVaultPayload) {
  return base64ToBytes(payload.data);
}

export async function createSourceVaultBlobRecord(input: {
  documentId: string;
  kind: SourceVaultBlobKind;
  mediaType: string;
  bytes: Uint8Array;
  createdAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<SourceVaultBlobRecord> {
  const contentHash = await contentAddress(input.bytes);
  return {
    format: "sourcedeck.source-vault-blob.v1",
    recordId: `source-vault:${input.kind}:${contentHash}`,
    documentId: input.documentId,
    kind: input.kind,
    mediaType: input.mediaType,
    contentHash,
    byteLength: input.bytes.byteLength,
    createdAt: input.createdAt ?? new Date().toISOString(),
    payload: { encoding: "base64", data: bytesToBase64(input.bytes) },
    metadata: input.metadata ?? {},
  };
}

export async function createSourceVaultPageImageRecord(input: {
  documentId: string;
  pageId: string;
  pageIndex: number;
  mediaType: string;
  bytes: Uint8Array;
  width: number;
  height: number;
  renderScale: number;
  sourcePageTextHash?: ContentAddress;
  createdAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<SourceVaultPageImageRecord> {
  const record = await createSourceVaultBlobRecord({
    documentId: input.documentId,
    kind: "rendered_page_image",
    mediaType: input.mediaType,
    bytes: input.bytes,
    createdAt: input.createdAt,
    metadata: input.metadata,
  });
  return {
    ...record,
    kind: "rendered_page_image",
    recordId: `source-vault:rendered_page_image:${input.documentId}:page:${input.pageIndex}:${record.contentHash}`,
    pageId: input.pageId,
    pageIndex: input.pageIndex,
    width: input.width,
    height: input.height,
    renderScale: input.renderScale,
    sourcePageTextHash: input.sourcePageTextHash,
  };
}

async function verifySourceVaultBlobRecord(record: SourceVaultBlobRecord) {
  if (record.format !== "sourcedeck.source-vault-blob.v1") {
    return "unsupported source vault blob format";
  }
  if (!record.recordId) return "source vault blob missing record id";
  if (!record.documentId) return "source vault blob missing document id";
  if (!record.mediaType) return "source vault blob missing media type";
  const bytes = sourceVaultPayloadBytes(record.payload);
  if (bytes.byteLength !== record.byteLength) return "source vault blob byte length mismatch";
  if ((await contentAddress(bytes)) !== record.contentHash) {
    return "source vault blob content hash mismatch";
  }
  if (
    record.kind !== "rendered_page_image" &&
    record.recordId !== `source-vault:${record.kind}:${record.contentHash}`
  ) {
    return "source vault blob record id mismatch";
  }
  return "";
}

function verifyPageImageRecord(record: SourceVaultPageImageRecord) {
  if (record.kind !== "rendered_page_image") return "page image record has wrong kind";
  if (
    record.recordId !==
    `source-vault:rendered_page_image:${record.documentId}:page:${record.pageIndex}:${record.contentHash}`
  ) {
    return "page image record id mismatch";
  }
  if (!record.pageId) return "page image record missing page id";
  if (!Number.isInteger(record.pageIndex) || record.pageIndex < 1) {
    return "page image record invalid page index";
  }
  if (!Number.isFinite(record.width) || !Number.isFinite(record.height) || record.width <= 0 || record.height <= 0) {
    return "page image dimensions invalid";
  }
  if (!Number.isFinite(record.renderScale) || record.renderScale <= 0) {
    return "page image render scale invalid";
  }
  return "";
}

export async function createSourceVaultManifest(input: {
  vaultId?: string;
  documentId: string;
  artifactId?: string;
  original: SourceVaultBlobRecord;
  pageImages?: SourceVaultPageImageRecord[];
  createdAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}): Promise<SourceVaultManifest> {
  const withoutHash = {
    format: "sourcedeck.source-vault-manifest.v1" as const,
    vaultId: input.vaultId ?? `source-vault:${input.documentId}`,
    documentId: input.documentId,
    artifactId: input.artifactId,
    createdAt: input.createdAt ?? new Date().toISOString(),
    original: input.original,
    pageImages: input.pageImages ?? [],
    metadata: input.metadata ?? {},
  };
  return {
    ...withoutHash,
    manifestHash: await contentAddress(canonicalJson(manifestHashPayload(withoutHash))),
  };
}

export async function verifySourceVaultManifest(
  manifest: SourceVaultManifest,
): Promise<SourceVaultVerification> {
  const vaultId = manifest.vaultId || "unknown";
  if (manifest.format !== "sourcedeck.source-vault-manifest.v1") {
    return { ok: false, vaultId, reason: "unsupported source vault manifest format" };
  }
  if (manifest.documentId !== manifest.original.documentId) {
    return { ok: false, vaultId, reason: "source vault original document mismatch" };
  }
  if (manifest.original.kind !== "original_file") {
    return { ok: false, vaultId, reason: "source vault original record has wrong kind" };
  }
  const originalFailure = await verifySourceVaultBlobRecord(manifest.original);
  if (originalFailure) return { ok: false, vaultId, reason: originalFailure };

  const seenRecordIds = new Set<string>([manifest.original.recordId]);
  const seenPageIds = new Set<string>();
  const seenPageIndexes = new Set<number>();
  for (const pageImage of manifest.pageImages) {
    if (pageImage.documentId !== manifest.documentId) {
      return { ok: false, vaultId, reason: "page image document mismatch" };
    }
    if (seenRecordIds.has(pageImage.recordId)) {
      return { ok: false, vaultId, reason: "duplicate source vault record id" };
    }
    seenRecordIds.add(pageImage.recordId);
    const pageFailure = await verifySourceVaultBlobRecord(pageImage);
    if (pageFailure) return { ok: false, vaultId, reason: pageFailure };
    const pageImageFailure = verifyPageImageRecord(pageImage);
    if (pageImageFailure) return { ok: false, vaultId, reason: pageImageFailure };
    if (seenPageIds.has(pageImage.pageId)) {
      return { ok: false, vaultId, reason: "duplicate rendered page image id" };
    }
    seenPageIds.add(pageImage.pageId);
    if (seenPageIndexes.has(pageImage.pageIndex)) {
      return { ok: false, vaultId, reason: "duplicate rendered page image index" };
    }
    seenPageIndexes.add(pageImage.pageIndex);
  }

  const expectedManifestHash = await contentAddress(
    canonicalJson(
      manifestHashPayload({
        format: manifest.format,
        vaultId: manifest.vaultId,
        documentId: manifest.documentId,
        artifactId: manifest.artifactId,
        createdAt: manifest.createdAt,
        original: manifest.original,
        pageImages: manifest.pageImages,
        metadata: manifest.metadata,
      }),
    ),
  );
  if (expectedManifestHash !== manifest.manifestHash) {
    return { ok: false, vaultId, reason: "source vault manifest hash mismatch" };
  }
  return {
    ok: true,
    vaultId,
    manifestHash: manifest.manifestHash,
    originalHash: manifest.original.contentHash,
    pageImageCount: manifest.pageImages.length,
  };
}

export function createMemorySourceVaultStore(initialRecords: SourceVaultBlobRecord[] = []): SourceVaultStore {
  const records = new Map<string, SourceVaultBlobRecord>();
  initialRecords.forEach((record) => records.set(record.recordId, structuredClone(record)));
  return {
    async put(record) {
      records.set(record.recordId, structuredClone(record));
    },
    async get(recordId) {
      const record = records.get(recordId);
      return record ? structuredClone(record) : undefined;
    },
    async delete(recordId) {
      records.delete(recordId);
    },
  };
}

export async function putSourceVaultManifest(
  store: SourceVaultStore,
  manifest: SourceVaultManifest,
) {
  await store.put(manifest.original);
  for (const pageImage of manifest.pageImages) {
    await store.put(pageImage);
  }
}

export async function verifySourceVaultManifestStorage(
  store: SourceVaultStore,
  manifest: SourceVaultManifest,
): Promise<SourceVaultStorageVerification> {
  const manifestVerification = await verifySourceVaultManifest(manifest);
  if (!manifestVerification.ok) {
    return {
      ok: false,
      vaultId: manifest.vaultId,
      recordId: manifest.vaultId,
      reason: manifestVerification.reason,
    };
  }
  const expectedRecords = [manifest.original, ...manifest.pageImages];
  for (const expectedRecord of expectedRecords) {
    const storedRecord = await store.get(expectedRecord.recordId);
    if (!storedRecord) {
      return {
        ok: false,
        vaultId: manifest.vaultId,
        recordId: expectedRecord.recordId,
        reason: "source vault record missing from store",
      };
    }
    if (storedRecord.contentHash !== expectedRecord.contentHash) {
      return {
        ok: false,
        vaultId: manifest.vaultId,
        recordId: expectedRecord.recordId,
        reason: "source vault stored record hash mismatch",
      };
    }
    const storedFailure = await verifySourceVaultBlobRecord(storedRecord);
    if (storedFailure) {
      return {
        ok: false,
        vaultId: manifest.vaultId,
        recordId: expectedRecord.recordId,
        reason: storedFailure,
      };
    }
    if (canonicalJson(storedRecord) !== canonicalJson(expectedRecord)) {
      return {
        ok: false,
        vaultId: manifest.vaultId,
        recordId: expectedRecord.recordId,
        reason: "source vault stored record metadata mismatch",
      };
    }
  }
  return { ok: true, vaultId: manifest.vaultId, recordCount: expectedRecords.length };
}

export function createIndexedDbSourceVaultRecordStore<
  T extends SourceVaultRecordLike = SourceVaultRecordLike,
>(input: { databaseName?: string; storeName?: string } = {}): RawSourceVaultRecordStore<T> {
  const databaseName = input.databaseName ?? "sourcedeck-source-vault";
  const storeName = input.storeName ?? "source-vault-blobs";

  async function openDatabase(): Promise<IDBDatabase> {
    if (typeof indexedDB === "undefined") {
      throw new Error("IndexedDB source vault requires browser IndexedDB support.");
    }
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(databaseName, 1);
      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(storeName)) {
          database.createObjectStore(storeName, { keyPath: "recordId" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB source vault open failed"));
    });
  }

  async function transaction<R>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<R>) {
    const database = await openDatabase();
    return new Promise<R>((resolve, reject) => {
      const tx = database.transaction(storeName, mode);
      const store = tx.objectStore(storeName);
      const request = run(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB source vault request failed"));
      tx.oncomplete = () => database.close();
      tx.onerror = () => {
        database.close();
        reject(tx.error ?? new Error("IndexedDB source vault transaction failed"));
      };
    });
  }

  return {
    async put(record) {
      await transaction("readwrite", (store) => store.put(record));
    },
    async get(recordId) {
      return transaction<T | undefined>("readonly", (store) => store.get(recordId));
    },
    async delete(recordId) {
      await transaction("readwrite", (store) => store.delete(recordId));
    },
  };
}

// Backward-compatible blob-record view of the generic IndexedDB store. Prefer wrapping
// createIndexedDbSourceVaultRecordStore with createEncryptedSourceVaultStore for at-rest custody.
export function createIndexedDbSourceVaultStore(
  input: { databaseName?: string; storeName?: string } = {},
): SourceVaultStore {
  return createIndexedDbSourceVaultRecordStore<SourceVaultBlobRecord>(input);
}
