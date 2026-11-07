# Spec Delta

## MODIFIED Requirements

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
