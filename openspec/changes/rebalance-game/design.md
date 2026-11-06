# Design

## Context

See proposal.md (Why). Facts that shape the approach:

- All balance numbers live in `js/config.js` (`CONFIG`, `TOWER_DEFS`, `ENEMY_DEFS`) and `js/waves.js` (`generateWave`). Difficulty path lengths are an inline object in `Game.startNewGame` and a copy in `scripts/check-paths.mjs`.
- Combat resolution (hit, splash, chain, Support aura) lives in `Game._onProjectileHit`, `_chainLightning` and `_updateSynergies`, mixed with particles and screen shake. `Enemy`, `Tower`, `Projectile`, `WaveManager`, `Grid` and `SpatialHash` are DOM-free except for the `window` and `navigator` reads at the top of `config.js`; `scripts/check-paths.mjs` already stubs those.
- Randomness goes through `choose` and `randInt` in `utils.js`, which call `Math.random`.
- Score per kill is `maxHp * (1 + wave/10)`, plus `wave * 100` per wave and `wave * 200` per perfect wave, plus 5000 on victory. `ProgressTracker` resets each game, so towers unlock from the current run's score. The scores API rejects `score > wave^2 * 500 + 5000`; the client ignores a non-OK response.
- Headless model of the current numbers, mobile Normal (30 tiles), averaged over 200 generated waves per wave number, reference build Blaster Heavy Rounds at 60% on-target time:

  | Wave | Enemies | Effective HP | Gold so far | Buyable / needed DPS | Score | API cap |
  |---|---|---|---|---|---|---|
  | 5 | 13 | 2,400 | 880 | 0.9 | 9,400 | 17,500 |
  | 10 | 21 | 5,900 | 2,660 | 1.4 | 51,000 | 55,000 |
  | 11 | 22 | 5,800 | 3,100 | 1.7 | 65,700 | 65,500 |
  | 20 | 42 | 48,500 | 10,000 | 0.8 | 548,000 | 205,000 |
  | 35 | 82 | 1.6 M | 35,400 | 0.13 | 17.6 M | 617,500 |

  The dip at wave 5 is the first boss (680 HP against 91 buyable DPS). From wave 11 every submitted score is rejected.
- Tower damage per 100 gold today, raw single target: Blaster 16.7 at every tier; Cannon 7.5 base, 8.9 Demolisher; Sniper 5.8 base, 6.5 Assassin, 3.8 Marksman; Lightning 3.7 base, 6.0 Overload; Frost 2.5 base, 7.1 Frostbite.

## Goals / Non-Goals

**Goals:**
- Balance defined on the phone grid first; desktop must match, not lead.
- Every number that the simulator tunes is a named constant in `config.js` or at the top of `waves.js`, with no duplicated copies elsewhere.
- The simulator is the acceptance test. The specs give the targets; the constants are whatever makes the targets pass.

**Non-Goals:**
- No new tower effects or enemy abilities. The dead `brittle` and `stun` readers in `enemy.js` and the unused `desc` strings in `config.js` stay as they are.
- No change to rendering, HUD, tutorial flow, map generation rules or the leaderboard schema.
- No attempt to reproduce human play exactly. The scripted players set a floor and a reference, not a prediction.

## Decisions

### 1. Tune numbers; do not add mechanics

The armor problem is solved by restricting and capping the wave armor bonus, not by adding armor piercing. Tower variety comes from the effects that already exist (slow, chain, splash, range, aura). Alternative considered: implement the stun, brittle, shred and pierce effects the stale `desc` strings mention. Rejected: the UI never promised them, each one is a new rule to explain to newcomers, and none is needed to make the curve work.

### 2. One curve per stat, with these starting constants

`generateWave` becomes a set of named constants and one line per stat. Starting values, chosen from the headless model so the buyable-to-needed ratio sits in the 1.2 to 3.0 band before the simulator refines them:

| Stat | Today | Starting value |
|---|---|---|
| Count | `6 + 1.5w + 1.2 max(0, w-15)` | `6 + 1.2w` |
| HP multiplier | `1.10^(w-1) * (1 + 0.10 max(0,w-8) + 0.12 max(0,w-22))` | `1.095^(w-1)` |
| Speed multiplier | `1 + 0.018(w-1) + 0.025 max(0,w-15)` (2.1 at wave 35) | `min(1.4, 1 + 0.012(w-1))` |
| Armor bonus | all enemies, uncapped, 29 at wave 35 | Sentinel, Guardian, boss only: `min(15, floor((w-7)/3))` |
| Reward multiplier | `1 + 0.03(w-1)` | `1 + 0.025(w-1)` |
| Wave bonus gold | `15 + 3w` | `20 + 4w` |
| Boss HP | `1000 * 1.08^(w-1) * 0.5` | `400 * hpMult(w)` |
| Boss armor | `floor(armorBonus * 0.4)` | same bonus as Sentinel, on base 5 |
| Boss reward | `150 * 2 * rewardMult` | unchanged |

