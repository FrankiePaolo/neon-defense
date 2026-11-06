# wave-scaling Specification

## Purpose

Defines how enemies grow from wave 1 to wave 35: how many come, how tough and fast they are, how much they pay, and how bosses compare to the rest, so the campaign stays winnable and gets harder at a steady pace.

## Requirements

### Requirement: Enemy growth follows one curve per stat
Enemy count, HP multiplier, speed multiplier, armor bonus and reward multiplier SHALL each be one function of the wave number with named constants. Count and reward SHALL grow linearly; HP SHALL grow geometrically at one rate; speed SHALL grow linearly up to a cap and stay there.

#### Scenario: Speed reaches the cap
- **WHEN** the wave number is high enough that the speed formula exceeds the cap
- **THEN** every enemy in that wave uses the capped speed multiplier, and later waves are no faster

#### Scenario: Wave 1 is unscaled
- **WHEN** wave 1 is generated
- **THEN** every enemy has its base HP, base speed, base armor and base reward

### Requirement: Buyable damage keeps pace with the need
For every wave on Normal, the damage per second a player can buy with all gold earned so far (using the most gold-efficient tower, 60% on-target time) divided by the wave's effective HP per second of exposure SHALL stay at or above 1.2 on every wave, and at or below 3.0 from wave 7 on. Waves 1 to 6 are exempt from the ceiling because one Blaster must hold wave 1 on Hard. Effective HP counts armor; exposure is spawn time plus one traversal of the Normal path.

#### Scenario: Late campaign
- **WHEN** the simulator reports the ratio for waves 25 to 35 on Normal
- **THEN** every value is at least 1.2

#### Scenario: Mid campaign
- **WHEN** the simulator reports the ratio for waves 7 to 24 on Normal
- **THEN** no value is above 3.0

### Requirement: Wave armor applies only to armored enemies
The per-wave armor bonus SHALL apply only to Sentinels, Guardians and bosses, and SHALL be capped. Drones, Scouts, Brutes, Medics, Hydras, Wraiths and Phantoms SHALL keep zero armor on every wave.

#### Scenario: Brute on a late wave
- **WHEN** a Brute spawns on wave 30
- **THEN** its armor is 0

#### Scenario: Sentinel on a late wave
- **WHEN** a Sentinel spawns on wave 30
- **THEN** its armor is its base armor plus the capped wave bonus, and damage reduction stays below 50%

### Requirement: The boss is the toughest enemy of its block
Boss HP SHALL be a fixed base times the same HP multiplier regular enemies use on that wave. On every boss wave the boss SHALL have at least three times the HP of a Brute from the same wave, and the boss wave SHALL have the highest effective HP of the five waves ending on it.

#### Scenario: Boss versus Brute
- **WHEN** wave 35 is generated
- **THEN** the boss has at least three times the HP of a wave-35 Brute

#### Scenario: Boss wave is the peak
- **WHEN** waves 21 to 25 are generated
- **THEN** wave 25 has the highest total effective HP of the five

### Requirement: Enemy types unlock in a fixed order
New enemy types SHALL join the pool at fixed waves, and the next-wave preview SHALL show them the wave before they first appear. The unlock waves are 1 Drone, 3 Scout, 5 Brute, 7 Sentinel, 10 Medic, 12 Hydra, 15 Wraith, 18 Phantom, 22 Guardian.

#### Scenario: First Guardian
- **WHEN** the player finishes wave 21
- **THEN** the preview of wave 22 can include a Guardian, and no earlier wave contained one

### Requirement: Score per run stays submittable
The run score produced by the curve SHALL stay below the leaderboard plausibility cap at every wave for the best run the simulator can produce, with a margin of at least 1.5x.

#### Scenario: Winning run
- **WHEN** the sensible scripted player wins Normal
- **THEN** its final score is at most two thirds of the cap for wave 35
