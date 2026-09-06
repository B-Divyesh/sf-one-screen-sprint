# Race a friend on one keyboard — review 2

## Verdict

**PASS — 0 findings. Untested claim count: 0.**

One Screen Sprint meets its job: two people sharing one keyboard can begin an immediate competitive obstacle race, finish a first-to-three match, and start another generated course without an account, ad, or remote opponent.

## Release reviewed

- Live URL: <https://one-screen-sprint.sociobot.in>
- Implementation candidate: `d0f7313d5af0454d84c5a2936f9754fb2b25ca9b`
- Documentation/report baseline: `0fbd9ecd2e423dbae3042d293815a51abc85f057`
- Review date: 2026-09-06 UTC
- Product class: static local browser game. It has no backend, SQLite data, tenant, room, health, restart, rate-limit, payment, or server request path; those backend checks do not apply.

`git diff` confirms that the commits after the implementation candidate change only factory reports and evidence. A fresh production build matched the live `index.html`, hashed JS and CSS, `sw.js`, standalone 404 files, `robots.txt`, and `sitemap.xml` byte for byte by SHA-256.

## First screen and game loop

Fresh browser contexts were used at desktop 1440 × 1000 and phone 390 × 844. Before scrolling, both showed the playable canvas, the job, audience, and the first action.

- Job: race a friend through an obstacle course on one keyboard.
- Audience: two people together who want a short competitive game with readable controls and a new course each match.
- First action: **Try it with sample data**; it loads the fixed 1–1 rematch.

The phone canvas began at y=655.6 and the desktop canvas at y=336.8, both at scroll position zero. Evidence: `/work/.evidence/review-2-phone-first.png` and `/work/.evidence/review-2-desktop-first.png`.

In a separate fresh desktop `/demo` context, the persistent **“Demo — sample data, nothing is saved”** banner, `Weekend rematch · sample`, score 1–1, and `COURSE CLUB-7` appeared. I enabled Edge assist, started the active round, and played the remaining rounds with keyboard input to the actual end panel: **“Player 1 wins 3–1.”** The banner remained present. “Race another course” reset the score to 0–0, round to `Round 1 of 5`, and clock to 75 seconds. “Reset demo” then restored the 1–1 `CLUB-7` sample. The run made no cross-origin requests and logged no console error. End-screen evidence: `/work/.evidence/review-2-demo-end.png`.

The sample isolation claim was also run from the clean candidate: real settings survive demo changes, reset, Browser Back, Forward, and direct route exit; demo keys are discarded. The live sample run used only its demo namespace and did not touch real saved data.

## Commands and claims

From the clean, dependency-installed candidate contents with Node 22.23.2, npm 10.9.8, and pinned Playwright 1.58.2:

```sh
npm ci
npm run check
npm audit --audit-level=moderate
```

All passed. The check passed the 65-line copy audit, production TypeScript/Vite build, 8 unit tests, 16 browser tests, and then every command declared in `.factory/claims.json`. The final claim command passed and the runner completed all 17 declarations. `npm audit --audit-level=moderate` reported zero vulnerabilities. The build produced 32.31 kB JS (11.17 kB gzip) and 12.20 kB CSS (3.52 kB gzip).

Every declared public claim has exactly one tagged test and passed: `best-of-five-end`, `restart-reset`, `free-no-ads`, `fresh-course`, `fixed-60hz-simulation`, `round-limit`, `control-actions`, `settings-persist`, `mute-stops-tones`, `movement-effects`, `edge-assist`, `key-rollover`, `demo-isolated`, `local-only`, `offline-reload`, `60-fps`, and `refresh-recovery`.

The landing page, game settings, README, demo document, legal pages, and live frame-meter wording were cross-checked against the claims file. There is no unlisted, false, incomplete, or untested public claim.

## Accessibility, privacy, routes, and recovery

- The required live URL verifier passed on `/`, `/demo`, `/privacy`, and `/terms`: HTTP 200, route title, `lang=en`, one H1, main landmark, no missing image alternatives, no unnamed buttons, and no console error. Load samples ranged from 632 to 693 ms. Evidence is under `/work/.evidence/review-2-url/`.
- Independent live Playwright axe checks found zero serious or critical issues on those four routes and the missing route. Every visible phone control on those pages was at least 44 × 44 CSS px. Keyboard focus, route-heading focus, dialog save/cancel, Escape pause/recovery, 200% text, reduced motion, corrupt storage recovery, offline reload, and privacy deletion passed in the candidate browser suite.
- `/`, `/demo`, `/privacy`, and `/terms` each returned 200 with the expected route-specific title, one H1, and one main. All discovered internal links returned 200. `/not-a-real-route` returned the deliberate HTTP 404 with its designed recovery page, H1, and main; this is expected behavior, not a defect.
- The full local sample-flow privacy claim and the live run observed no request to another origin. The page advertises local browser storage only, with no analytics, account, advertising, or payment path. The live security headers include a matching CSP, `frame-ancestors 'none'`, referrer policy, and `X-Content-Type-Options: nosniff`.
- The offline/update claim, 55-fps-at-4×-CPU claim, deterministic fixed 60 Hz simulation, settings persistence, and reduced-motion behavior were executed by their tagged candidate tests. Live asset parity establishes that this is the deployed implementation.

## Earlier findings

All earlier review and verification findings, including the minor claim and contrast findings, remain fixed and were rechecked through their current coverage:

| Finding | Current disposition |
| --- | --- |
| V1-01 demo data survived Browser Back | Fixed; the isolation command proves Back, Forward, and direct exit discard demo keys while real settings remain unchanged. |
| V1-02 unsupported match-duration wording | Fixed; the unsupported wording is absent and the 75-second rule has its declared test. |
| V1-03 fixed 60 Hz lacked claim coverage | Fixed; 60 deterministic updates equal one active second. |
| V1-04 same-seed behavior sat outside its command | Fixed; repeated geometry and differing geometry are asserted. |
| V2-01 phone targets below 44 px | Fixed; the live phone scan and candidate checks found none below 44 × 44 px. |
| V2-02 required phone copy too small | Fixed; required copy is at least 17 px and 200% text does not overflow. |
| V2-03 404 lacked standard structure | Fixed; the live HTTP 404 has header, navigation, footer, and a return action. |
| V3-01 mute lacked claim coverage | Fixed; the tagged test probes muted and unmuted oscillator starts. |
| V3-02 flecks/effects were incomplete | Fixed; the tagged test observes flecks and shake enabled and disabled. |
| V3-03 edge assist lacked claim coverage | Fixed; the deterministic test proves its automatic edge jump. |
| V4-01 movement-effects omitted shake | Fixed; changing course transforms are asserted when enabled. |
| V4-02 local-only ended before the full flow | Fixed; the request log spans match end, reset, and demo exit. |
| V5-01 home-mark contrast below 4.5:1 | Fixed; rendered-colour regression checks every route and 404. |

## Known limits

No product findings and no untested public claims remain. A physical handset and field INP measurement were not available and are not claimed.
