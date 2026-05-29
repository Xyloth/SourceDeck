# SourceDeck Calibration Report

Start time: 2026-05-29T17:54:45.2000944-04:00

## Ground Rules Applied

- No MVP framing.
- No scope deferral before building.
- AI is allowed to organize, suggest, retrieve, quote, question, and prepare meeting material.
- SourceDeck must stay source-grounded: cards carry source, page, quote, and confidence.
- Add useful scope when it naturally supports the human in the meeting.

## Delta Log

| Task | Estimate | Start | Finish | Actual | Delta | Notes |
| --- | ---: | --- | --- | ---: | ---: | --- |
| Build local-first SourceDeck app foundation: data model, seeded case, document vault, evidence cards, issue maps, timeline, missing-record tracker, meeting mode, export packet preview, AI prep workspace, agreement guard, local persistence | 18 min | 2026-05-29T17:54:45.2000944-04:00 | 2026-05-29T18:01:53.2435736-04:00 | 7.13 min | -10.87 min | Build passed after one TypeScript cleanup. |
| Add real local text ingestion, contradiction map, and completeness scoring | 14 min | 2026-05-29T18:01:53.2435736-04:00 | 2026-05-29T18:03:49.3239226-04:00 | 1.93 min | -12.07 min | Imported text files now create document-linked prep suggestions; issues show contradiction map; timeline shows completeness score. |
| Add source preview, richer exports, packet presets, and project README | 16 min | 2026-05-29T18:04:00-04:00 | 2026-05-29T18:06:42.1241318-04:00 | 2.70 min | -13.30 min | Added page preview, printable HTML, CSV quote index, packet presets, workspace JSON, README, and browser QA. |
| Production harden metadata, sample records, license, and git repo | 12 min | 2026-05-29T18:06:42.1241318-04:00 | 2026-05-29T18:07:45.0551685-04:00 | 1.05 min | -10.95 min | Added app metadata, favicon, sample records, license, lint/build verification, git init, and root commit. |
| Add keyboard ergonomics, meeting timer, reset utilities, and print polish | 10 min | 2026-05-29T18:07:45.0551685-04:00 | 2026-05-29T18:10:49.2246467-04:00 | 3.07 min | -6.93 min | Added shortcuts, meeting timer, print styles, reset control, removed starter assets, lint/build/browser checks passed. |
| Sanitize sample data and publish GitHub repository | 15 min | 2026-05-29T18:11:22.5951124-04:00 | Pending | Pending | Pending | Added because public portfolio tools should not ship real child, district, or sensitive sample identifiers. |
