# map-readability Specification

## Purpose

Makes the board explain itself: where enemies enter, which way they walk, where they must not arrive, and where towers can be built.

## Requirements

### Requirement: Path renders as one directional road
The board SHALL draw the enemy path as one continuous road from START to END. Animated arrows on the road SHALL point in the direction enemies walk.

#### Scenario: New map shows the direction of travel
- **WHEN** a game starts on any difficulty
- **THEN** the road is drawn as one connected strip from START to END
- **AND** arrows on the road move toward END

#### Scenario: Bends read as corners, not forks
- **WHEN** the road turns
- **THEN** the turn is drawn as a rounded or mitred corner of the same strip, with no gap or tile seam

### Requirement: Path never touches itself
Path generation SHALL NOT place two path cells side by side unless they are consecutive steps of the path. Entry and exit cells are included.

#### Scenario: Generated path has no false junctions
- **WHEN** a path is generated on desktop or mobile grid sizes, for every difficulty
- **THEN** every path cell has at most two orthogonal path neighbours, and those are its previous and next steps

#### Scenario: Fallback path keeps the rule
- **WHEN** random generation fails and the fallback path is used
- **THEN** the fallback path also has no false junctions

### Requirement: START and END are self-explanatory
START SHALL show an arrow pointing along the road, with no extra frame at the board edge. END SHALL look like the player's base to protect. Each SHALL have a text label in the current language. Neither SHALL be hidden by HUD or tutorial elements during play.

#### Scenario: Labels at phone width
- **WHEN** the game runs in a portrait viewport 360 to 430 pixels wide
- **THEN** the START and END labels are fully visible and readable on the board

#### Scenario: Italian labels
- **WHEN** the language is Italian
- **THEN** the START and END labels use the Italian strings

### Requirement: Towers go next to the road
A tower SHALL only be placed or moved onto an empty tile that touches the road, including diagonally. While the player is placing or moving a tower, the board SHALL highlight every such tile. Other empty tiles stay unhighlighted and refuse the tower with a short reason at the tile. Road tiles and occupied tiles SHALL look clearly unbuildable. On touch devices, a touch that lands on the road or a tower SHALL snap to the nearest free tile within one tile of the finger.

#### Scenario: Highlight on tower selection
- **WHEN** the player selects a tower to place
- **THEN** empty tiles next to the road are highlighted
- **AND** the highlight is removed when placement ends or is cancelled

#### Scenario: Carried tower hovers
- **WHEN** the player is placing or moving a tower and points at a tile
- **THEN** that tile lights up at once, brighter than the other buildable tiles, in red where the tower cannot go
- **AND** the tower floats over it, glides as the pointer moves, and shows its range
- **AND** the highlight clears when the mouse leaves the board
- **AND** a moving tower starts over its own tile, which keeps a faint frame until it lands
- **AND** on touch, where there is no hover, a placed tower starts over the best tile for it (the one covering the most road)

#### Scenario: Tile away from the road
- **WHEN** the player is placing a tower and taps an empty tile that does not touch the road
- **THEN** the tower is not placed and a short reason appears at the tile

#### Scenario: Near miss on touch
- **WHEN** the player is placing a tower on a touch device and the touch lands on the road edge next to a free tile
- **THEN** the preview and the tower go on that free tile
