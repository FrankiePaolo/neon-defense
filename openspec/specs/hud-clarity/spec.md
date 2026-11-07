# hud-clarity Specification

## Purpose

Makes the HUD, tower panel and tower details readable at a glance by a player who has never seen a tower defense game, in English and Italian, on a phone first.

## Requirements

### Requirement: Resource counters carry icons
The gold, lives, wave and score counters SHALL each show a distinct icon, the value and a short word label: a filled coin with "Gold", a heart with "Lives", a flag with "Wave", and a star with "Score". The wave counter SHALL show progress as "current / total".

#### Scenario: HUD at game start
- **WHEN** a new game starts
- **THEN** the HUD shows a coin with 90 and "Gold", a heart with 20 and "Lives", the wave as "0 / 35" with "Wave", and a star with 0 and "Score"

#### Scenario: Italian labels
- **WHEN** the language is Italian
- **THEN** the labels read "Oro", "Vite", "Ondata" and "Punti"

### Requirement: Tower buttons show the tower
Each tower button in the panel SHALL show a small picture of the tower that matches how it looks on the board, plus its name and cost.

#### Scenario: Panel matches the board
- **WHEN** the player places a Blaster
- **THEN** the tower on the board looks like the picture on the Blaster button

### Requirement: Locked towers explain how to unlock
A locked tower button SHALL show a lock icon and a plain sentence with the points needed, for example "Reach 500 points". It SHALL NOT show a bare score label.

#### Scenario: Locked tower at first launch
- **WHEN** a first-time player opens the tower panel
- **THEN** every tower except Blaster shows a lock and "Reach N points" in the current language

### Requirement: Unaffordable towers are visibly unavailable
An unlocked tower the player cannot afford SHALL appear dimmed and SHALL show how much gold is missing. It SHALL update as gold changes.

#### Scenario: Not enough gold
- **WHEN** the player has 40 gold and a tower costs 90
- **THEN** that tower's button is dimmed and shows "Need 50 more"
- **AND** the button returns to normal as soon as gold reaches 90

### Requirement: Next-unlock progress is labelled
The next-unlock progress SHALL sit on its own row below the resource counters, with a text label naming the tower and the points left, for example "Next tower: Frost, 120 points to go", and a bar as wide as that row allows. It SHALL be hidden when every tower is unlocked.

#### Scenario: Progress toward Frost
- **WHEN** the best score is 380 and Frost unlocks at 500
- **THEN** the row reads "Next tower: Frost, 120 points to go" and the bar is 76 percent full

#### Scenario: Readable on a phone
- **WHEN** the game runs on a 390px wide portrait screen
- **THEN** the next-unlock text is at least 12px and does not overlap the game controls

### Requirement: Tower stats use plain language
Tower stats in the tooltip, the placement preview and the upgrade panel SHALL use plain words or icons with words. Abbreviations such as "DMG", "RATE", "RNG" and "AoE" SHALL NOT appear.

#### Scenario: Blaster stats
- **WHEN** the player opens the Blaster details
- **THEN** the stats read as Damage, Shots per second and Range, each with an icon

### Requirement: Upgrades state what they improve
Each upgrade row SHALL show its cost and one short line saying what gets better. When one upgrade path is chosen, the other path SHALL show it is locked and why.

#### Scenario: Choosing an upgrade path
- **WHEN** the player buys the first upgrade of path A
- **THEN** path B shows a lock and "You picked the other path"

### Requirement: Touch devices show no keyboard hints
On touch devices, buttons and help text SHALL NOT mention keyboard keys.

#### Scenario: Start button on a phone
- **WHEN** the game runs on a touch device
- **THEN** the start button reads "START WAVE" without "(SPACE)"

### Requirement: Difficulty names say how hard it is
The difficulty buttons SHALL be labelled Easy, Normal and Hard, with the path length as a smaller subtitle.

#### Scenario: Difficulty screen
- **WHEN** the player opens the difficulty screen in English
- **THEN** the buttons read "EASY" (long path), "NORMAL" (medium path) and "HARD" (short path)

### Requirement: New text is localized
Every new or changed piece of text SHALL exist in English and Italian, and SHALL follow the selected language.

#### Scenario: Switch to Italian
- **WHEN** the player switches the language to Italian
- **THEN** all HUD, panel, lock, cost, stat and difficulty text added by this change appears in Italian

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

### Requirement: Upgrade panel and tower details stay out of the way on phones
On a portrait phone, the upgrade panel SHALL open as a sheet anchored to the bottom of the screen, over the tower panel area, and SHALL NOT cover the board. The tower details SHALL dock just above the tower panel so the tower buttons stay tappable. Both SHALL scroll when their content is taller than the space available.

#### Scenario: Upgrading on a phone
- **WHEN** the player taps a placed tower on a 390x844 portrait screen
- **THEN** the upgrade sheet opens from the bottom and the tower and its range circle stay visible on the board

#### Scenario: Previewing a tower on a phone
- **WHEN** the player taps the Blaster button on a 390x844 portrait screen
- **THEN** the Blaster details appear just above the tower panel, with the PLACE button visible, and every tower button stays visible
