# Verify the two-player keyboard race

## Verdict

**FAIL — 1 low-severity finding. Untested claim count: 0.**

The game, sample sandbox, all 17 declared claims, and every core user path work.
The release does not pass the required accessibility baseline because normal-size
text in the site-wide home mark has 3.97:1 contrast instead of at least 4.5:1.

## Release checked

- Live URL: <https://one-screen-sprint.sociobot.in>
- Candidate implementation and deployed runtime:
  `6584718359bf7ca6daff94c7c3b9ff8126e7c82b`
- Documentation and claim-test SHA reviewed:
  `f9a178b0e96989240e69bc0be7b237856319b560`
- Verification date: 2026-09-06 UTC
- Product type: static local browser game

The clean build's 13 deployable files match the live files byte for byte by
SHA-256. Changes after the implementation SHA are tests, claims, reports, and
evidence; they do not change the shipped runtime. There is no backend,
database, tenant, account, online room, payment path, health endpoint, or
server-side rate limit. Backend isolation, restart, health, and 429 checks do
not apply.

## First screen before scrolling

- Job: race a friend through an obstacle course on one keyboard.
- Audience: two people together who want a short competitive game.
- First action: **Try it with sample data**, which loads a fixed 1–1 rematch.

A fresh 1440 × 1000 desktop context showed the whole game surface at
y=336.8–846.0. A fresh 390 × 844 phone context showed the game beginning at
y=655.6, so the game itself, job, audience, action, action result, and three
facts were all visible before scrolling. The title names the product and job:
“One Screen Sprint — Race on one keyboard.” The copy audit passed all 65 lines
with no banned words or sentence over 22 words.

Evidence: `.factory/evidence/verification-5/desktop-cold.png`,
`phone-cold.png`, and `live-results.json`.

## Finding

### V5-01 — Low — The home-mark numeral does not meet text contrast

The visible “2” in the home link uses `#FFF8E9` text on `#D94A3D`. Live
computed styles measure 15.2 px and a 3.973:1 contrast ratio. This is normal
text, so the attached accessibility contract requires at least 4.5:1. The
failure is present on `/`, `/demo`, `/privacy`, `/terms`, and the designed HTTP
404. The SPA routes compute the text at weight 400; the standalone 404 uses
weight 900, but 15.2 px is still below the large-text threshold.

The link retains the accessible name “One Screen Sprint home,” and this does
not block play or navigation, so severity is low. Change the foreground or
background pair to reach 4.5:1, then verify both `src/style.css` and
`public/404.css` on every route.

Evidence: `.factory/evidence/verification-5/contrast-check.json` and
`contrast-check.mjs`.

## Game and sample run

- The one-click sample opened course `CLUB-7` at 1–1 in round three.
- Holding `D` and `ArrowRight` together moved Player 1 from 6% to 36% and
  Player 2 from 11% to 40%.
- The deterministic run reached the actual **Player 1 wins 3–1** end screen.
- The “Demo — sample data, nothing is saved” label remained visible at the end.
- Reset restored `CLUB-7`, 1–1, and round three of five.
- Start for real removed all demo keys and left the saved real setting exactly
  unchanged.
- No cross-origin request occurred from entry through match end, reset, and
  demo exit.
- Movement effects produced 40 paper-fleck draws and a 3.82 px shake range.
  Turning effects off produced zero flecks and zero shake range. Reduced motion
  also produced zero flecks and zero shake range.
- The complete local browser suite also played a fresh real match to a 3–0 end
  screen and covered replay and new-course reset.

The recording and end state are
`.factory/evidence/verification-5/sample-match.webm` and
`sample-match-end.png`.

## Declared claims

A fresh remote checkout at `f9a178b` used Node.js 22.23.2, npm 10.9.8, and the
pinned Playwright 1.58.2. `npm run check` invoked every command string in
`.factory/claims.json` separately. All 17 passed, and source inspection found
exactly one tagged test for each claim.

| Claim | Result | Coverage |
| --- | --- | --- |
| `best-of-five-end` | Pass | Complete |
| `restart-reset` | Pass | Complete |
| `free-no-ads` | Pass | Complete |
| `fresh-course` | Pass | Complete |
| `fixed-60hz-simulation` | Pass | Complete |
| `round-limit` | Pass | Complete |
| `control-actions` | Pass | Complete |
| `settings-persist` | Pass | Complete |
| `mute-stops-tones` | Pass | Complete |
| `movement-effects` | Pass | Complete |
| `edge-assist` | Pass | Complete |
| `key-rollover` | Pass | Complete |
| `demo-isolated` | Pass | Complete |
| `local-only` | Pass | Complete |
| `offline-reload` | Pass | Complete |
| `60-fps` | Pass | Complete |
| `refresh-recovery` | Pass | Complete |

