# One Screen Sprint

Race a friend through a 75-second obstacle course on one keyboard. One Screen
Sprint is for two people in the same room; the first player to win three rounds
takes a best-of-five match.

[Play the sample match](https://one-screen-sprint.sociobot.in/demo) or open the
[live game](https://one-screen-sprint.sociobot.in/).

## Play

- Player one: `A` and `D` move, `W` jumps or grapples, and `S` dashes.
- Player two: arrow left and right move, arrow up jumps or grapples, and arrow
  down dashes.
- Hold the jump key near a ring to grapple. Reach the checked flag first.
- A round lasts at most 75 seconds. If time ends, the player farther right wins.
- Falling returns a player to their latest platform.

Each match has a visible seed and a deterministic generated course. Reusing a
seed repeats its course; a new match makes different course geometry. The
settings include mute, movement effects, and edge assist. Settings and a paused
match persist in local browser storage.

The game uses a fixed 60 Hz simulation. The browser claim test measures at least
55 rendered frames per second at a four-times CPU slowdown and a 390 × 844
viewport. Actual frame rate still depends on the device and browser.

## Sample and privacy

The one-click sample starts at a realistic 1–1 score on course `CLUB-7`. Its
banner remains visible, and Reset demo restores that starting point. Demo keys
begin with `demo:one-screen-sprint:`. Leaving demo removes those keys and does
not change the real `one-screen-sprint:` namespace.

There are no accounts, ads, analytics, remote opponents, or third-party runtime
requests. The game works offline after its first successful visit. See
[`.factory/demo.md`](.factory/demo.md), the in-product Privacy page, and
[`.factory/claims.json`](.factory/claims.json) for exact test coverage.

## Run from a clean checkout

Prerequisites: Node.js 22 and npm 10.

```sh
npm ci
npm run dev
```

Open `http://localhost:5173`. Use `/demo` for the isolated sample.

## Test and build

```sh
npm run check
```

This runs the copy audit, TypeScript production build, model tests, Playwright
browser tests, accessibility checks, claim checks, and offline reload check.
Playwright 1.58.2 is pinned. Its Chromium browser must be installed when the
worker image does not provide it.

Individual commands:

```sh
npm run audit:copy
npm run test:unit
npm run test:browser
npm run test:claims
npm run build
```

The static output is written to `dist/`. Initial JavaScript and CSS gzip sizes
are printed by Vite during the build.

## Deploy

Build with `npm ci && npm run build`, then deploy the contents of `dist/` to the
product’s static host. `public/staticwebapp.config.json` supplies the fallback,
404 page, and security headers. Deployment infrastructure, DNS, and billing are
outside this repository.

## Project structure

- `src/model.ts`: deterministic course generation and fixed-step rules.
- `src/game.ts`: Canvas 2D rendering, keyboard/touch input, audio, and frame loop.
- `src/app.ts`: routes, demo sandbox, settings, persistence, and page content.
- `tests/`: browser, accessibility, privacy, offline, and claim checks.
- `.factory/`: brief, visual thesis, claims, sample contract, and handoff.

## License

MIT. See [LICENSE](LICENSE).
