import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArchiveRestore,
  ArrowRight,
  BookOpenCheck,
  Brain,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardCopy,
  GitCompare,
  Download,
  FileArchive,
  FileSearch,
  FileText,
  FolderOpen,
  Highlighter,
  ListChecks,
  MessageSquareQuote,
  Mic2,
  Plus,
  Scale,
  Search,
  ShieldCheck,
  Siren,
  Swords,
  Timer,
  Upload,
} from "lucide-react";
import "./App.css";
import {
  assembleEvidencePacket,
  appendCaseEvent,
  buildLegacySourceGraph,
  computeIssueProofPath,
  coreModelJobContracts,
  createStoredPacketSigningKey,
  createContentAddressedCaseStore,
  createEncryptedSourceVaultStore,
  createIndexedDbSourceVaultRecordStore,
  createSourceVaultBlobRecord,
  createSourceVaultManifest,
  createSourceVaultPageImageRecord,
  createTextSourceArtifact,
  createSourceStackForensicBundle,
  csvCell,
  decideImportTrust,
  decryptJsonPayload,
  diagnoseEvidenceCard,
  detectBitemporalContradictions,
  encryptJsonPayload,
  escapeHtml,
  buildBoundedIntelligenceSearchRequest,
  signOffEvidenceVerification,
  promoteEvidenceWithCertificate,
  promotionCertificateToRecordedEvent,
  proofSnapshotHash,
  parseSearchCommand,
  redactSourceVaultManifestPayloads,
  buildSignoffReviewQueue,
  splitEvidenceCard,
  mergeEvidenceCards,
  editEvidenceCardQuote,
  graphInvariantFailures,
  isEncryptedPacketSigningKey,
  packetHardWallFailures,
  putCaseArtifact,
  putSourceVaultManifest,
  redactSourceBackedPacketForExport,
  scoreSearchText,
  searchFiltersMatch,
  reanchorSpanToText,
  serializeDurableSourceArtifactForCaseStore,
  serializePacketManifest,
  searchTier,
  sourceExcerpt,
  sourceSnippet,
  routeModelJob,
  signPacketManifestWithStoredKey,
  SOURCE_ARTIFACT_CASE_STORE_MEDIA_TYPE,
  SOURCE_VAULT_REDACTED_PAYLOAD_REASON,
  sourceVaultManifestHasPayloads,
  sourceVaultPayloadBytes,
  unwrapPacketSigningKey,
  verifyEncryptedPacketSigningKey,
  verifyPacketManifest,
  verifyPacketManifestAgainstRegistry,
  createTrustedKeyRegistry,
  makeTrustedSigner,
  addTrustedSigner,
  removeTrustedSigner,
  findTrustedSigner,
  keyFingerprint,
  verifyCaseEventLog,
  verifySourceStackForensicBundle,
  verifySourceArtifact,
  verifySourceVaultManifest,
  verifySourceVaultManifestStorage,
  validateIntelligenceSearchResponse,
  type CaseStoreEvent,
  type ContentAddressedCaseStore,
  type DurableSourceArtifact,
  type EncryptedJsonPayloadBase,
  wrapPacketSigningKey,
  type EncryptedPacketSigningKey,
  type PacketManifest,
  type PrivacyMode,
  type SourceArtifactBlock,
  type SourceStackForensicBundle,
  type SourceVaultManifest,
  type StoredSourceVaultRecord,
  type StoredPacketSigningKey,
  type TrustedKeyRegistry,
  type IntelligenceSearchMatch,
  type RetrievalTier,
  type VerificationStatus,
} from "./sourcestack";

type Priority = "Critical" | "High" | "Medium" | "Low";
type View =
  | "command"
  | "search"
  | "documents"
  | "evidence"
  | "issues"
  | "timeline"
  | "meeting"
  | "exports"
  | "prep"
  | "conflicts"
  | "battlecard";

type ExtractedPageText = {
  page: number;
  text: string;
  width?: number;
  height?: number;
  geometryBlocks?: SourceArtifactBlock[];
};

type RenderedPageImage = {
  page: number;
  bytes: Uint8Array;
  width: number;
  height: number;
  renderScale: number;
  mediaType: string;
};

type SourceDocument = {
  id: string;
  title: string;
  type: string;
  date: string;
  author: string;
  pages: number;
  exhibit: string;
  tags: string[];
  status: "Indexed" | "Needs OCR" | "Needs review";
  signer?: string;
  signedDate?: string;
  warning?: string;
  fileName?: string;
  extractedText?: string;
  pageTexts?: ExtractedPageText[];
  importTrust?: "trusted_for_suggestion" | "quarantined_prompt_injection";
  textChars?: number;
  importedAt?: string;
  detectedDates?: string[];
  detectedEntities?: string[];
  sourceArtifact?: DurableSourceArtifact;
  sourceArtifactVerified?: boolean;
  sourceArtifactFailure?: string;
  sourceVaultManifest?: SourceVaultManifest;
  sourceVaultVerified?: boolean;
  sourceVaultFailure?: string;
};

function sanitizeSourceDocumentForLocalStorage(document: SourceDocument): SourceDocument {
  if (!document.sourceVaultManifest || !sourceVaultManifestHasPayloads(document.sourceVaultManifest)) {
    return document;
  }
  return {
    ...document,
    sourceVaultManifest: redactSourceVaultManifestPayloads(document.sourceVaultManifest),
    sourceVaultVerified: false,
    sourceVaultFailure: document.sourceVaultFailure ?? SOURCE_VAULT_REDACTED_PAYLOAD_REASON,
  };
}

function sanitizeSourceDocumentsForLocalStorage(documents: SourceDocument[]) {
  return documents.map(sanitizeSourceDocumentForLocalStorage);
}

type EvidenceCard = {
  id: string;
  title: string;
  category: string;
  priority: Priority;
  documentId: string;
  page: number;
  quote: string;
  meaning: string;
  strategicUse: string;
  question: string;
  likelyDefense: string;
  counter: string;
  tags: string[];
  confidence: number;
  packetReady: boolean;
  verificationStatus?: VerificationStatus;
  // Case-deck additions: per-quote attribution + the live ISSUE/SAY/PULL/NEXT block.
  date?: string;
  speaker?: string;
  live?: LiveResponse;
  needsVerification?: boolean;
  // Meeting-readiness layer (separate from the SourceStack signoff gate).
  meetingStatus?: "live" | "hold" | "review";
  meetingVerified?: boolean;
  keepHold?: "KEEP" | "HOLD";
};

type LiveResponse = { issue: string; say: string; pull: string; next: string };

type ConflictSource = { doc: string; quote: string; cite: string };
type ConflictView = {
  id: string;
  title: string;
  claim: string;
  source1: ConflictSource;
  source2: ConflictSource;
  why: string;
  say: string;
  next: string;
};
type RecordsLedgerEntry = { label: string; status: string; note?: string };

type BattleCard = {
  openingStatement: string;
  shortOpening?: string;
  liveLines?: string[];
  goals?: string[];
  questions: string[];
  ifThen: Array<{ if: string; then: string }>;
  pwnPrompts: string[];
  agenda?: string[];
  holdList?: string[];
  copyPhrases?: string[];
  shortcuts?: Array<{ label: string; tag: string }>;
};

type Issue = {
  id: string;
  title: string;
  description: string;
  evidenceIds: string[];
  status: "Open" | "Resolved" | "Needs document";
  meetingPriority: number;
};

type TimelineEntry = {
  id: string;
  date: string;
  dateLabel?: string;
  event: string;
  documentId: string;
  page: number;
  quote: string;
  issue: string;
};

type MissingRecord = {
  id: string;
  requested: string;
  dateRequested: string;
  responsibleParty: string;
  status: "Missing" | "Partial" | "Produced";
  relatedIssue: string;
  whyItMatters: string;
  followUp: string;
};

type MeetingNote = {
  id: string;
  timestamp: string;
  speaker: string;
  topic: string;
  note: string;
  linkedEvidence: string[];
  followUp: string;
  kind: "Note" | "Refusal" | "Commitment" | "Action";
};

type AuditRow = {
  id: string;
  severity: Priority;
  title: string;
  detail: string;
  targetView: View;
  evidenceId?: string;
  documentId?: string;
};

type PrepSuggestion = {
  id: string;
  title: string;
  quote: string;
  category: string;
  priority: Priority;
  question: string;
  confidence: number;
  documentId?: string;
  page?: number;
};

type SearchLane = "exact" | "smart";
type CommandSearchHit = {
  id: string;
  lane: SearchLane;
  tier: RetrievalTier;
  score: number;
  documentId: string;
  documentTitle: string;
  exhibit: string;
  page: number;
  quote: string;
  snippet: string;
  title: string;
  matchReason: string;
  matchedTerms: string[];
  evidenceId?: string;
};

type CommandSearchGroup = {
  document: SourceDocument;
  topScore: number;
  hits: CommandSearchHit[];
};

type VerificationQueueState = "ready" | "blocked" | "stale" | "verified";
type VerificationQueueItem = {
  card: EvidenceCard;
  document?: SourceDocument;
  state: VerificationQueueState;
  packetEligible: boolean;
  blockerCount: number;
  blockers: string[];
  signedAt?: string;
  reviewer?: string;
  staleReason?: string;
};


type CaseTemplate = {
  id: string;
  title: string;
  meetingType: string;
  issues: Array<{ title: string; description: string }>;
  missingRecords: Array<{ requested: string; whyItMatters: string; followUp: string }>;
};

type WorkspaceSnapshot = Partial<{
  deckVersion: string;
  conflicts: ConflictView[];
  recordsLedger: RecordsLedgerEntry[];
  caseProfile: CaseProfile;
  documents: SourceDocument[];
  evidence: EvidenceCard[];
  issues: Issue[];
  timeline: TimelineEntry[];
  missingRecords: MissingRecord[];
  meetingNotes: MeetingNote[];
  trustStore: ContentAddressedCaseStore | null;
  trustRegistry: TrustedKeyRegistry;
  battleCard: BattleCard;
}>;

type EncryptedWorkspacePayload = EncryptedJsonPayloadBase<"sourcedeck.encrypted.v1">;

type EncryptedSourceStackBundlePayload =
  EncryptedJsonPayloadBase<"sourcedeck.sourcestack-bundle.encrypted.v1"> & {
    plaintextFormat: SourceStackForensicBundle["format"];
    bundleHash: string;
    graphHash: string;
    bundleGeneratedAt: string;
    caseName?: string;
    counts: SourceStackForensicBundle["counts"];
    includesSourceVaultPayloads: boolean;
  };

type CaseProfile = {
  name: string;
  role: string;
  objective: string;
  meetingDate: string;
};

const priorityRank: Record<Priority, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const seedSourceTextByDocumentId: Record<
  string,
  Pick<SourceDocument, "extractedText" | "pageTexts">
> = {};

function hydrateSeedDocumentSourceText(document: SourceDocument): SourceDocument {
  const seedText = seedSourceTextByDocumentId[document.id];
  if (!seedText) return document;
  const pageTextByPage = new Map(document.pageTexts?.map((page) => [page.page, page.text]));
  let changed = false;
  seedText.pageTexts?.forEach((page) => {
    if (!pageTextByPage.get(page.page)?.includes(page.text)) {
      pageTextByPage.set(page.page, page.text);
      changed = true;
    }
  });
  const extractedText = document.extractedText?.trim()
    ? document.extractedText
    : seedText.extractedText;
  if (extractedText !== document.extractedText) changed = true;
  if (!changed) return document;
  return {
    ...document,
    extractedText,
    pageTexts: Array.from(pageTextByPage.entries())
      .map(([page, text]) => ({ page, text }))
      .sort((left, right) => left.page - right.page),
  };
}

const encryptedPacketSigningKeyStorageKey = "sourcedeck.packetSigningKey.encrypted.v1";
const legacyPacketSigningKeyStorageKey = "sourcedeck.packetSigningKey.v1";

type PacketSigningKeyCustody = {
  key: StoredPacketSigningKey;
  status: string;
  keyCustodyHash?: string;
  keyCustodyFormat?: string;
  custodyEvent?: {
    type: CaseStoreEvent["type"];
    targetId: string;
    payload: Record<string, unknown>;
  };
};

function isStoredPacketSigningKey(value: unknown): value is StoredPacketSigningKey {
  const parsed = value as Partial<StoredPacketSigningKey>;
  return (
    parsed?.format === "sourcedeck.packet-signing-key.v1" &&
    parsed.algorithm === "ECDSA-P256-SHA256" &&
    Boolean(parsed.privateKeyJwk) &&
    Boolean(parsed.publicKeyJwk) &&
    typeof parsed.keyId === "string"
  );
}

async function getPacketSigningKeyForManifest(
  passphrase: string,
): Promise<PacketSigningKeyCustody> {
  const trimmedPassphrase = passphrase.trim();
  if (!trimmedPassphrase) {
    window.localStorage.removeItem(legacyPacketSigningKeyStorageKey);
    const ephemeral = await createStoredPacketSigningKey();
    return {
      key: ephemeral,
      status:
        "Signed packet manifest with an ephemeral key. Enter a workspace passphrase to persist signing custody.",
    };
  }

  const encrypted = window.localStorage.getItem(encryptedPacketSigningKeyStorageKey);
  if (encrypted) {
    const parsed = JSON.parse(encrypted) as EncryptedPacketSigningKey;
    if (!isEncryptedPacketSigningKey(parsed)) {
      window.localStorage.removeItem(encryptedPacketSigningKeyStorageKey);
    } else {
      const key = await unwrapPacketSigningKey(parsed, trimmedPassphrase);
      const verification = await verifyEncryptedPacketSigningKey(parsed, {
        passphrase: trimmedPassphrase,
      });
      return {
        key,
        status: `Signed packet manifest with encrypted custody key ${parsed.publicKeyId.slice(0, 18)}...`,
        keyCustodyHash: verification.ok ? verification.custodyHash : undefined,
        keyCustodyFormat: parsed.format,
      };
    }
  }

  const legacyRawKey = window.localStorage.getItem(legacyPacketSigningKeyStorageKey);
  if (legacyRawKey) {
    const parsed = JSON.parse(legacyRawKey) as StoredPacketSigningKey;
    window.localStorage.removeItem(legacyPacketSigningKeyStorageKey);
    if (isStoredPacketSigningKey(parsed)) {
      const wrapped = await wrapPacketSigningKey(parsed, trimmedPassphrase);
      const verification = await verifyEncryptedPacketSigningKey(wrapped, {
        passphrase: trimmedPassphrase,
      });
      window.localStorage.setItem(encryptedPacketSigningKeyStorageKey, JSON.stringify(wrapped));
      return {
        key: parsed,
        status: `Migrated raw packet signing key into encrypted custody ${parsed.keyId.slice(0, 18)}...`,
        keyCustodyHash: verification.ok ? verification.custodyHash : undefined,
        keyCustodyFormat: wrapped.format,
        custodyEvent: {
          type: "signing_key_wrapped",
          targetId: parsed.keyId,
          payload: {
            custody: "encrypted",
            custodyHash: verification.ok ? verification.custodyHash : undefined,
            migratedFromLegacyRawStorage: true,
            kdf: wrapped.kdf,
            cipher: wrapped.cipher,
            iterations: wrapped.iterations,
          },
        },
      };
    }
  }

  const created = await createStoredPacketSigningKey();
  const wrapped = await wrapPacketSigningKey(created, trimmedPassphrase);
  const verification = await verifyEncryptedPacketSigningKey(wrapped, {
    passphrase: trimmedPassphrase,
  });
  window.localStorage.setItem(encryptedPacketSigningKeyStorageKey, JSON.stringify(wrapped));
  return {
    key: created,
    status: `Created encrypted packet signing custody key ${created.keyId.slice(0, 18)}...`,
    keyCustodyHash: verification.ok ? verification.custodyHash : undefined,
    keyCustodyFormat: wrapped.format,
    custodyEvent: {
      type: "signing_key_wrapped",
      targetId: created.keyId,
      payload: {
        custody: "encrypted",
        custodyHash: verification.ok ? verification.custodyHash : undefined,
        migratedFromLegacyRawStorage: false,
        kdf: wrapped.kdf,
        cipher: wrapped.cipher,
        iterations: wrapped.iterations,
      },
    },
  };
}

const seedDocuments: SourceDocument[] = [];

const seedEvidence: EvidenceCard[] = [];

const seedIssues: Issue[] = [];

const seedTimeline: TimelineEntry[] = [];

const seedMissingRecords: MissingRecord[] = [];

const seedCaseProfile: CaseProfile = {
  name: "Demo Case",
  role: "",
  objective: "",
  meetingDate: new Date().toISOString().slice(0, 10),
};

const meetingTypes = [
  "Vendor review",
  "Mediation",
  "Legal consult",
  "HR meeting",
  "Medical consult",
  "Board meeting",
  "Audit review",
  "Settlement review",
];

const caseTemplates: CaseTemplate[] = [
  {
    id: "vendor",
    title: "Vendor contract / SLA",
    meetingType: "Vendor review",
    issues: [
      {
        title: "Uptime committed vs uptime delivered",
        description: "Compare the contract's committed service levels against uptime reports, tickets, and written notices.",
      },
      {
        title: "Billing overage and service-credit remedy",
        description: "Track whether degraded service triggered credits and what remedy is being offered.",
      },
    ],
    missingRecords: [
      {
        requested: "Uptime / availability reports",
        whyItMatters: "Needed to verify whether the contracted service level was actually delivered.",
        followUp: "Request rolling production or written refusal.",
      },
      {
        requested: "Change orders and notices",
        whyItMatters: "Needed to determine what decisions were made, when, and why.",
        followUp: "Ask for every change order tied to scope, schedule, or pricing changes.",
      },
    ],
  },
  {
    id: "hr",
    title: "HR / workplace dispute",
    meetingType: "HR meeting",
    issues: [
      {
        title: "Policy promised vs policy followed",
        description: "Compare written policy, HR actions, supervisor communications, and timeline.",
      },
      {
        title: "Retaliation or inconsistent treatment",
        description: "Track protected activity, adverse actions, comparators, and explanations.",
      },
    ],
    missingRecords: [
      {
        requested: "HR complaint file",
        whyItMatters: "Needed to prove what was reported and how the company responded.",
        followUp: "Request complaint, investigator notes, and closure records.",
      },
      {
        requested: "Performance history",
        whyItMatters: "Needed to compare stated reasons with prior documented performance.",
        followUp: "Request reviews, warnings, goals, and manager notes.",
      },
    ],
  },
  {
    id: "medical",
    title: "Medical / insurance appeal",
    meetingType: "Medical consult",
    issues: [
      {
        title: "Documented need vs denied treatment",
        description: "Compare diagnosis, symptoms, provider recommendations, policy language, and denial reasons.",
      },
      {
        title: "Timeline of symptoms and decisions",
        description: "Show what was known when, who reviewed it, and what changed.",
      },
    ],
    missingRecords: [
      {
        requested: "Denial rationale and criteria",
        whyItMatters: "Needed to challenge the stated basis for denial.",
        followUp: "Request policy criteria, reviewer credentials, and appeal deadline.",
      },
      {
        requested: "Complete visit notes",
        whyItMatters: "Needed to anchor symptoms, diagnosis, and treatment history.",
        followUp: "Request visit notes, labs, imaging, and provider messages.",
      },
    ],
  },
  {
    id: "legal",
    title: "Legal / attorney prep",
    meetingType: "Legal consult",
    issues: [
      {
        title: "Strongest admissions",
        description: "Find statements that admit responsibility, knowledge, breach, delay, or non-performance.",
      },
      {
        title: "Contradictions and missing records",
        description: "Map conflicts across contracts, correspondence, pleadings, and produced records.",
      },
    ],
    missingRecords: [
      {
        requested: "Complete correspondence set",
        whyItMatters: "Needed to prevent cherry-picked timelines.",
        followUp: "Request email threads, attachments, messages, and metadata where available.",
      },
      {
        requested: "Signed agreements and amendments",
        whyItMatters: "Needed to prove obligations and changes.",
        followUp: "Request executed versions, change orders, addenda, and notices.",
      },
    ],
  },
  {
    id: "compliance",
    title: "Compliance / audit review",
    meetingType: "Audit review",
    issues: [
      {
        title: "Requirement vs evidence of compliance",
        description: "Tie each requirement to the exact record proving compliance or gap.",
      },
      {
        title: "Owner, approval, and remediation trail",
        description: "Track who approved what, when issues were found, and how they were closed.",
      },
    ],
    missingRecords: [
      {
        requested: "Control evidence",
        whyItMatters: "Needed to prove the control operated during the review period.",
        followUp: "Request logs, screenshots, approvals, and exception reports.",
      },
      {
        requested: "Remediation records",
        whyItMatters: "Needed to verify corrective action and closure.",
        followUp: "Request owner, deadline, proof of completion, and retest evidence.",
      },
    ],
  },
];

const requiredRecordTypes = [
  "MSA",
  "SOW",
  "Change order",
  "Uptime reports",
  "Support tickets",
  "Billing records",
  "Internal communications",
  "Contract",
  "Service-credit analysis",
];

// Optional local-workflow hints for the Search tab's "Local case folder" card. These are purely
// cosmetic and project-agnostic by default: set VITE_CASE_FOLDER_PATH in a gitignored .env.local to
// surface your own folder/command. With nothing set, the card stays generic and no case-specific
// path ships in the bundle.
const localCaseFolderPath = import.meta.env.VITE_CASE_FOLDER_PATH ?? "";
const localCaseImportCommand = import.meta.env.VITE_CASE_IMPORT_COMMAND ?? "npm run case:import";
const localCaseImportDetail = localCaseFolderPath
  ? `writes sourcedeck-workspace.json and sourcedeck-pressure-test-report.md into the folder above`
  : "Set VITE_CASE_FOLDER_PATH in .env.local to point at your case folder.";

const quickSearchCommands = [
  { label: "Outage window", query: 'outage window tag:"Service level agreement"' },
  { label: "Missed SLA", query: "missed sla downtime minutes" },
  { label: "Change order", query: 'tag:"Change order" scope change' },
  { label: "Escalation", query: 'tag:"Support escalation" critical incident' },
  { label: "PDF contracts", query: "type:pdf contract" },
  { label: "Invoice OCR", query: 'tag:"OCR sidecar" invoice overage' },
  { label: "Uptime reports OCR", query: 'tag:"OCR sidecar" uptime minutes' },
];

const navItems: Array<{ id: View; label: string; icon: typeof Search }> = [
  { id: "battlecard", label: "Battle Card", icon: Swords },
  { id: "search", label: "Search", icon: Search },
  { id: "evidence", label: "Evidence", icon: MessageSquareQuote },
  { id: "conflicts", label: "Conflicts", icon: GitCompare },
  { id: "issues", label: "Decks", icon: Scale },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "timeline", label: "Timeline", icon: CalendarDays },
];

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function documentPagesForSearch(document: SourceDocument): Array<{ page: number; text: string }> {
  if (document.pageTexts?.length) {
    return document.pageTexts.map((page) => ({ page: page.page, text: page.text }));
  }
  return [{ page: 1, text: document.extractedText ?? "" }];
}

function useLocalState<T>(
  key: string,
  initial: T,
  options: { serialize?: (value: T) => unknown; deserialize?: (stored: unknown) => T } = {},
) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return initial;
      const parsed = JSON.parse(stored) as unknown;
      const resolved = options.deserialize ? options.deserialize(parsed) : (parsed as T);
      if (options.serialize) {
        localStorage.setItem(key, JSON.stringify(options.serialize(resolved)));
      }
      return resolved;
    } catch {
      return initial;
    }
  });

  function update(next: T | ((current: T) => T)) {
    setValue((current) => {
      const resolved =
        typeof next === "function" ? (next as (current: T) => T)(current) : next;
      localStorage.setItem(
        key,
        JSON.stringify(options.serialize ? options.serialize(resolved) : resolved),
      );
      return resolved;
    });
  }

  return [value, update] as const;
}

function compactDate(value: string) {
  if (!value) return "Undated";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function cardVerificationStatus(card: EvidenceCard): VerificationStatus {
  return card.verificationStatus ?? (card.packetReady ? "verified" : "cited");
}

type ProcessedFile = {
  extractedText: string;
  pageTexts: ExtractedPageText[];
  renderedPageImages?: RenderedPageImage[];
  pages: number;
  status: SourceDocument["status"];
  warning: string;
};

const plainTextExtensions = new Set(["txt", "md", "csv", "json", "log", "html"]);

function detectDates(text: string) {
  const matches = text.match(
    /\b(?:\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4})\b/gi,
  );
  return Array.from(new Set(matches ?? [])).slice(0, 16);
}

function detectEntities(text: string) {
  const matches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,4}\b/g);
  const noisy = new Set([
    "SourceDeck Evidence",
    "Master Services Agreement",
    "Because",
    "The",
  ]);
  return Array.from(new Set(matches ?? []))
    .filter((item) => !noisy.has(item))
    .slice(0, 18);
}

function readPlainTextFile(file: File) {
  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => resolve("");
    reader.readAsText(file);
  });
}

async function renderPdfPageImage(page: {
  getViewport(input: { scale: number }): { width: number; height: number };
}, scale = 1.5): Promise<RenderedPageImage | undefined> {
  if (typeof document === "undefined") return undefined;
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const context = canvas.getContext("2d");
  if (!context) return undefined;
  const renderablePage = page as unknown as {
    render(input: {
      canvas: HTMLCanvasElement;
      canvasContext: CanvasRenderingContext2D;
      viewport: typeof viewport;
    }): { promise: Promise<unknown> };
  };
  await renderablePage.render({ canvas, canvasContext: context, viewport }).promise;
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) return undefined;
  return {
    page: 0,
    bytes: new Uint8Array(await blob.arrayBuffer()),
    width: canvas.width,
    height: canvas.height,
    renderScale: scale,
    mediaType: "image/png",
  };
}

