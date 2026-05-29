import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  Brain,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  ClipboardCopy,
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
  Timer,
  Upload,
} from "lucide-react";
import "./App.css";

type Priority = "Critical" | "High" | "Medium" | "Low";
type View =
  | "command"
  | "documents"
  | "evidence"
  | "issues"
  | "timeline"
  | "meeting"
  | "exports"
  | "prep";

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
  warning?: string;
  fileName?: string;
  extractedText?: string;
  textChars?: number;
  importedAt?: string;
};

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

const priorityRank: Record<Priority, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1,
};

const seedDocuments: SourceDocument[] = [
  {
    id: "doc_pwn_dec4",
    title: "December 4 Prior Written Notice",
    type: "Prior Written Notice",
    date: "2025-12-04",
    author: "Whitehall City Schools",
    pages: 3,
    exhibit: "Exhibit D",
    tags: ["FAPE", "PWN", "Related Services", "Admissions"],
    status: "Indexed",
  },
  {
    id: "doc_iep_baseline",
    title: "Current IEP Service Plan",
    type: "IEP",
    date: "2025-08-21",
    author: "IEP Team",
    pages: 42,
    exhibit: "Exhibit A",
    tags: ["Baseline", "Service Minutes", "Placement"],
    status: "Indexed",
  },
  {
    id: "doc_schedule_sep",
    title: "September Reduced Schedule Notice",
    type: "Notice",
    date: "2025-09-17",
    author: "District Representative",
    pages: 4,
    exhibit: "Exhibit B",
    tags: ["Reduced Schedule", "Access", "Safety"],
    status: "Indexed",
  },
  {
    id: "doc_logs",
    title: "Service Minute Logs",
    type: "Records request",
    date: "2025-12-12",
    author: "Records Office",
    pages: 0,
    exhibit: "Missing",
    tags: ["Missing Records", "Service Delivery"],
    status: "Needs review",
    warning: "Requested record is not produced yet.",
  },
];

const seedEvidence: EvidenceCard[] = [
  {
    id: "ev_related_services",
    title: "Related services not provided",
    category: "Non-Implementation",
    priority: "Critical",
    documentId: "doc_pwn_dec4",
    page: 2,
    quote:
      "Because the time he spends at Reach is so abbreviated, related services are not able to be provided at this time.",
    meaning:
      "The record acknowledges that required related services were not being delivered because access was reduced.",
    strategicUse:
      "Anchor the service-delivery dispute in the agency's own written notice.",
    question:
      "How does the agency contend the plan was implemented when its own notice says related services were not able to be provided?",
    likelyDefense:
      "The reduced schedule was individualized and based on safety needs.",
    counter:
      "Please identify the decision record, service logs, PWN, and compensatory plan covering the period when services were not provided.",
    tags: ["FAPE", "Related Services", "Admission", "Compensatory Education"],
    confidence: 98,
    packetReady: true,
  },
  {
    id: "ev_academics",
    title: "Academic support not provided",
    category: "Non-Implementation",
    priority: "Critical",
    documentId: "doc_pwn_dec4",
    page: 2,
    quote:
      "Because of the intensive focus on behavioral supports, the team has not been able to provide Jace support for his academics this year.",
    meaning:
      "The notice states that academic support was not being provided during the school year.",
    strategicUse:
      "Use when anyone claims academic access or instruction was being delivered normally.",
    question:
      "What academic instruction was actually provided during the period when the notice says academic support was not being provided?",
    likelyDefense:
      "Behavioral supports had to be prioritized before academics could resume.",
    counter:
      "Please identify the data supporting that sequence and the compensatory academic remedy for missed instruction.",
    tags: ["Academics", "Admission", "Non-Implementation"],
    confidence: 97,
    packetReady: true,
  },
  {
    id: "ev_30_hours",
    title: "Thirty-hour baseline",
    category: "Baseline",
    priority: "High",
    documentId: "doc_iep_baseline",
    page: 14,
    quote:
      "The student will receive educational services for 30 hours per week in the assigned program.",
    meaning:
      "The baseline plan provides a comparison point for later reduced access.",
    strategicUse:
      "Establish the promised service level before discussing reduced schedules.",
    question:
      "What written team decision changed the student's access from the documented 30-hour baseline?",
    likelyDefense:
      "The schedule changed temporarily due to behavior and safety.",
    counter:
      "Please identify the temporary end date, review date, and services delivered during that temporary period.",
    tags: ["Baseline", "Hours", "Placement"],
    confidence: 88,
    packetReady: true,
  },
  {
    id: "ev_incremental_access",
    title: "Incremental access became the gate",
    category: "Access",
    priority: "High",
    documentId: "doc_schedule_sep",
    page: 1,
    quote:
      "Beginning September 30, services will resume for 45 minutes twice weekly and increase as tolerated.",
    meaning:
      "The access plan used an undefined tolerance standard instead of a measurable restoration schedule.",
    strategicUse:
      "Challenge vague restoration terms and ask for measurable criteria.",
    question:
      "What measurable criteria determine when access increases, who applies those criteria, and when must the team reconvene if access does not increase?",
    likelyDefense:
      "The team needed flexibility to respond to changing needs.",
    counter:
      "Flexibility still needs named responsibility, review dates, and a fallback if the plan does not restore services.",
    tags: ["Reduced Schedule", "Vague Terms", "Access"],
    confidence: 90,
    packetReady: true,
  },
  {
    id: "ev_service_logs_missing",
    title: "Service logs not produced",
    category: "Missing Records",
    priority: "Critical",
    documentId: "doc_logs",
    page: 0,
    quote: "Service-minute logs were requested but have not been produced.",
    meaning:
      "The record is incomplete on the exact issue of whether services were delivered.",
    strategicUse:
      "Use to request rolling production and preserve the gap as a meeting action item.",
    question:
      "Will the agency produce service-minute logs before the next meeting, and if not, will it provide written refusal?",
    likelyDefense:
      "The records are being gathered or maintained by a provider.",
    counter:
      "Please identify who maintains them, the production date, and whether the agency will accept responsibility for the gap.",
    tags: ["Missing Records", "Service Logs", "Follow-up"],
    confidence: 92,
    packetReady: false,
  },
];

