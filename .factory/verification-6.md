# Verify the local two-player browser race

## Verdict

**PASS — 0 findings. Untested claim count: 0.**

One Screen Sprint meets the local two-player race job: two people sharing one
keyboard can enter a match, play a procedural obstacle race, and reach an
actual best-of-five end screen without an account, ad, or network opponent.

## Release checked

- Live URL: <https://one-screen-sprint.sociobot.in>
- Implementation candidate: `d0f7313d5af0454d84c5a2936f9754fb2b25ca9b`
- Documentation baseline supplied for review: `9f7e2e48f13eb4bd920047ff1c3ce28dba78d9ab`
- Verification date: 2026-09-06 UTC
- Product class: static browser game. It has no backend, database, tenant,
  rooms, rate limit, health endpoint, payment, or server restart path.

A detached clean checkout of the implementation candidate built successfully.
The live `index.html`, hashed JavaScript, hashed CSS, `sw.js`, `404.html`, and
`404.css` have the same SHA-256 as that build. See
`.factory/evidence/verification-6/artifact-parity.txt`.

## First screen before scrolling

Fresh 1440 × 1000 desktop and 390 × 844 phone contexts show the game canvas,
job, audience, and first action before scrolling.

- Job: race a friend through an obstacle course on one keyboard.
- Audience: two people together who want a short competitive game with readable
  controls and a new course each match.
- First action: **Try it with sample data**; it loads a fixed 1–1 rematch.

Screens: `.factory/evidence/verification-6/desktop-first-screen.png` and
`.factory/evidence/verification-6/phone-first-screen.png`.

## Game and demo run

The live `/demo` sample started as `CLUB-7`, 1–1, round 3. Holding `D` and
Right Arrow together moved both players from 6/11% to 36/40%. The deterministic
run reached the actual **Player 1 wins 3–1** end screen. The persistent
“Demo — sample data, nothing is saved” label remained visible.

Reset restored score 1–1, round 3 of 5, and `Course CLUB-7`. Start for real
removed all demo keys. The separate real-match scripted test reached 3–0 and
the restart test reset score, round, timer, and course.

End-screen evidence: `.factory/evidence/verification-6/sample-end.png` and
`.factory/evidence/verification-6/live-results.json`.

## Declared claims and clean checks

From the detached checkout, with Node 22.23.2, npm 10.9.8, and pinned
Playwright 1.58.2:

```sh
npm ci
npm run check
npm audit --audit-level=moderate
```

All commands passed. The check ran the 65-line copy audit, production build,
8 unit tests, 16 browser tests, and every declared command separately. The
claim runner finished with “All 17 declared claim commands passed.” Audit found
zero vulnerabilities. Build output is 32.31 kB JavaScript (11.17 kB gzip) and
12.20 kB CSS (3.52 kB gzip).

Each declared claim passed with its required tagged test: `best-of-five-end`,
`restart-reset`, `free-no-ads`, `fresh-course`, `fixed-60hz-simulation`,
`round-limit`, `control-actions`, `settings-persist`, `mute-stops-tones`,
`movement-effects`, `edge-assist`, `key-rollover`, `demo-isolated`,
`local-only`, `offline-reload`, `60-fps`, and `refresh-recovery`.

Live cross-check of the page, settings, legal pages, README, and demo document
found no public statement missing from `.factory/claims.json`, no false claim,
and no incomplete claim command.

## Accessibility, privacy, routes, and recovery

- `/`, `/demo`, `/privacy`, and `/terms` returned 200, with unique route titles,
  one H1, and one main landmark. The missing-route request returned the expected
  HTTP 404 and showed the designed recovery page with an H1, main, navigation,
  and footer.
- Playwright axe found zero violations on all four routes and the 404. The
  required URL verifier reported no console errors, `lang=en`, valid title,
  H1/main, no missing image alternatives, and no unnamed buttons. The standalone
  axe CLI could not start its Selenium driver against the preinstalled browser;
  the completed Playwright axe integration is the accepted equivalent audit.
- Keyboard checks passed for the skip link, visible focus, modal Settings,
  Escape close, focus return, route-heading focus, pause/resume, and recovery
  after reload. Reduced-motion behavior is covered by the passing browser suite.
- On the fresh phone context every visible control measured at least 44 × 44
  CSS px. Touching P1 Right moved progress from 6% to 38%.
- A fresh privacy action removed the real namespace and announced “Saved match
  and settings removed.” Demo exit left no demo keys. The full demo flow made no
  cross-origin request.
- After a successful visit, `/demo` reloaded offline with its sample banner and
  canvas. At 390 × 844 with four-times CPU slowdown, the live frame sample had
  a 16.7 ms median frame interval: 59.88 fps, exceeding the advertised 55 fps.

Machine-readable live results are in
`.factory/evidence/verification-6/live-results.json` and
`.factory/evidence/verification-6/extra-live-results.json`.

## Earlier findings

| Finding | Current disposition |
| --- | --- |
| V1-01 demo data survived Browser Back | Fixed; Back/direct exits clear demo keys and preserve real settings. |
| V1-02 unsupported match-duration wording | Fixed; the wording remains absent. |
| V1-03 fixed 60 Hz lacked a declared test | Fixed; 60 deterministic updates are asserted. |
| V1-04 same-seed behavior sat outside its command | Fixed; the command checks repeat and different seeds. |
| V2-01 phone targets below 44 px | Fixed; fresh phone scan found none below 44 × 44 px. |
| V2-02 required phone copy too small | Fixed; passing browser check verifies 17 px required text and 200% no-overflow behavior. |
| V2-03 404 lacked standard structure | Fixed; live 404 has the standard header, navigation, footer, and recovery action. |
| V3-01 mute lacked claim coverage | Fixed; tagged browser command probes muted and unmuted tone output. |
| V3-02 flecks/effects were incomplete | Fixed; tagged command observes flecks and shake on and off. |
| V3-03 edge assist lacked claim coverage | Fixed; tagged deterministic test proves the automatic edge jump. |
| V4-01 effects claim omitted shake | Fixed; command measures horizontal transform variation. |
| V4-02 local-only ended before full demo flow | Fixed; request log spans match end, reset, and exit. |
| V5-01 home-mark contrast below 4.5:1 | Fixed; rendered-color regression covers every route and the 404. |

## Known limits

No product defect or required follow-up remains. A physical handset and field
INP data were not available; the game does not claim either. Backend-specific
checks do not apply because this is a static local multiplayer game.
