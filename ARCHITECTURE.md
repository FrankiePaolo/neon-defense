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
│   ui.js (HUD, menus)      waves.js  ─► spawns          (map, overlays│
│   tutorial.js             enemy.js  (move)              calls each   │
│   i18n.js, icons.js       tower.js  (target, fire)      entity's     │
│   audio.js                projectile.js                 render(ctx)) │
│                           combat.js (hits, chain,    particles.js    │
│                                      synergies)      sprites.js      │
│                           pathfinding.js (SpatialHash) icons.js      │
│                           grid.js (map, paths)                       │
│                                                                      │
│   STATE / RULES                                                      │
│   economy.js: Economy (gold, lives)                                  │
│               ScoreTracker (scores, pending queue)                   │
│               ProgressTracker (cores, unlocked towers)               │
│   config.js: CONFIG, TOWER_DEFS, ENEMY_DEFS (shared data)            │
│   utils.js:  math and shape helpers                                  │
│                                                                      │
│   localStorage: scores, pending scores, player name, language,       │
│                 tutorial-done flag, cores, unlocked towers           │
│   sw.js: cache-first for static assets, network-first for /api/      │
│          (last GET /api/scores is cached, so the board works offline)│
└───────────────────────────────┬──────────────────────────────────────┘
                                │ fetch GET/POST /api/scores
                                ▼
                  NETLIFY
          netlify/functions/scores.mjs  (routes itself via
                                │        export const config.path)
                                │ @netlify/neon
                                ▼
                     PostgreSQL (Neon)

Dev tooling (scripts/): simulate-balance, play-test, seed-scores,
setup-db, cleanup-scores, check-paths, generate-icons
```

- `Game` is the hub. It builds every subsystem and runs the loop: input, then update, then render.
- Config is the shared data layer. Towers, enemies and waves read their stats from it.
- Only `ScoreTracker` talks to the backend. It falls back to `localStorage` and retries queued scores when offline.
- The API is two calls. GET returns the top 50 scores of each difficulty, one board per difficulty. POST validates name, score, wave and difficulty (missing means normal), rejects a score above `maxPlausibleScore(wave)`, then inserts.
- The board shape is chosen per game: `Game.startNewGame` calls `chooseGridShape()` in `config.js` (9x12 on a touch screen held upright, 12x9 held sideways, 20x15 without touch), and `Grid` reads the size from `CONFIG` when it generates. A tall board is the wide one generated turned.
- `fitBoard` (`ui.js`) and `Renderer.resize` own the board's displayed size: `fitBoard` fits the canvas into the `#board-slot` CSS leaves for it, and `resize` sizes the backing store to match. CSS arranges everything else.
- The simulation modules (config, grid, pathfinding, enemy, tower, projectile, waves, combat) must not touch the DOM beyond `config.js` reading `window` and `navigator` for `IS_MOBILE` and the board shape. `scripts/simulate-balance.mjs` shims those two globals and runs the real game code in Node. Keep DOM access in the UI and rendering modules.
- `simulate-balance.mjs` imports `maxPlausibleScore` from the Netlify function, so the balance simulator and the server-side anti-cheat ceiling are one rule. Changing one changes the other.
