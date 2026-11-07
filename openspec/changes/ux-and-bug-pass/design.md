# Design

## Context

See proposal.md for the findings. Facts that shape the approach:

- Carry state lives in `InputHandler` (`placingType`, `movingTower`, `selectedTower`) but the matching UI (`.tower-btn.selected`, `#cancel-place-btn`, the tower card) is toggled in five places: `ui.js` tower button handler and PLACE button, `ui.js` cancel button, `input.js` `_onClick`, `_onRightClick`, `_onKey`. Each path updates a different subset, which is the desync the player sees.
- `hideBetweenWaves` hides the cancel button but leaves `placingType` set, so the renderer keeps drawing the carried tower and the buildable tiles through the wave.
- `_onKey` listens on `document` and checks `placingType` before the paused state, so Escape cancels the carry instead of resuming. Space always calls `preventDefault`.
- Phone layout is decided in two different ways: `IS_MOBILE` (touch) in JS for panel behaviour, and `@media (max-width: 768px)` in CSS and `matchMedia` for the bottom sheet. A landscape phone (844px wide, touch) gets touch behaviour with desktop panel geometry.
- The desktop upgrade panel is positioned in canvas pixels relative to `#canvas-wrapper`, but the canvas is centred inside the wrapper under the HUD rows, so the offset is wrong by the canvas position.
- `Renderer` sets `canvas.width` to the logical size (480 or 800) and CSS scales it. `input.js` and `tutorial.js` convert pointer positions with `canvas.width / rect.width`.
- Restart from pause calls `togglePause` (which resumes), then shows the menu. The loop keeps updating while `state` is `PLAYING`.
- `showGameOver` is shared by defeat and victory; the heading is set once in `applyLanguage`.
- `ScoreTracker.hasName` checks the whole leaderboard, including the name stored in `neon_td_player_name`.
- The install banner is an inline script in `index.html` on a 2s timer with no knowledge of the game state.
- Wave banners are string literals in `game.js`.
- The pending change `hud-readability-upgrade` is implemented but not archived, so its `hud-clarity` deltas are not in the main spec yet.

## Goals / Non-Goals

**Goals:**
- One source of truth for carry state, one for "phone layout".
- Every spec scenario in this change checked by a script that drives Chrome like a player, on four layouts and two languages.
- No change to gameplay numbers, grid sizes or the leaderboard API.

**Non-Goals:**
- A portrait grid or a different board size for phones.
- Restyling the menu, pause and end screens beyond the heading text.
- Replacing the inline install-banner script with a module.

## Decisions

### 1. Carry state goes through one method
`InputHandler` gets `setCarry({ placing, moving })` and `clearCarry()`. They set the three fields and call `ui.syncCarry(input)`, the only code that toggles `.tower-btn.selected`, `#cancel-place-btn`, `data-carry` on `#game-container` and hides the tower card. `startPlacing`, `startMoving`, `_onRightClick`, Escape, the cancel button and the tower button handlers call these instead of touching the DOM. `game.js` calls `input.clearCarry()` in `startNextWave`, when pausing, in `_onGameOver`, `_onVictory` and `startNewGame`. The renderer needs no change: it already draws tiles only while a carry exists.
*Alternative:* keep the handlers and patch each one. Rejected: that is how the desync appeared.

### 2. Keyboard: paused first, fields excluded
`_onKey` returns at once when `e.target` is an `input`, `textarea` or content-editable element. It checks `game.state === 'PAUSED'` before any carry check, so Escape and Space resume. `preventDefault` on Space happens only when the key is handled.

### 3. Restart goes through `game.returnToMenu()`
A new method sets `state = 'MENU'`, stops music, clears the carry and selection, hides panels, resets `data-phase`, and shows the menu. The pause Restart button and Play Again use it. The loop already skips update and render in `MENU`. The HUD keeps its last values under the opaque menu.
*Alternative:* leave the state and just hide things. Rejected: the game must not run under the menu.

### 4. Victory is a flag on the end screen
`showGameOver(score, wave, won)` stores `won` and sets the heading from `game.victory` or `game.gameOver`. `applyLanguage` reads the stored flag so a language change keeps the right heading.

### 5. Own name wins over the leaderboard check
`ScoreTracker.isNameTakenByOther(name)` returns true only when the name is on the leaderboard and differs (case-insensitive) from `neon_td_player_name`. The server keeps accepting any name, as today.

### 6. One `isPhoneLayout()` for CSS and JS
A single media query string, `(max-width: 768px), ((max-height: 500px) and (pointer: coarse))`, is used by the CSS phone rules and by `ui.js` through `matchMedia`. The sheet rules move from the `max-width` block into this query. In landscape the sheet docks to the right edge over the tower panel column, full height, 320px wide, scrolling inside; in portrait it keeps the bottom dock. Both get a close control in the header. `IS_MOBILE` (touch) keeps deciding tap-versus-hover behaviour only.
*Alternative:* make touch imply the sheet everywhere. Rejected: a touch laptop at 1440px should keep the desktop panel.

