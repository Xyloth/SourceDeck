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
| Sanitize sample data and publish GitHub repository | 15 min | 2026-05-29T18:11:22.5951124-04:00 | 2026-05-29T18:13:00.2579303-04:00 | 1.63 min | -13.37 min | Sanitized sample identifiers, re-ran lint/build, created public GitHub repo, pushed main, and set repo topics/metadata. |
| Add SourceDeck to portfolio website and deploy | 12 min | 2026-05-29T18:13:10-04:00 | 2026-05-29T18:15:12.7032395-04:00 | 2.04 min | -9.96 min | Added SourceDeck to portfolio/tools/projects, deployed Vercel site, verified live pages, committed and pushed site. |
| Deploy SourceDeck live demo and wire URLs | 10 min | 2026-05-29T18:15:25-04:00 | 2026-05-29T18:18:03.2870820-04:00 | 2.64 min | -7.36 min | Deployed SourceDeck to Vercel, set GitHub homepage, updated website card to live demo, redeployed site, committed and pushed both repos. |
| Create GitHub profile README | 8 min | 2026-05-29T18:18:05-04:00 | 2026-05-29T18:20:27.6192445-04:00 | 2.37 min | -5.63 min | Created Xyloth/Xyloth profile repo, added employer-facing README, pushed main; GitHub API sees README, public profile page may need cache refresh before rendering it. |
| Final cross-surface audit and calibration totals | 6 min | 2026-05-29T18:20:30-04:00 | 2026-05-29T18:21:15.7124624-04:00 | 0.76 min | -5.24 min | Verified SourceDeck demo, website link, README API, repo metadata, and clean site/profile worktrees. |
| Attempt GitHub pinned repo update through GraphQL | 6 min | 2026-05-29T18:21:20-04:00 | 2026-05-29T18:21:57.9570256-04:00 | 0.63 min | -5.37 min | Schema exposes issue/environment pinning, not user profile repo pinning; profile pins remain a GitHub UI task. |
| Create serious SourceDeck build backlog issues | 5 min | 2026-05-29T18:22:00-04:00 | 2026-05-29T18:22:28.2600026-04:00 | 0.47 min | -4.53 min | Created four GitHub issues for PDF/OCR worker, durable local storage, highlighted packet export, and AI provider layer. |
| Add SourceDeck v0.1.0 release notes | 4 min | 2026-05-29T18:22:30-04:00 | 2026-05-29T18:23:15.0774206-04:00 | 0.75 min | -3.25 min | Added release notes and re-ran lint/build. |
| Commit notes and create GitHub v0.1.0 release | 4 min | 2026-05-29T18:23:20-04:00 | 2026-05-29T18:23:45.0212042-04:00 | 0.42 min | -3.58 min | Committed notes, pushed SourceDeck, and created GitHub release v0.1.0. |
| Final live smoke check after release | 2 min | 2026-05-29T18:24:20-04:00 | 2026-05-29T18:25:00.8029843-04:00 | 0.68 min | -1.32 min | Verified Vercel shell, release tag, portfolio link, and profile README API after the wall clock crossed 30 minutes. |

## Totals

- Estimated task time: 142.00 minutes
- Actual logged task time: 28.27 minutes
- Estimate error: -113.73 minutes
- Wall-clock probation elapsed at final log: 30.26 minutes

## Second 30-Minute Window

Start time: 2026-05-29T18:31:53.0727433-04:00

