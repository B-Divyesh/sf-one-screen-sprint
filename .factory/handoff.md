# One Screen Sprint repair 5 handoff

- Date: 2026-09-06 UTC
- Work order: `one-screen-sprint-repair-5`
- Status: **PASS — the verification 5 finding is fixed**
- Untested public claims: **0**
- Live URL: <https://one-screen-sprint.sociobot.in>
- Deployed implementation: `d0f7313d5af0454d84c5a2936f9754fb2b25ca9b`
- Evidence and handoff baseline: `24a5ecf2d8551fefb76339626bcba4a79b5720c8`

## Outcome

The small “2” in the site-wide home mark now uses `#FFF8E9` on deep coral
`#C43C32`. Fresh browser measurements give 4.915:1 contrast at 15.2 px on
`/`, `/demo`, `/privacy`, `/terms`, and the designed HTTP 404. This clears the
4.5:1 normal-text requirement from finding V5-01.

The app and standalone 404 use the same corrected pair. A browser regression
calculates the contrast from rendered colors on every page, rather than
checking a CSS source value. The visual-system record now documents why deep
coral is limited to small reversed text.

The release also advances the service-worker cache from v3 to v4. This makes
returning browsers discard the old shell and receive the contrast repair. The
offline claim test now seeds an obsolete cache, reinstalls the worker, verifies
that the old cache is gone, and then reloads the sample without a network.

## Clean verification

From a detached clean checkout at the implementation SHA, using Node.js
22.23.2 and npm 10.9.8:

```sh
npm ci
npm run check
npm audit --audit-level=moderate
```

Results:

- Copy audit: 65 lines passed with no banned term or sentence over 22 words.
- Unit tests: 8 passed.
- Browser tests: 16 passed.
- Declared claims: all 17 command strings passed separately.
- Dependency audit: 0 vulnerabilities.
- Build: `dist/` produced successfully.
- JavaScript: 32.31 kB raw and 11.17 kB gzip.
- CSS: 12.20 kB raw and 3.52 kB gzip.

Local axe checks found zero violations on the four app routes and standalone
404. The local URL verifier found no console or baseline accessibility errors.
Local Lighthouse scored 99 performance, 100 accessibility, 100 best practices,
and 100 SEO, with 1.8-second LCP, 0 CLS, 80 ms total blocking time, and 171 KiB
transferred.

## Live verification

The exact clean build was deployed to the existing production Static Web App
`sf-one-screen-sprint`. No staging slot, backend, database, shared service,
secret, DNS outside the product record, or billing configuration was changed.
All 13 public build files match live by SHA-256.

Fresh 1440 × 1000 desktop and 390 × 844 phone contexts showed the job,
audience, first action, three facts, and game before scrolling:

- Job: race a friend through an obstacle course on one keyboard.
- Audience: two people together who want a short competitive game.
- First action: **Try it with sample data**, which loads a fixed 1–1 rematch.

The live sample opened `CLUB-7` at 1–1 in round three. Both keyboard players
moved at once, from 6% and 11% to 37% and 42%. The deterministic run reached
the actual **Player 1 wins 3–1** end screen. The sample label remained visible.
Reset restored `CLUB-7`, 1–1, and round three. Start for real removed every demo
key and left the pre-existing real setting unchanged. No request in the whole
flow went to another origin. Fresh phone touch input also moved player one.

Live browser results:

- `/`, `/demo`, `/privacy`, and `/terms`: HTTP 200, unique titles, one H1,
  one main landmark, and zero axe violations.
- `/repair-5-missing`: expected HTTP 404 with the designed recovery page,
  standard navigation and footer, and zero axe violations.
- Home-mark contrast: 4.915:1 on all five checked routes.
- Keyboard: skip link, 4 px focus ring, dialog open, Escape close, focus
  return, and route focus passed.
- Phone: all visible targets are at least 44 × 44 CSS pixels; required text is
  at least 17 px; 200% text has no horizontal overflow.
- Reduced motion disables flecks and shake. Effects on and off both passed.
- Privacy deletion, invalid-storage recovery, pause/reload, all internal links,
  and legal pages passed.
- Service-worker update removed the v3 cache; `/demo` then reloaded offline.
- Frame sample: 59.88 fps across 89 intervals at 390 × 844 and four-times CPU
  slowdown, above the declared 55 fps floor.
- Live Lighthouse: 100 performance, 100 accessibility, 100 best practices,
  and 100 SEO; 1.7-second LCP, 0 CLS, 10 ms total blocking time, and 171 KiB.
- URL verifier: no console errors; valid title, language, H1, main landmark,
  image alternatives, and button names.

## Earlier findings

All earlier findings remain fixed. Browser Back and direct demo exits clear
sample storage. Unsupported match-length wording remains absent. The fixed-step
and same-seed claims have tagged outcome tests. Phone target size, phone text,
and 404 structure pass. Mute, flecks, shake, edge assist, and full-flow privacy
requests have complete claim coverage. V5-01 is fixed by the rendered contrast
change and its new cross-route regression.

## Evidence

Evidence is in `.factory/evidence/repair-5/`:

- `contrast-and-update.json`: live contrast and cache-upgrade outcomes.
- `live-results.json`: full sample, effects, routes, keyboard, privacy,
  offline, frame-rate, links, and artifact parity.
- `desktop-cold.png`, `phone-cold.png`: fresh first screens.
- `sample-match.webm`, `sample-match-end.png`: run and actual end screen.
- `live-verify/`: HTTPS verifier output and desktop/phone captures.
- `local-accessibility.json`: local axe and contrast results.
- `lighthouse-local.report.json`, `lighthouse-live.report.json`: audits.

The verb-first catalog description remains 66 characters and is copied to
`/work/.evidence/catalog-description.txt`.

## Known limits and next steps

No product defect or required follow-up remains. A physical handset and field
INP data were unavailable; the product makes no physical-device or field-data
claim. The game is free and has no paid offer, backend, account, or online
multiplayer, so billing metadata, tenant, SQLite, health, restart, room, and
429 checks do not apply.
