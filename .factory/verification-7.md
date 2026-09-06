# Verify the local two-player race in three browser engines

## Verdict

**FAIL — 1 medium-severity finding. Untested claim count: 0.**

The complete game works in Chromium, Firefox, and WebKit. WebKit does not keep
changed demo settings after a reload, so the public settings-persistence claim
is false in that engine.

## Release checked

- Live URL: <https://one-screen-sprint.sociobot.in>
- Implementation candidate: `d0f7313d5af0454d84c5a2936f9754fb2b25ca9b`
- Documentation baseline received: `684251015f73962c3ca118d3756f5cb1b38cc5bc`
- Verification date: 2026-09-06 UTC
- Product type: static local browser game

Commits after the implementation candidate contain only reports and evidence.
A clean build's HTML, hashed JavaScript, CSS, service worker, 404 files,
`robots.txt`, and `sitemap.xml` matched the live files by SHA-256. Evidence:
`/work/.evidence/verification-7/artifact-parity.txt`.

The product has no backend, tenant, room, database, health endpoint, restart
path, server rate limit, payment, or online multiplayer. Those checks do not
apply. The advertised multiplayer is two people sharing one local keyboard.

## First screen before scrolling

Fresh 1440 × 1000 desktop and 390 × 844 phone-sized contexts were opened in
all three engines. Each showed the game canvas before scrolling.

- Job: race a friend through an obstacle course on one keyboard.
- Audience: two people together who want a short competitive game with readable
  controls and a new course each match.
- First action: **Try it with sample data**, which loads a fixed 1–1 rematch.

The title was `One Screen Sprint — Race on one keyboard`. The page had one H1,
one main landmark, the three plain facts, and the playable game on the first
screen.

## Finding

### V7-01 — Medium — WebKit loses changed demo settings on reload

The public claim says mute, movement effects, and edge assist persist after a
reload. Its declared sandbox is `/demo`.

In three fresh WebKit 26.0 contexts:

1. Open `/demo`.
2. Turn Mute on, Movement effects off, and Edge assist on.
3. Save settings. Local storage and the history snapshot contain all changes.
4. Reload the page.
5. Open Settings.

After every reload, the demo settings key and saved settings snapshot were
`null`. The controls returned to Mute off, Movement effects on, and Edge assist
off. Chromium retained all three settings. A supplemental clean Firefox run
also failed this assertion once, while two browser-triggered Firefox reload
trials retained the settings; Firefox reload automation was therefore not used
to widen this finding beyond the consistently reproducible WebKit defect.

Evidence:
`/work/.evidence/verification-7/webkit-settings-reload-trials.json`,
`/work/.evidence/verification-7/settings-reload-live.json`, and
`/work/.evidence/verification-7/playwright-firefox-webkit.txt`.

## Browser coverage and complete run

Playwright 1.58.2 was pinned by the clean checkout. Its documented Firefox and
WebKit packages and Linux dependencies were installed before testing.

| Engine | Exact version | Desktop first screen | 390 × 844 sample to end | Native audio after gesture | Pause and reload |
| --- | --- | --- | --- | --- | --- |
| Chromium | 145.0.7632.6 | Pass | Pass, Player 1 wins 3–1 | Pass, two oscillator starts | Pass |
| Firefox | 146.0.1 | Pass | Pass, Player 1 wins 3–1 | Pass, two oscillator starts | Pass |
| WebKit | 26.0 | Pass | Pass, Player 1 wins 3–1 | Pass, two oscillator starts | Pass |

Each phone-sized run started from `Weekend rematch · sample`, score 1–1, round
3 of 5, course `CLUB-7`. It played the two remaining rounds with keyboard
controls and reached the actual match-complete panel. The demo banner remained
visible. Native Web Audio oscillator creation was observed without replacing
the browser audio implementation; sound began only after the play click.

The visible P1 right control was held with a real Playwright pointer event in a
touch-capable phone context. Progress changed from 6% to 38% in Chromium, 35%
in Firefox, and 42% in WebKit. Holding `D` and `ArrowRight` together after the
countdown moved both players in every engine. This verifies the promised local
two-player input; remote clients and room persistence are not promised.

**Race another course** reset score to 0–0, round to 1 of 5, and timer to 75.
**Reset demo** restored `CLUB-7`, score 1–1, round 3 of 5, and the sample label.
The cross-engine isolation tests passed, so demo reset and exit did not change
real saved data.

Evidence: `/work/.evidence/verification-7/cross-browser-live.json`,
`pointer-controls-live.json`, `simultaneous-input-live.json`, and the three
`*-phone-match-end.png` files in that directory.

## Claims and clean commands

From the clean documentation checkout, using Node 22.23.2 and npm 10.9.8:

```sh
npm ci
npx playwright install firefox webkit
npx playwright install-deps firefox webkit
npm run check
npm audit --audit-level=moderate
```

