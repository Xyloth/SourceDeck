# SourceDeck

SourceDeck is a local-first evidence command center for high-stakes meetings.
It turns documents into evidence cards with exact quotes, source references,
page numbers, issue maps, meeting questions, refusal notes, and exportable
packets.

Tagline:

> The right quote, the right page, the right moment.

## What It Does

- Imports a local document vault and tracks review/OCR status.
- Indexes text files locally and creates AI-prep evidence suggestions.
- Organizes evidence into cards with source, exhibit, page, quote, meaning,
  strategic use, likely defense, counter, priority, and confidence.
- Maps evidence into issues, contradictions, timelines, and missing records.
- Provides a live meeting mode with search, quick issue buttons, quote copy,
  question copy, refusal logging, commitment logging, and action items.
- Exports Markdown packets, printable HTML packets, CSV quote indexes, and
  workspace JSON.
- Flags risky settlement/agreement language such as "gradually",
  "as appropriate", "release", "confidential", and "as tolerated".

## Local-First Position

SourceDeck is designed for sensitive records: education, legal, medical, HR,
custody, disability, insurance, and compliance files. The current prototype
stores workspace state in browser local storage and processes supported text
imports locally in the browser.

## Current Build

This first build includes:

- React + Vite + TypeScript app
- seeded evidence case
- document vault
- evidence cards
- issue maps
- contradiction map
- timeline
- missing records tracker
- record completeness score
- live meeting mode
- AI prep workspace
- agreement guard
- packet exports
- calibration report

## Sample Data

The included sample records are fictionalized demonstration excerpts. Do not
commit real education, medical, HR, legal, custody, disability, or private
advocacy records to a public repository.

## Run

```powershell
npm install
npm run dev
```

Build:

```powershell
npm run build
```

## Product Rule

AI can prepare the deck, organize issues, suggest evidence cards, draft clean
questions, detect contradictions, and retrieve quotes live. The human remains in
control of what gets used in the meeting, but the AI is not artificially blocked
from doing the useful work.
