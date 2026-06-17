import { PBKDF2_DEFAULT_ITERATIONS, assertPbkdf2Iterations } from "./kdf";
import type {
  RawSourceVaultRecordStore,
  SourceVaultBlobRecord,
  SourceVaultStore,
} from "./sourceVault";

export type EncryptedSourceVaultBlobRecord = Omit<SourceVaultBlobRecord, "payload" | "format"> & {
  format: "sourcedeck.encrypted-source-vault-blob.v1";
  encryption: {
    algorithm: "AES-GCM";
    kdf: "PBKDF2-SHA256";
    iterations: number;
    salt: string;
    iv: string;
  };
  ciphertext: string;
};

function bytesToBase64(bytes: Uint8Array) {
  if (typeof btoa !== "function") throw new Error("Base64 encoding requires btoa support.");
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary);
}

function base64ToBytes(value: string) {
  if (typeof atob !== "function") throw new Error("Base64 decoding requires atob support.");
  return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
}

function toArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function deriveVaultKey(passphrase: string, salt: Uint8Array, iterations: number) {
  const trimmed = passphrase.trim();
  if (!trimmed) throw new Error("source vault encryption requires a non-empty passphrase");
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(trimmed),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: toArrayBuffer(salt),
      iterations,
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function encryptionAdditionalData(record: Omit<SourceVaultBlobRecord, "payload">) {
  return new TextEncoder().encode(
    JSON.stringify({
      recordId: record.recordId,
      documentId: record.documentId,
      kind: record.kind,
      mediaType: record.mediaType,
      contentHash: record.contentHash,
      byteLength: record.byteLength,
    }),
  );
}

// Encrypts with an already-derived key (and a unique IV) so a store can derive one PBKDF2 key per
// import and reuse it across records instead of paying a full derivation per blob.
export async function encryptSourceVaultBlobRecordWithKey(
  record: SourceVaultBlobRecord,
  key: CryptoKey,
  salt: Uint8Array,
  iterations: number,
): Promise<EncryptedSourceVaultBlobRecord> {
  assertPbkdf2Iterations(iterations);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const { payload, ...publicRecord } = record;
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: toArrayBuffer(iv),
        additionalData: encryptionAdditionalData(publicRecord),
      },
      key,
      toArrayBuffer(plaintext),
    ),
  );
  return {
    ...publicRecord,
    format: "sourcedeck.encrypted-source-vault-blob.v1",
    encryption: {
      algorithm: "AES-GCM",
      kdf: "PBKDF2-SHA256",
      iterations,
      salt: bytesToBase64(salt),
      iv: bytesToBase64(iv),
    },
    ciphertext: bytesToBase64(ciphertext),
  };
}

export async function encryptSourceVaultBlobRecord(
  record: SourceVaultBlobRecord,
  passphrase: string,
  iterations = PBKDF2_DEFAULT_ITERATIONS,
): Promise<EncryptedSourceVaultBlobRecord> {
  assertPbkdf2Iterations(iterations);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveVaultKey(passphrase, salt, iterations);
  return encryptSourceVaultBlobRecordWithKey(record, key, salt, iterations);
}

export async function decryptSourceVaultBlobRecordWithKey(
  encrypted: EncryptedSourceVaultBlobRecord,
  key: CryptoKey,
): Promise<SourceVaultBlobRecord> {
  if (encrypted.format !== "sourcedeck.encrypted-source-vault-blob.v1") {
    throw new Error("unsupported encrypted source vault blob format");
  }
  if (
    encrypted.encryption.algorithm !== "AES-GCM" ||
    encrypted.encryption.kdf !== "PBKDF2-SHA256"
  ) {
    throw new Error("unsupported encrypted source vault algorithm");
  }
  const iv = base64ToBytes(encrypted.encryption.iv);
  const { encryption, ciphertext, format, ...publicRecord } = encrypted;
  void encryption;
  void format;
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(iv),
      additionalData: encryptionAdditionalData({
        ...publicRecord,
        format: "sourcedeck.source-vault-blob.v1",
      }),
    },
    key,
    toArrayBuffer(base64ToBytes(ciphertext)),
  );
  return {
    ...publicRecord,
    format: "sourcedeck.source-vault-blob.v1",
    payload: JSON.parse(new TextDecoder().decode(plaintext)) as SourceVaultBlobRecord["payload"],
  };
}

export async function decryptSourceVaultBlobRecord(
  encrypted: EncryptedSourceVaultBlobRecord,
  passphrase: string,
): Promise<SourceVaultBlobRecord> {
  if (encrypted.format !== "sourcedeck.encrypted-source-vault-blob.v1") {
    throw new Error("unsupported encrypted source vault blob format");
  }
  assertPbkdf2Iterations(encrypted.encryption.iterations);
  const key = await deriveVaultKey(
    passphrase,
    base64ToBytes(encrypted.encryption.salt),
    encrypted.encryption.iterations,
  );
  return decryptSourceVaultBlobRecordWithKey(encrypted, key);
}

export type StoredSourceVaultRecord = SourceVaultBlobRecord | EncryptedSourceVaultBlobRecord;

export function isEncryptedSourceVaultBlobRecord(
  record: StoredSourceVaultRecord,
): record is EncryptedSourceVaultBlobRecord {
  return record.format === "sourcedeck.encrypted-source-vault-blob.v1";
}

// Wraps a raw record store so source-vault payloads are AES-GCM encrypted (PBKDF2-SHA256 key
// derivation) before they are persisted, and transparently decrypted on read. This is what makes
// original source bytes and rendered page images ciphertext at rest in IndexedDB rather than
// plaintext base64. A legacy plaintext record already in the store is tolerated on read for
// backward compatibility; any subsequent put re-stores it as ciphertext.
export function createEncryptedSourceVaultStore(
  raw: RawSourceVaultRecordStore<StoredSourceVaultRecord>,
  passphrase: string,
  options: { iterations?: number } = {},
): SourceVaultStore {
  const trimmed = passphrase.trim();
  if (!trimmed) {
    throw new Error("encrypted source vault store requires a non-empty passphrase");
  }
  const iterations = assertPbkdf2Iterations(options.iterations ?? PBKDF2_DEFAULT_ITERATIONS);
  // One salt (therefore one PBKDF2 derivation) per store instance; every record gets a unique IV,
  // which keeps AES-GCM safe while turning a per-record derivation into a single one per import.
  const storeSalt = crypto.getRandomValues(new Uint8Array(16));
  const keyCache = new Map<string, Promise<CryptoKey>>();
  const keyFor = (salt: Uint8Array, iters: number) => {
    const cacheKey = `${bytesToBase64(salt)}|${iters}`;
    let derived = keyCache.get(cacheKey);
    if (!derived) {
      derived = deriveVaultKey(trimmed, salt, iters);
      keyCache.set(cacheKey, derived);
    }
    return derived;
  };
  return {
    async put(record) {
      const key = await keyFor(storeSalt, iterations);
      await raw.put(await encryptSourceVaultBlobRecordWithKey(record, key, storeSalt, iterations));
    },
    async get(recordId) {
      const stored = await raw.get(recordId);
      if (!stored) return undefined;
      if (isEncryptedSourceVaultBlobRecord(stored)) {
        const iters = assertPbkdf2Iterations(stored.encryption.iterations);
        const key = await keyFor(base64ToBytes(stored.encryption.salt), iters);
        return decryptSourceVaultBlobRecordWithKey(stored, key);
      }
      return stored;
    },
    delete: raw.delete ? (recordId: string) => raw.delete?.(recordId) ?? Promise.resolve() : undefined,
  };
}
