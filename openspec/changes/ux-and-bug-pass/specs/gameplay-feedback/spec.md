# Spec Delta

## ADDED Requirements

### Requirement: Board banners are localized
The banners drawn on the board (wave start, boss wave, wave cleared, perfect wave, combo) SHALL be in the current language.

#### Scenario: Boss wave in Italian
- **WHEN** wave 5 starts with the language set to Italian
- **THEN** the banner reads "ONDATA 5: BOSS", and the wave-cleared banner later reads "ONDATA 5 COMPLETATA" or "ONDATA 5 PERFETTA!"

### Requirement: Selling asks once
The Sell action SHALL ask for a second tap: the first tap turns the control into "Sell for N?", the second sells. Tapping anything else, or closing the panel, SHALL cancel the request.

#### Scenario: Stray tap on Sell
- **WHEN** the player taps Sell once and then taps the board
- **THEN** the tower is still there and no gold was added

#### Scenario: Confirmed sell
- **WHEN** the player taps Sell and then taps "Sell for N?"
- **THEN** the tower is removed, N gold is added and the panel closes
