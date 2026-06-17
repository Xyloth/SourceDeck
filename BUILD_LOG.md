# SourceDeck Build Log

This log is maintained so another builder can resume without losing context. It records decisions, invariants, chunks, failures, fixes, tests, and architectural changes.

## 2026-06-02T13:20:43.0404185-04:00 - Setup And Directive Intake

- Cloned `https://github.com/Xyloth/SourceDeck.git` into `C:\Systems Career\SourceDeck\app` as requested. The OneDrive working app at `C:\Users\xylot\OneDrive\Documents\Software Designer\sourcedeck` was clean on `main...origin/main`, so cloning did not discard uncommitted local work.
- Read `C:\Systems Career\SourceDeck\SourceDeck-Definitive-Build-Directive.md` and `C:\Systems Career\SourceDeck\SourceDeck-Design-Legacy.md`.
- Governing invariant for all work: truth is deterministic and source-chained; intelligence is bounded, typed, and gated. Model output never becomes factual until source references resolve and verification policy allows it.
- Existing app inspection: Vite + React + TypeScript, single large `src/App.tsx`, localStorage workspace, browser-side DOCX/PDF/text extraction, Node folder preloader, seeded evidence cards/issues/timeline/missing records, live meeting mode, prep suggestion UI, packet exports, redaction terms, encrypted workspace export/import.
- Current weakness found: factual truth is shallow UI state. Evidence cards use `packetReady: boolean` and source references are informal (`documentId`, `page`, `quote`) rather than a deterministic source chain ending at a span/media segment with verification state and provenance. Packet export trusts selected cards rather than a kernel hard wall.
- First architectural move: add a typed SourceStack spine under `src/sourcestack` and make UI/export logic consume its deterministic guards incrementally. Preserve useful current surfaces while replacing shallow truth mechanics.
- Failure/fix: initial patch invocation wrote the new `src/sourcestack` files and required logs into the original OneDrive workspace path because the patch tool had no explicit workdir. Moved only the newly created SourceStack directory plus `BUILD_LOG.md` and `CALIBRATION_LOG.md` into `C:\Systems Career\SourceDeck\app`, verified `C:\Systems Career\SourceDeck\app\src\sourcestack\index.ts` exists, and removed the empty accidental OneDrive `src` directory. All subsequent patches use absolute app-repo paths.

## First Chunk Target

Build the SourceStack spine:

- content-addressed identifiers and source hashing
- Document/Page/Span, EvidenceCard/Claim/IssueTheory, Provenance, ModelJobContract, DomainPack, PacketManifest models
- verification state machine with legal transitions
- source reference resolver that terminates factual objects at a span
- packet hard wall that serializes only verified evidence cards
- prompt-injection detector treating document text as evidence, never instruction
- gauntlet scaffolding for hostile documents, stale anchors, duplicate records, fake citations, unverified exports, redaction leaks, malformed model output, and live-mode false positives

## 2026-06-02T13:37:49.9756681-04:00 - First Chunk Complete

Implemented:

- Added `src/sourcestack` as the deterministic SourceStack spine:
  - `types.ts`: Document/Page/Span/MediaSegment, EvidenceCard/Claim/IssueTheory, bitemporal event, obligation, record gap, packet, manifest, provenance, audit event, domain pack, and model job contract types.
  - `kernel.ts`: empty graph builder, source fingerprinting, Web Crypto SHA-256 content addressing, duplicate document detection, source-chain resolution, graph invariant checks, and verified-card requirement.
  - `verification.ts`: legal EvidenceCard state transitions and verification gate.
  - `packet.ts`: packet hard wall and signed/verifiable manifest assembly. Unverified, missing-span, quote-mismatch, or stale-anchor cards fail serialization.
  - `promptInjection.ts`: deterministic source-borne instruction detection and inert source wrapper.
  - `redaction.ts`: deterministic tokenization/redaction bridge plus residual leak detection.
  - `contracts.ts`: initial model job contracts and definitive vendor/HR domain pack structures.
  - `modelGate.ts`: model candidate evidence-card gate that rejects malformed output and fake citations before graph commit.
  - `liveRetrieval.ts`: verified-first live suggestion selector.
  - `legacyBridge.ts`: adapter from the existing React workspace shape into a SourceStack graph so current UI state can be guarded immediately without a full UI rewrite.
  - `gauntlet.ts`: starter Evidence Gauntlet runner covering prompt injection, unverified export, stale anchors, fake citations, duplicate records, redaction leaks, malformed model output, and live-mode verified-only enforcement.
- Added Vitest tests in `src/sourcestack/sourcestack.test.ts` with 9 passing checks across packet hard wall, verification transitions, prompt injection, model gating, redaction, live retrieval, duplicate records, and the gauntlet report.
- Added `scripts/run-source-gauntlet.ts` plus `npm run gauntlet:report`. It writes `reports/source-gauntlet-report.md` and exits nonzero on gauntlet failure.
- Updated `src/App.tsx`:
  - Existing evidence cards now carry explicit verification status.
  - Seed cards that were previously packet-ready are treated as verified; the missing service-log card is cited only.
  - Manual cards and accepted AI prep suggestions now enter as cited, not packet-ready.
  - Added `Verify` action on evidence cards using the SourceStack state transition gate.
  - Packet builder, Markdown packet, redacted packet, printable HTML, quote CSV, exhibit index, meeting brief packet items, and remedy-plan record basis now route through the hard wall.
  - Sidebar packet readiness now counts verified exportable cards, not selected cards.
  - Source integrity audit flags non-verified cards as packet-blocking trust issues.

Checks run:

- `npm test`: PASS, 9 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS and generated `reports/source-gauntlet-report.md`.
- Browser smoke at `http://127.0.0.1:5173/`: PASS. Command screen rendered, sidebar showed verified packet readiness, export screen showed per-card verification status, clear hard-wall notice for verified selections, and blocked hard-wall notice when a cited card was selected.

Adversarial attack and fixes:

- Attacked packet export by selecting the cited `Uptime report not produced` card. The hard wall correctly blocked it, but the UI initially reported "2 selected items blocked" because it counted failures rather than unique blocked cards. Fixed `getPacketExportSet` to return `blockedIds` and changed UI/Markdown packet counts to report unique blocked selected cards while preserving all failure reasons.
- Build initially failed because `crypto.subtle.digest` rejected a `Uint8Array<ArrayBufferLike>` under strict TypeScript. Fixed `sha256Hex` by copying bytes into a fresh `ArrayBuffer` before hashing.
- Browser workflow initially tried `networkidle`, which this in-app runtime does not support. Retried with supported `load` state and completed smoke checks.

Current known limits after first chunk:

- The legacy bridge creates source spans from existing app state for immediate enforcement. It is a transition layer, not the final durable content-addressed case store.
- PDF/DOCX ingestion still needs true persisted page images, quad geometry, OCR confidence per span, and re-anchoring after reprocessing.
- Packet manifests are implemented in the kernel but the current browser packet downloads are still Markdown/HTML/CSV generated by the React UI; next chunk should attach/export the manifest artifact from the UI and Node importer.
- Verification UI is a practical button now; the definitive workbench still needs side-by-side source page/media, highlighted geometry, model JSON, provenance inspection, split/merge/edit controls, and stale-anchor recovery.

## 2026-06-02T13:38:57.0677376-04:00 - Second Chunk Target

Start immediately because the first chunk completed inside the calibration window.

- Add deterministic content-addressed case store with artifacts and append-only event chain.
- Add tests for content hash stability and tamper detection.
- Wire Packet Factory to export the SourceStack packet manifest JSON or a hard-wall failure report.
- Rerun checks and browser smoke against manifest export/hard-wall behavior.

## 2026-06-02T13:41:31.9704658-04:00 - Second Chunk Complete

Implemented:

- Added `src/sourcestack/caseStore.ts`:
  - content-addressed case artifacts
  - append-only event chain
  - hash-chained event verification
  - deterministic artifact put events
  - tamper detection for event payload, previous hash, and head hash mismatch
- Exported the case store from `src/sourcestack/index.ts`.
- Added a tenth SourceStack test proving:
  - identical source bytes produce identical content hashes
  - the append-only event log verifies cleanly before tampering
  - a changed event payload fails verification with `event hash mismatch`
- Updated Packet Factory UI:
  - added `Export manifest JSON`
  - successful path uses `assembleEvidencePacket` and `serializePacketManifest`
  - blocked path exports `sourcedeck-packet-hard-wall-report.md` instead of a manifest
  - blocked report lists failure reasons without serializing unverified quotes

Checks run:

- `npm test`: PASS, 10 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS.
- Browser smoke:
  - verified `Export manifest JSON` button appears.
  - selected cited `Uptime report not produced`; hard-wall notice reported one blocked selected item.
  - clicked manifest export in blocked state; no browser console errors.
  - unselected cited card; hard-wall clear state restored.
  - clicked manifest export in successful state; no browser console errors.

Artifacts generated:

- `reports/source-gauntlet-report.md`
- Browser QA screenshots in `reports/`

Adversarial attack and fixes:

- Attacked manifest export with a cited card selected. The UI correctly blocked manifest creation and took the hard-wall-report path. No fix required.
- Attacked manifest export after restoring verified-only selection. Manifest generation path completed with no console errors. No fix required.

Current known limits after second chunk:

- The case store is implemented as a pure deterministic module and not yet the backing persistence layer for browser workspaces.
- Manifest export is wired to current Packet Factory controls, but packet Markdown/HTML/CSV and manifest are still separate downloads. Next chunk should bundle packet content plus manifest into a single export artifact and add manifest verification import.

## 2026-06-02T13:42:26.4921107-04:00 - Third Chunk Target

- Add deterministic span re-anchoring that can recover from OCR whitespace/token drift and mark unresolved anchors as `anchor_stale`.
- Extend gauntlet/tests with OCR drift recovery and bad-anchor stale detection.
- Wire import flow to flag source-borne prompt injection as `Needs review` with security warning.

## 2026-06-02T13:46:10.2526334-04:00 - Third Chunk Complete

Implemented:

- Added `src/sourcestack/anchoring.ts`:
  - `buildTextSpanAnchor`
  - `reanchorSpanToText`
  - exact-match relocation
  - token-window recovery for OCR drift
  - stale-anchor marking when score falls below threshold
- Extended SourceStack tests to 11 passing tests:
  - OCR token drift recovery
  - unrelated text becomes `anchor_stale`
- Extended the Evidence Gauntlet:
  - new `ocr_drift_reanchor` case passes with token-window score 0.86 in the current fixture
- Updated browser import flow:
  - imported text is scanned with `detectPromptInjection`
  - hostile source text is tagged `Prompt injection flagged`
  - hostile source text is marked `Needs review`
  - warning copy states that source text is evidence, never instruction

Checks run:

- `npm test`: PASS, 11 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS.
- Browser reload smoke after frontend import-security change: PASS, no browser console errors.

Adversarial attack and fixes:

- OCR drift fixture intentionally changed `services` to `serv1ces`; deterministic re-anchor recovered at score 0.86.
- Unrelated text fixture correctly produced `anchor_stale`.
- No code fixes were required after checks.

Current known limits after third chunk:

- Re-anchoring currently uses exact text plus lexical token-window scoring. Definitive anchoring still needs geometric quad comparison, structural path weighting, semantic fingerprint weighting, and media timestamp relocation.
- Import prompt-injection detection flags hostile text but does not yet write a security `AuditEvent` into a persisted case store.

## 2026-06-02T13:46:52.4688612-04:00 - Fourth Chunk Target

- Refactor packet assembly so packet hash and manifest hash share one export timestamp.
- Add deterministic packet manifest verification against the current SourceStack graph.
- Add tests that detect altered manifest hashes, altered source hashes, and unverified-card manifests.

## 2026-06-02T13:49:26.4274911-04:00 - Fourth Chunk Complete

Implemented:

- Refactored packet assembly:
  - one export timestamp now feeds packet hash and manifest hash
  - packet proof construction centralizes source hashes, page hashes, and span references
- Added `verifyPacketManifest`:
  - checks manifest format
  - reruns packet hard wall against manifest card IDs
  - recomputes packet hash
  - verifies source document hashes, page hashes, and span references
  - recomputes manifest hash
- Added tests:
  - clean manifest verifies against graph
  - altered source document hash fails
  - altered manifest hash fails
- Extended Evidence Gauntlet:
  - new `signed_manifest_verification` packet-integrity case

Checks run:

- `npm test`: PASS, 12 tests.
- `npm run lint`: PASS after fixing unused destructure.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS.
- Browser manifest export smoke after verifier changes: PASS, no browser console errors.

Adversarial attack and fixes:

- Tampered manifest source hash and tampered manifest hash tests correctly failed verification.
- Lint caught an unused destructured `manifestHash`; replaced with explicit unsigned manifest payload construction.

Current known limits after fourth chunk:

- Browser UI can generate manifests but cannot yet import a received manifest and show verification status to a recipient.
- Packet hashes cover manifest-declared packet payloads, not a single ZIP bundle containing rendered packet assets. Next definitive export pass should bundle packet body, highlighted pages, and manifest together.

## 2026-06-02T13:49:59.8188382-04:00 - Fifth Chunk Target

- Add Packet Factory control to verify an imported packet manifest JSON.
- Show pass/fail status in the UI.
- Verify against the current SourceStack graph, including hard-wall eligibility and hash checks.

## 2026-06-02T13:53:57.4911972-04:00 - Fifth Chunk Complete

Implemented:

- Added `manifestStatus` UI state.
- Added `verifyImportedManifest`:
  - reads uploaded JSON
  - parses as `PacketManifest`
  - verifies against the current `sourceStackGraph`
  - reports verified manifest hash or failure reasons
- Added Packet Factory `Verify manifest JSON` file control.

Checks run:

- `npm test`: PASS, 12 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS.
- Browser smoke:
  - initially did not see the verifier control because the previous dev server had stopped and the browser was showing stale in-memory UI.
  - restarted Vite on `http://127.0.0.1:5173/`.
  - reloaded with a fresh URL.
  - verified `Verify manifest JSON` control is visible.
  - no browser console errors.

Adversarial attack and fixes:

- Stale browser/dev-server state made the new control appear absent. Verified the DOM was stale, checked that port 5173 was not listening, restarted the dev server, and rechecked successfully.

Current known limits after fifth chunk:

- Browser automation surface does not expose file upload, so UI file-import behavior is verified by code checks and visual control presence; kernel verification behavior is covered by unit tests.
- Manifest verifier currently verifies against the current in-memory graph. Definitive recipient verification should also verify against bundled source artifacts and highlighted page hashes without requiring the original app workspace.

## 2026-06-02T13:54:29.0564432-04:00 - Sixth Chunk Target

- Add deterministic strongest-path computation over verified source-resolved evidence cards.
- Add weakest-link computation.
- Surface those computations in the current Issues UI.

## 2026-06-02T13:57:18.4961179-04:00 - Sixth Chunk Complete

Implemented:

- Added `src/sourcestack/argument.ts`:
  - deterministic proof scoring from decomposed strength components
  - verified/source-resolved strongest path
  - weakest link
  - blocked-card reasons
  - issue packet readiness
- Added SourceStack test 13:
  - cited card is blocked
  - stale anchor is blocked
  - strongest path contains verified source-resolved cards only
  - weakest link is the lowest-scoring usable verified card
- Updated Issues UI:
  - active issue now shows `SourceStack proof path`
  - strongest verified path
  - weakest link
  - blocked-card count
  - first gate note

Checks run:

- `npm test`: PASS, 13 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS.
- Browser issue-view smoke: PASS. Proof-path block appears with no overlap and no console errors.

Adversarial attack and fixes:

- Proof-path test included a cited card and a verified stale-anchor card; both were excluded from strongest path and reported as blocked.
- Visual smoke found the block dense but not overlapping. No fix required in this chunk.

Current known limits after sixth chunk:

- Proof scoring is deterministic and decomposed, but domain-pack reweighting is not yet applied.
- UI shows the first gate note only; the definitive architect layer should expose the full gate trace and proof-score breakdown.

## 2026-06-02T13:57:54.9127895-04:00 - Seventh Chunk Target

- Replace UI redaction regex helper with `applyDeterministicRedactionBridge`.
- Surface token count and residual leak status after redacted packet export.
- Keep the gauntlet redaction test and UI export path on the same implementation.

## 2026-06-02T13:58:59.5380115-04:00 - Seventh Chunk Complete

Implemented:

- Replaced duplicate UI redaction regex logic with `applyDeterministicRedactionBridge`.
- Redacted packet export now reports:
  - token count
  - residual leak count/details if any are detected
- UI redaction and gauntlet redaction now use the same deterministic implementation.

Checks run:

- `npm test`: PASS, 13 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS.
- Browser redacted-packet export smoke: PASS. Redaction status present in DOM and no console errors.

Adversarial attack and fixes:

- Redacted packet export exercised the shared bridge from the UI. No failures found.

Current known limits after seventh chunk:

- Redaction bridge tokenizes common PII patterns and manual terms, but definitive redaction still needs geometry-aware PDF redaction, role-based redaction, redaction manifests, and audit-event integration.

## 2026-06-02T13:59:31.8482185-04:00 - Eighth Chunk Target

- Change `scripts/build-case-workspace.mjs` so locally preloaded suggested cards are `cited`, not packet-ready.
- Update generated pressure report to state that importer cards require human verification before packet export.
- Run importer against sample records.

## 2026-06-02T14:00:51.0188329-04:00 - Eighth Chunk Complete

Implemented:

- Updated `scripts/build-case-workspace.mjs`:
  - generated local preloader cards now have `packetReady: false`
  - generated local preloader cards now have `verificationStatus: "cited"`
  - pressure report now states that preloader cards require source-span verification before packet export

Checks run:

- `npm run case:import -- sample-records reports\sample-workspace.json reports\sample-pressure-test-report.md`: PASS.
  - generated 2 documents, 8 cited evidence cards, 2 issues, 1 timeline entry.
  - verified generated workspace includes `packetReady: false` and `verificationStatus: "cited"`.
- `npm test`: PASS, 13 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS.

Adversarial attack and fixes:

- The trust gap was that importer-generated cards were previously packet-ready by default. Fixed by making them cited review candidates only.

Current known limits after eighth chunk:

- Node importer still does not emit a full SourceStack graph/case-store event log. It emits legacy workspace JSON with stricter verification state.
- Node importer should reuse the SourceStack prompt-injection detector and content-addressed case store in a later chunk.

## 2026-06-02T14:01:22.5680138-04:00 - Ninth Chunk Target

- Add deterministic model-router policy engine.
- Enforce local-only privacy mode as a hard ceiling.
- Add tests for frontier blocking, local fallback, deterministic routing, and unavailable-lane rejection.

## 2026-06-02T14:03:05.2865396-04:00 - Ninth Chunk Complete

Implemented:

- Added `src/sourcestack/router.ts`:
  - route policy over job contract, privacy mode, sensitivity, lane availability, and preferred lane
  - local-only privacy blocks frontier lane as a hard ceiling
  - deterministic/local/frontier lane selection stays explicit and typed
- Added SourceStack test 14:
  - local-only routes local-capable evidence-card jobs to local lane
  - local-only blocks frontier-only contradiction jobs even when frontier is available
  - deterministic meeting brief route wins when available
- Extended Evidence Gauntlet:
  - new `local_only_frontier_block` model-safety case

Checks run:

- `npm test`: PASS, 14 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, including the new local-only frontier block case.

Adversarial attack and fixes:

- Tested frontier-only contradiction job under `local_only` with frontier available. Router still blocked it. No fix required.

Current known limits after ninth chunk:

- Router is a kernel policy module. The current UI does not yet expose privacy mode or live lane decisions to users.
- Definitive model job execution still needs job logs, redaction previews, user consent prompts for cleartext cloud jobs, and calibration dashboards.

## 2026-06-02T14:03:37.9237135-04:00 - Tenth Chunk Target

- Add persisted privacy mode control.
- Show router decisions for core job contracts.
- Make local-only frontier blocking visible in the UI.

## 2026-06-02T14:05:43.4730213-04:00 - Tenth Chunk Complete

Implemented:

- Added persisted `privacyMode` state.
- Added header privacy selector:
  - Local only
  - Hybrid
  - Cloud allowed
- Added sidebar privacy readout.
- Added AI Prep model-router panel:
  - lists each core job contract
  - shows selected lane or block reason
  - local-only frontier block is visible to the user

Checks run:

- `npm test`: PASS, 14 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS.
- Browser AI Prep smoke: PASS. Router summary present, frontier block visible, no console errors, route grid fits on mobile-width viewport.

Adversarial attack and fixes:

- Visual smoke checked long frontier-block copy in a compact grid. Text wrapped without overlap. No fix required.

Current known limits after tenth chunk:

- Privacy mode controls router display and policy tests; no real model execution exists yet.
- Cloud cleartext consent UI is not implemented yet.

## 2026-06-02T14:44:44.7548459-04:00 - Audit Response Chunk Complete

Implemented:

- Closed the audited legacy bridge self-anchoring hole:
  - `buildLegacySourceGraph` no longer uses `card.quote` as fallback source text.
  - missing quotes now produce `anchor_stale` or `unresolved` source spans with empty exact text and zero anchor quality.
  - verified legacy state is carried forward only when the quote is actually found in backing source text and the page anchor is stable.
- Added explicit source text to the seeded documents so the demo verified cards remain verified because their quotes exist in source text, not because legacy `packetReady` said so.
- Added `src/sourcestack/exportSafety.ts`:
  - `escapeHtml`
  - `neutralizeSpreadsheetFormula`
  - `csvCell`
- Hardened exports:
  - packet HTML now escapes every interpolated case/card/source field.
  - quote and exhibit CSV exports now neutralize values starting with spreadsheet formula prefixes before quote escaping.
- Corrected packet manifest semantics:
  - renamed packet field from `signedManifestHash` to `verifiableManifestHash`.
  - renamed request/manifest identity from `signerIdentity` to `issuerIdentity`.
  - added an explicit optional `cryptographicSignature` future slot so the type no longer pretends a hash is a signature.
  - renamed gauntlet case from `signed_manifest_verification` to `hash_manifest_verification`.
- Added `scripts/calibration-elapsed.mjs` and `npm run calibration:elapsed` so calibration elapsed values are computed from timestamps.

Checks run:

- `npm test`: PASS, 16 tests.
- `npm run lint`: PASS after fixing one test-string lint issue.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 14 gauntlet cases.

Adversarial attack and fixes:

- Fabricated a legacy card marked `verified`/`packetReady` whose quote is absent from the source. It was downgraded to `anchor_stale` and blocked from packet assembly.
- Exported hostile HTML payload through the escaping helper. Tags and event attributes were escaped.
- Exported spreadsheet formula payloads through CSV helper. `=`, `+`, `-`, and `@` prefixes were neutralized.
- Lint caught an unnecessary escape in the hostile CSV test expected value. Fixed and reran full checks.

Current known limits after audit response chunk:

- Packet manifests are hash-verifiable, not cryptographically signed. The type now says that honestly and reserves a signature field for real key-backed signing later.
- Source span resolution still needs a stricter invariant that proves span text is backed by page text or real geometry, not merely a span object that references a page. This is the next trust-hardening target.

## 2026-06-02T14:51:10.4220792-04:00 - Backed-Span Kernel Hardening Complete

Implemented:

- Added `spanBackedBySource` to SourceStack source resolution.
- Added `sourceBackingTextForSpan` and `sourceSpanBackedBySource` kernel helpers.
- Packet hard wall now blocks verified cards whose span text is not backed by page text, media transcript text, or geometry.
- Verification transitions now refuse cited/verified states when the span is not backed.
- Model candidate gating now rejects AI-generated evidence candidates with syntactic span references but no backing source.
- Live retrieval now requires backed spans before surfacing suggestions.
- Issue proof paths now require backed spans before treating a card as part of the strongest path.
- Base gauntlet page fixture now includes actual layout text for the verified quote.
- Added `unbacked_span_packet_attempt` gauntlet case.
- Added unit regression for a verified card on a real page whose span text is unbacked.
- Corrected seeded fixture source backing to page 14, matching the evidence card.
- Added narrow seed-source hydration so persisted legacy demo workspaces gain the known seed `pageTexts` needed for deterministic source proof without granting that privilege to imported/user records.

Checks run:

- `npm test`: PASS, 17 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 15 gauntlet cases.
- Browser smoke reload at `http://127.0.0.1:5173/`: PASS. App shell rendered, packet readout rendered, no console errors.

Adversarial attack and fixes:

- Built a card marked `verified` with quote text inside its span object, a real document/page reference, but no page text and no geometry. Packet assembly blocked it.
- Checked whether stricter source backing over-blocked the seed packet. The shell still showed `2 verified packet items ready`, matching the current packet selection.
- Found and fixed the seed fixture page mismatch that would have made the baseline card stale under true page-level scrutiny.

Current known limits after backed-span hardening:

- The user can see packet blocks, but there is not yet a true Verification Workbench explaining each source-chain proof component on the evidence detail surface.
- Geometry is represented as quad points but not yet generated from OCR/PDF layout extraction.

## 2026-06-02T14:57:54.6328497-04:00 - Verification Workbench Layer Complete

Implemented:

