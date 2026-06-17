import { contentAddress, requireResolvedVerifiedCard } from "./kernel";
import type { EvidenceCard, GateFailure, Packet, PacketManifest, SourceGraph } from "./types";

export type PacketAssemblyRequest = {
  id: string;
  type: string;
  cardIds: string[];
  redactionOperations?: string[];
  issuerIdentity?: string;
};

export type PacketAssemblyResult =
  | {
      ok: true;
      packet: Packet;
      manifest: PacketManifest;
      cards: EvidenceCard[];
    }
  | {
      ok: false;
      failures: GateFailure[];
    };

export type PacketManifestVerification =
  | { ok: true; manifestHash: string }
  | { ok: false; failures: string[] };

export function packetHardWallFailures(graph: SourceGraph, cardIds: string[]): GateFailure[] {
  const failures: GateFailure[] = [];
  const seenCardIds = new Set<string>();
  cardIds.forEach((cardId) => {
    if (seenCardIds.has(cardId)) {
      failures.push({
        cardId,
        reason: "packet hard wall: selected card is duplicated",
        severity: "hard_wall",
      });
      return;
    }
    seenCardIds.add(cardId);
    const card = graph.evidenceCards[cardId];
    if (!card) {
      failures.push({
        cardId,
        reason: "packet hard wall: selected card does not exist",
        severity: "hard_wall",
      });
      return;
    }
    failures.push(...requireResolvedVerifiedCard(card, graph));
  });
  return failures;
}

async function pageLayoutHash(page: SourceGraph["pages"][string]) {
  return contentAddress(
    JSON.stringify(
      page.layoutBlocks.map((block) => ({
        id: block.id,
        kind: block.kind,
        text: block.text ?? null,
        confidence: block.confidence ?? null,
      })),
    ),
  );
}

async function buildPacketProof(graph: SourceGraph, cardIds: string[], exportTimestamp: string) {
  const cards = cardIds.map((cardId) => graph.evidenceCards[cardId]);
  const sourceDocumentHashes = Array.from(
    new Map(
      cards.map((card) => {
        const document = graph.documents[card.sourceDocumentId];
        return [document.id, { documentId: document.id, contentHash: document.contentHash }];
      }),
    ).values(),
  );
  const sourceVaultHashes = Array.from(
    new Map(
      cards
        .map((card) => {
          const document = graph.documents[card.sourceDocumentId];
          const vaultId = document.metadata.sourceVaultId;
          const manifestHash = document.metadata.sourceVaultManifestHash;
          const originalContentHash = document.metadata.sourceVaultOriginalHash;
          if (typeof manifestHash !== "string" && typeof originalContentHash !== "string") {
            return undefined;
          }
          return [
            document.id,
            {
              documentId: document.id,
              vaultId: typeof vaultId === "string" ? vaultId : undefined,
              manifestHash: typeof manifestHash === "string" ? manifestHash : undefined,
              originalContentHash:
                typeof originalContentHash === "string" ? originalContentHash : undefined,
            },
          ] as const;
        })
        .filter((entry): entry is readonly [string, NonNullable<typeof entry>[1]] =>
          Boolean(entry),
        ),
    ).values(),
  );
  const pageHashes = await Promise.all(
    cards
      .map((card) => graph.spans[card.spanId])
      .filter((span) => span.pageId)
      .map(async (span) => {
        const page = graph.pages[span.pageId as string];
        return {
          pageId: page.id,
          imageHash: page.imageHash,
          layoutHash: await pageLayoutHash(page),
          ocrQuality: page.ocrQuality,
        };
      }),
  );
  const spanReferences = cards.map((card) => {
    const span = graph.spans[card.spanId];
    return {
      cardId: card.id,
      documentId: card.sourceDocumentId,
      pageId: span.pageId,
      mediaSegmentId: span.mediaSegmentId,
      spanId: span.id,
      quote: card.exactQuoteOrSegment,
    };
  });
  const packetPayload = {
    packetId: "",
    packetType: "",
    cardIds,
    spanReferences,
    exportTimestamp,
  };
  return {
    cards,
    sourceDocumentHashes,
    sourceVaultHashes,
    pageHashes,
    spanReferences,
    packetPayload,
  };
}

function hashVerifiableManifestPayload(
  manifest: Omit<PacketManifest, "manifestHash" | "cryptographicSignature">,
) {
  return {
    format: manifest.format,
    packetId: manifest.packetId,
    packetType: manifest.packetType,
    packetHash: manifest.packetHash,
    sourceDocumentHashes: manifest.sourceDocumentHashes,
    sourceVaultHashes: manifest.sourceVaultHashes ?? [],
    pageHashes: manifest.pageHashes,
    includedEvidenceCardIds: manifest.includedEvidenceCardIds,
    spanReferences: manifest.spanReferences,
    redactionOperations: manifest.redactionOperations,
    exportTimestamp: manifest.exportTimestamp,
    issuerIdentity: manifest.issuerIdentity,
  };
}