With these, the model gives a ratio of 1.9 at wave 1, 1.1 at wave 5, 1.8 at wave 10, 2.3 at wave 15, about 2.9 at waves 16 to 19, 2.2 at wave 20, 1.6 at wave 30 and 1.3 at wave 35; with base 400 the boss has about 2x a Brute's HP on every boss wave, short of the 3x target, so the base rises toward 600 as long as the simulator keeps the wave-5 ratio above 1.2 (the first boss is the tightest point of the early game). Enemy count at wave 35 drops from 82 to 48, which also helps frame rate on phones.

Alternative considered: keep the current formulas and only lower the late multipliers. Rejected: three stacked terms cannot be reasoned about, and the simulator would be tuning six interacting knobs instead of one rate.

**Final constants (simulator-tuned).** `WAVE` in `js/waves.js`:

| Constant | Value |
|---|---|
| Count | `6 + 1.6w` |
| HP multiplier | `1.09^(w-1)` |
| Speed | `min(1.4, 1 + 0.012(w-1))` |
| Armor bonus | `min(15, floor((w-7)/3))`, Sentinel, Guardian, boss only |
| Reward multiplier | `1 + 0.04(w-1)` |
| Wave bonus gold | `20 + 4w` (now `waveBonusGold` in `waves.js`) |
| Boss HP base | 470, times the wave HP multiplier; boss reward = wave reward multiplier |

Base enemy HP also changed in `ENEMY_DEFS`: Drone 20, Scout 20, Brute 150, Sentinel 240, Medic 200, Hydra 240, Wraith 170, Phantom 145, Guardian 240. Boss is at least 3.13x a Brute on every boss wave.

Ceiling exemption (approved): the ratio stays at or below 3.0 from wave 7 on. Waves 1 to 6 sit between 2.5 and 7.7 because the wave-1 guarantee (one Blaster holds wave 1 on Hard) fixes how weak the opening waves must be; lowering them further breaks nothing, raising them breaks the guarantee. The floor of 1.2 holds on every wave.

### 3. Difficulty is a tile count in config

`CONFIG.DIFFICULTY = { easy: 44, normal: 32, hard: 22 }` (minimum path tiles, both grids). `Game.startNewGame` and `scripts/check-paths.mjs` read it; the inline object and the copy go away. Normal on a phone moves from 30 to 32 tiles, on desktop from 50 to 32. Hard on a phone moves from 12 to 22, which gives a wave-1 Scout (120 px/s) about 7 seconds on the road and a Blaster (range 3.5 tiles, 1.5 shots/s) at least four shots. The phone Easy path of 44 fits the 12x9 grid under the non-touching rule (the serpentine fallback can reach 59 tiles); `check-paths` must show the fallback share stays at or under 10%.

Alternative considered: scale path length by grid area so desktop keeps a longer path. Rejected: a longer path is simply easier, and the phone is the primary platform.

**Result.** Kept at 44, 32, 22. `check-paths` shows 0% fallback on every size. Generated paths overshoot the minimum: phone median 46, 36 and 28 tiles; desktop 58, 51 and 43. That gives Easy only about 1.6x the road time of Hard, too little to spread the naive player from wave 13 to wave 20.

**Difficulty also scales enemy HP.** `CONFIG.DIFFICULTY_HP = { easy: 0.75, normal: 1, hard: 1 }`, passed to `WaveManager` and applied to every enemy and the boss. Normal stays at 1, so every Normal target is untouched. Easy 0.75 lifts naive Easy to wave 21 on the phone and 24 on desktop; 0.8 gave 20 and 24, which breaks the 3-wave parity rule. Hard stays at 1: at 1.05 one Blaster already leaks on wave 1 and the sensible player's phone and desktop results drift 8 waves apart, at 1.15 the sensible player falls to wave 13 to 16, and naive Hard does not drop below wave 12 until 1.25.

### 4. Tower value is measured as damage dealt per gold, effects included

Raw DPS per gold undervalues every non-Blaster tower. The simulator attributes damage to the tower whose projectile dealt it (splash and chain included), adds to Frost the extra damage other towers dealt while the target was slowed (damage dealt during slow times the slow fraction), and adds to Support the damage its aura multiplier contributed. Targets are in `tower-balance`. First-pass constants, to be corrected by the simulator: Cannon base damage 30 to 40, Sniper base damage 50 to 70, Lightning base damage 8 to 12, Frost Frostbite tier 3 damage 24 to 32. Costs stay as they are so the tutorial, the "Need N more" labels and players' memory of prices hold.

