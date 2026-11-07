# Design

## Context

See proposal.md for the motivation. Facts that shape the approach:

- `#canvas-wrapper` is a row flex box that centres the canvas. `#hud` is `position: absolute; top: 0` and `#wave-controls` is `position: absolute; bottom: 20px`, both with `z-index: 10`, so both paint over the canvas whenever the canvas fills the column height.
- The portrait phone rules (`@media (max-width: 768px) and (min-height: 501px)`) already solve this: the wrapper becomes a column, `#hud` is `position: relative`, `#wave-controls` is `position: static` with a fixed `min-height: 88px`, and the canvas is `flex: 0 0 auto`. The phone shrinks the canvas by width, so it never needs to shrink by height.
- `Renderer` sets inline `max-width: min(100%, 802px)` and `max-height: min(100%, 602px)` on the canvas and draws at 800x600 logical pixels. `#game-container` is `height: 100vh`, so the wrapper's height is definite and the canvas `100%` resolves.
- Landscape phones (`max-height: 500px`) turn `#game-container` into a row and keep the wrapper's base rules. They have no vertical room under the board.
- Everything that positions itself around the controls measures rectangles at run time: the desktop upgrade panel clamps to `controls.top` in `ui.js`, CANCEL is moved by `_placeCancelButton`, and the tutorial caption picks a slot from the board, controls and speed rectangles in `tutorial.js`.
- `scripts/play-test.mjs` has one desktop layout, 1440x900, where the board fits at full size with room to spare, so no scenario currently exercises the overlap.

## Goals / Non-Goals

**Goals:**
- Desktop uses the same column structure as portrait phones: HUD, board, controls, nothing floating over the board.
- The board shrinks with its ratio when the window is short, so the controls never push it out of view.
- CSS only. No JS change, no markup change.

**Non-Goals:**
- Landscape phones: unchanged.
- The look of the HUD or the controls (colours, sizes, the HUD gradient).
- Horizontal space: the tower panel column and the board width rules stay as they are.

## Decisions

1. **Scope the change with a desktop media query, not the base rules.**
   New rules go under `@media (min-width: 769px) and (min-height: 501px)`, the complement of the two phone queries. Changing the base rules instead would also change landscape phones, which must keep the overlay. The query mirrors the existing phone query so the two cannot both match.

2. **Reuse the phone structure.**
   In that query: `#canvas-wrapper { flex-direction: column }`, `#hud { position: relative }`, `#wave-controls { position: static; transform: none; min-height: 115px }`, keeping the current gap and padding. The phone layout has already proven these rules with the panel, cancel and tutorial code; nothing new to learn. The minimum height differs from the phone's 88px: desktop stacks the phase line, preview and button in one column (115px), and the controls must keep that height when the preview and button hide during a wave or the tutorial, or the auto margins move the board.

3. **Keep the HUD at the top and centre the board plus controls in the rest.**
   `#hud` is the first flex item; the canvas gets `margin-top: auto` and `#wave-controls` gets `margin-bottom: auto`. On a tall window the HUD stays pinned to the top as today and the board stays vertically centred as today, so the full-size desktop look does not move. Alternative: `justify-content: flex-start` like the phone, which would leave the board stuck under the HUD with a gap at the bottom on large monitors.

4. **Let flex shrink the canvas by height.**
   The canvas gets `flex: 0 1 auto; min-height: 0`. In a column flex box the canvas's main size is its height; when the sum of HUD, canvas and controls exceeds the wrapper, flex shrinks the canvas height and, because the canvas is a replaced element with an intrinsic ratio and `width: auto`, its width follows. The inline `max-height: min(100%, 602px)` still caps it at full size. Alternative: compute `max-height` in JS from the HUD and controls heights, which adds a resize listener and a second source of truth for CSS layout. Not needed unless the ratio does not hold (see Risks).

5. **CANCEL stays absolute at the wrapper's bottom right on desktop.**
   The controls are centred and the wrapper is at least 1000px wide, so they cannot meet. `_placeCancelButton` is untouched.

6. **Play test gets a short desktop layout that only the new scenario uses.**
   Add `desktopShort: 1280x720` to `LAYOUTS` and pin `ALL` to the current four layouts, so the suite's runtime does not grow for unrelated scenarios. The new scenario runs on `desktop` and `desktopShort` and asserts the rectangles from the spec: HUD above the board, controls below it, start button inside the viewport, ratio within 1%, and the board unchanged across a wave start.

## Risks / Trade-offs

- [Chrome does not keep the canvas ratio when flex shrinks its height] → the play test asserts `width / height` within 1% of 800/600 at 1280x720. If it fails, replace decision 4 with `max-height: calc(100% - <hud height> - 88px)` measured from the real HUD height, or the JS fallback.
- [The HUD gradient now fades into the page background instead of the board] → on a 1440x900 window the board already starts below the HUD today (board top 149, HUD bottom 103), so the full-size look is unchanged. On short windows the fade sits on `#0a0a0a`, which is the colour it fades to.
- [The tutorial caption picks a different slot on desktop] → the caption code already handles a column with controls below the board, since that is the phone layout. "Tutorial pointer on the ghost tile" runs on desktop and covers it.
- [Scenarios that assume the controls overlap the board on desktop] → "Desktop panel over the wave controls" and "Tower near the bottom-right corner" use rectangles, not fixed coordinates; they should pass unchanged and the full suite confirms it.
