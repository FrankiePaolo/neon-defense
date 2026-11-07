# Spec Delta

## MODIFIED Requirements

### Requirement: Two scripted players
The simulator SHALL provide a naive player (buys a Blaster whenever it can afford one, never upgrades, places on the best free tile by road coverage) and a sensible player (starts from a fresh profile, spends cores on the towers in the order Frost, Lightning, Cannon, Support, Sniper as soon as it can afford each, buys the cheapest tower type it owns the fewest of among unlocked ones, upgrades its oldest tower when an upgrade costs less than a new tower, keeps a Frost and a Support near the busiest bend). Both SHALL act only between waves.

#### Scenario: Naive player behaviour
- **WHEN** the naive player has 95 gold between waves and a free tile
- **THEN** it places one Blaster and nothing else

#### Scenario: Sensible player spends cores in order
- **WHEN** the sensible player has 6 cores, Frost unlocked and Lightning priced at 5
- **THEN** it unlocks Lightning before buying any tower that turn
