import { contentAddress } from "./kernel";
import { PBKDF2_DEFAULT_ITERATIONS, assertPbkdf2Iterations } from "./kdf";
import { packetSigningKeyId, type StoredPacketSigningKey } from "./manifestSigning";

const encryptedKeyFormat = "sourcedeck.encrypted-packet-signing-key.v1";

export type EncryptedPacketSigningKey = {
  format: typeof encryptedKeyFormat;
  wrappedFormat: StoredPacketSigningKey["format"];
  kdf: "PBKDF2-SHA256";
  cipher: "AES-GCM";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  publicKeyId: string;
  publicKeyJwk: JsonWebKey;
  createdAt: string;
  wrappedAt: string;
};

export type KeyCustodyVerification =
  | { ok: true; publicKeyId: string; custodyHash: string }
  | { ok: false; reason: string };

function arrayBufferFrom(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
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

function requirePassphrase(passphrase: string) {
  if (!passphrase.trim()) {
    throw new Error("packet signing key custody requires a non-empty passphrase");
  }
}

async function deriveWrappingKey(passphrase: string, salt: Uint8Array, iterations: number) {
  requirePassphrase(passphrase);
  const material = await globalThis.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return globalThis.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: arrayBufferFrom(salt),
      iterations,
      hash: "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function assertStoredSigningKey(value: StoredPacketSigningKey) {
  if (
    value.format !== "sourcedeck.packet-signing-key.v1" ||
    value.algorithm !== "ECDSA-P256-SHA256" ||
    !value.keyId ||
    !value.publicKeyJwk ||
    !value.privateKeyJwk
  ) {
    throw new Error("invalid packet signing key payload");
  }
}

function encryptedCustodyHashPayload(payload: EncryptedPacketSigningKey) {
  return {
    format: payload.format,
    wrappedFormat: payload.wrappedFormat,
    kdf: payload.kdf,
    cipher: payload.cipher,
    iterations: payload.iterations,
    salt: payload.salt,
    iv: payload.iv,
    ciphertext: payload.ciphertext,
    publicKeyId: payload.publicKeyId,
    publicKeyJwk: payload.publicKeyJwk,
    createdAt: payload.createdAt,
    wrappedAt: payload.wrappedAt,
  };
}

export function isEncryptedPacketSigningKey(value: unknown): value is EncryptedPacketSigningKey {
  const candidate = value as Partial<EncryptedPacketSigningKey>;
  return (
    candidate?.format === encryptedKeyFormat &&
    candidate.kdf === "PBKDF2-SHA256" &&
    candidate.cipher === "AES-GCM" &&
    typeof candidate.salt === "string" &&
    typeof candidate.iv === "string" &&
    typeof candidate.ciphertext === "string" &&
    typeof candidate.publicKeyId === "string"
  );
}

export async function wrapPacketSigningKey(
  storedKey: StoredPacketSigningKey,
  passphrase: string,
  options: { iterations?: number; now?: string } = {},
): Promise<EncryptedPacketSigningKey> {
  assertStoredSigningKey(storedKey);
  const iterations = assertPbkdf2Iterations(options.iterations ?? PBKDF2_DEFAULT_ITERATIONS);
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const iv = globalThis.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveWrappingKey(passphrase, salt, iterations);
  const plaintext = new TextEncoder().encode(JSON.stringify(storedKey));
  const ciphertext = new Uint8Array(
    await globalThis.crypto.subtle.encrypt(
      { name: "AES-GCM", iv: arrayBufferFrom(iv) },
      key,
      arrayBufferFrom(plaintext),
    ),
  );
  return {
    format: encryptedKeyFormat,
    wrappedFormat: storedKey.format,
    kdf: "PBKDF2-SHA256",
    cipher: "AES-GCM",
    iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext),
    publicKeyId: storedKey.keyId,
    publicKeyJwk: storedKey.publicKeyJwk,
    createdAt: storedKey.createdAt,
    wrappedAt: options.now ?? new Date().toISOString(),
  };
}

export async function unwrapPacketSigningKey(
  payload: EncryptedPacketSigningKey,
  passphrase: string,
): Promise<StoredPacketSigningKey> {
  if (!isEncryptedPacketSigningKey(payload)) {
    throw new Error("unsupported encrypted packet signing key format");
  }
  assertPbkdf2Iterations(payload.iterations);
  const key = await deriveWrappingKey(
    passphrase,
    base64ToBytes(payload.salt),
    payload.iterations,
  );
  const plaintext = await globalThis.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: arrayBufferFrom(base64ToBytes(payload.iv)) },
    key,
    arrayBufferFrom(base64ToBytes(payload.ciphertext)),
  );
  const storedKey = JSON.parse(new TextDecoder().decode(plaintext)) as StoredPacketSigningKey;
  assertStoredSigningKey(storedKey);
  if (storedKey.keyId !== payload.publicKeyId) {
    throw new Error("encrypted packet signing key public key mismatch");
  }
  return storedKey;
}

export async function verifyEncryptedPacketSigningKey(
  payload: EncryptedPacketSigningKey,
  options: { passphrase?: string } = {},
): Promise<KeyCustodyVerification> {
  if (!isEncryptedPacketSigningKey(payload)) {
    return { ok: false, reason: "unsupported encrypted packet signing key format" };
  }
  if ((await packetSigningKeyId(payload.publicKeyJwk)) !== payload.publicKeyId) {
    return { ok: false, reason: "encrypted packet signing key public key id mismatch" };
  }
  // When a passphrase is supplied, prove the key is actually RECOVERABLE (not merely a well-formed
  // envelope) by unwrapping it and confirming the unwrapped key id matches. Without this, "verified
  // custody" only meant the public metadata was self-consistent.
  if (options.passphrase) {
    try {
      const unwrapped = await unwrapPacketSigningKey(payload, options.passphrase);
      if (unwrapped.keyId !== payload.publicKeyId) {
        return { ok: false, reason: "unwrapped signing key id does not match envelope" };
      }
    } catch {
      return {
        ok: false,
        reason: "encrypted packet signing key could not be decrypted with the provided passphrase",
      };
    }
  }
  return {
    ok: true,
    publicKeyId: payload.publicKeyId,
    custodyHash: await contentAddress(JSON.stringify(encryptedCustodyHashPayload(payload))),
  };
}