The live page, settings text, legal pages, demo documentation, and README were
cross-checked against the registry. No false, missing, incomplete, or untested
public claim was found. Untested claim count is zero.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| V1-01 Browser Back kept demo data | Fixed. Back and direct exits clear demo keys, Forward starts clean, and real settings remain unchanged. |
| V1-02 Match-length wording lacked a test | Fixed. The unsupported four-to-six-minute and five-minute wording remains absent. |
| V1-03 Fixed 60 Hz lacked coverage | Fixed. Its command proves 60 updates advance one active second. |
| V1-04 Same-seed behavior was outside its command | Fixed. Its command compares repeated and different seeds. |
| V2-01 Phone targets were below 44 × 44 | Fixed. Every visible target across normal routes and the 404 is at least 44 × 44 CSS px. |
| V2-02 Required phone text was too small | Fixed. Required copy computes to at least 17 px and 200% text has no horizontal overflow. |
| V2-03 The 404 omitted standard structure | Fixed. The live HTTP 404 includes the standard header, navigation, footer, and return action. |
| V3-01 Mute behavior lacked coverage | Fixed. The tagged command compares observable unmuted and muted tone starts. |
| V3-02 Flecks were absent and effects lacked behavior coverage | Fixed. Flecks ship, and the command observes both flecks and shake on and off. |
| V3-03 Edge assist lacked coverage | Fixed. Its deterministic command proves the automatic edge jump. |
| V4-01 Movement-effects omitted shake | Fixed. Its command now measures changing transforms when enabled and a fixed transform when disabled. |
| V4-02 Local-only stopped at startup | Fixed. Its request log now spans match end, reset, and demo exit. |

V5-01 is newly identified from the axe manual-review queue and direct contrast
measurement; it is not a regression of an earlier finding.

## Other verification

### Build, tests, and performance

- `npm ci`: passed; 61 packages installed and 0 vulnerabilities.
- `npm run check`: passed.
- Unit tests: 8 passed.
- Browser tests: 15 passed.
- Declared claim commands: all 17 passed separately.
- `npm audit --audit-level=moderate`: passed with 0 vulnerabilities.
- Build produced `dist/`.
- JavaScript: 32.31 kB raw, 11.17 kB gzip.
- CSS: 12.17 kB raw, 3.51 kB gzip.
- Live frame test: 59.88 fps across 89 intervals at 390 × 844 with four-times
  CPU slowdown, above the claimed 55 fps.
- Fresh mobile Lighthouse: 100 performance, 100 accessibility, 100 best
  practices, and 100 SEO; LCP 1.7 s, CLS 0, total blocking time 50 ms, and
  transfer 174,612 bytes.

### Accessibility, keyboard, and responsive behavior

- The URL verifier passed with `lang=en`, one H1, one main landmark, labelled
  buttons, image alternatives, and no console errors.
- Axe CLI reported zero violations on `/`, `/demo`, `/privacy`, and `/terms`.
  Playwright axe reported zero violations on those routes and the live 404.
- Axe left contrast and three generic container labels for manual review. The
  container labels are redundant; accessibility snapshots show that their
  child progress bars and controls retain usable names, roles, and states. The
  contrast review produced V5-01.
- Keyboard checks passed for the skip link, 4 px visible focus ring, settings
  dialog modal state, Escape close, trigger focus restoration, route-heading
  focus, and browser Back.
- Every visible control on all five checked routes measured at least 44 × 44
  CSS px. Required phone copy measured at least 17 px. At 200% text, page width
  remained 390 px with the sample action and canvas present.
- Reduced motion disabled shake and flecks and removed nonessential CSS motion.

The first axe CLI launch lacked a Chrome binary, and the second exposed a
preinstalled driver/browser mismatch. Installing ChromeDriver 145 to match the
documented bundled Chromium prerequisite resolved the test setup; the completed
audit result above is the measured result. No claim command had a prerequisite
or setup failure.

### Routes, privacy, offline, and recovery

- `/`, `/demo`, `/privacy`, and `/terms` returned 200 with their own titles,
  one H1, and one main landmark.
- `/verification-5-missing` deliberately returned HTTP 404 and showed the
  designed recovery page. The expected status is not a defect.
- All discovered same-origin links returned 200. `robots.txt` and `sitemap.xml`
  returned 200, and the sitemap lists all four public routes.
- The privacy removal action confirmed the request, removed all real game keys,
  and announced completion. Invalid saved JSON recovers to a fresh playable
  match.
- Pause, reload, and resume passed. After a successful visit, a fresh context
  registered the service worker and reloaded `/demo` offline with the sample
  banner and canvas.
- CSP, HSTS, content-type protection, referrer policy, permissions policy, and
  cross-origin opener policy are present. There are no analytics, ads,
  accounts, payment calls, remote game services, or third-party runtime assets.

External Param Factory and email destinations were identified but not opened
because they are outside this product's authorised scope. Fresh phone emulation
was used; a physical handset was unavailable. The product makes no
physical-device claim, so this does not add an untested claim. No AI step fits
this immediate local race, so the missed-leverage check found no product gap.

## Required next work

1. Raise the home-mark numeral contrast to at least 4.5:1 in both the SPA and
   standalone 404 styles.
2. Rebuild, deploy, and verify the computed contrast on all five routes.
