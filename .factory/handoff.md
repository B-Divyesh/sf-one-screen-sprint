# One Screen Sprint repair 3 handoff

- Date: 2026-09-05 UTC
- Work order: `one-screen-sprint-repair-3`
- Result: **Repair complete — all three verification 3 findings fixed**
- Live URL: <https://one-screen-sprint.sociobot.in>
- Implementation and deployed SHA: `6584718359bf7ca6daff94c7c3b9ff8126e7c82b`
- Claim and regression-test SHA: `712281c7cd49690757c9409ac7d26c6799565425`
- Evidence and handoff content SHA: `f384f55d79857f293ed0e8605fca8281381888cf`
- Previous report: `.factory/verification-3.md`
- Repair evidence: `.factory/evidence/repair-3/`

The second SHA changes only claims, tests, and secret-file ignore rules after
the runtime deployment. All 13 deployable files from the implementation SHA
match the custom-domain files by SHA-256.

## What changed

- The Settings mute description now has its own declared claim. Its browser
  test starts matched unmuted and muted sample rounds through the real UI and
  observes oscillator output. The unmuted start emits two short tones; the
  muted start emits none.
- Movement effects now draw five short, directional paper flecks behind each
  dashing player as well as the existing small shake. The setting and the
  reduced-motion preference suppress both effects.
- The movement-effects claim uses a Canvas output probe through the real
  Settings flow. It observes flecks during an enabled dash and none after the
  setting is disabled. A deterministic unit check also covers shake, fleck
  direction, effects-off, and reduced motion.
- Edge assist now has a declared deterministic behavior claim. Its test places
  matched players near the same platform edge with no jump input; only the
  assisted player launches.
- The service-worker cache advanced to `one-screen-sprint-v3`, so returning
  visitors replace the earlier cached shell.

## Current finding disposition

| Finding | Result | Evidence |
| --- | --- | --- |
| V3-01 mute behavior had no claim test | Fixed. A dedicated browser claim observes tones from an unmuted start and zero tones from a muted start. | Clean claim run and `live-results.json` |
| V3-02 paper flecks were promised but absent | Fixed. Dashes render directional paper flecks; effects-off and reduced motion render none. | Canvas output claim, unit check, and `live-results.json` |
| V3-03 edge assist had no claim test | Fixed. A tagged model test proves automatic edge jumping without a jump key. The live sample completed with assist and no jump-key input. | Clean claim run and `live-results.json` |

All seven earlier report findings remain fixed:

- Browser Back clears the demo namespace and preserves real settings.
- Untested match-length copy remains absent.
- Fixed 60 Hz simulation and same-seed determinism remain declared and tested.
- Every visible phone target on all public routes and the 404 remains at least
  44 by 44 CSS pixels.
- Required phone text remains 17 CSS pixels, and 200% text has no horizontal
  overflow.
- The deliberate 404 remains an HTTP 404 with the standard header and footer.
- The first-screen game, true 404 status, and phone controls remain fixed.

## Clean setup and declared claims

A detached checkout of `712281c7cd49690757c9409ac7d26c6799565425`
used the documented Node.js 22 and npm 10 setup:

```sh
npm ci
npm run check
```

Results:

- Copy audit: 65 lines passed with no long or banned-word flags.
- Production build: passed and produced `dist/`.
- Unit tests: 8 passed.
- Browser tests: 15 passed.
- All 17 claim commands ran separately and passed.
- Dependency audit: 0 vulnerabilities.
- JavaScript: 32.31 KB raw, 11.17 KB gzip.
- CSS: 12.17 KB raw, 3.51 KB gzip.

## Deployment and live browser checks

The implementation build was deployed to the existing product-owned static
app `sf-one-screen-sprint` in its production environment. The custom origin
returned 200 for `/`, `/demo`, `/privacy`, and `/terms`; the deliberate missing
route returned 404. Security headers include CSP, HSTS, content-type
protection, referrer policy, permissions policy, and frame protection.

The deployment tool created a local credential file. It was removed without
being read, and no credential is tracked or included in evidence. `.env` is
ignored for future runs.

Fresh desktop and phone browser checks found the following before scrolling:

- Job: race a friend through an obstacle course on one keyboard.
- Audience: two people together who want a short competitive game.
- First action: **Try it with sample data**, which loads a fixed 1–1 rematch.
- The game surface is present in the first viewport at both 1440 by 1000 and
  390 by 844.

The live deterministic sample opened `CLUB-7` at 1–1 in round three.
Simultaneous keyboard input moved both players. Player one finished the match
3–1 without a jump-key input while edge assist was on. The sample label stayed
visible at the end. Reset restored `CLUB-7`, 1–1, and round three. Leaving
removed demo keys and preserved the pre-existing real setting.

Live setting output checks observed four unmuted tones across two starts, zero
muted tones, rendered paper flecks with effects on, and zero paper flecks with
effects off. Reduced motion also produced zero flecks. Phone touch moved player
one from 6% to 42%.

Offline reload, pause/reload/resume, invalid-storage recovery, keyboard focus,
dialog focus return, route titles, privacy isolation, and same-origin-only
requests passed. The live URL verifier reported no console errors. Playwright
axe and axe CLI found zero violations on all four routes and the 404.

Fresh mobile Lighthouse scored 100 performance, 100 accessibility, 100 best
practices, and 100 SEO. LCP was 1.7 seconds, CLS was 0, total blocking time was
40 milliseconds, and transfer was 171 KiB. The live frame sample measured
59.88 fps over 89 intervals at 390 by 844 with four-times CPU slowdown.

## Product and scope notes

The catalog description is verb-first, 67 bytes including its newline, and was
copied to `/work/.evidence/catalog-description.txt`.

This remains a free local two-player game. There is no backend, database,
tenant, room, account, payment, billing offer, rate limit, or remote
multiplayer path. Backend persistence, health, 429, and independent online
client checks do not apply. No billing metadata file is needed.

No AI step helps this immediate local race, and no new raster asset was needed.
Existing original and generated-asset provenance remains in
`.factory/design.md`.

No product defect is known. Phone checks use a fresh Chromium mobile context,
not a physical handset. INP has no field data. Completion analytics remain
intentionally absent to preserve the stated privacy behavior.

## Reproduce

```sh
npm ci
npm run check
npm audit --audit-level=moderate
node .factory/evidence/repair-3/run-live.mjs
```

The end-screen video, cold screenshots, live results, artifact hashes,
Lighthouse reports, axe output, response headers, and URL-verifier output are
in `.factory/evidence/repair-3/`.
