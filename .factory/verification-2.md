# Verify the two-player keyboard race

## Verdict

**FAIL — 3 findings. Untested claim count: 0.**

The game works end to end, the earlier four findings are fixed, and every
declared claim command passes. The release still misses three required mobile
and site-structure rules.

## Release checked

- Live URL: <https://one-screen-sprint.sociobot.in>
- Candidate implementation: `077fb1c000e62b91022306ddd7fda07c981d184f`
- Live evidence documentation: `4592a98707ced32df0d9f54121ff8be15e50af07`
- Documentation head received for verification:
  `44a7aed1c749973f1fdbe9e43c852dd7792daf87`
- Verification date: 2026-09-05 UTC
- Product type: static local browser game. There is no backend, tenant, room,
  database, rate limit, payment, or server restart path to test.

All 13 public files from a clean build of the candidate matched the live files
byte for byte. The deployment configuration file is correctly not public.
See `.factory/evidence/verification-2/artifact-parity.txt`.

## First screen before scrolling

- Job: race a friend through an obstacle course on one keyboard.
- Audience: two people together who want a short competitive game.
- First action: **Try it with sample data**, which loads a fixed 1–1 rematch.

In fresh browsers, the canvas was visible before scrolling at both 1440 × 1000
and 390 × 844. The desktop canvas ran from y=336.8 to y=846.0. The phone canvas
ran from y=539.7 to y=739.4. The job, audience, first action, three facts, and
game were present in the first screen.

Evidence:
`.factory/evidence/verification-2/desktop-first-screen.png` and
`.factory/evidence/verification-2/phone-first-screen.png`.

## Findings

### V2-01 — Medium — Required phone touch targets are smaller than 44 × 44 pixels

At a 390 × 844 touch viewport, important actions do not meet the attached
44 × 44 CSS pixel minimum. Examples include:

- **Reset demo:** 99.58 × 36 pixels.
- **Start for real:** 84.53 × 36 pixels.
- **Demo** in the header: 34.66 × 19.34 pixels.
- The home wordmark: 37 × 37 pixels.
- **Terms** in the footer: 39.8 × 21.06 pixels.

The eight game-control buttons do meet the requirement at 69.25 × 44 pixels.
No action was blocked, but the smaller navigation and demo controls fail the
explicit accessibility and design contracts. Axe does not test this factory
minimum.

Evidence: `.factory/evidence/verification-2/touch-targets.json`.

### V2-02 — Medium — Essential phone text is below the required body size

The attached design contract requires body text of at least 16 CSS pixels on
the web and at least 17 points on mobile. At 390 × 844, the audience text is
15.68 pixels, the required three facts are 12 pixels, the sample-action
explanation is 11.52 pixels, and the game goal and fixed-step line are 10.88
pixels. These are required instructions and facts, not decorative labels.

The page still works at 200% text size with no horizontal overflow. That does
not remove the undersized default text finding.

Evidence: `.factory/evidence/verification-2/mobile-type-size.json` and
`.factory/evidence/verification-2/phone-text-200.png`.

### V2-03 — Low — The live 404 omits the standard header and footer content

The missing route correctly returns HTTP 404 and has a designed recovery page.
It does not use the required site skeleton. Its header has the home link but no
standard navigation. Its footer only says “Privacy · Terms · Version 1.0.0”; it
omits the product one-line description and “Built by Param Factory.”

Evidence: `.factory/evidence/verification-2/404-structure.json`,
`.factory/evidence/verification-2/designed-404.png`, and
`.factory/evidence/verification-2/404-headers.txt`.

## Earlier findings

| Earlier finding | Current disposition | Evidence |
| --- | --- | --- |
| V1-01 Browser Back kept demo data | Fixed. Back removed all demo keys, preserved the real setting, and Forward started a clean sample. | `.factory/evidence/verification-2/demo-back-navigation.json` |
| V1-02 Untested match-length promise | Fixed. The four-to-six-minute and five-minute promises are gone. The tested 75-second round boundary remains. | Current live copy, README, and `round-limit` command |
| V1-03 Fixed 60 Hz claim lacked coverage | Fixed. Sixty deterministic updates advance the active clock by exactly one second. | `fixed-60hz-simulation` command |
| V1-04 Same-seed behavior was outside its command | Fixed. The `fresh-course` command checks repeated same-seed geometry and a different seed. | `fresh-course` command |
| Earlier phone first-screen visibility | Fixed. The live canvas is visible before scrolling at 390 × 844. | `.factory/evidence/verification-2/phone-first-screen.png` |
| Earlier live 404 status | Fixed. The designed missing page returns HTTP 404. | `.factory/evidence/verification-2/404-headers.txt` |
| Earlier phone game-control size | Fixed for all eight game buttons. Each measures 69.25 × 44 pixels. | `.factory/evidence/verification-2/live-results.json` |

