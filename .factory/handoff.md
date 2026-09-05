# One Screen Sprint verification handoff

- Date: 2026-09-05 UTC
- Work order: `one-screen-sprint-verify-3`
- Result: **FAIL — 3 low-severity findings; 3 untested claims**
- Live URL: <https://one-screen-sprint.sociobot.in>
- Implementation reviewed: `64d2f15df3a821c268e7113e6c82d4f1b5a365f8`
- Documentation head received: `7bb248e7ebdcf06cee29dac558d03d84906b89e4`
- Full report: `.factory/verification-3.md`
- Evidence: `.factory/evidence/verification-3/`

## Verification result

The game works end to end and every declared command passes. The one-click
sample reached a 3–1 end screen, kept its sample label, reset to `CLUB-7` at
1–1, cleared sample storage on exit, and did not change the real namespace. A
separate live match ended 3–0 and replay reset it correctly. The run is recorded
in `sample-match.webm`.

All seven findings from verification 1 and 2 remain fixed. Phone targets are
at least 44 × 44 pixels, required phone text is 17 pixels, 200% text has no
horizontal overflow, and the live 404 has the standard header and footer.

Acceptance still fails because three public Settings descriptions are missing
from `.factory/claims.json` and its tagged command set:

1. Mute says it stops the short tones.
2. Movement effects say they toggle shake and paper flecks. The candidate does
   not implement paper flecks.
3. Edge assist says it jumps automatically near platform edges.

The settings-persistence test proves saved checkbox state, not these three
behaviors. See V3-01 through V3-03 in the verification report.

## Checks completed

- Fresh remote checkout: `npm ci` and `npm run check` passed.
- Copy audit: 65 lines passed.
- Build: passed; `dist/` produced.
- Tests: 6 unit and 13 browser tests passed.
- All 14 declared claim commands passed separately.
- Dependency audit: 0 vulnerabilities.
- Live axe: 0 violations on all four public routes and the 404.
- Live verifier: correct baseline structure and no console errors.
- Lighthouse: 100/100/100/100; LCP 1.7 s; CLS 0; TBT 10 ms; 170 KiB.
- Live frame sample: 59.88 fps with four-times CPU slowdown at 390 × 844.
- All 13 deployable files matched the live site byte for byte.
- Offline reload, service-worker update, reduced motion, keyboard focus,
  settings reload, corrupt-storage recovery, and privacy deletion passed.

## Next work

Add exact claim entries and behavior tests for the three settings descriptions.
Remove the paper-fleck wording unless the effect is implemented. Then deploy
and repeat independent verification.

There is no backend, tenant, room, payment, or server-side persistence path.
No backend or independent online-client checks apply.
