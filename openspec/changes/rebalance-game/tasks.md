# Tasks

Run the simulator with `npm run balance` after every numeric change. A task that changes numbers is done when the targets it names pass and nothing that passed before fails.

## 1. Shared code and config plumbing

- [x] 1.1 Add `"type": "module"` and a `"balance": "node scripts/simulate-balance.mjs"` script to `package.json`. Verify `node scripts/check-paths.mjs` still runs without the module-type warning.
- [x] 1.2 Add `CONFIG.DIFFICULTY = { easy, normal, hard }` (minimum path tiles) to `js/config.js` with today's phone values (48, 30, 12) as placeholders; make `Game.startNewGame` and `scripts/check-paths.mjs` read it and remove both inline copies. Verify `grep -n "cols \* " js/game.js scripts/check-paths.mjs` has no hits and a Normal game still starts on a phone viewport.
- [x] 1.3 Create `js/combat.js` with `resolveHit`, `chainLightning` and `updateSynergies` moved verbatim from `js/game.js`, taking a `ctx` with `spatialHash` and `onHit`, `onSplash`, `onChain` callbacks; `Game` keeps particles, lightning-chain records and shake in the callbacks. Verify in the browser that a Cannon still shows explosions, a Lightning still draws arcs, and a tower next to a Support still shows the boosted damage in its tooltip.

## 2. Balance simulator

- [x] 2.1 Create `scripts/simulate-balance.mjs`: stub `window` and `navigator`, seed `Math.random` with mulberry32 from `--seed`, set the grid from `--grid`, generate the map with `CONFIG.DIFFICULTY[--difficulty]`, and step a run at dt 1/60 through `WaveManager`, `Enemy`, `Tower`, `Projectile` and `combat.js` until lives reach 0 or wave 35 is cleared. Verify two runs with the same seed print identical output.
- [x] 2.2 Add the tile scorer (path tiles within range, tie on distance to exit) and the naive and sensible players as described in design.md decision 6, acting only between waves. Verify the naive player with 95 gold places exactly one Blaster, and the sensible player places a Frost and a Support on its first two affordable turns after they unlock.
- [x] 2.3 Print the per-wave table (wave, lives lost, gold, towers, score, buyable/needed ratio), the tower value table (damage per gold by type, with Frost slow credit and Support aura credit), the unlock wave per tower, and the top score per wave. Verify the tables appear for a single run and the ratio for wave 1 on today's numbers is about 1.7 on mobile Normal, matching the headless model.
- [x] 2.4 Encode every measurable target from `wave-scaling`, `tower-balance` and `difficulty-levels` as named checks; `npm run balance` runs all grids, difficulties and players and exits 1 naming the first failed check. Verify that on today's numbers it fails and names at least "ratio stays above 1.2 on Normal" and "naive player on Normal ends between wave 12 and 20".
- [x] 2.5 Document the simulator in `README.md` (one paragraph: what it checks, the two commands). Verify the documented commands run as written.

## 3. Wave curve, armor and bosses

- [x] 3.1 Rewrite `generateWave` in `js/waves.js` as named constants (count, HP rate, speed slope and cap, armor step and cap, reward slope, wave bonus, boss base) with the starting values in design.md decision 2; move the wave bonus gold formula out of `game.js` into the same constants; apply the armor bonus only to `armored`, `shielded` and `boss`. Verify `npm run balance` reports speed capped at 1.4 from the wave it reaches it, a wave-30 Brute with armor 0, and a wave-30 Sentinel below 50% reduction.
- [x] 3.2 Tune the HP rate and boss base until the Normal buyable/needed ratio stays at or above 1.2 on every wave and at or below 3.0 from wave 7 (waves 1 to 6 exempt from the ceiling) for the sensible player on the phone grid, the boss has at least 3x a Brute's HP on every boss wave, and each boss wave is the peak of its block. Verify with `npm run balance` on both grids; record the final constants in design.md decision 2.

## 4. Towers, economy and unlocks

- [x] 4.1 Adjust base damage (and, where needed, upgrade-level damage) of Cannon, Sniper, Lightning and Frost in `TOWER_DEFS`, keeping costs unchanged, until the sensible run's damage per gold for every attacking tower is within 0.75x to 1.25x of the Blaster, and both fully upgraded paths of every tower reach at least 0.75x of Blaster Heavy Rounds. Verify with the tower value table from `npm run balance`; record the final values in design.md decision 4.
- [x] 4.2 Check start gold, wave bonus and the Support Economy path against the income curve: the naive player must afford a second Blaster by the end of wave 2 on Normal, and Economy tier 3 must repay its cost within 8 waves. Verify from the per-wave gold column and adjust `START_GOLD`, the wave bonus constant or `goldPerWave` as needed.
- [x] 4.3 Set `unlockScore` for Frost, Lightning, Cannon, Support and Sniper from the sensible player's end-of-wave score on Normal so they unlock by waves 2, 4, 7, 9 and 11. Verify the unlock-wave report, and that each unlock precedes its countered enemy type (Frost before wave 3, Cannon before wave 12, Sniper before wave 15).
- [x] 4.4 Confirm the wave-1 guarantee: the naive player with one Blaster on the suggested tile loses no life on wave 1 on every difficulty and both grids. Verify with `npm run balance`; if Hard fails, raise `CONFIG.DIFFICULTY.hard` before touching tower numbers.

## 5. Difficulty path lengths

- [x] 5.1 Set `CONFIG.DIFFICULTY` to the design values (44, 32, 22) and run `node scripts/check-paths.mjs`. Verify zero false junctions on all sizes and a fallback share of at most 10% for every difficulty; if phone Easy exceeds it, lower Easy to 40 and note it in design.md decision 3.
- [x] 5.2 Run `npm run balance` and verify the difficulty targets: naive reaches at least wave 20 on Easy, ends between 12 and 20 on Normal and before 14 on Hard; sensible reaches at least wave 25 on Hard; phone and desktop results for the same player and difficulty differ by at most 3 waves. Adjust `CONFIG.DIFFICULTY` first and tower numbers second; re-run groups 3 and 4 checks after any change.

## 6. Leaderboard cap and rejected-score message

- [x] 6.1 Replace the cap in `netlify/functions/scores.mjs` with `CAP_BASE * CAP_GROWTH ** wave`, with constants set so the cap is at least 1.5x the simulator's top score at every wave 1 to 35. Verify by running the cap formula over the simulator's top-score table in a one-off node command and checking every wave passes with margin.
- [x] 6.2 In `js/economy.js`, record a `submitFailed` flag when the POST response is not OK (offline stays queued as today); in `js/ui.js` show `score.notSaved` ("Score could not be saved" / "Punteggio non salvato") on the game-over screen when the flag is set. Verify by stubbing a 400 response in DevTools: the message shows and the local high-score list still has the run.

## 7. Integration checks

- [x] 7.1 `npm run balance` exits 0 on all grids, difficulties and players with the final constants, and `node scripts/check-paths.mjs` exits 0. Verify both commands and paste the final per-wave Normal table into design.md.
- [ ] 7.2 Play 10 waves of each difficulty in a portrait phone viewport (390x844) and 10 waves of Normal on desktop: wave 1 holds with the tutorial's Blaster, the boss on wave 5 and 10 is visibly the biggest threat, Frost is unlocked by wave 2, and every tower type feels worth buying. Verify by playing; note anything the simulator missed as a follow-up.
- [x] 7.3 Bump the cache version in `sw.js`. Verify a reload on a phone that had the old version shows the new wave 1 enemy count in the preview.

## Workflow follow-up

- Archive the change after the manual check, so the four new specs become main specs.