const seedIssues: Issue[] = [
  {
    id: "issue_non_delivery",
    title: "Reduced access caused non-delivery of services",
    description:
      "The record suggests that reduced attendance became the reason required services could not be delivered.",
    evidenceIds: [
      "ev_30_hours",
      "ev_incremental_access",
      "ev_academics",
      "ev_related_services",
    ],
    status: "Open",
    meetingPriority: 1,
  },
  {
    id: "issue_missing_logs",
    title: "Service delivery cannot be verified without logs",
    description:
      "The current record lacks the service-minute data needed to test implementation claims.",
    evidenceIds: ["ev_service_logs_missing", "ev_related_services", "ev_academics"],
    status: "Needs document",
    meetingPriority: 2,
  },
  {
    id: "issue_vague_access",
    title: "Restoration terms are vague",
    description:
      "The access plan uses tolerance language without measurable dates, criteria, or fallback obligations.",
    evidenceIds: ["ev_incremental_access", "ev_30_hours"],
    status: "Open",
    meetingPriority: 3,
  },
];

const seedTimeline: TimelineEntry[] = [
  {
    id: "tl_baseline",
    date: "2025-08-21",
    event: "IEP baseline documents 30 hours per week.",
    documentId: "doc_iep_baseline",
    page: 14,
    quote: "30 hours per week in the assigned program.",
    issue: "Baseline",
  },
  {
    id: "tl_reduced",
    date: "2025-09-17",
    event: "Reduced schedule notice issued.",
    documentId: "doc_schedule_sep",
    page: 1,
    quote: "45 minutes twice weekly and increase as tolerated.",
    issue: "Access",
  },
  {
    id: "tl_resume",
    date: "2025-09-30",
    event: "Reduced schedule begins.",
    documentId: "doc_schedule_sep",
    page: 1,
    quote: "Beginning September 30...",
    issue: "Service delivery",
  },
  {
    id: "tl_admission",
    date: "2025-12-04",
    event: "PWN admits academics and related services are not being provided.",
    documentId: "doc_pwn_dec4",
    page: 2,
    quote: "Related services are not able to be provided at this time.",
    issue: "Non-Implementation",
  },
];

