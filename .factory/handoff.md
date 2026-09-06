# One Screen Sprint repair 6 handoff

- Date: 2026-09-06 UTC
- Work order: `one-screen-sprint-repair-6`
- Status: **PASS — V7-01 repaired; 0 current findings and 0 untested public claims**
- Live URL: <https://one-screen-sprint.sociobot.in>
- Deployed implementation: `1c5a21ed81babaa281ef6b467963f3115f3c3302`
- Previous verification baseline: `d93277757aa2e3818cc0d3418b6d0ccb86a8b1b5`

## What changed

Demo settings were cleared by the `pagehide` cleanup path on every reload. The
old code tried to rebuild the demo namespace from `history.state`, which WebKit
does not retain reliably for that lifecycle.

The repair removes that reload-sensitive snapshot and cleanup path. The
isolated `demo:one-screen-sprint:` local-storage namespace now remains in place
while `/demo` reloads. Existing in-site exit handling still clears that
namespace on Start for real, Browser Back, Forward-to-demo reset, and direct
in-site navigation, without reading or changing the real
`one-screen-sprint:` namespace.

The `settings-persist` claim now has an outcome-based cross-engine command.
It creates fresh contexts in Chromium, Firefox, and WebKit, changes all three
settings, performs a browser-side reload, and checks the visible dialog state.
WebKit runs three independent trials. `PLAYWRIGHT_BASE_URL` can point that same
test at the live site without starting a local server.

## How to run and verify

From a clean checkout with Node 22 and npm 10:

```sh
npm ci
npx playwright install chromium firefox webkit
npx playwright install-deps firefox webkit
npm run check
npm audit --audit-level=moderate
```

`npm run check` passed after the repair:

- copy audit: 65 landing-page lines passed;
- production build: `dist/`, 31.66 kB JavaScript (10.99 kB gzip), 12.20 kB
  CSS (3.52 kB gzip);
- unit tests: 8 passed;
- Chromium browser tests: 16 passed;
- all 17 declared claim commands passed, including the separate cross-engine
  settings command;
- dependency audit: zero moderate-or-higher vulnerabilities.

The focused command also passed locally and on HTTPS:

```sh
npm run test:settings-persist
PLAYWRIGHT_BASE_URL=https://one-screen-sprint.sociobot.in npm run test:settings-persist
```

The live command passed in Chromium 145.0.7632.6, Firefox 146.0.1, and WebKit
26.0. The WebKit project completed all three fresh-context reload trials.

## Deployment and live checks

The static build was uploaded with the product-scoped static deployment helper.
The existing `sf-one-screen-sprint` application was reused. HTTPS returned 200
after the deployment. The live JavaScript asset was
`index-DCYTLjvM.js`; its SHA-256 matched `dist/`:

```text
4fe1d18b7f852623685ea5f759d7855317bfbcb9dca80005b6a7aaddbef6b8df
```

Fresh live Chromium checks found the following before scrolling:

- Job: race a friend through an obstacle course on one keyboard.
- Audience: two people together who want a short competitive game with
  readable controls and a new course each match.
- First action: **Try it with sample data**.

The desktop canvas began at 337 px in a 1000 px viewport. The fresh 390 × 844
phone page showed the action at 280 px and the game canvas from 656 px, at
scroll position zero. The live desktop sample reached the actual **Player 1
wins 3–1** end panel. The persistent demo banner remained visible. Reset demo
restored score 1–1, `Course CLUB-7`, and the sample label.

The live demo-isolation check confirmed that Browser Back preserved real saved
settings, cleared all demo keys, and that Forward started a clean sample.
Direct navigation to Privacy also cleared the demo keys.

`/opt/fleet/lib/verify-url.sh` passed on `/`, `/demo`, `/privacy`, and
`/terms`: each had its route title, `lang=en`, one H1, one main landmark,
no missing image alternatives, no unnamed button, and no load console error.
Live Playwright axe scans in Chromium, Firefox, and WebKit found no serious or
critical issue on those four routes or the designed HTTP 404.

## Earlier findings

All earlier V1–V5 findings remain covered by the passing suite: demo exit
isolation; supported duration wording; deterministic fixed-step and same-seed
coverage; 44 px phone targets; readable phone type; standard HTTP 404;
settings behavior claims; movement-effects and privacy-flow coverage; and
home-mark contrast. V7-01 is now fixed by the cross-engine reload regression.

## Scope and known limits

This is a static, local two-player browser game. It has no backend, database,
tenant, account, payment, online room, server restart, or rate-limit path; the
corresponding backend checks do not apply. No physical handset or field INP
measurement was available, and neither is publicly claimed. No product defect
or untested public claim remains.

The catalog description is the verb-first 67-byte line in
`.factory/catalog-description.txt`, copied to
`/work/.evidence/catalog-description.txt`.
