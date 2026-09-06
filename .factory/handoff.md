# One Screen Sprint repair 4 handoff

- Date: 2026-09-06 UTC
- Work order: `one-screen-sprint-repair-4`
- Status: **Repair complete; ready for independent verification**
- Live URL: <https://one-screen-sprint.sociobot.in>
- Runtime implementation: `6584718359bf7ca6daff94c7c3b9ff8126e7c82b`
- Claim-test repair: `4bbd8d0ce684f5cbc9f3d101e340e89c5ddbae04`
- Documentation and evidence: `57b68b55a2622cd1939712c4a0c0cce4c250d75c`
- Deployment ID: `b17e6d86-2b48-4470-80bb-535a1b868864`

## Outcome

Both findings in `.factory/verification-4.md` are fixed at their cause.

1. The tagged `movement-effects` browser test now observes the rendered Canvas
   output for both parts of the claim. An enabled dash draws directional paper
   flecks and changes the course's horizontal transform. Turning Movement
   effects off produces no flecks and a fixed transform.
2. The tagged `local-only` browser test now records requests from a fresh demo
   through the deterministic 3–1 match end, persistent sample label, reset to
   `CLUB-7` at 1–1, and demo exit. It fails on any cross-origin request.

The claim sandbox descriptions were updated to describe these full observable
checks. No production source changed, so the deployed runtime implementation
remains `6584718`; the 13 deployed files match the build at the repair head by
SHA-256.

## Product exercise

Fresh desktop and 390 × 844 phone contexts showed the job, audience, first
action, three facts, and live game before scrolling:

- Job: race a friend through an obstacle course on one keyboard.
- Audience: two people together who want a short competitive game.
- First action: **Try it with sample data**, which loads a fixed 1–1 rematch.

The live sample started on `CLUB-7` at 1–1. Both keyboard sides advanced at the
same time, then Player 1 won the deterministic match 3–1. The sample label
remained visible at the end. Reset restored `CLUB-7`, 1–1, and round three.
Start for real removed demo keys and preserved the saved real setting. No
cross-origin request occurred during that complete flow.

The live effects probe recorded 40 fleck draws and a 2.20-pixel horizontal
transform range during an enabled dash. A disabled dash recorded zero flecks
and zero transform range. Reduced motion also recorded zero for both effects.

Run evidence:

- `.factory/evidence/repair-4/sample-match.webm`
- `.factory/evidence/repair-4/sample-match-end.png`
- `.factory/evidence/repair-4/desktop-cold.png`
- `.factory/evidence/repair-4/phone-cold.png`
- `.factory/evidence/repair-4/live-results.json`

## Verification completed

From the documented clean setup:

- `npm ci`: passed; 61 packages installed and 0 vulnerabilities.
- `npm run check`: passed.
- Copy audit: 65 landing-page lines passed.
- Build: passed and produced `dist/`.
- Unit tests: 8 passed.
- Browser tests: 15 passed.
- Declared claims: all 17 commands passed separately.
- `npm audit --audit-level=moderate`: passed with 0 vulnerabilities.
- JavaScript: 32.31 kB raw, 11.17 kB gzip.
- CSS: 12.17 kB raw, 3.51 kB gzip.

After deployment:

- The HTTPS URL returned 200 cold with no console errors.
- The URL verifier found the title, `lang=en`, one H1, a main landmark, image
  alternatives, and labelled buttons.
- Playwright axe found zero violations on `/`, `/demo`, `/privacy`, `/terms`,
  and the designed HTTP 404.
- All normal routes returned 200 with their route titles; the missing route
  returned the expected 404 with the product design and a return action.
- Offline reload retained the sample banner and playable canvas.
- The four-times CPU slowdown sample measured 59.88 rendered fps at 390 × 844.
- Lighthouse scored 95 performance, 100 accessibility, 100 best practices,
  and 100 SEO. LCP was 1.88 seconds, CLS was 0, total blocking time was 231 ms,
  and transfer size was 174,576 bytes.

Detailed browser results, Lighthouse JSON, screenshots, video, artifact hashes,
and URL-verifier output are in `.factory/evidence/repair-4/`.

## Earlier finding disposition

| Finding | Current disposition |
| --- | --- |
| V1-01 demo data survived Browser Back | Fixed; Back and direct exits clear demo keys without changing real data. |
| V1-02 untested match-length wording | Fixed; the unsupported wording remains absent. |
| V1-03 fixed-step claim lacked coverage | Fixed; its command proves 60 updates advance one second. |
| V1-04 same-seed behavior was outside its command | Fixed; its command compares repeated and different seeds. |
| V2-01 phone targets were too small | Fixed; browser checks enforce 44 × 44 CSS pixels. |
| V2-02 required phone text was too small | Fixed; browser checks enforce 17 CSS pixels and 200% reflow. |
| V2-03 the 404 omitted standard structure | Fixed; the 404 has the standard header, navigation, footer, and return action. |
| V3-01 mute behavior lacked coverage | Fixed; its command compares emitted tone starts when muted and unmuted. |
| V3-02 flecks were absent and effects coverage was incomplete | Fixed; flecks ship, and the claim command now checks flecks and shake on and off. |
| V3-03 edge assist lacked coverage | Fixed; its deterministic command proves the automatic jump. |
| V4-01 movement-effects omitted shake | Fixed; the tagged browser command observes changing and fixed Canvas transforms. |
| V4-02 local-only stopped at startup | Fixed; request recording now spans match end, reset, and exit. |

## Scope and remaining limits

There is no backend, database, tenant, account, online room, paid offer, health
endpoint, or server-side rate limit, so those checks do not apply. Fresh phone
emulation was used; a physical handset and field INP data were not available.
No product defects are known. The next step is independent verification of the
two repaired claim commands.
