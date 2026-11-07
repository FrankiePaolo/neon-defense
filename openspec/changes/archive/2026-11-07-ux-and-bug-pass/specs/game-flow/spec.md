# Spec Delta

## Purpose

Moves the player between menu, play, pause, game over and victory without leaving a game running in the background or losing a result, keeps keyboard shortcuts out of text fields, and limits when the install banner may appear.

## ADDED Requirements

### Requirement: Pause resumes with the same keys
While paused, Escape, Space and the Resume button SHALL each resume the game, whatever was pending when it paused.

#### Scenario: Escape after pausing mid-placement
- **WHEN** the player pauses while carrying a tower and then presses Escape
- **THEN** the game resumes

### Requirement: Restart returns to a clean menu
Restart from the pause menu SHALL stop the current game: no enemies move, no music plays and no HUD value changes while the menu is shown. Picking a difficulty SHALL start a fresh game.

#### Scenario: Restart during a wave
- **WHEN** the player pauses during a wave, taps Restart, and waits ten seconds on the menu
- **THEN** no enemy has moved, the lives and gold values are unchanged, and no music plays

### Requirement: Victory is announced
Clearing the last wave SHALL show an end screen whose heading says the player won, in the current language, with the final score and wave, and the same save, share and play-again actions as the game-over screen.

#### Scenario: Last wave cleared
- **WHEN** wave 35 is cleared
- **THEN** the end screen heading reads "YOU WIN" in English or "HAI VINTO" in Italian, not "GAME OVER"

### Requirement: Own name is accepted when saving a score
Saving a score SHALL accept the player name last saved on this device even when that name is already on the leaderboard. A different name that is already on the leaderboard SHALL be refused with "Name already taken".

#### Scenario: Returning player
- **WHEN** a player who saved a score as "Fra" earlier on this device finishes another game and taps Save Score with "Fra"
- **THEN** the score is saved and the menu is shown

#### Scenario: Someone else's name
- **WHEN** a player types a name that is on the leaderboard and was never saved on this device
- **THEN** "Name already taken" is shown and nothing is saved

### Requirement: Keys act only on the game
While a text field has focus, the game SHALL NOT react to keyboard shortcuts (Space, Escape, 1, 2, 3, S) and the field SHALL receive every typed character, including spaces.

#### Scenario: Typing a name with a space and a digit
- **WHEN** the player types "Fra 2" in the name field after a game at speed 1x
- **THEN** the field reads "Fra 2" and the speed is still 1x

### Requirement: Install banner shows only on the menu
The install-as-app banner SHALL appear only while the menu is shown and SHALL NOT appear over the game screen. Closing it SHALL keep it closed on later visits.

#### Scenario: Game started before the banner delay
- **WHEN** a phone player starts a game within two seconds of opening the page
- **THEN** no install banner appears over the board or the tower panel, and it appears the next time the menu is shown