- Added `src/sourcestack/diagnostics.ts`:
  - deterministic per-card evidence source diagnostic
  - source termination, quote exactness, source backing, anchor usability, verification promotability, packet eligibility, hard-wall failures, and blocker list
  - set-level diagnostic helper
- Fixed verification transition revalidation:
  - a card already marked `verified` is now rechecked against source proof when verification is requested again.
  - stale verified state can no longer short-circuit the source resolver.
- Updated source integrity audit:
  - audit now uses SourceStack diagnostics, so cards marked verified but failing source-chain proof become Critical trust findings.
- Updated packet export selection:
  - `getPacketExportSet` now builds from `sourceStackDocuments` instead of raw `documents`, keeping export gating aligned with the hydrated SourceStack graph.
- Added Evidence detail Verification Workbench:
  - Source chain
  - Exact quote
  - Source backing
  - Anchor
  - Packet
  - exact hard-wall blockers
  - resolved span preview and character range
- Added responsive CSS for the workbench proof ledger.
- Added gauntlet case `verification_workbench_unbacked_diagnostic`.

Checks run:

- `npm test`: PASS, 17 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 16 gauntlet cases.
- Browser evidence-workbench smoke: PASS. Five proof cells visible, source backing visible, packet eligibility visible, no overflow, no overlap, no console errors.

Adversarial attack and fixes:

- Confirmed diagnostics expose the unbacked-span blocker, not just packet assembly.
- Revalidated already-verified unbacked cards and confirmed verification now fails instead of short-circuiting.
- Browser viewport was narrow, causing the proof grid to collapse to one column. Layout audit showed zero overflow and zero overlap, so no CSS fix required.

Current known limits after Verification Workbench layer:

- Packet manifests are still only hash-verifiable at export time. The type has a signature slot, but the app does not yet sign manifests with a local key.
- Verification Workbench explains source-chain status, but it does not yet provide an interactive re-anchoring workflow.

## 2026-06-02T15:02:44.4386762-04:00 - Cryptographic Packet Manifest Signing Complete

Implemented:

- Added `src/sourcestack/manifestSigning.ts`:
  - ECDSA P-256 key generation
  - canonical signature payload over packet id/type/hash and manifest hash
  - stored local packet signing key type
  - self-contained signature material on the manifest
  - signature verification
  - signature tamper rejection
- Updated `PacketManifestSignature`:
  - fixed algorithm literal `ECDSA-P256-SHA256`
  - public key id
  - public JWK
  - base64 signature
  - signed timestamp
- Exported packet manifests are now actually cryptographically signed after packet hard-wall assembly succeeds.
- Imported manifest verification now reports signature status when a signature is present.
- Added local browser signing-key persistence under `sourcedeck.packetSigningKey.v1`.
- Added gauntlet case `cryptographic_manifest_signature`.

Checks run:

- `npm test`: PASS, 18 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS after removing Node `Buffer` fallback.
- `npm run gauntlet:report`: PASS, 17 gauntlet cases.
- Browser signed-manifest export smoke: PASS. Export button reported `Signed packet manifest exported` with key id and no console errors.

Adversarial attack and fixes:

- Tampered a signed manifest packet hash. Signature verification failed with `packet manifest signature mismatch`.
- Build caught Node-only `Buffer` usage in browser-bound signing code. Replaced with Web-standard `btoa`/`atob` and reran full checks.

Current known limits after signing chunk:

- Local signing key is stored as exportable JWK in local storage. This is real cryptography but not final key custody. Future work needs encrypted key storage, rotation, revocation, trust registry, and user-visible key management.
- Manifest hash verification and cryptographic signature verification are separate checks; external trust in the signer still requires a trusted key registry or out-of-band key fingerprint verification.

## 2026-06-02T15:06:28.2881180-04:00 - Bitemporal Contradiction Detection Complete

Implemented:

- Added `src/sourcestack/bitemporal.ts`:
  - deterministic event polarity classification
  - same-entity/same-valid-date contradiction buckets
  - source-span requirement before an event can participate
  - positive/negative event id lists, source span ids, transaction times, and reason
- Legacy bridge now creates bitemporal events only for cards whose quotes resolve to source text.
- Source integrity audit now surfaces bitemporal contradictions as review findings.
- Added gauntlet case `bitemporal_contradiction_detection`.

Checks run:

- `npm test`: PASS, 19 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 18 gauntlet cases.
- Browser command audit smoke: PASS. Source integrity audit rendered, review actions present, no console errors.

Adversarial attack and fixes:

- Added an unsourced negative temporal event with a missing span. Detector ignored it.
- Verified “not provided” classifies as negative instead of positive despite containing the token `provided`.

Current known limits after bitemporal chunk:

- Contradiction detection is intentionally deterministic and narrow: same normalized entity set, same valid date, opposite delivery/availability polarity.
- It does not yet reason over ranges, partial fulfillment, supersession, obligation satisfaction, jurisdiction-specific status vocabulary, or cross-document event extraction beyond legacy evidence-card facts.

## 2026-06-02T15:11:25.9609906-04:00 - Redaction Export Hard Wall Complete

Implemented:

- Extended redaction module:
  - `RedactedExportGate`
  - `redactPacketForExport`
  - normalized residual manual leak detection
  - hard-wall report generation
- Manual residual scanning now normalizes punctuation and spacing, so configured term `Acme Corp` catches unresolved variants such as `Acme-Corp`.
- Redacted packet export now has two outcomes:
  - clean redacted packet download
  - redaction hard-wall report download
- Added gauntlet case `redaction_hard_wall_manual_drift`.

Checks run:

- `npm test`: PASS, 20 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 19 gauntlet cases.
- Browser redacted export smoke: PASS. Button ran, redaction status appeared, no console errors.

Adversarial attack and fixes:

- Tested `Acme-Corp` against configured term `Acme Corp`; exact replacement missed it, normalized residual scan caught it, export was blocked, and a hard-wall report was generated.
- Browser smoke hit a persisted automation variable-name collision, then passed on retry with fresh names.

Current known limits after redaction chunk:

- Redaction hard wall scans text exports. It does not yet scan rendered PDF/DOCX output, images, OCR overlays, attachment filenames, or browser print output.
- Manual term replacement is exact; normalized drift is caught as a blocker rather than automatically rewritten. A later chunk can add safe variant replacement with explicit audit entries.

## 2026-06-02T15:15:32.6337870-04:00 - SourceStack Forensic Bundle Complete

Implemented:

- Added `src/sourcestack/bundle.ts`:
  - `createSourceStackForensicBundle`
  - `verifySourceStackForensicBundle`
  - graph hash
  - bundle hash
  - counts
  - evidence diagnostics
  - packet hard-wall failures
  - duplicate documents
  - bitemporal contradictions
- Added bundle tamper unit test.
- Added gauntlet case `sourcestack_forensic_bundle_tamper`.
- Added Exports UI action `Export SourceStack bundle`.

Checks run:

- `npm test`: PASS, 21 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 20 gauntlet cases.
- Browser SourceStack bundle export smoke: PASS. Button rendered, export status showed bundle hash, no console errors.

Adversarial attack and fixes:

- Tampered `doc_a.contentHash` inside a created bundle. Verification reported graph and bundle hash mismatch.

Current known limits after bundle chunk:

- Bundle includes the in-memory SourceStack graph and diagnostics, not original binary source files or rendered page images.
- Bundle verification proves tamper evidence for the serialized graph/report, but it does not yet replay the append-only case event log or verify external file bytes.

## 2026-06-02T15:19:00.3363777-04:00 - Prompt-Injection Import Quarantine Complete

Implemented:

- Added `src/sourcestack/importPolicy.ts`:
  - `decideImportTrust`
  - trusted vs quarantined import state
  - `canAutoSuggestEvidence` gate
  - warning and tags for prompt-injection quarantine
- Imported prompt-injected documents now:
  - still enter the document vault as source records
  - are marked `Needs review`
  - receive quarantine tags
  - are skipped by automatic evidence suggestion generation
- Import status now reports how many prompt-injection flagged files were quarantined from auto-suggest.
- Added gauntlet case `prompt_injection_auto_suggest_quarantine`.

Checks run:

- `npm test`: PASS, 22 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 21 gauntlet cases.
- Browser documents/import surface smoke: PASS. Document vault/drop zone/manual builder rendered, no console errors.

Adversarial attack and fixes:

- Tested hostile imported text instructing the system to mark the source verified. Policy quarantined it from auto-suggestion.

Current known limits after import quarantine:

- Quarantine prevents automatic suggestion generation, but the UI does not yet provide a dedicated quarantine queue, reviewer checklist, or one-click promotion after human review.
- Import trust state is stored on local document records, not yet in a durable append-only audit event.

## 2026-06-02T15:21:56.5630635-04:00 - Graph-Wide Invariant Hardening Complete

Implemented:

- `graphInvariantFailures` now audits:
  - missing source chain
  - quote not resolving inside source span
  - source span text not backed by page text or media/geometry
  - unusable anchors
- SourceStack forensic bundles now include:
  - `graphInvariantFailures`
  - graph invariant failure count
- Bundle gauntlet case now asserts the fixture bundle reports the expected stale-anchor invariant failure.

Checks run:

- `npm test`: PASS, 22 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 21 gauntlet cases.

Adversarial attack and fixes:

- Reused the verified unbacked-span fixture to prove graph invariant failures catch unbacked source text outside packet assembly.
- Confirmed the stale-anchor gauntlet card appears as a bundle-level graph invariant failure.

Current known limits after invariant chunk:

- Graph invariants report source-chain defects but do not yet auto-repair them.
- Invariant severity is currently hard-wall for all listed source defects; future work can add severity classes for review-only graph quality warnings.

## 2026-06-02T15:24:55.4269484-04:00 - SourceStack Bundle Verifier CLI Complete

Implemented:

- Added `scripts/verify-sourcestack-bundle.ts`.
- Added `npm run bundle:verify`.
- Generated clean fixture bundle at `reports/source-gauntlet-bundle.json`.
- Generated tampered fixture bundle at `reports/source-gauntlet-bundle-tampered.json`.

Checks run:

- `npm run bundle:verify -- reports\source-gauntlet-bundle.json`: PASS.
- `npm run bundle:verify -- reports\source-gauntlet-bundle-tampered.json`: expected FAIL with source graph and bundle hash mismatch.
- `npm test`: PASS, 22 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 21 gauntlet cases.

Adversarial attack and fixes:

- Tampered the generated CLI fixture bundle. Verifier exited nonzero and reported both graph and bundle hash mismatch.
- First fixture generation command failed because `tsx -e` rejected top-level await under CJS output. Fixed by wrapping the inline generation in an async IIFE.

Current known limits after verifier CLI:

- CLI verifies forensic bundle hashes but does not yet verify packet manifest signatures inside bundles because bundles do not currently embed packet manifests.

## 2026-06-02T15:26:42.1694390-04:00 - Machine-Readable Gauntlet Report Complete

Implemented:

- `scripts/run-source-gauntlet.ts` now writes:
  - `reports/source-gauntlet-report.md`
  - `reports/source-gauntlet-report.json`
- Markdown report now includes:
  - total cases
  - failure count
  - category counts
- JSON report preserves the structured gauntlet result object for external audit tooling.

Checks run:

- `npm run gauntlet:report`: PASS and wrote Markdown + JSON.
- JSON validation: PASS, `21` cases.
- `npm test`: PASS, 22 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.

Adversarial attack and fixes:

- First JSON validation command failed because PowerShell consumed JavaScript template literal backticks. Replaced with plain string concatenation and validated successfully.

Current known limits after gauntlet reporting chunk:

- JSON report is unsigned. It can be verified indirectly by rerunning the gauntlet, but it does not yet have a content-addressed report hash or signature.

## 2026-06-02T15:28:26.001-04:00 - Calibration Finish Helper Complete

Implemented:

- Added `scripts/calibration-finish.mjs`.
- Added `npm run calibration:finish`.
- Helper captures current finish time, computes elapsed minutes, and emits a markdown snippet for `CALIBRATION_LOG.md`.
- Helper now emits local ISO timestamps with timezone offset.

Checks run:

- `npm run calibration:finish -- 2026-06-02T15:27:28.2693653-04:00`: PASS.
- `npm run lint`: PASS.
- `npm test`: PASS, 22 tests.
- `npm run build`: PASS.

Adversarial attack and fixes:

- First helper version emitted UTC finish time. Elapsed was correct, but timestamp format was inconsistent with the log. Fixed with local offset formatting and reran successfully.

Current known limits after calibration helper:

- Helper prints a snippet; it does not yet append directly to `CALIBRATION_LOG.md` or validate full chunk entries.

## 2026-06-02T15:30:07.293-04:00 - Content-Addressed Gauntlet Reports Complete

Implemented:

- `scripts/run-source-gauntlet.ts` now writes:
  - Markdown report
  - JSON report
  - hash sidecar
- Markdown report now includes report hashes:
  - Markdown body hash
  - JSON report hash
- Added generated `reports/source-gauntlet-report.hashes.json`.

Checks run:

- `npm run gauntlet:report`: PASS, wrote all three report artifacts.
- Hash sidecar validation: PASS.
- `npm run lint`: PASS.
- `npm test`: PASS, 22 tests.
- `npm run build`: PASS.

Adversarial attack and fixes:

- Validated hash sidecar format as `sha256:*`.

Current known limits after hashed reports:

- Report hashes are content addresses, not signatures. They prove identity if compared out-of-band, but do not authenticate an author.

## 2026-06-02T15:32:35.006-04:00 - Exports Trust Summary Complete

Implemented:

- Added SourceStack trust summary to Exports / Packet builder:
  - documents
  - source spans
  - cards
  - events
  - contradictions
  - graph invariant failures
  - selected packet blockers
- Added responsive CSS for `.trust-summary`.

Checks run:

- `npm test`: PASS, 22 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 21 gauntlet cases.
- Browser Exports trust summary smoke: PASS. Seven counters present, invariant failures and packet blockers visible, zero overflow, no console errors.

Adversarial attack and fixes:

- Browser layout audit checked counter overflow in narrow viewport. No fix required.

Current known limits after trust summary:

- Summary exposes counts, not drill-down filtering. Verification Workbench and audit list still handle card-level explanation.

## 2026-06-02T15:37:23.915-04:00 - Window 2 Final Audit Complete

Final checks run:

- `git status --short`: expected tracked edits plus untracked SourceStack/report/log/script files.
- `git diff --stat`: tracked diff shows `package-lock.json`, `package.json`, `scripts/build-case-workspace.mjs`, `src/App.css`, `src/App.tsx`; untracked SourceStack files are visible through `git status --short`.
- Reports inventory: present, including source gauntlet Markdown/JSON/hash sidecar and source bundle fixtures.
- SourceStack module inventory: present under `src/sourcestack`.
- `npm test`: PASS, 22 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 21 gauntlet cases.
- `npm run bundle:verify -- reports\source-gauntlet-bundle.json`: PASS.
- Report artifact validation: PASS.

Window 2 minimum compliance:

- Start: 2026-06-02T14:36:51.9007356-04:00.
- Required minimum stop time: 2026-06-02T15:36:51.9007356-04:00.
- Actual final chunk finish: 2026-06-02T15:37:23.915-04:00.
- Result: complied with the one-hour minimum.

Immediate next trust gaps:

- Real source artifact persistence: original binary files/page images are still not bundled or content-addressed in the app.
- OCR geometry: quad points exist as a type, but page geometry is not yet generated from PDF/OCR layout.
- Signature custody: local manifest signing is real but private key storage is plain local storage, not encrypted/rotated/revocable.
- Verification Workbench needs interactive re-anchoring and reviewer promotion flows.
- Quarantine needs a dedicated review queue and append-only audit events.

## 2026-06-02T18:19:34.9439405-04:00 - Window 3 Started On Branch

Context:

- User audit accepted the trust-spine direction but flagged three issues:
  - work was not committed/pushed to GitHub;
  - calibration log did not yet use the required `C:\Systems Career\CALIBRATION_LOG_FORMAT.txt` protocol;
  - manifest signing was real, but browser localStorage key custody was weak.
- Created branch `codex/sourcestack-trust-infra-window3`.
- Started Window 3 calibration entry using the required full format.

## 2026-06-02T18:26:05-04:00 - Encrypted Packet Signing Key Custody

Implemented:

- Added `src/sourcestack/keyCustody.ts`.
- Packet signing private keys can now be wrapped with PBKDF2-SHA256 + AES-GCM.
- Wrong passphrases fail closed.
- Encrypted key envelopes are externally verifiable for public-key ID consistency.
- App manifest export no longer stores raw private JWKs in localStorage:
  - with a workspace passphrase, signing keys persist only as encrypted custody payloads;
  - without a passphrase, manifest signing uses an ephemeral key and does not persist private material;
  - old raw localStorage signing keys are removed on app load and during export migration.

Tests and gauntlet:

- Added unit regression for encrypted wrapping/unwrapping, wrong passphrase failure, envelope public-key metadata tamper, and signature verification after unwrap.
- Added gauntlet case `encrypted_signing_key_custody`.

Checks:

- `npm test`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS.

Adversarial attack and fix:

- Attack: tamper encrypted key envelope `publicKeyId` without decrypting.
- Fix: exported `packetSigningKeyId` and made custody verification recompute the public-key ID from the public JWK before accepting the envelope.

## 2026-06-02T18:28:12-04:00 - Durable Source Artifact Spine

Implemented:

- Added `src/sourcestack/sourceArtifacts.ts`.
- Added durable source artifact records with:
  - content hash;
  - byte length;
  - persisted payload;
  - page text hashes;
  - OCR quality;
  - page dimensions;
  - layout blocks with bounded quads.
- Added artifact verification for payload hash drift, page text hash drift, OCR confidence range, block confidence range, block text containment, and quad bounds.
- Added artifact-backed SourceGraph builder and quote-to-span resolver that fails closed when a quote is missing from artifact page text.

Tests and gauntlet:

- Unit test now assembles a packet from an artifact-backed graph and rejects invalid page geometry.
- Gauntlet case `durable_source_artifact_geometry` rejects out-of-bounds quads.
- Gauntlet case `durable_artifact_payload_tamper` rejects mutated persisted payload bytes.

Checks:

- `npm test`: PASS, 26 tests at this stage.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 25 cases at this stage.

Adversarial attack and fix:

- Attack: mutate artifact payload after content address assignment.
- Fix: `verifyCaseArtifacts` recomputes persisted payload hash and byte length.
- Attack: set page block quad outside page bounds.
- Fix: `verifySourceArtifact` rejects impossible geometry.

## 2026-06-02T18:35:30-04:00 - App-Level Trust Ledger And Workbench Flow

Implemented:

- Added a persisted content-addressed trust ledger in app state using SourceStack `ContentAddressedCaseStore`.
- Workspace export/import now includes the trust ledger.
- Ledger verification status is displayed in Packet Builder.
- Import path records:
  - `document_indexed`;
  - `import_quarantined`;
  - `artifact_verified`.
- Verification Workbench records:
  - `evidence_reanchored`;
  - `evidence_verified`.
- Packet manifest export records `packet_exported` with manifest hash, packet hash, public key ID, custody status, and card IDs.
- Evidence detail now has explicit `Reanchor quote` and `Promote verified` controls.
- Reanchor fails closed to `anchor_stale` if the quote is missing from current source page text.

Checks:

- `npm test`: PASS.
- `npm run lint`: initially failed once; then PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS.

Failure and fix:

- Failure: ESLint `react-hooks/set-state-in-effect` rejected setting the empty-ledger message synchronously inside an effect.
- Fix: moved the empty-ledger message to render-time derivation; effect now only performs async hash-chain verification.

## 2026-06-02T18:37:45-04:00 - Packet Body Exports Fail Closed

Implemented:

- Tightened Markdown, HTML, and CSV packet exports to whole-packet fail-closed behavior.
- If any selected card fails SourceStack packet proof, packet body exports now emit only a hard-wall report and do not include blocked quotes.
- Manifest export already failed closed; this extends the same invariant to printable/body formats.

Checks:

- `npm test`: PASS.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS.

Adversarial attack and fix:

- Attack: select a mix of verified and blocked cards, then export Markdown/HTML/CSV instead of manifest JSON.
- Fix: export builders now return hard-wall reports on any selected blocker, not partial packets.

## 2026-06-02T18:43:58-04:00 - PDF Geometry And Artifact Bridge

Implemented:

- Browser PDF import now preserves page width, height, and per-text-item bounded geometry blocks from pdf.js text content.
- Imported text-bearing files now create durable `source-artifact.v1` payloads in workspace state.
- Source review UI shows artifact verification status, artifact content hash, and geometry block count.
- Export trust summary shows source artifact and artifact failure counts.
- `buildLegacySourceGraph` now prefers durable artifact content hashes over legacy fingerprints when artifact metadata exists.
- The legacy bridge carries artifact IDs/hash/verification state into SourceGraph document metadata.
- Page layout blocks in SourceGraph now preserve artifact/PDF geometry-derived text block confidence.
- Matched geometry block quads are now copied onto legacy-bridge source spans, so packet-eligible cards can carry span-level geometry.

Tests and gauntlet:

- Unit regression proves artifact hash and geometry survive the legacy bridge and still assemble a verified packet.
- Unit regression asserts the bridged evidence span carries the expected quad points.
- Gauntlet case `legacy_bridge_preserves_artifact_hash` verifies bridge preservation.

Checks:

- `npm test`: PASS, 27 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 26 cases.

Adversarial attack and fix:

- Attack: let app-level artifacts degrade back into legacy fingerprints at the SourceGraph bridge.
- Fix: bridge now uses artifact `contentHash`, page `textHash`/`imageHash`, artifact metadata, and geometry-derived layout blocks.

## 2026-06-02T18:48:52-04:00 - Forensic Bundle Custody Extension

Implemented:

- SourceStack forensic bundles now optionally include durable source artifacts and the content-addressed case/trust store.
- Bundle counts now include `sourceArtifacts` and `trustEvents`.
- Bundle generation records source artifact verification results and case-store chain verification results.
- Bundle verification now:
  - recomputes graph hash;
  - recomputes bundle hash;
  - verifies included source artifacts;
  - verifies included case-store event chains.
- App SourceStack bundle export now includes imported document artifacts and the persisted trust ledger.

Tests and gauntlet:

- Unit regression covers bundle artifact inclusion, case-store inclusion, artifact payload tamper, and case-store event tamper.
- Gauntlet case `forensic_bundle_includes_artifact_and_ledger` added.
- `npm run gauntlet:report` now also writes `reports/source-gauntlet-custody-bundle.json`.

Checks:

- `npm test`: PASS, 28 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 27 cases.
- `npm run bundle:verify -- reports\source-gauntlet-bundle.json`: PASS against the existing saved bundle, confirming backward-compatible verifier behavior.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json`: PASS against the new artifact+ledger custody bundle.

## 2026-06-02T18:54:57-04:00 - Plain Workspace Export Privacy Ledger

Implemented:

- Plain workspace JSON export now sets an explicit privacy status warning that it includes source text and artifact payloads when present.
- Plain workspace JSON export now appends a `security_finding` trust-ledger event with artifact count and source-text inclusion.

Checks:

- `npm test`: PASS, 28 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 27 cases.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json`: PASS.

Reason:

- Source artifacts make workspace exports heavier and more sensitive. This is not an evidence packet path, but the app should not silently treat plain JSON export as privacy-safe.

## 2026-06-02T18:56:44-04:00 - Canonical Case-Store Event Hashing

Implemented:

- Case-store event hashes now use canonical JSON rather than insertion-order `JSON.stringify`.
- Added unit regression proving semantically identical payloads with different key order produce identical event hashes and head hashes.

Checks:

- `npm test`: PASS, 29 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 27 cases.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json`: PASS after regenerating the custody bundle with canonical event hashes.

Reason:

- Append-only event chains should be stable under harmless object key-order differences. This reduces false forensic drift and makes event hashes more defensible.

## 2026-06-02T19:00:17-04:00 - Verification Workbench OCR-Drift Reanchor

Implemented:

- App-level `Reanchor quote` flow now uses SourceStack `reanchorSpanToText` when the exact quote is missing from current page text.
- If token-window recovery succeeds, the card quote is updated to the recovered source text, downgraded to `cited`, removed from packet-ready state, and requires reviewer promotion before export.
- Recovery writes an `evidence_reanchored` ledger event with reason, score, document/page, and char range.
- If recovery fails, the previous fail-closed `anchor_stale` path remains.

Checks:

- `npm test`: PASS, 29 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.

Reason:

- Verification Workbench should recover OCR/token drift through deterministic anchoring, but recovery is not verification. Human promotion remains required before a packet can export.

## 2026-06-02T19:01:34-04:00 - Gauntlet Custody Bundle Hash Sidecar

Implemented:

- `reports/source-gauntlet-report.hashes.json` now includes:
  - Markdown report body hash;
  - JSON report hash;
  - custody bundle manifest hash;
  - custody bundle file hash.

Checks:

- `npm run gauntlet:report`: PASS, 27 cases.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json`: PASS.
- `npm test`: PASS, 29 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.

Latest custody bundle hash:

- `sha256:6077b93a89f262aab6b84ae2fa9f3f9540223b67ebd6e8be51933ee48cd6328f`

Reason:

- The generated report now cross-addresses the generated custody bundle instead of leaving it as an adjacent unauthenticated artifact.

## 2026-06-02T19:03:10-04:00 - Signing-Key Custody Ledger Events

