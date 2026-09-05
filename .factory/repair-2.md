# Repair 2 verification record

The implementation at `64d2f15df3a821c268e7113e6c82d4f1b5a365f8` is live at
<https://one-screen-sprint.sociobot.in>. It fixes all three findings from
`.factory/verification-2.md`.

## Outcome

- All visible touch targets on the four public routes and 404 are at least
  44 by 44 CSS pixels at 390 by 844.
- Required phone copy computes to 17 CSS pixels. The page has no horizontal
  overflow at 200% text, and the primary action and canvas remain available.
- The live 404 returns HTTP 404 and includes the standard header navigation and
  complete footer.

## Product exercise

The fresh live sample opened `CLUB-7` at 1–1, moved both players at once,
finished 3–1, kept its demo label, reset correctly, and left real settings
unchanged. A fresh real match finished 3–0 on `RACE-96`. Phone touch moved
player one from 6% to 42%. Offline reload and the 59.88 fps throttled frame
sample passed.

## Automated evidence

- Clean checkout: `npm ci && npm run check` passed.
- Tests: 6 unit and 13 browser tests passed.
- Declared claims: all 14 commands passed separately.
- Live axe CLI: 0 violations on `/`, `/demo`, `/privacy`, `/terms`, and 404.
- Live Lighthouse: 100 performance, 100 accessibility, 100 best practices,
  and 100 SEO; 1.684-second LCP, 0 CLS, and 174,309 bytes transferred.
- Live URL verifier: no console or baseline accessibility errors.
- Deployment parity: every public build file matched live by SHA-256.

Detailed machine results and screenshots are in
`.factory/evidence/repair-2/`. There are no known product defects. Physical
phone testing and field INP data were not available.
