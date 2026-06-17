import { verifyPacketManifestSignature } from "./manifestSigning";
import type { ContentAddress, PacketManifest } from "./types";

// A signer the case owner has chosen to trust. `keyId` is the SHA-256 of the canonical public JWK
// (the same stable identity used by manifest/ledger signatures), so trust is keyed to the actual
// key material, not a self-asserted name.
export type TrustedSigner = {
  keyId: ContentAddress;
  label: string;
  role?: string;
  fingerprint: string;
  publicKeyJwk?: JsonWebKey;
  addedAt: string;
};

export type TrustedKeyRegistry = {
  format: "sourcedeck.trusted-key-registry.v1";
  signers: TrustedSigner[];
};

export type RegistrySignatureVerification =
  | {
      ok: true;
      keyId: ContentAddress;
      fingerprint: string;
      trusted: boolean;
      signer?: TrustedSigner;
    }
  | {
      ok: false;
      reason: string;
      keyId?: ContentAddress;
      fingerprint?: string;
      trusted?: boolean;
    };

// A stable, human-comparable fingerprint of a signer's public-key id. Grouped uppercase hex so a
// signer and recipient can read it aloud / compare it out-of-band before trusting. The full digest
// is used - no truncation - so it cannot be collided by a forger generating a look-alike key.
export function keyFingerprint(keyId: string): string {
  const hex = keyId.startsWith("sha256:") ? keyId.slice("sha256:".length) : keyId;
  const groups = hex.toUpperCase().match(/.{1,4}/g);
  return groups ? groups.join(" ") : hex.toUpperCase();
}

export function createTrustedKeyRegistry(signers: TrustedSigner[] = []): TrustedKeyRegistry {
  return { format: "sourcedeck.trusted-key-registry.v1", signers };
}

export function makeTrustedSigner(input: {
  keyId: ContentAddress;
  label: string;
  role?: string;
  publicKeyJwk?: JsonWebKey;
  addedAt: string;
}): TrustedSigner {
  return {
    keyId: input.keyId,
    label: input.label,
    role: input.role,
    fingerprint: keyFingerprint(input.keyId),
    publicKeyJwk: input.publicKeyJwk,
    addedAt: input.addedAt,
  };
}

export function isTrustedKeyId(registry: TrustedKeyRegistry, keyId: string): boolean {
  return registry.signers.some((signer) => signer.keyId === keyId);
}

export function findTrustedSigner(
  registry: TrustedKeyRegistry,
  keyId: string,
): TrustedSigner | undefined {
  return registry.signers.find((signer) => signer.keyId === keyId);
}

export function addTrustedSigner(
  registry: TrustedKeyRegistry,
  signer: TrustedSigner,
): TrustedKeyRegistry {
  if (isTrustedKeyId(registry, signer.keyId)) return registry;
  return { ...registry, signers: [...registry.signers, signer] };
}

export function removeTrustedSigner(
  registry: TrustedKeyRegistry,
  keyId: string,
): TrustedKeyRegistry {
  return { ...registry, signers: registry.signers.filter((signer) => signer.keyId !== keyId) };
}

// Verifies a packet manifest's cryptographic signature AND reports whether the signer is in the
// trust registry. `ok` reflects signature validity; `trusted` is a separate flag so a UI can show
// "verified, unknown signer" and offer to trust it. With `requireTrusted`, a valid-but-untrusted
// signature fails closed - the recipient-side pin that makes "independently verify the signer" real
// rather than "valid signature by whatever key the document carries".
export async function verifyPacketManifestAgainstRegistry(
  manifest: PacketManifest,
  registry: TrustedKeyRegistry,
  options: { requireTrusted?: boolean } = {},
): Promise<RegistrySignatureVerification> {
  const signature = await verifyPacketManifestSignature(manifest);
  if (!signature.ok) return { ok: false, reason: signature.reason };
  const keyId = signature.publicKeyId;
  const fingerprint = keyFingerprint(keyId);
  const signer = findTrustedSigner(registry, keyId);
  const trusted = Boolean(signer);
  if (options.requireTrusted && !trusted) {
    return {
      ok: false,
      reason: "signature is valid but the signer is not in the trust registry",
      keyId,
      fingerprint,
      trusted: false,
    };
  }
  return { ok: true, keyId, fingerprint, trusted, signer };
}
