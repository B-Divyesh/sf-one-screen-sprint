# Verify the two-player keyboard race

## Verdict

**FAIL — 2 low-severity findings. Untested claim count: 2.**

The live game works end to end and all 17 declared claim commands exit
successfully. Two commands do not test the full public claims assigned to them,
so the release cannot pass the claims contract.

## Release checked

- Live URL: <https://one-screen-sprint.sociobot.in>
- Candidate implementation and deployed runtime:
  `6584718359bf7ca6daff94c7c3b9ff8126e7c82b`
- Documentation and claim-test head received:
  `bb74ec971a6398330588d8a3bd194224b6471b7b`
- Verification date: 2026-09-06 UTC
- Product type: static local browser game

A clean build at the documentation head produced the same 13 public files as
the live site, byte for byte. Product build inputs are unchanged from the
implementation SHA. Later commits contain claim tests, evidence, and reports.
See `.factory/evidence/verification-4/artifact-parity.txt`.

There is no backend, database, tenant, account, online room, payment path, or
server-side rate limit. Tenant isolation, server restart persistence, health,
429, and independent online-client checks do not apply.

## First screen before scrolling

- Job: race a friend through an obstacle course on one keyboard.
- Audience: two people together who want a short competitive game.
- First action: **Try it with sample data**, which loads a fixed 1–1 rematch.

Fresh desktop and phone Chromium contexts showed the job, audience, action,
three facts, and game before scrolling. The game occupied y=336.8–846.0 in a
1440 × 1000 desktop viewport and y=614.8–814.5 in a 390 × 844 phone viewport.

Evidence: `desktop-cold.png`, `phone-cold.png`, and `live-results.json` in
`.factory/evidence/verification-4/`.

## Findings

### V4-01 — Low — The movement-effects command does not test screen shake

The public claim says movement effects add **screen shake and directional paper
flecks** during a dash, and that the setting disables both. Its declared command
is:

```text
npm run test:browser -- --grep=@claim:movement-effects
```

That tagged browser test counts paper-fleck `fillRect` calls with effects on and
off. It never observes the Canvas transform or otherwise asserts screen shake.
An untagged unit test covers shake, but the exact declared claim command skips
it. The claim is therefore incompletely tested.

The shipped behavior appears correct: an independent live probe observed eight
nonzero shake transforms during an enabled dash and none when effects were
disabled. This confirms runtime behavior, but it does not make the declared
claim command complete. Evidence:
`.factory/evidence/verification-4/settings-behavior.json`.

Required repair: make the tagged claim test assert enabled shake and disabled
shake as well as flecks, or split the statement into complete declared claims.

### V4-02 — Low — The local-only command does not cover the whole demo flow

The public privacy claim says the game sends no game or identity data to another
origin. The attached claims contract requires privacy request logging during
the whole demo flow. Its tagged browser test changes one setting, starts the
sample, waits 500 ms, and stops. It never reaches a round end, match end, reset,
or exit, so a later request would not fail the command.

The independent live run did log requests through a complete 3–1 sample match,
reset, and exit, and found no cross-origin request. The behavior is correct in
this candidate, but the declared regression command remains incomplete.
Evidence: `.factory/evidence/verification-4/live-results.json`.

Required repair: keep request recording active through the deterministic match
end, reset, and demo exit in the tagged `local-only` test.

## Declared claim commands

A fresh remote checkout at `bb74ec9` used Node.js 22.23.2, npm 10.9.8, and the
pinned Playwright 1.58.2. `npm ci`, `npm run check`, and
`npm audit --audit-level=moderate` completed successfully. The claim verifier
ran all 17 command strings separately.

| Claim | Command result | Coverage result |
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
| `movement-effects` | Pass | Incomplete; see V4-01 |
| `edge-assist` | Pass | Complete |
| `key-rollover` | Pass | Complete |
| `demo-isolated` | Pass | Complete |
| `local-only` | Pass | Incomplete; see V4-02 |
| `offline-reload` | Pass | Complete |
| `60-fps` | Pass | Complete |
| `refresh-recovery` | Pass | Complete |

Build and test evidence is in
`.factory/evidence/verification-4/clean-results.txt`.

## Game and sample checks

- The one-click sample opened `CLUB-7` at 1–1 in round three.
- Both keyboard sides moved at once: Player 1 advanced from 6% to 39%, and
  Player 2 advanced from 11% to 39%.
