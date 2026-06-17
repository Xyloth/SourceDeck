import { detectBitemporalContradictions } from "./bitemporal";
import {
  signCaseLedgerHead,
  verifyCaseArtifacts,
  verifyCaseEventLog,
  verifySignedCaseLedger,
  type ArtifactVerificationResult,
  type CaseLedgerHeadAnchor,
  type ContentAddressedCaseStore,
  type EventVerificationResult,
} from "./caseStore";
import {
  verifyPacketManifestSignature,
  type PacketSignatureVerification,
  type StoredPacketSigningKey,
} from "./manifestSigning";
import { diagnoseEvidenceSet } from "./diagnostics";
import { contentAddress, findDuplicateDocuments, graphInvariantFailures } from "./kernel";
import {
  assembleEvidencePacket,
  packetHardWallFailures,
  verifyPacketManifest,
  type PacketManifestVerification,
} from "./packet";
import { verifySourceArtifact, type DurableSourceArtifact, type SourceArtifactVerification } from "./sourceArtifacts";
import {
  verifySourceVaultManifest,
  type SourceVaultManifest,
  type SourceVaultVerification,
} from "./sourceVault";
import type { GateFailure, SourceGraph } from "./types";
import type { PacketManifest } from "./types";
import { buildSignoffReviewQueue, type SignoffAudit } from "./workbench";

export type SourceStackForensicBundle = {
  format: "sourcedeck.sourcestack-bundle.v1";
  generatedAt: string;
  caseName?: string;
  graph: SourceGraph;
  counts: {
    documents: number;
    pages: number;
    spans: number;
    evidenceCards: number;
    events: number;
    sourceArtifacts: number;
    sourceVaults: number;
    sourceVaultPageImages: number;
    trustEvents: number;
    caseArtifacts: number;
    evidenceSignoffs: number;
    staleEvidenceSignoffs: number;
    contradictions: number;
    graphInvariantFailures: number;
    packetHardWallFailures: number;
    packetManifests: number;
  };
  sourceArtifacts: DurableSourceArtifact[];
  sourceVaultManifests: SourceVaultManifest[];
  packetManifests: PacketManifest[];
  caseStore?: ContentAddressedCaseStore;
  sourceArtifactVerifications: SourceArtifactVerification[];
  sourceVaultVerifications: SourceVaultVerification[];
  packetManifestVerifications: PacketManifestVerification[];
  packetManifestSignatureVerifications: PacketSignatureVerification[];
  caseStoreVerification?: EventVerificationResult;
  caseArtifactVerification?: ArtifactVerificationResult;
  caseLedgerAnchor?: CaseLedgerHeadAnchor;
  signoffProvenance: SignoffAudit;
  diagnostics: ReturnType<typeof diagnoseEvidenceSet>;
  graphInvariantFailures: GateFailure[];
  packetHardWallFailures: GateFailure[];
  duplicateDocuments: ReturnType<typeof findDuplicateDocuments>;
  bitemporalContradictions: ReturnType<typeof detectBitemporalContradictions>;
  graphHash: string;
  bundleHash: string;
};

export type SourceStackBundleVerification =
  | { ok: true; graphHash: string; bundleHash: string }
  | { ok: false; failures: string[] };

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

function bundleHashPayload(bundle: Omit<SourceStackForensicBundle, "bundleHash">) {
  return {
    format: bundle.format,
    generatedAt: bundle.generatedAt,
    caseName: bundle.caseName,
    graph: bundle.graph,
    sourceArtifacts: bundle.sourceArtifacts,
    sourceVaultManifests: bundle.sourceVaultManifests,
    packetManifests: bundle.packetManifests,
    caseStore: bundle.caseStore,
    sourceArtifactVerifications: bundle.sourceArtifactVerifications,
    sourceVaultVerifications: bundle.sourceVaultVerifications,
    packetManifestVerifications: bundle.packetManifestVerifications,
    packetManifestSignatureVerifications: bundle.packetManifestSignatureVerifications,
    caseStoreVerification: bundle.caseStoreVerification,
    caseArtifactVerification: bundle.caseArtifactVerification,
    caseLedgerAnchor: bundle.caseLedgerAnchor,
    signoffProvenance: bundle.signoffProvenance,
    counts: bundle.counts,
    diagnostics: bundle.diagnostics,
    graphInvariantFailures: bundle.graphInvariantFailures,
    packetHardWallFailures: bundle.packetHardWallFailures,
    duplicateDocuments: bundle.duplicateDocuments,
    bitemporalContradictions: bundle.bitemporalContradictions,
    graphHash: bundle.graphHash,
  };
}

