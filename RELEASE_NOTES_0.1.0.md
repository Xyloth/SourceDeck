# SourceDeck 0.1.0

First public build of SourceDeck: a local-first evidence command center for
high-stakes meetings.

## Included

- Document vault with import metadata, exhibit labels, OCR/review warnings, and
  local text indexing for text-like files.
- Evidence cards with title, category, priority, source document, page, exact
  quote, meaning, strategic use, likely defense, counter, confidence, and packet
  status.
- Issue maps that connect evidence cards into argument chains.
- Contradiction map for baseline-vs-delivery and promised-vs-actual conflicts.
- Timeline and missing-record tracker.
- Record completeness score.
- Live meeting mode with fast issue buttons, quote copy, question copy, export,
  notes, refusals, commitments, and action items.
- AI prep workspace for turning pasted document text into reviewable evidence
  card suggestions.
- Agreement guard for vague or risky settlement language.
- Export engine for Markdown packets, printable HTML packets, CSV quote indexes,
  and workspace JSON.
- Keyboard shortcuts: `/` or `Ctrl+K` focuses search, `Alt+M` opens meeting mode.
- Public demo at [sourcedeck.vercel.app](https://sourcedeck.vercel.app).

## Public Data Note

The included sample records are fictionalized demonstration excerpts. Real legal,
education, medical, HR, custody, disability, or private advocacy records should
not be committed to a public repository.

## Next Build Targets

- PDF/OCR extraction worker.
- Durable local workspace storage.
- Highlighted PDF packet export.
- AI provider layer with strict source/page/quote grounding.
