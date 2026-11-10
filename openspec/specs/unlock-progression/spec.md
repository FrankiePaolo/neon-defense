# unlock-progression Specification

## Purpose
Defines cores, the unlock currency that is earned by clearing waves, kept on the device across runs, and spent on tower unlocks in the order the player chooses, without ever buying power.

## Requirements

### Requirement: Clearing a wave pays cores
When a wave is cleared the player SHALL earn cores equal to the wave number, doubled on a boss wave (every fifth wave). Cores SHALL be paid on every difficulty alike and SHALL be shown on the board as they are paid.

#### Scenario: Ordinary wave
- **WHEN** wave 7 is cleared
- **THEN** the player earns 7 cores and the HUD core balance rises by 7

#### Scenario: Boss wave
- **WHEN** wave 10 is cleared
- **THEN** the player earns 20 cores

### Requirement: Cores and unlocks survive runs
The core balance and the set of unlocked towers SHALL be saved on the device as soon as they change and SHALL be the same after a reload, after game over and in the next new game. Nothing SHALL be deducted on game over.

#### Scenario: Reload after a run
- **WHEN** a player with 12 cores and Frost unlocked reloads the page and starts a new game
- **THEN** the balance is 12 and Frost is unlocked from wave 1

#### Scenario: Game over keeps progress
- **WHEN** a player loses on wave 6 with 15 cores
- **THEN** the next new game starts with 15 cores

### Requirement: Towers are unlocked with cores
Every tower except Blaster SHALL have a core price. A locked tower SHALL be unlocked by spending its price from the tower's tooltip or sheet, at any point of a game, when the balance covers it. Unlocking SHALL be announced like a new tower and the tower SHALL be buildable at once. Unlock order SHALL be the player's choice.

#### Scenario: Affordable unlock
- **WHEN** the player has 6 cores and opens the Lightning tooltip, priced at 5 cores
- **THEN** it shows an enabled "Unlock for 5 cores" control, and after using it the balance is 1, the unlock banner names Lightning and Lightning can be placed

#### Scenario: Unaffordable unlock
- **WHEN** the player has 3 cores and opens the Lightning tooltip, priced at 5 cores
- **THEN** the "Unlock for 5 cores" control is disabled

#### Scenario: Order is free
- **WHEN** the player has 20 cores and only Blaster unlocked
- **THEN** they can unlock Cannon before Frost

### Requirement: Cores never change the run
Cores SHALL only unlock towers. Start gold, lives, tower stats, tower gold costs and the wave curve SHALL be the same whatever the balance or the unlocks, and cores SHALL never be sent to the leaderboard.

#### Scenario: Veteran run
- **WHEN** a player with every tower unlocked starts a new game on Normal
- **THEN** they start with the same gold and lives as a fresh profile and the score submitted is the same payload as before

### Requirement: End screen shows core progress
The game-over and victory screen SHALL show the cores earned in that run and, while a tower is still locked, the cheapest locked tower and the cores left to it.

#### Scenario: Run ends with a tower still locked
- **WHEN** a run that earned 28 cores ends with 40 cores and Sniper locked at 25
- **THEN** the screen reads "+28 cores this run" and the next-unlock line names the cheapest locked tower with the cores left, or 0 when affordable

#### Scenario: Everything unlocked
- **WHEN** a run ends with every tower unlocked
- **THEN** the screen shows the cores earned and no next-unlock line

### Requirement: Unlock readiness is visible
An affordable locked tower SHALL show its full-colour picture, an open lock and a purple border. Its localized cost SHALL remain visible. A purchase SHALL show the tower picture in the unlock notification. The next unlock hint SHALL show its picture and say when it is ready.

#### Scenario: A tower becomes affordable
- **WHEN** the player has enough cores for a locked tower
- **THEN** the tower card shows its ready state and its cost
