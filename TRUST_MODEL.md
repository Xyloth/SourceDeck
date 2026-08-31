# SourceDeck Trust Model

This document states, plainly, what SourceDeck (internal architecture: SourceStack) guarantees
deterministically today, and - just as importantly - what it does **not** yet guarantee. It is the
reference a recipient, auditor, or opposing party can use to understand exactly how far a SourceDeck
artifact can be trusted. Every guarantee below is enforced by deterministic code and covered by the
standing Evidence Gauntlet (`npm run gauntlet:report`) and unit suite (`npm test`); the limits are
stated honestly rather than implied away.

Thesis: **truth is deterministic and source-chained; intelligence is bounded, typed, and gated; the
two never blur.** No model output becomes factual until the kernel resolves its source chain and a
verification gate allows it.

## 1. Source-chained truth (the kernel)

- **No floating claims.** An evidence card cannot be `verified`, enter the strongest path, or leave
  in a packet unless it resolves to a real span -> page/media segment -> content-addressed document,
  AND its exact quote is a substring of the span text, AND the span text is backed by page text or
  genuine hashed page media. Enforced in `kernel.ts` (`resolveEvidenceCardSource`,
  `requireResolvedVerifiedCard`) and the verification state machine.
- **Packet hard wall.** `assembleEvidencePacket` and every export format (Markdown/HTML/CSV/manifest)
  fail closed as a whole packet if any selected card fails that proof.
- **Geometry is sealed.** Page geometry (dimensions, rotation, every block's quad/text/confidence)
  is content-addressed (`geometryHash`); a citation highlight cannot be moved - even within page
  bounds - without breaking artifact verification. A span only claims a highlight quad when a block
  actually contains the quote; otherwise it stays text-backed with no (false) quad.
- **Geometry/media-only backing requires real media.** A quad with no hashed page media behind it is
  not "source-backed"; geometry-only backing needs a `sha256:` page-image hash or a real media
  segment, not merely the presence of `quadPoints`.

## 2. Chain of custody

- **Content-addressed, append-only ledger.** Trust events form a canonical-JSON SHA-256 hash chain;
  single-event tampering is caught by recompute.
- **Signed, anchored ledger head.** The ledger head is ECDSA P-256 signed over
  (caseId, genesisHash, headHash, eventCount). A *wholesale re-chain* (rewriting history and
  recomputing every hash) is detected because the recomputed head was never signed by the original
  key, and a forger cannot re-sign without the private key.
- **Signed, independently verifiable packets.** Packet manifests are ECDSA-signed; recipients can
  recompute the packet/manifest/source/geometry hashes and verify the signature offline.
- **Signer identity is verifiable and pinnable.** Each signer has a stable, full-digest fingerprint
  (`keyFingerprint`) for out-of-band comparison. A recipient can require a packet or ledger head to
  be signed by a *trusted* signer (`verifyPacketManifestAgainstRegistry`,
  `verifySignedCaseLedger`/bundle `trustedLedgerKeyIds`). The signer discloses their fingerprint on
  export; the recipient pins it via the trust registry.
- **Forensic bundles.** A bundle recomputes graph/bundle hashes, re-runs artifact + vault + ledger
  verification, cross-links artifacts to their source-vault media, recomputes counts, and verifies
  the signed ledger head. Tamper anywhere fails the bundle.

## 3. Privacy and key custody

- **Source bytes are encrypted at rest.** Original files and rendered page images are AES-GCM
  encrypted (PBKDF2-SHA256) before they touch IndexedDB, gated on a workspace passphrase. With no
  passphrase the app refuses to persist plaintext bytes at all. One key derivation per import.
- **Extracted source text is session-only.** Verbatim extracted text, per-page text, the durable text
  artifact, and case-store artifact payloads are removed before browser `localStorage` serialization.
  They remain usable in memory during the active session and can be retained through an explicit
  encrypted workspace export. Reloading requires re-import or encrypted restore.
- **KDF policy.** Production derives at 600k PBKDF2 iterations; decrypt and encrypt reject anything
  below 100k (downgrade) or above 10M (decrypt-time DoS).
- **Signing-key custody.** Private signing keys are passphrase-wrapped (AES-GCM); custody
  verification can confirm a key is actually *recoverable*, not just well-formed.
- **Redaction hard wall.** Redacted exports are re-scanned and fail closed on any residual leak.
  Automatic classes: email, phone, SSN, labeled IDs, labeled DOB, street addresses, Luhn-valid
  payment cards, and honorific-prefixed names. Source-artifact bulk-dump disclosure is blocked.

## 4. Hostile input

- **Source content is evidence, never instruction.** Prompt-injection detection runs on OCR output
  and import, resists common obfuscation (full-width, zero-width splits, homoglyphs, leetspeak), and
  quarantines flagged documents from automatic evidence suggestion.
- **Model output is gated.** Candidate evidence from a model is rejected unless it structurally
  resolves to a real source span; nothing a model emits writes directly to the graph. Privacy mode
  is a hard ceiling on which model lanes may run.
- **Loopback sidecars reject arbitrary web origins.** Speech and CLI-intelligence operations bind to
  loopback, use an explicit origin allowlist instead of wildcard CORS, and require a per-process
  bearer capability obtained by the trusted SourceDeck origin. This prevents an unrelated browser
  page from spending model resources or reading sidecar output.

## 5. Honest limits (what is NOT yet guaranteed)

- **No third-party key directory.** Signer trust is local-manual: a recipient vouches for a
  fingerprint out-of-band. There is no federated/PKI key directory.
- **Redaction is high-precision, not exhaustive.** Names without an honorific rely on the user's
  manual term list; there is deliberately no free-text NER (to avoid false-positive flooding of the
  hard wall). Addresses/cards are heuristic.
- **Anchoring is still mostly lexical.** Re-anchoring uses character/token matching; full geometric,
  semantic-fingerprint, and structural relocation, and media-timestamp relocation, are not built.
- **No real model runtime or OCR engine.** The model router/gates and OCR pipeline are typed,
  gated scaffolding; no live frontier model or OCR worker is wired in yet.
- **Local-first only.** No collaboration, zero-knowledge sync, or cross-device chain-of-custody.
- **Derived workspace state remains a local prototype.** Evidence-card quotes, meeting notes, issue
  labels, and other user-created or derived workspace fields still use plaintext browser
  `localStorage`. SourceDeck therefore requires a trusted local browser profile; encrypted at-rest
  persistence for the entire workspace is not yet implemented.
- **Sidecar capabilities are not an OS sandbox.** Origin checks and per-process capabilities defend
  the browser boundary; another process running as the same local user remains inside the local
  trust boundary.
- **Not legal advice.** SourceDeck organizes a user's own records; it does not render legal
  conclusions. The legal-boundary language should be reviewed by counsel before commercialization.

This trust model is enforced by code, not asserted by UI. If a guarantee in sections 1-4 cannot be
demonstrated by the gauntlet and tests, treat it as a limit, not a guarantee.