The declared Chromium gate passed: copy audit, production build, 8 unit tests,
16 browser tests, and all 17 claim commands run separately. The build produced
32.31 kB JavaScript (11.17 kB gzip) and 12.20 kB CSS (3.52 kB gzip). The audit
reported zero vulnerabilities.

| Declared claim | Result |
| --- | --- |
| `best-of-five-end` | Pass in all three engines |
| `restart-reset` | Pass in all three engines |
| `free-no-ads` | Pass |
| `fresh-course` | Pass |
| `fixed-60hz-simulation` | Pass |
| `round-limit` | Pass |
| `control-actions` | Pass |
| `settings-persist` | **Fail in WebKit; see V7-01** |
| `mute-stops-tones` | Pass, including native startup in all three engines |
| `movement-effects` | Pass in the declared Chromium command |
| `edge-assist` | Pass |
| `key-rollover` | Pass in all three engines in the live targeted run |
| `demo-isolated` | Pass in Chromium, Firefox, and WebKit |
| `local-only` | Pass; complete live runs used only the product origin |
| `offline-reload` | Pass in Chromium, Firefox, and WebKit |
| `60-fps` | Pass in its stated Chromium-only measurement |
| `refresh-recovery` | Pass in all three engines |

The live Chromium frame test measured 59.88 fps from 89 intervals at 390 × 844
with four-times CPU slowdown. The settled in-game meter showed 60 fps. Firefox
and WebKit cannot use Chromium's CDP slowdown API, and the claim specifically
names the Chromium measurement.

No additional public claim was found outside `.factory/claims.json`. The
finding is a failed tested claim, not an untested claim.

## Accessibility, privacy, routes, and recovery

- `/opt/fleet/lib/verify-url.sh` passed on `/`, `/demo`, `/privacy`, and
  `/terms`, with correct titles, `lang=en`, one H1, a main landmark, named
  buttons, image alternatives, and no load console errors.
- Live Playwright axe scans found zero violations on the four normal routes and
  the 404 in Chromium, Firefox, and WebKit. Every visible control at the phone
  viewport measured at least 44 × 44 CSS pixels.
- The clean cross-engine suite passed route-heading focus, dialog focus,
  reduced motion, corrupt-state recovery, privacy deletion, and the designed
  404 checks in Firefox and WebKit.
- All normal live routes returned 200 with unique titles. The missing route
  returned the expected HTTP 404 with its designed header, main content,
  footer, and return link. Its failed-resource console entry is expected.
- Complete live sample runs made requests only to
  `https://one-screen-sprint.sociobot.in` and logged no product console errors.
- WebKit loaded the banner and canvas after a browser-triggered offline reload.
  Its direct Playwright `page.reload()` call reports a WebKit internal error;
  that runner limitation is not a product defect because the browser-side
  reload completed the offline user path.

The WebKit screenshot helper injects a temporary inline stylesheet. The live
CSP blocks that helper stylesheet and logs a console message only while taking
screenshots. A navigation-only WebKit run has no such error. This is test
infrastructure behavior and not a site console defect.

## Earlier findings

| Earlier finding | Current disposition |
| --- | --- |
| V1-01 demo data survived Browser Back | Fixed; the cross-engine isolation test passes. |
| V1-02 unsupported match-duration wording | Fixed; the wording remains absent. |
| V1-03 fixed 60 Hz lacked claim coverage | Fixed; 60 deterministic updates equal one second. |
| V1-04 same-seed behavior sat outside its command | Fixed; repeat and different seeds are asserted. |
| V2-01 phone targets below 44 px | Fixed; the live three-engine scan found none. |
| V2-02 required phone copy too small | Fixed; the current responsive test passes. |
| V2-03 404 lacked standard structure | Fixed; the live 404 has the standard structure. |
| V3-01 mute lacked claim coverage | Fixed; the claim test and native audio check pass. |
| V3-02 flecks and effects were incomplete | Fixed; the declared effect test passes. |
| V3-03 edge assist lacked claim coverage | Fixed; its deterministic test passes. |
| V4-01 effects claim omitted shake | Fixed; the test observes transform changes. |
| V4-02 local-only stopped before the full flow | Fixed; the request log reaches end, reset, and exit. |
| V5-01 home-mark contrast below 4.5:1 | Fixed; the regression passes in all three engines. |

## Support boundaries and unavailable infrastructure

The product does not publish an engine support list, so current evergreen
Chromium, Firefox, and WebKit were treated as in scope. Firefox does not support
Playwright's `isMobile` context option; it was tested at the same phone viewport
with touch capability instead. Playwright WebKit is a WebKit build, not branded
Safari. No physical iPhone, Android phone, audible speaker output, or field INP
measurement was available. These limits are separate from V7-01 and do not
leave a public claim untested.

## Counts and required next work

- Finding count: **1**
- Untested public claim count: **0**

Preserve the candidate until demo setting persistence is corrected and tested
in WebKit. Add Firefox and WebKit projects or equivalent targeted coverage so
the engine-neutral reload claim cannot regress behind a Chromium-only gate.
