# Tasks

"Play test" means `npm run play-test`. Layouts: `desktop` 1440x900, `desktopShort` 1280x720 (new), `landscape` 844x390 touch.

## 1. Desktop column layout

- [x] 1.1 Add the `@media (min-width: 769px) and (min-height: 501px)` block to `index.html` with the rules from design.md decisions 2 to 4: wrapper column, HUD relative, controls static with `min-height: 115px` (the tallest controls state, see design.md decision 2), canvas `flex: 0 1 auto; min-height: 0; margin-top: auto`, controls `margin-bottom: auto`. Verify in Chrome at 1280x720 that the HUD, the board and START WAVE are all visible, nothing covers the board, and the board keeps its 4:3 ratio; at 1440x900 the board is still 802x602 with the HUD at the top.
- [x] 1.2 Verify landscape is untouched: at 844x390 (touch) the wave controls still overlay the board column and the board height is the same as before the change (compare `#game-canvas` bounds on `main` and on the branch).

## 2. Play test

- [x] 2.1 Add `desktopShort` to `LAYOUTS` in `scripts/play-test.mjs` and pin `ALL` to `phone`, `phoneShort`, `landscape`, `desktop`. Verify `npm run play-test -- smoke` still runs the smoke scenario on exactly those four layouts.
- [x] 2.2 Add scenario "Controls off the board on desktop" on `desktop` and `desktopShort`: HUD bottom <= board top, controls top >= board bottom, start button fully inside the viewport, board `width / height` within 1% of `renderer.width / renderer.height`, and the board rectangle identical before and after `#start-wave-btn` is pressed. Verify it fails on `main` at `desktopShort` (controls intersect the board) and passes on the branch on both layouts.
- [x] 2.3 Add scenario "Landscape keeps the overlay" on `landscape`: the controls rectangle intersects the board column below the board's top and the board height is at least 300px. Verify it passes.
- [x] 2.4 Mention the 1280x720 layout in the play-test paragraph of README.md and verify the documented command runs as written.

## 3. Integration

- [x] 3.1 Bump `CACHE_NAME` in `sw.js` and verify a reload with the service worker active serves the new `index.html`.
- [x] 3.2 Run the full play test on all layouts in EN and IT and verify every scenario passes with no page errors, including "Desktop panel over the wave controls", "Tower near the bottom-right corner" and "Tutorial pointer on the ghost tile" on desktop.

## Workflow follow-up

- Archive the change after review and sync its delta into `openspec/specs/hud-clarity/spec.md`.