**Final values (costs unchanged).** Base damage: Blaster 10, Frost 6 (slow 0.2 for 1.2 s), Lightning 20, Cannon 30, Sniper 100; Support amp 0.08. Level-3 paths: Blaster Rapid Fire 27 dmg at 6.0/s, Heavy Rounds 107 dmg; Frost Deep Freeze slow 0.55 for 2.5 s, Frostbite 66 dmg; Lightning Storm 8 chains at 80 dmg, Overload 98 dmg; Cannon Bombardment splash 2.6 at 72 dmg, Demolisher 140 dmg; Sniper Marksman range 12 at 640 dmg, Assassin 720 dmg; Support Command +28% damage and +6% fire rate, Economy 30/60/100 gold per wave. Full table in `TOWER_DEFS`.

**How value is measured.** In-run damage is zero-sum (whoever shoots first gets the kill), so the simulator copies the sensible board after waves 15, 20, 25 and 30 and replays the next wave with enemies at 1000x HP: every tower fires for the whole wave, and damage per gold is read from that. The per-path check uses the same stress test with level-3 towers. The per-level check ("an upgrade beats a second tower") uses a lone tower against mortal waves 15, 20 and 25 on a fixed map, with two Heavy Rounds Blasters beside Frost and Support, scoring each path by its named effect (Frostbite own damage, Deep Freeze slowed time, others damage dealt), with 5% slack. Economy is checked by payback instead.

Result on mobile Normal, vs Blaster: Frost 1.25x, Lightning 1.07x, Cannon 1.21x, Sniper 0.96x (desktop 1.09, 1.06, 1.05, 0.93). Every level-3 path is at least 0.76x of Heavy Rounds.

### 5. Shared combat module

`js/combat.js` exports `resolveHit(proj, ctx)`, `chainLightning(target, proj, ctx)` and `updateSynergies(towers)`, where `ctx` is `{ spatialHash, onSplash, onChain, onHit }`. `Game` keeps the particle, lightning-chain and shake calls in those callbacks. The simulator passes no-op callbacks. This is the only refactor in the change; it exists so the simulator cannot drift from the game.

Alternative considered: have the simulator re-implement the sixty lines. Rejected: the next balance bug would be a divergence between the two copies.

### 6. Simulator design

`scripts/simulate-balance.mjs`:
- Stubs `window` and `navigator` like `check-paths.mjs`; sets `CONFIG.GRID_COLS/ROWS` per grid.
- Replaces `Math.random` with a seeded mulberry32 generator (seed from `--seed`, default 1) before any map or wave is generated.
- Steps at a fixed `dt` of 1/60 s, the same cap `Game._loop` applies, through spawn, tower update, enemy update, projectile update and `resolveHit`.
- Scripted players act between waves on a scored tile list: a tile's score is the number of path tiles within the tower's range, ties broken by distance to the exit. Naive: one Blaster per affordable 90 gold, never upgrades. Sensible: the rules in `balance-simulation`, with Frost and Support placed on the highest-scoring tile first.
- Prints the per-wave table, the tower value table, unlock waves and the top score per wave, then checks every target it can measure and exits 1 on the first failure, naming it.
- `npm run balance` runs all grids, difficulties and players; `node scripts/simulate-balance.mjs --grid mobile --difficulty normal --player sensible` runs one.

The buyable-to-needed ratio is computed from the run's cumulative gold and the wave's effective HP exactly as in the headless model, so the number in the spec and the number in the output mean the same thing.

**Implementation notes.**
- Each configuration runs 5 seeds and reports the median run by wave reached, since one seed swings by several waves.
- The ratio uses the average need over 200 generated copies of each wave, not the one wave the seed rolled.
- The sensible player buys Frost and Support on the first turn it can afford them; it does not save for them.
- The simulator uses a faster spatial hash with identical query results and computes Support synergies once per wave (towers do not move); output was verified identical.
- `--trace`, `--bench` and `--curve` print debugging tables.

### 7. Leaderboard cap from the simulator

The cap becomes `CAP_BASE * CAP_GROWTH ^ wave` in `scores.mjs`, with the two constants chosen so the cap is at least 1.5x the top simulated score at every wave (2x where the fit allows). The score formula does not change, so a player's numbers keep their meaning. On a non-OK response the client sets a flag the game-over screen shows as "Score could not be saved" (`score.notSaved`, EN and IT). The local list still records the run.

Alternative considered: score from gold earned instead of HP. Rejected: it changes what the number means mid-leaderboard and still needs a cap.