const seedMissingRecords: MissingRecord[] = [
  {
    id: "mr_service_logs",
    requested: "Service-minute logs",
    dateRequested: "2025-12-12",
    responsibleParty: "District / contracted provider",
    status: "Missing",
    relatedIssue: "Non-Implementation",
    whyItMatters:
      "Needed to determine whether the services in the plan were actually delivered.",
    followUp: "Request rolling production and written refusal if unavailable.",
  },
  {
    id: "mr_attendance",
    requested: "Attendance and access logs",
    dateRequested: "2025-12-12",
    responsibleParty: "Program administrator",
    status: "Partial",
    relatedIssue: "Reduced schedule",
    whyItMatters:
      "Needed to compare planned service minutes with actual time in program.",
    followUp: "Ask for date-by-date access records with start and end times.",
  },
  {
    id: "mr_transport",
    requested: "Transportation pickup records",
    dateRequested: "2025-12-12",
    responsibleParty: "Transportation office",
    status: "Missing",
    relatedIssue: "Access",
    whyItMatters:
      "Needed to separate family attendance decisions from transportation failures.",
    followUp: "Request route logs, no-show records, and driver notes.",
  },
];

const meetingTypes = [
  "IEP meeting",
  "Mediation",
  "Legal consult",
  "HR meeting",
  "Medical consult",
  "Board meeting",
  "Audit review",
  "Settlement review",
];

const requiredRecordTypes = [
  "IEP",
  "PWN",
  "BIP",
  "Service logs",
  "Attendance logs",
  "Transportation records",
  "Internal communications",
  "Contract",
  "Compensatory analysis",
];

