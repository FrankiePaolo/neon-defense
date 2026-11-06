# Tasks

Verify every visual task in a portrait phone viewport (390x844) first, then at desktop width, in both EN and IT. Serve locally with `python3 -m http.server 8000`.

## 1. Path generation rule

- [x] 1.1 Add `scripts/check-paths.mjs`. It stubs `window`/`navigator`, generates 2000 maps per difficulty for the mobile and desktop grids, exits non-zero on any false junction, and prints the fallback share. Verify it fails on the current code: about 26% of mobile Easy maps have false junctions.
- [x] 1.2 In `js/grid.js`, apply the closeness check to the exit cell and to the `_directConnect` final step. Verify with `node scripts/check-paths.mjs`: the exit-cell junctions are gone.
- [x] 1.3 Make `_fallbackPath` keep an empty row between runs and route the last leg to the exit without touching earlier rows. Verify that `node scripts/check-paths.mjs` passes with zero junctions on all sizes.
- [x] 1.4 If the fallback share on mobile Easy is above 10%, raise the number of attempts or lower the mobile Easy minimum length, and note the chosen value in design.md. Verify the script output.

## 2. Road and endpoints

- [x] 2.1 In `js/renderer.js`, replace the per-tile path fill with a stroked polyline (glow, border, fill, round joins) on the static canvas. Verify in the browser: the road is one connected strip with no tile seams, on Easy, Normal and Hard.
- [x] 2.2 Draw animated chevrons along the polyline toward END, without shadow blur on mobile. Verify the arrows move from START to END and the frame rate stays smooth at 3x speed in the phone viewport.
- [x] 2.3 Restyle START with an entry arrow and END as a base, with i18n labels (`map.start`, `map.end`). Verify both labels are fully visible at 360px width, in EN and IT.
- [x] 2.4 Compute the buildable-tile set on `startPlacing` / move start, and tint those tiles in the renderer. Verify the highlight appears when a tower is selected, covers only tiles that reach the road, and clears on place or cancel.
- [x] 2.5 On touch, snap a placing or moving touch that lands on the road or a tower to the nearest free tile within one tile. Verify a near miss on the road edge places the tower and a tap on the road centre still explains why it failed.
- [x] 2.6 While placing or moving a tower, draw it floating and gliding over the tile it would land on, with its range and a landing frame (red where it cannot go). A moving tower starts over its own tile, which keeps a faint frame. The tile under the pointer lights up brighter than other buildable tiles, and clears when the mouse leaves the board. On touch, placing starts with the tower floating over the best tile (the tutorial's suggestion). Verify placing and moving on touch, and hover on desktop.

## 3. HUD and tower panel

- [x] 3.1 Add inline SVG icons (coin, heart, wave, lock) to `index.html`, and show the wave as "N / 35". Verify the HUD at game start shows coin 90, heart 20 and wave 0 / 35.
- [x] 3.2 Render each tower type to a small offscreen canvas with its existing `render` method, and use it in the tower buttons and tooltips. Verify each button's picture matches the placed tower.
- [x] 3.3 Locked buttons: lock icon plus "Reach N points" (`panel.reach`). Unaffordable buttons: dimmed plus "Need N more" (`panel.need`), refreshed when gold changes. Verify with a fresh profile (only Blaster unlocked) and by spending gold below a tower's cost.
- [x] 3.4 Label the next-unlock bar: "Next tower: X, N points to go". Hide it when everything is unlocked. Verify by setting the best score in localStorage to 380 and checking for "Frost, 120 points to go".
- [x] 3.5 Replace DMG/RATE/RNG/AoE in the tooltip, placement preview and upgrade panel with icons and words. Give each upgrade one "what improves" line, and show a lock with "You picked the other path" on the closed path. Verify with `grep -nE "DMG|RNG|AoE" js/i18n.js js/ui.js` (no user-facing hits), and by buying an upgrade.
- [x] 3.6 Drop "(SPACE)" on touch devices. Relabel difficulty buttons Easy / Normal / Hard with a path-length subtitle. Verify in the phone viewport and on desktop (the desktop keeps the key hint).

## 4. Gameplay feedback

- [x] 4.1 Life lost: floating "-1" heart at END, END flash in the renderer, and a `ui.flashLives()` CSS flash and shake. Verify by letting a drone through with the sound muted.
- [x] 4.2 Gold earned: `ui.pulseGold()` on kill, keeping the "+Ng" text. Verify the counter pulses on each kill in wave 1.
- [x] 4.3 Add a `data-phase` attribute on the game container, a phase label next to the start button, and keep the tower panel visible but dimmed with "Build after this wave" during waves. Verify that the label and panel switch at wave start and end, and that a tap on a tower mid-wave places nothing.
- [x] 4.4 Invalid placement shows a reason at the tile: "Can't build on the road", "Tile taken" or "Not enough gold". Verify each case and that no gold is spent.
- [x] 4.5 Show enemy pictures with counts in the next-wave preview, using the offscreen renders from 3.2. Verify the first wave shows the Drone picture "x7", and that a later wave lists several types.

## 5. Coaching tutorial

- [x] 5.1 Rewrite `js/tutorial.js` steps with `target()` and caption keys: road intro, pick tower, place, start wave, towers fire by themselves, lives and gold, then upgrade after the wave. Keep `isBlocking()`, the condition and wait logic, and the storage key. Verify that a fresh profile walks through every step to completion.
- [x] 5.2 Add the SVG pointer element, positioned from DOM rects and canvas tile rects, and updated on step change, `resize` and `orientationchange`. Verify the pointer stays on target after rotating the phone viewport.
- [x] 5.3 Dock the caption in the strip between the board and the start button, and hide the wave preview during the tutorial. Verify at 360px and 430px width that no caption covers the road, START, END or the target.
- [x] 5.4 Add the ghost tower and range on the suggested tile (the buildable tile covering the most road). Verify that placing on the ghost or on another valid tile both complete the step.
- [x] 5.5 Write EN and IT captions of 12 words or fewer, with touch/desktop verb variants. Add Skip on every step and "Replay tutorial" in the pause menu. Verify that skip, replay, and a returning player (flag already set) all behave as in the spec.

## 6. Release checks

- [x] 6.1 Run a full first-time playthrough to wave 3 in the phone viewport, in EN and then IT, with a fresh localStorage. Verify every scenario in `specs/` is met and the console has no errors.
- [x] 6.2 Bump `CACHE_NAME` in `sw.js`, and update the README feature list where wording changed (difficulty names, tutorial). Verify that the installed PWA picks up the new version after reload.

## Workflow follow-up

- Archive the change with `/opsx:archive` after it ships.
