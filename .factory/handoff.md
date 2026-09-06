# One Screen Sprint verification 5 handoff

- Date: 2026-09-06 UTC
- Work order: `one-screen-sprint-verify-5`
- Status: **FAIL — one low-severity accessibility finding**
- Untested claim count: **0**
- Live URL: <https://one-screen-sprint.sociobot.in>
- Runtime implementation: `6584718359bf7ca6daff94c7c3b9ff8126e7c82b`
- Documentation and tests reviewed: `f9a178b0e96989240e69bc0be7b237856319b560`
- Report: `.factory/verification-5.md`

## Outcome

Independent verification found one issue. The 15.2 px “2” in the home mark is
`#FFF8E9` on `#D94A3D`, which measures 3.973:1 instead of the required 4.5:1.
It appears on every normal route and the designed 404. The home link still has
an accessible name and no task is blocked, so severity is low.

No product code was changed in this work order. The report and verification
evidence are the only repository changes.

## What passed

- Fresh-clone `npm ci`, `npm run check`, and dependency audit.
- 8 unit tests and 15 browser tests.
- All 17 declared claim commands, each run separately with complete coverage.
- Deterministic live sample from 1–1 entry to a 3–1 end screen.
- Persistent sample label, reset to `CLUB-7` at 1–1, clean demo exit, and no
  change to real saved data.
- Full-flow same-origin request check through match end, reset, and exit.
- Movement flecks and shake on/off, mute, edge assist, key rollover, settings
  persistence, pause/reload recovery, invalid storage, and privacy deletion.
- Fresh desktop and 390 × 844 phone contexts, keyboard focus, 200% text reflow,
  44 px targets, reduced motion, offline reload, links, legal pages, and the
  designed HTTP 404.
- URL verifier and zero axe violations on normal routes and the 404.
- 13-file build/live SHA-256 parity and no console errors.
- 59.88 fps at four-times CPU slowdown.
- Lighthouse 100/100/100/100; LCP 1.7 s, CLS 0, and 50 ms total blocking time.

## Evidence

Evidence is in `.factory/evidence/verification-5/`, including the live run
JSON, contrast measurements, clean screenshots, full sample recording, end
screen, axe output, URL-verifier output, and Lighthouse report.

## Next step

Adjust the foreground or background of `.wordmark-number` in
`src/style.css` and `public/404.css` to reach at least 4.5:1. Rebuild, deploy,
and recheck all five routes. Physical-phone testing was unavailable; fresh
phone emulation passed and there is no physical-device public claim.
