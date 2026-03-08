# Neon Defense

A tower defense game built with vanilla HTML5 Canvas and JavaScript. No frameworks, no build step — just pure browser tech with a neon cyberpunk aesthetic.

**[Play it live](https://neondefense.netlify.app)**

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

- 3 difficulty levels (path length: long, medium, short)
- Dual upgrade paths per tower
- Tower synergies via Support buffs
- Percentage-based armor system
- Interest-based economy with kill streak bonuses
- Global leaderboard
- Challenge friends with shareable score cards
- Interactive tutorial for new players
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
```

## Project Structure

```
├── index.html          # Single-page app (HTML + CSS)
├── js/
│   ├── main.js         # Entry point
│   ├── game.js         # Game loop and core logic
│   ├── config.js       # Tower/enemy/economy constants
│   ├── waves.js        # Wave generation and scaling
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
│   ├── audio.js        # Procedural audio engine
│   ├── tutorial.js     # Step-by-step tutorial
│   ├── i18n.js         # Internationalization (EN/IT)
│   └── utils.js        # Math and helper functions
├── netlify/functions/
│   └── scores.mjs      # Leaderboard API endpoint
├── sw.js               # Service worker for offline support
└── manifest.json       # PWA manifest
```

## License

MIT