| Task | Estimate | Start | Finish | Actual | Delta | Notes |
| --- | ---: | --- | --- | ---: | ---: | --- |
| Build real browser-side PDF/DOCX/text ingestion substrate | 9 min | 2026-05-29T18:31:53.0727433-04:00 | 2026-05-29T18:34:40.7109843-04:00 | 2.79 min | -6.21 min | Added PDF extraction, DOCX extraction, page text arrays, local date/entity detection, and processor warnings. |
| Add document detail/source review UI powered by extracted pages | 7 min | 2026-05-29T18:34:45-04:00 | 2026-05-29T18:36:25.5419457-04:00 | 1.68 min | -5.32 min | Added document review panel, page text review, detected dates/entities, source-level suggestions, and page-to-evidence promotion. |
| Code-split processors and add import progress/error state | 5 min | 2026-05-29T18:36:30-04:00 | 2026-05-29T18:37:30.4977132-04:00 | 1.01 min | -3.99 min | Lazy-loaded PDF/DOCX processors, restored main bundle size, and added import progress/error copy. |
| Improve search, issue extraction, and export reuse from same data | 6 min | 2026-05-29T18:37:35-04:00 | 2026-05-29T18:39:03.4419720-04:00 | 1.47 min | -4.53 min | Search now counts cards/docs/gaps, exports packets, creates issue maps, and jumps to matching source docs. |
| Add case templates for IEP, HR, medical, legal, insurance, compliance | 6 min | 2026-05-29T18:39:05-04:00 | 2026-05-29T18:40:39.0953342-04:00 | 1.57 min | -4.43 min | Added templates that inject default meeting type, issues, and missing-record targets. |
| Add workspace JSON import/restore | 5 min | 2026-05-29T18:40:42-04:00 | 2026-05-29T18:41:33.2660578-04:00 | 0.85 min | -4.15 min | Added JSON workspace import/restore using the same snapshot shape as export. |
| Add case workspace metadata wired into packets | 5 min | 2026-05-29T18:41:35-04:00 | 2026-05-29T18:42:53.2400610-04:00 | 1.30 min | -3.70 min | Added case name/role/objective/date and wired it into Markdown, HTML, and JSON exports. |
| Add redaction terms and redacted packet export | 6 min | 2026-05-29T18:42:55-04:00 | 2026-05-29T18:43:49.3146283-04:00 | 0.90 min | -5.10 min | Added manual redaction terms plus automatic email/phone/ID redaction for packet export. |
| Add transcript companion into meeting notes | 6 min | 2026-05-29T18:43:52-04:00 | 2026-05-29T18:44:56.7903196-04:00 | 1.08 min | -4.92 min | Added transcript paste analysis that creates notes, refusals, commitments, and action items. |
| Add voice query for live search | 5 min | 2026-05-29T18:45:00-04:00 | 2026-05-29T18:48:15.0658019-04:00 | 3.25 min | -1.75 min | Web Speech API now feeds the existing search/retrieval flow, opens meeting mode, and selects a matching evidence card. |
| Add source-grounded live response composer | 7 min | 2026-05-29T18:48:20-04:00 | 2026-05-29T18:49:03.0724866-04:00 | 0.72 min | -6.28 min | Same selected card now drafts a professional question, record-anchor response, and logged follow-up request. |
| Add source integrity audit and repair jumps | 6 min | 2026-05-29T18:49:05-04:00 | 2026-05-29T18:49:56.7788950-04:00 | 0.86 min | -5.14 min | The same source/page/confidence fields now expose unsupported cards, weak quotes, OCR gaps, and missing page anchors. |
| Add timeline extraction from document dates | 6 min | 2026-05-29T18:50:00-04:00 | 2026-05-29T18:50:55.0371388-04:00 | 0.92 min | -5.08 min | Detected dates and page text can now become source-linked timeline entries from the source review panel. |
| Add formal exhibit index exports | 5 min | 2026-05-29T18:51:00-04:00 | 2026-05-29T18:51:30.8947230-04:00 | 0.51 min | -4.49 min | Existing document/evidence metadata now generates Markdown and CSV exhibit indexes. |
| Add missing-record request generator | 5 min | 2026-05-29T18:51:35-04:00 | 2026-05-29T18:52:02.4475362-04:00 | 0.46 min | -4.54 min | Missing-record tracker now exports and copies written production/refusal requests from the same rows. |
| Add agreement revision generator | 5 min | 2026-05-29T18:52:05-04:00 | 2026-05-29T18:52:33.6160914-04:00 | 0.48 min | -4.52 min | Agreement guard now turns risk flags into concrete replacement terms that can be copied or exported. |
| Add encrypted workspace export/import | 10 min | 2026-05-29T18:52:50-04:00 | 2026-05-29T18:54:18.4673135-04:00 | 1.47 min | -8.53 min | Web Crypto now encrypts/imports the same local JSON snapshot with a PBKDF2/AES-GCM passphrase flow. |
| Add active-issue remedy planner | 6 min | 2026-05-29T18:54:20-04:00 | 2026-05-29T18:54:53.2149630-04:00 | 0.55 min | -5.45 min | Active issue, packet evidence, and missing records now generate proposed outcomes/remedy plans. |
| Add meeting brief generator | 6 min | 2026-05-29T18:54:55-04:00 | 2026-05-29T18:55:28.7049844-04:00 | 0.56 min | -5.44 min | Current deck state now generates opening statement, questions, gaps, guardrails, and packet items. |
| Browser QA, release packaging, deploy, and push | 8 min | 2026-05-29T18:55:30-04:00 | Pending | Pending | Pending | Verify the expanded UI locally, then ship the second-window build. |
