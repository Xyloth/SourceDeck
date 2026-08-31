import type { SourceVaultManifest } from "./sourceVault";
import type { ContentAddressedCaseStore } from "./caseStore";
import {
  SOURCE_VAULT_REDACTED_PAYLOAD_REASON,
  redactSourceVaultManifestPayloads,
  sourceVaultManifestHasPayloads,
} from "./sourceVaultPrivacy";

export const PLAINTEXT_SOURCE_TEXT_NOT_PERSISTED_REASON =
  "Extracted document text is session-only and is not persisted in browser localStorage. Re-import the source or restore an encrypted workspace after reload.";

export const CASE_STORE_PAYLOAD_NOT_PERSISTED_REASON =
  "Case-artifact payloads are redacted from browser localStorage; restore an encrypted workspace or re-import source material to verify payload-bearing artifacts.";

type LocalWorkspaceDocument = {
  extractedText?: string;
  pageTexts?: unknown[];
  sourceArtifact?: unknown;
  sourceArtifactVerified?: boolean;
  sourceArtifactFailure?: string;
  sourceVaultManifest?: SourceVaultManifest;
  sourceVaultVerified?: boolean;
  sourceVaultFailure?: string;
  warning?: string;
};

function appendNotice(existing: string | undefined, notice: string) {
  if (existing?.includes(notice)) return existing;
  return [existing?.trim(), notice].filter(Boolean).join(" ");
}

/**
 * Produces the only shape that may enter browser localStorage.
 *
 * Imported source text and the durable text artifact both contain verbatim record content. They
 * stay available in the active in-memory session, and they are included only when the user
 * explicitly creates an encrypted workspace export. Original bytes/page images remain governed by
 * the encrypted IndexedDB vault; only their custody metadata may be serialized here.
 */
export function sanitizeWorkspaceDocumentForLocalStorage<T extends LocalWorkspaceDocument>(
  document: T,
): T & LocalWorkspaceDocument {
  const containsPlaintextSource = Boolean(
    document.extractedText || document.pageTexts?.length || document.sourceArtifact,
  );
  const containsVaultPayloads = Boolean(
    document.sourceVaultManifest &&
      sourceVaultManifestHasPayloads(document.sourceVaultManifest),
  );

  if (!containsPlaintextSource && !containsVaultPayloads) return document;

  return {
    ...document,
    ...(containsPlaintextSource
      ? {
          extractedText: undefined,
          pageTexts: undefined,
          sourceArtifact: undefined,
          sourceArtifactVerified: false,
          sourceArtifactFailure: PLAINTEXT_SOURCE_TEXT_NOT_PERSISTED_REASON,
          warning: appendNotice(
            document.warning,
            PLAINTEXT_SOURCE_TEXT_NOT_PERSISTED_REASON,
          ),
        }
      : {}),
    ...(containsVaultPayloads && document.sourceVaultManifest
      ? {
          sourceVaultManifest: redactSourceVaultManifestPayloads(
            document.sourceVaultManifest,
          ),
          sourceVaultVerified: false,
          sourceVaultFailure:
            document.sourceVaultFailure ?? SOURCE_VAULT_REDACTED_PAYLOAD_REASON,
        }
      : {}),
  };
}

export function sanitizeWorkspaceDocumentsForLocalStorage<T extends LocalWorkspaceDocument>(
  documents: T[],
) {
  return documents.map(sanitizeWorkspaceDocumentForLocalStorage);
}

export function sanitizeCaseStoreForLocalStorage(
  store: ContentAddressedCaseStore | null,
): ContentAddressedCaseStore | null {
  if (!store) return store;
  const artifacts = Object.fromEntries(
    Object.entries(store.artifacts).map(([id, artifact]) => [
      id,
      artifact.payload.data
        ? {
            ...artifact,
            payload: { ...artifact.payload, data: "" },
            metadata: {
              ...artifact.metadata,
              localStoragePayloadRedacted: true,
              localStoragePayloadRedactionReason: CASE_STORE_PAYLOAD_NOT_PERSISTED_REASON,
            },
          }
        : artifact,
    ]),
  );
  return { ...store, artifacts };
}
