import { contentAddress } from "./kernel";
import type { ContentAddress, PacketManifest } from "./types";

const keyAlgorithm: EcKeyGenParams = { name: "ECDSA", namedCurve: "P-256" };
const signatureAlgorithm: EcdsaParams = { name: "ECDSA", hash: "SHA-256" };

export type StoredPacketSigningKey = {
  format: "sourcedeck.packet-signing-key.v1";
  algorithm: "ECDSA-P256-SHA256";
  keyId: string;
  publicKeyJwk: JsonWebKey;
  privateKeyJwk: JsonWebKey;
  createdAt: string;
};

export type PacketSignatureVerification =
  | { ok: true; publicKeyId: string }
  | { ok: false; reason: string };

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

function signingPayload(manifest: PacketManifest, keyCustodyHash?: ContentAddress) {
  return canonicalJson({
    format: manifest.format,
    packetId: manifest.packetId,
    packetType: manifest.packetType,
    packetHash: manifest.packetHash,
    manifestHash: manifest.manifestHash,
    keyCustodyHash: keyCustodyHash ?? null,
  });
}

export async function packetSigningKeyId(publicKeyJwk: JsonWebKey) {
  return contentAddress(
    canonicalJson({
      algorithm: "ECDSA-P256-SHA256",
      crv: publicKeyJwk.crv,
      ext: publicKeyJwk.ext,
      kty: publicKeyJwk.kty,
      x: publicKeyJwk.x,
      y: publicKeyJwk.y,
    }),
  );
}

async function importPrivateKey(jwk: JsonWebKey) {
  return globalThis.crypto.subtle.importKey("jwk", jwk, keyAlgorithm, true, ["sign"]);
}

async function importPublicKey(jwk: JsonWebKey) {
  return globalThis.crypto.subtle.importKey("jwk", jwk, keyAlgorithm, true, ["verify"]);
}

export async function createStoredPacketSigningKey(): Promise<StoredPacketSigningKey> {
  const keyPair = (await globalThis.crypto.subtle.generateKey(keyAlgorithm, true, [
    "sign",
    "verify",
  ])) as CryptoKeyPair;
  const publicKeyJwk = await globalThis.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateKeyJwk = await globalThis.crypto.subtle.exportKey("jwk", keyPair.privateKey);
  return {
    format: "sourcedeck.packet-signing-key.v1",
    algorithm: "ECDSA-P256-SHA256",
    keyId: await packetSigningKeyId(publicKeyJwk),
    publicKeyJwk,
    privateKeyJwk,
    createdAt: new Date().toISOString(),
  };
}

export async function signPacketManifestWithStoredKey(
  manifest: PacketManifest,
  storedKey: StoredPacketSigningKey,
  options: { keyCustodyHash?: ContentAddress; keyCustodyFormat?: string } = {},
): Promise<PacketManifest> {
  const privateKey = await importPrivateKey(storedKey.privateKeyJwk);
  const payload = new TextEncoder().encode(signingPayload(manifest, options.keyCustodyHash));
  const signatureBytes = new Uint8Array(
    await globalThis.crypto.subtle.sign(signatureAlgorithm, privateKey, payload),
  );
  return {
    ...manifest,
    cryptographicSignature: {
      algorithm: "ECDSA-P256-SHA256",
      publicKeyId: storedKey.keyId,
      publicKeyJwk: storedKey.publicKeyJwk,
      keyCustodyHash: options.keyCustodyHash,
      keyCustodyFormat: options.keyCustodyFormat,
      signature: bytesToBase64(signatureBytes),
      signedAt: new Date().toISOString(),
    },
  };
}

export async function verifyPacketManifestSignature(
  manifest: PacketManifest,
): Promise<PacketSignatureVerification> {
  const signature = manifest.cryptographicSignature;
  if (!signature) return { ok: false, reason: "manifest has no cryptographic signature" };
  if (signature.algorithm !== "ECDSA-P256-SHA256") {
    return { ok: false, reason: "unsupported packet manifest signature algorithm" };
  }
  if (Number.isNaN(Date.parse(signature.signedAt))) {
    return { ok: false, reason: "packet manifest signature timestamp invalid" };
  }
  try {
    const expectedKeyId = await packetSigningKeyId(signature.publicKeyJwk);
    if (expectedKeyId !== signature.publicKeyId) {
      return { ok: false, reason: "packet manifest public key id mismatch" };
    }
    const publicKey = await importPublicKey(signature.publicKeyJwk);
    const ok = await globalThis.crypto.subtle.verify(
      signatureAlgorithm,
      publicKey,
      base64ToBytes(signature.signature),
      new TextEncoder().encode(signingPayload(manifest, signature.keyCustodyHash)),
    );
    return ok
      ? { ok: true, publicKeyId: signature.publicKeyId }
      : { ok: false, reason: "packet manifest signature mismatch" };
  } catch {
    return { ok: false, reason: "packet manifest signature verification failed" };
  }
}