## Declared claim commands

From a detached clean checkout of `077fb1c`, `npm ci` succeeded with zero
vulnerabilities. `npm run verify:claims` ran all 14 command strings separately.

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

The live page and README were checked against the registry. No missing,
false, incomplete, or untested public claim was found. Untested claim count is
zero.

## Game and demo checks

- The one-click sample opened `CLUB-7` at 1–1 in round 3.
- The sample label stayed visible during play and on the end screen.
- Holding `D` and `ArrowRight` moved both players from 6/11 percent to 40/44
  percent.
- The deterministic sample reached **Player 1 wins 3–1**.
- Reset restored `CLUB-7`, 1–1, and round 3 of 5.
- Start for real and Browser Back removed all demo keys without changing the
  saved real setting.
- A separate real match reached active play and ended at **Player 1 wins 3–0**
  on `JUMP-13`.
- Phone touch input moved Player 1 from 6 to 40 percent.
- Pause, reload, resume, replay, new-course reset, corrupt-storage recovery,
  fall recovery, the 75-second leader boundary, and tie extension passed.

The two players use independent controls in one local browser. Online clients
and room persistence do not apply because the product has no online mode.

Run evidence:

- `.factory/evidence/verification-2/live-results.json`
- `.factory/evidence/verification-2/desktop-demo-match-end.png`
- `.factory/evidence/verification-2/real-match-end.png`
- `.factory/evidence/verification-2/real-match.webm`
- `.factory/evidence/verification-2/phone-demo-touch.png`

## Clean build and automated checks

- `npm run check`: pass.
- Copy audit: 65 lines passed.
- Build: pass; `dist/` created.
- JavaScript: 31.59 KB raw, 10.88 KB gzip.
- CSS: 11.50 KB raw, 3.43 KB gzip.
- Unit tests: 6 passed.
- Browser tests: 11 passed.
- All 14 declared claim commands: passed separately.
- `npm audit --audit-level=moderate`: 0 vulnerabilities.
- Local and live `/opt/fleet/lib/verify-url.sh`: pass, with no console errors.
- Playwright axe on `/`, `/demo`, `/privacy`, `/terms`, and the 404: 0
  violations on each route.

Playwright 1.58.2 and its supplied Chromium were available in the clean setup.
Lighthouse required that Chromium path to be set explicitly before measurement;
the completed measurement passed.

## Accessibility, privacy, routes, and recovery

- The skip link works and has a visible 4-pixel blue focus outline.
- Settings opens from the keyboard, outside controls remain inert, Escape
  closes it, and focus returns to Settings.
- SPA navigation and browser Back move focus to the route H1.
- Reduced-motion preference is detected; CSS and canvas effects have static
  fallbacks.
- Text at 200% has no horizontal overflow at 390 pixels.
- All requests during the demo flow were same-origin. There are no analytics,
  ads, accounts, payments, external runtime assets, or AI calls.
- The privacy delete action removes saved real match and settings after
  confirmation. Invalid saved JSON recovers to a new match.
- `/`, `/demo`, `/privacy`, and `/terms` return 200 with unique titles, one H1,
  and one main landmark.
- Every discovered same-origin link returns 200. External and mail links were
  identified but not opened because they are outside this product scope.
- The deliberate missing route returns the expected HTTP 404. The status is
  not a defect; V2-03 concerns only its missing standard structure.
- Security headers include CSP, HSTS, content-type protection, referrer policy,
  permissions policy, and cross-origin opener policy.
- The service worker updated successfully, then `/demo` reloaded offline with
  the game and sample banner visible.

No AI feature is expected for this immediate local race, so there is no missed
AI step. Original Canvas art and generated supporting-image provenance are
recorded in `.factory/design.md` and disclosed in the footer.

## Performance

Fresh mobile Lighthouse scores were performance 99, accessibility 100, best
practices 100, and SEO 100. LCP was 1.732 seconds, CLS was 0, total blocking
time was 79 ms, and transfer was 174,213 bytes. INP is unavailable without
user-field data.

The live frame sample measured 59.88 rendered frames per second across 89
intervals at 390 × 844 with four-times CPU slowdown. This passes the published
55 fps claim. It is a reproducible Chromium result, not a physical-phone claim.

Evidence: `.factory/evidence/verification-2/lighthouse.report.json` and
`.factory/evidence/verification-2/live-results.json`.

## Required next work

1. Make every phone link, button, and control at least 44 × 44 CSS pixels.
2. Raise required phone body and instruction text to the documented minimum.
3. Give the 404 the standard header navigation and complete footer content.
4. Rebuild, deploy, and repeat independent verification.
