# difficulty-levels Specification

## Purpose

Defines what Easy, Normal and Hard mean as a path length and an enemy HP multiplier, and guarantees a phone and a desktop player on the same difficulty face the same challenge.

## Requirements

### Requirement: Difficulty is a fixed path length
Each difficulty SHALL map to one minimum path length in tiles, the same on the phone grid (12x9) and the desktop grid (20x15). Easy SHALL be the longest path and Hard the shortest.

#### Scenario: Normal on both grids
- **WHEN** a Normal game starts on a phone and another on desktop
- **THEN** both paths have at least the same number of tiles

#### Scenario: Difficulty subtitles stay true
- **WHEN** the difficulty screen shows "long path" under Easy and "short path" under Hard
- **THEN** the Easy path is longer than Normal, and Hard is shorter than Normal

### Requirement: Difficulty scales enemy HP
Each difficulty SHALL have one enemy HP multiplier, applied to every enemy and boss on top of the wave curve. Normal SHALL be 1, so the wave-scaling targets measured on Normal hold unchanged. Easy SHALL NOT be above Normal, and Hard SHALL NOT be below Normal.

#### Scenario: Easy enemies are weaker
- **WHEN** an Easy game and a Normal game generate the same wave
- **THEN** each Easy enemy has the Normal HP times the Easy multiplier

### Requirement: Hard can be held
The Hard path SHALL be long enough that the sensible scripted player clears wave 1 to wave 20 without losing all lives, and SHALL let a wave-1 Scout stay in range of a Blaster for at least two shots.

#### Scenario: Hard is hard but fair
- **WHEN** the simulator runs the sensible player on Hard on the phone grid
- **THEN** the run reaches at least wave 25

### Requirement: Difficulty outcomes are ordered
On each grid, the naive scripted player SHALL reach a later wave on Easy than on Normal, and later on Normal than on Hard. Easy SHALL let the naive player reach at least wave 20; Normal SHALL end the naive player between wave 12 and wave 20; Hard SHALL end the naive player before wave 14.

#### Scenario: Naive player on Easy
- **WHEN** the simulator runs the naive player on Easy on the phone grid
- **THEN** the run reaches at least wave 20

#### Scenario: Naive player on Hard
- **WHEN** the simulator runs the naive player on Hard on the phone grid
- **THEN** the run ends before wave 14

### Requirement: Phone and desktop are within reach of each other
For the same difficulty and scripted player, the wave reached on the phone grid and on the desktop grid SHALL differ by at most 3.

#### Scenario: Sensible player on Normal
- **WHEN** the simulator runs the sensible player on Normal on both grids
- **THEN** the waves reached differ by at most 3

### Requirement: The map still generates
Every difficulty on every grid SHALL generate a non-touching path at its minimum length without the fallback serpentine in at least 90% of attempts.

#### Scenario: Easy on a phone
- **WHEN** 2000 Easy maps are generated on the phone grid
- **THEN** at most 10% use the fallback path and none has a false junction
