# Spec Delta

## MODIFIED Requirements

### Requirement: Resource counters carry icons
The gold, lives, wave and score counters SHALL each show a distinct icon, the value and a short word label: a filled coin with "Gold", a heart with "Lives", a flag with "Wave", and a star with "Score". The wave counter SHALL show progress as "current / total".

#### Scenario: HUD at game start
- **WHEN** a new game starts
- **THEN** the HUD shows a coin with 90 and "Gold", a heart with 20 and "Lives", the wave as "0 / 35" with "Wave", and a star with 0 and "Score"

#### Scenario: Italian labels
- **WHEN** the language is Italian
- **THEN** the labels read "Oro", "Vite", "Ondata" and "Punti"

### Requirement: Next-unlock progress is labelled
The next-unlock progress SHALL sit on its own row below the resource counters, with a text label naming the tower and the points left, for example "Next tower: Frost, 120 points to go", and a bar as wide as that row allows. It SHALL be hidden when every tower is unlocked.

#### Scenario: Progress toward Frost
- **WHEN** the best score is 380 and Frost unlocks at 500
- **THEN** the row reads "Next tower: Frost, 120 points to go" and the bar is 76 percent full

#### Scenario: Readable on a phone
- **WHEN** the game runs on a 390px wide portrait screen
- **THEN** the next-unlock text is at least 12px and does not overlap the game controls

## ADDED Requirements

### Requirement: Game-screen text uses a readable font
All text on the game screen SHALL use a sans-serif font without extra letter spacing. Numbers SHALL use tabular figures so a changing value does not shift its neighbours. Numbers SHALL NOT carry a glow that blurs the digits.

#### Scenario: Gold changes
- **WHEN** gold goes from 90 to 115
- **THEN** the gold value is drawn in the sans-serif font with tabular figures and the other counters do not move

### Requirement: Game-screen text has a minimum size
On a phone, no text on the game screen SHALL be smaller than 12px, and the resource values SHALL be at least 18px.

#### Scenario: Smallest text on a phone
- **WHEN** the game runs on a 390px wide portrait screen, in build phase, with a locked tower in the panel
- **THEN** every visible text element, including lock hints and "Need N more", is at least 12px

### Requirement: Game-screen text has enough contrast
All text on the game screen SHALL have a contrast ratio of at least 4.5:1 against its background. This includes text in locked, unaffordable and inactive states, which SHALL show their state through an icon or words, not by fading the text.

#### Scenario: Locked upgrade row
- **WHEN** the player opens the upgrade panel of a tower whose other path is chosen
- **THEN** the locked rows show a lock and "You picked the other path", and their text is at least 4.5:1 against the panel background

### Requirement: Speed, pause and sound controls say what they do
The speed control SHALL be one button labelled with the word "Speed" and the current speed, which cycles 1x, 2x, 3x on each tap. The pause button SHALL show a standard pause icon. The sound button SHALL show a speaker icon that shows whether sound is on or off. Each control SHALL have an accessible name in the current language. On desktop, keys 1, 2 and 3 SHALL still set the speed.

#### Scenario: Cycling speed
- **WHEN** the speed is 1x and the player taps the speed button twice
- **THEN** the button reads "Speed 3x" and the game runs at 3x

#### Scenario: Muting sound
- **WHEN** the player taps the sound button while sound is on
- **THEN** sound turns off and the icon changes to a crossed-out speaker

### Requirement: Board position is stable on portrait phones
On a portrait phone, the board SHALL sit directly below the HUD rows without a large empty gap, and the wave controls SHALL sit below the board. The board SHALL NOT move when the phase changes or when the tower panel content changes.

#### Scenario: Starting a wave
- **WHEN** the player starts a wave on a 390x844 portrait screen
- **THEN** the board's position on screen is the same before and after the wave starts

### Requirement: Upgrade panel and tower details stay out of the way on phones
On a portrait phone, the upgrade panel SHALL open as a sheet anchored to the bottom of the screen, over the tower panel area, and SHALL NOT cover the board. The tower details SHALL dock just above the tower panel so the tower buttons stay tappable. Both SHALL scroll when their content is taller than the space available.

#### Scenario: Upgrading on a phone
- **WHEN** the player taps a placed tower on a 390x844 portrait screen
- **THEN** the upgrade sheet opens from the bottom and the tower and its range circle stay visible on the board

#### Scenario: Previewing a tower on a phone
- **WHEN** the player taps the Blaster button on a 390x844 portrait screen
- **THEN** the Blaster details appear just above the tower panel, with the PLACE button visible, and every tower button stays visible