export async function assembleEvidencePacket(
  graph: SourceGraph,
  request: PacketAssemblyRequest,
): Promise<PacketAssemblyResult> {
  const failures = packetHardWallFailures(graph, request.cardIds);
  if (failures.length) return { ok: false, failures };

  const exportTimestamp = new Date().toISOString();
  const proof = await buildPacketProof(graph, request.cardIds, exportTimestamp);
  const packetPayload = {
    ...proof.packetPayload,
    packetId: request.id,
    packetType: request.type,
  };
  const packetHash = await contentAddress(JSON.stringify(packetPayload));
  const hashVerifiableManifest = {
    format: "sourcedeck.packet-manifest.v1" as const,
    packetId: request.id,
    packetType: request.type,
    packetHash,
    sourceDocumentHashes: proof.sourceDocumentHashes,
    sourceVaultHashes: proof.sourceVaultHashes,
    pageHashes: proof.pageHashes,
    includedEvidenceCardIds: request.cardIds,
    spanReferences: proof.spanReferences,
    redactionOperations: request.redactionOperations ?? [],
    exportTimestamp,
    issuerIdentity: request.issuerIdentity,
  };
  const manifestHash = await contentAddress(
    JSON.stringify(hashVerifiableManifestPayload(hashVerifiableManifest)),
  );
  const manifest: PacketManifest = { ...hashVerifiableManifest, manifestHash };
  const packet: Packet = {
    id: request.id,
    type: request.type,
    cardIds: request.cardIds,
    state: "finalized",
    verifiableManifestHash: manifestHash,
  };
  return { ok: true, packet, manifest, cards: proof.cards };
}

export function serializePacketManifest(manifest: PacketManifest) {
  return JSON.stringify(manifest, null, 2);
}

export async function verifyPacketManifest(
  graph: SourceGraph,
  manifest: PacketManifest,
): Promise<PacketManifestVerification> {
  const failures: string[] = [];
  if (manifest.format !== "sourcedeck.packet-manifest.v1") {
    failures.push("unsupported manifest format");
  }
  const hardWallFailures = packetHardWallFailures(graph, manifest.includedEvidenceCardIds);
  failures.push(...hardWallFailures.map((failure) => failure.reason));
  if (!hardWallFailures.length) {
    const proof = await buildPacketProof(
      graph,
      manifest.includedEvidenceCardIds,
      manifest.exportTimestamp,
    );
    const expectedPacketPayload = {
      ...proof.packetPayload,
      packetId: manifest.packetId,
      packetType: manifest.packetType,
    };
    const expectedPacketHash = await contentAddress(JSON.stringify(expectedPacketPayload));
    if (expectedPacketHash !== manifest.packetHash) {
      failures.push("packet hash mismatch");
    }
    if (JSON.stringify(proof.sourceDocumentHashes) !== JSON.stringify(manifest.sourceDocumentHashes)) {
      failures.push("source document hashes mismatch");
    }
    if (JSON.stringify(proof.sourceVaultHashes) !== JSON.stringify(manifest.sourceVaultHashes ?? [])) {
      failures.push("source vault hashes mismatch");
    }
    if (JSON.stringify(proof.pageHashes) !== JSON.stringify(manifest.pageHashes)) {
      failures.push("page hashes mismatch");
    }
    if (JSON.stringify(proof.spanReferences) !== JSON.stringify(manifest.spanReferences)) {
      failures.push("span references mismatch");
    }
  }
  const hashVerifiableManifest: Omit<
    PacketManifest,
    "manifestHash" | "cryptographicSignature"
  > = {
    format: manifest.format,
    packetId: manifest.packetId,
    packetType: manifest.packetType,
    packetHash: manifest.packetHash,
    sourceDocumentHashes: manifest.sourceDocumentHashes,
    sourceVaultHashes: manifest.sourceVaultHashes ?? [],
    pageHashes: manifest.pageHashes,
    includedEvidenceCardIds: manifest.includedEvidenceCardIds,
    spanReferences: manifest.spanReferences,
    redactionOperations: manifest.redactionOperations,
    exportTimestamp: manifest.exportTimestamp,
    issuerIdentity: manifest.issuerIdentity,
  };
  const expectedManifestHash = await contentAddress(
    JSON.stringify(hashVerifiableManifestPayload(hashVerifiableManifest)),
  );
  if (expectedManifestHash !== manifest.manifestHash) {
    failures.push("manifest hash mismatch");
  }
  return failures.length
    ? { ok: false, failures: Array.from(new Set(failures)) }
    : { ok: true, manifestHash: manifest.manifestHash };
}
