export type VerificationStatus =
  | "suggested"
  | "cited"
  | "verified"
  | "disputed"
  | "superseded"
  | "withdrawn"
  | "anchor_stale";

export type AnchorStatus = "stable" | "low_confidence" | "anchor_stale" | "unresolved";

export type PacketState = "assembling" | "review" | "finalized" | "exported" | "amended";

export type EvidenceCardState = VerificationStatus;

export type IssueTheoryState =
  | "identified"
  | "gathering"
  | "supported"
  | "contested"
  | "resolved_favorable"
  | "resolved_unfavorable"
  | "abandoned";

export type RecordGapState =
  | "detected"
  | "request_drafted"
  | "requested"
  | "received"
  | "reviewed"
  | "resolved"
  | "stale";

export type MeetingState = "scheduled" | "prepped" | "live" | "completed" | "followed_up";

export type ModelJobState =
  | "planned"
  | "context_built"
  | "running"
  | "returned"
  | "resolved"
  | "gated"
  | "committed"
  | "draft"
  | "rejected";

export type ContentAddress = string;

export type SourceSensitivity =
  | "public"
  | "private"
  | "education"
  | "medical"
  | "hr"
  | "legal"
  | "financial"
  | "child"
  | "unknown";

export type SourceDocument = {
  id: string;
  contentHash: ContentAddress;
  source: string;
  title: string;
  mime: string;
  ingestedAt: string;
  versionOf?: string;
  supersedes?: string[];
  metadata: Record<string, string | number | boolean | null>;
  sensitivity: SourceSensitivity;
};

export type SourcePage = {
  id: string;
  documentId: string;
  index: number;
  imageHash?: ContentAddress;
  ocrQuality: number;
  layoutBlocks: Array<{
    id: string;
    kind: "text" | "table" | "form_field" | "signature" | "redaction" | "image";
    text?: string;
    confidence?: number;
  }>;
};

export type MediaSegment = {
  id: string;
  documentId: string;
  startTime: number;
  endTime: number;
  transcriptSpanId: string;
  speakerId?: string;
  confidence: number;
};

export type SourceSpan = {
  id: string;
  documentId: string;
  pageId?: string;
  mediaSegmentId?: string;
  quadPoints: Array<[number, number, number, number]>;
  charRange: [number, number];
  semanticFingerprint: string;
  structuralPath: string[];
  exactText: string;
  anchorStatus: AnchorStatus;
  quality: number;
};

export type StrengthScore = {
  overall: number;
  sourceTier: number;
  directness: number;
  corroborationCount: number;
  contradictionLoad: number;
  authentication: number;
  currency: number;
  anchorQuality: number;
  humanVerification: number;
  domainWeight: number;
  reasons: string[];
};

export type Provenance = {
  id: string;
  inputs: string[];
  jobContract?: string;
  model?: string;
  modelVersion?: string;
  promptTemplate?: string;
  at: string;
  actor: string;
  verifiedBy?: string;
};

export type EvidenceCard = {
  id: string;
  assertion: string;
  sourceDocumentId: string;
  pageId?: string;
  mediaSegmentId?: string;
  spanId: string;
  exactQuoteOrSegment: string;
  plainLanguageMeaning: string;
  tags: string[];
  issueLinks: string[];
  strengthScore: StrengthScore;
  contradictionLinks: string[];
  corroborationLinks: string[];
  supersessionLinks: string[];
  verificationStatus: VerificationStatus;
  provenanceId: string;
};

export type ClaimRole = "claim" | "grounds" | "warrant" | "backing" | "qualifier" | "rebuttal";

export type Claim = {
  id: string;
  text: string;
  issueId: string;
  role: ClaimRole;
  supportingCardIds: string[];
  warrant?: string;
  qualifier?: string;
  verificationStatus: VerificationStatus;
  provenanceId: string;
};

export type IssueTheory = {
  id: string;
  title: string;
  state: IssueTheoryState;
  claimIds: string[];
  rebuttalIds: string[];
  strongestPath: string[];
  weakestLink?: string;
  packetReadiness: "ready" | "blocked_by_unverified_cards" | "missing_records" | "needs_review";
};

export type SourceEdgeType =
  | "supports"
  | "contradicts"
  | "corroborates"
  | "supersedes"
  | "obligates"
  | "breaches"
  | "references"
  | "authored_by"
  | "occurred_on"
  | "resolves"
  | "requests"
  | "satisfies"
  | "attacks"
  | "weakens"
  | "strengthens";

export type SourceEdge = {
  id: string;
  type: SourceEdgeType;
  fromId: string;
  toId: string;
  subtype?: string;
  confidence: number;
  sourceSpanId?: string;
};

export type BitemporalEvent = {
  id: string;
  validTime: string;
  transactionTime: string;
  sourceSpanId: string;
  entities: string[];
  description: string;
};

