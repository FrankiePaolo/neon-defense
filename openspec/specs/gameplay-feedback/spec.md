# gameplay-feedback Specification

## Purpose

Shows the player, on screen and without sound, what just happened and what they can do now: lives lost, gold earned, which phase the game is in, and why a tower cannot be placed.

## Requirements

### Requirement: Losing a life is visible
When an enemy reaches END, the game SHALL show it visually: END flashes, a "-1" heart rises from END, and the lives counter flashes red and shakes. Sound stays as it is.

#### Scenario: Enemy reaches the base
- **WHEN** an enemy reaches END
- **THEN** END flashes, a "-1" heart appears at END, and the lives counter flashes red

#### Scenario: Muted device
- **WHEN** the device is muted and an enemy reaches END
- **THEN** the player can still see that a life was lost

### Requirement: Earned gold flows to the counter
When gold is earned, the gold counter SHALL briefly pulse so the player connects kills with gold. The existing "+Ng" text at the enemy stays.

#### Scenario: Enemy killed
- **WHEN** a tower kills an enemy
- **THEN** "+Ng" appears at the enemy and the gold counter pulses

### Requirement: Current phase is always shown
The screen SHALL always show which phase the game is in, with a short label near the start button: "Build phase: place towers" between waves, and "Wave N in progress" during a wave. When the start button is disabled because no tower is placed, the label SHALL read "Place a tower to start" instead.

#### Scenario: Between waves
- **WHEN** a wave ends
- **THEN** the label reads "Build phase: place towers" and the start button is enabled

#### Scenario: During a wave
- **WHEN** a wave is running
- **THEN** the label reads "Wave N in progress"

#### Scenario: No tower yet
- **WHEN** a new game starts and the player has placed no tower
- **THEN** the start button is disabled and the label reads "Place a tower to start"
- **AND** the label changes to "Build phase: place towers" as soon as the first tower is placed

### Requirement: Tower panel stays visible during waves
During a wave the tower panel SHALL stay on screen with the message "Build after this wave". Its buttons SHALL be inactive but stay readable: names, costs and hints keep at least 4.5:1 contrast. The message SHALL NOT change the panel's height.

#### Scenario: Tap a tower mid-wave
- **WHEN** the player taps a tower button during a wave
- **THEN** nothing is placed and the panel shows "Build after this wave"

#### Scenario: Reading costs mid-wave
- **WHEN** a wave is running and the player has 15 gold
- **THEN** the Blaster button still shows its cost and "Need 75 more" at readable contrast

### Requirement: Failed placement says why
When the player tries to place a tower on an invalid tile or without enough gold, the game SHALL show a short reason at that tile: "Can't build on the road", "Tile taken" or "Not enough gold".

#### Scenario: Tap on the road
- **WHEN** the player taps a road tile while placing a tower
- **THEN** "Can't build on the road" appears at that tile for about one second and no gold is spent

#### Scenario: Not enough gold
- **WHEN** the player taps a valid tile without enough gold for the selected tower
- **THEN** "Not enough gold" appears at that tile

### Requirement: Next wave preview shows the enemies
The next-wave preview SHALL show the picture of each enemy type in the wave with its count, not only its name.

#### Scenario: First wave preview
- **WHEN** the first game starts
- **THEN** the preview shows the Drone picture with "x7"
