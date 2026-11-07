# Proposal

## Why

On desktop the wave controls (the phase line such as "Place a tower to start", the "Next:" preview and START WAVE) float over the bottom rows of the board whenever the board fills the height of its column, which is the normal case at laptop sizes (verified at 1280x720 and 1440x820: the controls start 76px above the board's bottom edge). The phase line and the preview have no backdrop, so they read as text painted on the grid, START WAVE hangs half outside the board, and the covered tiles are hard to build on. The HUD at the top has the same rule and covers the first tile rows on short windows. On portrait phones the same controls already sit below the board; desktop should work the same way.

## What Changes

- **Desktop column layout**: on desktop the HUD, the board and the wave controls stack top to bottom inside the board column, like the portrait phone layout. The board shrinks, keeping its aspect ratio, so all three fit the window height. Nothing floats over the board.
- **Landscape phones keep the overlay**: an 844x390 screen has no vertical room, so the current absolute placement stays there.
- **Play test**: a desktop scenario checks that the controls and the HUD do not intersect the board and that the board keeps its ratio, at 1440x900 and at a short 1280x720 window.
- **Service worker cache bump** so installed copies pick up the new `index.html`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `hud-clarity`: the requirement "Board position is stable on portrait phones" gains a desktop counterpart: on desktop the HUD and the wave controls SHALL sit outside the board, and the board SHALL shrink to fit instead of being covered.

## Impact

- `index.html`: the base `#hud`, `#wave-controls` and `#canvas-wrapper` rules, plus a new desktop media query. No markup change.
- `js/ui.js` and `js/tutorial.js` already position the upgrade panel, CANCEL and the tutorial caption from measured rectangles, so they follow the new layout without code changes. The play test confirms this.
- `scripts/play-test.mjs`: one new scenario and a short desktop layout.
- `sw.js`: `CACHE_NAME` bump.
