# Design

## Context

See proposal.md for the problems. Facts that shape the approach:

- All game-screen styles live in one `<style>` block in `index.html`. There are no CSS variables; colours and sizes are repeated literals.
- The HUD (`#ui-overlay`), unlock tracker and speed controls are absolutely positioned over the top of `#canvas-wrapper`. The wave controls are absolutely positioned over its bottom.
- `#canvas-wrapper` centres the canvas. On a portrait phone the board is 12x9 tiles, so at 390px wide it is only about 292px tall and the wrapper's spare height splits into a gap above and below it. When `#build-note` appears during a wave, the tower panel grows, the wrapper shrinks, and the board re-centres: that is the jump.
- `ui.js` rewrites the HUD item markup on every language change (`applyLanguage`, around line 83). Speed buttons are wired by `data-speed`; `game.js` and `ui.js` both set the mute button's look.
- The tutorial docks its caption from the board, wave-controls and speed-controls rectangles (`tutorial.js` `_placeCaption`), and points at `#hud-lives`, `#hud-gold` and `#start-wave-btn` by id.
- Mobile layout is driven by `@media (max-width: 768px)`; landscape phones by `@media (max-height: 500px)`.

## Goals / Non-Goals

**Goals:**
- Meet the size and contrast rules in the specs on a 390x844 portrait phone first, then check desktop and landscape.
- Keep every element id the tutorial and tests rely on.

**Non-Goals:**
- Restyling the menu, pause and game-over screens beyond inheriting the body font.
- Changing canvas rendering (road, enemies, floating texts).
- A light theme.

## Decisions