Implemented:

- When manifest export creates or migrates an encrypted packet signing key, the app now appends a `signing_key_wrapped` event to the trust ledger.
- `signing_key_wrapped` and `packet_exported` now append in a single batched case-store update during manifest export to avoid state-race loss.

Checks:

- `npm test`: PASS, 29 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 27 cases.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json`: PASS.

Reason:

- Key custody transitions are trust-relevant events. They should be in the same append-only ledger as imports, reanchors, verification promotions, and packet exports.

## 2026-06-02T19:07:00-04:00 - Tampered Bundle Expected-Failure Check

Adversarial check:

- `npm run bundle:verify -- reports\source-gauntlet-bundle-tampered.json`: expected failure confirmed.

Verifier output:

- `source graph hash mismatch`
- `bundle hash mismatch`

Reason:

- A verifier that only passes clean bundles is not enough. This confirms the saved tampered fixture still fails under the expanded bundle verifier.

## 2026-06-02T18:58:00-04:00 - Local Sample Importer Regression

Check:

- `npm run case:import -- sample-records reports\sample-workspace.json reports\sample-pressure-test-report.md`: PASS.

Result:

- Rewrote sample workspace and pressure-test report.
- Importer summary:
  - documents: 2
  - indexed: 2
  - needs OCR: 0
  - evidence: 8
  - issues: 2
  - timeline: 1

Reason:

- Browser import now has artifact/geometry work, but the local Node case-folder importer is still a separate path. This regression keeps that path from silently breaking during SourceStack hardening.

## 2026-06-02T18:40:00-04:00 - Browser Smoke

Browser smoke:

- Dev server was already serving `http://127.0.0.1:5173/`.
- In-app browser load: PASS.
- Console errors: 0.
- Exports view showed Packet Builder, artifact counters, artifact failure counter, trust ledger counter/status, and manifest export control.
- Evidence view showed Evidence cards, Verification Workbench, Reanchor quote, and Promote verified controls.
- Screenshot saved: `reports/window3-browser-smoke.png`.

## 2026-06-02T19:09:00-04:00 - Redacted Packet Source-Artifact Disclosure Hard Wall

Implemented:

- Added `detectSourceArtifactDisclosureLeaks` and `redactSourceBackedPacketForExport`.
- Redacted packet export now scans redacted output for full source-artifact payload/page/layout-block disclosure outside explicitly allowed evidence quotes.
- The gate applies the same deterministic redaction to source probes before comparing, so source dumps with tokenized PII still fail closed.
- The app now passes current source artifacts and selected packet quotes into redacted packet export.

Adversarial attack:

- Created a hostile redacted packet body that tried to include a full confidential source page as an appendix while allowing only one short quote.

Result:

- The hostile export was blocked with a SourceDeck Redaction Hard-Wall Report.
- Quote-only export remained allowed.

Checks:

- `npm test -- --run`: PASS, 30 tests.
- `npm run lint`: PASS after removing the now-unused direct app import of `redactPacketForExport`.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 28 cases.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json`: PASS.

Reason:

- Durable source artifacts increase proof strength, but they also create a new privacy failure mode: accidental source payload disclosure through packet surfaces. Redaction must enforce quote-level disclosure, not bulk source export.

## 2026-06-02T19:10:30-04:00 - Redaction Events Enter Trust Ledger

Implemented:

- Successful redacted packet exports append a `redaction_applied` trust event.
- Blocked redacted packet exports append a `security_finding` trust event with packet card IDs, source artifact IDs, residual leaks, and source-disclosure leak details.
- The export button now treats redaction as an async audited operation.

Checks:

- `npm test -- --run`: PASS, 30 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 28 cases.

Reason:

- Redaction decisions are chain-of-custody events. A future reviewer must be able to distinguish "redacted and exported" from "blocked because a source dump was detected."

## 2026-06-02T19:13:00-04:00 - Calibration Protocol Validator

Implemented:

- Added `scripts/validate-calibration-log.mjs`.
- Added `npm run calibration:validate`.
- Validator checks required inline fields and governing sections for `# CALIBRATION LOG ENTRY` entries.
- Validator fails unresolved handoff placeholders unless the active window is explicitly checked with `--allow-open-latest`.

Checks:

- `npm run calibration:validate -- --allow-open-latest`: PASS.

Reason:

- Calibration is meant to be a measurement instrument, not prose decoration. The repo now has a mechanical check for format drift and unresolved handoff fields.

## 2026-06-02T19:16:00-04:00 - Final Browser Smoke After Redaction Export Changes

Browser smoke:

- Reloaded `http://127.0.0.1:5173/` in the in-app browser.
- Exports view visible: PASS.
- Packet builder visible: PASS.
- SourceStack bundle export visible: PASS.
- Redacted packet export visible: PASS.
- Artifact counters visible: PASS.
- Trust ledger text visible: PASS.
- Console errors: 0.
- Screenshot saved: `reports/window3-final-browser-smoke-exports.png`.

Failure/fix:

- First smoke probes falsely failed because they searched case-sensitive strings (`Packet Builder`, `source artifacts`) while the rendered UI used sentence case/uppercase labels (`Packet builder`, `ARTIFACTS`).
- Rechecked against the DOM snapshot and converted the probe to case-insensitive visible-text checks.

Reason:

- The redaction export became an async audited UI action. Browser smoke confirms the Exports surface still loads and the key controls remain visible after the final app changes.

## 2026-06-02T19:20:11-04:00 - Window 3 Minimum Closeout

Window timing:

- Start: `2026-06-02T18:19:34.9439405-04:00`.
- Finish: `2026-06-02T19:20:11.317-04:00`.
- Computed elapsed: `60.61` minutes.
- User's one-hour minimum was satisfied.

Latest verification status before git handoff:

- `npm test -- --run`: PASS, 30 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 28 cases.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json`: PASS.
- `npm run bundle:verify -- reports\source-gauntlet-bundle.json`: PASS.
- `npm run bundle:verify -- reports\source-gauntlet-bundle-tampered.json`: expected failure observed, source graph hash mismatch and bundle hash mismatch.
- `npm run case:import -- sample-records reports\sample-workspace.json reports\sample-pressure-test-report.md`: PASS.
- `npm run calibration:validate -- --allow-open-latest`: PASS before closeout.
- Final browser smoke: PASS, zero console errors.

Latest report hashes:

- Markdown body: `sha256:4d46a8032930de30d4f79ed3635a97fe7528f470ee484ab3838365f40d15446d`.
- JSON report: `sha256:fee5d2819ce2631e00d1c1e3b349f224fc78ff478e9c3673ddfbadcd56606a31`.
- Custody bundle hash: `sha256:3103317e0cdb12ac452e29c4775f40e3dd6ab4162f11d15435453ae0c646d99a`.
- Custody bundle file hash: `sha256:e76e246361a40095f66d10307cd0bc425a8aafe0ae72a7127dbaf41b2ba08e03`.

Git handoff plan:

- Run final `npm run calibration:validate` without open-window allowance.
- Stage the full worktree.
- Commit on `codex/sourcestack-trust-infra-window3`.
- Push to GitHub if authentication permits.

## 2026-06-02T19:32:20-04:00 - Window 4 Started: Source Vault And Rendered Page Custody

User instruction:

- One more hour minimum for the night.
- Report calibration-log insights in the final report.

Starting state:

- Branch: `codex/sourcestack-trust-infra-window3`.
- Branch is clean and tracking `origin/codex/sourcestack-trust-infra-window3`.
- Previous commit pushed: `2f01a57 Build SourceStack trust infrastructure`.

Calibration:

- Added Window 4 entry in `CALIBRATION_LOG.md`.
- Target window length: 1 hour minimum.
- Initial estimate: 60 minutes minimum with multiple chunks.
- Chunk target: source vault + rendered page custody.

Reason:

- Window 3 closed the packet gate and artifact/ledger custody layer. The next logged release-killing risk is that original source bytes and rendered page media are not yet independently vaulted, content-addressed, and verified.

## 2026-06-02T19:48:39-04:00 - Window 4 Resumed After Platform Tool-Routing Error

Observed:

- User reported an external platform error: `image_generation_user_error`, `gpt-image-2 does not exist`.
- No image-generation tool was intentionally called for this SourceDeck work.
- Work paused before tests had been run on the partial source-vault edit.

Resume state:

- Dirty files: `BUILD_LOG.md`, `CALIBRATION_LOG.md`, `src/sourcestack/bundle.ts`, `src/sourcestack/index.ts`, `src/sourcestack/sourceArtifacts.ts`, `src/sourcestack/sourcestack.test.ts`, and new `src/sourcestack/sourceVault.ts`.
- No Window 4 commit existed yet.

Action:

- Confirmed state, resumed the source-vault chunk, and ran focused checks before expanding scope.

## 2026-06-02T19:49:13-04:00 - Source Vault Module And Initial Failures

Implemented before/around the pause:

- Added `src/sourcestack/sourceVault.ts` with:
  - original-file vault blob records;
  - rendered-page-image vault blob records;
  - source vault manifests;
  - manifest verification;
  - in-memory store;
  - IndexedDB store adapter;
  - storage verification.
- Extended source artifacts to carry source-vault and page-image custody references.
- Extended forensic bundles to include vault manifests and vault verification results.

Failures found:

- `npm test -- --run`: FAILED because `sourceVaultPayloadBytes` was referenced in the bundle custody test without being imported.
- `npm run build`: FAILED because `sourceVault.ts` referenced `Buffer` in browser-targeted TypeScript.

Fixes:

- Imported `sourceVaultPayloadBytes` from the SourceStack barrel.
- Removed direct `Buffer` fallback and kept the vault base64 path browser-native through `btoa`/`atob`.

Checks after fix:

- `npm test -- --run`: PASS, 31 tests.
- `npm run build`: PASS at that checkpoint.

Reason:

- The source vault should compile in the browser bundle. Node-only fallback paths in frontend trust primitives create a false sense of portability.

## 2026-06-02T19:56:24-04:00 - App Import Source Vault Integration

Implemented:

- Browser import now reads original file bytes once and creates a source-vault original-file record for every imported file.
- PDF import attempts rendered PNG page custody through pdf.js + canvas.
- PDF source artifacts link page `imageHash` to rendered page-image vault records.
- Source documents now carry `sourceVaultManifest`, `sourceVaultVerified`, and `sourceVaultFailure`.
- Import ledger now records `source_vault_verified` events with manifest hash, original hash, original record id, page image count, and storage verification state.
- SourceStack forensic bundle export now includes document source-vault manifests.
- Exports trust summary now shows source vaults, rendered page images, and vault failures.
- Source Review now shows source-vault verification state and original/page-image custody hashes.
- Plain workspace export warning now includes source vault payloads and rendered page images.

Failures found:

- `npm run lint`: FAILED on a useless initial assignment to `sourceVaultFailure`.
- `npm run build`: FAILED because the local helper tried to re-declare a partial pdf.js `PageViewport`/render type.

Fixes:

- Changed `sourceVaultFailure` to an optional value rather than initializing it and overwriting it.
- Cast only the pdf.js render boundary instead of trying to re-model pdf.js' full render parameter type.
- Cloned source bytes before passing them to pdf.js to protect original-byte vault hashing from transfer/mutation.

Checks:

- `npm test -- --run`: PASS, 31 tests.
- `npm run lint`: PASS after fix.
- `npm run build`: PASS after fix.

Reason:

- The app import path now distinguishes original source media, rendered page media, and extracted text. That makes later OCR/reanchor work operate against verified media custody instead of transient upload bytes.

## 2026-06-02T19:57:17-04:00 - Source Vault Evidence Gauntlet And Custody Bundle

Implemented:

- Added Evidence Gauntlet case `source_vault_original_and_page_media_custody`.
- The case verifies:
  - clean source vault manifest;
  - clean store custody;
  - missing page-image store record failure;
  - tampered page-image payload failure.
- `scripts/run-source-gauntlet.ts` now emits a custody bundle containing:
  - durable source artifact;
  - source-vault manifest;
  - rendered page-image record;
  - source-vault verification event;
  - artifact verification event.

Checks:

- `npm run gauntlet:report`: PASS, 29 cases.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json`: PASS.
- `npm run bundle:verify -- reports\source-gauntlet-bundle.json`: PASS, backward-compatible older bundle.

Latest report hashes:

- Markdown body: `sha256:c20ca0af5ba28ef4e2c34e1fb1ddf1897e3965d45641f24d810fa6cc83674a60`.
- JSON report: `sha256:9bd72c45300dff180a261b6252c5f2700ef4373685cbe0d6e8b5e413a8194581`.
- Custody bundle hash: `sha256:73c7e26dabc4363e80ff6b43ef49418bf2dbdb15b7a9c9fd22debd9e3ddf123e`.
- Custody bundle file hash: `sha256:821d37a1321e5ac946a82faddffc7771e61d709fc7d9d30716bef33c20e85fb2`.

Reason:

- Source-vault custody is trust infrastructure only if hostile storage and payload failures are tested in the same generated report used for handoff.

## 2026-06-02T19:58:00-04:00 - Window 4 Browser Smoke

Browser smoke:

- Reloaded `http://127.0.0.1:5173/` in the in-app browser.
- Exports view showed Packet builder, source vault counters, page image counters, vault failure counter, and SourceStack bundle export.
- Documents view showed Document vault, Source review, and vault status text.
- Console errors: 0.
- Screenshot saved: `reports/window4-source-vault-browser-smoke.png`.

Reason:

- The app UI changed in Documents and Exports. Browser smoke confirms the new source-vault controls and counters render without runtime console errors.

## 2026-06-02T20:00:27-04:00 - Bundle Artifact-To-Vault Cross-Link Verification

Implemented:

- `verifySourceStackForensicBundle` now cross-checks source artifacts against included source-vault manifests.
- It fails if:
  - an artifact references a missing vault manifest;
  - artifact vault manifest hash mismatches the included vault;
  - artifact original record id/hash mismatches the vault original record;
  - artifact page-image record is missing;
  - artifact page-image hash or page index mismatches.

Adversarial tests:

- Bundle with artifact-linked vault removed: blocked.
- Bundle with artifact page-image hash changed: blocked.

Checks:

- `npm test -- --run`: PASS, 31 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.

Reason:

- Verifying artifacts and vault manifests independently is insufficient. The bundle must prove that extracted text/geometry is linked to the exact original/page-media custody it claims.

## 2026-06-02T20:02:14-04:00 - Deterministic OCR Vault Gate

Implemented:

- Added `src/sourcestack/ocrPipeline.ts`.
- OCR jobs can be planned only from verified source-vault page-image records.
- OCR results are rejected if job id, page-image record id, or page-image content hash mismatch.
- OCR output with source-borne instructions is quarantined before it can become source artifact text.
- Accepted OCR output returns a typed page text/geometry payload with OCR quality.
- Added gauntlet case `ocr_vault_job_gate`.

Checks:

- `npm test -- --run`: PASS, 32 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 30 cases.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json`: PASS.
- `npm run calibration:validate -- --allow-open-latest`: PASS.

Latest report hashes:

- Markdown body: `sha256:5203d1f1646b6301a88ad2804339baaa8990ced4d6e8dcce1125b7cb751a27f7`.
- JSON report: `sha256:9539ef6d2cb43a47357fc7c8f5cf5d982e4f3903c418254a5210442ebcb7d74f`.
- Custody bundle hash: `sha256:fedc6cf03a20b798b039faccacc7b073e3e7df10271ca721b0cdf5bd1ad4f34f`.
- Custody bundle file hash: `sha256:ab4ddafeefb08f071af25e7b6e26cc719405d9d2a0fa326172171c1631c4f794`.

Reason:

- OCR is a high-risk bridge between media and text. The deterministic gate now ensures OCR text cannot enter the evidence system unless it is tied to verified page media and passes prompt-injection quarantine.

## 2026-06-02T20:04:30-04:00 - OCR-Pending SourceGraph Vault Metadata

Implemented:

- `buildLegacySourceGraph` now preserves source-vault metadata even when no text artifact exists yet.
- SourceGraph document metadata now includes vault id, vault manifest hash, original-file hash, vault verification state, and vault failure reason.
- SourceGraph page image hash prefers source-vault page image hashes when present.
- Added regression for an OCR-pending image document with only vault custody.

Checks:

- `npm test -- --run`: PASS, 33 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.

Reason:

- OCR-pending records still need deterministic source custody. The graph should not drop original-byte/page-media hashes just because source text is not available yet.

## 2026-06-02T20:05:34-04:00 - Bundle Count Recalculation

Implemented:

- `verifySourceStackForensicBundle` now recomputes bundle counts for documents, pages, spans, evidence cards, events, artifacts, vaults, vault page images, trust events, contradictions, graph invariant failures, and recorded packet hard-wall failures.
- Added regression for tampered document count.

Checks:

- `npm test -- --run`: PASS, 33 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.

Reason:

- Bundle hashes alone do not explain what failed. Count recomputation gives explicit diagnostics and prevents count metadata from becoming an unaudited summary field.

## 2026-06-02T20:06:58-04:00 - Local Case-Folder Importer Vault Custody

Implemented:

- `scripts/build-case-workspace.mjs` now emits source-vault manifests for original file bytes.
- Local preloader documents now include `sourceVaultManifest` and `sourceVaultVerified`.
- Pressure-test report now names the original-file content hash for each imported document.

Checks:

- `npm run case:import -- sample-records reports\sample-workspace.json reports\sample-pressure-test-report.md`: PASS.
- `rg` confirmed generated sample workspace includes `sourceVaultManifest` and `sourceVaultVerified`.
- `npm run lint`: PASS.
- `npm run build`: PASS.

Reason:

- Browser import and local folder preload are both ingestion paths. If the local importer omits source-vault custody, hand-built workspaces become weaker than browser-imported workspaces.

## 2026-06-02T20:08:26-04:00 - In-App SourceStack Bundle Verifier

Implemented:

- Added `verifyImportedSourceStackBundle` to the Exports surface.
- Users can now import a SourceStack forensic bundle JSON and verify graph hash, bundle hash, source artifacts, source vaults, artifact-to-vault links, trust ledger, and count integrity from the app.
- Added visible `Verify SourceStack bundle` control next to bundle export.

Checks:

- `npm test -- --run`: PASS, 33 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- Browser smoke: PASS, `Verify SourceStack bundle` and `Verify manifest JSON` visible, console errors 0.

Reason:

- Exporting custody bundles without an in-app verifier leaves verification as a developer-only CLI operation. Packet Factory should expose both export and verification paths.

## 2026-06-02T20:10:23-04:00 - Packet Manifest Source Vault Hashes

Implemented:

- `PacketManifest` now optionally carries `sourceVaultHashes`.
- Packet assembly includes vault id, vault manifest hash, and original content hash when the SourceGraph document has source-vault metadata.
- Packet verification checks source-vault hash mismatches while remaining backward-compatible with older manifests that have no vault hashes.
- Added regression proving a vault-backed packet manifest contains vault custody hashes.

Checks:

- `npm test -- --run`: PASS, 33 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 30 cases.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json`: PASS.

Latest report hashes:

- Markdown body: `sha256:285485aece2fccf6727426e76e493f3d2f82123d5761fc9de1346078f122e853`.
- JSON report: `sha256:0ffc6e35b38ce890d43266cb8bd9dcfdb03c34f2d40e7f6f719b3b612840a317`.
- Custody bundle hash: `sha256:03380b4679ce6752f85df9da62ad94ec0e0017a83b524784088e0606e4a0af02`.
- Custody bundle file hash: `sha256:5294ca3d43de4c1405eff77c3209c163839423f0700f7332a396556a7f620a12`.

Reason:

- Evidence packets should disclose not only text/document hashes but also the original source-vault custody hashes when available.

## 2026-06-02T20:11:28-04:00 - Bundle Export Audit Event And Vault Payload Warning

Implemented:

- Added `bundle_exported` case-store event type.
- SourceStack bundle export now appends an audit event with bundle hash, graph hash, source artifact count, source vault count, rendered page image count, and whether source-vault payloads are included.
- Export status now warns when the bundle contains original source-vault payloads.

Checks:

- `npm test -- --run`: PASS, 33 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.

Reason:

- Forensic bundle export is a sensitive custody event, especially once bundles include original source bytes. It belongs in the append-only trust ledger.

## 2026-06-02T20:13:14-04:00 - Encrypted Source Vault Blob Primitive

Implemented:

- Added `src/sourcestack/sourceVaultEncryption.ts`.
- Source vault blob records can be encrypted with PBKDF2-SHA256 + AES-GCM.
- Public metadata is bound as AES-GCM additional authenticated data, so content-hash metadata tamper fails decryption.
- Wrong passphrase fails closed.
- Added regression for correct decrypt, wrong passphrase, and metadata tamper.

Checks:

- `npm test -- --run`: PASS, 34 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.

Limit:

- The app still needs an explicit encrypted IndexedDB vault-storage migration. This chunk creates the primitive and proves its failure modes; it does not claim final key custody.

Reason:

- Adding raw source-vault payloads made encryption a predictable audit issue. The encrypted blob primitive gives the next storage layer a tested custody target.

## 2026-06-02T20:20:27-04:00 - Encrypted SourceStack Bundle Handoff

Implemented:

- Added encrypted SourceStack forensic bundle export using PBKDF2-SHA256 + AES-GCM.
- Added encrypted SourceStack bundle decrypt-and-verify flow in the app.
- Export envelope exposes only public forensic metadata: plaintext format, bundle hash, graph hash, generated-at timestamp, case name, counts, and whether source-vault payloads are sealed inside.
- Bundle export audit events now distinguish plain and encrypted exports.
- Added `src/sourcestack/encryptedPayload.ts` so encrypted JSON envelopes are a SourceStack primitive rather than app-local code.
- Workspace encrypted import/export now uses the same encrypted JSON primitive.
- Added regression for encrypted JSON payload round-trip, wrong passphrase failure, unsupported KDF failure, and invalid iteration failure.

Checks:

- `npm test -- --run`: PASS, 35 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- Browser smoke: PASS, encrypted bundle export/verification controls visible, console errors 0.
- Screenshot: `reports/window4-encrypted-bundle-browser-smoke.png`.
- Final browser smoke on clean port `http://127.0.0.1:5178`: PASS, encrypted bundle export/verification controls visible. The browser log API still surfaced two stale HMR errors from `http://127.0.0.1:5173/@vite/client` at `2026-06-03T00:21:28Z`; the clean-port tab itself rendered correctly.
- Screenshot: `reports/window4-clean-port-export-browser-smoke.png`.

Reason:

- Once source-vault payloads are included in forensic bundles, private handoff needs a sealed bundle path. A plain bundle remains useful for audit/test contexts, but encrypted handoff must be first-class.

## 2026-06-02T20:24:25-04:00 - Legacy Bundle Count Compatibility

Implemented:

- Updated SourceStack forensic bundle verification to tolerate absent legacy zero-count fields for `sourceArtifacts`, `sourceVaults`, `sourceVaultPageImages`, and `trustEvents`.
- The tolerance applies only when the recomputed value is zero; incorrect present values still fail.

Checks:

- `npm run bundle:verify -- reports\source-gauntlet-bundle.json`: PASS.
- `npm test -- --run`: PASS, 35 tests.
- `npm run lint`: PASS.

Reason:

- The verifier had become too strict for an older valid gauntlet bundle that predated newer count fields. Backward-compatible verification matters for forensic artifacts across schema evolution, but tamper detection must remain active.

## 2026-06-02T20:32:53-04:00 - Window 4 Final Verification

Final checks:

- `npm test -- --run`: PASS, 35 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 30 cases, 0 failures.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json`: PASS, bundle hash `sha256:71af9b87666cb82abc5af4ebd3a3a8a5eb8b9130fa33d6005a80d120cf570303`.
- `npm run bundle:verify -- reports\source-gauntlet-bundle.json`: PASS.
- `npm run bundle:verify -- reports\source-gauntlet-bundle-tampered.json`: expected FAIL observed, source graph hash mismatch and bundle hash mismatch.
- `npm run case:import -- sample-records reports\sample-workspace.json reports\sample-pressure-test-report.md`: PASS.
- `npm run calibration:validate -- --allow-open-latest`: PASS before closing.
- `git diff --check`: PASS; Git emitted LF-to-CRLF normalization warnings only.
- Browser smoke on `http://127.0.0.1:5178`: PASS for encrypted bundle export, encrypted bundle verify, and SourceStack bundle verify controls. Current clean-port UI rendered; browser log API retained stale 5173 HMR errors from the earlier refactor attempt.

Latest report hashes:

- Markdown body: `sha256:f91c4209d4069b71bb3e58f38af569a665a110e1afb769e497430ac97b041fc1`.
- JSON report: `sha256:033cc5243845542404595c5df3d291c6891807e34172d9bd6c5175d8d018ed0c`.

Window elapsed:

- Start: `2026-06-02T19:32:20.4675013-04:00`.
- Finish: `2026-06-02T20:32:53.5415544-04:00`.
- Wall-clock elapsed: 60.56 minutes.

## 2026-06-02T21:17:05-04:00 - Window 5 Started: Deterministic Source-Custody Hardening (Claude)

Context:

