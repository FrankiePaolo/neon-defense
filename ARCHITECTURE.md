# Architecture

```
                        BROWSER (static PWA, ES modules)
┌──────────────────────────────────────────────────────────────────────┐
│  index.html ──► main.js ──► Game  (game.js, owns the rAF loop)       │
│                              │                                       │
│        ┌─────────────────────┼───────────────────────────┐           │
│        ▼                     ▼                           ▼           │
│   INPUT / UI            SIMULATION                   RENDERING       │
│   input.js              _update(dt):                 renderer.js     │
│   ui.js (HUD, menus)      waves.js  ─► spawns        particles.js    │
│   tutorial.js             enemy.js  (move)           sprites.js      │
│   i18n.js, icons.js       tower.js  (target, fire)   icons.js        │
│   audio.js                projectile.js                              │
│                           combat.js (hits, chain,                    │
│                                      synergies)                      │
│                           pathfinding.js (SpatialHash)               │
│                           grid.js (map, paths)                       │
│                                                                      │
│   STATE / RULES                                                      │
│   economy.js: Economy (gold, lives)                                  │
│               ScoreTracker (scores, pending queue)                   │
│               ProgressTracker                                        │
│   config.js: CONFIG, TOWER_DEFS, ENEMY_DEFS (shared data)            │
│   utils.js:  math and shape helpers                                  │
│                                                                      │
│   localStorage: scores, pending scores                               │
│   sw.js (service worker): offline cache of static assets             │
└───────────────────────────────┬──────────────────────────────────────┘
                                │ fetch GET/POST /api/scores
                                ▼
                  NETLIFY
          netlify/functions/scores.mjs
                                │ @netlify/neon
                                ▼
                     PostgreSQL (Neon)

Dev tooling (scripts/): simulate-balance, play-test, seed-scores,
setup-db, cleanup-scores, check-paths, generate-icons
```

- `Game` is the hub. It builds every subsystem and runs the loop: input, then update, then render.
- Config is the shared data layer. Towers, enemies and waves read their stats from it.
- Only `ScoreTracker` talks to the backend. It falls back to `localStorage` and retries queued scores when offline.