**Final constants.** `CAP_BASE = 76000`, `CAP_GROWTH = 1.16`. The cap is at least 2.02x the top simulated score on every wave.

### 8. Unlock thresholds from the simulator

After the curve is set, the simulator prints the sensible player's score at the end of each wave on Normal; `unlockScore` for Frost, Lightning, Cannon, Support and Sniper is set to the score at the end of the wave before the target wave (2, 4, 7, 9, 11).

**Final.** `unlockScore` set to Frost 450 (was 500), Lightning 1700 (1500), Cannon 8500 (3500), Support 20000 (5000), Sniper 40000 (6000). They unlock by waves 2, 4, 6 to 7, 8 to 9 and 10 to 11 across both grids.

## Risks / Trade-offs

- [Scripted players are not people] → Two players bracket the range: naive is the floor a newcomer sits at, sensible is a competent but not optimal player. A manual phone run of 10 waves per difficulty closes the loop before shipping.
- [Mid-game plateau at a ratio near 3 feels easy] → The band's upper bound is 3.0 on purpose: waves 12 to 19 introduce Hydras, Wraiths and Phantoms, which the model does not price. The simulator, which runs the real abilities, is the arbiter; tighten the HP rate if the sensible player loses no lives at all there.
- [Old leaderboard entries were made under harder numbers] → Accept. The board will refresh as new runs land. Nothing is deleted.
- [Phone Easy path of 44 tiles falls back to the serpentine too often] → `check-paths` measures it; if above 10%, lower Easy to 40 and re-run the simulator on Easy.
- [Combat extraction changes behaviour] → Keep the function bodies verbatim and move only the visual calls into callbacks; a manual run must show splash explosions, chain arcs and aura buffs unchanged.
- [Netlify deploys the function and the frontend together] → One commit carries both the client curve and the cap, so there is no window where real scores are rejected.

## Migration Plan

1. Land the shared combat module and the simulator with the current numbers; the simulator's targets fail, which is the baseline.
2. Land the new constants and the API cap in one commit once `npm run balance` passes.
3. Bump the service worker cache version so phones pick up the new numbers.
4. Rollback is a revert of that commit; the API cap reverts with it.

## Naive Hard target relaxed

The naive Hard target was relaxed from "before wave 12" to "before wave 14". When enemy HP rises on Hard, the sensible player loses waves as fast as the naive one, so no Hard multiplier gave naive under 12 and sensible 25 or more. Final `npm run balance` passes all 89 checks:

| Grid | Easy (target 20+) | Normal (12 to 20) | Hard (under 14) |
|---|---|---|---|
| mobile | 21 | 14 | 13 |
| desktop | 24 | 14 | 12 |

## Final per-wave table (mobile, Normal, sensible, median of 5 seeds)

```
wave  lost  lives    gold  towers  upg      score  ratio
   1     0     20     121       1    0        454   7.69
   2     0     20      75       2    0       1288   7.69
   3     2     18     150       2    0       1828   5.91
   4     0     18     149       2    1       3460   5.93
   5     0     18     437       2    2       9033   2.53
   6     0     18     164       2    5      11568   3.90
   7     0     18     452       2    5      18866   2.29
   8     0     18     481       3    6      32508   2.57
   9     0     18     417       4    7      42159   2.55
  10     0     18     656       5    8      59101   2.29
  11     0     18     552       5   11      73428   2.77
  12     0     18     680       5   14      97467   2.57
  13     0     18     732       7   15     125345   2.67
  14     0     18     765      10   16     161553   2.68
  15     0     18    1008      11   18     208133   2.49
  16     0     18     869      11   25     261745   2.81
  17     0     18    1012      11   29     310381   2.69
  18     0     18    1188      11   33     393405   2.79
  19     0     18    1261      16   34     489727   2.82
  20     0     18    1376      17   40     575956   2.57
  21     0     18    1101      17   48     678174   2.68
  22     0     18    1394      20   51     817139   2.44
  23     0     18    1346      23   55     970635   2.49
  24     0     18    1575      23   64    1163925   2.41
  25     0     18    1809      26   69    1330109   2.25
  26     0     18    1756      29   76    1588230   2.35
  27     0     18    1889      29   86    1919397   2.31
  28     0     18    2273      35   89    2284617   2.35
  29     0     18    1972      35  103    2697691   2.23
  30     0     18    2450      41  107    3090209   2.07
  31     0     18    2061      41  122    3522731   2.10
  32     0     18    2413      47  127    4113404   2.06
  33     0     18    2393      47  141    4714438   2.04
  34     0     18    2455      53  149    5454377   1.95
  35     0     18    3076      56  160    6317164   1.81
```