function compareRecordedVerification<T>(
  failures: string[],
  label: string,
  recorded: T[] | undefined,
  recomputed: T[],
) {
  const recordedValue = recorded ?? [];
  if (recordedValue.length !== recomputed.length) {
    failures.push(`${label} verification count mismatch`);
    return;
  }
  if (canonicalJson(recordedValue) !== canonicalJson(recomputed)) {
    failures.push(`${label} verification mismatch`);
  }
}

export async function createSourceStackForensicBundle(
  graph: SourceGraph,
  options: {
    caseName?: string;
    packetCardIds?: string[];
    packetManifests?: PacketManifest[];
    sourceArtifacts?: DurableSourceArtifact[];
    sourceVaultManifests?: SourceVaultManifest[];
    caseStore?: ContentAddressedCaseStore;
    ledgerSigningKey?: StoredPacketSigningKey;
    ledgerSignedAt?: string;
  } = {},
): Promise<SourceStackForensicBundle> {
  const cardIds = Object.keys(graph.evidenceCards);
  const packetFailures = packetHardWallFailures(
    graph,
    options.packetCardIds?.length ? options.packetCardIds : cardIds,
  );
  const invariantFailures = graphInvariantFailures(graph);
  const bitemporalContradictions = detectBitemporalContradictions(graph);
  const sourceArtifacts = options.sourceArtifacts ?? [];
  const sourceArtifactVerifications = await Promise.all(
    sourceArtifacts.map((artifact) => verifySourceArtifact(artifact)),
  );
  const sourceVaultManifests = options.sourceVaultManifests ?? [];
  const sourceVaultVerifications = await Promise.all(
    sourceVaultManifests.map((manifest) => verifySourceVaultManifest(manifest)),
  );
  const generatedPacketManifests: PacketManifest[] = [];
  if (!options.packetManifests?.length && options.packetCardIds?.length && !packetFailures.length) {
    const packetIdSeed = await contentAddress(
      JSON.stringify({
        caseName: options.caseName ?? null,
        packetCardIds: options.packetCardIds,
        graphHash: await contentAddress(canonicalJson(graph)),
      }),
    );
    const packet = await assembleEvidencePacket(graph, {
      id: `bundle-packet:${packetIdSeed}`,
      type: "forensic_bundle",
      cardIds: options.packetCardIds,
      issuerIdentity: options.caseName ?? "SourceDeck forensic bundle",
    });
    if (packet.ok) generatedPacketManifests.push(packet.manifest);
  }
  const packetManifests = options.packetManifests?.length
    ? options.packetManifests
    : generatedPacketManifests;
  const packetManifestVerifications = await Promise.all(
    packetManifests.map((manifest) => verifyPacketManifest(graph, manifest)),
  );
  const packetManifestSignatureVerifications = await Promise.all(
    packetManifests.map((manifest) =>
      manifest.cryptographicSignature
        ? verifyPacketManifestSignature(manifest)
        : Promise.resolve({ ok: false as const, reason: "manifest has no cryptographic signature" }),
    ),
  );
  const caseStoreVerification = options.caseStore
    ? await verifyCaseEventLog(options.caseStore)
    : undefined;
  const caseArtifactVerification = options.caseStore
    ? await verifyCaseArtifacts(options.caseStore)
    : undefined;
  const caseLedgerAnchor =
    options.caseStore && options.ledgerSigningKey
      ? await signCaseLedgerHead(options.caseStore, options.ledgerSigningKey, options.ledgerSignedAt)
      : undefined;
  const signoffProvenance = options.caseStore
    ? await buildSignoffReviewQueue(graph, options.caseStore.events)
    : { entries: [], staleCount: 0 };
  const withoutBundleHash = {
    format: "sourcedeck.sourcestack-bundle.v1" as const,
    generatedAt: new Date().toISOString(),
    caseName: options.caseName,
    graph,
    sourceArtifacts,
    sourceVaultManifests,
    packetManifests,
    caseStore: options.caseStore,
    sourceArtifactVerifications,
    sourceVaultVerifications,
    packetManifestVerifications,
    packetManifestSignatureVerifications,
    caseStoreVerification,
    caseArtifactVerification,
    caseLedgerAnchor,
    signoffProvenance,
    counts: {
      documents: Object.keys(graph.documents).length,
      pages: Object.keys(graph.pages).length,
      spans: Object.keys(graph.spans).length,
      evidenceCards: cardIds.length,
      events: Object.keys(graph.events).length,
      sourceArtifacts: sourceArtifacts.length,
      sourceVaults: sourceVaultManifests.length,
      sourceVaultPageImages: sourceVaultManifests.reduce(
        (sum, manifest) => sum + manifest.pageImages.length,
        0,
      ),
      trustEvents: options.caseStore?.events.length ?? 0,
      caseArtifacts: options.caseStore
        ? Object.keys(options.caseStore.artifacts).length
        : 0,
      evidenceSignoffs: signoffProvenance.entries.length,
      staleEvidenceSignoffs: signoffProvenance.staleCount,
      contradictions: bitemporalContradictions.length,
      graphInvariantFailures: invariantFailures.length,
      packetHardWallFailures: packetFailures.length,
      packetManifests: packetManifests.length,
    },
    diagnostics: diagnoseEvidenceSet(graph, cardIds),
    graphInvariantFailures: invariantFailures,
    packetHardWallFailures: packetFailures,
    duplicateDocuments: findDuplicateDocuments(graph),
    bitemporalContradictions,
    graphHash: await contentAddress(canonicalJson(graph)),
  };
  return {
    ...withoutBundleHash,
    bundleHash: await contentAddress(canonicalJson(bundleHashPayload(withoutBundleHash))),
  };
}

