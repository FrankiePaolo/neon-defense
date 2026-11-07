# Spec Delta

## ADDED Requirements

### Requirement: Panels are opaque
The upgrade panel, the tower details and the phone bottom sheet SHALL have an opaque background. Text and controls under them SHALL NOT show through.

#### Scenario: Sheet over the wave controls
- **WHEN** the upgrade sheet is open on a 390x844 portrait screen
- **THEN** the phase label, the wave preview and the start button are not visible through the sheet

### Requirement: Cancel and start controls never overlap
On a portrait phone, the cancel control SHALL have its own place in the controls row and SHALL NOT overlap the start button or the wave preview, in any language.

#### Scenario: Placing in Italian on a phone
- **WHEN** the player is placing a tower on a 390x844 screen in Italian
- **THEN** the rectangles of ANNULLA and INIZIA ONDATA do not intersect and both labels are fully readable

### Requirement: Desktop upgrade panel sits beside its tower
On desktop, the upgrade panel SHALL open next to the selected tower, on the side with more room, and SHALL NOT cover the tower, its tile or the wave controls.

#### Scenario: Tower near the top-left corner
- **WHEN** the player selects a tower in the top-left area of the board on a 1440x900 screen
- **THEN** the panel opens to the right of the tower and the tower and its range circle stay visible

### Requirement: Landscape phones use the bottom sheet
On a touch device in landscape, the upgrade panel and the tower details SHALL open as a sheet that stays inside the viewport and scrolls internally. The page SHALL NOT become scrollable.

#### Scenario: Upgrading in landscape
- **WHEN** the player taps a placed tower on an 844x390 screen
- **THEN** the sheet is fully inside the viewport, the document does not scroll, and the board is still visible

### Requirement: The sheet can be closed
The phone sheet SHALL show a close control. Closing it, or tapping the board outside the selected tower, SHALL hide the sheet and make the start button reachable again.

#### Scenario: Close and start
- **WHEN** the player taps the close control on the upgrade sheet
- **THEN** the sheet hides and the start button can be tapped

### Requirement: Portrait layout uses the space below the board
On a portrait phone, the wave controls SHALL sit directly under the board, and the tower panel SHALL take the remaining height. When the panel is tall enough, tower buttons SHALL show their one-line description. The board SHALL NOT move when the phase changes.

#### Scenario: Tall phone
- **WHEN** the game is shown on a 390x844 screen between waves
- **THEN** the phase label starts within 16px of the board's bottom edge, the tower buttons show their descriptions, and nothing is cut off

#### Scenario: Short phone
- **WHEN** the game is shown on a 375x667 screen
- **THEN** every tower button is fully visible without scrolling the page, with descriptions hidden if they do not fit
