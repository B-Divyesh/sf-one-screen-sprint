# One Screen Sprint repair handoff

- Date: 2026-09-05 UTC
- Work order: `one-screen-sprint-repair-2`
- Result: **Repair complete — all three current findings fixed**
- Live URL: <https://one-screen-sprint.sociobot.in>
- Implementation and deployed SHA: `64d2f15df3a821c268e7113e6c82d4f1b5a365f8`
- Evidence documentation SHA: `da2521f59ca790d3e983f33f67b6c051ce4e9987`
- Previous verification report: `.factory/verification-2.md`
- Repair evidence: `.factory/evidence/repair-2/`

## What changed

- Every visible phone link, button, and form control now has a rendered target
  of at least 44 by 44 CSS pixels. This includes header and footer links, demo
  controls, legal-page email links, game controls, and settings checkboxes.
- Required phone copy now renders at 17 CSS pixels. The audience, sample-action
  note, three facts, instructions, navigation, buttons, and footer were checked.
  Relative units preserve browser text resizing.
- The 404 now uses the standard header navigation and complete footer. It has
  the product description, Privacy, Terms, Param Factory attribution, version,
  and generated-image disclosure.
- The service-worker cache version changed to `one-screen-sprint-v2`, so an
  existing browser can replace the earlier cached shell.
- Browser regressions measure rendered target boxes and computed type sizes at
  390 by 844 pixels. They also check 200% text, first-screen game visibility,
  and the standalone 404 structure.

## Current finding disposition

| Finding | Result | Evidence |
| --- | --- | --- |
| V2-01 phone targets below 44 by 44 | Fixed. Every visible target on `/`, `/demo`, `/privacy`, `/terms`, and the live 404 measured at least 44 by 44. | `live-results.json` |
| V2-02 required phone copy below minimum | Fixed. Required selectors computed to 17 pixels. At 200% text, page width remained 390 pixels with no horizontal overflow. | `live-results.json`, `live-phone-text-200.png` |
| V2-03 incomplete 404 shell | Fixed. The live page returns HTTP 404 and has the standard three-link header plus the complete footer. | `404-headers.txt`, `404-live.html`, `live-404.png` |

The four V1 findings remain fixed. Browser Back clears demo storage, the
untested match-length copy remains removed, the fixed-step claim has a tagged
test, and the deterministic-course command checks both repeat and new seeds.
Earlier first-screen, 404-status, and touch-control repairs also remain fixed.

## Verification

The exact pushed implementation was cloned into a new temporary directory.
From that clean checkout:

```sh
npm ci
npm run check
```

Results:

- Dependency install and `npm audit --audit-level=moderate`: 0 vulnerabilities.
- Copy audit: 65 lines passed.
- Production build: passed and produced `dist/`.
- Unit tests: 6 passed.
- Browser tests: 13 passed.
- All 14 claim commands ran separately and passed.
- JavaScript: 31.59 KB raw, 10.88 KB gzip.
- CSS: 12.17 KB raw, 3.51 KB gzip.
- Playwright axe: no serious or critical issues on all public routes and 404.
- Axe CLI on the live five-page set: 0 violations.
- Live URL verifier: 200, correct metadata and landmarks, no console errors.
- Every deployable local file matched the live file by SHA-256.

Fresh mobile Lighthouse on the live origin scored 100 performance, 100
accessibility, 100 best practices, and 100 SEO. LCP was 1.684 seconds, CLS was
0, total blocking time was 26.5 milliseconds, and transfer was 174,309 bytes.
The live throttled frame sample measured 59.88 fps across 89 intervals.

## Live game run

- Desktop first screen: job, audience, sample action, three facts, and the full
  canvas were visible before scrolling.
- Phone first screen: the same job, audience, action, facts, and game were
  visible before scrolling. The canvas began at 655.56 pixels in the 844-pixel
  viewport.
- Demo: opened course `CLUB-7` at 1–1. Simultaneous keyboard input moved player
  one from 6% to 40% and player two from 11% to 44%. The match ended 3–1.
- Demo reset: restored `CLUB-7`, 1–1, round 3 of 5. The demo label remained at
  the end screen. Leaving removed demo keys and preserved the real setting.
- Real match: course `RACE-96` reached active play and ended with player one
  winning 3–0. The recorded run is `live-real-match.webm`.
- Touch: player one moved from 6% to 42% in a fresh phone demo.
- Offline: the updated service worker activated and `/demo` reloaded offline
  with both the sample banner and canvas visible.
- Routes: `/`, `/demo`, `/privacy`, and `/terms` return 200 with unique titles.
  The deliberate missing route returns 404. Product links and static files
  return their expected statuses.

## Scope and remaining limits

This is a local two-player game. There is no backend, database, tenant, room,
rate limit, payment, billing offer, account, or remote multiplayer path to
test. Independent online clients do not apply; both local control sets were
tested independently and simultaneously.

No AI feature fits this immediate local race, and no new image asset was needed
for this repair. Existing generated-image provenance remains in
`.factory/design.md`.

No product defect is known. The phone checks use Chromium device emulation,
not a physical handset. INP has no field data. Completion analytics remain
intentionally absent to preserve the product's stated privacy behavior.

## Reproduce

```sh
npm ci
npm run check
npm audit --audit-level=moderate
```

For the deployed flow and screenshots:

```sh
node .factory/evidence/repair-2/run-live.mjs
```
