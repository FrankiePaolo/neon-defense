# Proposal

## Why

Most players struggle to understand Neon Defense, and most of them play on a phone. A walkthrough at phone width shows that the screen does not explain itself:

- The path is drawn as separate blue tiles with no direction. Where it bends close to itself, it looks like a maze with branches.
- Locked towers say "SCORE 500" with no lock and no explanation.
- An unlabelled "Frost" bar sits under the gold counter.
- Stats use jargon: "DMG", "RATE", "RNG", "AoE".
- Losing a life only plays a sound. Nothing on screen shows it.
- The tutorial is a text box that covers the top of the board, including the END marker. It says "panel below" on desktop, where the panel is on the right.
- "START WAVE (SPACE)" mentions a keyboard key on a touch device.
- Difficulty is named by path length ("Long path"), which does not tell a newcomer that it means "easy".

The goal: someone who has never played a tower defense game understands what to do within the first wave, without reading paragraphs.

## What Changes

- **Readable road**: draw the path as one continuous road with moving arrows from START to END. Mark START with an entry arrow and END as the base to protect.
- **Path generation tweak**: a generated path never runs next to another part of itself, so it can't look like a fork. This is a small rule change. Balance stays the same.
- **Icon-first HUD**: gold, lives and wave show an icon next to the number. The lives counter flashes and shakes when an enemy gets through, and the END marker flashes too.
- **Tower panel**: each tower button shows a small drawing of the tower. Locked towers show a lock and "Reach N points". Towers you can't afford are greyed out and show how much gold is missing. The unlock bar gets a label: "Next tower: Frost, 120 points to go".
- **Plain-language stats**: "DMG / RATE / RNG / AoE" become words or icons ("Damage", "Shots per second", "Range", "Hits a group"). The upgrade panel shows one line per upgrade with what it improves.
- **Phase clarity**: the screen always shows whether you are in the build phase or a wave is running. During a wave, the tower panel stays visible and shows "Build after this wave" instead of disappearing.
- **Placement feedback**: while placing a tower, the free tiles in range of the road are highlighted. A tap on a bad tile shows the reason ("Can't build on the road", "Not enough gold").
- **On-map coaching tutorial**: replace the text modal with a small caption docked away from the board, a pointing hand on the exact tile or button to tap, and a ghost tower on a suggested tile. No step covers the road, START or END.
- **Wording**: no keyboard hints on touch devices. Difficulty buttons read "Easy / Normal / Hard", with the path length as a subtitle. All new text is in English and Italian.

## Capabilities

### New Capabilities
- `map-readability`: how the board shows where enemies come from, where they go, and which tiles are buildable, including the rule that the path does not touch itself.
- `hud-clarity`: how the HUD and tower panel show resources, tower availability, locks, costs and stats in plain language.
- `gameplay-feedback`: what the player sees when key events happen: losing a life, earning gold, switching phase, and placing a tower or failing to.
- `onboarding-coaching`: the first-run tutorial that points at the board and controls instead of covering them.

### Modified Capabilities
None. The project has no specs yet.

## Impact

- Code: `js/renderer.js` (road, START/END, placement highlights, feedback), `js/grid.js` (non-touching path), `js/ui.js` and `index.html` (HUD, tower panel, tooltips, upgrade panel, difficulty buttons, CSS), `js/tutorial.js` (coaching flow), `js/game.js` (life-lost and phase events), `js/i18n.js` (EN and IT strings), `sw.js` (bump the cache version).
- No backend, API or leaderboard change. No balance change to towers, enemies or economy.
- Performance: the road and arrows are drawn on the existing static canvas plus a light animated layer. They must hold frame rate on mid-range phones, which already use a lower `SHADOW_BLUR_SCALE`.
- Players who already finished the tutorial do not see it again. The existing localStorage key stays the same.
