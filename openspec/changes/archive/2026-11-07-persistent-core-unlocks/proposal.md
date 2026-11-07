# Proposal

## Why

Every run starts from scratch: `startNewGame` resets the progress tracker, so the score-based tower unlocks (Frost at 450 points up to Sniper at 40,000) are re-earned in every run and nothing carries over between sessions. ADDICTIVENESS-REVIEW.md ranks this as the biggest gap against Bloons TD 6, Kingdom Rush and the rogue-like tower defenses, which all keep some progress across runs. A new player sees Blaster only, every time, and a returning player has no reason to come back beyond the leaderboard.

## What Changes

- **Cores, a persistent unlock currency.** Clearing a wave pays cores equal to the wave number, double on a boss wave. Cores and unlocked towers are saved on the device at once and survive reloads and new games. Nothing is lost on game over.
- **Towers are bought with cores, in the order the player chooses.** Each tower other than Blaster has a core price. A locked tower in the panel reads "Unlock for N cores" and is unlocked from its tooltip or sheet whenever the player can afford it, between or during waves. The score thresholds go away. **BREAKING** for existing players: towers they used to see within a run are locked again until bought, which a single run pays for.
- **Cores never buy power.** Only unlocks. Start gold, lives, tower stats and the wave curve are unchanged, so leaderboard scores stay comparable. Cores are never sent to the server.
- **First-run pacing is kept.** Prices are set so that a fresh profile buying the towers in order still gets Frost by wave 2, Lightning by wave 4, Cannon by wave 7, Support by wave 9 and Sniper by wave 11, as the tower-balance spec already requires. The balance simulator checks it.
- **Progress is visible.** The HUD's next-unlock row shows the core balance and the cores left to the cheapest locked tower. The end screen shows the cores earned this run and "Next unlock: Cannon in 12 cores". English and Italian.
- Out of scope, as future spends for the same currency: starting loadouts, map styles, a third upgrade path. After the five towers, cores keep accumulating and the balance stays visible.

## Capabilities

### New Capabilities
- `unlock-progression`: how cores are earned, saved, shown and spent on tower unlocks across runs.

### Modified Capabilities
- `hud-clarity`: "Locked towers explain how to unlock" says the core price instead of "Reach N points"; "Next-unlock progress is labelled" shows the core balance and cores to go instead of points.
- `tower-balance`: "Towers unlock at intended waves" is stated in core prices from a fresh profile instead of unlock scores.
- `balance-simulation`: the sensible scripted player buys unlocks with cores in a fixed order, so the unlock-wave report still holds.

## Impact

- Code: `js/economy.js` (`ProgressTracker` becomes the cores wallet with localStorage), `js/config.js` (`unlockScore` becomes `unlockCost`), `js/game.js` (pay cores on wave clear, no reset on new game, no score unlock check), `js/ui.js` (locked buttons, unlock button in tooltip and sheet, HUD cores row, end screen), `js/i18n.js` (new strings, EN and IT), `index.html` (core icon, end-screen line), `js/icons.js`, `sw.js` (cache bump).
- Scripts: `scripts/simulate-balance.mjs` (sensible player spends cores), `scripts/play-test.mjs` (unlock, persistence and end-screen scenarios).
- No backend, API or leaderboard change. Two new localStorage keys. The in-flight `ux-and-bug-pass` change touches other `hud-clarity` requirements, so the two can be archived in either order.
