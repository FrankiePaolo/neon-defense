# Spec Delta

## Purpose

Makes balance measurable: a headless simulation runs the real game rules with scripted players and reports whether the numbers meet the targets, so a balance change is checked by a command rather than by feel.

## ADDED Requirements

### Requirement: The simulator runs the real rules
The simulator SHALL run the game's own wave generation, enemy movement and effects, tower targeting and firing, projectile travel, splash, chain and support aura, without a browser. It SHALL accept a grid (phone or desktop), a difficulty and a scripted player, run waves until the player loses or wins, and print one row per wave.

#### Scenario: One run
- **WHEN** the simulator is run for the sensible player on Normal on the phone grid
- **THEN** it prints, per wave, lives lost, gold at wave end, towers owned, score, and buyable DPS over needed DPS, and ends with the wave reached

### Requirement: Two scripted players
The simulator SHALL provide a naive player (buys a Blaster whenever it can afford one, never upgrades, places on the best free tile by road coverage) and a sensible player (buys the cheapest tower type it owns the fewest of among unlocked ones, upgrades its oldest tower when an upgrade costs less than a new tower, keeps a Frost and a Support near the busiest bend). Both SHALL act only between waves.

#### Scenario: Naive player behaviour
- **WHEN** the naive player has 95 gold between waves and a free tile
- **THEN** it places one Blaster and nothing else

### Requirement: The simulator reports tower value
The simulator SHALL report, for each tower type, total damage dealt per gold invested, counting splash and chain hits, plus the extra damage other towers dealt to enemies slowed by Frost and the extra damage from Support auras.

#### Scenario: Value table
- **WHEN** a sensible run finishes
- **THEN** the output includes a table with one row per tower type and its damage per gold

### Requirement: The simulator reports unlock waves and the top score
The simulator SHALL report the wave on which each tower unlocked and the highest score reached at each wave across all runs, so the leaderboard cap can be derived from it.

#### Scenario: Cap derivation
- **WHEN** the simulator runs every grid, difficulty and player
- **THEN** it prints, per wave, the highest score any run had on finishing that wave

### Requirement: Pass criteria fail the command
The simulator SHALL exit non-zero and name the failed target when any requirement in `wave-scaling`, `tower-balance` or `difficulty-levels` that it can measure does not hold. It SHALL use a fixed random seed so two runs on the same code give the same result.

#### Scenario: Regression
- **WHEN** a constant is changed so the naive player wins Normal
- **THEN** the simulator exits non-zero and reports the "naive player on Normal ends between wave 12 and 20" target as failed

### Requirement: Rejected scores are visible
The leaderboard plausibility cap SHALL be at least 1.5x the highest score the simulator produced at each wave. When a submission is rejected, the game-over screen SHALL say the score could not be saved instead of failing silently.

#### Scenario: Submission rejected
- **WHEN** the scores API answers with a rejection
- **THEN** the game-over screen shows "Score could not be saved" in the current language, and the local high-score list still records the run
