# Spec Delta

## Purpose

Keeps picking, placing, moving, selecting and cancelling a tower consistent across mouse, touch and keyboard, and ends those actions cleanly when the game phase changes.

## ADDED Requirements

### Requirement: Picking a tower starts placing
When the player picks an unlocked tower they can afford (one click on desktop, PLACE on the tower card on touch), placing SHALL start: that tower's button is highlighted, the cancel control is shown, and the carried tower and its buildable tiles are drawn on the board.

#### Scenario: Pick the Blaster on desktop
- **WHEN** the player has 150 gold and clicks the Blaster button between waves
- **THEN** the Blaster button is highlighted, CANCEL is visible, and the glowing buildable tiles appear

### Requirement: Cancelling clears every trace of placing
Cancelling a placement or a move, by the cancel control, Escape, right click, or picking the highlighted tower again, SHALL end it completely: no tower button stays highlighted, the cancel control hides, and the board stops showing the carried tower and its tiles. Picking a tower right after a cancel SHALL start placing on the first click.

#### Scenario: Escape then pick again
- **WHEN** the player presses Escape while placing a Blaster and then clicks the Blaster button once
- **THEN** placing is active again with the Blaster button highlighted and CANCEL visible

#### Scenario: Right click then pick again
- **WHEN** the player right-clicks the board while placing and then clicks the same tower button once
- **THEN** placing is active again

### Requirement: Placing ends when the phase changes
Placing or moving SHALL end when a wave starts, when the game pauses, when the game ends, and when a new game starts. During a wave the board SHALL NOT show buildable tiles or a carried tower.

#### Scenario: Wave starts while placing
- **WHEN** the player starts a wave while a tower is being carried
- **THEN** the carried tower and the glowing tiles disappear, no tower button is highlighted, and CANCEL is hidden for the whole wave and after it

#### Scenario: Pause while moving
- **WHEN** the player pauses while moving a tower
- **THEN** the tower stays on its original tile and the move is cancelled

### Requirement: Placing continues while affordable
After a tower is placed, placing SHALL continue with the same tower if the player can afford another one, otherwise it SHALL end with the button highlight and cancel control cleared.

#### Scenario: Gold runs out
- **WHEN** the player places a 90-gold tower with 150 gold
- **THEN** placing ends, the button is no longer highlighted and CANCEL is hidden

#### Scenario: Gold remains
- **WHEN** the player places a 90-gold tower with 300 gold
- **THEN** the next tap on a buildable tile places another one without picking the tower again

### Requirement: Selecting a placed tower
Tapping or clicking a placed tower while nothing is being carried SHALL select it and open its upgrade panel. Tapping or clicking an empty tile, the road, or the panel's close control SHALL deselect it and close the panel. Moving a selected tower SHALL carry it until a buildable tile is tapped; cancelling the move SHALL leave it where it was.

#### Scenario: Select then move
- **WHEN** the player taps a placed tower, taps Move, then taps a buildable tile
- **THEN** the tower stands on the new tile, the panel is closed and nothing is highlighted

#### Scenario: Tap the road while selected
- **WHEN** a tower is selected and the player taps a road tile
- **THEN** the tower is deselected and its panel closes
