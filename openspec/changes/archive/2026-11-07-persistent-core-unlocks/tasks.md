# Tasks

"Play test" means `npm run play-test`; "balance" means `npm run balance`. Each group adds its scenarios to `scripts/play-test.mjs` and the whole script must pass at the end of the group.

## 1. Wallet and pay rule

- [x] 1.1 Rename `unlockScore` to `unlockCost` in `js/config.js` with the prices from design decision 2, and add `waveCores(wave)` to `js/waves.js` (wave number, doubled on boss waves). Verify with a one-line `node -e` import that `waveCores(7)` is 7 and `waveCores(10)` is 20.
- [x] 1.2 Rewrite `ProgressTracker` in `js/economy.js` as the wallet from design decision 1, loading and saving `neon_td_cores` and `neon_td_unlocked`, with `reset`, `bestScore`, `updateBestScore` and `getNewlyUnlockedTowers` removed. Verify with a play test scenario "Fresh profile" that seeds no keys and reads Blaster unlocked, Frost locked and 0 cores, and "Seeded profile" that seeds 12 cores and Frost and reads both back after a new game.
- [x] 1.3 In `js/game.js` add `coresThisRun`, pay `waveCores` in `_onWaveComplete` before the victory check with a "+N cores" floating text, delete `_checkUnlocks` and the `progressTracker.reset()` call in `startNewGame`. Verify with a play test scenario "Clearing wave 1 pays a core" that reads 1 core from localStorage after wave 1 and 3 after wave 2, and a game-over scenario that reads the same balance after Play Again.

## 2. Simulator

- [x] 2.1 In `scripts/simulate-balance.mjs` give `Run` cores and unlocks paid through `waveCores`, make the sensible player unlock Frost, Lightning, Cannon, Support, Sniper in order whenever affordable at the start of its turn and record `unlockWave`, and keep the naive player on Blaster. Verify that `npm run balance` passes, including the unlock-wave check, and prints Frost 2, Lightning 4, Cannon 7, Support 9, Sniper 11 or earlier on Normal; tune `unlockCost` only if the check fails.
- [x] 2.2 Update the simulator paragraph in README.md to say the sensible player spends cores in order. Verify the sentence matches the behaviour in 2.1.

## 3. Tower panel, unlock action and tracker

- [x] 3.1 Add the strings from design decision 7 and the `cores(n)` helper to `js/i18n.js` in EN and IT, remove `panel.reach` and `unlock.pts`, and add the core icon to `js/icons.js`. Verify with `grep` that no code references the removed keys.
- [x] 3.2 In `js/ui.js` make locked tower buttons read "Unlock for N cores" and, on desktop, unlock on click when affordable; make the phone sheet button unlock when affordable; after an unlock save, show the unlock banner, rebuild the panel and refresh the tracker. Verify with play test scenarios "Unlock from the sheet" (phone, seeded 6 cores, Lightning unlocked and balance 1 after the tap, Lightning placeable) and "Unlock on click" (desktop, same reads), plus "Cannot afford" (seeded 3 cores, the control is disabled on phone and the click changes nothing on desktop).
- [x] 3.3 Rework `updateUnlockTracker` into the wallet row from design decision 5, keyed on cores and unlock count, and hide only the label and bar when all are unlocked. Verify with play test scenarios "Tracker toward Cannon" (seeded 15 cores and Frost, Lightning, Support, Sniper unlocked: text "Next tower: Cannon, 5 cores to go", bar width 75 percent), "Tracker affordable" (seeded 25: "Cannon can be unlocked", bar full) and "Tracker on a phone" (text at least 12px, no overlap with the controls at 390x844, EN and IT).

## 4. End screen and release

- [x] 4.1 Add `#cores-earned` to the game-over screen in `index.html`, fill it and `#next-unlock-hint` from `coresThisRun` and `getNextUnlock()` in `showGameOver`, and keep both across `applyLanguage`. Verify with play test scenarios "End screen after wave 2" ("+3 cores this run" and the next-unlock line naming the cheapest locked tower) and "End screen with everything unlocked" (no next-unlock line), EN and IT.
- [x] 4.2 Bump the `sw.js` cache name, add the two localStorage keys to the storage line in ARCHITECTURE.md and replace "score-based unlocks" wording in README.md with cores. Verify the three files mention cores and the old cache name is gone.
- [x] 4.3 Run the full play test and balance once more and verify both exit 0 on every layout and language.
  Blocked: balance already fails 4 checks on HEAD (Frost value on mobile, naive Easy/Hard outcomes), unrelated to cores. Close after the separate balance re-tune change lands.
