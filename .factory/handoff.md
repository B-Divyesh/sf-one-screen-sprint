# One Screen Sprint handoff

- Date: 2026-09-05 UTC
- Work order: `one-screen-sprint-builder-1`
- Live URL: <https://one-screen-sprint.sociobot.in>
- Artifact class: `browser-game`
- Deployed implementation SHA: `7bf9d3d7da9e3508457059dec11cc98c664242a3`
- Verification-only test SHA: `cae5adc`
- Handoff and evidence snapshot SHA: `a55248c`

## What shipped

- A complete local two-player dash-and-grapple race in Canvas 2D.
- Deterministic procedural courses with a visible seed, six platforms, four
  grapple rings, fall recovery, a 75-second boundary, and first-to-three
  best-of-five scoring.
- A fixed 60 Hz simulation with interpolated rendering, hidden-tab pause, delta
  clamping, keyboard rollover, phone controls, mute, movement-effect control,
  edge assist, and synthesized audio after a user gesture.
- Start, countdown, active race, pause, round result, match result, replay, and
  new-course states. The complete real-entry browser run ends at 3–0.
- Local persistence for settings and paused matches. Invalid saved JSON recovers
  to a new match.
- A one-click `/demo` sample labelled “Weekend rematch · course CLUB-7”. It
  starts at 1–1, uses only `demo:one-screen-sprint:` keys, keeps its banner
  visible, resets to the sample, and clears itself when the player leaves demo.
- Offline reload after the first successful visit through a same-origin service
  worker.
- `/privacy`, `/terms`, and a styled true HTTP 404 page. All routes have one H1,
  route-specific titles, landmarks, keyboard focus handling, and security
  headers.
- Original procedural game graphics, synthesized tones, and a generated
  screen-print supporting image. Prompt and provenance are in
  `.factory/design.md` and `assets/src/race-poster.png.json`.
- No account, analytics, ads, payment, external runtime assets, or backend.

## Verification

Clean checkout at `7bf9d3d7da9e3508457059dec11cc98c664242a3`:

```sh
npm ci
npm run check
```

Result: dependency audit found 0 vulnerabilities; copy audit passed 65 lines;
production build passed; 6 model tests passed; 10 browser tests passed. The
later phone-control-only test also passed, bringing the current suite to 11
browser tests.

Every command in `.factory/claims.json` was then run separately with
`npm run verify:claims`. All 13 declared claim commands passed. This includes
the deterministic end screen, restart state, new course geometry, 75-second
boundary, jump/grapple/dash/fall outcomes, key rollover, setting persistence,
demo isolation, same-origin requests, offline reload, throttled frame rate, and
reload recovery.

Other completed checks:

- `npm audit`: 0 vulnerabilities.
- `npm run build`: 10.64 KB JS gzip and 3.43 KB CSS gzip; `dist/` produced.
- Full real-entry run: three played rounds to a 3–0 match end.
- Final live demo run: two played rounds from 1–1 to a 3–1 match end.
- Live Reset demo restored 1–1, round 3, course `CLUB-7`.
- Live Start for real left the pre-existing real namespace unchanged and
  removed demo keys.
- Fresh public desktop: 1440 × 1000, game canvas visible before scroll.
- Fresh public phone: 390 × 664, game canvas visible before scroll; touch
  controls use a grid and measured at least 44 × 44 px.
- Live console: no errors on `/`, `/demo`, `/privacy`, or `/terms`.
- Live axe: no serious or critical findings on all real routes or the 404.
- Live routes: `/`, `/demo`, `/privacy`, and `/terms` return 200. An unknown
  URL returns 404 and shows the designed recovery page. Its 404 network console
  entry is expected, not an application error.
- Link crawl: all same-origin and Param Factory links returned 200; contact
  links are explicit `mailto:` links.
- Live security headers: CSP, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, and `Cross-Origin-Opener-Policy` present.
- Live mobile Lighthouse: performance 100, accessibility 100, best practices
  100, SEO 100; LCP 1.70 s, CLS 0, total transfer 173,944 bytes.
- Render claim: median at least 55 fps with a four-times Chromium CPU slowdown
  at 390 × 844. The simulation itself remains fixed at 60 Hz.

Evidence is in `.factory/evidence/`, especially:

- `live-final/desktop-cold.png`
- `live-final/phone-cold.png`
- `live-final/match-end.png`
- `live-final/axe-and-run.json`
- `live-final/browsers.json`
- `live-final/links.json`
- `live-final/404-headers.txt`
- `live-final/lighthouse.report.html`
- `live-final/verify.json`

The catalog description was copied byte-for-byte to
`/work/.evidence/catalog-description.txt` and is 67 bytes including its newline.

## Deployment

`dist/` was deployed with the fleet static deployment script to the existing
product-owned `sf-one-screen-sprint` Azure Static Web App in `centralus`. The
custom domain is Ready over managed HTTPS. The app is static and uses no server,
database, secrets, environment values, or extra replica.

## Known gaps and next steps

- The 60 fps check uses Chromium’s four-times CPU slowdown at a phone viewport,
  not a lab measurement on physical mid-range phone hardware. The on-page frame
  meter makes device-specific performance visible.
- Offline play begins only after one successful online visit, as stated.
- Touch controls work and are tested, but two-player phone ergonomics are not a
  v1 promise; the intended input remains one physical keyboard.
- Success measures need real aggregate session data. No analytics were added,
  so completion and replay rates are not collected in this privacy-first build.
- Online multiplayer, chat, accounts, public scores, guns, user-created levels,
  payments, and ads remain intentional non-goals from the brief.
