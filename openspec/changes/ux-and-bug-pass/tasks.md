# Tasks

Layouts: `phone` 390x844 ratio 3 touch, `phoneShort` 375x667, `landscape` 844x390 touch, `desktop` 1440x900. "Play test" means `npm run play-test`; each group adds its scenarios to `scripts/play-test.mjs` and the whole script must pass at the end of the group.

## 1. Prerequisite and harness

- [ ] 1.1 Archive `hud-readability-upgrade` (`openspec archive hud-readability-upgrade`) and verify `openspec/specs/hud-clarity/spec.md` now contains "Upgrade panel and tower details stay out of the way on phones".
- [ ] 1.2 Add `puppeteer-core` as a dev dependency and `scripts/play-test.mjs` with the static server, the four layouts, EN and IT, page-error capture and the pass or fail report with exit codes 1 and 2. Verify `npm run play-test` runs a smoke scenario (menu loads, a game starts, no page errors) on every layout and exits 0.
- [ ] 1.3 Document `npm run play-test` and `CHROME_PATH` in README.md and verify the command runs as written.

## 2. Carry state and keys

- [ ] 2.1 Add `setCarry` and `clearCarry` to `js/input.js` and `syncCarry` to `js/ui.js`; route `startPlacing`, `startMoving`, right click, Escape, the cancel button, the tower button and PLACE handlers through them. Verify with play test: "Escape then pick again", "Right click then pick again", "Gold runs out", "Gold remains", "Select then move", "Tap the road while selected" on desktop and phone.
- [ ] 2.2 Call `clearCarry` in `startNextWave`, on pause, in `_onGameOver`, `_onVictory` and `startNewGame`. Verify with play test: "Wave starts while placing" (no buildable tiles drawn during the wave, cancel hidden after it) and "Pause while moving".
- [ ] 2.3 In `_onKey`, ignore keys when a text field has focus, handle `PAUSED` before any carry check, and call `preventDefault` on Space only when handled. Verify with play test: "Escape after pausing mid-placement" and "Typing a name with a space and a digit".

## 3. Game flow

- [ ] 3.1 Add `game.returnToMenu()` and use it from Restart and Play Again. Verify with play test: "Restart during a wave" (enemy positions, lives and gold unchanged after ten seconds, music stopped).
- [ ] 3.2 Add `game.victory` EN and IT strings, pass `won` to `showGameOver`, keep it across `applyLanguage`. Verify with play test: "Last wave cleared" in both languages.
- [ ] 3.3 Replace `hasName` with `isNameTakenByOther` using the stored name. Verify with play test: "Returning player" and "Someone else's name".
- [ ] 3.4 Dispatch `neon:menu` when the menu is shown and make the install-banner script wait for it. Verify with play test on `phone` with an iPhone user agent: start a game at once, no banner over the game, banner appears after returning to the menu.

## 4. Panels and layout

- [ ] 4.1 Make `#upgrade-panel` and `#tower-stats-tooltip` opaque. Verify with play test: "Sheet over the wave controls" (pixel sample under the sheet is the panel colour) on `phone`, and the desktop panel over the wave controls.
- [ ] 4.2 Move `#cancel-place-btn` into `#wave-controls` on phone layout, hide `#wave-preview` while `data-carry` is set, and give `#wave-controls` a fixed `min-height`. Verify with play test: "Placing in Italian on a phone" (ANNULLA and INIZIA ONDATA do not intersect) on `phone` and `phoneShort`, and the board top is unchanged before and after a wave starts.
- [ ] 4.3 Position the desktop upgrade panel beside the tower in wrapper coordinates, flipping sides by board half and clamping inside the wrapper. Verify with play test: "Tower near the top-left corner" and a tower in the bottom-right corner (panel does not intersect the tower tile or the wave controls).
- [ ] 4.4 Introduce the shared phone-layout media query in CSS and `isPhoneLayout()` in `js/ui.js`; dock the sheet and the tower card to the right edge in landscape. Verify with play test: "Upgrading in landscape" (sheet inside the viewport, `document.scrollHeight` equals the viewport height, board visible) and the tower card in landscape.
- [ ] 4.5 Add the close control to the upgrade panel and the sheet, and the two-tap Sell with `towers.sellConfirm` EN and IT. Verify with play test: "Close and start", "Stray tap on Sell", "Confirmed sell".
- [ ] 4.6 Apply the portrait space rules (controls under the board, tower panel takes the rest, descriptions at `min-height: 760px`). Verify with play test: "Tall phone" and "Short phone", plus the size and contrast check from the previous change on both.

## 5. Rendering

- [ ] 5.1 Render at the device pixel ratio capped at 2 in `js/renderer.js`, and convert pointer positions with `CONFIG.CANVAS_WIDTH` in `js/input.js` and `js/tutorial.js`. Verify with play test: "Phone at 3x pixel density" and "Desktop at 2x" (backing width, tap at a tile centre places there, tutorial pointer lands on the ghost tile).
- [ ] 5.2 Move the wave, boss, cleared, perfect and combo banners to `banner.*` i18n keys in EN and IT. Verify with play test: "Boss wave in Italian" by reading `game.waveBanner.text`.
- [ ] 5.3 Measure frame time on a real phone at wave 10 at 3x with the ratio change and record the result in the task; lower the cap if any frame exceeds 33ms.

## 6. Integration

- [ ] 6.1 Bump `CACHE_NAME` in `sw.js` and verify a reload with the service worker active serves the new `index.html`.
- [ ] 6.2 Run the full play test on all four layouts in EN and IT, including the complete tutorial at 390x844, and verify every scenario passes with no page errors.

## Workflow follow-up

- Archive the change after review and sync its deltas into `openspec/specs/`.
