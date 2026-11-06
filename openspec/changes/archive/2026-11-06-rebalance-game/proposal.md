# Proposal

## Why

The 35-wave campaign cannot be finished, and the leaderboard stops accepting scores around wave 11. A headless model of the current numbers (average of 200 generated waves per wave number, see design.md) shows that enemy effective HP grows about 25% per wave after wave 20 while gold grows about 7% per wave. Even spending every coin on the most gold-efficient tower (Blaster, Heavy Rounds), the damage a player can buy drops below what the wave needs at wave 19 on a phone and ends at about one eighth of the need at wave 35:

| Wave | Enemies | Effective HP in the wave | Gold earned so far | Buyable DPS / needed DPS | Run score | Leaderboard cap |
|---|---|---|---|---|---|---|
| 5 | 13 | 2,400 | 880 | 0.9 | 9,400 | 17,500 |
| 10 | 21 | 5,900 | 2,660 | 1.4 | 51,000 | 55,000 |
| 15 | 28 | 15,500 | 5,700 | 1.25 | 174,000 | 117,500 |
| 20 | 42 | 48,500 | 10,000 | 0.8 | 548,000 | 205,000 |
| 30 | 69 | 548,000 | 24,800 | 0.25 | 6.0 M | 455,000 |
| 35 | 82 | 1.6 M | 35,400 | 0.13 | 17.6 M | 617,500 |

Around that core problem the numbers are inconsistent in ways players feel:

- **Phones get a harder game.** Difficulty is "path length = grid columns x factor", so Normal is 30 tiles on a phone and 50 on desktop. Most players are on phones (see the project memory), so the version most people play gives 40% less time to shoot each enemy.
- **Hard mode is 12 tiles on a phone.** A Scout crosses it in about 4 seconds. By wave 15 enemy speed is 1.6x, and the path cannot be held with the ranges and fire rates we have.
- **Towers are not worth the same.** Blaster gives 17 DPS per 100 gold at every tier. Cannon Demolisher gives 9, Sniper Assassin 6.5, Sniper Marksman 3.8. Chain, splash and slow do not close that gap, so the rational play is "only Blasters".
- **Bosses stop being bosses.** Boss HP grows 8% per wave (then halved) while regular HP grows 10% per wave plus linear bonuses, so from wave 18 a Brute has more HP than the Overlord.
- **Armor double-scales.** From wave 9 every enemy gains flat armor on top of the HP multiplier, reaching 29 at wave 35 (54% damage reduction). Nothing in the game counters armor.
- **Scores outrun the leaderboard.** Score per kill is `maxHp * (1 + wave/10)`, so the HP curve drives it. The scores API rejects any score above `wave^2 * 500 + 5000`. With the current curve a run passes that cap at wave 11, the submit fails and the player is never told. Tower unlocks also key off score, so the HP curve sets when Frost, Lightning, Cannon, Support and Sniper appear.

The goal: a player who places sensibly and upgrades can win Normal on a phone; Easy forgives a newcomer; Hard is the leaderboard mode; every tower and both upgrade paths are a reasonable buy; every finished run can be submitted; and the next balance change is checked by a script, not by feel.

## What Changes

- **One scaling model for waves.** Enemy count, HP, speed, armor and reward each follow one curve with a named constant, in place of the stacked exponential and linear terms. HP growth per wave is tied to income growth so buyable damage stays within a fixed band of the need from wave 1 to 35. Speed growth is capped. Wave armor applies only to Sentinels, Guardians and bosses, and is capped.
- **Bosses scale with the wave.** Boss HP is the regular HP multiplier times a fixed base, so the boss wave is always the hardest wave of its 5-wave block and the boss always has several times a Brute's HP.
- **Same difficulty on every screen.** Each difficulty is a fixed number of path tiles on both grids. Hard stays the short path, but long enough to be held. The subtitles "long path / short path" stay true.
- **Towers priced by what they do.** Each tower and upgrade path lands within a band of the Blaster's damage per gold once its effect is counted (slow, chain, splash, range, buff). No new mechanics: the existing effects are tuned, not extended.
- **Economy and unlocks follow the curve.** Start gold, wave bonus, kill rewards and the Support Economy path are set from the same income curve the HP model uses. Tower unlock scores are re-set so each tower unlocks at an intended wave on Normal.
- **Leaderboard accepts every real run.** The plausibility cap in the scores API is derived from the new curve (a margin above the highest score the simulator can produce at each wave), and a rejected submission is shown to the player instead of failing silently.
- **A balance simulator.** `scripts/simulate-balance.mjs` runs the real wave, enemy, tower and projectile code headless on both grids and all three difficulties with two scripted players (a naive one that buys only Blasters and never upgrades, and a sensible one that upgrades and spreads tower types). It reports lives lost per wave, the wave each tower unlocks, buyable-vs-needed DPS, damage per gold by tower type, and the top score per wave. The pass criteria in the `balance-simulation` spec must hold before the numbers ship.
- **Combat resolution shared with the simulator.** Hit, splash, chain and aura logic moves from `game.js` to a DOM-free module so the game and the simulator run one implementation.

## Capabilities

### New Capabilities
- `wave-scaling`: how enemy count, HP, speed, armor, rewards and bosses grow from wave 1 to 35, and how enemy growth relates to income growth.
- `tower-balance`: the value each tower and upgrade path must deliver for its cost, and when each tower unlocks.
- `difficulty-levels`: what Easy, Normal and Hard mean in path tiles, and parity between the phone and desktop grids.
- `balance-simulation`: the headless simulator, its scripted players, and the pass criteria every balance change must meet, including the leaderboard cap.

### Modified Capabilities
None. `hud-clarity` and `gameplay-feedback` requirements are unchanged; the "score not saved" message is a new behaviour that belongs to `balance-simulation`'s leaderboard requirement rather than a change to an existing one.

## Impact

- Code: `js/config.js` (tower, enemy, economy and difficulty constants), `js/waves.js` (curves), `js/game.js` (difficulty from config, combat resolution extracted), new `js/combat.js`, `js/economy.js` (submit failure surfaced), `js/ui.js` and `js/i18n.js` (one new string in EN and IT), `scripts/simulate-balance.mjs` (new), `scripts/check-paths.mjs` (reads path lengths from config instead of its own copy), `package.json` (`"type": "module"` and a `balance` script), `sw.js` (cache version bump), `README.md` (simulator command).
- Backend: `netlify/functions/scores.mjs` plausibility cap. Existing rows stay in the table; they were made under different numbers, so the top of the board will change as new runs come in.
- Tutorial: `js/tutorial.js` assumes the first tower is a Blaster the player can afford at start. Start gold stays at or above the Blaster cost.
- The upgrade `desc` strings in `config.js` ("15% stun chance", "Execute < 30% HP" and others) are not shown anywhere; the UI reads its lines from `i18n.js`, which already describe only real effects. `enemy.js` reads `brittle` and `stun` effects that nothing applies. Both are dead code left as they are.
- The in-flight `hud-readability-upgrade` change edits `ui.js` and `index.html` for layout; this change adds one string there, so the two can land in either order.