- With edge assist enabled and no jump key, the deterministic sample reached
  **Player 1 wins 3–1**. The persistent sample label remained visible.
- Reset restored `CLUB-7`, 1–1, and round three. Browser Back cleared demo keys
  and preserved the pre-existing real settings value.
- The end screen offered both a new course and a replay. The restart claim
  verified that a new course resets score, round, and timer.
- Phone touch moved Player 1 from 6% to 42%.
- Mute produced zero tones; the matched unmuted path produced four tone starts.
  Flecks and shake appeared with effects enabled and disappeared when disabled.
- Unit boundary checks covered the 75-second leader result, tie extension,
  jump, grapple, dash, and fall recovery.

The recorded run is
`.factory/evidence/verification-4/sample-match.webm`; its end screen is
`sample-match-end.png` in the same directory.

## Earlier finding disposition

| Earlier finding | Current disposition |
| --- | --- |
| V1-01 Browser Back kept demo data | Fixed. Back cleared demo keys, Forward starts clean, and real settings remain unchanged. |
| V1-02 Untested match-length promise | Fixed. The untested four-to-six-minute and five-minute wording remains absent. |
| V1-03 Fixed 60 Hz lacked coverage | Fixed. The declared unit command verifies 60 updates equal one active second. |
| V1-04 Same-seed behavior was outside its command | Fixed. The command compares a repeated seed and a different seed. |
| V2-01 Phone targets were below 44 × 44 | Fixed. Every visible target on all routes and the 404 measured at least 44 × 44 CSS pixels. |
| V2-02 Required phone text was too small | Fixed. Required selectors compute to 17 px; 200% text has no horizontal overflow. |
| V2-03 The 404 omitted standard structure | Fixed. The deliberate HTTP 404 has the standard header, navigation, footer, and return action. |
| V3-01 Mute behavior lacked a claim test | Fixed. Its tagged browser command compares observable tone starts. |
| V3-02 Flecks were absent and effects lacked full coverage | Runtime fixed. Flecks and shake work, but the current claim command still omits shake; see V4-01. |
| V3-03 Edge assist lacked a claim test | Fixed. Its tagged deterministic command proves an automatic edge jump without jump input. |

Earlier phone first-screen visibility, true 404 status, and phone-control fixes
also remain verified.

## Accessibility, routes, privacy, and recovery

- Playwright axe found zero violations on `/`, `/demo`, `/privacy`, `/terms`,
  and the 404. The live URL verifier found one H1, a main landmark, `lang=en`,
  image alternatives, labelled buttons, and no console errors.
- Keyboard checks covered the skip link, a visible 4 px focus outline, dialog
  open and Escape close, focus return, route-heading focus, and browser Back.
- Reduced motion disabled paper flecks. CSS and source inspection also disable
  nonessential movement and shake.
- All normal routes returned 200 with unique titles. The designed missing page
  returned HTTP 404. Its self-targeting skip link also retains that expected
  status; this is not a defect.
- All normal same-origin links returned 200. The only external destinations are
  the declared Param Factory link and two `mailto:` contacts.
- The privacy action removed real saved settings and match data after explicit
  confirmation. Invalid saved JSON recovered to a new playable match.
- Pause, reload, and resume worked. The service worker updated, then `/demo`
  reloaded offline with its banner and canvas.
- Security headers include CSP, HSTS, content-type protection, referrer policy,
  permissions policy, and cross-origin opener policy.

Detailed route, link, focus, and privacy results are in
`.factory/evidence/verification-4/site-checks.json`.

## Performance and limits

Fresh mobile Lighthouse scored 100 performance, 100 accessibility, 100 best
practices, and 100 SEO. LCP was 1.77 seconds, CLS was 0, total blocking time was
61 ms, and transfer size was 174,612 bytes. The live frame sample measured
59.88 fps across 89 intervals at 390 × 844 with four-times CPU slowdown.

JavaScript was 32.31 kB raw and 11.17 kB gzip. CSS was 12.17 kB raw and 3.51 kB
gzip. No third-party runtime request or console error occurred.

Fresh Chromium phone emulation was used; a physical handset and field INP data
were not available. The product makes no physical-device or field-data claim.
No AI feature is appropriate for this immediate local race.

## Required next work

1. Extend the tagged movement-effects command to assert screen shake on and off.
2. Extend the tagged local-only command through match end, reset, and demo exit.
3. Re-run all 17 claim commands and independent verification.
