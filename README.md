# SourceDeck

[![CI](https://github.com/Xyloth/SourceDeck/actions/workflows/ci.yml/badge.svg)](https://github.com/Xyloth/SourceDeck/actions/workflows/ci.yml)

SourceDeck is a local-first evidence command center for high-stakes meetings.
It turns PDFs, Word documents, notes, and record folders into searchable
evidence cards with exact quotes, source references, issue maps, meeting
questions, missing-record trackers, and exportable packets.

Live demo: [https://sourcedeck.vercel.app](https://sourcedeck.vercel.app)

> The right quote, the right page, the right moment.

## Why This Exists

Important meetings often turn on records: vendor and SLA disputes, legal prep, HR
disputes, medical appeals, insurance reviews, compliance audits, and
investigations. People may know the evidence exists, but still lose leverage
because they cannot find the exact quote, page, or document fast enough.

SourceDeck is built around one principle:

> Never say "I will find it later."

The user can preload records, organize the issues, enter live meeting mode, and
pull up the source-backed quote or question while the conversation is happening.

## Current Capabilities

- Local document vault with DOCX, PDF, text, CSV, JSON, image, and legacy DOC
  handling.
- Browser-side DOCX extraction through Mammoth.
- Browser-side PDF text extraction through PDF.js.
- Local Node case-folder preloader for private folders and legacy `.doc` files.
- Evidence cards with quote, source, exhibit, page, meaning, strategic use,
  likely defense, counter-response, tags, priority, and confidence.
- Search across evidence cards, source document text, detected dates/entities,
  and missing-record rows.
- Issue maps, contradiction map, timeline, document completeness score, and
  source-integrity audit.
- Live meeting mode with critical issue buttons, quote copy, question copy,
  refusal logging, commitment logging, action items, transcript companion, and
  source-grounded response composer.
- Case templates for vendor/SLA, HR, medical/insurance, legal,
  compliance, and audit workflows.
- Agreement guard that flags vague or risky terms and generates cleaner
  replacement language.
- Export tools for Markdown packets, printable HTML, CSV quote indexes, exhibit
  indexes, missing-record requests, remedy plans, meeting briefs, redacted
  packets, and encrypted workspace JSON.
- Local-first privacy posture: sensitive records are processed locally and are
  not committed to this repository.
- Verbatim extracted text is session-only and removed before browser
  `localStorage` serialization; encrypted workspace export is the durable path.

## Case Folder Importer

For private record folders, SourceDeck includes a local importer that builds a
workspace JSON without uploading files to a server.

```powershell
npm run case:import -- "C:\Example Case Folder"
```

The importer writes these files into the selected folder:

- `sourcedeck-workspace.json`
- `sourcedeck-pressure-test-report.md`

The generated workspace can be imported from SourceDeck's export screen. Private
case exports are ignored by git and should not be committed.

The importer currently extracts:

- `.docx` files through Mammoth
- legacy `.doc` files through `word-extractor`
- text-based PDFs through PDF.js
- text-like files such as `.txt`, `.md`, and `.csv`

Image-only PDFs, chart-only DOCX files, and scanned records are marked as
`Needs OCR` so the user knows they are not quote-searchable yet.

## Architecture

- React 19
- TypeScript
- Vite
- PDF.js for PDF text extraction
- Mammoth for DOCX extraction
- `word-extractor` for local legacy DOC preloading
- Browser localStorage for the current workspace prototype
- Session-only extracted source text plus encrypted source-byte custody in IndexedDB
- Web Crypto PBKDF2/AES-GCM for encrypted workspace export/import
- Vercel deployment

## Local Sidecar Security

The optional speech and CLI-intelligence sidecars bind to `127.0.0.1`. Browser
operations accept only the shipped SourceDeck origin or loopback development and
Electron origins, then require a per-process bearer capability. There is no
wildcard CORS access. Additional exact origins can be configured through
`SOURCEDECK_ALLOWED_ORIGINS`; see `.env.example`.

These controls prevent an unrelated web page from invoking a local model command
or reading its output. They are a browser boundary, not an operating-system
sandbox: processes running as the same local user remain in the local trust
boundary.

## Run Locally

```powershell
npm install
npm run dev
```

Build:

```powershell
npm run build
```

Lint:

```powershell
npm run lint
```

## Roadmap

- OCR worker for scanned PDFs and image-only DOCX/chart files.
- True highlighted PDF/page export with source-page overlays.
- Human-confirmed page anchors for Word imports, because raw DOCX extraction
  does not preserve original page layout.
- Durable encrypted local database instead of browser localStorage.
- Guided case-prep workflow for first-time users.
- AI provider layer for stronger evidence extraction, contradiction detection,
  likely defenses, and source-grounded meeting prep.
- Collaboration/export workflow for attorney review, mediation packets, and
  post-meeting follow-up packets.

## Privacy Note

The sample data in the demo is fictional. Do not commit real contract,
medical, HR, legal, financial, or other private records to a public
repository. SourceDeck's product direction is local-first because the target
documents are often sensitive.

The current browser prototype still persists derived workspace fields such as
evidence-card quotes and meeting notes in plaintext `localStorage`. Use a trusted
browser profile, reset the workspace after sensitive sessions, and use encrypted
workspace export when durable custody is required. The full boundary is stated
in [TRUST_MODEL.md](TRUST_MODEL.md).

## Product Rule

AI can prepare the deck, organize issues, suggest evidence cards, draft clean
questions, detect contradictions, and retrieve quotes live. The human remains in
control of what gets used in the meeting, but the AI is not artificially blocked
from doing useful work.
