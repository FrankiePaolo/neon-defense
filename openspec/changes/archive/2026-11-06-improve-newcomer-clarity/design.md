# Design

## Context

See proposal.md (Why). Facts that shape the approach:

- Vanilla ES modules, no build step, no test framework. The canvas is 12x9 tiles on touch devices and 20x15 on desktop (`CONFIG`, `IS_MOBILE`). Tiles are 40px, scaled by CSS to fit the screen.
- `Renderer.renderStatic` draws the grid and path tiles once to an offscreen canvas. `renderFrame` draws towers, enemies and effects each frame.
- Towers and enemies already have their own drawings (`tower.render`, `enemy.render` per type). On a phone they are small, and the panel shows text only.
- `Grid._randomWalk` already rejects cells that touch earlier path (`_isTooCloseToPath`), but a check over 2000 mobile maps found false junctions:

  | Difficulty (mobile min length) | Maps with false junctions |
  |---|---|
  | Hard (12) | 0% |
  | Normal (30) | 5.6% |
  | Easy (48) | 25.7% |

  The causes, all on Easy:
  1. The step onto the exit cell skips the check (343 maps).
  2. `_fallbackPath` produces touching rows (171 maps).

  Easy is the mode newcomers pick, so this is a real cause of the "maze" look.
- The tutorial (`js/tutorial.js`) is a list of steps with `condition` / `waitForState`. It blocks input through `isBlocking()`, and `localStorage['neonDefenseTutorialDone']` records that it is done.
- All text goes through `t()` in `js/i18n.js` (EN, IT).

## Goals / Non-Goals

**Goals:**
- Phone portrait first (360 to 430px wide), then desktop.
- Keep the neon identity: dark background, glowing lines, monospace text.
- No new runtime dependency and no image assets to download. Icons are inline SVG or drawn on canvas.

**Non-Goals:**
- No balance change to towers, enemies, waves or economy.
- No new towers, enemies or modes. No leaderboard or backend change.
- No full art restyle, and no move to a framework or bundler.

## Decisions

### 1. Draw the road as one stroked polyline, not as tiles
Build a polyline through the tile centres of `grid.path`. Draw it on the static canvas with three strokes: an outer glow, a border and a fill. Use `lineJoin = 'round'` and a width of about 0.7 of a tile. Draw the arrows each frame as short chevrons along the polyline, spaced evenly and moved by `time * speed`. This costs a few dozen small shapes per frame.

*Alternative:* keep the tiles and add arrows on top. Rejected: the seams and dots between tiles are what make the road read as a maze.

### 2. Fix generation where the data shows false junctions
- Apply `_isTooCloseToPath` to the exit cell as well. Allow only the cell the walk came from.
- Make `_fallbackPath` leave a full empty row between runs, and route its last leg to the exit without touching earlier rows.
- Add `scripts/check-paths.mjs`. It generates many maps per difficulty and grid size, and it fails if any path cell has an orthogonal path neighbour that is not its previous or next step. It also prints the share of fallback maps, so we can see whether the stricter rule makes the fallback more common. This script is the test for the rule.

*Alternative:* hide junctions with rendering alone. Rejected: a real side-by-side touch still looks like a fork, however it is drawn.

*Outcome (task 1.4):* with the stricter rule, the fallback share on mobile Easy was 17%. Only about 1.1% of random walks reach 48 cells on a 12x9 grid. Raising generation attempts from 150 to 400 brings the fallback to under 1% with no change to path length, so balance is unchanged. The fallback itself is now a serpentine of vertical runs sized to the minimum length.

### 3. Panel and preview pictures come from the game's own drawing code
At startup and on language change, draw each tower type and enemy type once to a small offscreen canvas with its existing `render` method. Use the result as the picture in tower buttons, tooltips and the wave preview. The panel then always matches the board, with no separate art to maintain.

*Alternative:* hand-made SVG icons per tower. Rejected: two drawings of the same tower drift apart.

HUD, lock and stat icons are small inline SVG strings in `js/icons.js` that use `currentColor`, so they take the existing neon colours. A single module avoids duplicating icons between the HTML and the JS-built panels.

