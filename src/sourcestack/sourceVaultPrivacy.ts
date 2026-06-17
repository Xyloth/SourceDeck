import type { SourceVaultBlobRecord, SourceVaultManifest } from "./sourceVault";

export const SOURCE_VAULT_REDACTED_PAYLOAD_REASON =
  "source-vault payloads are redacted from browser localStorage; unlock encrypted vault custody or re-import source media before exporting payload-bearing bundles";

function sourceVaultRecordHasPayload(record: SourceVaultBlobRecord) {
  return record.payload.encoding === "base64" && record.payload.data.trim().length > 0;
}

export function sourceVaultManifestHasPayloads(manifest: SourceVaultManifest) {
  return [manifest.original, ...manifest.pageImages].every(sourceVaultRecordHasPayload);
}

function redactSourceVaultRecordPayload<T extends SourceVaultBlobRecord>(record: T): T {
  return {
    ...record,
    payload: {
      encoding: "base64",
      data: "",
    },
  };
}

// Source-vault manifests carry original source bytes and rendered page images. The app may keep
// a payload-bearing manifest in memory during an active import session, but browser localStorage
// should only retain custody hashes/record ids. Verification will correctly fail on this redacted
// shape, preventing a stripped manifest from being exported as a payload-bearing forensic vault.
export function redactSourceVaultManifestPayloads(
  manifest: SourceVaultManifest,
): SourceVaultManifest {
  return {
    ...manifest,
    original: redactSourceVaultRecordPayload(manifest.original),
    pageImages: manifest.pageImages.map(redactSourceVaultRecordPayload),
  };
}