async function readPdfFile(file: File, sourceBytes?: Uint8Array): Promise<ProcessedFile> {
  const [{ GlobalWorkerOptions, getDocument }, { default: pdfWorkerSrc }] =
    await Promise.all([
      import("pdfjs-dist"),
      import("pdfjs-dist/build/pdf.worker.mjs?url"),
    ]);
  GlobalWorkerOptions.workerSrc = pdfWorkerSrc;
  const data = sourceBytes
    ? new Uint8Array(toArrayBuffer(sourceBytes))
    : new Uint8Array(await file.arrayBuffer());
  const pdf = await getDocument({ data }).promise;
  const pageTexts: ExtractedPageText[] = [];
  const renderedPageImages: RenderedPageImage[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const geometryBlocks: SourceArtifactBlock[] = [];
    const text = content.items
      .map((item, index) => {
        if (!("str" in item)) return "";
        const textItem = item as {
          str: string;
          transform?: number[];
          width?: number;
          height?: number;
        };
        const itemText = textItem.str.trim();
        if (!itemText) return "";
        const transform = textItem.transform ?? [1, 0, 0, 1, 0, 0];
        const rawX = transform[4] ?? 0;
        const rawY = transform[5] ?? 0;
        const rawWidth = textItem.width ?? Math.max(1, itemText.length * 5);
        const rawHeight = textItem.height ?? Math.max(8, Math.abs(transform[3] ?? 10));
        const x = Math.max(0, Math.min(rawX, viewport.width - 1));
        const y = Math.max(0, Math.min(viewport.height - rawY - rawHeight, viewport.height - 1));
        const width = Math.max(1, Math.min(rawWidth, viewport.width - x));
        const height = Math.max(1, Math.min(rawHeight, viewport.height - y));
        geometryBlocks.push({
          id: `pdf:${file.name}:page:${pageNumber}:text:${index}`,
          kind: "text",
          text: itemText,
          confidence: 0.95,
          quadPoints: [[x, y, width, height]],
        });
        return itemText;
      })
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    pageTexts.push({
      page: pageNumber,
      text,
      width: viewport.width,
      height: viewport.height,
      geometryBlocks,
    });
    const renderedImage = await renderPdfPageImage(page);
    if (renderedImage) renderedPageImages.push({ ...renderedImage, page: pageNumber });
  }
  const extractedText = pageTexts.map((page) => page.text).join("\n\n");
  return {
    extractedText,
    pageTexts,
    renderedPageImages,
    pages: pdf.numPages,
    status: extractedText ? "Indexed" : "Needs OCR",
    warning: extractedText
      ? `${pdf.numPages} PDF pages indexed locally; ${renderedPageImages.length} rendered page image${renderedPageImages.length === 1 ? "" : "s"} vaulted.`
      : "PDF has no extractable text; OCR is required.",
  };
}

async function readDocxFile(file: File, sourceBytes?: Uint8Array): Promise<ProcessedFile> {
  const { default: mammoth } = await import("mammoth/mammoth.browser");
  const result = await mammoth.extractRawText({
    arrayBuffer: sourceBytes ? toArrayBuffer(sourceBytes) : await file.arrayBuffer(),
  });
  const extractedText = result.value.replace(/\s+\n/g, "\n").trim();
  return {
    extractedText,
    pageTexts: extractedText ? [{ page: 1, text: extractedText }] : [],
    pages: extractedText ? 1 : 0,
    status: extractedText ? "Indexed" : "Needs OCR",
    warning: extractedText
      ? `${extractedText.length.toLocaleString()} DOCX characters indexed locally.`
      : "DOCX has no extractable text; it may be an image, chart, or embedded object that needs OCR.",
  };
}

async function processFile(file: File, sourceBytes?: Uint8Array): Promise<ProcessedFile> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") {
    return readPdfFile(file, sourceBytes);
  }
  if (ext === "docx") {
    return readDocxFile(file, sourceBytes);
  }
  if (ext === "doc") {
    return {
      extractedText: "",
      pageTexts: [],
      pages: 0,
      status: "Needs review",
      warning:
        "Legacy DOC files cannot be parsed in the browser build. Use npm run case:import locally, or convert this file to DOCX/PDF.",
    };
  }
  if (plainTextExtensions.has(ext)) {
    const extractedText = await readPlainTextFile(file);
    return {
      extractedText,
      pageTexts: extractedText ? [{ page: 1, text: extractedText }] : [],
      pages: extractedText ? 1 : 0,
      status: extractedText ? "Indexed" : "Needs review",
      warning: extractedText
        ? `${extractedText.length.toLocaleString()} text characters indexed locally.`
        : "Text-like file imported but no text was extracted.",
    };
  }
  return {
    extractedText: "",
    pageTexts: [],
    pages: 0,
    status: ["png", "jpg", "jpeg", "tif", "tiff"].includes(ext) ? "Needs OCR" : "Needs review",
    warning: ["png", "jpg", "jpeg", "tif", "tiff"].includes(ext)
      ? "Image document queued for OCR."
      : "Metadata imported. Add a processor for this file type.",
  };
}

function suggestFromText(
  text: string,
  documentId?: string,
  titlePrefix = "Imported evidence",
) {
  const fragments = text
    .split(/\n|(?<=[.!?])\s+/)
    .map((item) => item.trim().replace(/\s+/g, " "))
    .filter((item) => item.length > 36)
    .slice(0, 10);

  return fragments.map((fragment, index): PrepSuggestion => {
    const lower = fragment.toLowerCase();
    const category = lower.includes("not able") || lower.includes("not provided")
      ? "Non-Implementation"
      : lower.includes("gradual") || lower.includes("as tolerated")
        ? "Vague Terms"
        : lower.includes("request") || lower.includes("produce")
          ? "Missing Records"
          : lower.includes("hour") || lower.includes("minute")
            ? "Downtime Minutes"
            : lower.includes("shall") || lower.includes("must")
              ? "Obligation"
              : "Key quote";
    const priority: Priority =
      category === "Non-Implementation"
        ? "Critical"
        : category === "Missing Records" || category === "Vague Terms"
          ? "High"
          : "Medium";
    return {
      id: makeId("prep"),
      title:
        category === "Non-Implementation"
          ? "Possible non-delivery admission"
          : category === "Vague Terms"
            ? "Vague implementation language"
            : category === "Missing Records"
              ? "Record production gap"
              : category === "Obligation"
                ? "Possible mandatory obligation"
                : `${titlePrefix} ${index + 1}`,
      quote: fragment,
      category,
      priority,
      question:
        category === "Non-Implementation"
          ? "What services were delivered during the period described in this quote, and what records prove delivery?"
          : category === "Vague Terms"
            ? "What measurable date, criteria, and responsible party control this term?"
            : category === "Missing Records"
              ? "When will this record be produced, and will refusal be provided in writing if it is unavailable?"
              : category === "Obligation"
                ? "Who is responsible for this obligation, what deadline applies, and what record proves compliance?"
                : "What is the source, page, responsible party, and practical effect of this statement?",
      confidence: Math.max(70, 94 - index * 4),
      documentId,
      page: 1,
    };
  });
}

