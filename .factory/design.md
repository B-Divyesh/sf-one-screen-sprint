# One Screen Sprint — visual and game design

## Direction

**Screen-printed community race poster.** The game should feel like two friends
have unfolded a bright event poster on a kitchen table and started racing on
it. Hard ink edges, offset shadows, stamped course codes, and a warm paper
ground make the local, physical setting visible without invented lore. The
course remains the visual focus; site chrome stays flat and quiet.

This direction fits a same-keyboard race because the two ink colours separate
the players at a glance, while the poster composition keeps the whole course
readable on one screen. It deliberately avoids a generic game portal, neon
cyberpunk, or a card-based software landing page.

## Palette

Single light treatment, painted explicitly to preserve the poster identity:

- Paper background: `#F4E9D3`
- Ink surface: `#FFF8E9`
- Night ink / text: `#152D2F`
- Muted ink: `#526566`
- Player one coral: `#D94A3D`
- Deep coral for small reversed text: `#C43C32`
- Player two blue: `#176B87`
- Course lime: `#B8D638`
- Warning ochre: `#A85A00`
- Danger: `#A52A32`
- Focus ring: `#005FCC`

Body text and controls use night ink on paper or ink surface. The player
colours are always paired with `P1` and `P2`, so colour is not the only cue.
The home-mark numeral uses ink-surface text on deep coral at 4.91:1. The
brighter player-one coral remains reserved for large labels and game shapes.

## Type and spacing

- Display: `Arial Black`, `Franklin Gothic Heavy`, system sans-serif. The wide,
  heavy letterforms read like an event poster and need no downloaded font.
- Body and controls: `Verdana`, `Geneva`, system sans-serif for compact,
  familiar key labels.
- Numeric HUD: `ui-monospace`, `SFMono-Regular`, `Consolas`, monospace with
  tabular figures.
- Spacing follows an 8 px rhythm, with 4 px only inside small HUD groups.
- Buttons use clipped poster corners rather than rounded software pills.

## Layout and interaction grammar

The first viewport pairs the plain job statement with the live canvas. On
phones it stacks copy above a wide 16:9 course, dropping the explanatory facts
below the primary controls. The entire course is visible; the camera never
scrolls. The header and legal pages use the same offset-rule motif.

Pressing a control creates a 2 px downward ink offset. Modal sheets grow from
the pause control and restore focus to their trigger when closed. Route changes
focus the route heading and announce the new page.

## Game loop and difficulty

- Two players race on one keyboard: `A/D`, `W`, `S` and arrow keys.
- Left/right move. Up jumps and holds a grapple near a ring. Down dashes.
- A generated course contains a safe start, four to six platforms, two to four
  grapple rings, floor hazards, and a finish gate.
- Every round lasts at most 75 seconds. Reaching the gate wins; at timeout the
  player farther right wins. A tie triggers a short rematch.
- First to three round wins takes the best-of-five match.
- Early platforms are broad and low. Middle platforms add gaps and a grapple
  shortcut. The last third adds one moving bar or raised finish approach.
- The match seed is shown as a short course code. A new match creates a new
  seed. Demo mode always begins at `CLUB-7` for repeatable verification.

## Motion and safety

Simulation uses a fixed 60 Hz timestep and interpolated canvas rendering.
Particles are short, directional paper flecks; screen shake is limited to a
single 80 ms dash/landing impulse and can be disabled. No effect flashes more
than three times per second. `prefers-reduced-motion` disables shake, particles,
moving texture, and nonessential transitions. The Effects setting persists.
Audio is synthesized with Web Audio after a user gesture; it has no samples,
does not autoplay, and the mute setting persists.

## Asset plan and provenance

- Players, platforms, rings, hazards, controls, particles, and the finish gate
  are original Canvas 2D shapes drawn by this repository. No third-party art is
  loaded.
- A generated, text-free screen-print race scene supplies the social preview
  and a restrained paper texture. Prompt: “wide editorial screen-print poster
  of an abstract side-view obstacle race built from ramps, platforms, ropes,
  and circular grapple rings; no people; warm recycled paper, deep teal ink,
  coral and lake-blue accents, acid-lime course markers; offset ink texture,
  bold flat shapes, generous negative space; no text, letters, numbers, logos,
  watermark, brands, or copyrighted characters.” Generated with the factory
  image model on 2026-09-05. The selected original and prompt sidecar live in
  `assets/src/`; web exports live in `public/art/`.
- The generated image is decorative and is disclosed in the footer. Game art
  is procedural and remains usable when the raster asset is unavailable.

## Performance policy

No runtime framework, external font, telemetry library, or remote asset is
used. Initial JavaScript must remain below 150 KB gzip and CSS below 50 KB.
The generated background export must remain below 300 KB. Canvas scales to the
device pixel ratio capped at 2 and pauses when the tab is hidden.
