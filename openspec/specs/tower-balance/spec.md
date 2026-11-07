# tower-balance Specification

## Purpose

Defines what each tower and upgrade path must be worth for its gold, and when each tower becomes available, so that no tower is a trap and no tower is the only sensible buy.

## Requirements

### Requirement: Every tower earns its cost
In a sensible run on Normal, the damage dealt per gold invested by each attacking tower type (Blaster, Frost, Lightning, Cannon, Sniper) SHALL be between 0.75x and 1.25x the Blaster's. Damage dealt counts splash and chain hits. Slow and buff towers count the extra damage they enable, as reported by the simulator.

#### Scenario: Cannon value
- **WHEN** the simulator reports damage per gold by tower type for the sensible player on Normal
- **THEN** the Cannon's value is within 0.75x to 1.25x of the Blaster's

#### Scenario: Frost value
- **WHEN** the simulator reports the Frost's own damage plus the extra damage other towers dealt to slowed enemies
- **THEN** the sum per gold is within 0.75x to 1.25x of the Blaster's

### Requirement: Both upgrade paths are worth buying
For each tower, the fully upgraded path A and path B SHALL each deliver at least 0.75x the damage per gold (effects included) of the fully upgraded Blaster Heavy Rounds path.

#### Scenario: Sniper Marksman
- **WHEN** the simulator compares a Marksman Sniper (range path) with a Heavy Rounds Blaster
- **THEN** the Marksman's damage per gold, with its longer on-target time, is at least 0.75x the Blaster's

### Requirement: Upgrades beat buying a second tower
Each upgrade level SHALL raise the tower's damage per second, or the effect it is named for, by at least the share of its cost over the tower's total cost so far.

#### Scenario: First Blaster upgrade
- **WHEN** a Blaster costing 90 buys a 100 gold upgrade
- **THEN** its damage per second at least doubles

### Requirement: Towers unlock at intended waves
Tower core prices SHALL be set so that, from a fresh profile, in a sensible run on Normal that buys the towers in the order Frost, Lightning, Cannon, Support, Sniper as soon as it can afford each, Frost unlocks by wave 2, Lightning by wave 4, Cannon by wave 7, Support by wave 9 and Sniper by wave 11. Each unlock SHALL happen at least one wave before the enemy type it counters first appears (Frost before Scouts, Cannon before Hydras, Sniper before Wraiths).

#### Scenario: Sniper before Wraiths
- **WHEN** the sensible scripted player, from a fresh profile, reaches wave 14 on Normal
- **THEN** the Sniper is already unlocked

### Requirement: The first tower holds wave 1
One Blaster placed on the tile the tutorial suggests SHALL kill every wave-1 enemy on every difficulty, and start gold SHALL be at least the Blaster's cost.

#### Scenario: Newcomer's first wave
- **WHEN** the naive scripted player places one Blaster on the suggested tile and starts wave 1 on Hard
- **THEN** no life is lost
