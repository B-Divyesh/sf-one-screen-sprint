# One Screen Sprint handoff

- Date: 2026-09-05 UTC
- Work order: `one-screen-sprint-repair-1`
- Live URL: <https://one-screen-sprint.sociobot.in>
- Artifact: static two-player browser game
- Deployed implementation SHA: `077fb1c000e62b91022306ddd7fda07c981d184f`
- Repair documentation (claims, README, demo) SHA:
  `74fbe366f1900a1de7d4c16ed6a8db7253da6acf`
- Deployment: existing `sf-one-screen-sprint` static app; final deployment ID
  `189e4cb1-a5c7-4b24-9e66-0ceaa93b4edc`

## What was repaired

The game remains a local two-player dash-and-grapple race for two people at one
keyboard. The first action is **Try it with sample data**, which starts the
fixed 1–1 `CLUB-7` rematch.

The four independent-verification findings are resolved:

1. **V1-01 Demo data on Browser Back:** demo keys now clear on route exits,
   History Back/Forward, direct in-site navigation, and page hide. A demo reload
   restores only its own history-entry sample. Settings now save at form submit,
   before the dialog closes, so a delayed close event cannot recreate a demo key
   after Back. The regression saves real and demo settings, resets the sample,
   uses Back, checks the namespace is empty and real settings are unchanged,
   then checks Forward begins a clean sample.
2. **V1-02 Match duration claim:** removed the unmeasurable “five minutes” and
   “usually four to six minutes” promises. The exact, already tested public
   boundary remains: a round lasts at most 75 seconds.
3. **V1-03 Fixed 60 Hz simulation:** added the
   `fixed-60hz-simulation` declared claim. Its outcome test starts a race and
   proves sixty simulation updates advance the race clock by one second.
4. **V1-04 Same-seed determinism:** the declared `fresh-course` test now proves
   both that the same seed reproduces the complete course and that a different
   seed changes its platform geometry.

`npm run check` now includes the declared-claim runner, so the ordinary quality
gate executes every command listed in `.factory/claims.json`.

## Earlier checks still passing

`.factory/review-history.md` has no inherited report before the first release.
The earlier implementation-history checks remain current: the phone first
screen shows the canvas before scrolling, the designed missing route returns a
real HTTP 404, and the browser suite still exercises the 44 px on-screen phone
controls. The current live checks below reconfirm the first two outcomes.

## Verification

From the documented clean setup (`npm ci`), the final implementation passed:

- `npm run check`: copy audit (65 lines), production build, 6 unit tests, 11
  browser tests, and all 14 declared claim commands run separately.
- Production build: `dist/` created; JavaScript is 10.88 KB gzip and CSS is
  3.43 KB gzip.
- `/opt/fleet/lib/verify-url.sh` locally and against the live HTTPS page: 200,
  no console errors, title/language/H1/main present, and no unlabeled buttons
  or missing image alternatives.
- `npx @axe-core/cli` against local and live pages: 0 violations. The worker
  initially lacked a Chrome/ChromeDriver pair, so the documented matching
  browser prerequisite was installed before this check.
- Live routes `/`, `/demo`, `/privacy`, and `/terms` return 200. A missing
  route returns the expected designed HTTP 404. CSP, referrer policy,
  content-type protection, permissions policy, and cross-origin opener policy
  are live.

Fresh live browser contexts checked the actual deployed asset
`index-BATKxF3i.js`:

- Desktop (1440 × 1000): job “Race a friend on one keyboard”, audience, first
  action, and the full canvas were visible before scrolling (canvas y=336.8 to
  846.0).
- Phone (390 × 844): the same job, audience, first action, and canvas were
  visible before scrolling (canvas y=539.7 to 739.4).
- The one-click sample kept its banner visible. Reset restored score 1–1 and
  the default mute setting. Browser Back removed every `demo:one-screen-sprint:`
  key, Forward started a clean sample, and Start for real also left no demo key.
  The saved real setting was byte-for-byte unchanged.
- A fresh real keyboard run used edge assist, reached active play, and ended at
  **Player 1 wins 3–0**. No page or console errors occurred.

The existing throttled-Chromium `60-fps` claim remains part of the 14-command
claim run. It measures at least 55 rendered fps at 390 × 844 with four-times
CPU slowdown; the new claim separately covers the fixed simulation step.

## Privacy, scope, and deployment

There are no accounts, analytics, ads, payment flows, or backend. The product
has no paid offer, so no billing-registration metadata applies. It remains a
single static deployment with browser local storage only; no volume, replica,
or backend configuration changed.

`.factory/catalog-description.txt` is a 67-byte, verb-first description and
was copied byte-for-byte to `/work/.evidence/catalog-description.txt`.

## Known limits

- The frame-rate claim is a reproducible throttled Chromium measurement, not a
  physical mid-range phone measurement.
- Completion and replay targets are not measured in production because the
  game intentionally has no analytics.
- Online matchmaking, chat, accounts, public scores, ads, payments, and
  user-created courses remain explicit non-goals.
