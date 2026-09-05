# Verify the two-player keyboard race

## Verdict

**FAIL — 3 low-severity findings. Untested claim count: 3.**

The game works from entry to a real match end, all 14 declared claim commands
pass, and all seven earlier findings remain fixed. Three settings descriptions
make public behavior claims that are not listed and tested as claims. One of
those descriptions also promises paper flecks that the implementation does not
draw.

## Release checked

- Live URL: <https://one-screen-sprint.sociobot.in>
- Candidate implementation: `64d2f15df3a821c268e7113e6c82d4f1b5a365f8`
- Documentation head received for verification:
  `7bb248e7ebdcf06cee29dac558d03d84906b89e4`
- Verification date: 2026-09-05 UTC
- Product type: static local browser game

All 13 deployable files from the clean build matched the live files byte for
byte. The only changes after the candidate are reports and evidence, so the
live runtime is the stated implementation candidate.

There is no backend, database, tenant, room, account, payment, or server-side
rate limit. Restart persistence, tenant isolation, health, and 429/Retry-After
checks do not apply. The service worker and browser-storage recovery paths were
tested instead.

## First screen before scrolling

- Job: race a friend through an obstacle course on one keyboard.
- Audience: two people together who want a short competitive game.
- First action: **Try it with sample data**, which loads a fixed 1–1 rematch.

The game itself was visible before scrolling in fresh desktop and phone
contexts. On desktop, its surface ran from y=336.8 to y=846.0 in a 1440 × 1000
viewport. On phone, it began at y=655.6 in a 390 × 844 viewport. The job,
audience, sample action, action result, and three facts were also visible.

Evidence: `.factory/evidence/verification-3/desktop-first-screen.png`,
`phone-first-screen.png`, and `live-results.json`.

## Findings

### V3-01 — Low — The mute behavior is a public claim without a declared claim test

The Settings dialog says **“Stops the short game tones.”** The registry only
claims that the mute value persists. Its command checks the checkbox after a
reload; it does not assert that tones stop. No other claim entry names or tests
the audio behavior.

Required repair: add one exact claim and a tagged observable audio test, or
remove the behavior sentence.

### V3-02 — Low — The movement-effects description includes an unimplemented and untested paper-fleck promise

The Settings dialog says **“Turns small shake and paper flecks on or off.”**
The candidate has a settings-controlled shake in `src/game.ts`, but it has no
particle or paper-fleck state, update, or draw path. The static registration
marks are always drawn and are not controlled by this setting. The claim
registry checks only persistence of the setting.

Required repair: either implement and test both named effects, or change the
description to the effect that exists and add a tagged behavior test.

### V3-03 — Low — The edge-assist behavior is a public claim without a declared claim test

The Settings dialog says **“Jumps automatically near a platform edge.”** The
model contains this behavior, and the end-to-end tests use edge assist, but no
claim entry names the behavior and no tagged claim test directly asserts the
automatic edge jump. The registered command only checks that the choice
persists.

Required repair: add one exact claim and a tagged deterministic behavior test,
or remove the behavior sentence.

These are three untested public claims under the attached claim contract. The
paper-fleck part of V3-02 is also false in the reviewed implementation.

## Declared claim commands

A new remote checkout at `7bb248e` used the documented Node.js 22 and npm 10
setup. `npm ci` completed with zero vulnerabilities. `npm run check` ran every
declared command separately through `npm run verify:claims`.

| Claim | Result |
| --- | --- |
| `best-of-five-end` | Pass |
| `restart-reset` | Pass |
| `free-no-ads` | Pass |
| `fresh-course` | Pass |
| `fixed-60hz-simulation` | Pass |
| `round-limit` | Pass |
| `control-actions` | Pass |
| `settings-persist` | Pass |
| `key-rollover` | Pass |
| `demo-isolated` | Pass |
| `local-only` | Pass |
| `offline-reload` | Pass |
| `60-fps` | Pass |
| `refresh-recovery` | Pass |

The commands prove the claims they declare. They do not cover the three extra
settings descriptions listed above.

## Game and sample results

- The one-click sample opened `CLUB-7` at 1–1 in round three.
- Holding `D` and `ArrowRight` together moved both players from 6/11 percent
  to 38/42 percent.
- The deterministic sample ended at **Player 1 wins 3–1**. Its sample label
  remained visible during play and on the end screen.
- Reset demo restored `CLUB-7`, 1–1, and round three. Browser Back and **Start
  for real** cleared all demo keys while preserving the real settings value.
