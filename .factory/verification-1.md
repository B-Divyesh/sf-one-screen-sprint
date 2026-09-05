# Verify the two-player keyboard race

## Verdict

**FAIL — 4 findings, including 3 public claims without complete declared-claim coverage. Untested claim count: 3.**

The game itself works end to end on the live site. The release does not meet the
factory acceptance contract because demo data survives one normal exit path and
the claim list does not fully test three statements shown to visitors.

## Release checked

- Live URL: <https://one-screen-sprint.sociobot.in>
- Candidate implementation: `7bf9d3d7da9e3508457059dec11cc98c664242a3`
- Documentation commit supplied for verification: `0865f4727c2394e9a8e7013b223833d3513a3735`
- Verification date: 2026-09-05 UTC
- Product type: static browser game; there is no backend, tenant, room, rate
  limit, database, or server-side persistence to test.

The built and live `index.html`, JavaScript, CSS, and service worker matched
byte for byte. The hashes are in
`.factory/evidence/verification-1/artifact-parity.txt`. Commits after `7bf9d3d`
change tests, evidence, and documentation, not shipped product files.

## First screen before scrolling

- Job: race a friend through an obstacle course on one keyboard.
- Audience: two people together who want a short competitive game.
- First action: **Try it with sample data**, which says it loads a fixed 1–1
  rematch.

In a fresh 1440 × 1000 desktop browser, the canvas ran from y=336.8 to y=846.0
and was fully visible before scrolling. In a fresh 390 × 844 touch browser, it
ran from y=539.7 to y=739.4 and was also fully visible. The job, audience, first
action, three facts, and game were all present on the first screen.

## Findings

### V1-01 — Medium — Browser Back does not discard demo data

Steps:

1. Open `/` in a fresh browser.
2. Choose **Try it with sample data**.
3. Change Mute sound and save it.
4. Use the browser Back button to leave `/demo`.
5. Inspect the demo storage namespace, then go Forward.

Expected: leaving demo mode removes `demo:one-screen-sprint:*` data, as the
demo contract and landing copy state.

Actual: both `demo:one-screen-sprint:game` and
`demo:one-screen-sprint:settings` remain after Back. Going Forward restores the
muted demo setting. The explicit **Start for real** link does clear the demo and
does not change real data, so the defect is limited to other exit paths.

Evidence: `.factory/evidence/verification-1/demo-back-navigation.json`.

### V1-02 — Low — The match-duration claim has no declared claim test

The first screen says “five minutes,” and the README says a full match usually
takes four to six minutes. No `.factory/claims.json` entry measures or asserts
that range. The 75-second round test does not establish typical full-match
duration.

### V1-03 — Low — The fixed 60 Hz simulation claim has no declared claim test

The live game says “Fixed 60 Hz simulation.” The `60-fps` claim measures browser
render frames with `requestAnimationFrame`; it does not assert the simulation
timestep. Source inspection shows a fixed-step loop, but the public numerical
claim is missing from the claim registry and its command set.

### V1-04 — Low — The deterministic same-seed claim is omitted by its claim command

The README calls the generated course deterministic. The declared
`fresh-course` command filters to `@claim:fresh-course`, whose test only checks
that two different seeds produce different geometry. A separate untagged unit
test checks repeat output for `CLUB-7`, but that test is skipped by the declared
claim command. The claim command is therefore incomplete.

## Game and demo results

- The one-click sample opened course `CLUB-7` at 1–1 in round 3.
- The persistent banner remained visible during active play and at the end.
- Holding `D` and `ArrowRight` together moved both players from 6/11 percent to
  41/45 percent, proving the two keyboard inputs work at the same time.
- The deterministic sample ended with **Player 1 wins 3–1** after four rounds.
- Reset demo restored course `CLUB-7`, 1–1, and round 3 of 5.
- **Start for real** removed demo keys and preserved the pre-existing real
  settings value.
- A separate fresh real game went from entry to active play to **Player 1 wins
  3–0** on course `INK-04`.
- Replay and new-course actions were present on the end screen. The declared
  restart test proved that a new course resets scores, round, and timer.
- Eight touch controls measured 69.25 × 44 CSS pixels. Holding P1 Right moved
  progress from 6 to 40 percent.

The local multiplayer design uses two control sets in one browser and has no
network rooms. Independent online clients and room persistence are not part of
this product. Both local player inputs were exercised independently and
simultaneously.

Run evidence:

- `.factory/evidence/verification-1/real-match.webm`
- `.factory/evidence/verification-1/real-match-active.png`
- `.factory/evidence/verification-1/real-match-end.png`
- `.factory/evidence/verification-1/desktop-demo-match-end.png`
- `.factory/evidence/verification-1/live-results.json`

