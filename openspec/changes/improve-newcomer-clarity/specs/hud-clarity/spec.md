# Spec Delta

## Purpose

Makes the HUD, tower panel and tower details readable at a glance by a player who has never seen a tower defense game, in English and Italian, on a phone first.

## ADDED Requirements

### Requirement: Resource counters carry icons
The gold, lives and wave counters SHALL each show a distinct icon next to the value: a coin for gold, a heart for lives, and a wave or flag symbol for the wave number. The wave counter SHALL show progress as "current / total".

#### Scenario: HUD at game start
- **WHEN** a new game starts
- **THEN** the HUD shows a coin with 90, a heart with 20, and the wave as "0 / 35"

### Requirement: Tower buttons show the tower
Each tower button in the panel SHALL show a small picture of the tower that matches how it looks on the board, plus its name and cost.

#### Scenario: Panel matches the board
- **WHEN** the player places a Blaster
- **THEN** the tower on the board looks like the picture on the Blaster button

### Requirement: Locked towers explain how to unlock
A locked tower button SHALL show a lock icon and a plain sentence with the points needed, for example "Reach 500 points". It SHALL NOT show a bare score label.

#### Scenario: Locked tower at first launch
- **WHEN** a first-time player opens the tower panel
- **THEN** every tower except Blaster shows a lock and "Reach N points" in the current language

### Requirement: Unaffordable towers are visibly unavailable
An unlocked tower the player cannot afford SHALL appear dimmed and SHALL show how much gold is missing. It SHALL update as gold changes.

#### Scenario: Not enough gold
- **WHEN** the player has 40 gold and a tower costs 90
- **THEN** that tower's button is dimmed and shows "Need 50 more"
- **AND** the button returns to normal as soon as gold reaches 90

### Requirement: Next-unlock progress is labelled
The next-unlock progress bar SHALL have a text label naming the tower and the points left, for example "Next tower: Frost, 120 points to go". It SHALL be hidden when every tower is unlocked.

#### Scenario: Progress toward Frost
- **WHEN** the best score is 380 and Frost unlocks at 500
- **THEN** the bar reads "Next tower: Frost, 120 points to go" and is 76 percent full

### Requirement: Tower stats use plain language
Tower stats in the tooltip, the placement preview and the upgrade panel SHALL use plain words or icons with words. Abbreviations such as "DMG", "RATE", "RNG" and "AoE" SHALL NOT appear.

#### Scenario: Blaster stats
- **WHEN** the player opens the Blaster details
- **THEN** the stats read as Damage, Shots per second and Range, each with an icon

### Requirement: Upgrades state what they improve
Each upgrade row SHALL show its cost and one short line saying what gets better. When one upgrade path is chosen, the other path SHALL show it is locked and why.

#### Scenario: Choosing an upgrade path
- **WHEN** the player buys the first upgrade of path A
- **THEN** path B shows a lock and "You picked the other path"

### Requirement: Touch devices show no keyboard hints
On touch devices, buttons and help text SHALL NOT mention keyboard keys.

#### Scenario: Start button on a phone
- **WHEN** the game runs on a touch device
- **THEN** the start button reads "START WAVE" without "(SPACE)"

### Requirement: Difficulty names say how hard it is
The difficulty buttons SHALL be labelled Easy, Normal and Hard, with the path length as a smaller subtitle.

#### Scenario: Difficulty screen
- **WHEN** the player opens the difficulty screen in English
- **THEN** the buttons read "EASY" (long path), "NORMAL" (medium path) and "HARD" (short path)

### Requirement: New text is localized
Every new or changed piece of text SHALL exist in English and Italian, and SHALL follow the selected language.

#### Scenario: Switch to Italian
- **WHEN** the player switches the language to Italian
- **THEN** all HUD, panel, lock, cost, stat and difficulty text added by this change appears in Italian