- A separate real match on `INK-63` reached active play and ended at **Player
  1 wins 3–0**. Replay reset the score to 0–0, round to one, and timer to 75
  while keeping the same course.
- Phone touch moved player one from 6 to 42 percent.
- Settings survived a live reload. Pause, reload, resume, invalid-storage
  recovery, saved-data deletion, offline reload, and service-worker update
  passed.
- The measured live frame rate was 59.88 fps over 89 intervals at 390 × 844
  with four-times CPU slowdown.

The recorded sample run is
`.factory/evidence/verification-3/sample-match.webm`. End-screen evidence is
`sample-match-end.png` and `real-match-end.png` in the same directory.

This is local multiplayer with two control sets in one browser. Online clients
and room persistence do not apply because the product does not offer an online
mode.

## Earlier finding disposition

| Earlier finding | Current disposition | Evidence |
| --- | --- | --- |
| V1-01 Browser Back kept demo data | Fixed. Back cleared demo keys, Forward opened a clean sample, and real settings stayed unchanged. | `live-results.json` |
| V1-02 Untested match-length promise | Fixed. The untested four-to-six-minute and five-minute promises remain absent. | Live copy and README |
| V1-03 Fixed 60 Hz claim lacked coverage | Fixed. Its declared command passed and asserted 60 updates equal one active second. | Clean claim run |
| V1-04 Same-seed behavior was outside its claim command | Fixed. The command checks a repeated seed and a different seed. | Clean claim run |
| V2-01 Phone targets below 44 × 44 | Fixed. All 72 visible targets across the four routes and 404 measured at least 44 × 44 CSS pixels. | `live-results.json` |
| V2-02 Required phone copy was too small | Fixed. Required selectors computed to 17 pixels, and 200% text had no horizontal overflow. | `live-results.json`, `phone-text-200.png` |
| V2-03 The 404 omitted standard structure | Fixed. The live 404 has the three-link header and complete footer. | `designed-404.png`, `live-results.json` |

The earlier first-screen, true-404-status, and phone-control repairs also remain
fixed.

## Accessibility, routes, privacy, and links

- Playwright axe found zero violations on `/`, `/demo`, `/privacy`, `/terms`,
  and the live 404.
- The live URL verifier found the title, language, one H1, main landmark,
  labels, and no console errors.
- Keyboard checks covered the skip link, a visible 4-pixel focus outline,
  Enter on Settings, modal state, Escape, focus return, and route-heading
  focus after navigation and Back.
- Reduced motion was active in its fresh context. CSS removes transitions and
  repeated animation, and the canvas disables shake under that preference.
- All sample-flow requests were same-origin. No analytics, ads, payment,
  account, AI, or external runtime requests appeared.
- The privacy action removed saved real match and settings after confirmation.
- `/`, `/demo`, `/privacy`, and `/terms` returned 200 with unique titles, one
  H1, and one main. Same-origin links returned 200.
- `/verification-3-missing` deliberately returned HTTP 404 and showed the
  designed recovery page. The expected status is not a defect.
- Security headers include CSP, HSTS, content-type protection, referrer policy,
  permissions policy, and cross-origin opener policy.

External Param Factory and email links were inspected but not opened because
they are outside this product's allowed scope.

No AI step fits this immediate local race, so the missed-leverage check found
no AI feature gap. Existing art provenance is recorded in `.factory/design.md`.

## Build and performance

- Copy audit: 65 lines passed.
- Production build: passed and produced `dist/`.
- Unit tests: 6 passed.
- Browser tests: 13 passed.
- Declared claim commands: all 14 passed separately.
- JavaScript: 31.59 KB raw, 10.88 KB gzip.
- CSS: 12.17 KB raw, 3.51 KB gzip.
- Dependency audit: 0 vulnerabilities.
- Live Lighthouse: 100 performance, 100 accessibility, 100 best practices,
  and 100 SEO. LCP was 1.7 seconds, CLS was 0, total blocking time was 10 ms,
  and total transfer was 170 KiB.

Evidence is in `.factory/evidence/verification-3/`. The first two Lighthouse
launch attempts did not complete because the browser path was not supplied in
the required environment form and then the tab exited. After setting
`CHROME_PATH` and using the installed Chromium with safe headless flags, the
fresh audit completed and produced the scores above. No failed measurement was
reported as a pass.

## Required next work

1. Register and test the three settings behavior claims.
2. Remove the paper-fleck wording or implement the promised effect.
3. Deploy the repair and run independent verification again.
