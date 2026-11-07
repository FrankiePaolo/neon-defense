# Proposal

## Why

A scripted play-through in Chrome (portrait phone 390x844 and 375x667, landscape phone 844x390, desktop 1440x900, English and Italian) found the bugs the player reported and more. Tower placing breaks on desktop because cancelling leaves the tower button highlighted, so the next click turns placing off instead of on; on every device placing mode survives a wave start and shows the glowing tiles mid-wave. Panels bleed the text under them, CANCEL covers START WAVE on phones, the upgrade panel hides the tower it belongs to on desktop and runs off screen on landscape phones, and the board is drawn at 480px and stretched 2.4x on a phone, so it is blurry. Winning says "GAME OVER", a returning player cannot save under their own name, Escape does not resume a pause when a placement was pending, typing a name changes the speed and blocks spaces, and Restart leaves the old game running under the menu.

## What Changes

Bugs, all reproduced:

- **Placing state is one thing**: picking, placing, moving, cancelling (button, Escape, right click, cancel) and selecting a tower all go through one path, so the tower button highlight, the cancel button and the ghost always agree. Placing and moving end when a wave starts, when the game pauses and when the game ends; no glowing tiles during a wave.
- **Escape resumes a pause** whatever was pending. Keys do nothing while the name field has focus, and spaces can be typed in a name.
- **Restart stops the old game**: back on the menu nothing runs and no music plays.
- **Victory screen** says the player won, in both languages.
- **Own name is accepted**: "Name already taken" only blocks a name that belongs to someone else on the leaderboard; the name saved on this device is always accepted.
- **Panels are opaque** and never show the text under them (upgrade panel, tower details, bottom sheet).
- **CANCEL never overlaps START WAVE** on phones, in English and Italian.
- **Desktop upgrade panel sits beside its tower** and never covers it.
- **Landscape phones** get the same bottom sheet as portrait phones instead of a desktop panel that runs off screen.
- **Sharp board**: the canvas renders at the device pixel ratio.
- **Install banner** shows only on the menu, never over the tower panel.
- **Canvas banners** (wave start, boss, cleared, perfect, combo) are localized.

Experience:

- **Upgrade sheet on phones** has a close control and the start button stays reachable.
- **Portrait layout uses the free space**: the wave controls sit right under the board and the tower panel takes the rest, showing the tower descriptions when there is room. The board still never moves.
- **Selling asks once**: Sell becomes "Sell for N?" on first tap and sells on the second, so a stray tap on a phone does not lose a tower.
- **A repeatable play test**: a script drives the game like a player on each layout and checks every scenario above, so the next change cannot bring these back.

## Capabilities

### New Capabilities
- `tower-placement`: how picking, placing, moving, selecting and cancelling a tower behave and stay consistent across mouse, touch and keyboard, and across phase changes.
- `game-flow`: moving between menu, play, pause, game over and victory, saving a score, and when the install banner may appear.

### Modified Capabilities
- `hud-clarity`: panels are opaque, CANCEL and START WAVE never overlap, the desktop upgrade panel sits beside its tower, landscape phones use the bottom sheet, the sheet can be closed, and the portrait layout uses the space below the board.
- `gameplay-feedback`: the canvas banners are localized, and the sell action asks once before selling.
- `map-readability`: the board is drawn sharp on high-density screens.

## Impact

- Code: `js/input.js` and `js/ui.js` (one placing-state path, key handling, sheet close, sell confirm, panel position), `js/game.js` (end placing on wave start, pause and game end; restart; victory; localized banners), `js/renderer.js` (device pixel ratio), `js/economy.js` (own-name check), `index.html` (opaque panels, cancel placement, landscape sheet, portrait layout, install banner), `js/i18n.js` (victory, sell confirm, banner strings), `sw.js` (cache bump).
- New `scripts/play-test.mjs` with `puppeteer-core` as a dev dependency, driving the Chrome already installed; no browser download. `npm run play-test` runs it.
- No balance, backend or leaderboard API change. The pending `hud-readability-upgrade` change must be archived first so its `hud-clarity` deltas are in the main spec before this change's deltas are added.
