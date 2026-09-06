# One Screen Sprint verification 4 handoff

- Date: 2026-09-06 UTC
- Work order: `one-screen-sprint-verify-4`
- Verdict: **FAIL — 2 low-severity findings; 2 incompletely tested claims**
- Live URL: <https://one-screen-sprint.sociobot.in>
- Candidate implementation: `6584718359bf7ca6daff94c7c3b9ff8126e7c82b`
- Documentation and test head reviewed: `bb74ec971a6398330588d8a3bd194224b6471b7b`
- Full report: `.factory/verification-4.md`
- Evidence: `.factory/evidence/verification-4/`

## Outcome

The game works end to end on fresh desktop and phone browser contexts. The
sample reached a real 3–1 match end, retained its sample label, reset correctly,
and did not change real saved data. Accessibility, offline reload, recovery,
routes, links, privacy clearing, artifact parity, and performance passed.

Acceptance still fails because two declared claim commands are incomplete:

1. `movement-effects` observes paper flecks but not the screen-shake portion of
   its public claim.
2. `local-only` records requests only through startup, not through the whole
   deterministic demo flow required for a privacy claim.

Independent live probes found both runtime behaviors correct. These are claim
coverage defects, not observed game-runtime defects.

## Verification completed

- Fresh remote checkout: `npm ci`, `npm run check`, and
  `npm audit --audit-level=moderate` passed.
- Copy audit: 65 lines passed.
- Build: passed and produced `dist/`.
- Tests: 8 unit and 15 browser tests passed.
- Declared commands: all 17 exited successfully when run separately; two were
  incomplete after source review.
- Artifact parity: all 13 deployable files matched live by SHA-256.
- Live run: sample `CLUB-7`, 1–1 entry, simultaneous controls, 3–1 end, reset,
  storage isolation, phone touch, settings output, offline, and recovery passed.
- Accessibility: zero axe violations on four routes and the 404; keyboard and
  focus behavior passed; no console errors.
- Lighthouse: 100/100/100/100; LCP 1.77 s, CLS 0, TBT 61 ms, 174,612 bytes.
- Frame rate: 59.88 fps at 390 × 844 with four-times CPU slowdown.

## Reproduce

```sh
npm ci
npm run check
npm audit --audit-level=moderate
```

The independent run video, screenshots, JSON results, Lighthouse reports,
artifact hashes, and URL-verifier output are in
`.factory/evidence/verification-4/`.

## Scope

No product code was modified. There is no backend, database, tenant, online
multiplayer room, payment, health endpoint, or 429 path to test. Fresh Chromium
phone emulation was used rather than a physical handset.
