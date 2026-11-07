# Spec Delta

## ADDED Requirements

### Requirement: Board is sharp on high-density screens
The board SHALL be drawn at the screen's device pixel ratio, up to a ratio of 2, so road edges, labels and tower shapes stay crisp at the size the board is shown. Taps and clicks SHALL still map to the same tiles.

#### Scenario: Phone at 3x pixel density
- **WHEN** the board is shown 390px wide on a screen with a device pixel ratio of 3
- **THEN** the canvas backing store is 960px wide (the 480px board at a ratio of 2), the START label edges are crisp, and a tap at the centre of a buildable tile places the tower on that tile

#### Scenario: Desktop at 2x
- **WHEN** the board is shown 800px wide on a screen with a device pixel ratio of 2
- **THEN** the canvas backing store is 1600px wide and the board occupies the same 800px on screen as before