const navItems: Array<{ id: View; label: string; icon: typeof Search }> = [
  { id: "command", label: "Command", icon: Search },
  { id: "documents", label: "Documents", icon: FolderOpen },
  { id: "evidence", label: "Evidence", icon: MessageSquareQuote },
  { id: "issues", label: "Issues", icon: Scale },
  { id: "timeline", label: "Timeline", icon: CalendarDays },
  { id: "meeting", label: "Meeting", icon: Timer },
  { id: "exports", label: "Exports", icon: FileArchive },
  { id: "prep", label: "AI Prep", icon: Brain },
];

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key);
      return stored ? (JSON.parse(stored) as T) : initial;
    } catch {
      return initial;
    }
  });

  function update(next: T | ((current: T) => T)) {
    setValue((current) => {
      const resolved =
        typeof next === "function" ? (next as (current: T) => T)(current) : next;
      localStorage.setItem(key, JSON.stringify(resolved));
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

function readFileText(file: File) {
  return new Promise<string>((resolve) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["txt", "md", "csv", "json", "log", "html"].includes(ext)) {
      resolve("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => resolve("");
    reader.readAsText(file);
  });
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
            ? "Service Minutes"
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

function App() {
  const [documents, setDocuments] = useLocalState("sourcedeck.documents", seedDocuments);
  const [evidence, setEvidence] = useLocalState("sourcedeck.evidence", seedEvidence);
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
  const [view, setView] = useState<View>("command");
  const [query, setQuery] = useState("");
  const [activeIssueId, setActiveIssueId] = useState(issues[0]?.id ?? "");
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(evidence[0]?.id ?? "");
  const [packetIds, setPacketIds] = useLocalState<string[]>("sourcedeck.packetIds", [
    "ev_related_services",
    "ev_academics",
  ]);
  const [meetingType, setMeetingType] = useState(meetingTypes[0]);
  const [noteDraft, setNoteDraft] = useState("");
  const [speakerDraft, setSpeakerDraft] = useState("Other party");
  const [agreementText, setAgreementText] = useState(
    "Services will gradually increase as appropriate.",
  );
  const [prepText, setPrepText] = useState("");
  const [prepSuggestions, setPrepSuggestions] = useState<PrepSuggestion[]>([]);
  const [meetingStartedAt, setMeetingStartedAt] = useLocalState<string | null>(
    "sourcedeck.meetingStartedAt",
    null,
  );
  const [clockTick, setClockTick] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
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

  const selectedEvidence = evidence.find((card) => card.id === selectedEvidenceId) ?? evidence[0];
  const activeIssue = issues.find((issue) => issue.id === activeIssueId) ?? issues[0];
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

  const searchCorpus = query.trim().toLowerCase();
  const filteredEvidence = useMemo(() => {
    const sorted = [...evidence].sort(
      (left, right) =>
        priorityRank[right.priority] - priorityRank[left.priority] ||
        right.confidence - left.confidence,
    );
    if (!searchCorpus) return sorted;
    return sorted.filter((card) => {
      const doc = documentById.get(card.documentId);
      return [
        card.title,
        card.category,
        card.quote,
        card.meaning,
        card.strategicUse,
        card.question,
        card.likelyDefense,
        card.counter,
        card.tags.join(" "),
        doc?.title,
        doc?.exhibit,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(searchCorpus);
    });
  }, [documentById, evidence, searchCorpus]);

  const criticalEvidence = evidence
    .filter((card) => card.priority === "Critical" || card.priority === "High")
    .sort((left, right) => priorityRank[right.priority] - priorityRank[left.priority]);

  const packetEvidence = packetIds
    .map((id) => evidence.find((card) => card.id === id))
    .filter((card): card is EvidenceCard => Boolean(card));

  const agreementRisks = useMemo(() => {
    const checks = [
      {
        phrase: "gradually",
        risk: "No measurable timeline.",
        fix: "Replace with exact service minutes and a date-certain increase schedule.",
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
        risk: "Confidentiality may restrict advocacy or record sharing.",
        fix: "Preserve rights to share with counsel, providers, agencies, and required reviewers.",
      },
      {
        phrase: "as tolerated",
        risk: "Access can remain behavior-gated without objective criteria.",
        fix: "Define tolerance criteria, review dates, and a fallback placement obligation.",
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

  function buildPacketMarkdown(cards = packetEvidence, packetTitle = "SourceDeck Evidence Packet") {
    const lines = [
      `# ${packetTitle}`,
      "",
      `Generated: ${new Date().toLocaleString()}`,
      `Meeting type: ${meetingType}`,
      "",
      "## Issue Summary",
      activeIssue
        ? `${activeIssue.title}: ${activeIssue.description}`
        : "No active issue selected.",
      "",
      "## Evidence",
    ];

    cards.forEach((card, index) => {
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

  function buildPacketCsv(cards = packetEvidence) {
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
    const rows = cards.map((card) => {
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
      ].map((cell) => `"${cell.replaceAll('"', '""')}"`);
    });
    return [header.join(","), ...rows.map((row) => row.join(","))].join("\n");
  }

  function buildPacketHtml(cards = packetEvidence) {
    const body = cards
      .map((card) => {
        const source = documentById.get(card.documentId);
        return `
          <section>
            <p class="meta">${card.priority} / ${source?.exhibit ?? "Unlabeled"} / page ${card.page || "pending"}</p>
            <h2>${card.title}</h2>
            <blockquote>${card.quote}</blockquote>
            <p><strong>Why it matters:</strong> ${card.meaning}</p>
            <p><strong>Ask:</strong> ${card.question}</p>
            <p><strong>Counter:</strong> ${card.counter}</p>
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
  <p>Generated ${new Date().toLocaleString()} for ${meetingType}</p>
  ${body}
</body>
</html>`;
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;
    const imported = await Promise.all(
      Array.from(files).map(async (file, index): Promise<SourceDocument> => {
      const ext = file.name.split(".").pop()?.toUpperCase() || "File";
      const extractedText = await readFileText(file);
      return {
        id: makeId("doc"),
        title: file.name.replace(/\.[^.]+$/, ""),
        type: ext,
        date: new Date(file.lastModified || Date.now()).toISOString().slice(0, 10),
        author: "Imported file",
        pages: ext === "PDF" ? 1 : 0,
        exhibit: `Imported ${documents.length + index + 1}`,
        tags: ["Imported", ext],
        status: extractedText
          ? "Indexed"
          : ext === "PNG" || ext === "JPG" || ext === "JPEG" || ext === "PDF"
            ? "Needs OCR"
            : "Needs review",
        warning:
          extractedText
            ? `${extractedText.length.toLocaleString()} text characters indexed locally.`
            : ext === "PNG" || ext === "JPG" || ext === "JPEG" || ext === "PDF"
              ? "Binary or image document queued for OCR/PDF extraction."
              : "Metadata imported. Text extraction worker is the next processing step.",
        fileName: file.name,
        extractedText,
        textChars: extractedText.length,
        importedAt: new Date().toISOString(),
      };
    }),
    );
    setDocuments((current) => [...imported, ...current]);
    const suggestions = imported.flatMap((document) =>
      document.extractedText
        ? suggestFromText(document.extractedText, document.id, document.title)
        : [],
    );
    if (suggestions.length) {
      setPrepSuggestions((current) => [...suggestions, ...current]);
    }
    if (!manualCard.documentId && imported[0]) {
      setManualCard((current) => ({ ...current, documentId: imported[0].id }));
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
      packetReady: true,
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
      packetReady: true,
    };
    setEvidence((current) => [card, ...current]);
    setPacketIds((current) => [card.id, ...current]);
    setSelectedEvidenceId(card.id);
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
    setEvidence(seedEvidence);
    setIssues(seedIssues);
    setTimeline(seedTimeline);
    setMissingRecords(seedMissingRecords);
    setMeetingNotes([]);
    setPacketIds(["ev_related_services", "ev_academics"]);
    setPrepSuggestions([]);
    setPrepText("");
    setMeetingStartedAt(null);
    setSelectedEvidenceId(seedEvidence[0].id);
    setActiveIssueId(seedIssues[0].id);
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
            </div>
          </>
        )}
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
          <p>{packetEvidence.length} packet items ready</p>
          <p>{meetingStartedAt ? `Timer ${meetingElapsed}` : "Timer idle"}</p>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Local-first source-grounded advocacy</p>
            <h1>The right quote, page, and question at the right moment.</h1>
          </div>
          <div className="topbar-actions">
            <select value={meetingType} onChange={(event) => setMeetingType(event.target.value)}>
              {meetingTypes.map((type) => (
                <option key={type}>{type}</option>
              ))}
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
            placeholder="Search issues, exact quotes, source docs, defenses, missing records..."
          />
          <button type="button" onClick={() => setView("meeting")}>
            Meeting mode <ArrowRight size={16} />
          </button>
        </section>

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
              <label className="drop-zone">
                <Upload size={24} />
                <span>Drop-ready import</span>
                <input
                  type="file"
                  multiple
                  onChange={(event) => void addFiles(event.target.files)}
                />
              </label>
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
                  </article>
                ))}
              </div>
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
              {filteredEvidence.map((card) => renderEvidenceCard(card))}
            </section>

            {selectedEvidence && (
              <section className="panel detail-panel">
                <div className="detail-source">
                  <span className={`priority priority-${selectedEvidence.priority.toLowerCase()}`}>
                    {selectedEvidence.priority}
                  </span>
                  <span>
                    {documentById.get(selectedEvidence.documentId)?.exhibit} / page{" "}
                    {selectedEvidence.page || "pending"}
                  </span>
                </div>
                <h2>{selectedEvidence.title}</h2>
                <blockquote>{selectedEvidence.quote}</blockquote>
                {renderSourcePreview(selectedEvidence)}
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
                      <time>{compactDate(entry.date)}</time>
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
              <div className="packet-list">
                {evidence.map((card) => (
                  <label key={card.id}>
                    <input
                      type="checkbox"
                      checked={packetIds.includes(card.id)}
                      onChange={() => togglePacket(card.id)}
                    />
                    <span>{card.title}</span>
                    <em>{card.priority}</em>
                  </label>
                ))}
              </div>
              <button
                type="button"
                className="primary"
                onClick={() =>
                  downloadText("sourcedeck-evidence-packet.md", buildPacketMarkdown(), "text/markdown")
                }
              >
                <Download size={17} /> Download meeting packet
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
              <div className="preset-grid">
                {[
                  "Send to attorney",
                  "Prepare mediation",
                  "Prepare complaint",
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
                onClick={() =>
                  downloadText(
                    "sourcedeck-data.json",
                    JSON.stringify({ documents, evidence, issues, timeline, missingRecords, meetingNotes }, null, 2),
                    "application/json",
                  )
                }
              >
                <Download size={17} /> Export workspace JSON
              </button>
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