### 1. A small set of CSS tokens on `:root`
Add `--font-ui`, `--font-num`, and text colours `--text-1` (#f0f0f0), `--text-2` (#b8b8c0), `--text-3` (#8c8c96, about 5.9:1 on #0a0a0a). Replace the low-contrast literals on the game screen (#555, #666, #777, #2a2a2a, #335566, #3a3a3a, #1a1a1a, #663333) with these tokens or with the existing neon colours.
*Why:* one place to hold the contrast floor. *Alternative:* fix each literal in place. Rejected: the same greys would come back with the next feature.

### 2. System sans-serif with tabular figures, no web font
`--font-ui: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`. Numbers use the same font with `font-variant-numeric: tabular-nums`. Remove `letter-spacing` from game-screen text. Keep Courier New only for the menu title and the pause and game-over headings, where it is branding.
*Why:* zero download, works offline in the PWA, native legibility on iOS and Android. *Alternative:* a Google mono or display font. Rejected: network dependency and a service worker cache entry for little gain.

### 3. Glow on icons, not on digits
Drop `text-shadow` from `.hud-item` values; put a `drop-shadow` filter on the HUD icons instead. The neon look stays, the digits stay sharp.

### 4. HUD as two stacked rows over the top of the wrapper
- Row 1: four equal cells. Each cell is icon plus value (18px on phones) on one line, word label (12px, `--text-3`) under it. Labels come from i18n (`hud.gold`, `hud.lives`, `hud.wave`, `hud.score`). The ids `hud-gold`, `hud-lives`, `hud-wave`, `hud-score` stay on the cells.
- Row 2: the next-unlock text and bar on the left, filling the space; the controls on the right: `[Speed 1x] [pause] [speaker]`, each at least 44x44px.
The rows are a normal-flow block at the top of `#canvas-wrapper` (no longer absolute), so their height is real and the board can start below them.
*Alternative:* move the HUD out of the wrapper into `#game-container`. Rejected: on desktop the HUD should stay over the board column, not span the side panel.

### 5. Board pinned under the HUD on portrait phones
In the portrait media query, make `#canvas-wrapper` a column: HUD block, then the canvas (`flex: 0 0 auto`), then `#wave-controls` in normal flow, with the remaining space below. The canvas no longer centres vertically, so a change in the tower panel's height cannot move it. On desktop and landscape the current centring stays, with the HUD block added on top.
`#build-note` moves into the tower panel's heading row (heading on the left, note on the right, both always laid out; the note uses `visibility` rather than `display`), so the panel height is the same in both phases.

### 6. One cycling speed button
Replace the three `data-speed` buttons with `#speed-btn`. A tap calls `game.setSpeed(next)` with next = speed % 3 + 1. `updateSpeedButtons(speed)` writes "Speed 2x" (`ctrl.speed`). Keys 1, 2, 3 in `input.js` are unchanged.
*Why:* one control, one word, fewer targets in a narrow row. *Alternative:* keep three buttons and add a "Speed" caption. Rejected: it needs about 160px that row 2 does not have at 390px.

### 7. Sound and pause icons
Add `speakerOn`, `speakerOff`, `pause` and `star` to `js/icons.js`, and make `coin` a filled disc with a darker inner ring everywhere it appears. No `play` icon: the pause overlay covers the button while paused. One `ui.setMuteIcon(muted)` sets the icon and `aria-pressed`; `game.js` calls it instead of setting opacity. The pause and sound buttons get an `aria-label` from i18n (`ctrl.pause`, `ctrl.sound`).

### 8. Phase line explains the disabled start button
`_updatePhaseLabel` reads `phase.needTower` when the phase is build and `game.towers.length === 0`. `updateHUD` already runs after each placement, so it calls `_updatePhaseLabel` when the tower count changes from zero. During the tutorial the caption hides the phase line as it does today.

### 9. Tower panel during a wave: inactive, not faded
Replace `opacity: 0.35` on `#tower-list` with `pointer-events: none`, a desaturated tower picture (`filter: grayscale(0.7)`), and a darker button background. Text keeps its colour. The heading note "Build after this wave" uses the orange accent at 13px.

### 10. Bottom sheet for upgrades, docked card for tower details on phones
On phones, `#upgrade-panel` becomes `position: fixed; left: 0; right: 0; bottom: 0` with `max-height` equal to the space below the board, computed in JS from the canvas rect when the sheet opens and on resize (fallback `45vh`). It gets a top border, rounded top corners and internal scroll. The selected tower stays visible because the board is pinned above (decision 5).
`#tower-stats-tooltip` does not become a sheet: covering the tower list would stop the player from switching towers. In portrait it docks just above the tower panel (`bottom: 6px` of the board column) with the existing `35vh` cap, so its PLACE button is always visible. On tall phones it sits in the free space under the board; on short phones (375x667) it can overlap the bottom of the board while open, which is harmless since no tower is selected yet.
Upgrade rows: each state gets readable colours and a word or icon. Purchased: green check and text. Available: gold border as today. Unaffordable: cost in `--text-2` plus "Need N more" (`panel.need`). Locked: lock icon plus `up.otherPath`, text in `--text-3`.

### 11. Tutorial
Ids are kept, so pointer targets still resolve. `_placeCaption` reads `#speed-controls` for its top limit; that id stays on the row-2 controls container. With the board pinned under a taller HUD, the existing candidates (above the wave controls, above the board, over the top bar) no longer fit on short phones. Two candidates are added, in order: over the tower panel, then inside the bottom of a target taller than the caption (the upgrade sheet in the last step). Verified at 360x640, 375x667, 390x844, 414x736 and 430x932: no caption covers the board or a pointer target.

## Risks / Trade-offs

- [Short phones, for example 375x667, may not fit HUD, board, wave controls and the tower panel] → Measure at 375x667. If it overflows, the HUD labels drop to the same line as the value below 700px height.
- [Italian labels are longer ("Velocità 3x", "Ondata 12 / 35")] → Test the IT layout at 390px; the four HUD cells use `min-width: 0` and the value never wraps.
- [The sheet's max-height from the canvas rect goes stale on rotation] → Recompute on `resize` while a sheet is open.
- [Players used to three speed buttons] → Same keys on desktop; the button shows the current speed in words.

## Migration Plan

Static site. Bump `CACHE_NAME` in `sw.js` so installed PWAs pick up the new `index.html` and scripts. Rollback is a revert of the commit.