export type Obligation = {
  id: string;
  debtor: string;
  creditor: string;
  duty: string;
  dueValidTime?: string;
  status: "pending" | "fulfilled" | "breached" | "waived" | "disputed";
  sourceSpanId: string;
  satisfiedByCardId?: string;
};

export type RecordGap = {
  id: string;
  referencedInSpanId: string;
  description: string;
  requestDraft: string;
  state: RecordGapState;
};

export type Meeting = {
  id: string;
  scheduledAt?: string;
  state: MeetingState;
  briefId?: string;
  transcriptId?: string;
  liveModeSettings: {
    verifiedOnly: boolean;
    mode: "quiet" | "normal" | "aggressive";
    maxSuggestions: number;
  };
};

export type Packet = {
  id: string;
  type: string;
  cardIds: string[];
  state: PacketState;
  verifiableManifestHash?: ContentAddress;
};

export type PacketManifestSignature = {
  algorithm: "ECDSA-P256-SHA256";
  publicKeyId: string;
  publicKeyJwk: JsonWebKey;
  keyCustodyHash?: ContentAddress;
  keyCustodyFormat?: string;
  signature: string;
  signedAt: string;
};

export type PacketManifest = {
  format: "sourcedeck.packet-manifest.v1";
  packetId: string;
  packetType: string;
  packetHash: ContentAddress;
  sourceDocumentHashes: Array<{ documentId: string; contentHash: ContentAddress }>;
  sourceVaultHashes?: Array<{
    documentId: string;
    vaultId?: string;
    manifestHash?: ContentAddress;
    originalContentHash?: ContentAddress;
  }>;
  pageHashes: Array<{
    pageId: string;
    imageHash?: ContentAddress;
    layoutHash?: ContentAddress;
    ocrQuality: number;
  }>;
  includedEvidenceCardIds: string[];
  spanReferences: Array<{
    cardId: string;
    documentId: string;
    pageId?: string;
    mediaSegmentId?: string;
    spanId: string;
    quote: string;
  }>;
  redactionOperations: string[];
  exportTimestamp: string;
  issuerIdentity?: string;
  cryptographicSignature?: PacketManifestSignature;
  manifestHash: ContentAddress;
};

export type AuditEvent = {
  id: string;
  actor: string;
  action: string;
  targetId: string;
  at: string;
  prevHash?: ContentAddress;
  eventHash: ContentAddress;
  severity?: "info" | "warning" | "critical";
};

export type ModelLane = "deterministic" | "local" | "frontier";

export type PrivacyMode = "local_only" | "hybrid" | "cloud_allowed";

export type ModelJobContract = {
  id: string;
  jobName: string;
  inputSchema: string;
  outputSchema: string;
  contextScope: string;
  allowedLanes: ModelLane[];
  redactionPolicy: "none" | "tokenize_pii" | "cleartext_required_with_consent";
  verificationPolicy: "draft" | "resolve_to_cited" | "verified_only_destination";
  destinationPolicy: "brainstorm" | "graph_claim" | "prep" | "live" | "packet";
  timeoutMs: number;
  costCeilingUsd?: number;
};

export type DomainPack = {
  id: string;
  name: string;
  ontologyExtension: string[];
  intakeChecklist: string[];
  recordTypes: string[];
  issueTemplates: string[];
  strengthRubric: string[];
  contradictionPatterns: string[];
  missingRecordRules: string[];
  obligationPatterns: string[];
  questionTemplates: string[];
  packetTemplates: string[];
  jurisdictionNotes: string[];
  modelJobPolicy: Record<string, ModelLane[]>;
  legalBoundaryCopy: string;
  exportFormats: string[];
  liveModeButtons: string[];
};

export type SourceGraph = {
  documents: Record<string, SourceDocument>;
  pages: Record<string, SourcePage>;
  spans: Record<string, SourceSpan>;
  mediaSegments: Record<string, MediaSegment>;
  evidenceCards: Record<string, EvidenceCard>;
  claims: Record<string, Claim>;
  issueTheories: Record<string, IssueTheory>;
  edges: SourceEdge[];
  events: Record<string, BitemporalEvent>;
  obligations: Record<string, Obligation>;
  recordGaps: Record<string, RecordGap>;
  packets: Record<string, Packet>;
  provenance: Record<string, Provenance>;
  auditEvents: AuditEvent[];
};

export type SourceResolution =
  | {
      ok: true;
      card: EvidenceCard;
      span: SourceSpan;
      document: SourceDocument;
      page?: SourcePage;
      mediaSegment?: MediaSegment;
      quoteExact: boolean;
      spanBackedBySource: boolean;
      anchorUsable: boolean;
    }
  | {
      ok: false;
      card: EvidenceCard;
      reason: string;
    };

export type GateFailure = {
  cardId?: string;
  claimId?: string;
  issueTheoryId?: string;
  reason: string;
  severity: "warning" | "hard_wall";
};
