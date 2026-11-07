# Proposal

## Why

The previous change made the HUD say the right things, but at phone width it is still hard to read. A walkthrough at 390x844 shows the problems are now size, contrast, labels and layout, not missing information:

- The top bar is 14px with a neon glow that blurs the digits. The coin icon reads as a ring. Only the score has a word label.
- "Next tower: Frost, 500 points to go" is 11px grey.
- The 1x / 2x / 3x, pause and ♫ buttons do not say what they do.
- About 100px of empty space sits above and below the board. The board jumps when a wave starts, because the "Build after this wave" note adds a row to the tower panel.
- The start button is greyed out before the first tower with no reason given. The phase line is 13px.
- During a wave the whole tower list drops to 35% opacity, so "Need 90 more" is barely readable.
- In the upgrade panel some text is close to invisible (#2a2a2a and #335566 on black, contrast about 1.3:1 to 2.4:1), and on a phone the panel covers most of the board.
- Every text uses Courier New with wide letter spacing.

The goal: a non-expert player can read every number, label and button on a phone at arm's length, and knows what each control does without trying it.

## What Changes

- **Readable type**: a system sans-serif for all game-screen text, with tabular figures for numbers so values do not jitter. The neon colours stay. Glow moves from the digits to the icons and titles.
- **Minimum size and contrast**: on a phone, no game-screen text is smaller than 12px, and HUD values are at least 18px. All text meets a 4.5:1 contrast ratio against its background, including locked and unaffordable states.
- **Labelled top bar**: gold, lives, wave and score each show an icon, the value and a short word ("Gold", "Lives", "Wave", "Score"). The coin becomes a filled coin and the score gets a star.
- **Clear controls**: the three speed buttons become one "Speed 1x" button that cycles 1x, 2x, 3x. The ♫ button becomes a speaker icon that shows on or off. Pause uses a standard pause icon. Keys 1, 2 and 3 keep working on desktop.
- **Next-unlock row**: the unlock progress gets its own full-width row with readable text and a wider bar.
- **Stable layout**: on portrait phones the board sits right under the HUD, the wave controls use the space below it, and nothing moves when the phase changes.
- **Start button explains itself**: before the first tower, the phase line reads "Place a tower to start".
- **Tower panel during a wave**: the buttons stay readable and clearly inactive, instead of fading to 35%.
- **Upgrade panel and tooltip on phones**: they open as a bottom sheet over the tower panel area, so the selected tower and its range stay visible. Every row shows its state in words ("Need 30 more", "You picked the other path") at readable contrast.
- **Localization**: all new text in English and Italian.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `hud-clarity`: resource counters gain word labels and new icons; the next-unlock progress gets its own row. New requirements cover minimum text size and contrast, readable fonts, labelled speed, pause and sound controls, a stable portrait layout, and an upgrade panel that does not cover the board on phones.
- `gameplay-feedback`: the tower panel during a wave stays readable instead of dimmed. The phase line explains why the start button is disabled before the first tower.

## Impact

- Code: `index.html` (CSS tokens, fonts, sizes, HUD and control markup, portrait layout, bottom sheet), `js/ui.js` (HUD labels, speed cycle button, sound icon state, start-button reason, unlock row, upgrade panel states), `js/icons.js` (filled coin, star, speaker on/off, pause, play), `js/i18n.js` (EN and IT strings), `js/tutorial.js` (only if a pointer target moves, for example the speed button), `sw.js` (bump the cache version).
- No gameplay, balance, backend or leaderboard change. Menu, pause and game-over screens keep their look, except that they inherit the new body font where they share styles.
