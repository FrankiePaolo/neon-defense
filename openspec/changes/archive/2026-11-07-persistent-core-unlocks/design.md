# Design

## Context

See proposal.md for the motivation. Facts that shape the approach:

- `ProgressTracker` in `js/economy.js` holds one in-memory `bestScore`; `startNewGame` calls `reset()` on it. Unlock state is derived on every read from `TOWER_DEFS[type].unlockScore` and the current or best score.
- Five places read unlock state: `_buildTowerPanel`, `_buildStatsTooltipHTML`, `updateUnlockTracker` and `showGameOver` in `js/ui.js`, and `_checkUnlocks` in `js/game.js`, which runs on wave clear and shows the unlock banner.
- On phones a locked tower opens the stats sheet with a disabled "LOCKED" button. On desktop a locked tower shows a hover tooltip and its click does nothing.
- `scripts/simulate-balance.mjs` derives unlocks from score too (`isUnlocked`, `checkUnlocks`, `unlockWave`) and the "Towers unlock at intended waves" check reads `unlockWave`.
- Every saved value uses a `neon_td_` localStorage key with a try/catch around the access. `scripts/play-test.mjs` can seed localStorage before a scenario through its `open` option.

## Goals / Non-Goals

**Goals:**
- One owner for cores and unlocks, read everywhere through the same two calls.
- Keep the simulator the single check for first-run pacing.
- Keep every element id the tutorial and the play test rely on.

**Non-Goals:**
- Any server-side storage of cores, or cores in the score payload.
- A profile reset control. Clearing site data is the reset.
- Spending cores from the menu screen. The tower panel is the only shop.

## Decisions

### 1. `ProgressTracker` becomes the wallet
It loads `neon_td_cores` (integer) and `neon_td_unlocked` (JSON array of tower types, Blaster implied) in its constructor and writes them in `earn(n)` and `unlock(type)`. It exposes `cores`, `isTowerUnlocked(type)`, `canUnlock(type)`, `unlock(type)` and `getNextUnlock()`, which returns the cheapest locked tower as `{ type, cost, toGo }` or null. `reset()`, `bestScore`, `updateBestScore` and `getNewlyUnlockedTowers` go away, and `startNewGame` stops resetting it.
*Why:* one object already sits where every reader looks. *Alternative:* keep score thresholds and only persist `bestScore`. Rejected: no decision for the player, and a second system the day cores are added.

### 2. Prices live in `TOWER_DEFS.unlockCost`
`unlockScore` is renamed to `unlockCost`, in cores: Blaster 0, Frost 1, Lightning 5, Cannon 20, Support 15, Sniper 25. Derivation, cores held by a fresh profile after each wave on the pay rule (wave n pays n, boss waves 5 and 10 pay double): 1, 3, 6, 10, 20, 26, 33, 41, 50, 70. Buying in order costs 1, 6, 26, 41, 66 cumulatively, which makes each tower available for waves 2, 4, 7, 9 and 11, the waves the tower-balance spec requires. The simulator confirms them; the numbers may move but the rule stays.

### 3. Pay on wave clear, inside `_onWaveComplete`
`game.js` adds `coresThisRun`, pays `progressTracker.earn(isBoss ? 2 * wave : wave)` before the victory check so wave 35 pays, and shows a "+N cores" floating text over the HUD plus a pulse on the HUD core value, like gold. `_checkUnlocks` is deleted; the unlock banner moves to the unlock action.

### 4. Unlock action: desktop click, phone sheet button
- Desktop: a locked tower button reads "Unlock for N cores"; clicking it calls `unlock` when affordable, otherwise nothing. The hover tooltip keeps the price line.
- Phone: tapping a locked tower opens the sheet as today; its bottom button becomes "Unlock for N cores", enabled when affordable, and unlocks on tap.
After an unlock: save, show the existing unlock banner, rebuild the tower panel, refresh the tracker row.
*Why:* one gesture per platform that already exists. *Alternative:* a button inside the desktop hover tooltip. Rejected: moving the pointer into the tooltip hides it.

### 5. The tracker row shows the wallet
`#unlock-tracker` keeps its id and position. Content becomes: core icon and balance on the left, then the label (`Next tower: Frost, 1 core to go`, `Cannon can be unlocked`, or nothing when all are unlocked), then the bar at `min(cores / cost, 1)`. It refreshes when cores or unlocks change, keyed on `cores + unlocked.size`, not every frame.

### 6. End screen
`showGameOver` gets `coresThisRun` from the game and fills a new `#cores-earned` line ("+28 cores this run"). `#next-unlock-hint` switches from points to `getNextUnlock()`.

### 7. Strings
New keys, EN and IT: `hud.cores`, `unlock.price` ("Unlock for {n}"), `unlock.canUnlock` ("{name} can be unlocked"), `unlock.toGo` becomes "{n} to go" with the count rendered by a small `cores(n)` helper that returns "1 core" or "5 cores" ("1 core" / "5 core" in Italian, the word is invariant). `panel.reach` and `unlock.pts` are removed. A core icon (a small hexagonal chip) is added to `js/icons.js`.

### 8. Simulator
`Run` gets `cores` and `unlocked`; on wave clear it earns by the same rule as the game (shared through `waves.js` as `waveCores(wave)` so there is one rule). The sensible player, at the start of each turn, unlocks the next tower in the fixed order while it can afford it and records `unlockWave`. The naive player never spends cores. The existing pass check on `unlockWave` stays as is.

## Risks / Trade-offs

- [Returning players lose the towers they used to reach within a run] → One run pays for all five. Announce it in the end screen's "+N cores" line rather than a migration dialog.
- [Cores pile up once the five towers are bought] → The balance stays visible as savings for the next spends (loadouts, map styles), which the proposal lists as out of scope.
- [localStorage edited by hand gives free unlocks] → Harmless: unlocks never reach the server and the score cap already bounds what early towers can score.
- [localStorage cleared or private mode] → Progress is lost or absent; every read and write is wrapped and the game runs with 0 cores and Blaster only.
- [The simulator and the game could drift on the pay rule] → One function in `waves.js` used by both.

## Migration Plan

No server change. Ship with a `sw.js` cache bump. Rollback is a redeploy of the previous build; the two new keys are then ignored.
