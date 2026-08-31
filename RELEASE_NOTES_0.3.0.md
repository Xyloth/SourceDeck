# SourceDeck v0.3.0 — Verifiable Portfolio and Trust Hardening

This release turns SourceDeck's existing evidence engine into a more inspectable,
repeatably verified public engineering artifact. It strengthens the local browser
boundary, adds continuous and browser-level verification, and makes the README
show the real shipped interface and the system's honest limits.

## Security and Privacy Hardening

- Upgraded PDF.js beyond the malicious-PDF arbitrary-JavaScript advisory that
  affected the prior version.
- Refreshed the locked dependency graph; `npm audit` reports zero known
  vulnerabilities at release time.
- Replaced wildcard sidecar CORS with an explicit shipped/loopback origin policy.
- Added random per-process bearer capabilities for speech and CLI-intelligence
  sidecar operations, with origin and token rejection before model/API work.
- Removed extracted text, per-page text, durable text artifacts, and case-store
  artifact payloads before browser `localStorage` serialization.
- Changed plain workspace export to redact private source material; encrypted
  workspace export remains the explicit durable source-text path.
- Expanded `TRUST_MODEL.md` to distinguish the browser boundary from the local OS
  trust boundary and to disclose which derived fields still use plaintext local
  storage.

## Continuous Verification

- Added least-privilege GitHub Actions CI for locked install, lint, unit/security
  tests, production build, Chromium smoke testing, and production dependency
  audit.
- Added Playwright coverage for the worked-example navigation, exact record
  search, and source-text removal after a browser reload.
- Current automated proof:
  - 87 Vitest cases
  - 3 Node sidecar-security cases
  - 1 Chromium critical-path test
  - 63/63 SourceStack adversarial gauntlet cases

## Public Portfolio Presentation

- Added two direct captures of the real deployed UI; no generated mockups.
- Rebuilt the README around product outcome, system architecture, verifiable
  engineering evidence, commands a reviewer can run, and explicit unfinished
  boundaries.
- Linked the live demo, CI, trust model, gauntlet report, browser test, and source
  assets from the repository front page.

## Honest Boundaries

This release does **not** add a live frontier-model runtime, OCR engine,
multi-tenant backend, account system, collaboration, or full-workspace encrypted
persistence. Extracted source text is session-only, while derived fields such as
evidence-card quotes and meeting notes still require a trusted local browser
profile. See `TRUST_MODEL.md` for the complete boundary.

## Verified for Release

```text
npm run lint                 PASS
npm test                     PASS (87 Vitest + 3 Node security)
npm run build                PASS
npm run test:e2e             PASS (1 Chromium critical path)
npm run gauntlet:report      PASS (63/63)
npm audit                    PASS (0 vulnerabilities)
GitHub Actions               PASS
Vercel deployment            PASS
```

## Included Pull Requests

- #7 — dependency hardening and continuous verification
- #8 — local sidecar and plaintext-persistence boundaries
- #9 — recruiter-facing proof, real screenshots, and browser smoke testing
