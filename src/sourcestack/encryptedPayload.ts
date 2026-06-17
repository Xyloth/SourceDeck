import { PBKDF2_DEFAULT_ITERATIONS, assertPbkdf2Iterations } from "./kdf";

export type EncryptedJsonPayloadBase<TFormat extends string> = {
  format: TFormat;
  kdf: "PBKDF2-SHA256";
  iterations: number;
  salt: string;
  iv: string;
  ciphertext: string;
  createdAt: string;
};

export const DEFAULT_ENCRYPTED_PAYLOAD_ITERATIONS = PBKDF2_DEFAULT_ITERATIONS;

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

function toArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

async function deriveEncryptedPayloadKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number,
) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(passphrase),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptJsonPayload<TFormat extends string>(
  format: TFormat,
  passphrase: string,
  value: unknown,
  iterations = DEFAULT_ENCRYPTED_PAYLOAD_ITERATIONS,
): Promise<EncryptedJsonPayloadBase<TFormat>> {
  if (!passphrase.trim()) {
    throw new Error("encrypted payload requires a non-empty passphrase");
  }
  assertPbkdf2Iterations(iterations);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveEncryptedPayloadKey(passphrase, salt, iterations);
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(plaintext),
    ),
  );
  return {
    format,
    kdf: "PBKDF2-SHA256",
    iterations,
    salt: bytesToBase64(salt),
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ciphertext),
    createdAt: new Date().toISOString(),
  };
}

export async function decryptJsonPayload<T>(
  payload: EncryptedJsonPayloadBase<string>,
  passphrase: string,
  options: { expectedFormat?: string } = {},
): Promise<T> {
  if (options.expectedFormat && payload.format !== options.expectedFormat) {
    throw new Error(`unexpected encrypted payload format: ${payload.format}`);
  }
  if (payload.kdf !== "PBKDF2-SHA256") throw new Error("unsupported encrypted payload KDF");
  if (!Number.isFinite(payload.iterations) || payload.iterations <= 0) {
    throw new Error("invalid encrypted payload iterations");
  }
  assertPbkdf2Iterations(payload.iterations);
  const salt = base64ToBytes(payload.salt);
  const iv = base64ToBytes(payload.iv);
  const ciphertext = base64ToBytes(payload.ciphertext);
  const key = await deriveEncryptedPayloadKey(passphrase, salt, payload.iterations);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