### 4. Feedback reuses existing effects, plus CSS classes for the HUD
- Life lost: `_onEnemyReachedEnd` adds a floating "-1" heart at END, sets a short END flash timer that the renderer reads, and calls `ui.flashLives()`. That call adds a CSS class with a red flash and shake, then removes it on `animationend`.
- Gold earned: `_onEnemyKilled` calls `ui.pulseGold()` in the same way.
- Phase: the game container gets a `data-phase="build|wave"` attribute. CSS uses it to dim the panel and show the "Build after this wave" note, so the panel no longer hides. The phase label sits next to the start button.
- Invalid placement: `input.js` already knows when a tap is invalid. It pushes a floating text with the reason key at that tile, using `t()`.

### 5. Buildable-tile highlight is computed when placement starts
When `startPlacing(type)` runs, compute the set of empty tiles whose distance to any path cell is within the tower's range, and cache it until placement ends. That is at most 300 tiles times the path length, once per selection, which is cheap. The renderer fills those tiles with a soft tint of the tower colour.

### 6. Tutorial: step list with targets, a DOM pointer and a docked caption
Rewrite `js/tutorial.js` but keep its shape: an ordered `STEPS` list, `condition`, `waitForState` and `isBlocking()`. Each step adds:
- `target()`: returns a DOM element, or a board tile. A tile is turned into page coordinates through `canvas.getBoundingClientRect()` and the canvas scale.
- `caption`: an i18n key, with a `.touch` / `.desktop` variant where the verb differs.

The pointer is one absolutely positioned DOM element (an animated hand in SVG). It is repositioned on each step, on `resize` and on `orientationchange`. Input outside the target is ignored through the existing `isBlocking()` checks, extended to accept a tap on the target.

The caption docks in the strip between the board and the start button, where the wave preview sits (the preview is hidden during the tutorial). That strip exists in both layouts and never overlaps the board, so captions cannot cover the road, START or END.

The suggested tile is the buildable tile (from decision 5) that covers the most road cells. Ties are broken by the shortest distance to START.

"Replay tutorial" in the pause menu clears the stored flag and restarts the game.

*Alternative:* a dimmed spotlight overlay with a cut-out. Rejected: on a small phone the dimming hides the very road the player needs to learn, and the cut-out maths for canvas tiles is fragile.

### 7. Wording and localisation
All new text gets EN and IT keys. Touch-specific text is chosen with `IS_MOBILE` at render time. This follows the existing "read lang at display time" fix. Difficulty buttons keep their internal ids (`easy`, `normal`, `hard`) and change only their labels.

## Risks / Trade-offs

- [The stricter path rule makes the fallback serpentine more common on mobile Easy] → `check-paths.mjs` reports the fallback share. If it goes over 10%, lower the Easy minimum length on mobile slightly, or add more attempts before the fallback, and record the result in tasks.
- [The thick road hides tile boundaries, so placement next to the road gets less precise] → the buildable-tile highlight and the per-tile placement preview stay. The road width stays below one tile.
- [Per-frame chevrons and HUD animations cost frame rate on low-end phones] → chevrons have no shadow blur on mobile (use `SHADOW_BLUR_SCALE`), and HUD effects are CSS transforms and opacity only.
- [The tutorial pointer drifts after resize, rotation or PWA safe-area changes] → reposition on `resize` and `orientationchange`, and on every step change. Check in a phone viewport and in standalone mode.
- [Phone landscape leaves no free space outside the board] → captions then fall back to the top of the screen and can overlap the board. Portrait, which most players use, keeps the board clear at 360 to 430px width.
- [Longer Italian strings break the layout] → check every new string in IT at 360px width. Captions stay at 12 words or fewer.

## Migration Plan

- Bump `CACHE_NAME` in `sw.js` so installed PWAs get the new files.
- Keep the `neonDefenseTutorialDone` key, so returning players skip the tutorial.
- Rollback: revert the commit and bump the cache again. There is no data migration.