## Declared claim commands

`npm run verify:claims` ran all 13 command strings from
`.factory/claims.json` separately. Every declared command passed:

| Claim | Result |
| --- | --- |
| `best-of-five-end` | Pass |
| `restart-reset` | Pass |
| `free-no-ads` | Pass |
| `fresh-course` | Pass, with the coverage gap in V1-04 |
| `round-limit` | Pass |
| `control-actions` | Pass |
| `settings-persist` | Pass |
| `key-rollover` | Pass |
| `demo-isolated` | Pass, but it only exits with Start for real; see V1-01 |
| `local-only` | Pass |
| `offline-reload` | Pass |
| `60-fps` | Pass, with the different simulation claim gap in V1-03 |
| `refresh-recovery` | Pass |

The three untested or incompletely declared public claims are the typical
four-to-six-minute match length, fixed 60 Hz simulation, and same-seed
determinism within the declared claim command.

## Other checks

### Clean checkout

- `npm ci`: pass; 0 vulnerabilities.
- `npm run check`: pass.
- Copy audit: 65 lines passed.
- Production build: pass; `dist/` produced.
- Initial JavaScript: 30.79 KB raw, 10.64 KB gzip.
- Initial CSS: 11.50 KB raw, 3.43 KB gzip.
- Unit tests: 6 passed.
- Browser tests: 11 passed.
- `npm audit --audit-level=moderate`: pass; 0 vulnerabilities.

### Live browser, accessibility, and privacy

- `/opt/fleet/lib/verify-url.sh`: pass after creating its required output
  directory; no console errors and valid title, language, H1, main landmark,
  image alternatives, and button names.
- `npx @axe-core/cli`: 0 violations after installing its documented matching
  Chrome/ChromeDriver prerequisite.
- Playwright axe: 0 violations on `/`, `/demo`, `/privacy`, `/terms`, and the
  404 page.
- Keyboard: skip link works; focus uses a visible 4 px blue outline; settings
  opens by keyboard, modal controls keep outside controls inert, Escape closes
  it, and focus returns to Settings.
- SPA navigation and browser Back return focus to the route H1.
- Text at 200% caused no horizontal overflow at 390 px; the primary action and
  canvas remained present.
- Reduced-motion preference was active, and the shipped CSS removes movement
  and repeated animation. The Canvas controller also checks the same media
  query before shake effects.
- All requests during the desktop demo flow were same-origin. No console errors
  occurred on normal routes. The one 404 resource console entry came only from
  deliberately loading the 404 URL and is expected.
- The privacy action removed real saved match and settings after confirmation.
- Offline reload worked after the first visit. The service worker was active,
  its update check completed, and `/demo` reloaded offline with the game and
  sample banner visible.

### Routes, links, and headers

- `/`, `/demo`, `/privacy`, and `/terms`: HTTP 200 with the correct unique
  title and one H1.
- `/verification-missing-course`: deliberate HTTP 404 with the designed page
  and a working return link. This is expected behavior, not a defect.
- Every discovered same-origin page link returned 200. `robots.txt` and
  `sitemap.xml` returned 200, and the sitemap lists all four public routes.
- External Param Factory and email links were identified but not opened because
  they are outside this product’s allowed verification scope.
- CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`, and `Cross-Origin-Opener-Policy` were present.

### Performance

Fresh mobile Lighthouse scores were performance 99, accessibility 100, best
practices 100, and SEO 100. LCP was 1.74 seconds, CLS was 0, total blocking time
was 89.5 ms, and transfer was 173,968 bytes.

The live frame test measured 59.88 fps across 89 intervals at 390 × 844 with a
four-times CPU slowdown. This proves the published throttled-Chromium claim. It
does not replace a physical mid-range phone measurement, and the product does
not claim that such a measurement was performed.

## Earlier findings and limits

`.factory/review-history.md` says there were no inherited review or
verification findings. Two issues visible in implementation history were
checked directly:

- Mobile first-screen game visibility: fixed and verified at 390 × 844.
- True 404 status and design: fixed and verified with HTTP 404.
- The later phone-control regression test: passes locally and in the live touch
  run.

Known scope limits are unchanged: physical-phone frame measurement and real
completion/replay analytics were not performed. The latter is intentional
because this privacy-first game has no analytics. No backend checks apply.

## Required next work

1. Clear the demo namespace when navigation leaves demo through Back, Forward,
   address-bar navigation, or another in-product route.
2. Add declared claim entries and tagged tests for match duration, the fixed
   simulation step, and same-seed course determinism; otherwise remove or
   narrow those public statements.
3. Re-run all 13 existing claim commands, the new claim commands, and this
   verification after deployment.
