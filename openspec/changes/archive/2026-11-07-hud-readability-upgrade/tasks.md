# Tasks

Verification runs in a browser at 390x844 (portrait phone), 375x667 (short phone), 844x390 (landscape phone) and 1440x900 (desktop), in English and Italian, unless a task says otherwise. "Size and contrast check" means a console snippet that lists every visible text element on the game screen whose font size is under 12px or whose contrast against its background is under 4.5:1; it must return an empty list.

## 1. Type and colour foundation

- [x] 1.1 Add `--font-ui`, `--font-num`, `--text-1`, `--text-2`, `--text-3` on `:root` in `index.html`, set `body` and game-screen controls to `--font-ui`, remove letter spacing from game-screen text, and keep Courier New only on the menu title and the pause and game-over headings. Verify the game screen renders in the system sans-serif and the menu title is unchanged.
- [x] 1.2 Replace the low-contrast greys on the game screen (#555, #666, #777, #2a2a2a, #335566, #3a3a3a, #1a1a1a, #663333) with the tokens or neon colours, and raise game-screen text under 12px to at least 12px in the portrait query. Verify with the size and contrast check in build phase.

## 2. Top bar and controls

- [x] 2.1 Make `coin` a filled coin and add `star`, `pause`, `speakerOn` and `speakerOff` to `js/icons.js`, and add EN and IT strings `hud.gold`, `hud.lives`, `hud.wave`, `hud.score`, `ctrl.speed`, `ctrl.pause`, `ctrl.sound`, `phase.needTower` to `js/i18n.js`. Verify every new key exists in both languages.
- [x] 2.2 Rebuild the HUD as a normal-flow two-row block: four cells with icon, tabular value and word label (row 1), and the next-unlock text and bar beside the controls (row 2). Move the glow from digits to icons. Keep ids `hud-gold`, `hud-lives`, `hud-wave`, `hud-score`, `unlock-tracker` and `speed-controls`. Verify the "HUD at game start", "Italian labels", "Progress toward Frost" and "Gold changes" scenarios.
- [x] 2.3 Replace the three speed buttons with one cycling `#speed-btn` labelled "Speed Nx", update `updateSpeedButtons`, and confirm keys 1, 2, 3 still work on desktop. Verify the "Cycling speed" scenario.
- [x] 2.4 Give the pause and sound buttons their icons and localized `aria-label`s, with one `setMuteIcon(muted)` used by both `ui.js` and `game.js`. Verify the "Muting sound" scenario, including after a new game starts muted.

## 3. Layout and phase

- [x] 3.1 In the portrait query, stack HUD, board and wave controls in `#canvas-wrapper` with the board pinned under the HUD, and move `#build-note` into the tower panel heading row with `visibility` toggling. Verify the "Starting a wave" scenario by comparing the canvas `getBoundingClientRect().top` before and after starting a wave, at 390x844 and 375x667, and check landscape and desktop still centre the board.
- [x] 3.2 Show `phase.needTower` while no tower is placed, switching to the build label after the first placement. Verify the "No tower yet" scenario.
- [x] 3.3 Replace the 35% fade of the tower list during a wave with inactive buttons that keep their text colour. Verify the "Tap a tower mid-wave" and "Reading costs mid-wave" scenarios and run the size and contrast check during a wave.

## 4. Upgrade sheet and tower details

- [x] 4.1 On phones, open `#upgrade-panel` as a bottom sheet whose max height is the space below the board, recomputed on resize, with internal scroll, and dock `#tower-stats-tooltip` just above the tower panel. Verify the "Upgrading on a phone" and "Previewing a tower on a phone" scenarios.
- [x] 4.2 Give each upgrade row state readable colours and a word or icon (purchased, available, unaffordable with "Need N more", locked with "You picked the other path"). Verify the "Locked upgrade row" scenario and run the size and contrast check with the sheet open.

## 5. Integration

- [x] 5.1 Play the full tutorial at 390x844 in EN and IT and confirm every caption docks without covering the board or its target, and every pointer lands on its target.
- [x] 5.2 Bump `CACHE_NAME` in `sw.js` and verify a reload with the service worker active serves the new `index.html`.

## Workflow follow-up

- Archive the change after review and sync its deltas into `openspec/specs/`.
