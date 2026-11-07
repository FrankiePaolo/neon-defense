# Neon Defense

A tower defense game built with vanilla HTML5 Canvas and JavaScript. No frameworks, no build step — just pure browser tech with a neon cyberpunk aesthetic.

**[Play it live](https://neon-def.netlify.app)**

## Gameplay

Place towers along procedurally generated paths to stop waves of enemies from reaching the exit. Survive all 35 waves to win.

### Towers

| Tower | Role |
|-------|------|
| **Blaster** | Balanced all-rounder, fast projectiles |
| **Frost** | Slows enemies, frostbite damage path |
| **Lightning** | Chain damage arcing between enemies |
| **Cannon** | AoE splash, armor shredding |
| **Sniper** | Extreme range, high single-target damage |
| **Support** | Buffs nearby towers or generates gold |

Each tower has two upgrade paths with 3 tiers — choose one path to specialize.

### Enemies

10 enemy types unlock as waves progress: drones, scouts, brutes, armored sentinels, medics, splitters, wraiths (flying), bosses, phantoms (stealth), and shielded guardians.

### Features

- 3 difficulty levels: Easy, Normal, Hard (long, medium, short path)
- Dual upgrade paths per tower
- Tower synergies via Support buffs
- Percentage-based armor system
- Interest-based economy with kill streak bonuses
- Global leaderboard
- Challenge friends with shareable score cards
- On-map coaching tutorial for new players (replayable from the pause menu)
- PWA — installable, works offline
- Mobile responsive
- English and Italian localization

## Tech Stack

- **Frontend:** HTML5 Canvas, vanilla JS (ES modules), CSS
- **Backend:** Netlify Functions (serverless)
- **Database:** Neon (PostgreSQL) via Netlify integration
- **Hosting:** Netlify with service worker caching

## Running Locally

```bash
# Install dependencies (only needed for serverless functions)
npm install

# With Netlify CLI (full stack including API)
netlify dev

# Or just the frontend
python3 -m http.server 8000

# Check that generated paths never touch themselves
node scripts/check-paths.mjs
```

### Play test

`scripts/play-test.mjs` drives the game in the Chrome already installed on your machine (no browser download) like a player: on a portrait phone (390x844 and 375x667), a landscape phone (844x390) and a desktop (1440x900, plus a 1280x720 laptop window for the desktop layout checks), in English and Italian. It checks placing, cancelling, panels, layout, game flow and rendering, prints pass or fail per scenario and layout, and exits 1 on any failure or page error. Run it after any UI change:

```bash
npm install
npm run play-test

# Only the scenarios whose name contains a word
npm run play-test -- cancel

# Chrome somewhere else (exits 2 when Chrome is not found)
CHROME_PATH="/path/to/chrome" npm run play-test
```

### Balance simulator

`scripts/simulate-balance.mjs` plays the game headless with the real wave, enemy, tower and combat code, on both grids and all three difficulties, with a naive player (only Blasters, no upgrades) and a sensible one (upgrades, mixes tower types). It prints lives lost, gold, score and buyable-over-needed damage per wave, damage per gold by tower, the wave each tower unlocks and the top score per wave, then checks the targets in the `wave-scaling`, `tower-balance` and `difficulty-levels` specs and exits 1 if any fails. Run it after any change to a balance number:

```bash
# All grids, difficulties and players, then the checks
npm run balance

# One run, tables only
node scripts/simulate-balance.mjs --grid mobile --difficulty normal --player sensible
```

## Project Structure

```
├── index.html          # Single-page app (HTML + CSS)
├── js/
│   ├── main.js         # Entry point
│   ├── game.js         # Game loop and core logic
│   ├── config.js       # Tower/enemy/economy constants
│   ├── waves.js        # Wave generation and scaling
│   ├── combat.js       # Hit, splash, chain and Support aura resolution
│   ├── grid.js         # Map generation and pathfinding grid
│   ├── pathfinding.js  # A* pathfinding + spatial hash
│   ├── tower.js        # Tower entity and upgrades
│   ├── enemy.js        # Enemy entity and behaviors
│   ├── projectile.js   # Projectile physics
│   ├── renderer.js     # Canvas rendering
│   ├── particles.js    # Particle effects
│   ├── economy.js      # Gold, scores, leaderboard
│   ├── input.js        # Mouse/touch input handling
│   ├── ui.js           # HUD and UI panels
│   ├── icons.js        # Inline SVG icons for HUD and panels
│   ├── sprites.js      # Tower/enemy pictures for the HTML UI
│   ├── audio.js        # Procedural audio engine
│   ├── tutorial.js     # On-map coaching tutorial
│   ├── i18n.js         # Internationalization (EN/IT)
│   └── utils.js        # Math and helper functions
├── scripts/
│   ├── check-paths.mjs       # Checks generated paths never touch themselves
│   └── simulate-balance.mjs  # Headless balance simulator and checks
├── netlify/functions/
│   └── scores.mjs      # Leaderboard API endpoint
├── sw.js               # Service worker for offline support
└── manifest.json       # PWA manifest
```

## License

MIT
