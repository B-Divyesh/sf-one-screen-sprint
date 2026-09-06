# Race a friend on one keyboard — review 1

## Verdict

**PASS — 0 findings. Untested claim count: 0.**

One Screen Sprint delivers the stated job: two people together can immediately
race one another on one keyboard through a short obstacle course, finish a
first-to-three match, and start a new course without an account or network
opponent.

## Release reviewed

- Live URL: <https://one-screen-sprint.sociobot.in>
- Implementation candidate: `d0f7313d5af0454d84c5a2936f9754fb2b25ca9b`
- Documentation/report baseline: `63a405e2851bc5af3aaae38684f64ce9fc126d15`
- Review date: 2026-09-06 UTC
- Product class: static, local browser game. Backend, tenant, health, restart,
  rate-limit, room, and payment checks do not apply.

The live home document, hashed JavaScript, hashed CSS, service worker, and
standalone 404 assets had the same SHA-256 values as a detached build of the
implementation candidate.

## First screen and game run

Fresh desktop (1440 × 1000) and phone (390 × 844) browser contexts both showed
the playable canvas before scrolling.

- Job: race a friend through an obstacle course on one keyboard.
- Audience: two people together who want a short competitive game with readable
  controls and a new course each match.
- First action: **Try it with sample data**; it loads the fixed 1–1 sample
  rematch.

In a fresh desktop `/demo` context, the persistent “Demo — sample data, nothing
is saved” banner and `CLUB-7` sample were present. With edge assist enabled,
the scripted keyboard run reached the actual end panel **Player 1 wins 3–1**.
The banner remained visible. “Race another course” then reset the score to
0–0, round to 1 of 5, and timer to 75 seconds. Fresh screenshot evidence is
at `/work/.evidence/review-1-desktop-first.png`,
`/work/.evidence/review-1-phone-first.png`, and
`/work/.evidence/review-1-demo-end.png`.

An independent storage check saved a real muted setting, changed and reset demo
settings, and left demo through Privacy. The real setting was unchanged and no
`demo:one-screen-sprint:` key remained. The declared isolation command also
covered Browser Back, Forward, and direct route exit.

## Clean checks and claims

From a detached clean checkout of `d0f7313`, using Node 22.23.2, npm 10.9.8,
and the pinned Playwright 1.58.2:

```sh
npm ci
npm run check
npm audit --audit-level=moderate
```

All passed. `npm run check` passed the 65-line copy audit, production build,
8 unit tests, 16 browser tests, and then invoked every one of the 17 declared
claim commands individually. The claim runner ended with “All 17 declared
claim commands passed.” `npm audit --audit-level=moderate` reported zero
vulnerabilities. The production build is 32.31 kB JavaScript (11.17 kB gzip)
and 12.20 kB CSS (3.52 kB gzip).

All declared claims are complete and passed: `best-of-five-end`, `restart-reset`,
`free-no-ads`, `fresh-course`, `fixed-60hz-simulation`, `round-limit`,
`control-actions`, `settings-persist`, `mute-stops-tones`, `movement-effects`,
`edge-assist`, `key-rollover`, `demo-isolated`, `local-only`, `offline-reload`,
`60-fps`, and `refresh-recovery`. The live page, legal pages, README, and demo
document contained no additional public claim missing from `.factory/claims.json`.

## Accessibility, privacy, routes, and performance

- Live `/`, `/demo`, `/privacy`, and `/terms` returned 200 with route-specific
  titles, one H1, one main landmark, and zero Playwright axe violations. The
  deliberate missing route returned HTTP 404 with its designed recovery page,
  one H1, and one main landmark; this is expected, not a defect.
- The standalone `@axe-core/cli` could not start Selenium because this worker
  lacks a system Chrome binary. The repository's pinned Playwright axe
  integration, running against its installed Chromium, completed successfully
  on all routes and the 404 with zero violations.
- Fresh browser checks found no console errors. Keyboard focus, skip link,
  modal settings, Escape pause/resume, route-heading focus, reduced motion,
  corrupt-local-state recovery, and privacy deletion are covered by passing
  browser tests.
- The game made no cross-origin request during the complete sample flow. It
  reloaded offline after a successful first visit in its separate browser
  context. The live 390 × 844, four-times-CPU-throttled frame sample measured
  a 16.70 ms median interval, or 59.88 fps, above the 55 fps claim.
- Security headers include the CSP, `frame-ancestors 'none'`, referrer policy,
  and content-type protection. `robots.txt` and `sitemap.xml` list the public
  routes.

## Earlier findings

| Finding | Current disposition |
| --- | --- |
| V1-01 demo data survived Browser Back | Fixed; the passing isolation command proves Back/Forward/direct exits remove demo keys while preserving real settings. |
| V1-02 unsupported match-duration wording | Fixed; the unsupported wording remains absent. |
| V1-03 fixed 60 Hz lacked claim coverage | Fixed; the declared unit command proves 60 updates equal one active second. |
| V1-04 same-seed behavior sat outside its command | Fixed; `fresh-course` asserts repeat geometry and differing geometry. |
| V2-01 phone targets were below 44 × 44 | Fixed; browser checks scan every visible control on phone routes and 404. |
| V2-02 required phone text was too small | Fixed; tests assert at least 17 px essential text and no 200% overflow. |
| V2-03 404 lacked standard structure | Fixed; the live HTTP 404 has header, navigation, footer, and recovery action. |
| V3-01 mute lacked claim coverage | Fixed; the command probes muted and unmuted oscillator starts. |
| V3-02 flecks/effects were incomplete | Fixed; the command observes flecks and shake both enabled and disabled. |
| V3-03 edge assist lacked claim coverage | Fixed; the deterministic command proves its automatic edge jump. |
| V4-01 movement-effects omitted shake | Fixed; changing horizontal transforms are asserted. |
| V4-02 local-only ended before the full flow | Fixed; its request log spans match end, reset, and demo exit. |
| V5-01 home-mark contrast was below 4.5:1 | Fixed; the rendered-color regression checks all app routes and 404. |

## Known gaps

No product findings or untested public claims remain. Physical-handset and
field INP measurements were unavailable; neither is claimed.
