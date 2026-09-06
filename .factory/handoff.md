# One Screen Sprint verification 7 handoff

- Date: 2026-09-06 UTC
- Work order: `one-screen-sprint-verify-7`
- Status: **FAIL — 1 finding and 0 untested public claims**
- Live URL: <https://one-screen-sprint.sociobot.in>
- Reviewed implementation: `d0f7313d5af0454d84c5a2936f9754fb2b25ca9b`
- Documentation baseline: `684251015f73962c3ca118d3756f5cb1b38cc5bc`

## What was verified

Chromium 145.0.7632.6, Firefox 146.0.1, and WebKit 26.0 each showed the game on
fresh desktop and 390 × 844 phone-sized pages. Each live sample reached the
actual Player 1 3–1 end screen, started native Web Audio after a user action,
kept its demo label, reset correctly, and restored a paused match after reload.
Both local players moved together in all three engines.

The clean Chromium gate passed the build, 8 unit tests, 16 browser tests, and
all 17 declared commands. Live route, axe, privacy, offline, 404, asset-parity,
and 59.88 fps checks passed. There is no backend or online multiplayer.

## Finding

WebKit 26.0 lost Mute, Movement effects, and Edge assist after every one of
three `/demo` reload trials. This fails `settings-persist`. Details and all
earlier finding dispositions are in `.factory/verification-7.md`.

## How to verify

```sh
npm ci
npm run check
npm audit --audit-level=moderate
```

Cross-engine evidence is under `/work/.evidence/verification-7/`. The
supplemental Firefox/WebKit runner config is stored there, outside the product
repository.

## Next step

Keep the deployed candidate unchanged. Repair demo settings reload behavior in
WebKit, add Firefox and WebKit regression coverage, deploy, and verify again.