### 7. Desktop panel beside the tower
`showUpgradePanel` converts the tower's canvas position to wrapper coordinates using the canvas's bounding rect and scale, makes the panel visible to measure it, then puts it to the right of the tower's tile when the tower is in the left half of the board, otherwise to the left, and clamps its top so it stays inside the wrapper above the wave controls.

### 8. Opaque surfaces
`#upgrade-panel` and `#tower-stats-tooltip` use solid `#0a0a0f`. Nothing else changes; the 95 percent alpha was the only reason text showed through.

### 9. Cancel lives in the controls row on phones
On phone layout `#cancel-place-btn` becomes a flex item of `#wave-controls` between the phase label and the start button, and `#wave-preview` is hidden while `data-carry` is set, so the row holds label, CANCEL and START WAVE at any label length. `#wave-controls` gets a fixed `min-height` so hiding the start button during a wave does not change its height. On desktop the button stays absolute at the bottom right.

### 10. Portrait space
In the portrait query, `#wave-controls` loses `margin-top: auto` and `#tower-panel` gets `flex: 1 1 auto; min-height: 0`. `.tower-desc` is shown again under `@media (min-height: 760px)`. The board stays `flex: 0 0 auto` under the HUD, so it never moves.

### 11. Device pixel ratio in the renderer
`Renderer` keeps `this.width`/`this.height` logical, sets `canvas.width = width * dpr` with `dpr = Math.min(devicePixelRatio || 1, 2)`, sets `canvas.style.width/height` to the logical size, and calls `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` at the start of each frame before the shake translate. The static canvas is scaled the same way. `input.js` and `tutorial.js` convert with `CONFIG.CANVAS_WIDTH / rect.width` instead of `canvas.width`. The cap of 2 bounds fill cost on 3x phones.
*Alternative:* full ratio. Rejected: 9x the pixels with shadow blur on a mid-range phone is a frame-rate risk; 2x already removes the visible blur.

### 12. Banners through i18n
`game.js` builds banner text with `t('banner.wave')`, `t('banner.boss')`, `t('banner.cleared')`, `t('banner.perfect')`, `t('banner.combo')` and `{n}` replacement. The boss banner uses a colon, not a dash.

### 13. Install banner lives inside the menu
`#pwa-banner` moves inside `#menu-screen`. The inline script is unchanged: when its timer fires during a game the banner is shown but hidden with the menu, and it appears the next time the menu is shown. A banner already open when a game starts hides with the menu too. Dismissal is unchanged.
*Alternative:* a `neon:menu` event the script waits for. Rejected: it needs extra code to hide a banner already open when a game starts.

### 14. Sell confirm in the panel
`showUpgradePanel` renders Sell with a `data-armed` state kept in `UIController`. First click arms and relabels to `towers.sellConfirm` ("Sell for {n}?"); second click sells. Re-rendering the panel, closing it or clicking the board disarms.

### 15. Play test as a repo script
`scripts/play-test.mjs` uses `puppeteer-core` (dev dependency) with the Chrome found at the macOS path or `CHROME_PATH`, serves the repo with a small `node:http` static server on a free port, and runs one function per spec scenario on `phone` (390x844, ratio 3, touch), `phoneShort` (375x667), `landscape` (844x390, touch) and `desktop` (1440x900), in English and Italian where text matters. It reports each scenario as pass or fail with the layout and exits 1 on any failure, 2 when Chrome is missing. `npm run play-test` runs it. It replaces the ad-hoc checks used for this proposal.
*Alternative:* Playwright. Rejected: a 150MB browser download for a game with no build step.

## Risks / Trade-offs

- [Frame rate on low-end phones after the ratio change] → cap at 2, keep `SHADOW_BLUR_SCALE`, measure on a real phone before release and lower the cap to 1.5 if a wave 10 frame exceeds 33ms.
- [The side sheet in landscape covers the right columns of the board] → 320px leaves the left 540px of an 844px screen clear; the selected tower's tile is still visible in most positions and the sheet closes with one tap.
- [Carry refactor touches the tutorial's `done` checks] → the tutorial reads `input.placingType` and `ui._previewingType`, which keep their names and meaning; the play test plays the whole tutorial.
- [Archiving `hud-readability-upgrade` is a prerequisite] → the first task archives it; until then `openspec validate` cannot see the requirements this change builds on.

## Migration Plan

Bump `CACHE_NAME` in `sw.js`. No data or API migration. Rollback is a redeploy of the previous commit with another cache bump.
