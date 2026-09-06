# One Screen Sprint verification 6 handoff

- Date: 2026-09-06 UTC
- Work order: `one-screen-sprint-verify-6`
- Status: **PASS — 0 findings and 0 untested public claims**
- Live URL: <https://one-screen-sprint.sociobot.in>
- Reviewed implementation: `d0f7313d5af0454d84c5a2936f9754fb2b25ca9b`
- Documentation baseline: `9f7e2e48f13eb4bd920047ff1c3ce28dba78d9ab`

## What was verified

Fresh desktop and phone browsers showed the keyboard race on the first screen.
The one-click `CLUB-7` sample ran from 1–1 through the actual Player 1 3–1 end
screen, retained its sample banner, reset to round 3, and discarded demo keys
when leaving. Both keyboard players moved together; phone touch input moved
player one. Privacy deletion, pause/reload recovery, offline reload, settings,
keyboard dialog behavior, routes/legal pages, designed 404, and a 59.88 fps
live four-times-throttled frame sample passed.

The candidate clean checkout passed `npm ci`, `npm run check`, and
`npm audit --audit-level=moderate`: 8 unit tests, 16 browser tests, all 17
declared claim commands, copy audit, build, and audit. Live shell and asset
hashes match the candidate build. Playwright axe found zero violations across
the app routes and 404; the URL verifier found no console or baseline semantic
errors.

## How to verify

```sh
npm ci
npm run check
npm audit --audit-level=moderate
```

Open `/demo` for the isolated sample. Evidence is in
`.factory/evidence/verification-6/`; the full report is
`.factory/verification-6.md`.

## Known gaps

No product defects remain. Physical-device and field-performance measurements
are unavailable and are not claimed. This static local game has no backend,
tenant, room, database, health, restart, or rate-limit behavior to verify.
