# SourceDeck v0.2.0

Second-window build focused on turning the first public demo into a more serious local-first evidence workspace.

## Added

- Browser-side PDF, DOCX, and text extraction with page text, detected dates, detected entities, import status, and processor warnings.
- Source review panel with page-level review, evidence promotion, source-generated suggestions, and detected-date timeline creation.
- Search-driven issue creation, matching document hits, missing-record hits, and searchable evidence packet export.
- Case templates for vendor/SLA, HR, medical, legal, insurance, and compliance workflows.
- Workspace JSON import/restore plus PBKDF2/AES-GCM encrypted workspace export/import.
- Case profile metadata for packet exports.
- Manual and automatic redaction support for packet exports.
- Voice query support through the browser Web Speech API.
- Transcript companion that classifies rough transcript lines into notes, refusals, commitments, and actions.
- Live response composer that turns a claim into a professional, source-anchored response and follow-up.
- Source integrity audit for OCR gaps, weak quotes, missing page anchors, low confidence, and unlinked cards.
- Exhibit index exports, missing-record request generator, agreement revision generator, remedy planner, and meeting brief generator.

## Verified

- `npm run lint`
- `npm run build`
- Browser smoke test on `http://127.0.0.1:5174`