function downloadText(filename: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function quoteContext(text: string | undefined, quote: string) {
  if (!text) return "";
  const normalizedText = text.replace(/\s+/g, " ");
  const normalizedQuote = quote.replace(/\s+/g, " ").slice(0, 120);
  const index = normalizedText.toLowerCase().indexOf(normalizedQuote.toLowerCase());
  if (index < 0) return normalizedText.slice(0, 950);
  const start = Math.max(0, index - 360);
  const end = Math.min(normalizedText.length, index + normalizedQuote.length + 420);
  return normalizedText.slice(start, end);
}

function normalizeDetectedDate(value: string) {
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return new Date(parsed).toISOString().slice(0, 10);
  const year = value.match(/\b(19|20)\d{2}\b/)?.[0];
  return year ? `${year}-01-01` : new Date().toISOString().slice(0, 10);
}

function toArrayBuffer(bytes: Uint8Array) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function App() {
  const [documents, setDocuments] = useLocalState("sourcedeck.documents", seedDocuments, {
    deserialize: (stored) =>
      sanitizeSourceDocumentsForLocalStorage(stored as SourceDocument[]),
    serialize: sanitizeSourceDocumentsForLocalStorage,
  });
  const [caseProfile, setCaseProfile] = useLocalState(
    "sourcedeck.caseProfile",
    seedCaseProfile,
  );
  const [evidence, setEvidence] = useLocalState("sourcedeck.evidence", seedEvidence);
  const [battleCard, setBattleCard] = useLocalState<BattleCard | null>(
    "sourcedeck.battleCard",
    null,
  );
  const [issues, setIssues] = useLocalState("sourcedeck.issues", seedIssues);
  const [timeline, setTimeline] = useLocalState("sourcedeck.timeline", seedTimeline);
  const [missingRecords, setMissingRecords] = useLocalState(
    "sourcedeck.missingRecords",
    seedMissingRecords,
  );
  const [meetingNotes, setMeetingNotes] = useLocalState<MeetingNote[]>(
    "sourcedeck.meetingNotes",
    [],
  );
  const [trustStore, setTrustStore] = useLocalState<ContentAddressedCaseStore | null>(
    "sourcedeck.trustStore",
    null,
  );
  // Tracks which bundled deck version has been applied, so a newer public/casedeck.json auto-refreshes.
  const [deckVersion, setDeckVersion] = useLocalState<string>("sourcedeck.deckVersion", "");
  const [conflicts, setConflicts] = useLocalState<ConflictView[]>("sourcedeck.conflicts", []);
  const [recordsLedger, setRecordsLedger] = useLocalState<RecordsLedgerEntry[]>(
    "sourcedeck.recordsLedger",
    [],
  );
  const [trustStoreStatus, setTrustStoreStatus] = useState("Trust ledger not started.");
  const [view, setView] = useState<View>("battlecard");
  const [shortcutTag, setShortcutTag] = useState<string | null>(null);
  // Auto-load a local case deck (served at /casedeck.json by the dev middleware when
  // SOURCEDECK_DECK_PATH is set) on first run so the app opens straight into that deck instead of
  // seed/demo data. Project-agnostic: "first run" means no deck has been applied to this browser yet
  // (cached deckVersion is empty), NOT a check for any particular case. If no deck is served the
  // fetch 404s and the app stays in its empty/demo state. Once a deck is applied, later mounts only
  // refresh when the served deck carries a newer deckVersion, so in-meeting edits are never clobbered.
  useEffect(() => {
    let cancelled = false;
    void fetch(`/casedeck.json?v=${Date.now()}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((snapshot) => {
        if (cancelled || !snapshot || !Array.isArray(snapshot.evidence)) return;
        const firstRun = !deckVersion;
        const fresh = typeof snapshot.deckVersion === "string" ? snapshot.deckVersion : "";
        // Load on first run, or refresh whenever the served deck is newer than what's cached.
        // Once applied, deckVersion matches and later mounts skip - so in-meeting edits are kept.
        if (firstRun || (fresh && fresh !== deckVersion)) {
          restoreWorkspaceSnapshot(
            snapshot,
            firstRun ? "Loaded the case deck." : "Updated to the latest case deck.",
          );
          // Decks without their own version still mark this browser as loaded, so we don't
          // re-apply (and clobber edits) on every subsequent mount.
          if (!fresh) setDeckVersion("loaded");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [query, setQuery] = useState("");
  const [activeIssueId, setActiveIssueId] = useState(issues[0]?.id ?? "");
  const [activeDocumentId, setActiveDocumentId] = useState(documents[0]?.id ?? "");
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(evidence[0]?.id ?? "");
  const [packetIds, setPacketIds] = useLocalState<string[]>("sourcedeck.packetIds", []);
  const [meetingType, setMeetingType] = useState(meetingTypes[0]);
  const [noteDraft, setNoteDraft] = useState("");
  const [speakerDraft, setSpeakerDraft] = useState("Other party");
  const [transcriptDraft, setTranscriptDraft] = useState("");
  const [liveClaimDraft, setLiveClaimDraft] = useState("");
  const [composedResponse, setComposedResponse] = useState("");
  const [agreementText, setAgreementText] = useState(
    "Services will gradually increase as appropriate.",
  );
  const [prepText, setPrepText] = useState("");
  const [prepSuggestions, setPrepSuggestions] = useState<PrepSuggestion[]>([]);
  const [importStatus, setImportStatus] = useState("");
  const [voiceStatus, setVoiceStatus] = useState("Voice idle");
  const [intelligenceStatus, setIntelligenceStatus] = useState("CLI intelligence idle");
  const [intelligenceQuery, setIntelligenceQuery] = useState("");
  const [intelligenceMatches, setIntelligenceMatches] = useState<IntelligenceSearchMatch[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [workspacePassphrase, setWorkspacePassphrase] = useState("");
  const [privacyStatus, setPrivacyStatus] = useState("");
  const [manifestStatus, setManifestStatus] = useState("");
  const [trustRegistry, setTrustRegistry] = useLocalState<TrustedKeyRegistry>(
    "sourcedeck.trustRegistry.v1",
    createTrustedKeyRegistry(),
  );
  const [pendingTrustSigner, setPendingTrustSigner] = useState<
    { keyId: string; fingerprint: string } | null
  >(null);
  const [reviewerIdentity, setReviewerIdentity] = useLocalState(
    "sourcedeck.reviewerIdentity.v1",
    "Local reviewer",
  );
  const [redactionTerms, setRedactionTerms] = useLocalState(
    "sourcedeck.redactionTerms",
    "Acme Corp\nVendor Contact Name\nAccount Number",
  );
  const [privacyMode, setPrivacyMode] = useLocalState<PrivacyMode>(
    "sourcedeck.privacyMode",
    "local_only",
  );
  const [meetingStartedAt, setMeetingStartedAt] = useLocalState<string | null>(
    "sourcedeck.meetingStartedAt",
    null,
  );
  const [clockTick, setClockTick] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const speechRecognitionRef = useRef<SpeechRecognition | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voiceChunksRef = useRef<Blob[]>([]);
  const [manualCard, setManualCard] = useState({
    title: "",
    quote: "",
    question: "",
    page: "1",
    category: "Key quote",
    documentId: documents[0]?.id ?? "",
  });

  const documentById = useMemo(
    () => new Map(documents.map((document) => [document.id, document])),
    [documents],
  );
  const sourceStackDocuments = useMemo(
    () => documents.map(hydrateSeedDocumentSourceText),
    [documents],
  );
  const sourceStackGraph = useMemo(
    () => buildLegacySourceGraph(sourceStackDocuments, evidence),
    [sourceStackDocuments, evidence],
  );
  const bitemporalContradictions = useMemo(
    () => detectBitemporalContradictions(sourceStackGraph),
    [sourceStackGraph],
  );
  const sourceStackSummary = useMemo(
    () => ({
      documents: Object.keys(sourceStackGraph.documents).length,
      sourceArtifacts: documents.filter((document) => document.sourceArtifact).length,
      artifactFailures: documents.filter(
        (document) => document.sourceArtifact && !document.sourceArtifactVerified,
      ).length,
      sourceVaults: documents.filter((document) => document.sourceVaultManifest).length,
      sourceVaultFailures: documents.filter(
        (document) => document.sourceVaultManifest && !document.sourceVaultVerified,
      ).length,
      sourceVaultPageImages: documents.reduce(
        (sum, document) => sum + (document.sourceVaultManifest?.pageImages.length ?? 0),
        0,
      ),
      spans: Object.keys(sourceStackGraph.spans).length,
      evidenceCards: Object.keys(sourceStackGraph.evidenceCards).length,
      events: Object.keys(sourceStackGraph.events).length,
      trustEvents: trustStore?.events.length ?? 0,
      invariantFailures: graphInvariantFailures(sourceStackGraph).length,
      contradictions: bitemporalContradictions.length,
    }),
    [bitemporalContradictions.length, documents, sourceStackGraph, trustStore],
  );

  const selectedEvidence = evidence.find((card) => card.id === selectedEvidenceId) ?? evidence[0];
  const selectedEvidenceDiagnostic = useMemo(
    () =>
      selectedEvidence
        ? diagnoseEvidenceCard(sourceStackGraph, selectedEvidence.id)
        : undefined,
    [selectedEvidence, sourceStackGraph],
  );
  // The latest human signoff for the selected card (render-time, synchronous).
  const selectedLatestSignoff = useMemo(() => {
    if (!selectedEvidence || !trustStore) return undefined;
    const events = trustStore.events.filter(
      (event) =>
        (event.type === "evidence_signed_off" || event.type === "evidence_promoted") &&
        event.targetId === selectedEvidence.id,
    );
    return events[events.length - 1];
  }, [selectedEvidence, trustStore]);
  // Is that signoff still current, or did the source change since? Async only (per the W3 lesson:
  // the synchronous part is derived above; the effect performs only the async hash comparison).
  const [selectedSignoffCurrent, setSelectedSignoffCurrent] = useState<
    { cardId: string; current: boolean } | null
  >(null);
  useEffect(() => {
    if (!selectedEvidence || !selectedLatestSignoff) return;
    const cardId = selectedEvidence.id;
    let cancelled = false;
    void (async () => {
      const card = sourceStackGraph.evidenceCards[cardId];
      if (!card) return;
      const currentHash = await proofSnapshotHash(sourceStackGraph, card);
      if (cancelled) return;
      const recordedHash = String(selectedLatestSignoff.payload.proofSnapshotHash ?? "");
      setSelectedSignoffCurrent({
        cardId,
        current: recordedHash !== "" && recordedHash === currentHash,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedEvidence, selectedLatestSignoff, sourceStackGraph]);
  // Case-wide review queue: how many signed-off cards have gone stale because their source changed.
  // Same async-only effect discipline - the worklist is computed off the trust ledger after an await.
  const [signoffAuditEntries, setSignoffAuditEntries] = useState<
    Array<{
      cardId: string;
      reviewer: string;
      at: string;
      current: boolean;
      stale: boolean;
      reason?: string;
    }>
  >([]);
  useEffect(() => {
    if (!trustStore) return;
    let cancelled = false;
    void (async () => {
      const audit = await buildSignoffReviewQueue(sourceStackGraph, trustStore.events);
      if (cancelled) return;
      setSignoffAuditEntries(audit.entries);
    })();
    return () => {
      cancelled = true;
    };
  }, [trustStore, sourceStackGraph]);
  const activeSignoffAuditEntries = useMemo(
    () => (trustStore ? signoffAuditEntries : []),
    [signoffAuditEntries, trustStore],
  );
  const staleSignoffCount = activeSignoffAuditEntries.filter((entry) => entry.stale).length;
  const [splitDraft, setSplitDraft] = useState("");
  const [quoteDraft, setQuoteDraft] = useState("");
  const activeIssue = issues.find((issue) => issue.id === activeIssueId) ?? issues[0];
  const activeIssueProofPath = useMemo(
    () =>
      activeIssue
        ? computeIssueProofPath(sourceStackGraph, activeIssue.evidenceIds)
        : undefined,
    [activeIssue, sourceStackGraph],
  );
  const routerSummary = useMemo(
    () =>
      coreModelJobContracts.map((contract) => ({
        contract,
        route: routeModelJob(contract, {
          privacyMode,
          sensitivity: "unknown",
          deterministicAvailable: true,
          localModelAvailable: true,
          frontierModelAvailable: true,
        }),
      })),
    [privacyMode],
  );
  const activeDocument =
    documents.find((document) => document.id === activeDocumentId) ?? documents[0];
  const meetingElapsedMs = meetingStartedAt
    ? Math.max(0, clockTick - new Date(meetingStartedAt).getTime())
    : 0;
  const meetingElapsed = new Date(meetingElapsedMs).toISOString().slice(11, 19);

  useEffect(() => {
    if (!meetingStartedAt) return;
    const id = window.setInterval(() => setClockTick(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [meetingStartedAt]);

  useEffect(() => {
    let cancelled = false;
    if (!trustStore) {
      return () => {
        cancelled = true;
      };
    }
    void verifyCaseEventLog(trustStore).then((verification) => {
      if (cancelled) return;
      setTrustStoreStatus(
        verification.ok
          ? `Trust ledger verified. Head ${verification.headHash?.slice(0, 18) ?? "empty"}...`
          : `Trust ledger failed at ${verification.eventId}: ${verification.reason}`,
      );
    });
    return () => {
      cancelled = true;
    };
  }, [trustStore]);

  useEffect(() => {
    return () => speechRecognitionRef.current?.abort();
  }, []);

  useEffect(() => {
    window.localStorage.removeItem(legacyPacketSigningKeyStorageKey);
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT";
      if (
        (event.key === "/" && !isTyping) ||
        ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k")
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
      if (event.altKey && event.key.toLowerCase() === "m") {
        event.preventDefault();
        setView("meeting");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function cloneTrustStore(store: ContentAddressedCaseStore) {
    return JSON.parse(JSON.stringify(store)) as ContentAddressedCaseStore;
  }

  async function writableTrustStore(actor = "sourcedeck") {
    return trustStore
      ? cloneTrustStore(trustStore)
      : createContentAddressedCaseStore(makeId("case"), actor, new Date().toISOString());
  }

  async function recordTrustEvent(input: {
    type: CaseStoreEvent["type"];
    actor: string;
    at?: string;
    targetId: string;
    payload: Record<string, unknown>;
  }) {
    const store = await writableTrustStore(input.actor);
    await appendCaseEvent(store, {
      id: `${store.caseId}:event:${store.events.length + 1}:${input.type}`,
      type: input.type,
      actor: input.actor,
      at: input.at ?? new Date().toISOString(),
      targetId: input.targetId,
      payload: input.payload,
    });
    setTrustStore(store);
  }

  const parsedSearch = useMemo(() => parseSearchCommand(query), [query]);
  const searchCorpus = parsedSearch.text.trim();
  const hasActiveSearch = Boolean(searchCorpus || parsedSearch.hasFilters);
  const searchFilterChips = useMemo(() => {
    const chips: string[] = [];
    parsedSearch.filters.document.forEach((value) => chips.push(`doc:${value}`));
    parsedSearch.filters.exhibit.forEach((value) => chips.push(`exhibit:${value}`));
    parsedSearch.filters.page.forEach((value) => chips.push(`page:${value}`));
    parsedSearch.filters.tag.forEach((value) => chips.push(`tag:${value}`));
    parsedSearch.filters.type.forEach((value) => chips.push(`type:${value}`));
    parsedSearch.filters.status.forEach((value) => chips.push(`status:${value}`));
    parsedSearch.filters.lane.forEach((value) => chips.push(`lane:${value}`));
    return chips;
  }, [parsedSearch]);

  const commandSearchHits = useMemo(() => {
    if (!hasActiveSearch) return [];
    const hits: CommandSearchHit[] = [];
    const filterOnly = !searchCorpus && parsedSearch.hasFilters;
    for (const document of documents) {
      for (const page of documentPagesForSearch(document)) {
        if (!page.text.trim()) continue;
        const haystack = [
          document.title,
          document.fileName,
          document.exhibit,
          document.type,
          document.author,
          document.status,
          document.tags.join(" "),
          page.text,
        ]
          .filter(Boolean)
          .join(" ");
        const pageScore = filterOnly
          ? { score: 0.28, matchedTerms: [] as string[], phraseExact: false }
          : scoreSearchText(searchCorpus, haystack);
        const lane = pageScore.phraseExact ? "exact" : "smart";
        if (
          !searchFiltersMatch(parsedSearch, {
            documentTitle: document.title,
            fileName: document.fileName,
            exhibit: document.exhibit,
            page: page.page,
            tags: document.tags,
            type: document.type,
            status: document.status,
            lane,
          })
        ) {
          continue;
        }
        const tier = filterOnly ? "far" : searchTier(pageScore.score, pageScore.phraseExact);
        if (!tier) continue;
        hits.push({
          id: `doc:${document.id}:page:${page.page}:${hits.length}`,
          lane,
          tier,
          score: pageScore.score,
          documentId: document.id,
          documentTitle: document.title,
          exhibit: document.exhibit,
          page: page.page,
          quote: sourceExcerpt(page.text, searchCorpus || document.title),
          snippet: sourceSnippet(page.text, searchCorpus || document.title),
          title: `${document.exhibit} page ${page.page}`,
          matchReason: filterOnly
            ? "Command filters matched this source page"
            : pageScore.phraseExact
              ? "Exact text appears on this source page"
              : "Smart fuzzy match across source page text",
          matchedTerms: pageScore.matchedTerms,
        });
      }
    }

    for (const card of evidence) {
      const source = documentById.get(card.documentId);
      const haystack = [
        card.title,
        card.category,
        card.quote,
        card.meaning,
        card.strategicUse,
        card.question,
        card.likelyDefense,
        card.counter,
        card.tags.join(" "),
        source?.title,
        source?.fileName,
        source?.exhibit,
        source?.type,
        source?.status,
        source?.tags.join(" "),
      ]
        .filter(Boolean)
        .join(" ");
      const evidenceScore = filterOnly
        ? { score: 0.34, matchedTerms: [] as string[], phraseExact: false }
        : scoreSearchText(searchCorpus, haystack);
      const lane = evidenceScore.phraseExact ? "exact" : "smart";
      if (
        source &&
        !searchFiltersMatch(parsedSearch, {
          documentTitle: source.title,
          fileName: source.fileName,
          exhibit: source.exhibit,
          page: card.page || 1,
          tags: Array.from(new Set([...source.tags, ...card.tags])),
          type: source.type,
          status: source.status,
          lane,
        })
      ) {
        continue;
      }
      const tier = filterOnly ? "far" : searchTier(evidenceScore.score, evidenceScore.phraseExact);
      if (!tier || !source) continue;
      hits.push({
        id: `card:${card.id}`,
        lane,
        tier,
        score: Math.min(1, evidenceScore.score + 0.08),
        documentId: card.documentId,
        documentTitle: source.title,
        exhibit: source.exhibit,
        page: card.page || 1,
        quote: card.quote,
        snippet: sourceSnippet(card.quote || card.meaning, searchCorpus || card.title, card.quote),
        title: card.title,
        matchReason: filterOnly
          ? "Command filters matched this existing evidence card"
          : evidenceScore.phraseExact
            ? "Exact match in existing evidence card"
            : "Smart match in evidence meaning, question, defense, or quote",
        matchedTerms: evidenceScore.matchedTerms,
        evidenceId: card.id,
      });
    }

    const byIdentity = new Map<string, CommandSearchHit>();
    for (const hit of hits) {
      const identity = `${hit.evidenceId ?? "source"}:${hit.documentId}:${hit.page}:${hit.quote}`;
      const current = byIdentity.get(identity);
      if (!current || hit.score > current.score) byIdentity.set(identity, hit);
    }
    return [...byIdentity.values()]
      .sort((left, right) => right.score - left.score || left.documentTitle.localeCompare(right.documentTitle))
      .slice(0, 80);
  }, [documentById, documents, evidence, hasActiveSearch, parsedSearch, searchCorpus]);

  const commandSearchGroups = useMemo((): CommandSearchGroup[] => {
    const groups = new Map<string, CommandSearchGroup>();
    for (const hit of commandSearchHits) {
      const document = documentById.get(hit.documentId);
      if (!document) continue;
      const group = groups.get(hit.documentId) ?? {
        document,
        topScore: hit.score,
        hits: [],
      };
      group.hits.push(hit);
      group.topScore = Math.max(group.topScore, hit.score);
      groups.set(hit.documentId, group);
    }
    return [...groups.values()].sort((left, right) => right.topScore - left.topScore);
  }, [commandSearchHits, documentById]);

  const commandSearchCounts = useMemo(
    () => ({
      top: commandSearchHits.filter((hit) => hit.tier === "top").length,
      middle: commandSearchHits.filter((hit) => hit.tier === "middle").length,
      far: commandSearchHits.filter((hit) => hit.tier === "far").length,
      exact: commandSearchHits.filter((hit) => hit.lane === "exact").length,
      smart: commandSearchHits.filter((hit) => hit.lane === "smart").length,
    }),
    [commandSearchHits],
  );

  const intelligenceMatchById = useMemo(() => {
    if (intelligenceQuery !== query) return new Map<string, IntelligenceSearchMatch>();
    return new Map(intelligenceMatches.map((match) => [match.candidateId, match]));
  }, [intelligenceMatches, intelligenceQuery, query]);

  const intelligenceCounts = useMemo(
    () => ({
      top: [...intelligenceMatchById.values()].filter((match) => match.tier === "top").length,
      middle: [...intelligenceMatchById.values()].filter((match) => match.tier === "middle").length,
      far: [...intelligenceMatchById.values()].filter((match) => match.tier === "far").length,
    }),
    [intelligenceMatchById],
  );

  const filteredEvidence = useMemo(() => {
    const sorted = [...evidence].sort(
      (left, right) =>
        priorityRank[right.priority] - priorityRank[left.priority] ||
        right.confidence - left.confidence,
    );
    if (!hasActiveSearch) return sorted;
    const matchingIds = new Set(
      commandSearchHits.map((hit) => hit.evidenceId).filter((id): id is string => Boolean(id)),
    );
    return sorted.filter((card) => matchingIds.has(card.id));
  }, [commandSearchHits, evidence, hasActiveSearch]);

  const filteredDocuments = useMemo(() => {
    if (!hasActiveSearch) return documents;
    const matchingIds = new Set(commandSearchHits.map((hit) => hit.documentId));
    return documents.filter((document) => matchingIds.has(document.id));
  }, [commandSearchHits, documents, hasActiveSearch]);

  const filteredMissingRecords = useMemo(() => {
    if (!searchCorpus) return parsedSearch.hasFilters ? [] : missingRecords;
    return missingRecords.filter((record) => {
      const score = scoreSearchText(
        searchCorpus,
        [
        record.requested,
        record.responsibleParty,
        record.relatedIssue,
        record.whyItMatters,
        record.followUp,
        ].join(" "),
      );
      return score.phraseExact || score.score >= 0.25;
    });
  }, [missingRecords, parsedSearch.hasFilters, searchCorpus]);

  const signoffAuditByCard = useMemo(
    () => new Map(activeSignoffAuditEntries.map((entry) => [entry.cardId, entry])),
    [activeSignoffAuditEntries],
  );

  const verificationQueue = useMemo<VerificationQueueItem[]>(() => {
    const stateRank: Record<VerificationQueueState, number> = {
      stale: 0,
      ready: 1,
      blocked: 2,
      verified: 3,
    };
    return filteredEvidence
      .map((card) => {
        const diagnostic = diagnoseEvidenceCard(sourceStackGraph, card.id);
        const audit = signoffAuditByCard.get(card.id);
        const status = cardVerificationStatus(card);
        const state: VerificationQueueState = audit?.stale
          ? "stale"
          : status === "verified" && diagnostic.packetEligible
            ? "verified"
            : diagnostic.packetEligible
              ? "ready"
              : "blocked";
        return {
          card,
          document: documentById.get(card.documentId),
          state,
          packetEligible: diagnostic.packetEligible,
          blockerCount: diagnostic.blockers.length,
          blockers: diagnostic.blockers,
          signedAt: audit?.at,
          reviewer: audit?.reviewer,
          staleReason: audit?.reason,
        };
      })
      .sort(
        (left, right) =>
          stateRank[left.state] - stateRank[right.state] ||
          priorityRank[right.card.priority] - priorityRank[left.card.priority] ||
          right.card.confidence - left.card.confidence,
      );
  }, [documentById, filteredEvidence, signoffAuditByCard, sourceStackGraph]);

  const verificationQueueCounts = useMemo(
    () => ({
      stale: verificationQueue.filter((item) => item.state === "stale").length,
      ready: verificationQueue.filter((item) => item.state === "ready").length,
      blocked: verificationQueue.filter((item) => item.state === "blocked").length,
      verified: verificationQueue.filter((item) => item.state === "verified").length,
    }),
    [verificationQueue],
  );

  const criticalEvidence = evidence
    .filter((card) => card.priority === "Critical" || card.priority === "High")
    .sort((left, right) => priorityRank[right.priority] - priorityRank[left.priority]);

  const packetEvidence = packetIds
    .map((id) => evidence.find((card) => card.id === id))
    .filter((card): card is EvidenceCard => Boolean(card));
  const packetGate = useMemo(() => {
    const failures = packetHardWallFailures(
      sourceStackGraph,
      packetEvidence.map((card) => card.id),
    );
    const blockedIds = new Set(
      failures.map((failure) => failure.cardId).filter((id): id is string => Boolean(id)),
    );
    return {
      failures,
      blockedIds,
      exportableCards: packetEvidence.filter((card) => !blockedIds.has(card.id)),
    };
  }, [packetEvidence, sourceStackGraph]);
  const packetFactoryRows = useMemo(
    () =>
      packetEvidence
        .map((card) => {
          const diagnostic = diagnoseEvidenceCard(sourceStackGraph, card.id);
          return {
            card,
            document: documentById.get(card.documentId),
            blocked: packetGate.blockedIds.has(card.id),
            blockers: diagnostic.blockers,
            packetEligible: diagnostic.packetEligible,
          };
        })
        .sort(
          (left, right) =>
            Number(right.blocked) - Number(left.blocked) ||
            priorityRank[right.card.priority] - priorityRank[left.card.priority] ||
            right.card.confidence - left.card.confidence,
        ),
    [documentById, packetEvidence, packetGate.blockedIds, sourceStackGraph],
  );
  const packetFactoryCounts = useMemo(
    () => ({
      selected: packetEvidence.length,
      exportable: packetGate.exportableCards.length,
      blocked: packetGate.blockedIds.size,
      pendingReview: packetFactoryRows.filter(
        (row) => !row.packetEligible && cardVerificationStatus(row.card) !== "verified",
      ).length,
    }),
    [packetEvidence.length, packetFactoryRows, packetGate.blockedIds.size, packetGate.exportableCards.length],
  );

  const agreementRisks = useMemo(() => {
    const checks = [
      {
        phrase: "gradually",
        risk: "No measurable timeline.",
        fix: "Replace with an exact uptime target and a date-certain remediation schedule.",
      },
      {
        phrase: "as appropriate",
        risk: "Decision standard is vague.",
        fix: "Name who decides, what data controls the decision, and when review occurs.",
      },
      {
        phrase: "resolved all issues",
        risk: "Could waive unresolved claims.",
        fix: "Limit resolution language to named issues only.",
      },
      {
        phrase: "release",
        risk: "May release claims beyond the intended agreement.",
        fix: "Review release scope before signing and carve out unknown claims.",
      },
      {
        phrase: "confidential",
        risk: "Confidentiality may restrict disclosure or record sharing.",
        fix: "Preserve rights to share with counsel, auditors, regulators, and required reviewers.",
      },
      {
        phrase: "as tolerated",
        risk: "Service levels can remain best-effort without objective criteria.",
        fix: "Define acceptance criteria, review dates, and a fallback remediation obligation.",
      },
    ];
    const text = agreementText.toLowerCase();
    return checks.filter((check) => text.includes(check.phrase));
  }, [agreementText]);

  const completeness = useMemo(() => {
    const haystack = [
      ...documents.map((document) =>
        [document.title, document.type, document.tags.join(" ")].join(" ").toLowerCase(),
      ),
      ...missingRecords.map((record) => record.requested.toLowerCase()),
    ].join(" ");
    const rows = requiredRecordTypes.map((type) => {
      const lower = type.toLowerCase();
      const missing = missingRecords.find((record) =>
        record.requested.toLowerCase().includes(lower.replace(" logs", "")),
      );
      const present = haystack.includes(lower) || haystack.includes(lower.replace(" logs", ""));
      return {
        type,
        status: present && missing?.status !== "Missing" ? "Present" : missing?.status ?? (present ? "Present" : "Missing"),
      };
    });
    const presentCount = rows.filter((row) => row.status === "Present" || row.status === "Produced").length;
    return {
      rows,
      score: Math.round((presentCount / rows.length) * 100),
    };
  }, [documents, missingRecords]);

  // Meeting-readiness status (separate from the SourceStack signoff gate). Cards in the case deck
  // already passed exact-quote verification, so non-hold/non-review cards are LIVE for the meeting.
  const meetingReadiness = useMemo(() => {
    const live = evidence.filter((c) => (c.meetingStatus ?? "live") === "live").length;
    const hold = evidence.filter((c) => c.meetingStatus === "hold").length;
    const review = evidence.filter((c) => c.meetingStatus === "review").length;
    return { live, hold, review };
  }, [evidence]);

  const contradictions = useMemo(() => {
    const baseline = evidence.filter((card) =>
      `${card.category} ${card.quote}`.toLowerCase().match(/baseline|30 hours|will receive|service plan/),
    );
    const nonDelivery = evidence.filter((card) =>
      `${card.category} ${card.quote}`.toLowerCase().match(/not provided|not able|not been able|45 minutes|as tolerated|reduced/),
    );
    const rows: Array<{
      id: string;
      type: string;
      statementA: EvidenceCard;
      statementB: EvidenceCard;
      finding: string;
    }> = [];

    baseline.forEach((left) => {
      nonDelivery.forEach((right) => {
        if (left.id === right.id) return;
        rows.push({
          id: `${left.id}_${right.id}`,
          type: right.quote.toLowerCase().includes("not") ? "Promised vs delivered" : "Baseline vs actual access",
          statementA: left,
          statementB: right,
          finding:
            right.quote.toLowerCase().includes("not")
              ? "The deck contains one record describing expected services and another saying services were not being delivered."
              : "The deck contains a baseline service level and a later access limit that appears materially lower.",
        });
      });
    });

    return rows.slice(0, 8);
  }, [evidence]);

  const sourceAudit = useMemo(() => {
    const rows: AuditRow[] = [];

    documents.forEach((document) => {
      if (document.status !== "Indexed") {
        rows.push({
          id: `doc_${document.id}`,
          severity: document.status === "Needs OCR" ? "Critical" : "High",
          title: `${document.exhibit} needs source review`,
          detail: document.warning ?? `${document.title} is marked ${document.status}.`,
          targetView: "documents",
          documentId: document.id,
        });
      }
    });

    evidence.forEach((card) => {
      const source = documentById.get(card.documentId);
      const diagnostic = diagnoseEvidenceCard(sourceStackGraph, card.id);
      if (!source) {
        rows.push({
          id: `missing_source_${card.id}`,
          severity: "Critical",
          title: `${card.title} is not linked to a document`,
          detail: "Evidence cards need a source document before they are meeting-ready.",
          targetView: "evidence",
          evidenceId: card.id,
        });
      }
      if (!card.quote.trim() || card.quote.length < 24) {
        rows.push({
          id: `weak_quote_${card.id}`,
          severity: "High",
          title: `${card.title} needs a stronger exact quote`,
          detail: "The card should carry the quote someone can read out loud in the room.",
          targetView: "evidence",
          evidenceId: card.id,
        });
      }
      if (!card.page) {
        rows.push({
          id: `missing_page_${card.id}`,
          severity: "High",
          title: `${card.title} is missing a page anchor`,
          detail: "Add the page before using this as a formal exhibit reference.",
          targetView: "evidence",
          evidenceId: card.id,
        });
      }
      if (card.confidence < 70) {
        rows.push({
          id: `low_confidence_${card.id}`,
          severity: "Medium",
          title: `${card.title} has low confidence`,
          detail: `Confidence is ${card.confidence}%. Validate the quote and source context.`,
          targetView: "evidence",
          evidenceId: card.id,
        });
      }
      if (!diagnostic.packetEligible) {
        rows.push({
          id: `source_chain_${card.id}`,
          severity: diagnostic.verificationStatus === "verified" ? "Critical" : "High",
          title: `${card.title} fails SourceStack packet proof`,
          detail:
            diagnostic.blockers[0] ??
            "Packet Factory can only export evidence cards that pass the verified source-chain gate.",
          targetView: "evidence",
          evidenceId: card.id,
        });
      }
    });

    bitemporalContradictions.forEach((contradiction) => {
      rows.push({
        id: `bitemporal_${contradiction.id}`,
        severity: "High",
        title: `Bitemporal contradiction on ${contradiction.validDate}`,
        detail: `${contradiction.entityKey}: ${contradiction.positiveEventIds.join(", ")} conflicts with ${contradiction.negativeEventIds.join(", ")}.`,
        targetView: "issues",
      });
    });

    missingRecords
      .filter((record) => record.status === "Missing")
      .forEach((record) => {
        rows.push({
          id: `missing_record_${record.id}`,
          severity: "Medium",
          title: `${record.requested} still missing`,
          detail: record.followUp,
          targetView: "timeline",
        });
      });

    return rows.sort(
      (left, right) => priorityRank[right.severity] - priorityRank[left.severity],
    );
  }, [
    bitemporalContradictions,
    documents,
    documentById,
    evidence,
    missingRecords,
    sourceStackGraph,
  ]);

  function getPacketExportSet(cards: EvidenceCard[]) {
    const graph = buildLegacySourceGraph(sourceStackDocuments, cards);
    const failures = packetHardWallFailures(
      graph,
      cards.map((card) => card.id),
    );
    const blockedIds = new Set(
      failures.map((failure) => failure.cardId).filter((id): id is string => Boolean(id)),
    );
    return {
      exportableCards: cards.filter((card) => !blockedIds.has(card.id)),
      blockedIds,
      failures,
    };
  }

  function buildPacketHardWallMarkdown(
    failures: ReturnType<typeof packetHardWallFailures>,
    packetTitle = "SourceDeck Evidence Packet",
  ) {
    const blockedIds = new Set(
      failures.map((failure) => failure.cardId).filter((id): id is string => Boolean(id)),
    );
    const lines = [
      `# ${packetTitle} - Hard-Wall Report`,
      "",
      `Case: ${caseProfile.name}`,
      `Generated: ${new Date().toLocaleString()}`,
      `Blocked selected cards: ${blockedIds.size}`,
      "",
      "SourceDeck did not export an evidence packet because at least one selected factual card failed the verified source-chain gate.",
      "",
      "## Failures",
      ...failures.map(
        (failure, index) =>
          `${index + 1}. ${failure.cardId ?? "unknown card"}: ${failure.reason}`,
      ),
      "",
    ];
    return lines.join("\n");
  }

  function buildPacketMarkdown(cards = packetEvidence, packetTitle = "SourceDeck Evidence Packet") {
    const { exportableCards, blockedIds, failures } = getPacketExportSet(cards);
    if (failures.length) {
      return buildPacketHardWallMarkdown(failures, packetTitle);
    }
    const lines = [
      `# ${packetTitle}`,
      "",
      `Case: ${caseProfile.name}`,
      `Role: ${caseProfile.role}`,
      `Objective: ${caseProfile.objective}`,
      `Meeting date: ${caseProfile.meetingDate || "Not set"}`,
      "",
      `Generated: ${new Date().toLocaleString()}`,
      `Meeting type: ${meetingType}`,
      `Verified evidence exported: ${exportableCards.length}`,
      `Blocked selected items: ${blockedIds.size}`,
      "",
      "## Issue Summary",
      activeIssue
        ? `${activeIssue.title}: ${activeIssue.description}`
        : "No active issue selected.",
      "",
      "## Evidence",
    ];

    if (!exportableCards.length) {
      lines.push(
        "",
        "No verified, source-resolved evidence cards were selected. Packet Factory blocked every unverified factual card.",
      );
    }

    exportableCards.forEach((card, index) => {
      const source = documentById.get(card.documentId);
      lines.push(
        "",
        `### ${index + 1}. ${card.title}`,
        "",
        `Priority: ${card.priority}`,
        `Source: ${source?.exhibit ?? "Unlabeled"} - ${source?.title ?? "Unknown source"}`,
        `Page: ${card.page || "Record request / pending"}`,
        `Confidence: ${card.confidence}%`,
        "",
        "Quote:",
        `> ${card.quote}`,
        "",
        `Why it matters: ${card.meaning}`,
        "",
        `Question: ${card.question}`,
        "",
        `Likely defense: ${card.likelyDefense}`,
        "",
        `Counter: ${card.counter}`,
      );
    });

    if (failures.length) {
      lines.push("", "## Packet Hard Wall");
      failures.forEach((failure, index) => {
        lines.push(
          `${index + 1}. ${failure.cardId ?? "unknown card"} blocked: ${failure.reason}`,
        );
      });
    }

    lines.push("", "## Missing Records");
    missingRecords.forEach((record) => {
      lines.push(
        "",
        `- ${record.requested} (${record.status}): ${record.whyItMatters} Follow-up: ${record.followUp}`,
      );
    });

    lines.push("", "## Meeting Notes");
    if (meetingNotes.length === 0) {
      lines.push("No meeting notes logged yet.");
    } else {
      meetingNotes.forEach((note) => {
        lines.push(
          "",
          `- ${note.timestamp} - ${note.kind} - ${note.topic}: ${note.note} Follow-up: ${note.followUp}`,
        );
      });
    }

    return lines.join("\n");
  }

  async function exportPacketManifest() {
    const graph = buildLegacySourceGraph(sourceStackDocuments, packetEvidence);
    const result = await assembleEvidencePacket(graph, {
      id: makeId("packet"),
      type: meetingType,
      cardIds: packetEvidence.map((card) => card.id),
      redactionOperations: redactionTerms
        .split(/\n|,/)
        .map((term) => term.trim())
        .filter(Boolean),
      issuerIdentity: caseProfile.role,
    });

    if (!result.ok) {
      const blockedIds = new Set(
        result.failures.map((failure) => failure.cardId).filter((id): id is string => Boolean(id)),
      );
      const lines = [
        "# SourceDeck Packet Hard-Wall Report",
        "",
        `Case: ${caseProfile.name}`,
        `Generated: ${new Date().toLocaleString()}`,
        `Blocked selected cards: ${blockedIds.size}`,
        "",
        "Packet manifest was not created because SourceStack refuses to serialize unverified or unresolved factual evidence.",
        "",
        "## Failures",
        ...result.failures.map(
          (failure, index) =>
            `${index + 1}. ${failure.cardId ?? "unknown card"}: ${failure.reason}`,
        ),
        "",
      ];
      downloadText("sourcedeck-packet-hard-wall-report.md", lines.join("\n"), "text/markdown");
      setPrivacyStatus("Manifest blocked. A hard-wall report was exported instead.");
      return;
    }

    let custody: PacketSigningKeyCustody;
    try {
      custody = await getPacketSigningKeyForManifest(workspacePassphrase);
    } catch (error) {
      setPrivacyStatus(
        `Manifest signing key custody failed: ${
          error instanceof Error ? error.message : "could not unlock key"
        }`,
      );
      return;
    }
    const signedManifest = await signPacketManifestWithStoredKey(result.manifest, custody.key, {
      keyCustodyHash: custody.keyCustodyHash,
      keyCustodyFormat: custody.keyCustodyFormat,
    });
    downloadText(
      "sourcedeck-packet-manifest.json",
      serializePacketManifest(signedManifest),
      "application/json",
    );
    setPrivacyStatus(
      `${custody.status} Manifest exported. Your signer fingerprint (share with recipients so they can verify it came from you): ${keyFingerprint(
        custody.key.keyId,
      )}`,
    );
    const packetLedger = await writableTrustStore("packet-factory");
    if (custody.custodyEvent) {
      await appendCaseEvent(packetLedger, {
        id: `${packetLedger.caseId}:event:${packetLedger.events.length + 1}:${
          custody.custodyEvent.type
        }`,
        type: custody.custodyEvent.type,
        actor: "packet-factory",
        at: new Date().toISOString(),
        targetId: custody.custodyEvent.targetId,
        payload: custody.custodyEvent.payload,
      });
    }
    await appendCaseEvent(packetLedger, {
      id: `${packetLedger.caseId}:event:${packetLedger.events.length + 1}:packet_exported`,
      type: "packet_exported",
      actor: "packet-factory",
      at: new Date().toISOString(),
      targetId: signedManifest.packetId,
      payload: {
        manifestHash: signedManifest.manifestHash,
        packetHash: signedManifest.packetHash,
        publicKeyId: signedManifest.cryptographicSignature?.publicKeyId,
        keyCustodyHash: signedManifest.cryptographicSignature?.keyCustodyHash,
        keyCustodyFormat: signedManifest.cryptographicSignature?.keyCustodyFormat,
        custodyStatus: custody.status,
        cardIds: signedManifest.includedEvidenceCardIds,
      },
    });
    setTrustStore(packetLedger);
  }

  async function verifyImportedManifest(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setPendingTrustSigner(null);
    try {
      const manifest = JSON.parse(await file.text()) as PacketManifest;
      const result = await verifyPacketManifest(sourceStackGraph, manifest);
      if (!result.ok) {
        setManifestStatus(`Manifest failed verification: ${result.failures.join("; ")}`);
        return;
      }
      if (!manifest.cryptographicSignature) {
        setManifestStatus(`Manifest verified. Hash: ${result.manifestHash}`);
        return;
      }
      const signature = await verifyPacketManifestAgainstRegistry(manifest, trustRegistry);
      if (!signature.ok) {
        setManifestStatus(`Manifest hash verified, but signature failed: ${signature.reason}`);
        return;
      }
      if (signature.trusted) {
        setManifestStatus(
          `Manifest verified. Signed by TRUSTED signer ${
            signature.signer?.label ?? ""
          } — fingerprint ${signature.fingerprint}`,
        );
      } else {
        setManifestStatus(
          `Manifest verified. Signature is valid but the signer is UNKNOWN. Compare this fingerprint out-of-band before trusting: ${signature.fingerprint}`,
        );
        setPendingTrustSigner({ keyId: signature.keyId, fingerprint: signature.fingerprint });
      }
    } catch (error) {
      setManifestStatus(
        `Manifest verification failed: ${error instanceof Error ? error.message : "invalid JSON"}`,
      );
    }
  }

  async function buildCurrentSourceStackBundle() {
    const sourceArtifacts = documents
      .map((document) => document.sourceArtifact)
      .filter((artifact): artifact is DurableSourceArtifact => Boolean(artifact));
    const sourceVaultManifests = documents
      .filter(
        (document) =>
          document.sourceVaultVerified &&
          document.sourceVaultManifest &&
          sourceVaultManifestHasPayloads(document.sourceVaultManifest),
      )
      .map((document) => document.sourceVaultManifest)
      .filter((manifest): manifest is SourceVaultManifest => Boolean(manifest));
    // Sign the trust-ledger head so the exported bundle carries an anchored, ECDSA-signed head.
    // A recipient (or the in-app verifier) can then detect a wholesale re-chained ledger, which a
    // bare hash chain cannot. Falls back to no anchor if signing-key custody is unavailable.
    let ledgerSigningKey: StoredPacketSigningKey | undefined;
    if (trustStore) {
      try {
        ledgerSigningKey = (await getPacketSigningKeyForManifest(workspacePassphrase)).key;
      } catch {
        ledgerSigningKey = undefined;
      }
    }
    const bundle = await createSourceStackForensicBundle(sourceStackGraph, {
      caseName: caseProfile.name,
      packetCardIds: packetEvidence.map((card) => card.id),
      sourceArtifacts,
      sourceVaultManifests,
      caseStore: trustStore ?? undefined,
      ledgerSigningKey,
    });
    return { bundle, sourceArtifacts, sourceVaultManifests };
  }

  async function recordBundleExport(
    bundle: SourceStackForensicBundle,
    sourceArtifacts: DurableSourceArtifact[],
    sourceVaultManifests: SourceVaultManifest[],
    encrypted: boolean,
  ) {
    const bundleLedger = await writableTrustStore("bundle-factory");
    await appendCaseEvent(bundleLedger, {
      id: `${bundleLedger.caseId}:event:${bundleLedger.events.length + 1}:bundle_exported`,
      type: "bundle_exported",
      actor: "bundle-factory",
      at: new Date().toISOString(),
      targetId: bundle.bundleHash,
      payload: {
        bundleHash: bundle.bundleHash,
        graphHash: bundle.graphHash,
        encrypted,
        sourceArtifacts: sourceArtifacts.length,
        sourceVaults: sourceVaultManifests.length,
        sourceVaultPageImages: sourceVaultManifests.reduce(
          (sum, manifest) => sum + manifest.pageImages.length,
          0,
        ),
        includesSourceVaultPayloads: sourceVaultManifests.length > 0,
      },
    });
    setTrustStore(bundleLedger);
  }

  async function exportSourceStackBundle() {
    const { bundle, sourceArtifacts, sourceVaultManifests } =
      await buildCurrentSourceStackBundle();
    downloadText(
      "sourcedeck-sourcestack-bundle.json",
      JSON.stringify(bundle, null, 2),
      "application/json",
    );
    await recordBundleExport(bundle, sourceArtifacts, sourceVaultManifests, false);
    setPrivacyStatus(
      `SourceStack forensic bundle exported. Hash ${bundle.bundleHash.slice(0, 18)}... ${
        sourceVaultManifests.length
          ? "Bundle includes original source-vault payloads; use encrypted workspace export for private handoff."
          : ""
      }`,
    );
  }

  async function exportEncryptedSourceStackBundle() {
    if (!workspacePassphrase.trim()) {
      setPrivacyStatus("Enter a passphrase before encrypted SourceStack bundle export.");
      return;
    }
    const { bundle, sourceArtifacts, sourceVaultManifests } =
      await buildCurrentSourceStackBundle();
    const encrypted = await encryptJsonPayload(
      "sourcedeck.sourcestack-bundle.encrypted.v1",
      workspacePassphrase,
      bundle,
    );
    const payload: EncryptedSourceStackBundlePayload = {
      ...encrypted,
      plaintextFormat: bundle.format,
      bundleHash: bundle.bundleHash,
      graphHash: bundle.graphHash,
      bundleGeneratedAt: bundle.generatedAt,
      caseName: caseProfile.name,
      counts: bundle.counts,
      includesSourceVaultPayloads: sourceVaultManifests.length > 0,
    };
    downloadText(
      "sourcedeck-sourcestack-bundle.encrypted.json",
      JSON.stringify(payload, null, 2),
      "application/json",
    );
    await recordBundleExport(bundle, sourceArtifacts, sourceVaultManifests, true);
    setPrivacyStatus(
      `Encrypted SourceStack forensic bundle exported. Public hash ${bundle.bundleHash.slice(
        0,
        18,
      )}...`,
    );
  }

  async function verifyImportedSourceStackBundle(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    try {
      const bundle = JSON.parse(await file.text()) as SourceStackForensicBundle;
      const result = await verifySourceStackForensicBundle(bundle);
      if (result.ok) {
        let signerNote = "";
        if (bundle.caseLedgerAnchor) {
          const fingerprint = keyFingerprint(bundle.caseLedgerAnchor.publicKeyId);
          const signer = findTrustedSigner(trustRegistry, bundle.caseLedgerAnchor.publicKeyId);
          signerNote = signer
            ? ` Ledger head signed by TRUSTED ${signer.label} (${fingerprint}).`
            : ` Ledger head signer is UNKNOWN — fingerprint ${fingerprint}.`;
        }
        setPrivacyStatus(
          `SourceStack bundle verified. Graph ${result.graphHash.slice(0, 18)}... bundle ${result.bundleHash.slice(0, 18)}...${signerNote}`,
        );
        return;
      }
      setPrivacyStatus(`SourceStack bundle failed verification: ${result.failures.join("; ")}`);
    } catch (error) {
      setPrivacyStatus(
        `SourceStack bundle verification failed: ${
          error instanceof Error ? error.message : "invalid JSON"
        }`,
      );
    }
  }

  async function verifyImportedEncryptedSourceStackBundle(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!workspacePassphrase.trim()) {
      setPrivacyStatus("Enter the passphrase before encrypted SourceStack bundle verification.");
      return;
    }
    try {
      const payload = JSON.parse(await file.text()) as EncryptedSourceStackBundlePayload;
      if (payload.format !== "sourcedeck.sourcestack-bundle.encrypted.v1") {
        throw new Error("unsupported encrypted SourceStack bundle format");
      }
      const bundle = await decryptJsonPayload<SourceStackForensicBundle>(
        payload,
        workspacePassphrase,
      );
      const metadataFailures = [
        payload.plaintextFormat !== bundle.format ? "plaintext format mismatch" : "",
        payload.bundleHash !== bundle.bundleHash ? "public bundle hash mismatch" : "",
        payload.graphHash !== bundle.graphHash ? "public graph hash mismatch" : "",
        payload.bundleGeneratedAt !== bundle.generatedAt ? "public generated-at mismatch" : "",
      ].filter(Boolean);
      const result = await verifySourceStackForensicBundle(bundle);
      if (result.ok && metadataFailures.length === 0) {
        setPrivacyStatus(
          `Encrypted SourceStack bundle decrypted and verified. Bundle ${result.bundleHash.slice(
            0,
            18,
          )}...`,
        );
        return;
      }
      setPrivacyStatus(
        `Encrypted SourceStack bundle failed verification: ${[
          ...metadataFailures,
          ...(result.ok ? [] : result.failures),
        ].join("; ")}`,
      );
    } catch (error) {
      setPrivacyStatus(
        `Encrypted SourceStack bundle verification failed: ${
          error instanceof Error ? error.message : "wrong passphrase or invalid file"
        }`,
      );
    }
  }

  function redactionTermList() {
    return redactionTerms
      .split(/\n|,/)
      .map((term) => term.trim())
      .filter(Boolean)
      .sort((left, right) => right.length - left.length);
  }

  async function exportRedactedPacket() {
    const sourceArtifacts = documents
      .map((document) => document.sourceArtifact)
      .filter((artifact): artifact is DurableSourceArtifact => Boolean(artifact));
    const packetGate = getPacketExportSet(packetEvidence);
    if (packetGate.failures.length) {
      const report = buildPacketHardWallMarkdown(
        packetGate.failures,
        "SourceDeck Redacted Evidence Packet",
      );
      setPrivacyStatus(
        "Redacted packet blocked. Selected evidence failed the verified source-chain gate.",
      );
      await recordTrustEvent({
        type: "security_finding",
        actor: "packet-factory",
        targetId: "sourcedeck-redacted-packet-hard-wall-report.md",
        payload: {
          blockedRedactedPacketExport: true,
          reason: "packet hard wall",
          packetCardIds: packetEvidence.map((card) => card.id),
          failures: packetGate.failures,
        },
      });
      downloadText(
        "sourcedeck-redacted-packet-hard-wall-report.md",
        report,
        "text/markdown",
      );
      return;
    }
    const result = redactSourceBackedPacketForExport(
      buildPacketMarkdown(packetGate.exportableCards),
      sourceArtifacts,
      {
        manualTerms: redactionTermList(),
        allowedQuotes: packetGate.exportableCards.map((card) => card.quote),
      },
    );
    if (result.ok) {
      const categoryCounts = result.tokens.reduce<Record<string, number>>((counts, token) => {
        counts[token.category] = (counts[token.category] ?? 0) + 1;
        return counts;
      }, {});
      const categorySummary = Object.entries(categoryCounts)
        .map(([category, count]) => `${category}:${count}`)
        .join(", ");
      setPrivacyStatus(
        `Redaction bridge applied ${result.tokens.length} token(s)${
          categorySummary ? ` (${categorySummary})` : ""
        } with no residual or source-disclosure leaks detected.`,
      );
      await recordTrustEvent({
        type: "redaction_applied",
        actor: "packet-factory",
        targetId: "sourcedeck-redacted-packet.md",
        payload: {
          packetCardIds: packetEvidence.map((card) => card.id),
          sourceArtifactIds: sourceArtifacts.map((artifact) => artifact.artifactId),
          tokensApplied: result.tokens.length,
          categories: categorySummary,
          sourceLeaks: 0,
        },
      });
      downloadText("sourcedeck-redacted-packet.md", result.redactedText, "text/markdown");
      return;
    }
    setPrivacyStatus(
      `Redaction hard wall blocked export: ${result.residualLeaks.length} residual and ${
        result.sourceLeaks?.length ?? 0
      } source-disclosure leak(s).`,
    );
    await recordTrustEvent({
      type: "security_finding",
      actor: "packet-factory",
      targetId: "sourcedeck-redaction-hard-wall-report.md",
      payload: {
        blockedRedactedPacketExport: true,
        packetCardIds: packetEvidence.map((card) => card.id),
        sourceArtifactIds: sourceArtifacts.map((artifact) => artifact.artifactId),
        residualLeaks: result.residualLeaks,
        sourceLeaks: result.sourceLeaks ?? [],
      },
    });
    downloadText(
      "sourcedeck-redaction-hard-wall-report.md",
      result.report,
      "text/markdown",
    );
  }

  function createIssueFromSearch() {
    const title = query.trim() || "Search-built issue";
    const evidenceIds = filteredEvidence.slice(0, 8).map((card) => card.id);
    if (!evidenceIds.length) return;
    const issue: Issue = {
      id: makeId("issue"),
      title,
      description: `Issue assembled from ${evidenceIds.length} evidence card${
        evidenceIds.length === 1 ? "" : "s"
      } matching "${title}".`,
      evidenceIds,
      status: "Open",
      meetingPriority: issues.length + 1,
    };
    setIssues((current) => [issue, ...current]);
    setActiveIssueId(issue.id);
    setPacketIds((current) => Array.from(new Set([...evidenceIds, ...current])));
    setView("issues");
  }

  function applyCaseTemplate(template: CaseTemplate) {
    const createdIssues: Issue[] = template.issues.map((issue, index) => ({
      id: makeId("issue"),
      title: issue.title,
      description: issue.description,
      evidenceIds: filteredEvidence.slice(0, 4).map((card) => card.id),
      status: "Open",
      meetingPriority: index + 1,
    }));
    const createdRecords: MissingRecord[] = template.missingRecords.map((record) => ({
      id: makeId("mr"),
      requested: record.requested,
      dateRequested: new Date().toISOString().slice(0, 10),
      responsibleParty: "To assign",
      status: "Missing",
      relatedIssue: template.title,
      whyItMatters: record.whyItMatters,
      followUp: record.followUp,
    }));
    setMeetingType(template.meetingType);
    setIssues((current) => [...createdIssues, ...current]);
    setMissingRecords((current) => [...createdRecords, ...current]);
    setActiveIssueId(createdIssues[0]?.id ?? activeIssueId);
  }

  function startVoiceQuery() {
    const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (isListening) {
      speechRecognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      setIsListening(false);
      setVoiceStatus("Voice stopped.");
      return;
    }

    if (!Recognition) {
      void startSidecarVoiceQuery();
      return;
    }

    const recognition = new Recognition();
    speechRecognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript.trim();
      if (!transcript) {
        setVoiceStatus("No speech captured. Try again or type the query.");
        return;
      }
      setQuery(transcript);
      setView("search");
      setVoiceStatus(`Dictated search: "${transcript}"`);
      window.setTimeout(() => searchInputRef.current?.focus(), 0);
    };

    recognition.onerror = (event) => {
      setVoiceStatus(`Native voice error: ${event.error || "unknown"}. Trying GPT sidecar.`);
      setIsListening(false);
      void startSidecarVoiceQuery();
    };

    recognition.onend = () => {
      setIsListening(false);
      speechRecognitionRef.current = null;
    };

    try {
      setIsListening(true);
      setVoiceStatus("Listening with browser dictation...");
      recognition.start();
    } catch (error) {
      setIsListening(false);
      setVoiceStatus(
        `Native voice could not start: ${
          error instanceof Error ? error.message : "unknown error"
        }. Trying GPT sidecar.`,
      );
      void startSidecarVoiceQuery();
    }
  }

  async function transcribeWithSidecar(audio: Blob) {
    const response = await fetch("http://127.0.0.1:4317/transcribe", {
      method: "POST",
      headers: {
        "Content-Type": audio.type || "audio/webm",
        "X-SourceDeck-File": "sourcedeck-voice.webm",
      },
      body: audio,
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `speech sidecar returned ${response.status}`);
    }
    const payload = (await response.json()) as { text?: string };
    const text = payload.text?.trim();
    if (!text) throw new Error("speech sidecar returned an empty transcript");
    return text;
  }

  async function startSidecarVoiceQuery() {
    if (isListening) {
      mediaRecorderRef.current?.stop();
      setIsListening(false);
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceStatus(
        "Speech capture needs microphone permissions and MediaRecorder. Use Chrome/Edge or run OS dictation into the search box.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      voiceChunksRef.current = [];
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) voiceChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const audio = new Blob(voiceChunksRef.current, { type: mimeType });
        voiceChunksRef.current = [];
        mediaRecorderRef.current = null;
        setIsListening(false);
        setVoiceStatus("Transcribing with local GPT speech sidecar...");
        void transcribeWithSidecar(audio)
          .then((transcript) => {
            setQuery(transcript);
            setView("search");
            setVoiceStatus(`GPT transcript search: "${transcript}"`);
            window.setTimeout(() => searchInputRef.current?.focus(), 0);
          })
          .catch((error) => {
            setVoiceStatus(
              `GPT speech sidecar unavailable: ${
                error instanceof Error ? error.message : "unknown error"
              }. Run npm run speech:sidecar with OPENAI_API_KEY, or use browser dictation.`,
            );
          });
      };
      recorder.start();
      setIsListening(true);
      setVoiceStatus("Recording for GPT transcription sidecar. Click Voice again to stop.");
    } catch (error) {
      setIsListening(false);
      setVoiceStatus(
        `Microphone capture failed: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  async function runIntelligenceSearch() {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      setIntelligenceStatus("Type a query before running the CLI intelligence lane.");
      return;
    }
    if (commandSearchHits.length === 0) {
      setIntelligenceStatus("Run exact/smart search first; no bounded candidates exist.");
      return;
    }
    const request = buildBoundedIntelligenceSearchRequest(
      trimmedQuery,
      commandSearchHits.map((hit) => ({
        id: hit.id,
        title: hit.title,
        documentTitle: hit.documentTitle,
        exhibit: hit.exhibit,
        page: hit.page,
        excerpt: hit.quote || hit.snippet,
        deterministicTier: hit.tier,
        deterministicScore: hit.score,
        matchedTerms: hit.matchedTerms,
      })),
    );
    setIntelligenceStatus("Calling local CLI intelligence sidecar...");
    try {
      const response = await fetch("http://127.0.0.1:4318/smart-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      const payload = await response.json();
      if (!response.ok) {
        setIntelligenceStatus(
          `CLI intelligence unavailable: ${String(payload.error ?? response.status)}`,
        );
        return;
      }
      const validated = validateIntelligenceSearchResponse(payload, request);
      if (!validated.ok) {
        setIntelligenceStatus(`CLI intelligence rejected: ${validated.reason}`);
        return;
      }
      setIntelligenceQuery(trimmedQuery);
      setIntelligenceMatches(validated.response.matches);
      setIntelligenceStatus(
        `CLI intelligence ranked ${validated.response.matches.length} candidate${
          validated.response.matches.length === 1 ? "" : "s"
        }${validated.response.model ? ` via ${validated.response.model}` : ""}.`,
      );
    } catch (error) {
      setIntelligenceStatus(
        `CLI intelligence sidecar unavailable: ${
          error instanceof Error ? error.message : "unknown error"
        }. Run npm run smart-search:sidecar with a configured CLI command.`,
      );
    }
  }

  async function checkSearchSidecars() {
    const [speechResult, smartResult] = await Promise.allSettled([
      fetch("http://127.0.0.1:4317/health").then((response) => response.json()),
      fetch("http://127.0.0.1:4318/health").then((response) => response.json()),
    ]);
    if (speechResult.status === "fulfilled" && speechResult.value?.format) {
      setVoiceStatus(
        `Speech sidecar online (${String(speechResult.value.model ?? "unknown model")}, ${
          speechResult.value.hasApiKey ? "API key present" : "missing API key"
        }).`,
      );
    } else {
      setVoiceStatus("Speech sidecar offline. Run npm run speech:sidecar.");
    }
    if (smartResult.status === "fulfilled" && smartResult.value?.format) {
      const args = Array.isArray(smartResult.value.args)
        ? smartResult.value.args.join(" ")
        : "";
      setIntelligenceStatus(
        `CLI intelligence sidecar online (${String(smartResult.value.command ?? "command")} ${args}`.trim() +
          ").",
      );
    } else {
      setIntelligenceStatus("CLI intelligence sidecar offline. Run npm run smart-search:sidecar.");
    }
  }

  function buildPacketCsv(cards = packetEvidence) {
    const { exportableCards, failures } = getPacketExportSet(cards);
    if (failures.length) {
      const header = ["blocked_card_id", "reason"];
      const rows = failures.map((failure) =>
        [failure.cardId ?? "unknown", failure.reason].map(csvCell),
      );
      return [header.map(csvCell).join(","), ...rows.map((row) => row.join(","))].join("\n");
    }
    const header = [
      "title",
      "priority",
      "category",
      "source",
      "exhibit",
      "page",
      "quote",
      "question",
      "confidence",
    ];
    const rows = exportableCards.map((card) => {
      const source = documentById.get(card.documentId);
      return [
        card.title,
        card.priority,
        card.category,
        source?.title ?? "",
        source?.exhibit ?? "",
        String(card.page || ""),
        card.quote,
        card.question,
        String(card.confidence),
      ].map(csvCell);
    });
    return [header.map(csvCell).join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  function buildExhibitIndexMarkdown() {
    const lines = [
      "# SourceDeck Exhibit Index",
      "",
      `Case: ${caseProfile.name}`,
      `Generated: ${new Date().toLocaleString()}`,
      "",
    ];
    documents
      .slice()
      .sort((left, right) => left.exhibit.localeCompare(right.exhibit))
      .forEach((document) => {
        const linkedCards = getPacketExportSet(
          evidence.filter((card) => card.documentId === document.id),
        ).exportableCards;
        lines.push(
          `## ${document.exhibit} - ${document.title}`,
          "",
          `Type: ${document.type}`,
          `Date: ${document.date}`,
          `Author/source: ${document.author}`,
          `Pages: ${document.pages || "Unknown"}`,
          `Status: ${document.status}`,
          `Tags: ${document.tags.join(", ") || "None"}`,
          `Linked evidence cards: ${linkedCards.length}`,
          "",
        );
        linkedCards.forEach((card) => {
          lines.push(
            `- Page ${card.page || "pending"} / ${card.priority}: ${card.title} - "${card.quote}"`,
          );
        });
        lines.push("");
      });
    return lines.join("\n");
  }

  function buildExhibitIndexCsv() {
    const header = [
      "exhibit",
      "title",
      "type",
      "date",
      "author",
      "pages",
      "status",
      "tags",
      "linkedEvidenceCards",
    ];
    const rows = documents.map((document) =>
      [
        document.exhibit,
        document.title,
        document.type,
        document.date,
        document.author,
        String(document.pages || ""),
        document.status,
        document.tags.join("; "),
        String(
          getPacketExportSet(evidence.filter((card) => card.documentId === document.id))
            .exportableCards.length,
        ),
      ].map(csvCell),
    );
    return [header.map(csvCell).join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  function buildMissingRecordRequest() {
    const openRecords = missingRecords.filter((record) => record.status !== "Produced");
    const lines = [
      `Subject: Record request for ${caseProfile.name}`,
      "",
      "Please produce the records listed below, or provide a written response identifying any records that do not exist, are being withheld, or require additional time to produce.",
      "",
      `Case objective: ${caseProfile.objective}`,
      `Meeting date: ${caseProfile.meetingDate || "Not set"}`,
      "",
    ];
    openRecords.forEach((record, index) => {
      lines.push(
        `${index + 1}. ${record.requested}`,
        `   Responsible party: ${record.responsibleParty}`,
        `   Related issue: ${record.relatedIssue}`,
        `   Why it matters: ${record.whyItMatters}`,
        `   Requested before: ${record.dateRequested}`,
        `   Follow-up needed: ${record.followUp}`,
        "",
      );
    });
    lines.push(
      "If any requested item will not be produced, please identify the decision-maker, the reason, and the written basis for that refusal.",
    );
    return lines.join("\n");
  }

  function buildAgreementRevision() {
    const issueTitle = activeIssue?.title ?? "the identified issues";
    const lines = [
      `Proposed replacement terms for ${caseProfile.name}`,
      "",
      `1. Scope. This agreement resolves only the following issue unless another issue is named in writing: ${issueTitle}.`,
      "2. Responsible party. A named responsible party will own each commitment and provide written status updates.",
      "3. Start date. Services, access, production, or payment commitments begin on a date-certain schedule, not when deemed appropriate.",
      "4. Measurable commitment. Each service or remedy must state minutes, frequency, duration, location, and provider when applicable.",
      "5. Review date. The parties will reconvene or exchange written status by a specific date to verify implementation.",
      "6. Failure fallback. If the named provider or service cannot implement the commitment, the responsible party will identify an alternative within five business days.",
      "7. No broad waiver. No release, confidentiality, or resolved-all-issues language applies beyond the specifically named issue and remedy.",
      "8. Written refusal. Any refusal to provide a requested record, service, or remedy must identify the decision-maker, data relied on, and written basis.",
      "",
      "Detected language to replace:",
    ];
    if (agreementRisks.length === 0) {
      lines.push("- No built-in risk phrase detected; still confirm dates, owners, measurements, and fallback terms.");
    } else {
      agreementRisks.forEach((risk) => {
        lines.push(`- "${risk.phrase}": ${risk.fix}`);
      });
    }
    return lines.join("\n");
  }

  function buildRemedyPlan() {
    const issueCards =
      activeIssue?.evidenceIds
        .map((id) => evidence.find((card) => card.id === id))
        .filter((card): card is EvidenceCard => Boolean(card)) ?? packetEvidence;
    const verifiedIssueCards = getPacketExportSet(issueCards).exportableCards;
    const relatedGaps = missingRecords.filter((record) =>
      `${record.relatedIssue} ${record.whyItMatters}`
        .toLowerCase()
        .includes((activeIssue?.title ?? "").split(" ")[0]?.toLowerCase() ?? ""),
    );
    const lines = [
      `# Proposed Outcome - ${activeIssue?.title ?? "Selected Issue"}`,
      "",
      `Case: ${caseProfile.name}`,
      `Objective: ${caseProfile.objective}`,
      "",
      "## Record Basis",
    ];
    verifiedIssueCards.slice(0, 8).forEach((card) => {
      const source = documentById.get(card.documentId);
      lines.push(
        `- ${source?.exhibit ?? "Unlabeled"} page ${card.page || "pending"}: ${card.quote}`,
      );
    });
    if (!verifiedIssueCards.length) {
      lines.push("- No verified source-resolved record basis is available for this issue yet.");
    }
    lines.push(
      "",
      "## Requested Outcome",
      "- State the exact remedy, service, access, record production, payment, or corrective action being requested.",
      "- Assign a named owner and implementation deadline.",
      "- Define how completion will be verified in writing.",
      "- Preserve the right to pursue unresolved issues not expressly named.",
      "",
      "## Verification Terms",
      "- Written confirmation of the decision-maker and authority.",
      "- Source documents or logs supporting any disputed position.",
      "- Date-certain review point if implementation depends on future conditions.",
      "- Written refusal if any requested remedy or record is denied.",
      "",
      "## Missing Records To Resolve First",
    );
    (relatedGaps.length ? relatedGaps : missingRecords.filter((record) => record.status !== "Produced"))
      .slice(0, 8)
      .forEach((record) => {
        lines.push(`- ${record.requested}: ${record.followUp}`);
      });
    return lines.join("\n");
  }

  function buildMeetingBrief() {
    const lines = [
      "# SourceDeck Meeting Brief",
      "",
      `Case: ${caseProfile.name}`,
      `Role: ${caseProfile.role}`,
      `Meeting type: ${meetingType}`,
      `Objective: ${caseProfile.objective}`,
      `Meeting date: ${caseProfile.meetingDate || "Not set"}`,
      "",
      "## Opening Statement",
      "I want to keep this discussion anchored in the written record. For each disputed point, I will identify the source document, page, exact quote, and the question that needs a clear answer.",
      "",
      "## Key Issues",
    ];
    issues
      .slice()
      .sort((left, right) => left.meetingPriority - right.meetingPriority)
      .slice(0, 8)
      .forEach((issue) => {
        lines.push(`- ${issue.title}: ${issue.description}`);
      });
    lines.push("", "## Must-Ask Questions");
    getPacketExportSet(criticalEvidence).exportableCards.slice(0, 8).forEach((card) => {
      const source = documentById.get(card.documentId);
      lines.push(
        `- ${card.question} (${source?.exhibit ?? "Unlabeled"}, page ${
          card.page || "pending"
        })`,
      );
    });
    lines.push("", "## Missing Records To Request");
    missingRecords
      .filter((record) => record.status !== "Produced")
      .slice(0, 8)
      .forEach((record) => {
        lines.push(`- ${record.requested}: ${record.followUp}`);
      });
    lines.push("", "## Agreement Guardrails");
    if (agreementRisks.length) {
      agreementRisks.forEach((risk) => {
        lines.push(`- Watch "${risk.phrase}": ${risk.risk} ${risk.fix}`);
      });
    } else {
      lines.push("- Do not sign until deadlines, owners, measurements, waiver scope, and fallback terms are clear.");
    }
    lines.push("", "## Packet Items");
    packetEvidence.forEach((card) => {
      if (packetGate.blockedIds.has(card.id)) return;
      const source = documentById.get(card.documentId);
      lines.push(`- ${source?.exhibit ?? "Unlabeled"} page ${card.page}: ${card.title}`);
    });
    return lines.join("\n");
  }

  function buildPacketHtml(cards = packetEvidence) {
    const { exportableCards, failures } = getPacketExportSet(cards);
    if (failures.length) {
      return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SourceDeck Packet Hard-Wall Report</title>
  <style>
    body { font-family: Arial, sans-serif; color: #17202a; margin: 40px; line-height: 1.5; }
    h1 { margin-bottom: 4px; }
    section { break-inside: avoid; border-top: 1px solid #cfd8e3; padding: 18px 0; }
    .meta { color: #596779; text-transform: uppercase; font-size: 0.78rem; font-weight: bold; }
  </style>
</head>
<body>
  <h1>SourceDeck Packet Hard-Wall Report</h1>
  <p><strong>Case:</strong> ${escapeHtml(caseProfile.name)}</p>
  <p>Generated ${escapeHtml(new Date().toLocaleString())} for ${escapeHtml(meetingType)}</p>
  <section>
    <p class="meta">Packet hard wall</p>
    <p>SourceDeck did not export an evidence packet because at least one selected factual card failed the verified source-chain gate.</p>
    <ol>
      ${failures
        .map(
          (failure) =>
            `<li>${escapeHtml(failure.cardId ?? "unknown card")}: ${escapeHtml(failure.reason)}</li>`,
        )
        .join("")}
    </ol>
  </section>
</body>
</html>`;
    }
    const body = exportableCards
      .map((card) => {
        const source = documentById.get(card.documentId);
        return `
          <section>
            <p class="meta">${escapeHtml(card.priority)} / ${escapeHtml(source?.exhibit ?? "Unlabeled")} / page ${escapeHtml(card.page || "pending")}</p>
            <h2>${escapeHtml(card.title)}</h2>
            <blockquote>${escapeHtml(card.quote)}</blockquote>
            <p><strong>Why it matters:</strong> ${escapeHtml(card.meaning)}</p>
            <p><strong>Ask:</strong> ${escapeHtml(card.question)}</p>
            <p><strong>Counter:</strong> ${escapeHtml(card.counter)}</p>
          </section>`;
      })
      .join("");
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>SourceDeck Packet</title>
  <style>
    body { font-family: Arial, sans-serif; color: #17202a; margin: 40px; line-height: 1.5; }
    h1 { margin-bottom: 4px; }
    section { break-inside: avoid; border-top: 1px solid #cfd8e3; padding: 18px 0; }
    blockquote { border-left: 4px solid #d97706; margin-left: 0; padding-left: 14px; font-size: 1.05rem; }
    .meta { color: #596779; text-transform: uppercase; font-size: 0.78rem; font-weight: bold; }
  </style>
</head>
<body>
  <h1>SourceDeck Evidence Packet</h1>
  <p><strong>Case:</strong> ${escapeHtml(caseProfile.name)}</p>
  <p><strong>Objective:</strong> ${escapeHtml(caseProfile.objective)}</p>
  <p>Generated ${escapeHtml(new Date().toLocaleString())} for ${escapeHtml(meetingType)}</p>
  ${body}
</body>
</html>`;
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    setImportStatus(`Processing ${files.length} file${files.length === 1 ? "" : "s"}...`);
    const imported = await Promise.all(
      Array.from(files).map(async (file, index): Promise<SourceDocument> => {
        const documentId = makeId("doc");
        const ext = file.name.split(".").pop()?.toUpperCase() || "File";
        const title = file.name.replace(/\.[^.]+$/, "");
        const importedAt = new Date().toISOString();
        let processed: ProcessedFile;
        const sourceBytes = new Uint8Array(await file.arrayBuffer());
        try {
          processed = await processFile(file, sourceBytes);
        } catch (error) {
          processed = {
            extractedText: "",
            pageTexts: [],
            pages: 0,
            status: "Needs review",
            warning: `Import processor failed: ${error instanceof Error ? error.message : "unknown error"}`,
          };
        }
        let sourceVaultManifest: SourceVaultManifest | undefined;
        let sourceVaultVerified: boolean | undefined;
        let sourceVaultFailure: string | undefined;
        const pageImageRecords: Awaited<ReturnType<typeof createSourceVaultPageImageRecord>>[] = [];
        try {
          const originalRecord = await createSourceVaultBlobRecord({
            documentId,
            kind: "original_file",
            mediaType: file.type || "application/octet-stream",
            bytes: sourceBytes,
            createdAt: importedAt,
            metadata: {
              fileName: file.name,
              fileType: ext,
              lastModified: file.lastModified || null,
            },
          });
          for (const renderedImage of processed.renderedPageImages ?? []) {
            pageImageRecords.push(
              await createSourceVaultPageImageRecord({
                documentId,
                pageId: `${documentId}:page:${renderedImage.page}`,
                pageIndex: renderedImage.page,
                mediaType: renderedImage.mediaType,
                bytes: renderedImage.bytes,
                width: renderedImage.width,
                height: renderedImage.height,
                renderScale: renderedImage.renderScale,
                createdAt: importedAt,
                metadata: {
                  fileName: file.name,
                  fileType: ext,
                },
              }),
            );
          }
          sourceVaultManifest = await createSourceVaultManifest({
            vaultId: `source-vault:${documentId}`,
            documentId,
            original: originalRecord,
            pageImages: pageImageRecords,
            createdAt: importedAt,
            metadata: {
              fileName: file.name,
              fileType: ext,
              extractedPages: processed.pageTexts.length,
              renderedPageImages: pageImageRecords.length,
            },
          });
          const manifestVerification = await verifySourceVaultManifest(sourceVaultManifest);
          if (!manifestVerification.ok) {
            sourceVaultVerified = false;
            sourceVaultFailure = manifestVerification.reason;
          } else if (workspacePassphrase.trim()) {
            // Encrypt source-vault payloads at rest: original bytes and rendered page images are
            // sealed with AES-GCM under a passphrase-derived key before they touch IndexedDB.
            const rawStore =
              createIndexedDbSourceVaultRecordStore<StoredSourceVaultRecord>();
            const vaultStore = createEncryptedSourceVaultStore(rawStore, workspacePassphrase);
            await putSourceVaultManifest(vaultStore, sourceVaultManifest);
            const storageVerification = await verifySourceVaultManifestStorage(
              vaultStore,
              sourceVaultManifest,
            );
            sourceVaultVerified = storageVerification.ok;
            sourceVaultFailure = storageVerification.ok ? undefined : storageVerification.reason;
          } else {
            // No passphrase: do NOT write plaintext source bytes to disk, and do not claim source
            // vault storage verification. The manifest hashes stay attached for custody context,
            // but payload-bearing bundle export requires encrypted vault custody.
            sourceVaultVerified = false;
            sourceVaultFailure =
              "source vault manifest verified, but payloads were not persisted at rest; set a workspace passphrase to enable encrypted vault storage";
          }
        } catch (error) {
          sourceVaultVerified = false;
          sourceVaultFailure =
            error instanceof Error ? error.message : "source vault verification failed";
        }
        let sourceArtifact: DurableSourceArtifact | undefined;
        let sourceArtifactVerified: boolean | undefined;
        let sourceArtifactFailure = "";
        if (processed.extractedText.trim()) {
          try {
            sourceArtifact = await createTextSourceArtifact({
              documentId,
              title,
              source: file.name,
              text: processed.extractedText,
              pages: processed.pageTexts.length
                ? processed.pageTexts.map((page) => ({
                    ...(() => {
                      const pageImageRecord = pageImageRecords.find(
                        (record) => record.pageIndex === page.page,
                      );
                      return {
                        index: page.page,
                        text: page.text,
                        imageBytes: pageImageRecord
                          ? sourceVaultPayloadBytes(pageImageRecord.payload)
                          : undefined,
                        ocrQuality: processed.status === "Needs OCR" ? 0.45 : 0.95,
                        geometry:
                          page.width && page.height && page.geometryBlocks?.length
                            ? {
                                width: page.width,
                                height: page.height,
                                unit: "pt" as const,
                                rotation: 0 as const,
                                blocks: page.geometryBlocks,
                              }
                            : undefined,
                        vault: pageImageRecord
                          ? {
                              pageImageRecordId: pageImageRecord.recordId,
                              pageImageContentHash: pageImageRecord.contentHash,
                              renderScale: pageImageRecord.renderScale,
                            }
                          : undefined,
                      };
                    })(),
                  }))
                : undefined,
              sourceVault: sourceVaultManifest
                ? {
                    vaultId: sourceVaultManifest.vaultId,
                    manifestHash: sourceVaultManifest.manifestHash,
                    originalRecordId: sourceVaultManifest.original.recordId,
                    originalContentHash: sourceVaultManifest.original.contentHash,
                  }
                : undefined,
              sensitivity: "unknown",
              metadata: {
                fileName: file.name,
                fileType: ext,
                lastModified: file.lastModified || null,
              },
              ingestedAt: importedAt,
            });
            const verification = await verifySourceArtifact(sourceArtifact);
            sourceArtifactVerified = verification.ok;
            sourceArtifactFailure = verification.ok ? "" : verification.reason;
          } catch (error) {
            sourceArtifactVerified = false;
            sourceArtifactFailure =
              error instanceof Error ? error.message : "source artifact verification failed";
          }
        }
        const importTrust = decideImportTrust(processed.extractedText);
        return {
          id: documentId,
          title,
          type: ext,
          date: new Date(file.lastModified || Date.now()).toISOString().slice(0, 10),
          author: "Imported file",
          pages: processed.pages,
          exhibit: `Imported ${documents.length + index + 1}`,
          tags: ["Imported", ext, ...importTrust.tags],
          status:
            importTrust.state === "quarantined_prompt_injection"
              ? "Needs review"
              : processed.status,
          warning: [processed.warning, importTrust.warning, sourceVaultFailure, sourceArtifactFailure]
            .filter(Boolean)
            .join(" "),
          fileName: file.name,
          extractedText: processed.extractedText,
          pageTexts: processed.pageTexts,
          importTrust: importTrust.state,
          textChars: processed.extractedText.length,
          importedAt,
          detectedDates: detectDates(processed.extractedText),
          detectedEntities: detectEntities(processed.extractedText),
          sourceArtifact,
          sourceArtifactVerified,
          sourceArtifactFailure: sourceArtifactFailure || undefined,
          sourceVaultManifest,
          sourceVaultVerified,
          sourceVaultFailure: sourceVaultFailure || undefined,
        };
      }),
    );
    setDocuments((current) => [...imported, ...current]);
    const quarantined = imported.filter(
      (document) => document.importTrust === "quarantined_prompt_injection",
    );
    const suggestions = imported.flatMap((document) =>
      document.extractedText && document.importTrust !== "quarantined_prompt_injection"
        ? suggestFromText(document.extractedText, document.id, document.title)
        : [],
    );
    if (suggestions.length) {
      setPrepSuggestions((current) => [...suggestions, ...current]);
    }
    if (!manualCard.documentId && imported[0]) {
      setManualCard((current) => ({ ...current, documentId: imported[0].id }));
    }
    const importLedger = await writableTrustStore("import-policy");
    for (const document of imported) {
      await appendCaseEvent(importLedger, {
        id: `${importLedger.caseId}:event:${importLedger.events.length + 1}:${
          document.importTrust === "quarantined_prompt_injection"
            ? "import_quarantined"
            : "document_indexed"
        }`,
        type:
          document.importTrust === "quarantined_prompt_injection"
            ? "import_quarantined"
            : "document_indexed",
        actor: "import-policy",
        at: new Date().toISOString(),
        targetId: document.id,
        payload: {
          title: document.title,
          fileName: document.fileName,
          importTrust: document.importTrust,
          sourceArtifactHash: document.sourceArtifact?.contentHash,
          sourceArtifactVerified: document.sourceArtifactVerified ?? null,
          sourceVaultManifestHash: document.sourceVaultManifest?.manifestHash,
          sourceVaultVerified: document.sourceVaultVerified ?? null,
        },
      });
      if (document.sourceVaultManifest && document.sourceVaultVerified) {
        await appendCaseEvent(importLedger, {
          id: `${importLedger.caseId}:event:${importLedger.events.length + 1}:source_vault_verified`,
          type: "source_vault_verified",
          actor: "source-vault-verifier",
          at: new Date().toISOString(),
          targetId: document.sourceVaultManifest.vaultId,
          payload: {
            documentId: document.id,
            manifestHash: document.sourceVaultManifest.manifestHash,
            originalContentHash: document.sourceVaultManifest.original.contentHash,
            originalRecordId: document.sourceVaultManifest.original.recordId,
            pageImageCount: document.sourceVaultManifest.pageImages.length,
            indexedDbStorageVerified: true,
          },
        });
      }
      if (document.sourceArtifact && document.sourceArtifactVerified) {
        const sourceArtifactCaseRecord = await putCaseArtifact(
          importLedger,
          serializeDurableSourceArtifactForCaseStore(document.sourceArtifact),
          SOURCE_ARTIFACT_CASE_STORE_MEDIA_TYPE,
          {
            documentId: document.id,
            sourceArtifactId: document.sourceArtifact.artifactId,
            sourceArtifactContentHash: document.sourceArtifact.contentHash,
            pageCount: document.sourceArtifact.pages.length,
          },
          "source-artifact-verifier",
          new Date().toISOString(),
        );
        await appendCaseEvent(importLedger, {
          id: `${importLedger.caseId}:event:${importLedger.events.length + 1}:artifact_verified`,
          type: "artifact_verified",
          actor: "source-artifact-verifier",
          at: new Date().toISOString(),
          targetId: document.sourceArtifact.artifactId,
          payload: {
            documentId: document.id,
            contentHash: document.sourceArtifact.contentHash,
            pageCount: document.sourceArtifact.pages.length,
            caseArtifactId: sourceArtifactCaseRecord.id,
            caseArtifactContentHash: sourceArtifactCaseRecord.contentHash,
          },
        });
      }
    }
    setTrustStore(importLedger);
    setActiveDocumentId(imported[0]?.id ?? activeDocumentId);
    setImportStatus(
      `Imported ${imported.length} file${imported.length === 1 ? "" : "s"}; ${
        suggestions.length
      } evidence suggestion${suggestions.length === 1 ? "" : "s"} queued.${
        quarantined.length ? ` ${quarantined.length} prompt-injection flagged file${quarantined.length === 1 ? "" : "s"} quarantined from auto-suggest.` : ""
      }`,
    );
  }

  function createWorkspaceSnapshot(
    options: { redactSourceVaultPayloads?: boolean } = {},
  ): WorkspaceSnapshot {
    return {
      caseProfile,
      documents: options.redactSourceVaultPayloads
        ? sanitizeSourceDocumentsForLocalStorage(documents)
        : documents,
      evidence,
      issues,
      timeline,
      missingRecords,
      meetingNotes,
      trustStore,
      trustRegistry,
      battleCard: battleCard ?? undefined,
    };
  }

  function exportPlainWorkspace() {
    const artifactCount = documents.filter((document) => document.sourceArtifact).length;
    const vaultCount = documents.filter((document) => document.sourceVaultManifest).length;
    const vaultPageImageCount = documents.reduce(
      (sum, document) => sum + (document.sourceVaultManifest?.pageImages.length ?? 0),
      0,
    );
    downloadText(
      "sourcedeck-data.json",
      JSON.stringify(createWorkspaceSnapshot({ redactSourceVaultPayloads: true }), null, 2),
      "application/json",
    );
    setPrivacyStatus(
      `Plain workspace JSON exported with source text${
        artifactCount ? ` and ${artifactCount} artifact payload${artifactCount === 1 ? "" : "s"}` : ""
      }${
        vaultCount
          ? ` plus ${vaultCount} source-vault custody reference${vaultCount === 1 ? "" : "s"} (${vaultPageImageCount} rendered page image reference${vaultPageImageCount === 1 ? "" : "s"}; payloads redacted)`
          : ""
      }. Use encrypted export for payload-bearing private records.`,
    );
    void recordTrustEvent({
      type: "security_finding",
      actor: "workspace-export",
      targetId: "sourcedeck-data.json",
      payload: {
        plainWorkspaceExport: true,
        artifactCount,
        vaultCount,
        vaultPageImageCount,
        includesSourceText: true,
        includesSourceVaultPayloads: false,
        sourceVaultPayloadsRedacted: vaultCount > 0,
      },
    });
  }

  function restoreWorkspaceSnapshot(snapshot: WorkspaceSnapshot, message: string) {
    if (Array.isArray(snapshot.documents)) setDocuments(snapshot.documents);
    if (snapshot.caseProfile) setCaseProfile(snapshot.caseProfile);
    if (Array.isArray(snapshot.evidence)) setEvidence(snapshot.evidence);
    if (Array.isArray(snapshot.issues)) setIssues(snapshot.issues);
    if (Array.isArray(snapshot.timeline)) setTimeline(snapshot.timeline);
    if (Array.isArray(snapshot.missingRecords)) setMissingRecords(snapshot.missingRecords);
    if (Array.isArray(snapshot.meetingNotes)) setMeetingNotes(snapshot.meetingNotes);
    if (typeof snapshot.trustStore !== "undefined") setTrustStore(snapshot.trustStore);
    if (snapshot.trustRegistry) setTrustRegistry(snapshot.trustRegistry);
    if (snapshot.battleCard) setBattleCard(snapshot.battleCard);
    if (Array.isArray(snapshot.conflicts)) setConflicts(snapshot.conflicts);
    if (Array.isArray(snapshot.recordsLedger)) setRecordsLedger(snapshot.recordsLedger);
    if (typeof snapshot.deckVersion === "string") setDeckVersion(snapshot.deckVersion);
    setActiveDocumentId(snapshot.documents?.[0]?.id ?? activeDocumentId);
    setSelectedEvidenceId(snapshot.evidence?.[0]?.id ?? selectedEvidenceId);
    setActiveIssueId(snapshot.issues?.[0]?.id ?? activeIssueId);
    setImportStatus(message);
  }

  function reloadCaseDeck() {
    void fetch(`/casedeck.json?v=${Date.now()}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((snapshot) => {
        if (snapshot && Array.isArray(snapshot.evidence)) {
          restoreWorkspaceSnapshot(snapshot, "Reloaded the latest case deck.");
        } else {
          setImportStatus("No case deck found to reload.");
        }
      })
      .catch(() => setImportStatus("Could not reload the case deck."));
  }

  function importWorkspace(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const snapshot = JSON.parse(String(reader.result ?? "{}")) as WorkspaceSnapshot;
        restoreWorkspaceSnapshot(snapshot, `Workspace restored from ${file.name}.`);
      } catch (error) {
        setImportStatus(
          `Workspace import failed: ${error instanceof Error ? error.message : "invalid JSON"}`,
        );
      }
    };
    reader.onerror = () => setImportStatus(`Workspace import failed: could not read ${file.name}.`);
    reader.readAsText(file);
  }

  async function exportEncryptedWorkspace() {
    if (!workspacePassphrase.trim()) {
      setPrivacyStatus("Enter a passphrase before encrypted export.");
      return;
    }
    const payload: EncryptedWorkspacePayload = await encryptJsonPayload(
      "sourcedeck.encrypted.v1",
      workspacePassphrase,
      createWorkspaceSnapshot(),
    );
    downloadText(
      "sourcedeck-workspace.encrypted.json",
      JSON.stringify(payload, null, 2),
      "application/json",
    );
    setPrivacyStatus("Encrypted workspace exported.");
  }

  async function importEncryptedWorkspace(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!workspacePassphrase.trim()) {
      setPrivacyStatus("Enter the passphrase before encrypted import.");
      return;
    }
    try {
      const payload = JSON.parse(await file.text()) as EncryptedWorkspacePayload;
      if (payload.format !== "sourcedeck.encrypted.v1") {
        throw new Error("unsupported encrypted workspace format");
      }
      const snapshot = await decryptJsonPayload<WorkspaceSnapshot>(payload, workspacePassphrase, {
        expectedFormat: "sourcedeck.encrypted.v1",
      });
      restoreWorkspaceSnapshot(snapshot, `Encrypted workspace restored from ${file.name}.`);
      setPrivacyStatus("Encrypted workspace restored.");
    } catch (error) {
      setPrivacyStatus(
        `Encrypted import failed: ${error instanceof Error ? error.message : "wrong passphrase or invalid file"}`,
      );
    }
  }

  function addManualEvidence() {
    if (!manualCard.title.trim() || !manualCard.quote.trim()) return;
    const card: EvidenceCard = {
      id: makeId("ev"),
      title: manualCard.title.trim(),
      category: manualCard.category.trim() || "Key quote",
      priority: "High",
      documentId: manualCard.documentId || documents[0]?.id,
      page: Number(manualCard.page) || 1,
      quote: manualCard.quote.trim(),
      meaning: "User-added evidence card awaiting full analysis.",
      strategicUse: "Use live when this issue comes up.",
      question:
        manualCard.question.trim() ||
        "Please explain how this statement fits with the current position.",
      likelyDefense: "The other side may distinguish or minimize the quote.",
      counter: "Ask for the source, page, responsible party, and written basis.",
      tags: ["User added", manualCard.category.trim() || "Evidence"],
      confidence: 85,
      packetReady: false,
      verificationStatus: "cited",
    };
    setEvidence((current) => [card, ...current]);
    setPacketIds((current) => [card.id, ...current]);
    setSelectedEvidenceId(card.id);
    setManualCard((current) => ({ ...current, title: "", quote: "", question: "" }));
  }

  function runPrep() {
    const source = prepText.trim();
    if (!source) return;
    setPrepSuggestions(suggestFromText(source));
  }

  function acceptSuggestion(suggestion: PrepSuggestion) {
    const card: EvidenceCard = {
      id: makeId("ev"),
      title: suggestion.title,
      category: suggestion.category,
      priority: suggestion.priority,
      documentId: suggestion.documentId ?? documents[0]?.id,
      page: suggestion.page ?? 1,
      quote: suggestion.quote,
      meaning: "AI-prep suggestion accepted for live meeting review.",
      strategicUse: "Validate the source page, then use as a rapid retrieval card.",
      question: suggestion.question,
      likelyDefense: "The other side may argue context changes the meaning.",
      counter: "Open the page, read the exact quote, and ask for the written basis.",
      tags: ["AI prep", suggestion.category],
      confidence: suggestion.confidence,
      packetReady: false,
      verificationStatus: "cited",
    };
    setEvidence((current) => [card, ...current]);
    setPacketIds((current) => [card.id, ...current]);
    setSelectedEvidenceId(card.id);
  }

  function openSearchHit(hit: CommandSearchHit, destination: View = "documents") {
    setActiveDocumentId(hit.documentId);
    if (hit.evidenceId) setSelectedEvidenceId(hit.evidenceId);
    setView(destination);
  }

  function promoteSearchHitAsEvidence(hit: CommandSearchHit) {
    if (hit.evidenceId) {
      setSelectedEvidenceId(hit.evidenceId);
      setView("evidence");
      return;
    }
    const quote = hit.quote.trim();
    if (!quote) {
      setImportStatus("Search hit has no source excerpt to promote.");
      return;
    }
    const card: EvidenceCard = {
      id: makeId("ev"),
      title: hit.title,
      category: hit.lane === "exact" ? "Exact source search" : "Smart source search",
      priority: hit.tier === "top" ? "High" : hit.tier === "middle" ? "Medium" : "Low",
      documentId: hit.documentId,
      page: hit.page,
      quote,
      meaning: `Search result for "${query.trim()}". ${hit.matchReason}.`,
      strategicUse:
        "Review the source page, then certify if this exact excerpt supports the issue.",
      question: `Can you respond to this source excerpt from ${hit.exhibit}, page ${hit.page}?`,
      likelyDefense: "They may argue the excerpt is incomplete or context changes the meaning.",
      counter: "Open the source page and verify the surrounding text before using it.",
      tags: ["Search", hit.tier, hit.lane],
      confidence: Number(Math.max(0.35, Math.min(0.95, hit.score)).toFixed(2)),
      packetReady: false,
      verificationStatus: "cited",
    };
    setEvidence((current) => [card, ...current]);
    setPacketIds((current) => Array.from(new Set([card.id, ...current])));
    setSelectedEvidenceId(card.id);
    setView("evidence");
    setImportStatus(
      "Search result promoted to cited evidence. Certify in Verification before packet export.",
    );
  }

  async function verifyEvidenceCard(cardId: string) {
    const graph = buildLegacySourceGraph(documents, evidence);
    const reviewer = reviewerIdentity.trim() || "Local reviewer";
    // Certificate-backed promotion binds both the source-proof snapshot and the exact inspection
    // target the reviewer approved.
    const result = await promoteEvidenceWithCertificate(graph, cardId, {
      reviewer,
      at: new Date().toISOString(),
    });
    if (!result.ok) {
      setImportStatus(`Verification failed: ${result.failures.join("; ")}.`);
      return;
    }
    setEvidence((current) =>
      current.map((card) =>
        card.id === cardId
          ? { ...card, packetReady: true, verificationStatus: "verified" }
          : card,
      ),
    );
    setImportStatus(
      `Certified as verified by ${reviewer}. Proof snapshot ${result.signoff.proofSnapshotHash.slice(
        0,
        18,
      )}..., inspection ${result.certificate.inspectionTargetHash.slice(0, 18)}...`,
    );
    const promotionEvent = promotionCertificateToRecordedEvent(result.certificate);
    void recordTrustEvent({
      type: "evidence_promoted",
      actor: promotionEvent.actor,
      at: promotionEvent.at,
      targetId: promotionEvent.targetId,
      payload: promotionEvent.payload,
    });
  }

  async function disputeEvidenceCard(cardId: string) {
    const graph = buildLegacySourceGraph(documents, evidence);
    const reviewer = reviewerIdentity.trim() || "Local reviewer";
    const result = await signOffEvidenceVerification(graph, cardId, {
      decision: "dispute",
      reviewer,
      at: new Date().toISOString(),
    });
    if (!result.ok) {
      setImportStatus(`Dispute failed: ${result.failures.join("; ")}.`);
      return;
    }
    setEvidence((current) =>
      current.map((card) =>
        card.id === cardId
          ? { ...card, packetReady: false, verificationStatus: "disputed" }
          : card,
      ),
    );
    setImportStatus(
      `Disputed by ${reviewer}. Proof snapshot ${result.signoff.proofSnapshotHash.slice(0, 18)}...`,
    );
    void recordTrustEvent({
      type: "evidence_signed_off",
      actor: reviewer,
      at: result.signoff.at,
      targetId: cardId,
      payload: {
        decision: result.signoff.decision,
        from: result.signoff.fromStatus,
        to: result.signoff.toStatus,
        reviewer,
        proofSnapshotHash: result.signoff.proofSnapshotHash,
      },
    });
  }

  // Deterministic split: each sub-quote is validated against the source span by the kernel
  // (`splitEvidenceCard`) before any card is created, so a split can only ever narrow within the
  // source. Children revert to cited (fresh signoff required); the parent is superseded.
  function splitSelectedCard(cardId: string) {
    const subQuotes = splitDraft
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    if (subQuotes.length < 2) {
      setImportStatus("Split needs at least two sub-quotes, one exact phrase per line.");
      return;
    }
    const graph = buildLegacySourceGraph(documents, evidence);
    const result = splitEvidenceCard(graph, cardId, subQuotes);
    if (!result.ok) {
      setImportStatus(`Split failed: ${result.failures.join("; ")}.`);
      return;
    }
    const parent = evidence.find((card) => card.id === cardId);
    if (!parent) return;
    const children: EvidenceCard[] = subQuotes.map((quote) => ({
      ...parent,
      id: makeId("ev"),
      quote,
      verificationStatus: "cited",
      packetReady: false,
    }));
    setEvidence((current) => [
      ...children,
      ...current.map((card) =>
        card.id === cardId
          ? { ...card, verificationStatus: "superseded" as const, packetReady: false }
          : card,
      ),
    ]);
    setSplitDraft("");
    setSelectedEvidenceId(children[0].id);
    setImportStatus(
      `Split into ${children.length} source-backed cards; each needs a fresh signoff.`,
    );
    void recordTrustEvent({
      type: "evidence_split",
      actor: reviewerIdentity.trim() || "Local reviewer",
      targetId: cardId,
      payload: {
        parentId: cardId,
        childIds: children.map((card) => card.id),
        subQuotes,
      },
    });
  }

  // Deterministic merge: consolidate other cards that cite the SAME source (document + page + exact
  // quote) into the selected card. The kernel `mergeEvidenceCards` validates true-duplicate identity
  // (fail-closed) before anything is dropped; the survivor reverts to cited for a fresh signoff.
  function mergeSelectedCardDuplicates(cardId: string) {
    const selected = evidence.find((card) => card.id === cardId);
    if (!selected) return;
    const duplicates = evidence.filter(
      (card) =>
        card.id !== cardId &&
        card.documentId === selected.documentId &&
        card.page === selected.page &&
        card.quote === selected.quote &&
        // Only absorb ACTIVE citations. A disputed/withdrawn/superseded/stale card carries explicit
        // signal; silently merging it away would hide that finding.
        !["disputed", "withdrawn", "superseded", "anchor_stale"].includes(
          card.verificationStatus ?? "",
        ),
    );
    if (duplicates.length === 0) {
      setImportStatus("No duplicate citations of this card were found.");
      return;
    }
    const graph = buildLegacySourceGraph(documents, evidence);
    const mergedIds = duplicates.map((card) => card.id);
    const result = mergeEvidenceCards(graph, [cardId, ...mergedIds]);
    if (!result.ok) {
      setImportStatus(`Merge failed: ${result.failures.join("; ")}.`);
      return;
    }
    const dropped = new Set(mergedIds);
    setEvidence((current) =>
      current
        .filter((card) => !dropped.has(card.id))
        .map((card) =>
          card.id === cardId
            ? { ...card, verificationStatus: "cited" as const, packetReady: false }
            : card,
        ),
    );
    setSelectedEvidenceId(cardId);
    setImportStatus(
      `Merged ${mergedIds.length} duplicate citation(s) into this card; re-sign off to verify.`,
    );
    void recordTrustEvent({
      type: "evidence_merged",
      actor: reviewerIdentity.trim() || "Local reviewer",
      targetId: cardId,
      payload: { survivorId: cardId, mergedIds },
    });
  }

  // Source-validated quote edit: the corrected quote must still appear in the source span (kernel
  // `editEvidenceCardQuote`), and the card reverts to cited so the prior signoff is re-attested.
  function editSelectedCardQuote(cardId: string) {
    const trimmed = quoteDraft.trim();
    if (!trimmed) {
      setImportStatus("Enter the corrected exact quote to save.");
      return;
    }
    const graph = buildLegacySourceGraph(documents, evidence);
    const result = editEvidenceCardQuote(graph, cardId, trimmed);
    if (!result.ok) {
      setImportStatus(`Quote edit failed: ${result.failures.join("; ")}.`);
      return;
    }
    setEvidence((current) =>
      current.map((card) =>
        card.id === cardId
          ? { ...card, quote: trimmed, verificationStatus: "cited" as const, packetReady: false }
          : card,
      ),
    );
    setQuoteDraft("");
    setImportStatus("Quote updated within source; re-sign off to verify.");
    void recordTrustEvent({
      type: "evidence_edited",
      actor: reviewerIdentity.trim() || "Local reviewer",
      targetId: cardId,
      payload: { newQuote: trimmed },
    });
  }

  function reanchorEvidenceCard(cardId: string) {
    const card = evidence.find((candidate) => candidate.id === cardId);
    if (!card) {
      setImportStatus("Reanchor failed: card is not in the workspace.");
      return;
    }
    const source = documentById.get(card.documentId);
    if (!source) {
      setImportStatus("Reanchor failed: source document is missing.");
      return;
    }
    const pageText =
      source.pageTexts?.find((page) => page.page === card.page)?.text ??
      source.extractedText ??
      "";
    if (!pageText.includes(card.quote)) {
      const reanchored = reanchorSpanToText(
        {
          id: `${card.id}:reanchor`,
          documentId: card.documentId,
          pageId: `${card.documentId}:page:${card.page || 1}`,
          quadPoints: [],
          charRange: [0, card.quote.length],
          semanticFingerprint: card.id,
          structuralPath: ["verification-workbench", card.id],
          exactText: card.quote,
          anchorStatus: "low_confidence",
          quality: 0.45,
        },
        pageText,
        { minimumScore: 0.7 },
      );
      if (reanchored.ok) {
        setEvidence((current) =>
          current.map((candidate) =>
            candidate.id === cardId
              ? {
                  ...candidate,
                  quote: reanchored.span.exactText,
                  packetReady: false,
                  verificationStatus: "cited",
                }
              : candidate,
          ),
        );
        setImportStatus(
          `Reanchor recovered OCR/token drift at score ${reanchored.score.toFixed(
            2,
          )}. Review the recovered source text, then promote if correct.`,
        );
        void recordTrustEvent({
          type: "evidence_reanchored",
          actor: "verification-workbench",
          targetId: cardId,
          payload: {
            result: "drift_recovered",
            reason: reanchored.reason,
            score: reanchored.score,
            documentId: card.documentId,
            page: card.page,
            charRange: reanchored.span.charRange,
          },
        });
        return;
      }
      setEvidence((current) =>
        current.map((candidate) =>
          candidate.id === cardId
            ? { ...candidate, packetReady: false, verificationStatus: "anchor_stale" }
            : candidate,
        ),
      );
      setImportStatus("Reanchor failed closed: exact quote was not found on the current source page.");
      void recordTrustEvent({
        type: "evidence_reanchored",
        actor: "verification-workbench",
        targetId: cardId,
        payload: {
          result: "anchor_stale",
          documentId: card.documentId,
          page: card.page,
        },
      });
      return;
    }
    setEvidence((current) =>
      current.map((candidate) =>
        candidate.id === cardId
          ? { ...candidate, packetReady: false, verificationStatus: "cited" }
          : candidate,
      ),
    );
    setImportStatus(
      "Reanchor succeeded against current page text. Reviewer promotion is still required before packet export.",
    );
    void recordTrustEvent({
      type: "evidence_reanchored",
      actor: "verification-workbench",
      targetId: cardId,
      payload: {
        result: "quote_found",
        documentId: card.documentId,
        page: card.page,
      },
    });
  }

  function promoteDocumentPage(document: SourceDocument, pageNumber = 1) {
    const pageText =
      document.pageTexts?.find((page) => page.page === pageNumber)?.text ??
      document.extractedText ??
      "";
    const firstUsefulLine =
      pageText
        .split(/\n|(?<=[.!?])\s+/)
        .map((line) => line.trim())
        .find((line) => line.length > 40) ?? pageText.slice(0, 220);
    if (!firstUsefulLine) return;
    const suggestion = suggestFromText(firstUsefulLine, document.id, document.title)[0];
    if (suggestion) {
      acceptSuggestion({ ...suggestion, page: pageNumber });
      setView("evidence");
    }
  }

  function suggestFromDocument(document: SourceDocument) {
    const sourceText = document.extractedText;
    if (!sourceText) return;
    setPrepSuggestions((current) => [
      ...suggestFromText(sourceText, document.id, document.title),
      ...current,
    ]);
    setView("prep");
  }

  function buildTimelineFromDocument(document: SourceDocument) {
    const dates = document.detectedDates?.length ? document.detectedDates : [document.date];
    const created = Array.from(new Set(dates))
      .slice(0, 8)
      .map((detectedDate, index): TimelineEntry => {
        const page =
          document.pageTexts?.find((item) =>
            item.text.toLowerCase().includes(detectedDate.toLowerCase()),
          ) ?? document.pageTexts?.[0];
        const quote =
          page?.text
            .split(/\n|(?<=[.!?])\s+/)
            .map((line) => line.trim())
            .find((line) => line.toLowerCase().includes(detectedDate.toLowerCase())) ??
          page?.text.slice(0, 220) ??
          document.extractedText?.slice(0, 220) ??
          document.title;
        return {
          id: makeId("time"),
          date: normalizeDetectedDate(detectedDate),
          event: `${document.title}: ${detectedDate}`,
          documentId: document.id,
          page: page?.page ?? index + 1,
          quote,
          issue: document.tags[0] ?? "Imported timeline",
        };
      });
    setTimeline((current) => [...created, ...current]);
    setView("timeline");
  }

  function logMeetingNote(kind: MeetingNote["kind"]) {
    if (!noteDraft.trim()) return;
    const note: MeetingNote = {
      id: makeId("note"),
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      speaker: speakerDraft.trim() || "Unspecified",
      topic: selectedEvidence?.title ?? activeIssue?.title ?? "Meeting",
      note: noteDraft.trim(),
      linkedEvidence: selectedEvidence ? [selectedEvidence.id] : [],
      followUp:
        kind === "Refusal"
          ? "Request written refusal and source authority."
          : "Review after meeting and assign owner/date.",
      kind,
    };
    setMeetingNotes((current) => [note, ...current]);
    setNoteDraft("");
  }

  function analyzeTranscript() {
    const lines = transcriptDraft
      .split(/\n|(?<=[.!?])\s+/)
      .map((line) => line.trim())
      .filter((line) => line.length > 24);
    const created = lines
      .map((line): MeetingNote | null => {
        const lower = line.toLowerCase();
        const kind: MeetingNote["kind"] =
          lower.match(/\b(refuse|decline|won't|cannot|can't|not able|no)\b/)
            ? "Refusal"
            : lower.match(/\b(will|agree|commit|by \d|before|deadline|provide)\b/)
              ? "Commitment"
              : lower.match(/\b(follow up|send|request|produce|schedule|review)\b/)
                ? "Action"
                : "Note";
        return {
          id: makeId("note"),
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          speaker: line.includes(":") ? line.split(":")[0] : "Transcript",
          topic: selectedEvidence?.title ?? activeIssue?.title ?? "Transcript",
          note: line,
          linkedEvidence: selectedEvidence ? [selectedEvidence.id] : [],
          followUp:
            kind === "Refusal"
              ? "Request written refusal and source authority."
              : kind === "Commitment"
                ? "Assign owner, deadline, and written confirmation."
                : "Review after meeting.",
          kind,
        };
      })
      .filter((note): note is MeetingNote => Boolean(note))
      .slice(0, 14);
    setMeetingNotes((current) => [...created, ...current]);
  }

  function composeLiveResponse() {
    if (!selectedEvidence) return;
    const source = documentById.get(selectedEvidence.documentId);
    const claim =
      liveClaimDraft.trim() ||
      "The other party made a claim that needs to be anchored in the record.";
    setComposedResponse(
      [
        `Claim heard: ${claim}`,
        "",
        `Record anchor: ${source?.exhibit ?? "Unlabeled source"} - ${
          source?.title ?? "Unknown source"
        }, page ${selectedEvidence.page || "pending"}.`,
        `Exact quote: "${selectedEvidence.quote}"`,
        "",
        `Professional response: I want to anchor this in the written record. ${selectedEvidence.question}`,
        "",
        `Follow-up request: If your position is different from this record, please identify the document, page, responsible decision-maker, and written basis for that position.`,
        "",
        `Counter point: ${selectedEvidence.counter}`,
      ].join("\n"),
    );
  }

  function openAuditRow(row: AuditRow) {
    if (row.evidenceId) setSelectedEvidenceId(row.evidenceId);
    if (row.documentId) setActiveDocumentId(row.documentId);
    setView(row.targetView);
  }

  function logComposedResponse(kind: MeetingNote["kind"]) {
    if (!composedResponse.trim() || !selectedEvidence) return;
    const note: MeetingNote = {
      id: makeId("note"),
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      speaker: "SourceDeck composer",
      topic: selectedEvidence.title,
      note: composedResponse,
      linkedEvidence: [selectedEvidence.id],
      followUp: "Use this as the record anchor and request a written basis if disputed.",
      kind,
    };
    setMeetingNotes((current) => [note, ...current]);
  }

  function togglePacket(cardId: string) {
    setPacketIds((current) =>
      current.includes(cardId)
        ? current.filter((id) => id !== cardId)
        : [cardId, ...current],
    );
  }

  function copyText(value: string) {
    void navigator.clipboard?.writeText(value);
  }

  function resetWorkspace() {
    setDocuments(seedDocuments);
    setCaseProfile(seedCaseProfile);
    setEvidence(seedEvidence);
    setIssues(seedIssues);
    setTimeline(seedTimeline);
    setMissingRecords(seedMissingRecords);
    setMeetingNotes([]);
    setPacketIds([]);
    setPrepSuggestions([]);
    setPrepText("");
    setMeetingStartedAt(null);
    setSelectedEvidenceId(seedEvidence[0].id);
    setActiveIssueId(seedIssues[0].id);
    setActiveDocumentId(seedDocuments[0].id);
  }

  const renderEvidenceCard = (card: EvidenceCard, compact = false) => {
    const source = documentById.get(card.documentId);
    const active = selectedEvidence?.id === card.id;
    return (
      <article
        key={card.id}
        className={`evidence-card ${active ? "is-active" : ""}`}
        onClick={() => setSelectedEvidenceId(card.id)}
      >
        <div className="card-topline">
          <span className={`priority priority-${card.priority.toLowerCase()}`}>
            {card.priority}
          </span>
          <span>{source?.exhibit ?? "Unlabeled"} / page {card.page || "pending"}</span>
          <span>{cardVerificationStatus(card)}</span>
        </div>
        <h3>{card.title}</h3>
        <blockquote>{card.quote}</blockquote>
        {!compact && (
          <>
            <p>{card.meaning}</p>
            <div className="card-actions">
              <button type="button" onClick={(event) => {
                event.stopPropagation();
                copyText(card.quote);
              }}>
                <ClipboardCopy size={16} /> Copy quote
              </button>
              <button type="button" onClick={(event) => {
                event.stopPropagation();
                copyText(card.question);
              }}>
                <MessageSquareQuote size={16} /> Copy question
              </button>
              <button type="button" onClick={(event) => {
                event.stopPropagation();
                togglePacket(card.id);
              }}>
                <FileArchive size={16} />
                {packetIds.includes(card.id) ? "In packet" : "Add packet"}
              </button>
              <button type="button" onClick={(event) => {
                event.stopPropagation();
                void verifyEvidenceCard(card.id);
              }}>
                <ShieldCheck size={16} />
                {cardVerificationStatus(card) === "verified" ? "Verified" : "Verify"}
              </button>
            </div>
          </>
        )}
      </article>
    );
  };

  const renderVerificationQueueItem = (item: VerificationQueueItem) => {
    const active = selectedEvidence?.id === item.card.id;
    const stateLabel =
      item.state === "stale"
        ? "Stale"
        : item.state === "ready"
          ? "Ready"
          : item.state === "verified"
            ? "Verified"
            : "Blocked";
    return (
      <article
        key={item.card.id}
        className={`verification-queue-item queue-${item.state} ${active ? "is-active" : ""}`}
      >
        <button
          type="button"
          className="queue-main"
          onClick={() => {
            setSelectedEvidenceId(item.card.id);
            setActiveDocumentId(item.card.documentId);
          }}
        >
          <span className={`queue-state queue-state-${item.state}`}>{stateLabel}</span>
          <strong>{item.card.title}</strong>
          <span>
            {item.document?.exhibit ?? "Unlabeled"} / page {item.card.page || "pending"} /{" "}
            {item.blockerCount} blocker{item.blockerCount === 1 ? "" : "s"}
          </span>
          {item.staleReason ? <em>{item.staleReason}</em> : null}
          {!item.staleReason && item.blockers[0] ? <em>{item.blockers[0]}</em> : null}
        </button>
        <div className="queue-actions">
          <button
            type="button"
            onClick={() => {
              setSelectedEvidenceId(item.card.id);
              setActiveDocumentId(item.card.documentId);
              setView("documents");
            }}
          >
            <FileSearch size={15} /> Page
          </button>
          <button
            type="button"
            disabled={!item.packetEligible || item.state === "verified"}
            onClick={() => void verifyEvidenceCard(item.card.id)}
          >
            <ShieldCheck size={15} /> Sign off
          </button>
        </div>
      </article>
    );
  };

  const renderSourcePreview = (card: EvidenceCard) => {
    const source = documentById.get(card.documentId);
    const context = quoteContext(source?.extractedText, card.quote);
    const hasContext = Boolean(context);
    return (
      <div className="source-preview">
        <div className="preview-topline">
          <span>{source?.exhibit ?? "Unlabeled source"}</span>
          <span>{source?.title ?? "Unknown document"}</span>
          <span>Page {card.page || "pending"}</span>
        </div>
        <div className="paper-page">
          <p className="page-label">Source page preview</p>
          {hasContext ? (
            <p>{context}</p>
          ) : (
            <>
              <p>
                Full PDF page rendering is the next worker-backed layer. This
                preview still preserves the meeting surface: exhibit, source
                title, page, exact quote, and exportable packet.
              </p>
              <mark>{card.quote}</mark>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderVerificationWorkbench = (
    diagnostic: ReturnType<typeof diagnoseEvidenceCard>,
  ) => {
    const checks = [
      {
        label: "Source chain",
        value: diagnostic.sourceTerminates ? "terminates" : "broken",
        pass: diagnostic.sourceTerminates,
      },
      {
        label: "Exact quote",
        value: diagnostic.quoteExact ? "matched" : "missing",
        pass: diagnostic.quoteExact,
      },
      {
        label: "Source backing",
        value: diagnostic.spanBackedBySource ? "backed" : "unbacked",
        pass: diagnostic.spanBackedBySource,
      },
      {
        label: "Anchor",
        value: diagnostic.anchorStatus ?? "missing",
        pass: diagnostic.anchorUsable,
      },
      {
        label: "Packet",
        value: diagnostic.packetEligible ? "eligible" : "blocked",
        pass: diagnostic.packetEligible,
      },
    ];

    return (
      <div className="verification-workbench">
        <div className={`proof-banner ${diagnostic.packetEligible ? "pass" : "fail"}`}>
          {diagnostic.packetEligible ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <div>
            <strong>
              {diagnostic.packetEligible
                ? "SourceStack packet proof passes"
                : "SourceStack packet proof blocked"}
            </strong>
            <span>
              {diagnostic.verificationStatus ?? "missing"} / {diagnostic.documentTitle ?? "No document"}{" "}
              / {diagnostic.pageId ?? diagnostic.mediaSegmentId ?? "no anchor"}
            </span>
          </div>
        </div>
        <div className="proof-grid">
          {checks.map((check) => (
            <div key={check.label} className={`proof-cell ${check.pass ? "pass" : "fail"}`}>
              <span>{check.label}</span>
              <strong>{check.value}</strong>
            </div>
          ))}
        </div>
        {diagnostic.blockers.length ? (
          <ul className="proof-blockers">
            {diagnostic.blockers.map((blocker) => (
              <li key={blocker}>{blocker}</li>
            ))}
          </ul>
        ) : null}
        {diagnostic.exactTextPreview ? (
          <div className="proof-span">
            <span>
              Span {diagnostic.charRange?.[0] ?? 0}-{diagnostic.charRange?.[1] ?? 0}
            </span>
            <p>{diagnostic.exactTextPreview}</p>
          </div>
        ) : null}
      </div>
    );
  };

  const renderSearchHit = (hit: CommandSearchHit) => {
    const intelligenceMatch = intelligenceMatchById.get(hit.id);
    return (
      <article key={hit.id} className={`search-hit search-hit-${hit.tier}`}>
        <div className="search-hit-main">
          <div className="search-hit-topline">
            <span className={`tier-pill tier-${hit.tier}`}>
              {hit.tier === "top" ? "Top" : hit.tier === "middle" ? "Middle" : "Far reach"}
            </span>
            <span>{hit.lane === "exact" ? "Exact lane" : "Smart fuzzy lane"}</span>
            {intelligenceMatch ? (
              <span className={`cli-tier cli-tier-${intelligenceMatch.tier}`}>
                CLI {intelligenceMatch.tier}
              </span>
            ) : null}
            <span>{Math.round(hit.score * 100)}%</span>
            <span>{hit.exhibit} / page {hit.page}</span>
          </div>
          <h3>{hit.title}</h3>
          <blockquote>{hit.quote}</blockquote>
          <p>{hit.snippet}</p>
          <div className="matched-terms">
            <strong>{hit.matchReason}</strong>
            {hit.matchedTerms.slice(0, 8).map((term) => (
              <span key={term}>{term}</span>
            ))}
          </div>
          {intelligenceMatch ? (
            <div className="cli-reason">
              <strong>CLI intelligence</strong>
              <span>{intelligenceMatch.reason}</span>
            </div>
          ) : null}
        </div>
        <div className="search-hit-actions">
          <button type="button" onClick={() => copyText(hit.quote)}>
            <ClipboardCopy size={15} /> Copy
          </button>
          <button type="button" onClick={() => openSearchHit(hit, "documents")}>
            <FolderOpen size={15} /> Source
          </button>
          <button type="button" onClick={() => promoteSearchHitAsEvidence(hit)}>
            <Plus size={15} /> Use as evidence
          </button>
          <button
            type="button"
            onClick={() => {
              promoteSearchHitAsEvidence(hit);
              setView("evidence");
            }}
          >
            <ShieldCheck size={15} /> Verify
          </button>
        </div>
      </article>
    );
  };

  const renderSearchGroup = (group: CommandSearchGroup) => (
    <details key={group.document.id} className="search-group" open>
      <summary>
        <div>
          <strong>{group.document.exhibit} - {group.document.title}</strong>
          <span>
            {group.hits.length} match{group.hits.length === 1 ? "" : "es"} / best{" "}
            {Math.round(group.topScore * 100)}%
          </span>
        </div>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            setActiveDocumentId(group.document.id);
            setView("documents");
          }}
        >
          Open record
        </button>
      </summary>
      <div className="search-hit-list">{group.hits.map(renderSearchHit)}</div>
    </details>
  );

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">SD</div>
          <div>
            <strong>SourceDeck</strong>
            <span>Evidence command center</span>
          </div>
        </div>

        <nav aria-label="Primary">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className={view === item.id ? "active" : ""}
                onClick={() => setView(item.id)}
              >
                <Icon size={18} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-card">
          <span>Meeting posture</span>
          <strong>{meetingType}</strong>
          <p>{caseProfile.name}</p>
          <p>Privacy {privacyMode.replaceAll("_", " ")}</p>
          <p>
            <strong>{meetingReadiness.live} live</strong> · {meetingReadiness.hold} hold ·{" "}
            {meetingReadiness.review} review
          </p>
          <p>{meetingStartedAt ? `Timer ${meetingElapsed}` : "Timer idle"}</p>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Local-first source-grounded evidence prep</p>
            <h1>The right quote, page, and question at the right moment.</h1>
          </div>
          <div className="topbar-actions">
            <select value={meetingType} onChange={(event) => setMeetingType(event.target.value)}>
              {meetingTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
            <select
              aria-label="Privacy mode"
              value={privacyMode}
              onChange={(event) => setPrivacyMode(event.target.value as PrivacyMode)}
            >
              <option value="local_only">Local only</option>
              <option value="hybrid">Hybrid</option>
              <option value="cloud_allowed">Cloud allowed</option>
            </select>
            <button
              type="button"
              onClick={() =>
                meetingStartedAt
                  ? setMeetingStartedAt(null)
                  : (setClockTick(Date.now()), setMeetingStartedAt(new Date().toISOString()))
              }
            >
              <Timer size={17} />
              {meetingStartedAt ? meetingElapsed : "Start timer"}
            </button>
            <button
              type="button"
              className="primary"
              onClick={() =>
                downloadText("sourcedeck-packet.md", buildPacketMarkdown(), "text/markdown")
              }
            >
              <Download size={17} /> Export packet
            </button>
          </div>
        </header>

        <section className="search-panel">
          <Search size={22} />
          <input
            ref={searchInputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") setView("search");
            }}
            placeholder='Search records or commands: doc:"case summary" tag:"Service level agreement" page:1 missed sla'
          />
          <div className="search-counts" aria-label="Search result counts">
            <span>{commandSearchCounts.top} top</span>
            <span>{commandSearchCounts.middle} middle</span>
            <span>{commandSearchCounts.far} far</span>
            <span>{commandSearchCounts.exact} exact</span>
            <span>{commandSearchCounts.smart} smart</span>
            <span>{filteredMissingRecords.length} gaps</span>
            {voiceStatus !== "Voice idle" && <span>{voiceStatus}</span>}
          </div>
          <button
            type="button"
            className={isListening ? "voice-button listening" : "voice-button"}
            onClick={startVoiceQuery}
          >
            <Mic2 size={16} />
            {isListening ? "Listening" : "Voice"}
          </button>
          <button type="button" onClick={() => setView("search")}>
            <Search size={16} /> Search records
          </button>
          <button
            type="button"
            onClick={createIssueFromSearch}
            disabled={!query.trim() || filteredEvidence.length === 0}
          >
            Build issue
          </button>
          <button
            type="button"
            onClick={() =>
              downloadText(
                "sourcedeck-search-packet.md",
                buildPacketMarkdown(filteredEvidence, `Search Packet - ${query || "All Evidence"}`),
                "text/markdown",
              )
            }
            disabled={filteredEvidence.length === 0}
          >
            Export search
          </button>
          <button type="button" onClick={() => setView("meeting")}>
            Meeting mode <ArrowRight size={16} />
          </button>
        </section>

        {view === "search" && (
          <div className="search-workspace">
            <section className="panel search-command-panel">
              <div className="section-title">
                <Search size={20} />
                <div>
                  <h2>Record search</h2>
                  <p>
                    Exact source matches and smart fuzzy matches stay separated. Nothing here is
                    packet-ready until it becomes verified evidence.
                  </p>
                </div>
              </div>
              <div className="search-command-box">
                <textarea
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder='Type, dictate, or filter. Examples: outage window, doc:"case summary" type:pdf, tag:"Support escalation", lane:exact uptime'
                />
                <div className="search-command-meta">
                  <span>Query text: {searchCorpus || "filter-only"}</span>
                  {searchFilterChips.length ? (
                    <div className="command-filter-chips">
                      {searchFilterChips.map((chip) => (
                        <span key={chip}>{chip}</span>
                      ))}
                    </div>
                  ) : (
                    <div className="command-filter-chips">
                      <span>no filters</span>
                    </div>
                  )}
                </div>
                <div className="search-command-actions">
                  <button type="button" className="primary" onClick={() => setView("search")}>
                    <Search size={17} /> Run both lanes
                  </button>
                  <button type="button" onClick={startVoiceQuery}>
                    <Mic2 size={17} /> {isListening ? "Stop voice" : "Speak search"}
                  </button>
                  <button
                    type="button"
                    onClick={() => void runIntelligenceSearch()}
                    disabled={!query.trim() || commandSearchHits.length === 0}
                  >
                    <Brain size={17} /> CLI lane
                  </button>
                  <button type="button" onClick={() => void checkSearchSidecars()}>
                    <Siren size={17} /> Check sidecars
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      searchInputRef.current?.focus();
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="quick-search-grid">
                {quickSearchCommands.map((command) => (
                  <button
                    key={command.label}
                    type="button"
                    onClick={() => {
                      setQuery(command.query);
                      setView("search");
                    }}
                  >
                    {command.label}
                  </button>
                ))}
              </div>
              <div className="retrieval-lanes">
                <div>
                  <strong>{commandSearchCounts.exact}</strong>
                  <span>exact source hits</span>
                </div>
                <div>
                  <strong>{commandSearchCounts.top}</strong>
                  <span>top matches</span>
                </div>
                <div>
                  <strong>{commandSearchCounts.middle}</strong>
                  <span>middle matches</span>
                </div>
                <div>
                  <strong>{commandSearchCounts.far}</strong>
                  <span>far reach</span>
                </div>
                <div>
                  <strong>
                    {intelligenceCounts.top}/{intelligenceCounts.middle}/{intelligenceCounts.far}
                  </strong>
                  <span>CLI top/mid/far</span>
                </div>
              </div>
              <p className="intelligence-status">{intelligenceStatus}</p>
              <div className="local-case-card">
                <div>
                  <strong>Local case folder</strong>
                  {localCaseFolderPath ? <span>{localCaseFolderPath}</span> : null}
                  <code>{localCaseImportCommand}</code>
                  <small>{localCaseImportDetail}</small>
                </div>
                <div className="local-case-actions">
                  <button type="button" onClick={() => copyText(localCaseImportCommand)}>
                    <ClipboardCopy size={15} /> Copy command
                  </button>
                  <label className="file-button">
                    Load workspace JSON
                    <input
                      type="file"
                      accept="application/json,.json"
                      onChange={(event) => importWorkspace(event.target.files)}
                    />
                  </label>
                </div>
              </div>
            </section>

            <section className="panel search-results-panel">
              <div className="section-title">
                <FolderOpen size={20} />
                <div>
                  <h2>Source tree</h2>
                  <p>
                    Grouped by record, then page/excerpt. Use results as cited evidence, then
                    certify in the Verification Workbench.
                  </p>
                </div>
              </div>
              {query.trim() ? (
                commandSearchGroups.length ? (
                  <div className="search-groups">
                    {commandSearchGroups.map(renderSearchGroup)}
                  </div>
                ) : (
                  <div className="empty-state">
                    <FileSearch size={22} />
                    <strong>No source-backed matches yet.</strong>
                    <p>
                      Try fewer words, a person/place name, a service, a date, or dictate the
                      phrase naturally.
                    </p>
                  </div>
                )
              ) : (
                <div className="empty-state">
                  <Mic2 size={22} />
                  <strong>Type or speak a record query.</strong>
                  <p>
                    SourceDeck will search exact text first, then fuzzy record context. The smart
                    lane can suggest, but only verified evidence can leave in a packet.
                  </p>
                </div>
              )}
            </section>
          </div>
        )}

        {view === "battlecard" && (
          <div className="battlecard-view">
            {!battleCard ? (
              <section className="panel">
                <div className="empty-state">
                  <Swords size={22} />
                  <strong>No battle card loaded.</strong>
                  <p>
                    Load a case deck (a workspace JSON) to populate the opening statement, key
                    questions, if-they-say-X lines, and written-record prompts.
                  </p>
                  <label className="primary import-deck-button">
                    Load case deck JSON
                    <input
                      type="file"
                      accept="application/json,.json"
                      style={{ display: "none" }}
                      onChange={(event) => importWorkspace(event.target.files)}
                    />
                  </label>
                </div>
              </section>
            ) : (
              <>
                <div className="deck-reload-bar">
                  <span>{caseProfile?.name}</span>
                  <button type="button" onClick={reloadCaseDeck}>
                    <ArchiveRestore size={14} /> Reload latest deck
                  </button>
                </div>
                <section className="panel">
                  <div className="section-title">
                    <BookOpenCheck size={20} />
                    <div>
                      <h2>Opening statement</h2>
                      <p>Read or paraphrase to frame the meeting.</p>
                    </div>
                  </div>
                  <div className="opening-statement">
                    {battleCard.openingStatement.split("\n\n").map((para, index) => (
                      <p key={index}>{para}</p>
                    ))}
                  </div>
                  <button type="button" onClick={() => copyText(battleCard.openingStatement)}>
                    <ClipboardCopy size={14} /> Copy opening statement
                  </button>
                </section>
                {battleCard.shortOpening && (
                  <section className="panel">
                    <div className="section-title">
                      <BookOpenCheck size={20} />
                      <div>
                        <h2>Short opening (emergency version)</h2>
                        <p>If you need to open in 20 seconds.</p>
                      </div>
                    </div>
                    <div className="opening-statement">
                      <p>{battleCard.shortOpening}</p>
                    </div>
                    <button type="button" onClick={() => copyText(battleCard.shortOpening ?? "")}>
                      <ClipboardCopy size={14} /> Copy short opening
                    </button>
                  </section>
                )}
                {battleCard.agenda && battleCard.agenda.length > 0 && (
                  <section className="panel">
                    <div className="section-title">
                      <ListChecks size={20} />
                      <div>
                        <h2>Meeting order</h2>
                        <p>Keep today in this sequence - don't get pulled into REACH/billing.</p>
                      </div>
                    </div>
                    <ol className="battle-questions">
                      {battleCard.agenda.map((a, index) => (
                        <li key={index}>
                          <span>{index + 1}. {a}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
                {battleCard.liveLines && battleCard.liveLines.length > 0 && (
                  <section className="panel">
                    <div className="section-title">
                      <Swords size={20} />
                      <div>
                        <h2>The 10 live lines</h2>
                        <p>Say verbatim. Calm, cooperative, firm - remedy first.</p>
                      </div>
                    </div>
                    <ol className="battle-questions">
                      {battleCard.liveLines.map((line, index) => (
                        <li key={index}>
                          <span>{line}</span>
                          <button type="button" className="link" onClick={() => copyText(line)}>
                            copy
                          </button>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
                {battleCard.goals && battleCard.goals.length > 0 && (
                  <section className="panel">
                    <div className="section-title">
                      <ListChecks size={20} />
                      <div>
                        <h2>Get these in writing today</h2>
                        <p>Meeting goals - what "done" looks like.</p>
                      </div>
                    </div>
                    <ul className="pwn-prompts">
                      {battleCard.goals.map((g, index) => (
                        <li key={index}>{g}</li>
                      ))}
                    </ul>
                  </section>
                )}
                {battleCard.shortcuts && battleCard.shortcuts.length > 0 && (
                  <section className="panel">
                    <div className="section-title">
                      <Search size={20} />
                      <div>
                        <h2>Evidence shortcuts</h2>
                        <p>Tap a topic to pull the strongest live cards.</p>
                      </div>
                    </div>
                    <div className="issue-buttons">
                      {battleCard.shortcuts.map((s) => (
                        <button
                          key={s.tag}
                          type="button"
                          className={shortcutTag === s.tag ? "active" : ""}
                          onClick={() => setShortcutTag(shortcutTag === s.tag ? null : s.tag)}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                    {shortcutTag &&
                      (() => {
                        const top = evidence
                          .filter(
                            (c) =>
                              (c.meetingStatus ?? "live") === "live" &&
                              c.tags.includes(shortcutTag),
                          )
                          .sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority])
                          .slice(0, 3);
                        if (!top.length)
                          return (
                            <p className="evidence-significance">
                              No live cards for this topic (it may be escalation-lane).
                            </p>
                          );
                        return (
                          <div className="if-then">
                            {top.map((c) => (
                              <div key={c.id} className="if-then-row">
                                <p className="then-line">{c.title}</p>
                                {c.live?.say && (
                                  <p className="evidence-significance">"{c.live.say}"</p>
                                )}
                                <blockquote>{c.quote}</blockquote>
                                <div className="card-actions">
                                  {c.live?.say && (
                                    <button
                                      type="button"
                                      className="link"
                                      onClick={() => copyText(c.live?.say ?? "")}
                                    >
                                      Copy SAY
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="link"
                                    onClick={() => copyText(c.quote)}
                                  >
                                    Copy quote
                                  </button>
                                  <button
                                    type="button"
                                    className="link"
                                    onClick={() => {
                                      setSelectedEvidenceId(c.id);
                                      setView("evidence");
                                    }}
                                  >
                                    Open card
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                  </section>
                )}
                <section className="panel">
                  <div className="section-title">
                    <ListChecks size={20} />
                    <div>
                      <h2>Ten key questions</h2>
                      <p>Drive the agenda; tap copy to drop one into chat or notes.</p>
                    </div>
                  </div>
                  <ol className="battle-questions">
                    {battleCard.questions.map((q, index) => (
                      <li key={index}>
                        <span>{q}</span>
                        <button type="button" className="link" onClick={() => copyText(q)}>
                          copy
                        </button>
                      </li>
                    ))}
                  </ol>
                </section>
                <section className="panel">
                  <div className="section-title">
                    <MessageSquareQuote size={20} />
                    <div>
                      <h2>If they say X, respond Y</h2>
                      <p>Prepared responses to the other side's likely positions.</p>
                    </div>
                  </div>
                  <div className="if-then">
                    {battleCard.ifThen.map((row, index) => (
                      <div key={index} className="if-then-row">
                        <p className="if-line">
                          <strong>If:</strong> {row.if}
                        </p>
                        <p className="then-line">
                          <strong>Respond:</strong> {row.then}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
                <section className="panel">
                  <div className="section-title">
                    <Siren size={20} />
                    <div>
                      <h2>Written-record / refusal prompts</h2>
                      <p>Force the written record if the other side refuses.</p>
                    </div>
                  </div>
                  <ul className="pwn-prompts">
                    {battleCard.pwnPrompts.map((p, index) => (
                      <li key={index}>{p}</li>
                    ))}
                  </ul>
                </section>
                {battleCard.copyPhrases && battleCard.copyPhrases.length > 0 && (
                  <section className="panel">
                    <div className="section-title">
                      <ClipboardCopy size={20} />
                      <div>
                        <h2>One-tap phrases</h2>
                        <p>Tap to copy a ready line into chat or notes.</p>
                      </div>
                    </div>
                    <ol className="battle-questions">
                      {battleCard.copyPhrases.map((p, index) => (
                        <li key={index}>
                          <span>{p}</span>
                          <button type="button" className="link" onClick={() => copyText(p)}>
                            copy
                          </button>
                        </li>
                      ))}
                    </ol>
                  </section>
                )}
                {battleCard.holdList && battleCard.holdList.length > 0 && (
                  <section className="panel hold-panel">
                    <div className="section-title">
                      <Siren size={20} />
                      <div>
                        <h2>HOLD for escalation - do not lead with these</h2>
                        <p>Use only if directly needed; otherwise these are the formal escalation.</p>
                      </div>
                    </div>
                    <ul className="pwn-prompts">
                      {battleCard.holdList.map((h, index) => (
                        <li key={index}>{h}</li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {view === "conflicts" && (
          <div className="battlecard-view">
            {conflicts.length === 0 ? (
              <section className="panel">
                <div className="empty-state">
                  <GitCompare size={22} />
                  <strong>No conflict views loaded.</strong>
                  <p>Reload the case deck to populate the source-vs-source conflict stack.</p>
                </div>
              </section>
            ) : (
              <>
                <div className="deck-reload-bar">
                  <span>Conflict stack - each is two sourced quotes that contradict</span>
                </div>
                {conflicts.map((cf) => {
                  const d1 = documentById.get(cf.source1.doc);
                  const d2 = documentById.get(cf.source2.doc);
                  return (
                    <section className="panel" key={cf.id}>
                      <div className="section-title">
                        <GitCompare size={20} />
                        <div>
                          <h2>{cf.title}</h2>
                          <p>{cf.claim}</p>
                        </div>
                      </div>
                      <div className="if-then">
                        <div className="if-then-row">
                          <p className="live-label">SOURCE 1 - {cf.source1.cite}{d1 ? ` (${d1.title})` : ""}</p>
                          <blockquote>{cf.source1.quote}</blockquote>
                          <button type="button" className="link" onClick={() => copyText(cf.source1.quote)}>
                            Copy quote
                          </button>
                        </div>
                        <div className="if-then-row">
                          <p className="live-label">SOURCE 2 - {cf.source2.cite}{d2 ? ` (${d2.title})` : ""}</p>
                          <blockquote>{cf.source2.quote}</blockquote>
                          <button type="button" className="link" onClick={() => copyText(cf.source2.quote)}>
                            Copy quote
                          </button>
                        </div>
                      </div>
                      <p className="evidence-significance"><strong>Why it matters:</strong> {cf.why}</p>
                      <div className="live-response">
                        <div className="live-row">
                          <span className="live-label">SAY</span>
                          <span className="live-say">{cf.say}</span>
                        </div>
                        <div className="live-row">
                          <span className="live-label">NEXT</span>
                          <span>{cf.next}</span>
                        </div>
                        <button type="button" className="link copy-live" onClick={() => copyText(cf.say)}>
                          Copy SAY
                        </button>
                      </div>
                    </section>
                  );
                })}
              </>
            )}
          </div>
        )}

        {view === "command" && (
          <div className="command-grid">
            <section className="hero-panel">
              <div className="hero-copy">
                <p className="eyebrow">Live evidence retrieval</p>
                <h2>Never say "I will find it later."</h2>
                <p>
                  Preload documents, let AI prep the issue map, then use the deck
                  during the meeting to pull exact quotes, page references,
                  questions, refusals, and exportable packets.
                </p>
              </div>
              <div className="case-profile-grid">
                <input
                  value={caseProfile.name}
                  onChange={(event) =>
                    setCaseProfile({ ...caseProfile, name: event.target.value })
                  }
                  placeholder="Case name"
                />
                <input
                  value={caseProfile.role}
                  onChange={(event) =>
                    setCaseProfile({ ...caseProfile, role: event.target.value })
                  }
                  placeholder="Your role"
                />
                <input
                  type="date"
                  value={caseProfile.meetingDate}
                  onChange={(event) =>
                    setCaseProfile({ ...caseProfile, meetingDate: event.target.value })
                  }
                />
                <input
                  value={caseProfile.objective}
                  onChange={(event) =>
                    setCaseProfile({ ...caseProfile, objective: event.target.value })
                  }
                  placeholder="Meeting objective"
                />
              </div>
              <div className="metric-row">
                <div><strong>{documents.length}</strong><span>documents</span></div>
                <div><strong>{evidence.length}</strong><span>evidence cards</span></div>
                <div><strong>{issues.length}</strong><span>issues</span></div>
                <div><strong>{missingRecords.filter((record) => record.status !== "Produced").length}</strong><span>record gaps</span></div>
              </div>
            </section>

            <section className="panel">
              <div className="section-title">
                <Siren size={20} />
                <div>
                  <h2>Critical issue buttons</h2>
                  <p>Use these under pressure.</p>
                </div>
              </div>
              <div className="issue-buttons">
                {criticalEvidence.slice(0, 7).map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => {
                      setSelectedEvidenceId(card.id);
                      setView("meeting");
                    }}
                  >
                    {card.title}
                  </button>
                ))}
              </div>
            </section>

            <section className="panel wide">
              <div className="section-title">
                <ClipboardCheck size={20} />
                <div>
                  <h2>Case templates</h2>
                  <p>Apply a meeting posture, default issues, and missing-record targets.</p>
                </div>
              </div>
              <div className="template-grid">
                {caseTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => applyCaseTemplate(template)}
                  >
                    <strong>{template.title}</strong>
                    <span>{template.issues.length} issues / {template.missingRecords.length} records</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel wide">
              <div className="section-title">
                <MessageSquareQuote size={20} />
                <div>
                  <h2>Fastest matching evidence</h2>
                  <p>{filteredEvidence.length} cards match the current search.</p>
                </div>
              </div>
              <div className="evidence-grid">
                {filteredEvidence.slice(0, 4).map((card) => renderEvidenceCard(card))}
              </div>
            </section>

            <section className="panel wide">
              <div className="section-title">
                <FolderOpen size={20} />
                <div>
                  <h2>Matching source documents</h2>
                  <p>Search now reaches document text, detected dates, entities, and record gaps.</p>
                </div>
              </div>
              <div className="doc-hit-grid">
                {filteredDocuments.slice(0, 4).map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    onClick={() => {
                      setActiveDocumentId(document.id);
                      setView("documents");
                    }}
                  >
                    <strong>{document.exhibit} - {document.title}</strong>
                    <span>{document.status} / {(document.textChars ?? 0).toLocaleString()} chars</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="panel wide">
              <div className="section-title">
                <ShieldCheck size={20} />
                <div>
                  <h2>Source integrity audit</h2>
                  <p>{sourceAudit.length} items need review before a serious packet.</p>
                </div>
              </div>
              {staleSignoffCount > 0 && (
                <p className="signoff-review-banner">
                  ⚠ {staleSignoffCount} signed-off{" "}
                  {staleSignoffCount === 1 ? "card needs" : "cards need"} re-verification - the
                  source changed since signoff.
                </p>
              )}
              <div className="audit-list">
                {sourceAudit.slice(0, 8).map((row) => (
                  <article key={row.id}>
                    <span className={`priority priority-${row.severity.toLowerCase()}`}>
                      {row.severity}
                    </span>
                    <div>
                      <strong>{row.title}</strong>
                      <p>{row.detail}</p>
                    </div>
                    <button type="button" onClick={() => openAuditRow(row)}>
                      Review
                    </button>
                  </article>
                ))}
                {sourceAudit.length === 0 && (
                  <article>
                    <CheckCircle2 size={18} />
                    <div>
                      <strong>All visible cards are source-anchored.</strong>
                      <p>Documents, page references, quotes, and confidence checks are clean.</p>
                    </div>
                  </article>
                )}
              </div>
            </section>
          </div>
        )}

        {view === "documents" && (
          <div className="two-column">
            <section className="panel">
              <div className="section-title">
                <Upload size={20} />
                <div>
                  <h2>Document vault</h2>
                  <p>Import records, label exhibits, and track OCR/review status.</p>
                </div>
              </div>
              <label
                className="drop-zone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  void addFiles(event.dataTransfer.files);
                }}
              >
                <Upload size={24} />
                <span>Drop files here or click to import DOCX, PDF, text, CSV, JSON, and images</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.md,.csv,.json,.log,.html,.png,.jpg,.jpeg,.tif,.tiff"
                  onChange={(event) => void addFiles(event.target.files)}
                />
              </label>
              {importStatus ? <p className="import-status">{importStatus}</p> : null}
              <div className="doc-list">
                {documents.map((document) => (
                  <article key={document.id} className="doc-row">
                    <FileText size={18} />
                    <div>
                      <strong>{document.exhibit} - {document.title}</strong>
                      <span>{document.type} / {compactDate(document.date)} / {document.author}</span>
                      {typeof document.textChars === "number" && document.textChars > 0 && (
                        <span>{document.textChars.toLocaleString()} searchable characters</span>
                      )}
                      {document.warning && <em>{document.warning}</em>}
                    </div>
                    <span className={`status status-${document.status.toLowerCase().replace(" ", "-")}`}>
                      {document.status}
                    </span>
                    <button
                      type="button"
                      className="row-action"
                      onClick={() => setActiveDocumentId(document.id)}
                    >
                      Review
                    </button>
                  </article>
                ))}
              </div>
            </section>

            <section className="panel">
              {activeDocument ? (
                <div className="document-review">
                  <div className="section-title">
                    <FileSearch size={20} />
                    <div>
                      <h2>Source review</h2>
                      <p>
                        {activeDocument.exhibit} - {activeDocument.title}
                      </p>
                    </div>
                  </div>
                  <div className="source-stats">
                    <span>{activeDocument.pages || 0} pages</span>
                    <span>{(activeDocument.textChars ?? 0).toLocaleString()} chars</span>
                    <span>
                      {(
                        activeDocument.sourceArtifact?.pages.reduce(
                          (total, page) => total + page.geometry.blocks.length,
                          0,
                        ) ?? 0
                      ).toLocaleString()}{" "}
                      blocks
                    </span>
                    <span>{activeDocument.status}</span>
                    <span>
                      {activeDocument.sourceVaultManifest
                        ? activeDocument.sourceVaultVerified &&
                          sourceVaultManifestHasPayloads(activeDocument.sourceVaultManifest)
                          ? "vault verified"
                          : "vault locked"
                        : "vault pending"}
                    </span>
                    <span>
                      {activeDocument.sourceArtifact
                        ? activeDocument.sourceArtifactVerified
                          ? "artifact verified"
                          : "artifact failed"
                        : "artifact pending"}
                    </span>
                  </div>
                  {activeDocument.sourceArtifact ? (
                    <div
                      className={`artifact-proof ${
                        activeDocument.sourceArtifactVerified ? "pass" : "fail"
                      }`}
                    >
                      <ShieldCheck size={18} />
                      <div>
                        <strong>
                          {activeDocument.sourceArtifactVerified
                            ? "Durable source artifact verified"
                            : "Durable source artifact failed"}
                        </strong>
                        <span>{activeDocument.sourceArtifact.contentHash}</span>
                        {activeDocument.sourceArtifactFailure ? (
                          <p>{activeDocument.sourceArtifactFailure}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {activeDocument.sourceVaultManifest ? (
                    <div
                      className={`artifact-proof ${
                        activeDocument.sourceVaultVerified ? "pass" : "fail"
                      }`}
                    >
                      <ArchiveRestore size={18} />
                      <div>
                        <strong>
                          {activeDocument.sourceVaultVerified &&
                          sourceVaultManifestHasPayloads(activeDocument.sourceVaultManifest)
                            ? "Source vault storage verified"
                            : "Source vault needs encrypted custody"}
                        </strong>
                        <span>{activeDocument.sourceVaultManifest.manifestHash}</span>
                        <p>
                          Original {activeDocument.sourceVaultManifest.original.contentHash};{" "}
                          {activeDocument.sourceVaultManifest.pageImages.length} rendered page image
                          {activeDocument.sourceVaultManifest.pageImages.length === 1 ? "" : "s"}.
                        </p>
                        {activeDocument.sourceVaultFailure ? (
                          <p>{activeDocument.sourceVaultFailure}</p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  <div className="detected-list">
                    <div>
                      <strong>Detected dates</strong>
                      <p>
                        {activeDocument.detectedDates?.length
                          ? activeDocument.detectedDates.join(", ")
                          : "None detected yet"}
                      </p>
                    </div>
                    <div>
                      <strong>Detected entities</strong>
                      <p>
                        {activeDocument.detectedEntities?.length
                          ? activeDocument.detectedEntities.join(", ")
                          : "None detected yet"}
                      </p>
                    </div>
                  </div>
                  <div className="page-text-list">
                    {(activeDocument.pageTexts?.length
                      ? activeDocument.pageTexts
                      : [{ page: 1, text: activeDocument.extractedText ?? "" }]
                    ).map((page) => (
                      <article key={page.page}>
                        <div>
                          <strong>Page {page.page}</strong>
                          <button
                            type="button"
                            onClick={() => promoteDocumentPage(activeDocument, page.page)}
                          >
                            Promote to evidence
                          </button>
                        </div>
                        <p>{page.text || "No extracted text for this page yet."}</p>
                      </article>
                    ))}
                  </div>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => suggestFromDocument(activeDocument)}
                    disabled={!activeDocument.extractedText}
                  >
                    <Brain size={17} /> Generate suggestions from source
                  </button>
                  <button
                    type="button"
                    onClick={() => buildTimelineFromDocument(activeDocument)}
                    disabled={!activeDocument.extractedText && !activeDocument.detectedDates?.length}
                  >
                    <CalendarDays size={17} /> Add detected dates to timeline
                  </button>
                </div>
              ) : null}
            </section>

            <section className="panel">
              <div className="section-title">
                <Plus size={20} />
                <div>
                  <h2>Manual evidence builder</h2>
                  <p>Create a card in seconds while reviewing a document.</p>
                </div>
              </div>
              <div className="form-stack">
                <input
                  value={manualCard.title}
                  onChange={(event) => setManualCard({ ...manualCard, title: event.target.value })}
                  placeholder="Issue title"
                />
                <select
                  value={manualCard.documentId}
                  onChange={(event) => setManualCard({ ...manualCard, documentId: event.target.value })}
                >
                  {documents.map((document) => (
                    <option key={document.id} value={document.id}>
                      {document.exhibit} - {document.title}
                    </option>
                  ))}
                </select>
                <div className="inline-fields">
                  <input
                    value={manualCard.category}
                    onChange={(event) =>
                      setManualCard({ ...manualCard, category: event.target.value })
                    }
                    placeholder="Category"
                  />
                  <input
                    value={manualCard.page}
                    onChange={(event) => setManualCard({ ...manualCard, page: event.target.value })}
                    placeholder="Page"
                  />
                </div>
                <textarea
                  value={manualCard.quote}
                  onChange={(event) => setManualCard({ ...manualCard, quote: event.target.value })}
                  placeholder="Exact quote"
                />
                <textarea
                  value={manualCard.question}
                  onChange={(event) =>
                    setManualCard({ ...manualCard, question: event.target.value })
                  }
                  placeholder="Question to ask"
                />
                <button type="button" className="primary" onClick={addManualEvidence}>
                  <Plus size={17} /> Add evidence card
                </button>
              </div>
            </section>
          </div>
        )}

        {view === "evidence" && (
          <div className="evidence-view">
            <section className="panel evidence-list">
              <div className="section-title">
                <FileSearch size={20} />
                <div>
                  <h2>Evidence cards</h2>
                  <p>Atomic quote, source, meaning, question, defense, and counter.</p>
                </div>
              </div>
              <div className="verification-queue">
                <div className="queue-header">
                  <div>
                    <strong>Verification queue</strong>
                    <span>
                      {verificationQueueCounts.ready} ready / {verificationQueueCounts.blocked} blocked /{" "}
                      {verificationQueueCounts.stale} stale
                    </span>
                  </div>
                  <span>{verificationQueueCounts.verified} verified</span>
                </div>
                <div className="queue-count-grid">
                  <span className="queue-count-ready">{verificationQueueCounts.ready} ready</span>
                  <span className="queue-count-blocked">
                    {verificationQueueCounts.blocked} blocked
                  </span>
                  <span className="queue-count-stale">{staleSignoffCount} stale signoffs</span>
                  <span className="queue-count-verified">
                    {verificationQueueCounts.verified} verified
                  </span>
                </div>
                <div className="verification-queue-list">
                  {verificationQueue.slice(0, 10).map(renderVerificationQueueItem)}
                </div>
              </div>
              {filteredEvidence.map((card) => renderEvidenceCard(card))}
            </section>

            {selectedEvidence && (
              <section className="panel detail-panel">
                <div className="detail-source">
                  <span className={`priority priority-${selectedEvidence.priority.toLowerCase()}`}>
                    {selectedEvidence.priority}
                  </span>
                  {(() => {
                    const ms = selectedEvidence.meetingStatus ?? "live";
                    const cls =
                      ms === "hold"
                        ? "status-missing"
                        : ms === "review"
                          ? "status-partial"
                          : "status-produced";
                    const label =
                      ms === "hold"
                        ? "HOLD FOR ESCALATION"
                        : ms === "review"
                          ? "NEEDS REVIEW"
                          : "LIVE VERIFIED";
                    return <span className={`status ${cls}`}>{label}</span>;
                  })()}
                  <span>
                    {documentById.get(selectedEvidence.documentId)?.exhibit} / page{" "}
                    {selectedEvidence.page || "pending"}
                  </span>
                </div>
                <h2>{selectedEvidence.title}</h2>
                {(selectedEvidence.speaker || selectedEvidence.date) && (
                  <p className="evidence-attribution">
                    {selectedEvidence.speaker}
                    {selectedEvidence.speaker && selectedEvidence.date ? " · " : ""}
                    {selectedEvidence.date}
                  </p>
                )}
                {documentById.get(selectedEvidence.documentId)?.signer && (
                  <p className="doc-signer">
                    <strong>Document signed by:</strong>{" "}
                    {documentById.get(selectedEvidence.documentId)?.signer}
                    {documentById.get(selectedEvidence.documentId)?.signedDate
                      ? ` (${documentById.get(selectedEvidence.documentId)?.signedDate})`
                      : ""}
                  </p>
                )}
                <blockquote>{selectedEvidence.quote}</blockquote>
                <div className="card-actions">
                  {selectedEvidence.live?.say && (
                    <button type="button" onClick={() => copyText(selectedEvidence.live?.say ?? "")}>
                      <ClipboardCopy size={14} /> Copy SAY
                    </button>
                  )}
                  <button type="button" onClick={() => copyText(selectedEvidence.quote)}>
                    <ClipboardCopy size={14} /> Copy quote
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDocumentId(selectedEvidence.documentId);
                      setView("documents");
                    }}
                  >
                    <FileSearch size={16} /> Open page
                  </button>
                  <button type="button" onClick={() => togglePacket(selectedEvidence.id)}>
                    {packetIds.includes(selectedEvidence.id) ? "In packet ✓" : "Add to packet"}
                  </button>
                </div>
                {selectedEvidence.needsVerification && (
                  <p className="needs-verification">
                    ⚠ Needs verification — OCR/image source. Confirm the exact quote and page before
                    relying on it.
                  </p>
                )}
                {selectedEvidence.meaning && (
                  <p className="evidence-significance">
                    <strong>Significance:</strong> {selectedEvidence.meaning}
                  </p>
                )}
                {selectedEvidence.live && (
                  <div className="live-response">
                    <div className="live-row">
                      <span className="live-label">ISSUE</span>
                      <span>{selectedEvidence.live.issue}</span>
                    </div>
                    <div className="live-row">
                      <span className="live-label">SAY</span>
                      <span className="live-say">“{selectedEvidence.live.say}”</span>
                    </div>
                    <div className="live-row">
                      <span className="live-label">PULL</span>
                      <span>{selectedEvidence.live.pull}</span>
                    </div>
                    <div className="live-row">
                      <span className="live-label">NEXT</span>
                      <span>{selectedEvidence.live.next}</span>
                    </div>
                    <button
                      type="button"
                      className="copy-live"
                      onClick={() =>
                        copyText(
                          `ISSUE: ${selectedEvidence.live?.issue}\nSAY: ${selectedEvidence.live?.say}\nPULL: ${selectedEvidence.live?.pull}\nNEXT: ${selectedEvidence.live?.next}`,
                        )
                      }
                    >
                      <ClipboardCopy size={14} /> Copy ISSUE/SAY/PULL/NEXT
                    </button>
                  </div>
                )}
                {selectedEvidence.likelyDefense && (
                  <p className="evidence-counter">
                    <strong>They may say:</strong> {selectedEvidence.likelyDefense}
                  </p>
                )}
                {selectedEvidence.counter && (
                  <p className="evidence-response">
                    <strong>Response:</strong> {selectedEvidence.counter}
                  </p>
                )}
                {renderSourcePreview(selectedEvidence)}
                {selectedEvidenceDiagnostic
                  ? renderVerificationWorkbench(selectedEvidenceDiagnostic)
                  : null}
                <div className="card-actions">
                  <input
                    className="reviewer-input"
                    value={reviewerIdentity}
                    onChange={(event) => setReviewerIdentity(event.target.value)}
                    placeholder="Reviewer name"
                    aria-label="Reviewer identity for signoff"
                  />
                  <button type="button" onClick={() => reanchorEvidenceCard(selectedEvidence.id)}>
                    <FileSearch size={16} /> Reanchor quote
                  </button>
                  <button
                    type="button"
                    onClick={() => void verifyEvidenceCard(selectedEvidence.id)}
                  >
                    <ShieldCheck size={16} /> Sign off verified
                  </button>
                  <button type="button" onClick={() => void disputeEvidenceCard(selectedEvidence.id)}>
                    Dispute
                  </button>
                  <button
                    type="button"
                    onClick={() => mergeSelectedCardDuplicates(selectedEvidence.id)}
                  >
                    Merge duplicates
                  </button>
                </div>
                {selectedLatestSignoff && selectedSignoffCurrent?.cardId === selectedEvidence.id ? (
                  <p
                    className={`signoff-status ${
                      selectedSignoffCurrent.current ? "current" : "stale"
                    }`}
                  >
                    {selectedSignoffCurrent.current
                      ? `Signed off by ${String(
                          selectedLatestSignoff.payload.reviewer ?? selectedLatestSignoff.actor,
                        )} - source unchanged since signoff.`
                      : `Signed off by ${String(
                          selectedLatestSignoff.payload.reviewer ?? selectedLatestSignoff.actor,
                        )}, but the source changed since - re-verification recommended.`}
                  </p>
                ) : null}
                <div className="split-control">
                  <textarea
                    className="split-input"
                    value={splitDraft}
                    onChange={(event) => setSplitDraft(event.target.value)}
                    placeholder="Split into narrower cards: one exact sub-quote per line (each must appear in this card's quote)"
                    aria-label="Sub-quotes to split this card into"
                    rows={2}
                  />
                  <button type="button" onClick={() => splitSelectedCard(selectedEvidence.id)}>
                    Split into cards
                  </button>
                </div>
                <div className="split-control">
                  <input
                    className="split-input"
                    value={quoteDraft}
                    onChange={(event) => setQuoteDraft(event.target.value)}
                    placeholder="Edit quote: paste the corrected exact quote (must appear in the source)"
                    aria-label="Edited exact quote"
                  />
                  <button type="button" onClick={() => editSelectedCardQuote(selectedEvidence.id)}>
                    Save quote
                  </button>
                </div>
                <dl>
                  <div><dt>Meaning</dt><dd>{selectedEvidence.meaning}</dd></div>
                  <div><dt>Strategic use</dt><dd>{selectedEvidence.strategicUse}</dd></div>
                  <div><dt>Ask</dt><dd>{selectedEvidence.question}</dd></div>
                  <div><dt>Likely defense</dt><dd>{selectedEvidence.likelyDefense}</dd></div>
                  <div><dt>Counter</dt><dd>{selectedEvidence.counter}</dd></div>
                </dl>
                <div className="card-actions">
                  <button type="button" onClick={() => copyText(selectedEvidence.quote)}>
                    <ClipboardCopy size={16} /> Copy quote
                  </button>
                  <button type="button" onClick={() => copyText(selectedEvidence.question)}>
                    <ClipboardCheck size={16} /> Copy question
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadText(
                        `${selectedEvidence.title.toLowerCase().replaceAll(" ", "-")}.md`,
                        buildPacketMarkdown([selectedEvidence]),
                        "text/markdown",
                      )
                    }
                  >
                    <Highlighter size={16} /> Export card
                  </button>
                </div>
              </section>
            )}
          </div>
        )}

        {view === "issues" && (
          <div className="two-column">
            <section className="panel">
              <div className="section-title">
                <Scale size={20} />
                <div>
                  <h2>Issue maps</h2>
                  <p>Evidence chains organized into arguments.</p>
                </div>
              </div>
              <div className="issue-list">
                {issues
                  .sort((left, right) => left.meetingPriority - right.meetingPriority)
                  .map((issue) => (
                    <button
                      key={issue.id}
                      type="button"
                      className={activeIssue?.id === issue.id ? "issue-row active" : "issue-row"}
                      onClick={() => setActiveIssueId(issue.id)}
                    >
                      <strong>{issue.title}</strong>
                      <span>{issue.description}</span>
                      <em>{issue.status}</em>
                    </button>
                  ))}
              </div>
            </section>

            <section className="panel">
              <div className="section-title">
                <ListChecks size={20} />
                <div>
                  <h2>{activeIssue?.title}</h2>
                  <p>{activeIssue?.description}</p>
                </div>
              </div>
              {activeIssueProofPath ? (
                <div className="completeness-card">
                  <div>
                    <strong>{activeIssueProofPath.packetReadiness.replaceAll("_", " ")}</strong>
                    <span>SourceStack proof path</span>
                  </div>
                  <div className="completeness-grid">
                    <span className={activeIssueProofPath.strongestPath.length ? "present" : "missing"}>
                      Strongest path:{" "}
                      {activeIssueProofPath.strongestPath.map((card) => card.assertion).join(" / ") ||
                        "No verified source-resolved cards"}
                    </span>
                    <span className={activeIssueProofPath.weakestLink ? "present" : "missing"}>
                      Weakest link: {activeIssueProofPath.weakestLink?.assertion ?? "None yet"}
                    </span>
                    <span className={activeIssueProofPath.blockedCardIds.length ? "missing" : "present"}>
                      Blocked cards: {activeIssueProofPath.blockedCardIds.length}
                    </span>
                    <span className={activeIssueProofPath.reasons.length ? "missing" : "present"}>
                      Gate notes: {activeIssueProofPath.reasons[0] ?? "Verified path is packet-usable"}
                    </span>
                  </div>
                </div>
              ) : null}
              <ol className="chain">
                {activeIssue?.evidenceIds.map((id) => {
                  const card = evidence.find((item) => item.id === id);
                  if (!card) return null;
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedEvidenceId(id);
                          setView("evidence");
                        }}
                      >
                        <strong>{card.title}</strong>
                        <span>{card.quote}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
              <div className="card-actions">
                <button type="button" onClick={() => copyText(buildRemedyPlan())}>
                  <ClipboardCopy size={16} /> Copy remedy plan
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadText(
                      "sourcedeck-remedy-plan.md",
                      buildRemedyPlan(),
                      "text/markdown",
                    )
                  }
                >
                  <Download size={16} /> Export remedy plan
                </button>
              </div>
              <div className="contradiction-list">
                <h3>Contradiction map</h3>
                {contradictions.map((row) => (
                  <article key={row.id}>
                    <span>{row.type}</span>
                    <strong>{row.statementA.title} vs {row.statementB.title}</strong>
                    <p>{row.finding}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedEvidenceId(row.statementB.id);
                        setView("evidence");
                      }}
                    >
                      Open conflict evidence
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {view === "timeline" && (
          <div className="two-column">
            <section className="panel">
              <div className="section-title">
                <CalendarDays size={20} />
                <div>
                  <h2>Timeline</h2>
                  <p>What happened, when, and what source proves it.</p>
                </div>
              </div>
              <div className="timeline">
                {timeline
                  .sort((left, right) => left.date.localeCompare(right.date))
                  .map((entry) => (
                    <article key={entry.id}>
                      <time>{entry.dateLabel ?? compactDate(entry.date)}</time>
                      <div>
                        <strong>{entry.event}</strong>
                        <span>
                          {documentById.get(entry.documentId)?.exhibit} / page {entry.page} /{" "}
                          {entry.issue}
                        </span>
                        <blockquote>{entry.quote}</blockquote>
                      </div>
                    </article>
                  ))}
              </div>
            </section>

            <section className="panel">
              <div className="section-title">
                <AlertTriangle size={20} />
                <div>
                  <h2>Missing records tracker</h2>
                  <p>Records to request, chase, or preserve as refusals.</p>
                </div>
              </div>
              <div className="card-actions">
                <button
                  type="button"
                  onClick={() =>
                    downloadText(
                      "sourcedeck-record-request.md",
                      buildMissingRecordRequest(),
                      "text/markdown",
                    )
                  }
                >
                  <Download size={16} /> Export request
                </button>
                <button type="button" onClick={() => copyText(buildMissingRecordRequest())}>
                  <ClipboardCopy size={16} /> Copy request
                </button>
              </div>
              {recordsLedger.length > 0 ? (
                <div className="completeness-card">
                  <div>
                    <strong>Records ledger</strong>
                    <span>What is in hand vs. still needed</span>
                  </div>
                  <div className="completeness-grid">
                    {recordsLedger.map((row) => (
                      <span
                        key={row.label}
                        className={
                          row.status === "Present"
                            ? "present"
                            : row.status === "Missing"
                              ? "missing"
                              : ""
                        }
                        title={row.note ?? ""}
                      >
                        {row.label}: {row.status}
                        {row.note ? ` — ${row.note}` : ""}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="completeness-card">
                  <div>
                    <strong>{completeness.score}%</strong>
                    <span>Document completeness</span>
                  </div>
                  <div className="completeness-bar">
                    <span style={{ width: `${completeness.score}%` }} />
                  </div>
                  <div className="completeness-grid">
                    {completeness.rows.map((row) => (
                      <span key={row.type} className={row.status === "Present" || row.status === "Produced" ? "present" : "missing"}>
                        {row.type}: {row.status}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="missing-list">
                {missingRecords.map((record) => (
                  <article key={record.id}>
                    <div>
                      <strong>{record.requested}</strong>
                      <span>{record.relatedIssue} / requested {compactDate(record.dateRequested)}</span>
                    </div>
                    <span className={`status status-${record.status.toLowerCase()}`}>{record.status}</span>
                    <p>{record.whyItMatters}</p>
                    <em>{record.followUp}</em>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}

        {view === "meeting" && selectedEvidence && (
          <div className="meeting-grid">
            <section className="panel live-panel">
              <div className="section-title">
                <Mic2 size={20} />
                <div>
                  <h2>Live meeting mode</h2>
                  <p>Search, anchor, copy, log, export.</p>
                </div>
              </div>
              <div className="hot-buttons">
                {criticalEvidence.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedEvidenceId(card.id)}
                  >
                    {card.title}
                  </button>
                ))}
              </div>
              <article className="live-card">
                <span className={`priority priority-${selectedEvidence.priority.toLowerCase()}`}>
                  {selectedEvidence.priority}
                </span>
                <h2>{selectedEvidence.title}</h2>
                <p className="source-line">
                  {documentById.get(selectedEvidence.documentId)?.exhibit} -{" "}
                  {documentById.get(selectedEvidence.documentId)?.title} / page{" "}
                  {selectedEvidence.page || "pending"}
                </p>
                <blockquote>{selectedEvidence.quote}</blockquote>
                {renderSourcePreview(selectedEvidence)}
                <div className="response-box">
                  <strong>Ask it clean:</strong>
                  <p>{selectedEvidence.question}</p>
                </div>
                <div className="response-box muted-box">
                  <strong>Likely defense and counter:</strong>
                  <p>{selectedEvidence.likelyDefense}</p>
                  <p>{selectedEvidence.counter}</p>
                </div>
                <div className="card-actions">
                  <button type="button" onClick={() => copyText(selectedEvidence.quote)}>
                    <ClipboardCopy size={16} /> Quote
                  </button>
                  <button type="button" onClick={() => copyText(selectedEvidence.question)}>
                    <ClipboardCheck size={16} /> Question
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadText(
                        "live-evidence-card.md",
                        buildPacketMarkdown([selectedEvidence]),
                        "text/markdown",
                      )
                    }
                  >
                    <Download size={16} /> Export
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadText("sourcedeck-meeting-brief.md", buildMeetingBrief(), "text/markdown")
                    }
                  >
                    <FileText size={16} /> Brief
                  </button>
                </div>
                <div className="composer-box">
                  <textarea
                    value={liveClaimDraft}
                    onChange={(event) => setLiveClaimDraft(event.target.value)}
                    placeholder="Paste the claim you just heard, or leave blank and build from the selected evidence..."
                  />
                  <div className="card-actions">
                    <button type="button" onClick={composeLiveResponse}>
                      <Brain size={16} /> Ask it cleaner
                    </button>
                    <button
                      type="button"
                      onClick={() => copyText(composedResponse)}
                      disabled={!composedResponse.trim()}
                    >
                      <ClipboardCopy size={16} /> Copy response
                    </button>
                    <button
                      type="button"
                      onClick={() => logComposedResponse("Action")}
                      disabled={!composedResponse.trim()}
                    >
                      <BookOpenCheck size={16} /> Log follow-up
                    </button>
                  </div>
                  {composedResponse && <pre>{composedResponse}</pre>}
                </div>
              </article>
            </section>

            <section className="panel">
              <div className="section-title">
                <BookOpenCheck size={20} />
                <div>
                  <h2>Notes, refusals, commitments</h2>
                  <p>Capture the record while staying composed.</p>
                </div>
              </div>
              <div className="form-stack">
                <input
                  value={speakerDraft}
                  onChange={(event) => setSpeakerDraft(event.target.value)}
                  placeholder="Speaker"
                />
                <textarea
                  value={noteDraft}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="What happened?"
                />
                <div className="button-grid">
                  <button type="button" onClick={() => logMeetingNote("Note")}>Log note</button>
                  <button type="button" onClick={() => logMeetingNote("Refusal")}>Log refusal</button>
                  <button type="button" onClick={() => logMeetingNote("Commitment")}>Log commitment</button>
                  <button type="button" onClick={() => logMeetingNote("Action")}>Action item</button>
                </div>
              </div>
              <div className="notes-list">
                {meetingNotes.map((note) => (
                  <article key={note.id}>
                    <span>{note.timestamp} / {note.kind}</span>
                    <strong>{note.topic}</strong>
                    <p>{note.speaker}: {note.note}</p>
                    <em>{note.followUp}</em>
                  </article>
                ))}
              </div>
              <div className="transcript-box">
                <textarea
                  value={transcriptDraft}
                  onChange={(event) => setTranscriptDraft(event.target.value)}
                  placeholder="Paste rough transcript or post-meeting notes..."
                />
                <button type="button" onClick={analyzeTranscript} disabled={!transcriptDraft.trim()}>
                  <Brain size={16} /> Extract notes/refusals/actions
                </button>
              </div>
            </section>
          </div>
        )}

        {view === "exports" && (
          <div className="two-column">
            <section className="panel">
              <div className="section-title">
                <FileArchive size={20} />
                <div>
                  <h2>Packet builder</h2>
                  <p>Select evidence cards, then export an issue packet.</p>
                </div>
              </div>
              <div className="packet-factory-dashboard">
                <div className="packet-factory-metrics">
                  <div>
                    <strong>{packetFactoryCounts.selected}</strong>
                    <span>selected</span>
                  </div>
                  <div>
                    <strong>{packetFactoryCounts.exportable}</strong>
                    <span>exportable</span>
                  </div>
                  <div>
                    <strong>{packetFactoryCounts.blocked}</strong>
                    <span>blocked</span>
                  </div>
                  <div>
                    <strong>{packetFactoryCounts.pendingReview}</strong>
                    <span>needs review</span>
                  </div>
                </div>
                <div className="packet-gate-queue">
                  {packetFactoryRows.length ? (
                    packetFactoryRows.map((row) => (
                      <article key={row.card.id} className={row.blocked ? "blocked" : "clear"}>
                        <div>
                          <span>{row.blocked ? "Blocked" : "Clear"}</span>
                          <strong>{row.card.title}</strong>
                          <em>
                            {row.document?.exhibit ?? "Unlabeled"} / page{" "}
                            {row.card.page || "pending"} / {cardVerificationStatus(row.card)}
                          </em>
                          {row.blockers[0] ? <p>{row.blockers[0]}</p> : null}
                        </div>
                        <div className="packet-gate-actions">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEvidenceId(row.card.id);
                              setView("evidence");
                            }}
                          >
                            <ShieldCheck size={15} /> Review
                          </button>
                          <button
                            type="button"
                            onClick={() => togglePacket(row.card.id)}
                          >
                            Remove
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="empty-state">
                      <FileArchive size={22} />
                      <strong>No packet items selected.</strong>
                      <p>Add verified evidence from Search, Evidence, or Meeting mode.</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="trust-summary">
                <div>
                  <strong>{sourceStackSummary.documents}</strong>
                  <span>documents</span>
                </div>
                <div>
                  <strong>{sourceStackSummary.sourceArtifacts}</strong>
                  <span>artifacts</span>
                </div>
                <div>
                  <strong>{sourceStackSummary.artifactFailures}</strong>
                  <span>artifact failures</span>
                </div>
                <div>
                  <strong>{sourceStackSummary.sourceVaults}</strong>
                  <span>source vaults</span>
                </div>
                <div>
                  <strong>{sourceStackSummary.sourceVaultPageImages}</strong>
                  <span>page images</span>
                </div>
                <div>
                  <strong>{sourceStackSummary.sourceVaultFailures}</strong>
                  <span>vault failures</span>
                </div>
                <div>
                  <strong>{sourceStackSummary.spans}</strong>
                  <span>source spans</span>
                </div>
                <div>
                  <strong>{sourceStackSummary.evidenceCards}</strong>
                  <span>cards</span>
                </div>
                <div>
                  <strong>{sourceStackSummary.events}</strong>
                  <span>events</span>
                </div>
                <div>
                  <strong>{sourceStackSummary.trustEvents}</strong>
                  <span>trust ledger</span>
                </div>
                <div>
                  <strong>{sourceStackSummary.contradictions}</strong>
                  <span>contradictions</span>
                </div>
                <div>
                  <strong>{sourceStackSummary.invariantFailures}</strong>
                  <span>invariant failures</span>
                </div>
                <div>
                  <strong>{packetGate.failures.length}</strong>
                  <span>packet blockers</span>
                </div>
              </div>
              <div className="packet-list">
                {evidence.map((card) => (
                  <label key={card.id}>
                    <input
                      type="checkbox"
                      checked={packetIds.includes(card.id)}
                      onChange={() => togglePacket(card.id)}
                    />
                    <span>{card.title}</span>
                    <em>{cardVerificationStatus(card)}</em>
                  </label>
                ))}
              </div>
              {packetGate.failures.length ? (
                <p className="import-status">
                  Packet hard wall: {packetGate.blockedIds.size} selected item
                  {packetGate.blockedIds.size === 1 ? "" : "s"} blocked until verified and source-resolved.
                </p>
              ) : (
                <p className="import-status">
                  Packet hard wall clear: every selected item is verified and source-resolved.
                </p>
              )}
              <p className="import-status">
                <ArchiveRestore size={15} /> {trustStore ? trustStoreStatus : "Trust ledger not started."}
              </p>
              <textarea
                className="redaction-box"
                value={redactionTerms}
                onChange={(event) => setRedactionTerms(event.target.value)}
                placeholder="One redaction term per line"
              />
              <button
                type="button"
                className="primary"
                onClick={() =>
                  downloadText("sourcedeck-evidence-packet.md", buildPacketMarkdown(), "text/markdown")
                }
              >
                <Download size={17} /> Download meeting packet
              </button>
              <button type="button" onClick={() => void exportPacketManifest()}>
                <ShieldCheck size={17} /> Export manifest JSON
              </button>
              <button type="button" onClick={() => void exportSourceStackBundle()}>
                <FileArchive size={17} /> Export SourceStack bundle
              </button>
              <button type="button" onClick={() => void exportEncryptedSourceStackBundle()}>
                <ShieldCheck size={17} /> Export encrypted bundle
              </button>
              <label className="file-button">
                Verify SourceStack bundle
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => void verifyImportedSourceStackBundle(event.target.files)}
                />
              </label>
              <label className="file-button">
                Verify manifest JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => void verifyImportedManifest(event.target.files)}
                />
              </label>
              {manifestStatus ? <p className="import-status">{manifestStatus}</p> : null}
              {pendingTrustSigner ? (
                <button
                  type="button"
                  onClick={() => {
                    const signer = pendingTrustSigner;
                    setTrustRegistry((current) =>
                      addTrustedSigner(
                        current,
                        makeTrustedSigner({
                          keyId: signer.keyId,
                          label: `Imported signer ${signer.fingerprint.slice(0, 14)}`,
                          addedAt: new Date().toISOString(),
                        }),
                      ),
                    );
                    setManifestStatus(
                      `Signer added to the trust registry (fingerprint ${signer.fingerprint}). Future packets from this signer will show as TRUSTED.`,
                    );
                    setPendingTrustSigner(null);
                  }}
                >
                  Trust this signer
                </button>
              ) : null}
              {trustRegistry.signers.length ? (
                <div className="trusted-signers">
                  <p className="import-status">
                    Trusted signers ({trustRegistry.signers.length})
                  </p>
                  <ul>
                    {trustRegistry.signers.map((signer) => (
                      <li key={signer.keyId}>
                        <span>
                          {signer.label}
                          {signer.role ? ` (${signer.role})` : ""} — {signer.fingerprint.slice(0, 24)}
                          …
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setTrustRegistry((current) => removeTrustedSigner(current, signer.keyId))
                          }
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => void exportRedactedPacket()}
              >
                <ShieldCheck size={17} /> Export redacted packet
              </button>
              <button type="button" onClick={() => window.print()}>
                <FileText size={17} /> Print current packet
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadText("sourcedeck-evidence-packet.html", buildPacketHtml(), "text/html")
                }
              >
                <Download size={17} /> Export printable HTML
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadText("sourcedeck-evidence-index.csv", buildPacketCsv(), "text/csv")
                }
              >
                <Download size={17} /> Export quote CSV
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadText(
                    "sourcedeck-exhibit-index.md",
                    buildExhibitIndexMarkdown(),
                    "text/markdown",
                  )
                }
              >
                <FileArchive size={17} /> Export exhibit index
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadText(
                    "sourcedeck-exhibit-index.csv",
                    buildExhibitIndexCsv(),
                    "text/csv",
                  )
                }
              >
                <Download size={17} /> Export exhibit CSV
              </button>
              <div className="preset-grid">
                {[
                  "Send to attorney",
                  "Prepare mediation",
                  "Prepare escalation",
                  "Prepare board presentation",
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() =>
                      downloadText(
                        `${preset.toLowerCase().replaceAll(" ", "-")}.md`,
                        buildPacketMarkdown(packetEvidence, preset),
                        "text/markdown",
                      )
                    }
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={exportPlainWorkspace}
              >
                <Download size={17} /> Export workspace JSON
              </button>
              <label className="file-button">
                Import workspace JSON
                <input
                  type="file"
                  accept="application/json,.json"
                  onChange={(event) => importWorkspace(event.target.files)}
                />
              </label>
              <div className="privacy-box">
                <input
                  type="password"
                  value={workspacePassphrase}
                  onChange={(event) => setWorkspacePassphrase(event.target.value)}
                  placeholder="Workspace encryption passphrase"
                />
                <div className="card-actions">
                  <button type="button" onClick={() => void exportEncryptedWorkspace()}>
                    <ShieldCheck size={16} /> Export encrypted
                  </button>
                  <label className="file-button">
                    Import encrypted
                    <input
                      type="file"
                      accept="application/json,.json"
                      onChange={(event) => void importEncryptedWorkspace(event.target.files)}
                    />
                  </label>
                  <label className="file-button">
                    Verify encrypted bundle
                    <input
                      type="file"
                      accept="application/json,.json"
                      onChange={(event) =>
                        void verifyImportedEncryptedSourceStackBundle(event.target.files)
                      }
                    />
                  </label>
                </div>
                {privacyStatus && <p>{privacyStatus}</p>}
              </div>
              <button type="button" onClick={resetWorkspace}>
                Reset seeded workspace
              </button>
            </section>

            <section className="panel">
              <div className="section-title">
                <ShieldCheck size={20} />
                <div>
                  <h2>Agreement guard</h2>
                  <p>Paste proposed language and catch vague or risky terms.</p>
                </div>
              </div>
              <textarea
                className="agreement-box"
                value={agreementText}
                onChange={(event) => setAgreementText(event.target.value)}
              />
              <div className="card-actions">
                <button type="button" onClick={() => copyText(buildAgreementRevision())}>
                  <ClipboardCopy size={16} /> Copy revised terms
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadText(
                      "sourcedeck-agreement-revision.md",
                      buildAgreementRevision(),
                      "text/markdown",
                    )
                  }
                >
                  <Download size={16} /> Export revision
                </button>
              </div>
              <div className="risk-list">
                {agreementRisks.length === 0 ? (
                  <article className="success">
                    <CheckCircle2 size={18} />
                    <span>No built-in risk phrases detected. Still review the source and exact commitments.</span>
                  </article>
                ) : (
                  agreementRisks.map((risk) => (
                    <article key={risk.phrase}>
                      <AlertTriangle size={18} />
                      <div>
                        <strong>{risk.phrase}</strong>
                        <p>{risk.risk}</p>
                        <em>{risk.fix}</em>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </div>
        )}

        {view === "prep" && (
          <div className="two-column">
            <section className="panel">
              <div className="section-title">
                <Brain size={20} />
                <div>
                  <h2>AI prep workspace</h2>
                  <p>Paste extracted text or notes. SourceDeck proposes cards for human review.</p>
                </div>
              </div>
              <textarea
                className="prep-box"
                value={prepText}
                onChange={(event) => setPrepText(event.target.value)}
                placeholder="Paste document text, email excerpts, OCR output, meeting notes, or claims here..."
              />
              <button type="button" className="primary" onClick={runPrep}>
                <Brain size={17} /> Generate evidence suggestions
              </button>
              <div className="completeness-card">
                <div>
                  <strong>{privacyMode.replaceAll("_", " ")}</strong>
                  <span>Model router</span>
                </div>
                <div className="completeness-grid">
                  {routerSummary.map(({ contract, route }) => (
                    <span key={contract.id} className={route.ok ? "present" : "missing"}>
                      {contract.jobName}: {route.ok ? route.lane : route.reason}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            <section className="panel">
              <div className="section-title">
                <FileSearch size={20} />
                <div>
                  <h2>Prep suggestions</h2>
                  <p>Accept cards into the deck when they are useful.</p>
                </div>
              </div>
              <div className="suggestion-list">
                {prepSuggestions.map((suggestion) => (
                  <article key={suggestion.id}>
                    <span className={`priority priority-${suggestion.priority.toLowerCase()}`}>
                      {suggestion.priority}
                    </span>
                    <h3>{suggestion.title}</h3>
                    <blockquote>{suggestion.quote}</blockquote>
                    <p>{suggestion.question}</p>
                    <button type="button" onClick={() => acceptSuggestion(suggestion)}>
                      <Plus size={16} /> Accept as evidence card
                    </button>
                  </article>
                ))}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
