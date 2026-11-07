# Spec Delta

## ADDED Requirements

### Requirement: HUD and wave controls stay off the board on desktop
On desktop, the HUD rows SHALL sit above the board and the wave controls (phase line, wave preview and start button) SHALL sit below it, in the same column. Neither SHALL cover any part of the board. When the window is too short for the board at full size, the board SHALL shrink, keeping its aspect ratio, so that the HUD, the board and the wave controls all fit without scrolling.

#### Scenario: Laptop window
- **WHEN** a game starts on a 1280x720 desktop window
- **THEN** the HUD's bottom edge is at or above the board's top edge, the wave controls' top edge is at or below the board's bottom edge, the start button is fully inside the viewport, and the board's width divided by its height equals the board's logical ratio within 1%

#### Scenario: Full-size board
- **WHEN** a game starts on a 1440x900 desktop window
- **THEN** the board is drawn at its full logical size and the wave controls sit below it without covering it

#### Scenario: Starting a wave on desktop
- **WHEN** the player starts a wave on a 1440x900 desktop window
- **THEN** the board's position and size on screen are the same before and after the wave starts

#### Scenario: Landscape phone keeps the overlay
- **WHEN** a game starts on an 844x390 touch screen
- **THEN** the wave controls are still placed over the bottom of the board column and the board is not shrunk to make room for them
