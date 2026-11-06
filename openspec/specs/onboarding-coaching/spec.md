# onboarding-coaching Specification

## Purpose

Teaches a first-time player by pointing at the real board and controls, one short action at a time, instead of showing text boxes that cover the game.

## Requirements

### Requirement: Tutorial points at what to tap
Each tutorial step that asks for an action SHALL show a pointer (an animated hand or arrow) on the exact button or tile to tap. Only that target SHALL accept taps until the step is done, except Skip.

#### Scenario: Pick the first tower
- **WHEN** the step "Tap a tower" is active
- **THEN** a pointer moves over the Blaster button
- **AND** taps elsewhere on the board or panel do nothing

### Requirement: Captions are short and never cover the road
Each step SHALL show one caption of at most 12 words in the current language. The caption SHALL sit in a space that does not cover the road, START, END or the target of the step.

#### Scenario: Caption placement on a phone
- **WHEN** any tutorial step is shown in a portrait viewport 360 to 430 pixels wide
- **THEN** the caption covers no road tile, neither START nor END, and not the pointer target

### Requirement: Tutorial suggests a good first tile
The placement step SHALL show a ghost tower and its range on a suggested empty tile next to the road, chosen so its range covers many road tiles. The player MAY place the tower on any valid tile.

#### Scenario: Ghost tower
- **WHEN** the player has selected the Blaster during the tutorial
- **THEN** a ghost Blaster with its range circle appears on the suggested tile with a pointer on it
- **AND** placing on another valid tile also completes the step

### Requirement: Tutorial follows the first wave
The tutorial SHALL cover this order: the road from START to END, pick a tower, place it, start the wave, towers shoot on their own, lives and gold, then upgrading a tower between waves. Steps that explain something without asking for an action SHALL continue on tap anywhere.

#### Scenario: Road introduction
- **WHEN** the tutorial starts
- **THEN** the pointer traces the road from START to END with the caption "Enemies walk this road to your base"

#### Scenario: Upgrade step
- **WHEN** the first wave ends during the tutorial
- **THEN** the pointer moves to the placed tower with the caption "Tap your tower to make it stronger"

### Requirement: Tutorial can be skipped and replayed
Every step SHALL show a Skip control. Skipping or finishing SHALL mark the tutorial as done using the existing stored flag, so players who already finished it do not see it again. The pause menu SHALL offer "Replay tutorial".

#### Scenario: Returning player
- **WHEN** a player who finished the old tutorial opens the game after this change
- **THEN** the tutorial does not start

#### Scenario: Replay from pause
- **WHEN** the player chooses "Replay tutorial" in the pause menu
- **THEN** a new game starts with the tutorial from the first step

### Requirement: Tutorial works on touch and desktop
The tutorial SHALL refer to controls in a way that is true for the device: "Tap" on touch devices and "Click" on desktop. Pointers SHALL follow the real position of the target on both layouts.

#### Scenario: Desktop layout
- **WHEN** the tutorial runs on desktop with the tower panel on the right
- **THEN** the pointer for "Click a tower" sits on the Blaster button in the right panel
