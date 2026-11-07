# Spec Delta

## MODIFIED Requirements

### Requirement: Locked towers explain how to unlock
A locked tower button SHALL show a lock icon and a plain sentence with the core price, for example "Unlock for 5 cores". It SHALL NOT show a score or a bare label.

#### Scenario: Locked tower at first launch
- **WHEN** a first-time player opens the tower panel
- **THEN** every tower except Blaster shows a lock and "Unlock for N cores" in the current language

### Requirement: Next-unlock progress is labelled
The next-unlock row SHALL sit on its own row below the resource counters and show a core icon with the balance, a text label naming the cheapest locked tower and the cores left, for example "Next tower: Frost, 1 core to go", and a bar as wide as that row allows showing balance over price. When the balance covers the price the label SHALL say the tower can be unlocked. The row SHALL show only the balance when every tower is unlocked.

#### Scenario: Progress toward Frost
- **WHEN** the balance is 0 cores and the cheapest locked tower is Frost at 1
- **THEN** the row reads "Next tower: Frost, 1 core to go" and the bar is empty

#### Scenario: Progress toward Cannon
- **WHEN** the balance is 15 cores and the cheapest locked tower is Cannon at 20
- **THEN** the row reads "Next tower: Cannon, 5 cores to go" and the bar is 75 percent full

#### Scenario: Affordable
- **WHEN** the balance is 25 cores and the cheapest locked tower is Cannon at 20
- **THEN** the row reads "Cannon can be unlocked" and the bar is full

#### Scenario: Readable on a phone
- **WHEN** the game runs on a 390px wide portrait screen
- **THEN** the next-unlock text is at least 12px and does not overlap the game controls