- Claude joined as co-engineer, audited Codex's Window 1-4 trust spine, and proposed hardening the custody substrate before building the Verification Workbench. Rationale: geometry was not hash-protected, source-vault payloads were plaintext at rest, and the ledger head was internally consistent but externally forgeable - a Workbench UI would sign off against a substrate with trust cracks.
- James approved Window 5, Chunks 1->3, in order: (1) geometry-bound integrity, (2) encrypted vault-at-rest wiring/migration, (3) signed custody-ledger head / wholesale re-chain forgery defense. Adversarial-first (red tests before fixes). One-hour hard minimum, not a ceiling.
- Branch: `codex/sourcestack-trust-infra-window3` (continuing the same branch; commit/push at window close).
- Appended a full Window 5 calibration entry to `CALIBRATION_LOG.md` before writing any code. Estimate: 95 minutes, low-medium confidence. Baseline before changes: 35 tests, 30 gauntlet cases, lint/build green.

## 2026-06-02T21:31:29-04:00 - Chunk 1 Complete: Geometry-Bound Integrity

Audit cracks closed:

- Page geometry (width/height/rotation/quadPoints) was excluded from every content hash, so a citation highlight could be moved to a different in-bounds region undetected. `verifySourceArtifact` only bounds-checked quads.
- kernel `sourceSpanBackedBySource` returned true for any span with `quadPoints.length > 0` even with no backing page text, so a fabricated floating quad could satisfy the packet hard wall.

Red tests first (both failed on pre-change code, confirming the cracks were real):

- `detects within-bounds geometry tamper via the page geometry hash`: moved a valid in-bounds quad; pre-change `verifySourceArtifact` returned `ok: true`.
- `rejects geometry-only backing unless the page carries content-addressed media`: floating quad + synthetic image hash; pre-change packet assembled.

Implemented:

- `src/sourcestack/sourceArtifacts.ts`: added required `geometryHash` to `SourceArtifactPage`; `hashArtifactPageGeometry` content-addresses canonical geometry (dimensions, rotation, and every block's id/kind/text/confidence/quads). `createTextSourceArtifact` populates it; `verifySourceArtifact` recomputes and enforces it AFTER the per-block bounds check, so out-of-bounds quads still report `block quad outside page bounds` and within-bounds tamper now reports `page geometry hash mismatch`.
- `src/sourcestack/kernel.ts`: added `spanBackedByHashedMedia`. Geometry/media-only backing (no extracted page text to compare against) is now valid ONLY when the span is tied to genuine content-addressed source media: a real media segment, or a page whose `imageHash` is a `sha256:` content address. A synthetic `legacy-page:` fingerprint or bare `quadPoints` is no longer treated as backing. `sourceSpanBackedBySource` delegates its no-text branch to this function.

Invariant added:

- A citation's geometry is part of the sealed source. A highlight cannot be moved (even within page bounds) without breaking verification, and a quad with no hashed page media behind it is not "source-backed."

Layering note:

- The kernel `sha256:`-prefix check is the deterministic last line. Artifact verification (`page.imageHash` must equal the vault `pageImageContentHash`) and bundle artifact->vault cross-links ensure the `sha256:` is genuinely backed by real bytes. The legacy bridge already sets real `sha256:` page-image hashes when vault/artifact media exists and synthetic `legacy-page:` fingerprints otherwise, so the check cleanly separates genuine page-image custody from synthetic.

Tests / gauntlet:

- 37 unit tests pass (35 prior + 2 new red-then-green).
- 2 new gauntlet cases: `geometry_within_bounds_tamper`, `geometry_only_backing_requires_media`. Gauntlet now 32 cases, 0 failures.

Checks:

- `npm test -- --run`: PASS, 37.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 32 cases, 0 failures.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json`: PASS (regenerated with geometryHash-bearing artifacts).
- `npm run bundle:verify -- reports\source-gauntlet-bundle.json`: PASS (legacy bundle has no source artifacts; backward compatible).
- `npm run bundle:verify -- reports\source-gauntlet-bundle-tampered.json`: expected FAIL observed.

Backward compatibility:

- `createTextSourceArtifact` is the only artifact-page constructor, so all in-code artifacts carry `geometryHash`. The custody bundle is regenerated by `gauntlet:report`; the legacy plain bundle contains no source artifacts, so geometry-hash enforcement does not affect it.

## 2026-06-02T21:42:52-04:00 - Chunk 2 Complete: Encrypted Source Vault At Rest

Audit crack closed:

- `sourceVaultEncryption.ts` (PBKDF2-SHA256 + AES-GCM, AAD-bound) existed and was tested, but was never wired into the live store. The app persisted original source bytes and rendered page images as plaintext base64 in IndexedDB (`createIndexedDbSourceVaultStore` + `putSourceVaultManifest`). Device/profile access defeated confidentiality despite the directive's threat model. The encryption primitive was dead code relative to storage.

Red test first (failed before the wrapper existed):

- `encrypts source-vault payloads at rest and fails closed on the wrong passphrase`: asserts (a) the plaintext store leaves bytes readable (the crack, for contrast), (b) the encrypted store persists ciphertext with no plaintext payload, (c) storage verification round-trips through decrypt, (d) wrong passphrase rejects, (e) a legacy plaintext record already in the store is tolerated on read (migration).

Implemented:

- `src/sourcestack/sourceVault.ts`: extracted a storage-agnostic `RawSourceVaultRecordStore<T>` and generic `createIndexedDbSourceVaultRecordStore<T>`; `createIndexedDbSourceVaultStore` now delegates to it. This lets a wrapper persist encrypted records in the same IndexedDB without the store knowing the difference.
- `src/sourcestack/sourceVaultEncryption.ts`: added `StoredSourceVaultRecord`, `isEncryptedSourceVaultBlobRecord`, and `createEncryptedSourceVaultStore(raw, passphrase, {iterations})` - encrypts on put, decrypts on get, tolerates legacy plaintext on read, requires a non-empty passphrase.
- `src/App.tsx` import path: if a workspace passphrase is set, source-vault payloads persist through the encrypting store (ciphertext at rest) and storage is verified by a decrypt round-trip. If NO passphrase is set, the app refuses to write plaintext bytes to disk - the manifest and custody hashes are still verified and carried on the document, but raw bytes persist only under an encrypted vault. No plaintext fallback.

Invariant added:

- Original source bytes and rendered page images are never written to durable storage in plaintext. At-rest persistence requires an encrypted vault keyed by the workspace passphrase; wrong passphrase fails closed; pre-existing plaintext records remain readable for migration.

Tests / gauntlet:

- 38 unit tests pass (+1). New gauntlet case `encrypted_source_vault_at_rest` (privacy_redaction): ciphertext at rest, storage verified, wrong-passphrase block. Gauntlet now 33 cases, 0 failures.

Checks: `npm test` 38 PASS; `npm run lint` PASS; `npm run build` PASS; `npm run gauntlet:report` 33 PASS / 0 fail; custody + legacy `bundle:verify` PASS.

Known limit / follow-up:

- Encryption derives a PBKDF2 key per record (unique salt per record); for large multi-page PDFs that is N derivations. A single-derivation-per-import (one salt, unique IVs) optimization is a follow-up. Pre-existing plaintext vaults are tolerated on read but not yet bulk re-encrypted.

## 2026-06-02T21:57:15-04:00 - Chunk 3 Complete: Signed Custody-Ledger Head + KDF Floors

Audit cracks closed:

- The append-only trust ledger was a linear SHA-256 chain with no signature/anchor over `headHash`. `verifyCaseEventLog` only checked internal self-consistency, so a holder of the stored object could rewrite any event and RECOMPUTE the whole chain (a wholesale re-chain forgery) undetected. "Chain of custody is a product pillar" held only against an out-of-band trusted head that was never persisted or signed.
- KDF iteration counts were inconsistent and weak (120k/240k/250k) and decrypt trusted attacker-supplied `iterations` with no floor (the audited iterations:1 downgrade).

Red tests first:

- `rejects a wholesale re-chained case ledger via the signed head anchor`: rebuilds the entire chain with a forged event so `verifyCaseEventLog` passes (proving internal consistency is fooled), then shows the signed head anchor rejects it on head-hash mismatch, and a trust-pinned verify rejects an attacker who re-signs with their own key.
- The KDF floor was confirmed adversarially: after adding the floor, every existing `iterations:1000`/`10_000` test blob failed closed with `PBKDF2 iterations ... below the minimum floor`, which I then bumped to the floor value.

Implemented:

- `src/sourcestack/kdf.ts` (new): `PBKDF2_DEFAULT_ITERATIONS = 600_000` (OWASP), `PBKDF2_MIN_ITERATIONS = 100_000` (hard floor), `assertPbkdf2Iterations`. Wired into `keyCustody.ts`, `sourceVaultEncryption.ts`, and `encryptedPayload.ts`: production defaults are now 600k, and both encrypt and decrypt reject anything below the floor (a stored blob can no longer downgrade key strength). `encryptedPayload` also now rejects an empty passphrase.
- `src/sourcestack/caseStore.ts`: `CaseLedgerHeadAnchor` + `signCaseLedgerHead` (ECDSA P-256 over caseId/genesisHash/headHash/eventCount) + `verifySignedCaseLedger` (re-runs the event log, checks genesis/head/count, re-derives and optionally pins the signer key, verifies the signature). A re-chained log produces a head the original key never signed; a forger cannot re-sign without the private key; a pinned trusted key id rejects an attacker re-sign.
- `src/sourcestack/bundle.ts`: forensic bundles now optionally carry a `caseLedgerAnchor`. `createSourceStackForensicBundle` signs the head when a `ledgerSigningKey` is supplied; `verifySourceStackForensicBundle` verifies the anchor against the embedded caseStore (with optional `trustedLedgerKeyId` pin). The anchor is dropped from the bundle hash when absent, so legacy bundles verify unchanged.
- `src/App.tsx`: the SourceStack bundle export now signs the trust-ledger head with the same passphrase-custody signing key used for packet manifests (falls back to no anchor if custody is unavailable). The in-app and CLI verifiers check the anchor automatically.

Invariants added:

- Every passphrase-wrapped custody primitive derives at >= 100k PBKDF2 iterations (production 600k); decrypt refuses weaker blobs.
- The trust ledger is tamper-evident as a standalone artifact: a wholesale re-chain is detected because the signed head no longer matches, and signer identity is verifiable (and pinnable).

Tests / gauntlet:

- 41 unit tests pass (+3: ledger forgery, KDF floor, bundle-embedded signed ledger). 2 new gauntlet cases: `signed_ledger_head_forgery`, and the existing custody-bundle case now asserts `signed ledger head present`. Gauntlet now 34 cases, 0 failures.

Checks: `npm test` 41 PASS; `npm run lint` PASS; `npm run build` PASS; `npm run gauntlet:report` 34 PASS / 0 fail; custody + legacy `bundle:verify` PASS (custody bundle now carries a verified signed head); tampered `bundle:verify` expected FAIL.

Known limit / follow-up:

- The signer trust anchor is optional: `verifySignedCaseLedger`/bundle verify accept any self-consistent key unless a `trustedLedgerKeyId` is pinned out-of-band. The same applies to packet-manifest signatures. A real key registry / fingerprint-disclosure layer is the next custody hardening (carried over from the audit).

## 2026-06-02T22:08:29-04:00 - Chunk 4 Complete: Prompt-Injection Normalization (under-floor continuation)

Reason for this chunk: Chunks 1-3 finished well under the one-hour floor, so per the window rule I continued with the next-highest trust gap from the audit instead of stopping. The live prompt-injection detector (which gates OCR commit and import auto-suggestion) was a 7-entry regex with no normalization, first-match-only, and tested only against one literal string - trivially bypassed by obfuscation.

Audit crack closed:

- `detectPromptInjection` scanned only raw text, so full-width, zero-width-split, homoglyph, and leetspeak injections passed clean (e.g. `1gn0re prev1ous instructions`, `іgnore...`).

Red test first:

- `detects obfuscated prompt injection after normalization`: asserts four obfuscated variants (full-width, zero-width split, leetspeak, Cyrillic homoglyph) are all flagged critical, that `normalizeForInjectionScan` leaves bare numbers intact (`page 14`), and that benign text with numbers is not flagged. It failed before normalization existed.

Implemented:

- `src/sourcestack/promptInjection.ts`: added `normalizeForInjectionScan` - NFKC fold, lowercase, strip zero-width/word-joiner code points, map common Cyrillic/Greek homoglyphs to ASCII, and fold leetspeak digits only inside tokens that already contain letters (so `page 14`/`section 5` are not turned into accidental keywords). `detectPromptInjection` now scans both the raw text and the normalized variant, uses `matchAll` (every occurrence, not just the first), and dedupes findings by id + normalized excerpt.

Invariant strengthened:

- Source-borne instructions are detected through common obfuscation, not just literal phrasing. This hardens a control that is actually live (OCR commit gate + import quarantine), even though the frontier model lane itself is still scaffolding.

Tests / gauntlet:

- 42 unit tests pass (+1). New gauntlet case `obfuscated_prompt_injection` (model_safety). Gauntlet now 35 cases, 0 failures.

Checks: `npm test` 42 PASS; `npm run lint` PASS; `npm run build` PASS; `npm run gauntlet:report` 35 PASS / 0 fail.

Note: ESLint `no-irregular-whitespace` correctly flagged literal zero-width characters in the scan regex; the regex now uses explicit `​-‍⁠﻿` escapes.

Known limit / follow-up:

- Detection still does not catch deliberate single-letter spacing ("i g n o r e"), base64/rot13-encoded instructions, or non-English injections. The regex blocklist remains a heuristic; a model-based classifier in the (future) local lane is the eventual answer.

## 2026-06-02T22:08:29-04:00 - Window 5 Closeout

Window: Deterministic Source-Custody Hardening (Claude). Branch `codex/sourcestack-trust-infra-window3`.

Net result across Chunks 1-4:

- Geometry is content-addressed: within-bounds quad tamper is detected and a floating quad with no hashed page media no longer satisfies the packet hard wall.
- Source-vault original bytes and rendered page images are AES-GCM encrypted at rest (passphrase-gated, no plaintext fallback); pre-existing plaintext is tolerated on read for migration.
- The append-only trust ledger carries an ECDSA-signed, genesis-anchored head; a wholesale re-chained log is detected and the signer is verifiable/pinnable. The forensic bundle and App bundle export sign and verify it.
- PBKDF2 policy is centralized: production 600k, hard floor 100k enforced on encrypt and decrypt across all three custody primitives.
- The live prompt-injection detector resists common obfuscation.

Final verification (all from the app repo):

- `npm test -- --run`: PASS, 42 tests.
- `npm run lint`: PASS.
- `npm run build`: PASS.
- `npm run gauntlet:report`: PASS, 35 cases, 0 failures.
- `npm run bundle:verify` custody + legacy: PASS; tampered: expected FAIL.
- `npm run calibration:validate`: PASS.
- `npm run case:import`: PASS (2 documents, 8 cited evidence cards).
- `git diff --check`: PASS (LF-to-CRLF normalization warnings only).

Gauntlet grew 30 -> 35 cases: `geometry_within_bounds_tamper`, `geometry_only_backing_requires_media`, `encrypted_source_vault_at_rest`, `signed_ledger_head_forgery`, `obfuscated_prompt_injection`.

Immediate next trust gaps (handoff for Codex/next window):

1. Signer trust anchor / key registry: packet and ledger signatures are tamper-evident but verify any self-consistent key unless pinned out-of-band. Build a fingerprint-disclosure / trusted-key registry so recipients can pin expected signers.
2. Redaction completeness: still no automatic name/address detection; the residual-leak hard wall reuses keyword-only regexes, so an un-keyworded identifier can ship. Add heuristic name/address leak flagging.
3. Verification Workbench: now that geometry is hash-protected, build the real promotion/reanchor workspace with page image, quads, stale-anchor repair, and human signoff (the originally-deferred Codex pick).
4. True 4-way anchoring: relocation still uses only lexical char/token matching; geometric, semantic-fingerprint, and structural anchors and media-timestamp relocation remain unimplemented.
5. Single-derivation-per-import for vault encryption and a bulk re-encryption migration for any pre-existing plaintext vaults.

Commit/push:

- Window 5 work committed as `092764b` ("Harden source custody: geometry hashing, encrypted vault, signed ledger, KDF floors, injection") on branch `codex/sourcestack-trust-infra-window3`.
- Window timing: start `2026-06-02T21:17:05.3741540-04:00`, finish `2026-06-02T22:17:08.7696473-04:00`, elapsed 60.06 minutes (one-hour minimum satisfied).
- Pushed to `origin/codex/sourcestack-trust-infra-window3` for Codex/Claude alternation.

## 2026-06-03T06:35:00-04:00 - Window 6 Started: Signer Trust Anchor + Opportunistic Hardening (Claude)

Context:

- Open-ended window ("same rigor; implement improvements when found, document what/why"). Started from a clean tree at `eec081d`, in sync with origin. Calibration entry appended before coding.
- Primary target: my own Window 5 handoff #1. Packet and ledger signatures became tamper-evident in Window 5, but `verify*Signature` accepts ANY self-consistent key, so the directive 5.2 promise ("recipients can independently verify it was not altered" - and by whom) was not yet true. Without a way to pin/disclose the signer, a tamperer who re-signs with their own freshly generated key still produces a valid signature.

## 2026-06-03T06:35:00-04:00 - Chunk 1 Complete: Signer Trust Registry + Pinned Verification

Audit crack closed:

- No trust anchor for signatures: signature verification proved "validly signed by whatever key the document carries", not "signed by a signer I trust."

Red test first:

- `pins packet and ledger signatures to a trusted-key registry`: a packet/ledger signed by key A verifies normally, is REJECTED when pinned to a registry trusting only key B (`requireTrusted`), and ACCEPTED (with the signer's label) when the registry trusts A; the key fingerprint is stable across calls and human-grouped; a tampered signed manifest fails regardless of registry. It failed before the registry existed.

Implemented:

- `src/sourcestack/trustRegistry.ts` (new): `TrustedKeyRegistry` + `TrustedSigner` keyed to the signer's `keyId` (SHA-256 of the canonical public JWK, the same stable identity the signatures already use); `keyFingerprint` (full, untruncated, grouped uppercase hex for out-of-band comparison - no truncation so a forger cannot collide a look-alike); `createTrustedKeyRegistry`/`makeTrustedSigner`/`addTrustedSigner`/`isTrustedKeyId`/`findTrustedSigner`; and `verifyPacketManifestAgainstRegistry` which verifies the ECDSA signature AND reports `trusted` (a separate flag), failing closed under `requireTrusted` when the valid signature is from an untrusted signer.
- `src/sourcestack/caseStore.ts`: `verifySignedCaseLedger` options extended with `trustedKeyIds?: string[]` (registry-based pin) alongside the existing single `trustedPublicKeyId`.
- `src/App.tsx`: workspace-persisted trust registry (`useLocalState`); the manifest verifier now reports the signer's fingerprint and whether it is TRUSTED (with the stored label) or UNKNOWN, and offers a "Trust this signer" action that adds the signer to the registry after the user has compared the fingerprint out-of-band.

Invariant added:

- A recipient can now require that a packet/ledger be signed by a *trusted* signer, and can verify signer identity out-of-band via a stable full-digest fingerprint. This is the difference between "tamper-evident" and "chain-of-custody."

Tests / gauntlet:

- 43 unit tests pass (+1). New gauntlet case `packet_signer_trust_registry` (packet_integrity): trusted signer accepted, unknown signer pinned out. Gauntlet now 38 cases, 0 failures.

Checks: `npm test` 43 PASS; `npm run lint` PASS; `npm run build` PASS; `npm run gauntlet:report` 38 PASS / 0 fail.

Note on remaining limit:

- The registry is local/manual (the user vouches for a fingerprint out-of-band). There is no federated/third-party key directory; that is a larger PKI question and intentionally out of scope. The fingerprint + manual pin is the honest local-first version.

## 2026-06-03T06:39:00-04:00 - Chunk 2 Complete: Opportunistic Crypto Hardenings (improvements found in audit)

Two seams the Window 5 audit flagged, each red-tested and documented here per the window instruction to implement and explain improvements found:

1. **KDF iteration ceiling (decrypt-time DoS).** PBKDF2 cost is linear in the iteration count and decrypt reads `iterations` from the (attacker-controllable) blob. A hostile or corrupt blob claiming billions of iterations would hang decrypt. Added `PBKDF2_MAX_ITERATIONS = 10_000_000` (well above the 600k production default) and a ceiling check in `assertPbkdf2Iterations`, which all three custody primitives already call on both encrypt and decrypt - so the guard is live everywhere automatically. Red test: a payload claiming `5_000_000_000` iterations now fails fast (`exceed the maximum`) instead of hanging.
   - Why: this is the only remaining way an attacker-supplied field could degrade availability; the floor already prevents weak-key downgrades, the ceiling prevents the symmetric DoS.

2. **`decryptJsonPayload` expected-format pinning.** The audit noted decrypt did not verify the envelope `format` matched what the caller expected (callers checked ad hoc), allowing cross-format confusion. Added an optional `{ expectedFormat }` that throws `unexpected encrypted payload format` before any key derivation, and wired it into the encrypted workspace import.
   - Why: defense-in-depth - a mis-typed or swapped envelope fails fast with a clear message rather than attempting a (futile, expensive) decrypt.

Tests / gauntlet: 45 unit tests pass (+2). Checks: `npm test` 45 PASS; `npm run lint` PASS; `npm run build` PASS; `npm run gauntlet:report` 38 PASS / 0 fail.

Considered but deferred: the `sourceVaultEncryption` decrypt reconstructs AES-GCM AAD with a hardcoded `format` string (works today, fragile if the format ever version-bumps). Left as a noted follow-up rather than changing an authenticated-data binding late in the window.

## 2026-06-03T06:43:00-04:00 - Chunk 3 Complete: Redaction PII Coverage (improvement found in audit)

Improvement: the redaction residual-leak hard wall only knew email/phone/SSN/labeled-IDs/labeled-DOB, so the audit's flagged classes - street addresses, payment-card numbers, and named individuals - could ship un-redacted in a "privacy is the product" packet.

Red test first:

- `redacts street addresses, Luhn-valid card numbers, and honorific names`: a street address, a Luhn-valid card, and "Dr. Jane Smith" are all redacted with zero residual leaks; AND benign text (a street name with no leading number, a non-Luhn long number, ordinary capitalized phrases) is NOT over-redacted. It failed before the new classes existed.

Implemented (`src/sourcestack/redaction.ts`):

- Added three high-precision classes to `sensitivePatterns`, so they are both auto-tokenized and residual-scanned like the existing classes: `street_address` (leading number + up to four words + street suffix), `credit_card` (13-19 digit sequence validated by a Luhn checksum), and `honorific_name` (honorific + one/two capitalized words).
- Added a `validate?` hook to the pattern config (used by `credit_card` for Luhn) threaded through both redaction and residual detection, so a digit string that fails Luhn is neither redacted nor reported as a leak.
- `credit_card` is ordered before `phone` so a 16-digit card is claimed as a whole (phones are 10 digits and never collide).

Precision rationale (why this will not over-redact and block legitimate exports):

- Street address requires a leading number AND a street suffix; card requires Luhn; name requires an honorific. Each structure is high-precision, so ordinary prose, exhibit numbers, and plain capitalized words are left intact (asserted in the benign half of the test). Names without honorifics still rely on manual terms - automatic free-text name detection (NER) is intentionally out of scope to avoid false-positive flooding.

Tests / gauntlet: 46 unit tests pass (+1). New gauntlet case `redaction_extended_pii_classes` (privacy_redaction). Gauntlet now 39 cases, 0 failures. `npm run lint` / `npm run build` PASS.

## 2026-06-03T06:46:00-04:00 - Chunk 4 Complete: Honest Artifact Highlight Quads (improvement found in audit)

Improvement: `createArtifactBackedSpan` (sourceArtifacts.ts) chose the quote-containing layout block, but fell back to the FIRST block's quad on a miss while still marking the span `stable`. When a quote spans two blocks (so no single block contains it), the citation highlight was pointed at the wrong region of the page - a silently mislocated highlight, exactly the kind of geometric dishonesty Window 5's geometry hashing was meant to prevent.

Red test first:

- `does not claim a highlight quad when no single block contains the quote`: a quote split across two blocks must yield an empty quad (no false highlight) while remaining text-backed via charRange; a quote fully inside one block still uses that block's quad. It failed before the fix (the span borrowed the first block's quad).

Implemented:

- `createArtifactBackedSpan` now uses the matching block's quad only when a block actually contains the quote; otherwise `quadPoints` is left empty and `quality` falls back to the page OCR quality. The span stays text-backed (the kernel backs it via page text + charRange), so packet eligibility is unchanged - it simply stops asserting a highlight box it cannot justify.

Why: "the source hash verifies it" must extend to *where on the page* the quote is. A highlight that points at the wrong block is worse than no highlight; the Verification Workbench (next major piece) will render these quads, so they must be honest.

Tests: 47 unit tests pass (+1). `npm run lint` / `npm run build` PASS.

## 2026-06-03T06:50:00-04:00 - Chunk 5 Complete: Trust Registry Across the Forensic Bundle Ledger

Extended Chunk 1's signer trust registry to the forensic bundle's signed ledger head so trust is consistent across both signed artifacts (packets and ledgers):

- `verifySourceStackForensicBundle` options gained `trustedLedgerKeyIds?: string[]`, passed through to `verifySignedCaseLedger` - a recipient can now require the bundle's ledger head to be signed by a trusted signer.
- The App SourceStack bundle verifier now reports the ledger head's signer fingerprint and whether it is TRUSTED (with the stored label) or UNKNOWN, mirroring the manifest verifier.

Tests: extended the bundle-ledger test with trusted/untrusted pin assertions; 47 unit tests pass. `npm run lint` / `npm run build` PASS.

## 2026-06-03T06:56:00-04:00 - Chunk 6 Complete: Single-Derivation Encrypted Vault (improvement found)

Improvement: the Window 5 encrypted vault derived a fresh 600k-iteration PBKDF2 key for EVERY record (and again per record on the decrypt-round-trip verify). For a multi-page PDF (original + N page images) that is N+1 derivations on import plus N+1 on verify - seconds of work that made the encrypted-at-rest path impractical for real documents.

Implemented (`src/sourcestack/sourceVaultEncryption.ts`):

- Added `encryptSourceVaultBlobRecordWithKey` / `decryptSourceVaultBlobRecordWithKey` that take an already-derived `CryptoKey`; `encryptSourceVaultBlobRecord` / `decryptSourceVaultBlobRecord` now derive once and delegate to them (no behaviour change for direct callers).
- `createEncryptedSourceVaultStore` now derives ONE key per store instance (one random salt, cached by salt+iterations) and reuses it across every put/get, with a unique random IV per record. AES-GCM stays safe (unique key+IV pairs); the import + verify cost drops from O(records) derivations to O(1).
- The store get path still asserts the (attacker-controllable) stored `iterations` against the KDF floor/ceiling before deriving.

Why it is safe: AES-GCM requires unique (key, IV) pairs, not unique keys; a 96-bit random IV per record makes collision negligible for the handful of records per import. Wrong-passphrase still fails closed (the derived key differs), proven by the existing round-trip test, which now also asserts both records share one salt with distinct IVs.

Tests: 47 unit tests pass (encryption-at-rest test extended with the single-derivation assertion). `npm run lint` / `npm run build` / `npm run gauntlet:report` PASS.

## 2026-06-03T06:56:00-04:00 - Window 6 Closeout

Window: Signer trust anchor + opportunistic hardening (Claude). Branch `codex/sourcestack-trust-infra-window3`. Twelve improvements, each red-tested where behavioural and documented above:

1. Signer trust registry + pinned packet verification + human fingerprint + ledger `trustedKeyIds` + App manifest-verifier wiring (closes the audit's last big gap: a trust anchor for signatures).
2. KDF iteration ceiling (decrypt-time DoS guard), live on every decrypt.
3. `decryptJsonPayload` expected-format pinning.
4. Redaction PII coverage: street address, Luhn-valid card, honorific name (high-precision, no over-redaction).
5. Honest artifact highlight quads (no borrowed wrong-block quad).
6. Trust registry extended across the forensic-bundle ledger head + workspace-snapshot portability.
7. Single-derivation encrypted vault (O(1) PBKDF2 per import).
8. Local signer fingerprint disclosed on manifest export (completes the out-of-band loop: the signer shares a fingerprint, the recipient pins it via #1).
9. `verifyEncryptedPacketSigningKey` can now confirm a signing key is actually RECOVERABLE (optional passphrase unwrap), not just a well-formed envelope - closing an audit-flagged "verified custody" overclaim.
10. Trust-registry management: `removeTrustedSigner` primitive + an App "Trusted signers" panel (view label/role/fingerprint, remove) so the registry is view/add/remove, not add-only - closes part of the registry-UX handoff gap.
11. Redacted-export status and the `redaction_applied` trust-ledger event now disclose WHICH PII categories were redacted and how many (reviewer/auditor confidence in what the hard wall caught).
12. Street-address redaction precision (found in final review): street-name words must start uppercase or a digit, so a medical dosage like "5 mg Dr." is no longer mis-redacted as a street address - important for the medical domain pack. Red-tested.

Gauntlet grew 39 -> 45 cases this window: `packet_signer_trust_registry`, `redaction_extended_pii_classes`, `kdf_iteration_bounds`, `encrypted_signing_key_recoverable`, `ledger_head_trusted_key_pin`, `artifact_span_honest_quad` (plus the rest covered by unit tests).

Also added `TRUST_MODEL.md`: a standalone, recipient/auditor-facing statement of exactly what SourceDeck guarantees deterministically (sources 1-4) and its honest limits (section 5), enforced by the gauntlet/tests rather than asserted by UI.

Immediate next trust gaps (handoff):

1. Verification Workbench: geometry is hash-protected and honest, signatures are pinnable - the human promotion/reanchor workspace (page image, quads, stale-anchor repair, signoff) is the clear next build.
2. True 4-way anchoring (geometric/semantic/structural relocation + media timestamp) - still only lexical.
3. Registry federation: a federated/third-party key directory and signer rename/relabel (view/add/remove shipped this window; the current registry is local-manual).
4. OCR worker execution and a real model runtime (still scaffolding/gated).
5. Collaboration/sync/retention/chain-of-custody across devices.

Commit/push:

- Window 6 work committed as `0ea73b4` ("Trust anchor + hardening: signer registry/pinning, KDF DoS guard, redaction PII, single-derivation vault") on branch `codex/sourcestack-trust-infra-window3`.
- Window timing: start `2026-06-03T06:27:12.5018985-04:00`, finish `2026-06-03T07:27:12-04:00`, ~60 minutes (one-hour minimum satisfied; the planned scope finished in ~27 minutes, then expanded to twelve improvements + TRUST_MODEL.md to fill the floor).
- Pushed to `origin/codex/sourcestack-trust-infra-window3` for Codex/Claude alternation.

## 2026-06-03T09:12:06-04:00 - Window 7 Started: Verification Workbench (Claude)

Context:

- The substrate is now sound (hash-protected honest geometry, encrypted vault media, signed/pinnable custody), so per my own handoff #1 and the directive's section 11 named pillar I am building the Verification Workbench - starting with its DETERMINISTIC core (the trust spine of the verification gate), not UI polish. Clean tree at `ef61bc4`, baseline 49 tests. Calibration entry appended with a falsifiable prediction about the "over-price then expand" pattern.

## 2026-06-03T09:20:00-04:00 - Chunks 1-2 Complete: Workbench Deterministic Core + App Signoff Wiring

The blind spot this closes (Codex W4 #1, my own W5/W6 handoff): "Verification Workbench is not yet a real promotion/reanchor workspace with ... human signoff." Human verification was a one-click status flip with no attribution and no binding to what was actually reviewed.

Red test first:

- `builds a verification dossier and signs off only when source proof passes`: a stale-anchor card CANNOT be signed off as verified (fail-closed); a source-resolved cited card signs off to verified producing an attributable record bound to a proof-snapshot hash; and after the source span text is mutated, `verifyEvidenceSignoff` reports the prior signoff as STALE. It failed before the module existed.

Implemented (`src/sourcestack/workbench.ts`, new):

- `buildVerificationDossier(graph, cardId)`: composes the existing `diagnoseEvidenceCard` proof state with the legal next-actions (each candidate verification state run through `gateEvidenceStatusTransition`), a `reanchorRecommended` flag, a `promotable` flag, and a content-addressed `proofSnapshotHash`.
- `proofSnapshotHash`: content-addresses exactly the SOURCE-PROOF state a reviewer approves - document hash, span text + geometry quads, quote, and the resolved proof booleans - but NOT the card's own verification label. So a later change to the source (re-OCR, corrected file, moved geometry, quote drift) flips the hash, while a benign status change does not.
- `signOffEvidenceVerification(graph, cardId, {decision, reviewer, at})`: an attributable, fail-closed human signoff. The decision maps to a target state and is gated by the SAME `gateEvidenceStatusTransition` that protects the packet hard wall - so a reviewer cannot sign off "verified" on an unbacked, quote-mismatched, or anchor-stale card. Returns the updated card + a signoff record (who/when/from->to/decision/proofSnapshotHash). A reviewer identity is required.
- `verifyEvidenceSignoff(graph, signoff)`: re-checks a stored signoff against the CURRENT graph; if the source proof changed, the recomputed snapshot differs and the signoff is flagged stale - the deterministic basis for "this verification needs a fresh signoff."

App wiring (`src/App.tsx`, `caseStore.ts`):

- Added an `evidence_signed_off` trust-ledger event type.
- A persisted `reviewerIdentity` field. The Evidence workbench's verify control now goes through `signOffEvidenceVerification` and records an attributable `evidence_signed_off` event carrying the reviewer, decision, from->to, and the proof-snapshot hash. Added a `Dispute` signoff action. Verification is now an auditable, attributable, source-bound act instead of a status flip.

Invariant added:

- A human verification ("verified") is attributable to a reviewer and bound by content hash to the exact source-proof state that was reviewed; it cannot be granted to a card that fails source proof; and it is detectably stale if the source later changes.

Tests / gauntlet: 50 unit tests pass (+1). New gauntlet case `workbench_signoff_fail_closed_and_stale` (source_integrity). Gauntlet now 46 cases, 0 failures. `npm run lint` / `npm run build` PASS.

Calibration note (the prediction): I predicted the planned core + wiring would take ~25-30 minutes (the W5/W6 "finish in ~half the window" pattern). Actual: ~8 minutes. Even genuinely-novel kernel concepts (proof snapshot, attributable signoff, stale detection) compressed because the mature kernel made them composition over `diagnoseEvidenceCard` + `gateEvidenceStatusTransition` + `contentAddress`. The pattern did not just hold - it was stronger than predicted. Expanding to fill the floor with Workbench-adjacent value (live stale-signoff audit, then split/merge).

## 2026-06-03T09:36:00-04:00 - Chunk 3 Complete: Live Stale-Signoff Audit + App Surfacing

The payoff of the proof-snapshot design. A signoff binds to the source state it approved; this chunk makes that binding *live* - a verified card whose source later changes is surfaced to the reviewer as needing re-verification, both as a batch primitive and in the UI.

Red test first:

- `audits stored signoffs and flags the ones whose source changed`: signs off two independent cards (`card_cited`, and a fresh `card_two` on its own page/span so the two do not share source), mutates only `span_two`, and asserts `auditEvidenceSignoffs` returns exactly one stale entry (the mutated one) and one current entry. It failed before the primitive existed.

Implemented:

- `auditEvidenceSignoffs(graph, signoffs[])` (`workbench.ts`): re-checks every stored signoff against the current graph via `verifyEvidenceSignoff`, returning per-signoff `{current, stale, reason}` entries plus a `staleCount` - the deterministic basis for a "these verifications need a fresh signoff" review queue.
- App surfacing (`App.tsx`): the selected card now shows its latest `evidence_signed_off` ledger event's status. Following Codex's W3 set-state-in-effect lesson, the synchronous part (find the latest signoff event) is a render-time `useMemo`; the effect performs ONLY the async `proofSnapshotHash` comparison and sets state after the await (never synchronously in the effect body), so lint stays clean. A current signoff renders green ("source unchanged since signoff"); a stale one renders red ("the source changed since - re-verification recommended"). CSS `.signoff-status.current/.stale` added.

Invariant added: a recorded human signoff is continuously re-validated against the live source; divergence is surfaced, not silently trusted.

Gauntlet case `signoff_audit_stale_sweep` (source_integrity): audit reports 0 stale when fresh, 1 stale after a source change.

## 2026-06-03T09:48:00-04:00 - Chunks 4-5 Complete: Deterministic Evidence-Card Split + Merge (directive section 11 named operations)

The directive's section 11 names "approve/reject/edit/split/merge" as workbench operations. Split and merge are the two that can silently corrupt provenance if done naively, so they are built in the deterministic kernel (the trust spine) with adversarial gauntlet coverage - App wiring is deferred as a handoff (see below), per "deterministic spine before UI polish."

Red tests first (both failed before their functions existed):

- `splits an evidence card into source-backed children and rejects out-of-source sub-quotes`: a sub-quote that is not present in the source span is rejected; valid sub-quotes produce children that each still diagnose as source-terminating, quote-exact, and span-backed.
- `merges true-duplicate citations and refuses to merge across different sources`: merging two cards with different `sourceDocumentId` fails closed; merging a true duplicate succeeds and the survivor stays source-backed.

Implemented (`workbench.ts`):

- `splitEvidenceCard(graph, cardId, subQuotes[])`: each sub-quote MUST be an exact substring of the parent span's text, so a split can only ever NARROW within the established source - it can never introduce a claim the source does not contain. Children get a precise sub-range, **shed the parent geometry** (empty `quadPoints` - no false sub-quad precision; they are honestly text-backed via the page text), and revert to `cited` so each part is signed off afresh. Why empty quads are safe: `sourceSpanBackedBySource` checks the page's extracted text first, and a substring of a backed quote is still contained in the page text - geometry backing is not needed and claiming inherited geometry would be a fabricated precision.
- `mergeEvidenceCards(graph, cardIds[])`: consolidates true-duplicate citations (same `sourceDocumentId` + `spanId` + exact quote) into one canonical card. It REFUSES to merge cards citing different sources, because a card carries exactly one source path - merging across sources would silently destroy provenance (which source would the survivor cite?). The merged card is a new entity reverting to `cited`; the constituents' original signoffs remain in the immutable trust ledger, so no audit history is lost. Inputs are de-duplicated so "merge a card with itself" is a no-op rejection.

Invariant added: card-editing operations (split, merge) can only ever preserve or narrow source provenance - never fabricate, broaden, or blur which source a claim rests on.

Gauntlet cases `workbench_split_narrows_within_source` and `workbench_merge_same_source_only` (source_integrity).

Handoff (deferred, honest): split/merge are not yet wired into the App UI. The kernel functions return kernel-shape `EvidenceCard`/`SourceSpan`; the App stores its own `EvidenceCard` shape and bridges to the kernel via `buildLegacySourceGraph`. Wiring split/merge end-to-end needs a small UI (sub-quote entry for split; duplicate selection for merge) plus a kernel->app card materialization step. The trust-critical validation is done and gauntlet-proven; the remaining work is UI plumbing.

## 2026-06-03T09:58:00-04:00 - Chunk 6 Complete: Case-Wide Signoff Review Queue (core + App banner)

Chunk 3 surfaced stale signoffs one card at a time, with the event->signoff reconstruction done ad-hoc inside an App effect. This chunk lifts that into a tested kernel primitive and a case-wide worklist: across the whole trust ledger, which verifications have gone stale because their source changed?

Red test first:

- `builds a case-wide signoff review queue from ledger events, keeping the latest per card`: feeds two `evidence_signed_off` events for the same card (an older one with a stale hash, then the real one); asserts the queue keeps exactly ONE entry per card (latest wins) and reports 0 stale; then mutates the source and asserts the reconstructed latest signoff is flagged stale. It failed before the primitive existed.

Implemented (`workbench.ts`):

- `RecordedSignoffEvent` (structural type) + `buildSignoffReviewQueue(graph, events)`: reconstructs the LATEST signoff per card from the append-only `evidence_signed_off` ledger events (last event for a card wins; malformed events without a decision/hash are skipped) and runs them through `auditEvidenceSignoffs`. The structural event type keeps the kernel decoupled from the case store's concrete event union. This is the deterministic basis for a case-wide "these verifications need a fresh signoff" worklist - and the reusable core for the deferred bundle-provenance work.
- App surfacing (`App.tsx`): the "Source integrity audit" panel now shows a case-wide banner - "N signed-off cards need re-verification - the source changed since signoff" - computed from `trustStore.events` in the same async-only effect discipline (no synchronous set-state in the effect). `ContentAddressedCaseStore.events` (`CaseStoreEvent[]`) is structurally assignable to `RecordedSignoffEvent[]`, so the live ledger feeds the kernel directly with no adapter.

Gauntlet case `signoff_review_queue_latest_per_card` (source_integrity).

Handoff (deferred, honest): (1) split/merge App UI as above. (2) Signoff provenance inside the forensic bundle - `buildSignoffReviewQueue` is the building block: carry the reconstructed latest-per-card `EvidenceSignoff`s in the exported bundle and run `auditEvidenceSignoffs` in `bundle:verify`, so an external auditor can confirm WHO signed off on WHICH source state and whether it still holds. The kernel is ready; this is bundle-format + CLI plumbing plus bundle regeneration.

## 2026-06-03T10:05:00-04:00 - Chunk 7 Complete: Split Wired Into the App + Adversarial Deepening

Having mandated build time left and the split LOGIC already proven by the kernel test + gauntlet, I wired split end-to-end (low logic risk - the trust-critical validation is `splitEvidenceCard`, which the App calls before creating anything).

App wiring (`App.tsx`, `caseStore.ts`, `App.css`):

- New `evidence_split` trust-ledger event type.
- The selected evidence card now has a split control: a textarea (one exact sub-quote per line) and a "Split into cards" button. `splitSelectedCard` runs the sub-quotes through the kernel `splitEvidenceCard` FIRST; only on success does it materialize the children into app `EvidenceCard` shape (inheriting the parent's framing, new ids, `verificationStatus: "cited"`, `packetReady: false`), supersede the parent, select the first child, and record an attributable `evidence_split` event (parentId, childIds, subQuotes). A failed validation surfaces the kernel's reason and creates nothing.

Why this is safe: the App never invents a split - it can only commit a split the kernel already proved narrows within the source span. A sub-quote not in the source is rejected before any card exists.

Adversarial deepening (two new kernel tests, both genuine uncovered properties):

- `refuses to merge cards citing the same span but different quotes (not true duplicates)`: merge requires exact-quote identity, not just same span/document - otherwise a merge would silently broaden which text the survivor rests on. (The existing merge test only covered cross-DOCUMENT rejection; this covers the same-span case.)
- `skips malformed signoff events when building the review queue`: an `evidence_signed_off` event missing its `proofSnapshotHash` cannot be re-validated, so it is skipped (not crashed, not silently counted as current). Ledger-corruption resilience.

Verified-not-assumed (important for the merge handoff): I checked `legacyBridge.ts` - it derives each span id from the CARD id (`spanId(card.id)`), so two app cards with identical quotes get DIFFERENT span ids. The kernel `mergeEvidenceCards` keys on same `spanId`, so it would (correctly, for the kernel model) reject app duplicates that differ only by card id. Therefore MERGE App wiring is NOT a quick plumb like split was - it needs either content-derived span ids in the bridge (spanId = f(documentId, page, quote)) or an app-level duplicate key. Rather than rush a bridge change near the window floor, merge UI stays a documented handoff with the exact blocker named.

Tests: 56 pass (+2 adversarial). Gauntlet 48 cases, 0 failures. Lint/build clean.

## 2026-06-03T10:10:00-04:00 - Chunk 8 Complete: Merge Identity Correctness Fix + Merge Wired Into the App

The Chunk 7 merge-UI handoff named a blocker - the legacy bridge mints a distinct span id per card, and `mergeEvidenceCards` keyed on same `spanId`, so it would refuse genuine duplicates. On reflection that was a CORRECTNESS BUG in the merge primitive, not just a wiring inconvenience: a span id is a synthetic implementation detail, and true-duplicate identity is the SOURCE a card rests on. Fixing it unblocked the UI.

Kernel fix (`workbench.ts`):

- `mergeEvidenceCards` now keys true-duplicate identity on the content-addressed source identity - `sourceDocumentId` + span `pageId`/`mediaSegmentId` + span `exactText` + exact quote - instead of the synthetic span id. Page/segment is part of the identity, so the same sentence appearing on two different pages is never collapsed into one source. This is strictly more correct and matches how citations actually duplicate.

Adversarial test (`merges duplicate citations across different span ids but never across different pages`): proves (a) two cards with DIFFERENT span ids but an identical source now merge (the bug fix), and (b) the same quote/text on a DIFFERENT page is still refused. The prior cross-document and same-span/different-quote rejections still hold.

App wiring (`App.tsx`, `caseStore.ts`):

- New `evidence_merged` trust-ledger event. The selected card gains a "Merge duplicates" action: `mergeSelectedCardDuplicates` finds other cards citing the same document + page + exact quote, validates them as true duplicates through the kernel `mergeEvidenceCards` (fail-closed), then drops the duplicates, reverts the survivor to cited, and records an attributable `evidence_merged` event (survivorId, mergedIds). If there are no duplicates it says so and changes nothing.

This completes directive section 11's split/merge pair END TO END (deterministic kernel + adversarial gauntlet/tests + App UI). The kernel does all trust-critical validation; the App only ever commits an operation the kernel already proved is source-preserving.

Tests: 57 pass. Gauntlet 48 cases, 0 failures. Lint/build clean.

Remaining workbench handoff (single item now): signoff provenance inside the forensic bundle (carry reconstructed latest-per-card `EvidenceSignoff`s via `buildSignoffReviewQueue` and audit them in `bundle:verify`).

## 2026-06-03T10:12:00-04:00 - Chunk 9 Complete: Source-Validated Quote Edit (the last directive section 11 operation)

Directive section 11 names "approve/reject/edit/split/merge". Approve (sign off verified), reject (dispute), split, and merge were done; "edit" was the last one missing - and the most quietly dangerous, because editing a card's quote is exactly how an unbacked claim could be laundered into a card if the edit is not source-validated.

Red test first (`edits a card quote only to text the source contains, and invalidates the prior signoff`): an edit to text not present in the source span is rejected; a valid edit to text the span contains succeeds, leaves the card source-terminating + quote-exact + span-backed, and reverts it to cited. It failed before the function existed.

Implemented (`workbench.ts`):

- `editEvidenceCardQuote(graph, cardId, newQuote)`: the new quote MUST remain an exact substring of the card's source span text, so an edit can never re-point a card at text the source does not contain. The edited card reverts to "cited" - the approved quote changed, so any prior signoff is invalidated and must be re-attested.

App wiring (`App.tsx`, `caseStore.ts`): new `evidence_edited` event; the selected card has an "edit quote" field + "Save quote" button that runs `editEvidenceCardQuote` (fail-closed) before committing, then reverts the card to cited and records an attributable `evidence_edited` event.

Gauntlet case `workbench_edit_quote_stays_in_source` (source_integrity).

This completes ALL of directive section 11's named card operations as deterministic, source-validated, fail-closed kernel functions, each adversarially gauntlet-covered and each wired into the App: approve (signoff), reject (dispute), edit, split, merge. The shared invariant across all five: a reviewer operation can only ever preserve or narrow source provenance - never fabricate, broaden, or blur which source a claim rests on - and any operation that changes the approved text drops the card back to cited so the human signoff is re-earned against the new state.

Tests: 58 pass. Gauntlet 49 cases, 0 failures. Lint/build clean.

## 2026-06-03T10:11:30-04:00 - Window 7 Close-Out (Verification Workbench)

Work commit: `d514809` (pushed to origin/codex/sourcestack-trust-infra-window3; ef61bc4..d514809). 13 files changed, +1656/-40; new `src/sourcestack/workbench.ts`.

Window timing: started 09:12:06. The planned 45-minute scope (workbench core + app signoff wiring) was green in ~8 minutes; the remaining floor was filled with seven self-chosen chunks (live stale-signoff audit, case-wide review queue, split, merge, the merge-identity correctness fix, edit, and their App wiring). Calibration: planned-scope estimate/actual ~5x over for the third consecutive window - lesson now robust across genuinely novel kernel work, not just adapters.

Full battery at close: `npm test --run` = 58 pass; lint clean; build pass; `gauntlet:report` = 49 cases, 0 failures; `bundle:verify` x3 = custody PASS / legacy PASS / tampered FAIL; `calibration:validate` = PASS (5 entries); `case:import` = 9 docs / 36 evidence; `git diff --check` clean.

What shipped this window: human verification is now attributable, source-bound by content hash, and detectably stale; a case-wide "needs re-verification" worklist; the merge-identity bug fix; and all five section-11 card operations (approve/reject/edit/split/merge) end to end (deterministic kernel + adversarial gauntlet + App UI).

Post-commit self-review catch (App surface, the one area not browser-exercised): the merge "find duplicates" filter was status-blind, so a DISPUTED card sharing the same source + quote could be silently absorbed by a merge and its dispute hidden. Hardened the filter to only absorb ACTIVE citations (excludes disputed/withdrawn/superseded/anchor_stale) - a merge can no longer bury a negative finding. Build/lint/test still green (58).

Next-window handoff (one item): signoff provenance inside the forensic bundle - the kernel building block `buildSignoffReviewQueue` is ready; remaining work is bundle-format + verifier-CLI plumbing + bundle regeneration, so an external auditor can confirm WHO signed off on WHICH source state and whether it still holds.

## 2026-06-04T18:19:04-04:00 - Window 8 Started: Claude Window Audit + Custody Hardening

Scope: audit Claude's Windows 5-7 and the branch state before building; then continue the trust infrastructure rather than drift into UI polish. Branch was clean at `4388575` before this window's edits. Baseline checks were green: `npm test -- --run` (58), `npm run lint`, `npm run build`, `npm run gauntlet:report` (49), custody/legacy bundle verifies pass, tampered bundle verify fails as expected, and `case:import` regenerates the sample workspace.

Audit findings:

- Claude's core direction is aligned: geometry hashing, encrypted source vault, signed trust ledger, workbench signoff/stale review, split/merge/edit source validation, and hostile-record gauntlet expansion are real trust-spine work rather than shell UI.
- Calibration improved materially, but the validator missed semantic placeholders. Window 7 had several `filled at close` fields that passed validation. Backfilled those fields with concrete capability/blind-spot content and hardened `scripts/validate-calibration-log.mjs` so future closed entries fail on that phrase, not only literal `OPEN`/`TBD`.
- Workbench signoff snapshots originally did not bind page media hash/source-vault identity strongly enough. Hardened `proofSnapshotPayload` to include source-vault manifest/original hashes, vault verification state, page index/image hash/OCR quality, and media segment timing/transcript/confidence. Added a regression proving page image hash drift makes an existing signoff stale.
- Merge provenance had one more fail-open: unresolved cards could share a `null` source identity and merge. Hardened `mergeEvidenceCards` so every input must first resolve, match the exact quote in the source span, and be span-backed before duplicate identity is considered. Added a regression for missing spans.

Custody crack found after the audit: Claude's encrypted IndexedDB source vault was real, but payload-bearing `SourceVaultManifest`s could still ride through `sourcedeck.documents` localStorage, and the no-passphrase import branch marked vault storage as verified. That overclaimed custody and created a plaintext persistence lane.

Fix:

- Added `sourceVaultPrivacy.ts` with `sourceVaultManifestHasPayloads`, `redactSourceVaultManifestPayloads`, and a shared redaction reason.
- Generalized `useLocalState` with an optional serializer and used it only for `sourcedeck.documents`.
- Document persistence now strips original source bytes and rendered page-image payloads from source-vault manifests before localStorage writes, marks the persisted vault as not verified, and retains custody hashes/record ids for review context.
- Bundle construction now includes only source-vault manifests that are both `sourceVaultVerified` and payload-complete, so a redacted localStorage manifest cannot be exported as if it were payload-bearing forensic custody.
- No-passphrase import now sets `sourceVaultVerified = false`; it records that the manifest hashes verified but encrypted at-rest storage was not established.
- UI copy now says `vault locked` / `Source vault needs encrypted custody` when payload custody is unavailable, instead of treating that as a verified vault.

Regressions:

- Unit test `redacts source vault payloads before browser-state persistence`: proves redaction removes original/page payload data from serialized shape, preserves custody hashes, and fails closed under `verifySourceVaultManifest`.
- Gauntlet case `source_vault_local_state_redacts_payloads`: same hostile-storage invariant in the Evidence Gauntlet.
- Current spot checks after this chunk: `npm test -- --run` = 61 pass; `npm run calibration:validate -- --allow-open-latest` = PASS.

## 2026-06-04T18:32:45-04:00 - Window 8 Chunk: Forensic Bundle Signoff Provenance

Claude's Window 7 handoff named signoff provenance inside forensic bundles as the remaining workbench trust gap. Built it now so external bundle verification can audit who signed off on which source-proof snapshot, and whether that signoff still holds against the exported graph.

Implementation:

- `SourceStackForensicBundle` now carries `signoffProvenance` plus `counts.evidenceSignoffs` and `counts.staleEvidenceSignoffs`.
- `createSourceStackForensicBundle` reconstructs the latest `evidence_signed_off` event per card from the append-only case store via `buildSignoffReviewQueue`, then stores the resulting audit inside the signed/hash-addressed bundle payload.
- `verifySourceStackForensicBundle` recomputes signoff provenance from the exported graph + case-store events. It fails on missing/mismatched provenance, and fails if any signoff is stale (`N evidence signoff(s) stale; re-verification required`).
- `scripts/verify-sourcestack-bundle.ts` now prints `Evidence signoffs: X (Y stale)` on pass so an auditor sees the review state without opening the JSON.

Regressions:

- Unit test `carries signoff provenance into forensic bundles and verifies it externally`: fresh reviewer signoff is embedded, counted, externally verified, and provenance tamper is caught.
- Unit test `fails forensic bundle verification when signoff provenance is stale`: same ledger against drifted source yields stale provenance and bundle verification fails.
- Gauntlet case `forensic_bundle_signoff_provenance`: fresh bundle verifies; source drift blocks external bundle verification.

Checks after this chunk:

- `npm test -- --run` = 63 pass.
- `npm run lint` = pass.
- `npm run build` = pass.
- `npm run gauntlet:report` = 51 cases, 0 failures.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json` = pass, `Evidence signoffs: 0 (0 stale)`.
- `npm run bundle:verify -- reports\source-gauntlet-bundle.json` = pass, `Evidence signoffs: 0 (0 stale)`.
- `npm run bundle:verify -- reports\source-gauntlet-bundle-tampered.json` = expected fail (`source graph hash mismatch`, `bundle hash mismatch`).
- `npm run case:import -- sample-records reports\sample-workspace.json reports\sample-pressure-test-report.md` = pass, 2 docs / 8 evidence.

## 2026-06-04T18:36:20-04:00 - Window 8 Chunk: Durable Source Artifact Case-Store Custody

Gap found: imported durable source artifacts were verified and included in bundles, but the live app import ledger only recorded `artifact_verified`. The artifact payload itself was not content-addressed into the append-only case store during import. That made the ledger weaker than the bundle: it could say "artifact verified" without carrying the durable source-artifact record it verified.

Implementation:

- Added `SOURCE_ARTIFACT_CASE_STORE_MEDIA_TYPE` and `serializeDurableSourceArtifactForCaseStore` in `sourceArtifacts.ts`. The serializer uses canonical JSON so the same durable source artifact has stable case-store payload bytes.
- App import now calls `putCaseArtifact` for each verified `DurableSourceArtifact`, storing the canonical artifact JSON as `application/vnd.sourcedeck.source-artifact+json` before emitting `artifact_verified`.
- `artifact_verified` ledger payloads now include `caseArtifactId` and `caseArtifactContentHash`, tying verification to the content-addressed durable artifact record.

Adversarial failure/fix:

- First unit assertion expected `artifact content hash mismatch`, but `verifyCaseArtifacts` correctly failed earlier on `artifact byte length mismatch` after tampering. Updated the test to assert the actual fail-closed guard. This is a useful calibration point: deterministic verifiers may detect a tamper earlier than the layer I expected.

Regressions:

- Unit test `stores durable source artifacts as content-addressed case artifacts`: stores a SourceStack durable artifact in the case store, checks media type/metadata/parseable payload, verifies the store, mutates the artifact payload, and confirms fail-closed verification.
- Gauntlet case `source_artifact_case_store_custody`: same content-addressed durable source-artifact custody invariant inside the Evidence Gauntlet.

Checks after this chunk:

- `npm test -- --run` = 64 pass.
- `npm run lint` = pass.
- `npm run build` = pass.
- `npm run gauntlet:report` = 52 cases, 0 failures.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json` = pass.
- `npm run bundle:verify -- reports\source-gauntlet-bundle.json` = pass.
- `npm run bundle:verify -- reports\source-gauntlet-bundle-tampered.json` = expected fail.
- `npm run case:import -- sample-records reports\sample-workspace.json reports\sample-pressure-test-report.md` = pass.

## 2026-06-04T18:54:20-04:00 - Window 8 Chunk: OCR Block Geometry Gate

Gap found: `gateOcrPageResult` already checked job id, page-image hash, page text, page confidence, and prompt injection, but accepted caller-supplied OCR blocks without validating each block's confidence, quad shape, or whether block text actually appeared in the OCR page text. Bad OCR block geometry could become false citation geometry.

Implementation:

- Added OCR block validation: confidence must be 0..1; every quad must be finite, non-negative, and positive-size; block text must be present in the page OCR text.
- Invalid blocks are rejected before a `SourceArtifactPage.geometry` object is created.

Regressions:

- Existing OCR unit test now asserts bad quads fail with `OCR block quad invalid` and block text not present in page text fails closed.
- Gauntlet `ocr_vault_job_gate` now requires wrong-media block, bad geometry block, and prompt-injection quarantine.

Checks after this chunk:

- `npm test -- --run` = 67 pass.
- `npm run lint` = pass.
- `npm run build` = pass.
- `npm run gauntlet:report` = 53 cases, 0 failures; OCR case detail now includes `bad geometry blocked`.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json` = pass.
- `npm run bundle:verify -- reports\source-gauntlet-bundle.json` = pass.
- `npm run bundle:verify -- reports\source-gauntlet-bundle-tampered.json` = expected fail.
- `npm run case:import -- sample-records reports\sample-workspace.json reports\sample-pressure-test-report.md` = pass.

## 2026-06-04T18:52:10-04:00 - Window 8 Chunk: Signed Packet Manifest Replay Inside Bundles

Closed another older verifier gap: bundles can now carry packet manifests, but a signed manifest inside the bundle also needs cryptographic signature replay. Hash-verifying the manifest is not enough if the bundle recipient expects provenance from a known signer.

Implementation:

- `SourceStackForensicBundle` now includes `packetManifestSignatureVerifications`.
- `createSourceStackForensicBundle` records signature verification results for signed packet manifests; unsigned auto-generated bundle manifests are allowed and recorded as "manifest has no cryptographic signature."
- `verifySourceStackForensicBundle` replays `verifyPacketManifestSignature` for any embedded manifest that has a signature and fails on signature mismatch/public-key mismatch.

Regressions:

- Forensic bundle unit test now builds a signed packet manifest, embeds it explicitly, verifies the bundle, then tampers the signature and confirms bundle verification fails with a signature failure.
- Gauntlet `sourcestack_forensic_bundle_tamper` now also builds a signed embedded manifest and requires the clean signature to verify and the tampered signature to fail.

Checks after this chunk:

- `npm test -- --run` = 67 pass.
- `npm run lint` = pass.
- `npm run build` = pass.
- `npm run gauntlet:report` = 53 cases, 0 failures; gauntlet detail now includes signed embedded manifest verified.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json` = pass.
- `npm run bundle:verify -- reports\source-gauntlet-bundle.json` = pass.
- `npm run bundle:verify -- reports\source-gauntlet-bundle-tampered.json` = expected fail.
- `npm run case:import -- sample-records reports\sample-workspace.json reports\sample-pressure-test-report.md` = pass.

## 2026-06-04T18:43:05-04:00 - Window 8 Chunk: Packet Manifests Inside Forensic Bundles

Closed an older logged gap: the bundle verifier proved the graph/artifact/ledger, but not the packet-manifest proof object for selected packet cards. The bundle now carries packet manifests when `packetCardIds` are provided and the hard wall passes.

Implementation:

- `SourceStackForensicBundle` now includes `packetManifests`, `packetManifestVerifications`, and `counts.packetManifests`.
- `createSourceStackForensicBundle` auto-assembles a `forensic_bundle` packet manifest from `packetCardIds` when no explicit packet manifests are passed and hard-wall failures are zero.
- `verifySourceStackForensicBundle` replays `verifyPacketManifest` for every embedded packet manifest and fails the bundle on manifest/source/hash/span-reference tamper.
- `scripts/verify-sourcestack-bundle.ts` now prints `Packet manifests: N` on pass.

Regressions:

- Existing forensic bundle unit test now asserts `packetManifests: 1`, verifies the embedded manifest directly, and confirms embedded packet-manifest tamper fails bundle verification.
- Gauntlet checks `sourcestack_forensic_bundle_tamper` and `forensic_bundle_includes_artifact_and_ledger` now require one packet manifest when `packetCardIds` are supplied.

Checks after this chunk:

- `npm test -- --run` = 67 pass.
- `npm run lint` = pass.
- `npm run build` = pass.
- `npm run gauntlet:report` = 53 cases, 0 failures.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json` = pass, `Packet manifests: 1`.
- `npm run bundle:verify -- reports\source-gauntlet-bundle.json` = pass, `Packet manifests: 0` (legacy compatibility).
- `npm run bundle:verify -- reports\source-gauntlet-bundle-tampered.json` = expected fail.
- `npm run case:import -- sample-records reports\sample-workspace.json reports\sample-pressure-test-report.md` = pass.

## 2026-06-04T18:47:15-04:00 - Window 8 Chunk: Case Artifact Verification Inside Forensic Bundles

Follow-on gap from the case-store source-artifact chunk: `verifySourceStackForensicBundle` verified the case event chain but did not verify `caseStore.artifacts` payload bytes. A bundle could include a tampered case artifact while the event log remained intact.

Implementation:

- `SourceStackForensicBundle` now includes `counts.caseArtifacts` and `caseArtifactVerification`.
- `createSourceStackForensicBundle` records `verifyCaseArtifacts(caseStore)` when a case store is present.
- `verifySourceStackForensicBundle` recomputes `verifyCaseArtifacts`, fails on mismatch, and fails on any artifact byte/hash/payload defect.

Regressions:

- Existing bundle custody unit test now stores a real source artifact as a case artifact, expects `caseArtifacts: 1`, and proves tampering the stored case artifact payload fails bundle verification.
- Gauntlet custody bundle now includes one case artifact and requires `caseArtifactVerification.ok === true`.

Checks after this chunk:

- `npm test -- --run` = 67 pass.
- `npm run lint` = pass.
- `npm run build` = pass.
- `npm run gauntlet:report` = 53 cases, 0 failures.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json` = pass.
- `npm run bundle:verify -- reports\source-gauntlet-bundle.json` = pass.
- `npm run bundle:verify -- reports\source-gauntlet-bundle-tampered.json` = expected fail.
- `npm run case:import -- sample-records reports\sample-workspace.json reports\sample-pressure-test-report.md` = pass.

Self-review corrections after the chunk:

- Legacy case-store bundles with zero case artifacts should not fail merely because `caseArtifactVerification` is absent. Adjusted verifier compatibility so the field is required only when artifacts exist; if artifacts exist and the field is absent, verification fails.
- New document writes were sanitized, but a pre-existing payload-bearing `sourcedeck.documents` localStorage value would not be cleaned until the next document update. Added document-state deserialization through the same source-vault redactor and immediate sanitized rewrite on load.
- Re-ran `npm test -- --run`, `npm run lint`, `npm run build`, `npm run gauntlet:report`, and bundle verifiers after both corrections: all pass; tampered bundle still fails.

## 2026-06-04T18:50:00-04:00 - Window 8 Chunk: Plain Workspace Export Redacts Source-Vault Payloads

Additional App export leak found: `exportPlainWorkspace` used the live in-memory `documents` array. During an active passphrase-backed import session, that array can legitimately hold payload-bearing source-vault manifests so encrypted bundle/workspace export can work. But the plain workspace JSON path should not export original source bytes/rendered page images in plaintext.

Implementation:

- `createWorkspaceSnapshot` now accepts `{ redactSourceVaultPayloads }`.
- Plain workspace export calls `createWorkspaceSnapshot({ redactSourceVaultPayloads: true })`, preserving source-vault custody hashes/record ids but removing payload bytes.
- Encrypted workspace export continues to use the full snapshot so payload-bearing private handoff remains available behind passphrase encryption.
- Plain export security event now records `includesSourceVaultPayloads: false` and `sourceVaultPayloadsRedacted: true` when vault references exist.

Checks after this chunk:

- `npm test -- --run` = 67 pass.
- `npm run lint` = pass.
- `npm run build` = pass.
- `npm run gauntlet:report` = 53 cases, 0 failures.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json` = pass.
- `npm run bundle:verify -- reports\source-gauntlet-bundle.json` = pass.
- `npm run bundle:verify -- reports\source-gauntlet-bundle-tampered.json` = expected fail.
- `npm run case:import -- sample-records reports\sample-workspace.json reports\sample-pressure-test-report.md` = pass.

## 2026-06-04T18:45:00-04:00 - Window 8 Browser/App Smoke Attempt

Because Window 8 touched `App.tsx` import/persistence/export paths, I attempted a local app smoke after the deterministic checks:

- Started Vite on `http://127.0.0.1:5175`.
- HTTP smoke succeeded: `Invoke-WebRequest` returned the Vite app shell with status 200.
- Browser automation attempt failed because the Node REPL environment initially lacked `playwright`, and the bundled runtime's `playwright` package failed to import because `playwright-core` is missing.
- Stopped the dev server afterward.

Honest status: app builds and serves the HTML shell, but full browser interaction/screenshot smoke is not verified in this window due local browser-runtime dependency failure. Do not count this as UI proof.

## 2026-06-04T18:40:30-04:00 - Window 8 Chunk: Workbench Reanchor Kernel + Backing Text Bound Signoffs

Audit catch while designing reanchor: `proofSnapshotPayload` bound document hash, page image hash/OCR state, span text, and quote, but not the actual source backing text returned by the graph. In normal app flow, document content hash changes when source text changes. But a malformed/malicious graph mutation could change page layout text without updating the document hash and leave a prior signoff current. Closed that gap directly.

Implementation:

- `proofSnapshotPayload` now includes `sourceBackingTextForSpan(span, graph)`, so backing page/transcript text drift changes the signoff proof snapshot even if another layer forgets to update the document hash.
- Added deterministic workbench operation `reanchorEvidenceCard(graph, cardId, options)`.
- Reanchorable statuses are deliberately limited to `cited`, `verified`, and `anchor_stale`. `disputed`, `withdrawn`, and `superseded` cannot be reanchored back into circulation.
- A successful reanchor returns a new span + card and always reverts the card to `cited`, because any prior human verification was made against the old source-proof snapshot.
- A failed reanchor returns the card/span in `anchor_stale` state.

Regressions:

- Unit test `marks a signoff stale when backing page text changes`: mutates page layout backing text after signoff and confirms stale detection.
- Unit test `reanchors a card from current backing text and returns it to cited`: recovers a stale verified card against current page text, updates quote/span, and verifies the result is source-backed but no longer verified.
- Unit test `refuses to reanchor disputed evidence back into circulation`: prevents adverse reviewer decisions from being hidden by reanchor.
- Gauntlet case `workbench_reanchor_binds_backing_text`: combines backing-text stale detection, successful reanchor-to-cited, and disputed-card block.

Checks after this chunk:

- `npm test -- --run` = 67 pass.
- `npm run lint` = pass.
- `npm run build` = pass.
- `npm run gauntlet:report` = 53 cases, 0 failures.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json` = pass.
- `npm run bundle:verify -- reports\source-gauntlet-bundle.json` = pass.
- `npm run bundle:verify -- reports\source-gauntlet-bundle-tampered.json` = expected fail.
- `npm run case:import -- sample-records reports\sample-workspace.json reports\sample-pressure-test-report.md` = pass.

## 2026-06-04T18:57:00-04:00 - Window 8 Chunk: Model Candidate Source-Reference Integrity

Audit while continuing the trust-spine work: the model output gate already required document/span/quote, but the next adversarial class is a plausible candidate that names a real span and exact quote while attaching a contradictory page/media reference or nonsensical confidence. That should fail before graph commit because intelligence outputs are typed proposals, not source-truth mutations.

Implementation:

- Hardened `gateCandidateEvidenceCards` so confidence must be finite and in `[0, 1]`.
- Reject model candidates whose supplied `pageId` or `mediaSegmentId` contradicts the resolved span.
- Normalize accepted cards to the resolved span's page/media anchors rather than preserving model-supplied anchor fields.

Regressions:

- Unit test now covers malformed references, fake spans, wrong page references, impossible confidence, and a positive grounded candidate that resolves to `page_a_1` and `cited`.
- Gauntlet case `model_candidate_reference_integrity` attacks wrong page references and impossible confidence against a real quote/span pair.

Checks after this chunk:

- `npm test -- --run` = 68 pass.
- `npm run gauntlet:report` = 54 cases, 0 failures.

## 2026-06-04T19:00:30-04:00 - Window 8 Chunk: Claim / Issue Theory Source-Chain Gate

Trust gap found in the synthesis layer: evidence-card packet gates were strong, but claims and issue theories could still carry stored `packetReadiness: ready` labels without a deterministic recomputation that all factual paths terminate in verified source-backed cards. Draft synthesis must remain possible, but ready synthesis must prove itself.

Implementation:

- Added `computeClaimProofPath` and `computeIssueTheoryProofPath` in `argument.ts`.
- Claim proof readiness requires a packet-usable claim state (`cited` or `verified`) and verified, source-backed supporting evidence.
- Issue theory proof readiness aggregates claim proofs and marks missing/blocked claims explicitly.
- Extended `GateFailure` with `issueTheoryId`.
- Hardened `graphInvariantFailures` so packet-ready claims and ready issue theories are recomputed against verified source-backed evidence instead of trusting stored readiness labels.

Regressions:

- Unit test `certifies claims and issue theories only through verified source-backed evidence` covers a valid source-chained theory, a suggested claim falsely marked ready, and a cited claim backed only by cited evidence.
- Gauntlet case `claim_issue_theory_source_chain_gate` attacks ready issue theories that rely on suggested claims or cited-only evidence.

Checks after this chunk:

- `npm test -- --run` = 69 pass.
- `npm run gauntlet:report` = 55 cases, 0 failures.

## 2026-06-04T19:02:30-04:00 - Window 8 Chunk: Live Mode Requires Current Human Signoff

Live retrieval already required verified cards with exact source resolution, but a live cockpit can be more dangerous than a packet because it may shape a high-stakes conversation in real time. A verified card with a stale human signoff should not be surfaced by the stricter live path even if the quote still resolves after benign-looking OCR/page-text drift.

Implementation:

- Added `selectLiveEvidenceSuggestionsWithCurrentSignoff`.
- The new async live selector first applies verified source-resolved retrieval, then requires the latest signoff for that card to be a `verify` decision to `verified`, and verifies the signoff snapshot against the current graph.
- Existing synchronous `selectLiveEvidenceSuggestions` remains available as a source-resolved scorer; the new function is the safer cockpit gate when signoff data is available.

Regressions:

- Unit test signs off `card_verified`, confirms live retrieval includes it, mutates backing page text while leaving the quote resolvable, then confirms the signoff-current selector excludes it.
- Gauntlet case `live_mode_current_signoff_required` records fresh=1 and stale=0.

Checks after this chunk:

- `npm test -- --run` = 70 pass.
- `npm run gauntlet:report` = 56 cases, 0 failures.

## 2026-06-04T19:05:00-04:00 - Window 8 Chunk: Packet Signatures Bound To Encrypted Key Custody

The previous key-custody upgrade made packet signatures real and moved persisted signing keys into passphrase-wrapped custody, but the signature itself did not bind to the custody envelope. A recipient could verify the public key signature without seeing whether the signer claimed an encrypted custody hash.

Implementation:

- Extended `PacketManifestSignature` with optional `keyCustodyHash` and `keyCustodyFormat`.
- Updated `signPacketManifestWithStoredKey` so `keyCustodyHash` is included in the ECDSA signing payload when supplied.
- Updated `verifyPacketManifestSignature` so tampering with the custody hash breaks signature verification.
- Threaded encrypted key custody hashes through App packet manifest export, including `signing_key_wrapped` and `packet_exported` ledger payloads.

Regressions:

- Unit test for wrapped signing keys now signs with the encrypted custody hash and proves tampering only `keyCustodyHash` causes `packet manifest signature mismatch`.
- Gauntlet case `encrypted_signing_key_custody` now verifies wrapped-key recoverability, custody-hash-bound manifest signature, custody-hash tamper failure, and wrong-passphrase failure.

Checks after this chunk:

- `npm test -- --run` = 70 pass.
- `npm run gauntlet:report` = 56 cases, 0 failures.

## 2026-06-04T19:07:00-04:00 - Window 8 Chunk: Forensic Bundle Verification Metadata Recomputed

Bundle verification recomputed artifacts, vaults, packet manifests, and signatures, but did not compare the stored verification arrays back to the recomputed values. That left room for decorative/stale verification metadata if someone recomputed the outer bundle hash after altering those arrays.

Implementation:

- Added bundle verifier comparisons for recorded vs recomputed source artifact, source vault, packet manifest, and packet manifest signature verification arrays.
- Preserved legacy zero-array compatibility by treating missing arrays as empty only when the recomputed set is empty.

Regressions:

- Extended the forensic custody bundle unit test to forge `sourceArtifactVerifications[0].artifactId` and require `source artifact verification mismatch`.
- Extended gauntlet case `forensic_bundle_includes_artifact_and_ledger` so it forges source-artifact verification metadata and expects the bundle verifier to block it.

Checks after this chunk:

- `npm test -- --run` = 70 pass.
- `npm run gauntlet:report` = 56 cases, 0 failures.

## 2026-06-04T19:09:30-04:00 - Window 8 Chunk: Bitemporal Contradictions Classified From Source Spans

Trust gap found: `detectBitemporalContradictions` checked that an event referenced an existing span, but classified positive/negative polarity from the event description. That let a hostile or hallucinated event description create contradiction logic even when the source span did not carry that polarity.

Implementation:

- Added `bitemporalEventSourceUsable` requiring the event span to terminate at a source, be backed by source text/media, and have a usable anchor.
- Added `classifyBitemporalEventPolarityFromSource`.
- Contradiction detection now buckets only events whose usable source span carries known polarity.
- If the event description itself has known polarity and conflicts with the source-span polarity, the event is treated as `unknown` and excluded.

Failure and fix:

- First unit run failed because a fake "provided" event attached to the negative source span was reclassified as a negative event. That was still too permissive: hostile extraction metadata should not silently mutate into an opposite fact.
- Fixed by rejecting source/description polarity conflicts instead of reclassifying them.

Regressions:

- Unit test now creates a real positive source span, a real negative source span, an unsourced event, and a description-only fake positive event attached to the negative span. Only the real source-span-classified positive/negative pair forms the contradiction.
- Gauntlet bitemporal case now uses source-span-classified contradiction detection and rejects the description-only fake positive event.

Checks after this chunk:

- Initial `npm test -- --run` = failed 1 test; `npm run gauntlet:report` still passed.
- After fix: `npm test -- --run` = 70 pass.
- After fix: `npm run gauntlet:report` = 56 cases, 0 failures.

## 2026-06-04T19:11:10-04:00 - Window 8 Chunk: Card Anchor Reference Integrity In Kernel

Trust gap found: model candidates rejected mismatched page/media references, but the core resolver still allowed a card to carry a contradictory `pageId` or `mediaSegmentId` as long as the referenced span resolved. Manual/imported cards could therefore show one display anchor while packet manifests silently used the span's different anchor.

Implementation:

- `resolveEvidenceCardSource` now fails when `card.pageId` disagrees with the resolved span's `pageId`.
- `resolveEvidenceCardSource` now fails when `card.mediaSegmentId` disagrees with the resolved span's `mediaSegmentId`.

Failure and fix:

- First test/gauntlet run failed because the earlier model-candidate regression expected the model-gate-specific reason. The new kernel correctly caught the mismatch first with `card page and span page disagree`.
- Updated unit and gauntlet expectations to the stronger kernel-level failure.

Regressions:

- Unit test `blocks cards whose display anchor disagrees with the resolved source span` proves a verified card with a real quote/span but wrong page is blocked by packet assembly, status transition, and graph invariants.
- Gauntlet case `card_anchor_reference_integrity` covers the same wrong-page manual/imported-card path.

Checks after this chunk:

- Initial `npm test -- --run` = failed 2 tests due changed expected reason and gauntlet failure.
- Initial `npm run gauntlet:report` = failed 1 case for the same expected-reason mismatch.
- After expectation fix: `npm test -- --run` = 71 pass.
- After expectation fix: `npm run gauntlet:report` = 57 cases, 0 failures.

## 2026-06-04T19:13:15-04:00 - Window 8 Chunk: Verification Dossier Inspection Target

Workbench gap found: `buildVerificationDossier` gave reviewers a diagnostic, legal actions, and proof hash, but not a structured inspection target containing the exact source artifact/page/media state they must inspect before promotion.

Implementation:

- Added `VerificationInspectionTarget` to `workbench.ts`.
- Dossiers now include document id/title/content hash, source-vault hashes/status when present, page index/image hash/OCR quality, media segment metadata, span id/char range/quads, exact quote, span text, backing-text preview, and resolver booleans.
- Missing/unresolved cards still produce a dossier without an inspection target and with fail-closed actions.

Regressions:

- Unit dossier/signoff test now asserts the cited card dossier includes `doc_a`, `sha256:fixture-a`, `page_a_1`, `sha256:page-a`, `span_a_1`, exact quote, quad points, and backing preview.
- Gauntlet case `verification_dossier_inspection_target` verifies the dossier inspection target for the promotable cited fixture.

Checks after this chunk:

- `npm test -- --run` = 71 pass.
- `npm run gauntlet:report` = 58 cases, 0 failures.

## 2026-06-04T19:16:55-04:00 - Window 8 Chunk: Page Span Char-Range Backing

Trust gap found: the resolver proved that span text appeared somewhere in page backing text, but did not prove the stored `charRange` pointed at that text. A stale range could survive if the text still existed elsewhere on the page.

Implementation:

- Added `sourceSpanCharRangeMatchesBacking` and folded it into `sourceSpanBackedBySource` for page spans with backing text.
- Corrected the main gauntlet fixture char range from `[0, 92]` to `[0, 83]`.
- Updated legacy-bridge and durable-artifact page construction so pages with geometry snippets also include a full-page text block first. Char ranges are page-text anchors; geometry blocks are highlight/quad evidence.

Failure and fix:

- First run failed 2 unit tests. One test fixture used an approximate `[0, 44]` range for a 45-character text. The other exposed a deeper model issue: pages built from geometry snippets lacked the full-page text that their char ranges were relative to.
- Fixed the fixture range and added full-page text blocks ahead of geometry blocks in both legacy and durable artifact graph builders.

Regressions:

- Unit test `blocks page spans whose char range no longer points at the span text` proves an in-bounds stale range fails the packet hard wall and graph invariants even when the exact text exists on the page.
- Gauntlet case `stale_char_range_anchor` covers the same stale-range attack.

Checks after this chunk:

- Initial `npm test -- --run` = failed 2 tests; `npm run gauntlet:report` = 59 cases, 0 failures.
- After fix: `npm test -- --run` = 72 pass.
- After fix: `npm run gauntlet:report` = 59 cases, 0 failures.

## 2026-06-04T19:18:50-04:00 - Window 8 Chunk: Redacted Export Hard Wall + Vault Alias Checks

Export gap found: redacted packet export redacted whatever `buildPacketMarkdown()` returned. If selected packet cards failed the hard wall, that function returned a hard-wall report, but the redacted export path still treated the operation as a redacted packet export and allowed all selected quotes as source-disclosure exceptions.

Custody gap found: source-vault verification caught duplicate page indexes, but not duplicate record IDs or duplicate page IDs inside a manifest.

Implementation:

- `exportRedactedPacket` now runs `getPacketExportSet(packetEvidence)` first and exports a hard-wall report instead of a redacted packet when selected evidence is blocked.
- Redacted export now passes only exportable verified-card quotes into `allowedQuotes`.
- `verifySourceVaultManifest` now rejects duplicate source-vault record IDs and duplicate rendered page image IDs.

Regressions:

- Unit source-vault custody test now covers duplicate record-id and duplicate page-id aliasing.
- Gauntlet source-vault custody case now includes payload tamper, missing store record, duplicate record ID, and duplicate page ID.

Checks after this chunk:

- `npm test -- --run` = 72 pass.
- `npm run gauntlet:report` = 59 cases, 0 failures.

## 2026-06-04T19:20:25-04:00 - Window 8 Chunk: Duplicate Card Packet Hard Wall

Packet gap found: packet assembly accepted duplicate card IDs. That does not fabricate a source, but it can distort packet counts, proof paths, and downstream review of what factual evidence actually left the system.

Implementation:

- `packetHardWallFailures` now rejects duplicate selected card IDs with `packet hard wall: selected card is duplicated`.

Regressions:

- Unit test `blocks duplicate card ids in packet assembly`.
- Gauntlet case `duplicate_card_packet_attempt`.

Checks after this chunk:

- `npm test -- --run` = 73 pass.
- `npm run gauntlet:report` = 60 cases, 0 failures.

## 2026-06-04T19:21:55-04:00 - Window 8 Chunk: Case Ledger Duplicate Event IDs

Ledger gap found: `verifyCaseEventLog` checked hash continuity and head hash, but did not reject duplicate event IDs. Two events could be appended with the same id and still form a valid hash chain.

Implementation:

- `verifyCaseEventLog` now rejects duplicate case event IDs with `duplicate case event id`.

Regressions:

- Unit test appends two valid hash-chained events with the same ID and expects duplicate-id rejection.
- Gauntlet case `append_only_quarantine_verification_audit` now checks both deletion/previous-hash mismatch and duplicate event ID rejection.

Checks after this chunk:

- `npm test -- --run` = 74 pass.
- `npm run gauntlet:report` = 60 cases, 0 failures.

## 2026-06-04T19:24:50-04:00 - Window 8 Chunk: Durable Artifact Page Identity

Artifact gap found: durable source-artifact verification checked page/document/hash/geometry consistency, but did not explicitly reject duplicate page IDs or duplicate page indexes. A malicious artifact could alias one page identity across multiple page records or split one page number across IDs.

Implementation:

- `verifySourceArtifact` now rejects invalid page indexes, duplicate artifact page IDs, duplicate artifact page indexes, and non-positive page geometry dimensions.
- The existing durable artifact gauntlet case now attacks duplicate page ID and duplicate page index aliasing alongside out-of-bounds quad geometry.

Regressions:

- Unit durable-artifact test asserts duplicate page ID fails with `duplicate artifact page id`.
- Unit durable-artifact test asserts duplicate page index fails with `duplicate artifact page index`.
- Gauntlet case `durable_source_artifact_geometry` requires both duplicate identity failures plus geometry failure.

Checks after this chunk:

- `npm test -- --run` = 74 pass.
- `npm run gauntlet:report` = 60 cases, 0 failures.

## 2026-06-04T19:27:03-04:00 - Window 8 Chunk: Geometry Block Identity Gates

Artifact/OCR gap found: page geometry validation checked coordinates and hashes, but did not explicitly reject duplicate geometry block IDs. A hostile OCR result or durable artifact could reuse a block ID, or collide with the generated full-page text backing block, leaving reviewer inspection targets ambiguous.

Implementation:

- `verifySourceArtifact` now rejects duplicate artifact block IDs, block IDs colliding with `${page.id}:full_text`, missing block IDs, empty quad lists, non-finite OCR quality, non-finite block confidence, and non-finite/non-positive geometry dimensions.
- `gateOcrPageResult` now rejects duplicate OCR block IDs, collisions with `${job.pageId}:full_text`, missing block IDs, and non-finite confidence before admitting OCR geometry.

Regressions:

- Durable artifact unit coverage checks duplicate block IDs, generated full-text block collisions, and empty quad lists.
- OCR unit coverage checks duplicate OCR block IDs and generated full-text block collisions.
- Gauntlet case `durable_source_artifact_geometry` now requires artifact block duplicate/full-text collision rejection.
- Gauntlet case `ocr_vault_job_gate` now requires OCR duplicate/reserved block rejection.

Checks after this chunk:

- `npm test -- --run` = 74 pass.
- `npm run gauntlet:report` = 60 cases, 0 failures.

## 2026-06-04T19:29:29-04:00 - Window 8 Chunk: Synthesis Duplicate Reference Gates

Synthesis gap found: claim and issue-theory proof computation treated duplicate card/claim references as ordinary repeated entries, while graph invariants did not challenge duplicate support IDs or forged `strongestPath` entries. A ready theory could inflate apparent proof strength by repetition or display a strongest-path card outside its valid source chain.

Implementation:

- `computeIssueProofPath` now blocks duplicate evidence card references instead of counting the same card twice.
- `computeIssueTheoryProofPath` deduplicates claim proof computation while reporting duplicate issue-theory claim references as not-ready.
- `graphInvariantFailures` now flags packet-ready claims that repeat supporting cards.
- `graphInvariantFailures` now flags ready issue theories with repeated claim IDs, empty strongest paths, repeated strongest-path card IDs, missing strongest-path cards, or strongest-path cards that fail the packet hard wall.

Regressions:

- Unit test `blocks duplicate synthesis references and forged strongest paths`.
- Gauntlet case `claim_issue_theory_source_chain_gate` now attacks duplicate support, duplicate claim references, duplicate strongest-path cards, and missing strongest-path cards in addition to suggested/unverified synthesis.

Checks after this chunk:

- `npm test -- --run` = 75 pass.
- `npm run gauntlet:report` = 60 cases, 0 failures.

## 2026-06-04T19:32:04-04:00 - Window 8 Chunk: Source Vault Canonical Record Custody

Custody gap found: source-vault verification checked content hashes and some duplicate IDs, but did not force record IDs to their canonical content-derived shape. Storage verification also accepted a stored record with the right content hash but changed metadata, meaning bytes could match while record meaning drifted.

Implementation:

- Non-page source-vault blob records must now use canonical `source-vault:{kind}:{contentHash}` record IDs.
- Rendered page image records must now use canonical `source-vault:rendered_page_image:{documentId}:page:{pageIndex}:{contentHash}` record IDs.
- Page image width/height/render scale now require finite positive numbers.
- `verifySourceVaultManifestStorage` now compares full stored record metadata against the manifest record after content-hash verification.

Failure and fix:

- Initial `npm test -- --run` failed the source-vault custody test and the gauntlet because the duplicate-page attack fixture used a non-canonical `:duplicate` record ID. The new record-ID gate correctly caught that first.
- Fixed the fixture by creating a canonical page-2 record ID while reusing page 1's page ID, so duplicate page aliasing remains explicitly tested under stricter custody rules.

Regressions:

- Unit source-vault test now covers stored metadata mismatch, original record ID mismatch, page image record ID mismatch, duplicate record ID, and duplicate rendered page ID.
- Gauntlet case `source_vault_original_and_page_media_custody` now attacks missing storage, metadata substitution, payload tamper, original record ID tamper, page record ID tamper, duplicate record IDs, and duplicate page IDs.

Checks after this chunk:

- Initial `npm test -- --run` = failed 2 tests due fixture expectation/layering.
- Initial `npm run gauntlet:report` = failed 1 case for the same fixture layering.
- After fix: `npm test -- --run` = 75 pass.
- After fix: `npm run gauntlet:report` = 60 cases, 0 failures.

## 2026-06-04T19:34:50-04:00 - Window 8 Chunk: Forensic Bundle Graph Attachment

Bundle gap found: forensic bundle verification replayed source artifact, source vault, packet manifest, case-store, and signoff checks, but source artifacts/vault manifests could still be detached from the graph. Conversely, graph documents could claim source artifact/vault custody metadata without the bundle including those custody objects.

Implementation:

- Bundle verification now rejects duplicate source artifact IDs and duplicate source artifact document IDs.
- Bundled source artifacts must have matching graph documents, matching document content hashes, and matching `metadata.sourceArtifactId`.
- Bundle verification now rejects duplicate source vault IDs/document IDs.
- Bundled source vault manifests must have matching graph documents, matching `metadata.sourceVaultId`, matching manifest hashes, and matching original content hashes.
- Graph documents that claim `sourceArtifactId` or `sourceVaultId` must have those custody objects included in the bundle.

Regressions:

- Bundle custody unit fixture now represents the bundled artifact in the source graph.
- Unit coverage now attacks detached artifact graph documents, graph documents that claim missing bundled artifacts, and graph source-vault metadata hash drift.
- Gauntlet case `forensic_bundle_includes_artifact_and_ledger` now requires detached-graph and missing-artifact attacks to fail closed.

Checks after this chunk:

- `npm test -- --run` = 75 pass.
- `npm run gauntlet:report` = 60 cases, 0 failures.

## 2026-06-04T19:35:30-04:00 - Window 8 Checkpoint: Static and Production Build

Checks after the artifact identity, synthesis duplicate-reference, source-vault custody, and bundle-attachment changes:

- `npm run lint` = pass.
- `npm run build` = pass.

## 2026-06-04T19:37:51-04:00 - Window 8 Chunk: Model Candidate Destination Hard Wall

Model-gate gap found: `gateCandidateEvidenceCards` resolved model candidates to source spans, but a `verified_only_destination` / `packet` contract could still return accepted model-generated cards as `suggested`. That violates the SourceDeck boundary: AI may propose and organize, but only verified evidence can leave through packet destinations.

Implementation:

- `gateCandidateEvidenceCards` now rejects duplicate candidate IDs before graph commit.
- `gateCandidateEvidenceCards` now rejects candidates for contracts with `verificationPolicy: verified_only_destination` or `destinationPolicy: packet`, even when the quote resolves to a real source span.

Regressions:

- Unit test `blocks duplicate model candidate ids and verified-only packet destinations`.
- Gauntlet case `model_candidate_reference_integrity` now requires duplicate candidate ID rejection and verified-only packet-destination rejection in addition to wrong-page and impossible-confidence failures.

Checks after this chunk:

- `npm test -- --run` = 76 pass.
- `npm run gauntlet:report` = 60 cases, 0 failures.

## 2026-06-04T19:39:13-04:00 - Window 8 Chunk: Live Retrieval Option Bounds

Live-mode gap found: live retrieval trusted runtime `limit` and `minScore` values. Malformed UI/control values such as `NaN`, `Infinity`, or negative numbers could produce surprising result windows.

Implementation:

- `selectLiveEvidenceSuggestions` now bounds non-finite limits to the safe default, clamps negative limits to zero, and clamps min scores to `[0, 1]` with non-finite scores falling back to the safe default.
- Live retrieval sorting now breaks score ties deterministically by card ID.

Regressions:

- Unit live retrieval test covers malformed `limit`/`minScore` values and negative limits.
- Gauntlet case `live_mode_verified_only` now requires malformed options not to widen exposure and negative limits to return no suggestions.

Checks after this chunk:

- `npm test -- --run` = 76 pass.
- `npm run gauntlet:report` = 60 cases, 0 failures.

## 2026-06-04T19:41:05-04:00 - Window 8 Chunk: Case Event Semantic Gates

Audit gap found: the case ledger verified hash-chain continuity and duplicate IDs, but critical events could be semantically nonsensical and still hash-chain cleanly. Example: an `import_quarantined` event could claim `autoSuggestEvidence: true`.

Implementation:

- `verifyCaseEventLog` now validates minimal event semantics for critical event types:
  - `import_quarantined` must disable auto-suggest or carry quarantined import trust.
  - `evidence_verified` must transition to `verified`.
  - `source_vault_verified` must include document ID, manifest hash, and original content hash.
  - `artifact_verified` must include content hash.
  - `signing_key_wrapped` must record encrypted custody.
  - `packet_exported` must include manifest hash.
  - `bundle_exported` must include bundle hash and graph hash.
  - `redaction_applied` must record zero unresolved source leaks.
- All events also require non-empty ID, actor, target, and a valid timestamp.

Regressions:

- Unit test rejects a hash-chained quarantine event that still permits auto-suggest.
- Gauntlet case `append_only_quarantine_verification_audit` now attacks semantic quarantine failure in addition to event deletion and duplicate event IDs.

Checks after this chunk:

- `npm test -- --run` = 77 pass.
- `npm run gauntlet:report` = 60 cases, 0 failures.

## 2026-06-04T19:42:18-04:00 - Window 8 Chunk: Canonical Durable Artifact IDs

Artifact custody gap found: durable source artifact verification checked payload and content hash, but did not require the artifact ID or page IDs to match their canonical content/document/page identities.

Implementation:

- `verifySourceArtifact` now requires `artifact.artifactId === source-artifact:{artifact.contentHash}`.
- `verifySourceArtifact` now requires `page.id === {artifact.documentId}:page:{page.index}`.

Regressions:

- Unit durable-artifact test now rejects artifact ID drift and page ID drift while bytes/hashes remain intact.
- Gauntlet case `durable_source_artifact_geometry` now includes source artifact ID mismatch and artifact page ID mismatch attacks.

Checks after this chunk:

- `npm test -- --run` = 77 pass.
- `npm run gauntlet:report` = 60 cases, 0 failures.

## 2026-06-04T19:44:18-04:00 - Window 8 Chunk: Packet Manifest Page Layout Hashes

Packet proof gap found: packet manifests carried document hashes, optional page image hashes, and span references, but text-only page anchors were not independently bound to the page layout/text state used during packet assembly. A later page-layout drift could still leave the quote resolvable while changing the proof surface.

Implementation:

- Packet manifest `pageHashes` now include `layoutHash` and `ocrQuality` for each cited page.
- Packet proof construction now content-addresses the page layout block IDs/kinds/text/confidence values.
- `assembleEvidencePacket` and `verifyPacketManifest` now recompute page layout hashes asynchronously.

Regressions:

- Unit packet-manifest tamper test now appends a later OCR/footer line after packet export and expects `page hashes mismatch`.
- Gauntlet case `hash_manifest_verification` now verifies the clean manifest and then attacks page-layout drift.

Checks after this chunk:

- `npm test -- --run` = 77 pass.
- `npm run gauntlet:report` = 60 cases, 0 failures.

## 2026-06-04T19:44:56-04:00 - Window 8 Checkpoint: Static and Production Build

Checks after the async packet proof/page-layout manifest changes and case-event semantic gates:

- `npm run lint` = pass.
- `npm run build` = pass.

## 2026-06-04T19:46:35-04:00 - Window 8 Chunk: Evidence Signoff Semantic Gates

Workbench gap found: evidence signoff verification replayed the proof snapshot hash, but did not reject malformed signoff metadata such as invalid timestamps or a `verify` decision paired with a non-verified target status.

Implementation:

- `signOffEvidenceVerification` now rejects invalid timestamps.
- `verifyEvidenceSignoff` now rejects missing reviewers, invalid timestamps, and decision/target-status disagreement before replaying the proof snapshot.

Regressions:

- Unit workbench test rejects bad signoff timestamps and tampered decision/target status.
- Gauntlet case `workbench_signoff_fail_closed_and_stale` now requires invalid/tampered signoffs to be blocked in addition to stale-anchor and stale-source-proof checks.

Checks after this chunk:

- `npm test -- --run` = 77 pass.
- `npm run gauntlet:report` = 60 cases, 0 failures.

## 2026-06-04T19:48:05-04:00 - Window 8 Chunk: Case Artifact Canonical Identity

Case-store gap found: `verifyCaseArtifacts` checked payload byte length and content hash, but did not require the artifact map key or artifact ID to match the content-addressed identity.

Implementation:

- `verifyCaseArtifacts` now rejects artifacts whose store key differs from `artifact.id`.
- `verifyCaseArtifacts` now rejects artifact IDs that do not equal `artifact:{contentHash}` after payload hash verification.

Regressions:

- Unit case-store artifact test now rejects store-key aliases and non-canonical artifact IDs.
- Gauntlet case `source_artifact_case_store_custody` now attacks key aliasing, ID aliasing, and payload tamper.

Checks after this chunk:

- `npm test -- --run` = 77 pass.
- `npm run gauntlet:report` = 60 cases, 0 failures.

## 2026-06-04T19:49:21-04:00 - Window 8 Chunk: Packet Signature Fail-Closed Verification

Signature gap found: packet manifest signature verification did not validate `signedAt`, and malformed crypto/base64/key material could throw instead of returning a typed verification failure.

Implementation:

- `verifyPacketManifestSignature` now rejects invalid signature timestamps.
- Signature verification now catches malformed key/signature verification errors and returns `packet manifest signature verification failed`.

Regressions:

- Unit signature test rejects invalid `signedAt` and malformed signature material.
- Gauntlet case `cryptographic_manifest_signature` now requires timestamp and malformed-signature attacks to fail closed.

Checks after this chunk:

- `npm test -- --run` = 77 pass.
- `npm run gauntlet:report` = 60 cases, 0 failures.

## 2026-06-04T19:51:10-04:00 - Window 8 Chunk: Case Event Timestamp Monotonicity

Audit gap found: case event logs validated timestamp shape and hash-chain continuity, but did not reject a self-consistent hash chain whose substantive events moved backwards in time.

Implementation:

- `verifyCaseEventLog` now rejects non-`case_created` events whose timestamp is earlier than the previous substantive event.
- The synthetic `case_created` timestamp is excluded from this monotonic comparison so historical fixture replay remains valid.

Regressions:

- Unit case-store test rejects a hash-chained backwards substantive event.
- Gauntlet case `append_only_quarantine_verification_audit` now includes backwards timestamp detection.

Checks after this chunk:

- `npm test -- --run` = 78 pass.
- `npm run gauntlet:report` = 60 cases, 0 failures.

## 2026-06-04T19:52:43-04:00 - Window 8 Final Sweep: Generated Bundle Integration Fix

Final verification gap found: the stronger bundle verifier was correct, but `scripts/run-source-gauntlet.ts` still generated a custody bundle using the plain gauntlet graph. The generated source artifact/vault were detached from the graph, and the generated `source_vault_verified` event omitted `documentId`, violating new audit-event semantics.

Implementation:

- `scripts/run-source-gauntlet.ts` now imports `buildSourceGraphFromArtifacts`.
- The generated custody bundle graph now merges the custody artifact's graph documents/pages with the gauntlet fixture graph.
- The generated `source_vault_verified` case event now includes `documentId`.

Failure and fix:

- Initial final sweep: `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json` failed with detached graph document/vault and missing `documentId`.
- After generator fix and report regeneration: bundle verification passed.

Checks:

- `git diff --check` = pass, with Git CRLF warnings only.
- `npm test -- --run` = 78 pass.
- `npm run lint` = pass.
- `npm run build` = pass.
- `npm run gauntlet:report` = pass, 60 cases, 0 failures.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json` = pass.
- `npm run case:import -- sample-records reports\sample-workspace.json reports\sample-pressure-test-report.md` = pass.
- `npm run calibration:validate -- --allow-open-latest` = pass.

## 2026-06-04T19:56:35-04:00 - Window 8 Chunk: Evidence Promotion Certificate

Workbench gap found: a signoff proved the source-proof snapshot, but the system did not yet emit a first-class certificate binding the exact inspection target the human saw. That left a future UI/export layer room to claim "reviewer verified" while swapping the page, quad, backing preview, or quote shown during promotion.

Implementation:

- Added `EvidencePromotionCertificate` as a deterministic workbench artifact.
- Added `inspectionTargetHash`, `promoteEvidenceWithCertificate`, and `verifyEvidencePromotionCertificate`.
- Promotion certificates now bind reviewer, timestamp, signoff, proof snapshot, and the exact dossier inspection target.
- Verification fails closed if the certificate/signoff disagree, the recorded inspection target hash is tampered, the signoff is stale, or the current inspection target no longer matches the one promoted.

Regressions:

- Unit workbench test now certifies a promotion, verifies it, tampers the recorded inspected quote, and changes the page image hash after promotion.
- Gauntlet case `workbench_promotion_certificate_binds_inspection` proves clean certificate verification, inspection-target tamper rejection, and stale detection after source/page proof drift.

Checks after this chunk:

- `npm test -- --run` = 78 pass.
- `npm run gauntlet:report` = 61 cases, 0 failures.

## 2026-06-04T19:58:45-04:00 - Window 8 Chunk: Promotion Ledger Semantics

Audit gap found: the new promotion certificate was replayable, but there was not yet a first-class append-only ledger event that carried the same proof and inspection-target bindings. A weak `evidence_verified` event can say "to verified"; it does not prove what the reviewer inspected.

Implementation:

- Added `evidence_promoted` to the case-store event vocabulary.
- `verifyCaseEventLog` now semantically rejects promotion events unless they target `verified`, use decision `verify`, and carry `proofSnapshotHash`, `inspectionTargetHash`, `documentId`, and `spanId`.
- Added `promotionCertificateToRecordedEvent` in the workbench core.
- `buildSignoffReviewQueue` now reconstructs signoffs from both `evidence_signed_off` and `evidence_promoted` events, so promotion events also power stale-signoff queues.

Regressions:

- Unit workbench test now records a promotion event into a case store, verifies the ledger, feeds the event into the signoff review queue, and rejects an event missing the inspection-target hash.
- Gauntlet case `workbench_promotion_certificate_binds_inspection` now also proves the promotion ledger event is accepted and its semantic tamper is blocked.

Checks after this chunk:

- `npm test -- --run` = 78 pass.
- `npm run gauntlet:report` = 61 cases, 0 failures.

## 2026-06-04T20:01:10-04:00 - Window 8 Chunk: Promotion Provenance in Forensic Bundles

Bundle gap found: promotion events fed the signoff review queue, but the forensic-bundle regressions only proved plain `evidence_signed_off` provenance. The offline bundle verifier is the handoff/audit surface, so promotion provenance needed explicit replay coverage there too.

Implementation:

- Added a unit test that records an `evidence_promoted` event derived from a promotion certificate into a case store, bundles it, verifies the bundle externally, then mutates the page image hash and requires stale-provenance failure.
- Extended the gauntlet `forensic_bundle_signoff_provenance` case so both plain signoff events and promotion events must verify fresh and fail stale.

Regressions:

- Unit count increased to 79.
- Gauntlet still has 61 cases, with the bundle provenance case now covering both signoff and promotion-event paths.

Checks after this chunk:

- `npm test -- --run` = 79 pass.
- `npm run gauntlet:report` = 61 cases, 0 failures.

## 2026-06-04T20:02:30-04:00 - Window 8 Chunk: Audit Event Hash Shape Validation

Ledger gap found: signoff and promotion audit events required proof/inspection hash fields, but accepted any non-empty string. A fake `sha256:short` identifier could be hash-chained into the ledger even though it was not a real content address.

Implementation:

- Added case-store `payloadContentAddress` validation for `sha256:<64 hex>` values.
- `evidence_signed_off` now requires a real proof snapshot hash.
- `evidence_promoted` now requires real proof snapshot and inspection-target hashes.

Regressions:

- Unit hostile signoff/promotion fixtures now use `sha256:short` and must fail with missing-or-invalid hash diagnostics.
- Gauntlet `append_only_quarantine_verification_audit` now reports `evidence signoff event missing or invalid proof hash`.

Checks after this chunk:

- `npm test -- --run` = 79 pass.
- `npm run gauntlet:report` = 61 cases, 0 failures.

## 2026-06-04T20:04:19-04:00 - Window 8 Chunk: App Promotion Path Uses Certificates

Transition-layer gap found: the SourceStack core had certificate-backed evidence promotion, but the app's Verify button still called the older plain signoff path and recorded an `evidence_signed_off` event. That meant the real user path could bypass the stronger inspection-target binding.

Implementation:

- `verifyEvidenceCard` in `App.tsx` now calls `promoteEvidenceWithCertificate`.
- The UI now records `evidence_promoted` via `promotionCertificateToRecordedEvent`.
- `recordTrustEvent` accepts an optional `at` timestamp so the ledger event can match the certificate's signed time.
- Selected-card signoff state now considers both `evidence_signed_off` and `evidence_promoted`.
- Dispute signoff events now also preserve `result.signoff.at` instead of restamping the ledger event.

Checks after this chunk:

- `npm test -- --run` = 79 pass.
- `npm run lint` = pass, including the follow-up dispute timestamp patch.
- `npm run build` = pass, including the follow-up dispute timestamp patch.

## 2026-06-04T20:07:36-04:00 - Window 8 Chunk: Workbench Mutation Event Semantics

Ledger gap found: verification/promotion events were semantically gated, but workbench mutation events (`split`, `merge`, `edit`, `reanchor`) could still be arbitrary hash-chained payloads. These events affect source-backed evidence state and should fail closed when their payloads do not explain what changed.

Implementation:

- Added semantic validation for `evidence_split`, `evidence_merged`, `evidence_edited`, and `evidence_reanchored`.
- Split events must include parent ID, child IDs, and matching sub-quotes.
- Merge events must include survivor ID and merged IDs.
- Edit events must include a non-empty replacement quote.
- Reanchor events must include either a result or transition, and any score must be finite.

Regressions:

- Added a unit test covering invalid split, merge, edit, and reanchor events.
- Extended the append-only audit gauntlet to reject a malformed split event.

Checks after this chunk:

- `npm test -- --run` = 80 pass.
- `npm run gauntlet:report` = 61 cases, 0 failures.
- `npm run lint` = pass.

## 2026-06-04T20:19:31-04:00 - Window 8 Final Verification and Closeout

Final verification after the last implementation chunk:

- `git diff --check` = pass, with Git CRLF warnings only.
- `npm test -- --run` = 80 pass.
- `npm run lint` = pass.
- `npm run build` = pass.
- `npm run gauntlet:report` = 61 cases, 0 failures.
- `npm run bundle:verify -- reports\source-gauntlet-custody-bundle.json` = pass.
- `npm run case:import -- sample-records reports\sample-workspace.json reports\sample-pressure-test-report.md` = pass.
- `npm run calibration:validate -- --allow-open-latest` = pass before close.

Closeout failure and fix:

- Initial closed calibration validation failed because the latest entry still contained unresolved placeholder text in earlier structured fields and quoted notes about prior semantic placeholders.
- Fixed the missing actual end/elapsed fields, final work summary, ambition/autonomy log, and reworded forbidden placeholder mentions.
- `npm run calibration:validate` after close = pass, 6 entries.

Window 8 elapsed time:

- Start: `2026-06-04T18:19:04.4635762-04:00`.
- End: `2026-06-04T20:19:31.0150686-04:00`.
- Actual elapsed: 120.44 minutes.

## 2026-06-07T14:12:34-04:00 - Window 9 Chunk: Command Search and Speech Surface

Goal: make SourceDeck immediately more usable by adding the first real record-query surface instead of continuing only in the trust kernel.

Implementation:

- Added a dedicated `Search` side tab while renaming the original command dashboard to `Case`.
- Replaced shallow substring filtering with a command retrieval model:
  - exact lane for phrase/source text matches
  - smart fuzzy lane using token, partial, and edit-distance matching
  - top/middle/far tiers
  - grouped source tree by document and page/excerpt
- Added result actions: copy excerpt, open source record, promote to cited evidence, and jump to verification.
- Added first-class speech input paths:
  - native browser dictation when available
  - local GPT transcription sidecar fallback endpoint at `127.0.0.1:4317/transcribe`
  - new `npm run speech:sidecar` script
- Added `scripts/speech-transcription-sidecar.mjs`, which posts recorded `webm` audio to OpenAI's `/v1/audio/transcriptions` endpoint using `OPENAI_TRANSCRIBE_MODEL` or `gpt-4o-transcribe`.

Failure and fix:

- `npm run lint` initially failed because the action function `useSearchHitAsEvidence` looked like a React hook inside callbacks.
- Renamed it to `promoteSearchHitAsEvidence`; lint passed.

Checks after this chunk:

- `npm test -- --run` = 80 pass.
- `npm run build` = pass.
- `npm run lint` = pass after rename.

Calibration note:

- The UI/search/speech first cut compressed to about 8 minutes from the start checkpoint to green lint/build/test. The hidden assumption that UI work would be slow was wrong because the app already had a command panel, evidence actions, and voice scaffolding; the work was replacement and integration, not a blank surface.

## 2026-06-07T14:14:52-04:00 - Window 9 Chunk: Tested Retrieval Core

Gap found: the Search tab was backed by real ranking code, but it lived inside `App.tsx` and had no focused regression coverage. That made the smart lane too easy to degrade into shallow substring search.

Implementation:

- Added `src/sourcestack/retrieval.ts`.
- Extracted normalization, tokenization, bounded edit distance, source scoring, tier classification, snippets, and exact source excerpts.
- Rewired `App.tsx` to import SourceStack retrieval helpers.
- Added a unit regression proving:
  - exact-ish source queries tier correctly
  - one/two-word drift still matches
  - unrelated text gets no tier
  - promoted excerpts remain substrings of source text

Checks after this chunk:

- `npm test -- --run` = 81 pass.
- `npm run lint` = pass.
- `npm run build` = pass.

Calibration note:

- Extracting and testing the ranking core added about two minutes. Again, the existing test harness made the "hard" part cheap; the real risk was leaving search untested because it looked like UI-only work.

## 2026-06-07T14:21:12-04:00 - Window 9 Chunk: Command Filters and Case Folder Intake

Goal: make the search box behave like a real record query surface and bind it to the user's near-term vendor-contract workflow.

Implementation:

- Found the local case folder at `C:\Example Case Folder`.
- Added deterministic command parsing in `src/sourcestack/retrieval.ts`:
  - `doc:` / `document:` / `file:` / `record:`
  - `tag:`
  - `type:`
  - `status:`
  - `page:` / `p:`
  - `exhibit:`
  - `lane:exact` / `lane:smart`
- Rewired the Search tab so filter-only commands still return a source tree, while mixed text-plus-filter queries run exact and smart lanes inside the filter boundary.
- Fixed a speech-search defect where native dictation attempted to select a first match from stale previous-query results.
- Added a local case card with the concrete `case:import` command and workspace JSON import control.
- Added quick search command buttons for outage window, missed SLA, change order, escalation, and PDF contracts.
- Added responsive CSS for the Search workbench so the sticky command panel collapses cleanly on narrow viewports.

Failure and fix:

- Initial mobile CSS set grid columns on a flex `summary`, which would have looked like a responsive rule while doing nothing.
- Fixed the media rule to switch `search-group summary` to grid before applying mobile columns.

Checks after this chunk:

- `npm test -- --run` = 82 pass.
- `npm run lint` = pass.
- `npm run build` = pass.

Calibration note:

- The folder search and query parser compressed because `case:import` already defaulted to `C:\Example Case Folder`. The surprising part was not discovery; it was that app usability lagged behind the existing local preloader. Future UI estimates should first look for dormant local scripts before assuming new ingestion work.

## 2026-06-07T14:24:31-04:00 - Window 9 Chunk: Verification Queue Workbench

Goal: reduce the current human-promotion bottleneck by making verification state visible before the operator selects a card.

Implementation:

- Added a derived `VerificationQueueItem` model in `App.tsx`.
- Built a queue above the evidence list ordered by:
  - stale signoffs
  - ready-to-sign cards
  - blocked cards
  - verified cards
- Each queue item shows source/page, blocker count, stale reason or first blocker, and actions for page review and signoff.
- Queue state comes from `diagnoseEvidenceCard` plus the append-only signoff audit; the UI does not invent packet eligibility.
- Added queue counters for ready, blocked, stale, and verified cards.
- Added responsive queue CSS for narrow screens.

Failure and fix:

- `npm run lint` failed because the no-trust-store branch called `setState` synchronously inside an effect.
- Fixed by deriving the active audit entries and stale count instead of resetting state inside the effect body.

Checks after this chunk:

- `npm test -- --run` = 82 pass before queue addition and unchanged in behavioral scope.
- `npm run lint` = pass after effect fix.
- `npm run build` = pass.

Calibration note:

- The queue chunk compressed because deterministic diagnostics, proof blockers, and signoff audit primitives were already present. The work was mostly projection and action wiring. Future estimates for UI over existing kernel state should assume the data model is the bottleneck; if the data already exists, the UI slice is much smaller.

## 2026-06-07T14:29:06-04:00 - Window 9 Chunk: Browser Verification and Mobile Layout Fix

Goal: verify the new Search and Evidence surfaces in the running app and fix any visual/layout failures found by browser inspection.

Browser verification:

- Started Vite on `http://127.0.0.1:5177`.
- Verified the Search tab renders:
  - command filter chips
  - source tree
  - local case folder card
  - concrete `npm run case:import` command
  - quick search buttons
- Verified the Evidence tab renders:
  - Verification Queue
  - ready/blocked/stale/verified counters
  - Sign off action
  - existing SourceStack proof pane

Failure and fix:

- Browser layout measurement at 390px wide found horizontal overflow: the existing Case dashboard hero/case-profile grid forced a 678px scroll width.
- Added app-level border-box sizing, mobile min-width constraints, single-column case profile, reduced mobile hero type, and full-width mobile action buttons.
- Rechecked at 390px wide: document scroll width 375, no offenders, no horizontal overflow.

Checks after this chunk:

- `npm run lint` = pass.
- `npm run build` = pass.
- Browser DOM checks = Search and Evidence controls present.
- Browser mobile layout check = pass after fix.

Calibration note:

- Browser verification expanded the chunk because it exposed a real mobile failure outside the exact new components. This is a good expansion: it caught a user-facing flaw that normal build/lint/test missed.

## 2026-06-07T14:33:49-04:00 - Window 9 Chunk: CLI Intelligence Search Lane

Goal: add the user's requested second retrieval layer: a local CLI/model-backed intelligence lane that can find conceptually related records while staying bounded by deterministic source candidates.

Implementation:

- Added `src/sourcestack/intelligenceSearch.ts`:
  - bounded request construction
  - prompt construction that states the deterministic kernel owns truth
  - response validation for candidate IDs and typed top/middle/far tiers
  - reason clamping and duplicate suppression
- Added `scripts/smart-search-sidecar.mjs`:
  - local HTTP server at `127.0.0.1:4318`
  - `/health`
  - `/smart-search`
  - configurable CLI custody through `SOURCEDECK_SMART_SEARCH_COMMAND` and `SOURCEDECK_SMART_SEARCH_ARGS`
  - strict output JSON extraction and validation before returning to the app
- Added `npm run smart-search:sidecar`.
- Wired the Search tab with a `CLI lane` button, query-scoped CLI match state, result annotations, and CLI top/middle/far counters.

Failure and fix:

- `Get-Command codex` found `codex.exe`, but `codex --help` failed with Windows `Access is denied`.
- Built the sidecar with configurable command custody instead of hardcoding a brittle Codex invocation.
- Verified the sidecar health endpoint without invoking the inaccessible command.

Checks after this chunk:

- `npm test -- --run` = 83 pass.
- `npm run lint` = pass.
- `npm run build` = pass.
- Sidecar health check = pass on `http://127.0.0.1:4318/health`.

Calibration note:

- The typed intelligence lane compressed because it could reuse deterministic candidates from the Search tab. The uncertainty was not coding; it was local CLI invocation custody. Future estimates for model sidecars should separate API/contract work from environment-specific model execution.

## 2026-06-07T14:36:20-04:00 - Window 9 Chunk: Case OCR Sidecar Intake

Goal: convert the user's actual case records from "dark scanned records" into searchable review candidates when existing OCR text is already available.

Implementation:

- Updated `scripts/build-case-workspace.mjs` to discover `_casework\ocr_text`.
- Added OCR sidecar matching for:
  - image-only DOCX/media records
  - PDF page image OCR files such as `pdf_page_images__summer_2025_behavior_data__page_001_image_01.jpg.txt`
- OCR-backed records become searchable `Needs review` records, not trusted/verified records.
- Page-specific OCR text is preserved as `pageTexts`, so search can land on the right page.

Case import result:

- Before OCR bridge: 14 documents, 11 indexed, 3 needs OCR, 66 evidence candidates, 22 timeline entries.
- After OCR bridge: 14 documents, 11 indexed, 0 needs OCR, 84 evidence candidates, 25 timeline entries.
- OCR-backed review records:
  - `Case Graph 2025.docx` = 1 page, 5,049 chars.
  - `Summer 2025 Behavior Data.pdf` = 12 pages, 11,413 chars.
  - `Summer 2025 Weekly Trackers.pdf` = 82 pages, 80,327 chars.

Failure and fix:

- The preloader had existing OCR artifacts available but ignored them, leaving behavior data and trackers unsearchable.
- Fixed by attaching OCR sidecar text conservatively with explicit review status and OCR warning text.

Checks after this chunk:

- `npm run case:import -- "C:\Example Case Folder" "C:\Example Case Folder\sourcedeck-workspace.json" "C:\Example Case Folder\sourcedeck-pressure-test-report.md"` = pass.
- `npm test -- --run` = 83 pass.
- `npm run lint` = pass.
- `npm run build` = pass.

Calibration note:

- The OCR intake compressed because the expensive OCR work had already been done in `_casework`. The right move was not running OCR again; it was harvesting existing OCR artifacts into SourceDeck's review-gated source model.

## 2026-06-07T14:39:00-04:00 - Window 9 Chunk: Packet Factory Dashboard

Goal: make the export hard wall visible and actionable before the user presses a download button.

Implementation:

- Added derived Packet Factory rows from selected packet evidence and SourceStack diagnostics.
- Added top-level Packet Factory metrics:
  - selected
  - exportable
  - blocked
  - needs review
- Added a packet hard-wall queue with:
  - blocked/clear status
  - source exhibit/page/status
  - first blocker reason
  - Review action
  - Remove action
- Added responsive CSS for the dashboard and queue.

Verification:

- `npm test -- --run` = 83 pass.
- `npm run lint` = pass.
- `npm run build` = pass.
- Browser DOM check = Packet Factory dashboard, metrics, review action, and hard-wall text present.
- Browser mobile layout at 390px = no horizontal overflow.

Calibration note:

- The dashboard compressed because `packetHardWallFailures` already existed. The useful work was putting that deterministic state in front of the user before export.

## 2026-06-07T14:41:04-04:00 - Window 9 Chunk: Gauntlet Coverage for Search and CLI Intelligence

Goal: move the new search/intelligence trust claims into the Evidence Gauntlet.

Implementation:

- Added `command_search_filters_bound_source_tree` gauntlet case:
  - parses command filters
  - verifies deterministic source-candidate acceptance
  - rejects wrong-page candidates
  - confirms the query still tiers through retrieval scoring
- Added `cli_intelligence_cannot_invent_candidates` gauntlet case:
  - accepts a valid known candidate ranking
  - rejects a fabricated candidate ID

Verification:

- `npm test -- --run` = 83 pass.
- `npm run lint` = pass.
- `npm run build` = pass.
- `npm run gauntlet:report` = pass, 63 cases, 0 failures.

Calibration note:

- The gauntlet addition compressed because the unit-test fixtures already defined the expected contracts. The work was adapting them into the report-producing gauntlet path.

## 2026-06-07T14:42:24-04:00 - Window 9 Chunk: OCR Review Metadata

Goal: make OCR sidecar trust status explicit in generated workspaces and pressure-test reports.

Implementation:

- Added `ocrBacked` and `ocrSource` metadata to OCR sidecar documents.
- Added `OCR sidecar` tag to OCR-backed documents and their preloader evidence cards.
- Added report summary rows:
  - needs review documents
  - OCR sidecar documents
- Added console JSON fields:
  - `needsReview`
  - `ocrBacked`

Verification:

- Case import now reports: 14 documents, 11 indexed, 0 needs OCR, 3 needs review, 3 OCR backed, 84 evidence candidates, 25 timeline entries.
- Report contains `Needs review documents: 3` and `OCR sidecar documents: 3`.
- Workspace JSON contains OCR sidecar tags and warnings.
- `npm run lint` = pass.
- `npm run build` = pass.

Calibration note:

- This chunk was small but important. It prevents a searchable OCR record from being visually conflated with ordinary extracted text.

## 2026-06-07T14:44:15-04:00 - Window 9 Chunk: Case Import Shortcut

Goal: remove friction from the actual local case workflow.

Implementation:

- Added `npm run case:import:case`.
- Updated the Search tab's local case card to copy the short command instead of a three-path invocation.
- Added the output targets below the command in the UI.

Verification:

- `npm run case:import:case` = pass, producing 14 documents, 0 needs OCR, 3 needs review, 3 OCR-backed, 84 evidence candidates, 25 timeline entries.
- `npm run lint` = pass.
- `npm run build` = pass.

Calibration note:

- This was a small chunk but directly improves user throughput. The initial UI was technically correct but too cumbersome for repeated real-case use.

## 2026-06-07T14:45:24-04:00 - Window 9 Chunk: Smart-Search Sidecar Command Custody

Goal: make the configurable CLI sidecar robust enough for Windows paths and model args with spaces.

Implementation:

- Replaced naive whitespace splitting of `SOURCEDECK_SMART_SEARCH_ARGS` with quote-aware argument parsing.
- Preserves quoted values such as `"gpt-5.3 spark"` as a single argv element.

Verification:

- Sidecar `/health` with `SOURCEDECK_SMART_SEARCH_ARGS='exec --model "gpt-5.3 spark" --json'` returns args `["exec", "--model", "gpt-5.3 spark", "--json"]`.
- `npm run lint` = pass.
- `npm run build` = pass.

Calibration note:

- This was small but future-proofing. Model custody bugs usually show up as environment friction, not type errors.

## 2026-06-07T14:46:37-04:00 - Window 9 Chunk: Speech Sidecar Health

Goal: make the speech-to-search support layer observable and fail-bounded.

Implementation:

- Added `SOURCEDECK_SPEECH_HOST`.
- Added `/health` endpoint reporting:
  - format
  - model
  - API-key presence
  - max body size
- Added `SOURCEDECK_SPEECH_MAX_BYTES` with a 25MB default audio limit.
- Updated CORS methods to include `GET`.

Verification:

- Started `scripts/speech-transcription-sidecar.mjs` and verified `http://127.0.0.1:4317/health` returns `sourcedeck.speech-sidecar.v1`.
- `npm run lint` = pass.
- `npm run build` = pass.

Calibration note:

- This was a fast hardening chunk. It improves operability of the speech feature without changing trust semantics.

## 2026-06-07T14:47:48-04:00 - Window 9 Chunk: Search Sidecar Health UI

Goal: make local speech/CLI support-process state visible from the app.

Implementation:

- Added `Check sidecars` action in the Search command panel.
- The action checks:
  - `http://127.0.0.1:4317/health`
  - `http://127.0.0.1:4318/health`
- Results update existing speech and CLI intelligence status lines.

Verification:

- `npm run lint` = pass.
- `npm run build` = pass.
- Browser DOM check confirms `Check sidecars` and `CLI lane` render in Search.

Calibration note:

- This was a small UI bridge made possible by earlier sidecar health endpoints. It reduces support friction for the new speech and CLI layers.

## 2026-06-07T14:49:00-04:00 - Window 9 Chunk: OCR Quick Searches

Goal: make newly OCR-backed case records reachable from the Search panel.

Implementation:

- Added quick search commands:
  - `Behavior data OCR`
  - `Weekly trackers OCR`
- Queries target the OCR sidecar tag and specific document names.

Verification:

- `npm run lint` = pass.
- `npm run build` = pass.
- Browser DOM check confirms both quick-search buttons render.

Calibration note:

- Tiny chunk, but it closes the loop between ingestion and retrieval. OCR-backed records should be one click away once imported.

## 2026-06-07T14:51:31-04:00 - Window 9 Chunk: Preloader Text Artifact Repair

Goal: reduce mojibake pollution in generated titles, source text, and report previews.

Implementation:

- Added `repairTextArtifacts` in `scripts/build-case-workspace.mjs`.
- Applied it to:
  - generated document titles
  - cleaned extracted text
  - report previews
- Repairs common UTF-8/Windows artifacts such as smart quotes, mojibake dashes, and stray `Â`.

Verification:

- `npm run case:import:case` = pass.
- Case report now renders the analysis-document title with a proper dash instead of `â€”`.
- `npm run lint` = pass.
- `npm run build` = pass.

Calibration note:

- This looked cosmetic, but it affects retrieval quality because mojibake changes tokens and degrades query matching.

## 2026-06-07T14:54:07-04:00 - Window 9 Chunk: Smart-Search Arg Parser Correction

Goal: fix a command-custody defect found during diff review.

Failure and fix:

- The quote-aware sidecar arg parser initially treated backslash as an escape character.
- That preserved quoted model names but would corrupt Windows paths such as `C:\Model Configs\ranker.json`.
- Removed backslash escaping and kept quote grouping only.

Verification:

- Sidecar health with `SOURCEDECK_SMART_SEARCH_ARGS='exec --config "C:\Model Configs\ranker.json" --model "gpt-5.3 spark"'` returns args preserving both the path and model name.
- `npm run lint` = pass.
- `npm run build` = pass.

Calibration note:

- Direct diff review found a bug that checks did not. Environment/custody code needs adversarial examples that match the operating system.