export async function verifySourceStackForensicBundle(
  bundle: SourceStackForensicBundle,
  options: { trustedLedgerKeyId?: string; trustedLedgerKeyIds?: string[] } = {},
): Promise<SourceStackBundleVerification> {
  const failures: string[] = [];
  if (bundle.format !== "sourcedeck.sourcestack-bundle.v1") {
    failures.push("unsupported SourceStack bundle format");
  }
  const expectedGraphHash = await contentAddress(canonicalJson(bundle.graph));
  if (expectedGraphHash !== bundle.graphHash) failures.push("source graph hash mismatch");
  const expectedBundleHash = await contentAddress(
    canonicalJson(
      bundleHashPayload({
        format: bundle.format,
        generatedAt: bundle.generatedAt,
        caseName: bundle.caseName,
        graph: bundle.graph,
        sourceArtifacts: bundle.sourceArtifacts,
        sourceVaultManifests: bundle.sourceVaultManifests,
        packetManifests: bundle.packetManifests,
        caseStore: bundle.caseStore,
        sourceArtifactVerifications: bundle.sourceArtifactVerifications,
        sourceVaultVerifications: bundle.sourceVaultVerifications,
        packetManifestVerifications: bundle.packetManifestVerifications,
        packetManifestSignatureVerifications: bundle.packetManifestSignatureVerifications,
        caseStoreVerification: bundle.caseStoreVerification,
        caseArtifactVerification: bundle.caseArtifactVerification,
        caseLedgerAnchor: bundle.caseLedgerAnchor,
        signoffProvenance: bundle.signoffProvenance,
        counts: bundle.counts,
        diagnostics: bundle.diagnostics,
        graphInvariantFailures: bundle.graphInvariantFailures,
        packetHardWallFailures: bundle.packetHardWallFailures,
        duplicateDocuments: bundle.duplicateDocuments,
        bitemporalContradictions: bundle.bitemporalContradictions,
        graphHash: bundle.graphHash,
      }),
    ),
  );
  if (expectedBundleHash !== bundle.bundleHash) failures.push("bundle hash mismatch");
  const expectedCounts = {
    documents: Object.keys(bundle.graph.documents).length,
    pages: Object.keys(bundle.graph.pages).length,
    spans: Object.keys(bundle.graph.spans).length,
    evidenceCards: Object.keys(bundle.graph.evidenceCards).length,
    events: Object.keys(bundle.graph.events).length,
    sourceArtifacts: (bundle.sourceArtifacts ?? []).length,
    sourceVaults: (bundle.sourceVaultManifests ?? []).length,
    sourceVaultPageImages: (bundle.sourceVaultManifests ?? []).reduce(
      (sum, manifest) => sum + manifest.pageImages.length,
      0,
    ),
    trustEvents: bundle.caseStore?.events.length ?? 0,
    caseArtifacts: bundle.caseStore ? Object.keys(bundle.caseStore.artifacts).length : 0,
    evidenceSignoffs: bundle.signoffProvenance?.entries.length ?? 0,
    staleEvidenceSignoffs: bundle.signoffProvenance?.staleCount ?? 0,
    contradictions: detectBitemporalContradictions(bundle.graph).length,
    graphInvariantFailures: graphInvariantFailures(bundle.graph).length,
    packetHardWallFailures: bundle.packetHardWallFailures.length,
    packetManifests: (bundle.packetManifests ?? []).length,
  };
  const legacyZeroCountFields = new Set([
    "sourceArtifacts",
    "sourceVaults",
    "sourceVaultPageImages",
    "trustEvents",
    "caseArtifacts",
    "evidenceSignoffs",
    "staleEvidenceSignoffs",
    "packetManifests",
  ]);
  Object.entries(expectedCounts).forEach(([key, expectedValue]) => {
    const recordedValue = (bundle.counts as Record<string, number | undefined>)[key];
    const actualValue =
      typeof recordedValue === "undefined" &&
      expectedValue === 0 &&
      legacyZeroCountFields.has(key)
        ? 0
        : recordedValue;
    if (actualValue !== expectedValue) failures.push(`bundle count ${key} mismatch`);
  });
  const sourceArtifactVerifications = await Promise.all(
    (bundle.sourceArtifacts ?? []).map((artifact) => verifySourceArtifact(artifact)),
  );
  compareRecordedVerification(
    failures,
    "source artifact",
    bundle.sourceArtifactVerifications,
    sourceArtifactVerifications,
  );
  sourceArtifactVerifications.forEach((verification) => {
    if (!verification.ok) {
      failures.push(`source artifact ${verification.artifactId} failed: ${verification.reason}`);
    }
  });
  const sourceArtifactsById = new Map<string, DurableSourceArtifact>();
  const sourceArtifactsByDocumentId = new Map<string, DurableSourceArtifact>();
  (bundle.sourceArtifacts ?? []).forEach((artifact) => {
    if (sourceArtifactsById.has(artifact.artifactId)) {
      failures.push(`duplicate source artifact ${artifact.artifactId}`);
    }
    sourceArtifactsById.set(artifact.artifactId, artifact);
    if (sourceArtifactsByDocumentId.has(artifact.documentId)) {
      failures.push(`duplicate source artifact document ${artifact.documentId}`);
    }
    sourceArtifactsByDocumentId.set(artifact.documentId, artifact);
    const graphDocument = bundle.graph.documents[artifact.documentId];
    if (!graphDocument) {
      failures.push(`source artifact ${artifact.artifactId} graph document missing`);
      return;
    }
    if (graphDocument.contentHash !== artifact.contentHash) {
      failures.push(`source artifact ${artifact.artifactId} graph document hash mismatch`);
    }
    if (graphDocument.metadata.sourceArtifactId !== artifact.artifactId) {
      failures.push(`source artifact ${artifact.artifactId} graph metadata artifact id mismatch`);
    }
  });
  const vaultsById = new Map(
    (bundle.sourceVaultManifests ?? []).map((manifest) => [manifest.vaultId, manifest]),
  );
  const seenVaultIds = new Set<string>();
  const seenVaultDocumentIds = new Set<string>();
  (bundle.sourceVaultManifests ?? []).forEach((manifest) => {
    if (seenVaultIds.has(manifest.vaultId)) {
      failures.push(`duplicate source vault ${manifest.vaultId}`);
    }
    seenVaultIds.add(manifest.vaultId);
    if (seenVaultDocumentIds.has(manifest.documentId)) {
      failures.push(`duplicate source vault document ${manifest.documentId}`);
    }
    seenVaultDocumentIds.add(manifest.documentId);
    const graphDocument = bundle.graph.documents[manifest.documentId];
    if (!graphDocument) {
      failures.push(`source vault ${manifest.vaultId} graph document missing`);
      return;
    }
    if (graphDocument.metadata.sourceVaultId !== manifest.vaultId) {
      failures.push(`source vault ${manifest.vaultId} graph metadata vault id mismatch`);
    }
    if (graphDocument.metadata.sourceVaultManifestHash !== manifest.manifestHash) {
      failures.push(`source vault ${manifest.vaultId} graph metadata manifest hash mismatch`);
    }
    if (graphDocument.metadata.sourceVaultOriginalHash !== manifest.original.contentHash) {
      failures.push(`source vault ${manifest.vaultId} graph metadata original hash mismatch`);
    }
  });
  Object.values(bundle.graph.documents).forEach((document) => {
    const sourceArtifactId = document.metadata.sourceArtifactId;
    if (typeof sourceArtifactId === "string") {
      const artifact = sourceArtifactsById.get(sourceArtifactId);
      if (!artifact) {
        failures.push(`graph document ${document.id} source artifact ${sourceArtifactId} missing from bundle`);
      } else {
        if (artifact.documentId !== document.id) {
          failures.push(`graph document ${document.id} source artifact document mismatch`);
        }
        if (artifact.contentHash !== document.contentHash) {
          failures.push(`graph document ${document.id} source artifact hash mismatch`);
        }
      }
    }
    const sourceVaultId = document.metadata.sourceVaultId;
    if (typeof sourceVaultId === "string") {
      const vault = vaultsById.get(sourceVaultId);
      if (!vault) {
        failures.push(`graph document ${document.id} source vault ${sourceVaultId} missing from bundle`);
      } else {
        if (vault.documentId !== document.id) {
          failures.push(`graph document ${document.id} source vault document mismatch`);
        }
        if (document.metadata.sourceVaultManifestHash !== vault.manifestHash) {
          failures.push(`graph document ${document.id} source vault manifest hash mismatch`);
        }
        if (document.metadata.sourceVaultOriginalHash !== vault.original.contentHash) {
          failures.push(`graph document ${document.id} source vault original hash mismatch`);
        }
      }
    }
  });
  (bundle.sourceArtifacts ?? []).forEach((artifact) => {
    if (!artifact.sourceVault) return;
    const vault = vaultsById.get(artifact.sourceVault.vaultId);
    if (!vault) {
      failures.push(`source artifact ${artifact.artifactId} vault manifest missing`);
      return;
    }
    if (vault.manifestHash !== artifact.sourceVault.manifestHash) {
      failures.push(`source artifact ${artifact.artifactId} vault manifest hash mismatch`);
    }
    if (vault.original.recordId !== artifact.sourceVault.originalRecordId) {
      failures.push(`source artifact ${artifact.artifactId} vault original record mismatch`);
    }
    if (vault.original.contentHash !== artifact.sourceVault.originalContentHash) {
      failures.push(`source artifact ${artifact.artifactId} vault original hash mismatch`);
    }
    const pageImagesById = new Map(vault.pageImages.map((pageImage) => [pageImage.recordId, pageImage]));
    artifact.pages.forEach((page) => {
      if (!page.vault?.pageImageRecordId) return;
      const pageImage = pageImagesById.get(page.vault.pageImageRecordId);
      if (!pageImage) {
        failures.push(`source artifact ${artifact.artifactId} page ${page.index} vault page image missing`);
        return;
      }
      if (pageImage.contentHash !== page.vault.pageImageContentHash) {
        failures.push(`source artifact ${artifact.artifactId} page ${page.index} vault page image hash mismatch`);
      }
      if (pageImage.pageIndex !== page.index) {
        failures.push(`source artifact ${artifact.artifactId} page ${page.index} vault page index mismatch`);
      }
    });
  });
  const sourceVaultVerifications = await Promise.all(
    (bundle.sourceVaultManifests ?? []).map((manifest) => verifySourceVaultManifest(manifest)),
  );
  compareRecordedVerification(
    failures,
    "source vault",
    bundle.sourceVaultVerifications,
    sourceVaultVerifications,
  );
  sourceVaultVerifications.forEach((verification) => {
    if (!verification.ok) {
      failures.push(`source vault ${verification.vaultId} failed: ${verification.reason}`);
    }
  });
  const packetManifestVerifications = await Promise.all(
    (bundle.packetManifests ?? []).map((manifest) => verifyPacketManifest(bundle.graph, manifest)),
  );
  compareRecordedVerification(
    failures,
    "packet manifest",
    bundle.packetManifestVerifications,
    packetManifestVerifications,
  );
  packetManifestVerifications.forEach((verification, index) => {
    if (!verification.ok) {
      failures.push(
        `packet manifest ${bundle.packetManifests[index]?.packetId ?? index} failed: ${verification.failures.join("; ")}`,
      );
    }
  });
  const packetManifestSignatureVerifications = await Promise.all(
    (bundle.packetManifests ?? []).map((manifest) =>
      manifest.cryptographicSignature
        ? verifyPacketManifestSignature(manifest)
        : Promise.resolve({ ok: false as const, reason: "manifest has no cryptographic signature" }),
    ),
  );
  compareRecordedVerification(
    failures,
    "packet manifest signature",
    bundle.packetManifestSignatureVerifications,
    packetManifestSignatureVerifications,
  );
  packetManifestSignatureVerifications.forEach((verification, index) => {
    const manifest = bundle.packetManifests[index];
    if (manifest?.cryptographicSignature && !verification.ok) {
      failures.push(
        `packet manifest ${manifest.packetId} signature failed: ${verification.reason}`,
      );
    }
  });
  if (bundle.caseStore) {
    const caseStoreVerification = await verifyCaseEventLog(bundle.caseStore);
    if (!caseStoreVerification.ok) {
      failures.push(
        `case store event ${caseStoreVerification.eventId} failed: ${caseStoreVerification.reason}`,
      );
    }
    const caseArtifactVerification = await verifyCaseArtifacts(bundle.caseStore);
    const caseArtifactCount = Object.keys(bundle.caseStore.artifacts).length;
    if (!bundle.caseArtifactVerification && caseArtifactCount > 0) {
      failures.push("case artifact verification missing");
    } else if (
      bundle.caseArtifactVerification &&
      canonicalJson(bundle.caseArtifactVerification) !== canonicalJson(caseArtifactVerification)
    ) {
      failures.push("case artifact verification mismatch");
    }
    if (!caseArtifactVerification.ok) {
      failures.push(
        `case store artifact ${caseArtifactVerification.artifactId} failed: ${caseArtifactVerification.reason}`,
      );
    }
    const expectedSignoffProvenance = await buildSignoffReviewQueue(
      bundle.graph,
      bundle.caseStore.events,
    );
    if (!bundle.signoffProvenance && expectedSignoffProvenance.entries.length > 0) {
      failures.push("signoff provenance missing");
    } else if (
      canonicalJson(bundle.signoffProvenance ?? { entries: [], staleCount: 0 }) !==
      canonicalJson(expectedSignoffProvenance)
    ) {
      failures.push("signoff provenance mismatch");
    }
    if (expectedSignoffProvenance.staleCount > 0) {
      failures.push(
        `${expectedSignoffProvenance.staleCount} evidence signoff(s) stale; re-verification required`,
      );
    }
  }
  if (bundle.caseLedgerAnchor) {
    if (!bundle.caseStore) {
      failures.push("bundle has a case ledger anchor but no case store");
    } else {
      const ledgerVerification = await verifySignedCaseLedger(
        bundle.caseStore,
        bundle.caseLedgerAnchor,
        {
          trustedPublicKeyId: options.trustedLedgerKeyId,
          trustedKeyIds: options.trustedLedgerKeyIds,
        },
      );
      if (!ledgerVerification.ok) {
        failures.push(`case ledger head anchor failed: ${ledgerVerification.reason}`);
      }
    }
  }
  return failures.length
    ? { ok: false, failures: Array.from(new Set(failures)) }
    : { ok: true, graphHash: bundle.graphHash, bundleHash: bundle.bundleHash };
}
