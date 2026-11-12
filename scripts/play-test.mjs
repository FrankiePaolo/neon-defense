// Drives the game in the installed Chrome like a player, on four layouts and
// two languages, and checks each scenario. Exit 0 all pass, 1 a failure,
// 2 Chrome not found. Usage: npm run play-test [-- name-filter]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const FILTER = process.argv[2] || '';

const LAYOUTS = {
  phone: { width: 390, height: 844, deviceScaleFactor: 3, hasTouch: true, isMobile: true },
  phoneShort: { width: 375, height: 667, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
  landscape: { width: 844, height: 390, deviceScaleFactor: 3, hasTouch: true, isMobile: true, isLandscape: true },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  desktopShort: { width: 1280, height: 720, deviceScaleFactor: 1 },
};
// desktopShort is only for the layout scenarios that name it
const ALL = ['phone', 'phoneShort', 'landscape', 'desktop'];
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

// ── Static server, with a fake leaderboard at /api/scores ──

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.css': 'text/css' };
const leaderboard = [];

function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/api/scores') {
      if (req.method === 'POST') {
        let body = '';
        req.on('data', (c) => { body += c; });
        req.on('end', () => { leaderboard.push(JSON.parse(body)); res.end('{}'); });
        return;
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(leaderboard));
      return;
    }
    const file = path.join(ROOT, url.pathname === '/' ? 'index.html' : url.pathname);
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.statusCode = 404; res.end(); return;
    }
    res.setHeader('Content-Type', TYPES[path.extname(file)] || 'application/octet-stream');
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

// ── Scenarios ──

const scenarios = [];
// layouts: list of layout names; langs: ['en'] or ['en', 'it']; open: options for openGame
function scenario(name, { layouts = ALL, langs = ['en'], open = {} } = {}, fn) {
  scenarios.push({ name, layouts, langs, open, fn });
}

function assert(cond, msg) { if (!cond) throw new Error(msg); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// One fresh browser context per run, so storage never leaks between scenarios
async function openGame(browser, base, layout, lang, { tutorial = false, storage = {}, userAgent, scale } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.setBypassServiceWorker(true);
  if (userAgent) await page.setUserAgent(userAgent);
  await page.setViewport(scale ? { ...LAYOUTS[layout], deviceScaleFactor: scale } : LAYOUTS[layout]);
  const init = { neon_td_lang: lang, ...storage };
  if (!tutorial) init.neonDefenseTutorialDone = 'true';
  await page.evaluateOnNewDocument((init) => {
    for (const [k, v] of Object.entries(init)) localStorage.setItem(k, v);
  }, init);
  await page.goto(base, { waitUntil: 'load' });
  await page.waitForFunction(() => window.game);
  return { page, context, errors, layout, lang, touch: !!LAYOUTS[layout].hasTouch, ...helpers(page, layout) };
}

function helpers(page, layout) {
  const touch = !!LAYOUTS[layout].hasTouch;
  const h = {
    // Click or tap the centre of an element
    async press(selector) {
      const el = await page.waitForSelector(selector, { visible: true, timeout: 3000 });
      if (touch) await el.tap(); else await el.click();
      await sleep(80);
    },
    // Click or tap the centre of a board tile
    async pressTile(x, y, { right = false } = {}) {
      const p = await h.tileCenter(x, y);
      if (right) await page.mouse.click(p.x, p.y, { button: 'right' });
      else if (touch) await page.touchscreen.tap(p.x, p.y);
      else { await page.mouse.move(p.x, p.y); await page.mouse.click(p.x, p.y); }
      await sleep(80);
    },
    tileCenter(x, y) {
      return page.evaluate((x, y) => {
        const c = window.game.renderer.canvas;
        const r = c.getBoundingClientRect();
        const ts = 40 * r.width / window.game.renderer.width;
        return { x: r.left + (x + 0.5) * ts, y: r.top + (y + 0.5) * ts };
      }, x, y);
    },
    eval: (fn, ...args) => page.evaluate(fn, ...args),
    async startGame(difficulty = 'normal') {
      await h.press(`[data-difficulty="${difficulty}"]`);
      await page.waitForFunction(() => window.game.state === 'BETWEEN_WAVES');
    },
    setGold: (n) => page.evaluate((n) => { window.game.economy.gold = n; window.game.ui.updateHUD(); }, n),
    // Buildable tiles, best first
    buildable: () => page.evaluate(() => {
      const g = window.game;
      return g.renderer.buildableTiles(g.grid).map(t => ({ x: t.x, y: t.y }));
    }),
    // A road tile the player can see (no panel over its centre)
    roadTile: () => page.evaluate(() => {
      const c = window.game.renderer.canvas;
      const r = c.getBoundingClientRect();
      const ts = 40 * r.width / window.game.renderer.width;
      return window.game.grid.path.find(p =>
        document.elementFromPoint(r.left + (p.x + 0.5) * ts, r.top + (p.y + 0.5) * ts) === c);
    }),
    // Pick a tower: one click on desktop, card then PLACE on touch
    async pick(type) {
      await h.press(`.tower-btn[data-tower-type="${type}"]`);
      if (touch) await h.press('#tower-stats-tooltip.visible .ttp-place-btn');
    },
    // Place one tower without the UI, for scenarios that need a tower on the board
    placeAt: (type, x, y) => page.evaluate((type, x, y) => window.game.placeTower(type, x, y), type, x, y),
    rect: (selector) => page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    }, selector),
    visible: (selector) => page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return false;
      const r = el.getBoundingClientRect();
      const st = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none' && st.opacity !== '0';
    }, selector),
    carry: () => page.evaluate(() => ({
      placing: window.game.input.placingType,
      moving: !!window.game.input.movingTower,
      selected: !!window.game.input.selectedTower,
      highlighted: [...document.querySelectorAll('.tower-btn.selected')].map(b => b.dataset.towerType),
      cancel: !document.getElementById('cancel-place-btn').classList.contains('hidden'),
    })),
  };
  return h;
}

const intersects = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

scenario('Smoke: menu loads and a game starts', { langs: ['en', 'it'] }, async (g) => {
  assert(await g.visible('#menu-screen'), 'menu not visible');
  await g.startGame();
  assert(await g.visible('#start-wave-btn'), 'start button not visible');
});

// ── Tower placement ──

const PLACE_LAYOUTS = ['desktop', 'phone'];

async function expectPlacing(g, type) {
  const c = await g.carry();
  assert(c.placing === type, `placing is ${c.placing}, expected ${type}`);
  assert(c.highlighted.length === 1 && c.highlighted[0] === type, `highlighted: ${c.highlighted}`);
  assert(c.cancel, 'CANCEL hidden while placing');
}

async function expectNoCarry(g) {
  const c = await g.carry();
  assert(!c.placing && !c.moving, `still carrying: ${JSON.stringify(c)}`);
  assert(c.highlighted.length === 0, `still highlighted: ${c.highlighted}`);
  assert(!c.cancel, 'CANCEL still visible');
}

scenario('Pick the Blaster', { layouts: PLACE_LAYOUTS }, async (g) => {
  await g.startGame();
  await g.pick('blaster');
  await expectPlacing(g, 'blaster');
});

scenario('Escape then pick again', { layouts: PLACE_LAYOUTS }, async (g) => {
  await g.startGame();
  await g.pick('blaster');
  await g.page.keyboard.press('Escape');
  await expectNoCarry(g);
  await g.pick('blaster');
  await expectPlacing(g, 'blaster');
});

scenario('Right click then pick again', { layouts: PLACE_LAYOUTS }, async (g) => {
  await g.startGame();
  await g.pick('blaster');
  const [tile] = await g.buildable();
  await g.pressTile(tile.x, tile.y, { right: true });
  await expectNoCarry(g);
  await g.pick('blaster');
  await expectPlacing(g, 'blaster');
});

scenario('Cancel button then pick again', { layouts: PLACE_LAYOUTS }, async (g) => {
  await g.startGame();
  await g.pick('blaster');
  await g.press('#cancel-place-btn');
  await expectNoCarry(g);
  await g.pick('blaster');
  await expectPlacing(g, 'blaster');
});

scenario('Gold runs out', { layouts: PLACE_LAYOUTS }, async (g) => {
  await g.startGame();
  await g.setGold(150);
  await g.pick('blaster');
  const [tile] = await g.buildable();
  await g.pressTile(tile.x, tile.y);
  assert(await g.eval(() => window.game.towers.length) === 1, 'tower not placed');
  await expectNoCarry(g);
});

scenario('Gold remains', { layouts: PLACE_LAYOUTS }, async (g) => {
  await g.startGame();
  await g.setGold(300);
  await g.pick('blaster');
  const [a, b] = await g.buildable();
  await g.pressTile(a.x, a.y);
  await expectPlacing(g, 'blaster');
  await g.pressTile(b.x, b.y);
  const at = await g.eval((b) => !!window.game.grid.getTowerAt(b.x, b.y), b);
  assert(at, 'second tower not placed on the second tile');
});

scenario('Select then move', { layouts: PLACE_LAYOUTS }, async (g) => {
  await g.startGame();
  const [a, b] = await g.buildable();
  await g.placeAt('blaster', a.x, a.y);
  await g.pressTile(a.x, a.y);
  assert(await g.visible('#upgrade-panel'), 'panel not open after selecting');
  await g.press('#upgrade-panel .move-btn');
  await g.pressTile(b.x, b.y);
  const t = await g.eval(() => ({ x: window.game.towers[0].gx, y: window.game.towers[0].gy }));
  assert(t.x === b.x && t.y === b.y, `tower at ${t.x},${t.y}, expected ${b.x},${b.y}`);
  assert(!(await g.visible('#upgrade-panel')), 'panel still open');
  await expectNoCarry(g);
});

scenario('Tap the road while selected', { layouts: PLACE_LAYOUTS }, async (g) => {
  await g.startGame();
  const [a] = await g.buildable();
  await g.placeAt('blaster', a.x, a.y);
  await g.pressTile(a.x, a.y);
  assert((await g.carry()).selected, 'tower not selected');
  const road = await g.roadTile();
  await g.pressTile(road.x, road.y);
  assert(!(await g.carry()).selected, 'tower still selected');
  assert(!(await g.visible('#upgrade-panel')), 'panel still open');
});

scenario('Wave starts while placing', { layouts: PLACE_LAYOUTS }, async (g) => {
  await g.startGame();
  const [a] = await g.buildable();
  await g.placeAt('blaster', a.x, a.y);
  await g.pick('blaster');
  await g.eval(() => {
    const r = window.game.renderer;
    window._tilesDrawn = 0;
    const orig = r._renderBuildableTiles.bind(r);
    r._renderBuildableTiles = (...args) => { window._tilesDrawn++; return orig(...args); };
    document.getElementById('start-wave-btn').click();
  });
  await sleep(500);
  assert(await g.eval(() => window.game.state) === 'PLAYING', 'wave did not start');
  assert(await g.eval(() => window._tilesDrawn) === 0, 'buildable tiles drawn during the wave');
  await expectNoCarry(g);
  await g.eval(() => { window.game.enemies = []; window.game._onWaveComplete(); });
  await sleep(100);
  await expectNoCarry(g);
});

scenario('Pause while moving', { layouts: PLACE_LAYOUTS }, async (g) => {
  await g.startGame();
  const [a] = await g.buildable();
  await g.placeAt('blaster', a.x, a.y);
  await g.pressTile(a.x, a.y);
  await g.press('#upgrade-panel .move-btn');
  assert((await g.carry()).moving, 'not moving');
  await g.press('#pause-btn');
  await expectNoCarry(g);
  await g.press('#resume-btn');
  await expectNoCarry(g);
  const t = await g.eval(() => ({ x: window.game.towers[0].gx, y: window.game.towers[0].gy }));
  assert(t.x === a.x && t.y === a.y, 'tower left its tile');
});

// ── Game flow ──

// Start a wave with one tower on the board
async function startWave(g) {
  const [a] = await g.buildable();
  await g.placeAt('blaster', a.x, a.y);
  await g.eval(() => window.game.startNextWave());
  assert(await g.eval(() => window.game.state) === 'PLAYING', 'wave did not start');
}

async function loseGame(g) {
  await startWave(g);
  await g.eval(() => { window.game.lives = 0; });
  await g.page.waitForFunction(() => window.game.state === 'GAME_OVER');
  await sleep(100);
}

scenario('Escape after pausing mid-placement', { layouts: PLACE_LAYOUTS }, async (g) => {
  await g.startGame();
  await g.pick('blaster');
  await g.press('#pause-btn');
  assert(await g.eval(() => window.game.state) === 'PAUSED', 'not paused');
  await g.page.keyboard.press('Escape');
  assert(await g.eval(() => window.game.state) === 'BETWEEN_WAVES', 'Escape did not resume');
  assert(!(await g.visible('#pause-overlay')), 'pause overlay still shown');
});

scenario('Typing a name with a space and a digit', { layouts: ['desktop'] }, async (g) => {
  await g.startGame();
  await loseGame(g);
  await g.eval(() => { document.getElementById('player-name').value = ''; });
  await g.press('#player-name');
  await g.page.keyboard.type('Fra 2');
  const v = await g.eval(() => document.getElementById('player-name').value);
  assert(v === 'Fra 2', `field reads "${v}"`);
  assert(await g.eval(() => window.game.speedMultiplier) === 1, 'speed changed');
});

scenario('Restart during a wave', { layouts: PLACE_LAYOUTS }, async (g) => {
  await g.startGame();
  await startWave(g);
  await g.page.waitForFunction(() => window.game.enemies.length > 0);
  await g.press('#pause-btn');
  await g.press('#restart-btn');
  assert(await g.visible('#menu-screen'), 'menu not shown');
  const snap = () => g.eval(() => ({
    enemies: window.game.enemies.map(e => [e.x, e.y]),
    lives: document.getElementById('lives-value').textContent,
    gold: document.getElementById('gold-value').textContent,
  }));
  const before = await snap();
  await sleep(10000);
  const after = await snap();
  assert(JSON.stringify(before) === JSON.stringify(after), 'game kept running under the menu');
  const music = await g.eval(() => window.game.audio.currentTrack);
  assert(!music, `music playing: ${music}`);
  await g.startGame();
  assert(await g.eval(() => window.game.enemies.length === 0 && window.game.towers.length === 0), 'new game not fresh');
});

scenario('Last wave cleared', { layouts: PLACE_LAYOUTS, langs: ['en', 'it'] }, async (g) => {
  await g.startGame();
  await g.eval(() => { window.game.waveManager.currentWave = 34; });
  await startWave(g);
  await g.eval(() => { window.game.waveManager.spawnQueue = []; window.game.enemies = []; });
  await g.page.waitForFunction(() => window.game.state === 'GAME_OVER', { timeout: 5000 });
  const want = g.lang === 'it' ? 'HAI VINTO' : 'YOU WIN';
  const heading = () => g.eval(() => document.querySelector('#game-over-screen h2').textContent);
  assert(await heading() === want, `heading reads "${await heading()}"`);
  await g.eval(() => window.game.ui.applyLanguage());
  assert(await heading() === want, 'heading lost after applyLanguage');
  assert(await g.visible('#save-score-btn') && await g.visible('#share-score-btn') && await g.visible('#play-again-btn'), 'end actions missing');
});

scenario('Defeat still says game over', { layouts: ['desktop'] }, async (g) => {
  await g.startGame();
  await loseGame(g);
  const h = await g.eval(() => document.querySelector('#game-over-screen h2').textContent);
  assert(h === 'GAME OVER', `heading reads "${h}"`);
});

async function seedLeaderboard(g, entries) {
  leaderboard.push(...entries);
  await g.startGame();
  await g.page.waitForFunction((n) => window.game.scoreTracker.globalLoaded &&
    window.game.scoreTracker.highScores.length >= n, {}, entries.length);
}

scenario('Returning player', { layouts: ['desktop'], open: { storage: { neon_td_player_name: 'Fra' } } }, async (g) => {
  await seedLeaderboard(g, [{ name: 'Fra', score: 100, wave: 3 }]);
  await loseGame(g);
  assert(await g.eval(() => document.getElementById('player-name').value) === 'Fra', 'name not prefilled');
  await g.press('#save-score-btn');
  await g.page.waitForFunction(() => document.getElementById('menu-screen').style.display === 'flex', { timeout: 3000 });
  assert(leaderboard.length === 2, 'score not posted');
});

scenario("Someone else's name", { layouts: ['desktop'], open: { storage: { neon_td_player_name: 'Fra' } } }, async (g) => {
  await seedLeaderboard(g, [{ name: 'Zed', score: 100, wave: 3 }]);
  await loseGame(g);
  await g.eval(() => { document.getElementById('player-name').value = ''; });
  await g.press('#player-name');
  await g.page.keyboard.type('zed');
  await g.press('#save-score-btn');
  assert(await g.visible('#name-taken-warn'), 'warning not shown');
  const w = await g.eval(() => document.getElementById('name-taken-warn').textContent);
  assert(w.startsWith('Name already taken'), `warning reads "${w}"`);
  assert(leaderboard.length === 1, 'score was posted');
  assert(await g.visible('#game-over-screen'), 'left the end screen');
});

scenario('Game started before the banner delay', { layouts: ['phone'], open: { userAgent: IPHONE_UA } }, async (g) => {
  await g.startGame();
  await sleep(2600);
  assert(!(await g.visible('#pwa-banner')), 'install banner over the game');
  await g.press('#pause-btn');
  await g.press('#restart-btn');
  assert(await g.visible('#pwa-banner'), 'install banner not shown on the menu');
});

// ── Panels and layout ──

// Colours of the screen pixels along a 1px high strip at a page point
// (first PNG row only, so only the row-0 forms of the filters are needed)
async function pixelRow(page, x, y, width) {
  const png = Buffer.from(await page.screenshot({ clip: { x: Math.round(x), y: Math.round(y), width: Math.round(width), height: 1 } }));
  const idat = [];
  let bpp = 3, w = 0;
  for (let i = 8; i < png.length;) {
    const len = png.readUInt32BE(i);
    const type = png.toString('ascii', i + 4, i + 8);
    if (type === 'IHDR') { w = png.readUInt32BE(i + 8); bpp = png[i + 17] === 6 ? 4 : 3; }
    if (type === 'IDAT') idat.push(png.subarray(i + 8, i + 8 + len));
    i += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const filter = raw[0];
  const row = Buffer.from(raw.subarray(1, 1 + w * bpp));
  for (let i = bpp; i < row.length; i++) {
    const left = row[i - bpp];
    if (filter === 1 || filter === 4) row[i] = (row[i] + left) & 255;
    else if (filter === 3) row[i] = (row[i] + (left >> 1)) & 255;
  }
  const px = [];
  for (let i = 0; i < w; i++) px.push([row[i * bpp], row[i * bpp + 1], row[i * bpp + 2]]);
  return px;
}

const near = (c, want, tol = 6) => c.every((v, i) => Math.abs(v - want[i]) <= tol);
const PANEL_RGB = [10, 10, 15];

// With the panel's own content hidden, the pixel at the centre of its overlap
// with `under` must be the panel colour, not whatever is beneath it
async function expectOpaqueOver(g, panelSel, underSel) {
  await g.eval((p) => document.querySelectorAll(`${p} > *`).forEach(c => { c.style.visibility = 'hidden'; }), panelSel);
  await sleep(250); // let fade-ins finish
  const a = await g.rect(panelSel), b = await g.rect(underSel);
  assert(intersects(a, b), `${panelSel} does not cover ${underSel}`);
  const left = Math.max(a.left, b.left) + 2, right = Math.min(a.right, b.right) - 2;
  const y = (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2;
  const bad = (await pixelRow(g.page, left, y, right - left)).find(c => !near(c, PANEL_RGB));
  assert(!bad, `${underSel} shows through ${panelSel}: rgb(${bad})`);
  const alpha = await g.eval((p) => { const m = getComputedStyle(document.querySelector(p)).backgroundColor.match(/[\d.]+/g); return m.length > 3 ? +m[3] : 1; }, panelSel);
  assert(alpha === 1, `${panelSel} background alpha ${alpha}`);
  await g.eval((p) => document.querySelectorAll(`${p} > *`).forEach(c => { c.style.visibility = ''; }), panelSel);
}

// Placeable tiles anywhere on the board, sorted by distance from the top-left
const placeable = (g) => g.eval(() => {
  const grid = window.game.grid, out = [];
  for (let y = 0; y < grid.rows; y++) for (let x = 0; x < grid.cols; x++) if (grid.isPlaceable(x, y)) out.push({ x, y });
  return out.sort((a, b) => (a.x + a.y) - (b.x + b.y));
});

const tileRect = (g, x, y) => g.eval((x, y) => {
  const r = window.game.renderer.canvas.getBoundingClientRect();
  const ts = 40 * r.width / window.game.renderer.width;
  return { left: r.left + x * ts, top: r.top + y * ts, right: r.left + (x + 1) * ts, bottom: r.top + (y + 1) * ts, ts };
}, x, y);

async function selectPlacedTower(g, tile) {
  const t = tile || (await g.buildable())[0];
  await g.placeAt('blaster', t.x, t.y);
  await g.pressTile(t.x, t.y);
  assert(await g.visible('#upgrade-panel'), 'upgrade panel not open');
  return t;
}

const noPageScroll = (g) => g.eval(() => document.documentElement.scrollHeight === innerHeight &&
  document.documentElement.scrollWidth === innerWidth);

scenario('Sheet over the wave controls', { layouts: ['phone'] }, async (g) => {
  await g.startGame();
  await selectPlacedTower(g);
  await expectOpaqueOver(g, '#upgrade-panel', '#start-wave-btn');
  await g.press('#upgrade-panel .up-close');
  await g.press('.tower-btn[data-tower-type="blaster"]');
  await expectOpaqueOver(g, '#tower-stats-tooltip', '#start-wave-btn');
});

scenario('Desktop panel over the wave controls', { layouts: ['desktop'] }, async (g) => {
  await g.startGame();
  await selectPlacedTower(g);
  // Force an overlap to prove the panel itself is opaque
  await g.eval(() => {
    const p = document.getElementById('upgrade-panel');
    const w = document.getElementById('canvas-wrapper').getBoundingClientRect();
    const b = document.getElementById('start-wave-btn').getBoundingClientRect();
    p.style.left = (b.left - w.left) + 'px';
    p.style.top = (b.top - w.top - 20) + 'px';
  });
  await expectOpaqueOver(g, '#upgrade-panel', '#start-wave-btn');
});

scenario('Controls off the board on desktop', { layouts: ['desktop', 'desktopShort'] }, async (g) => {
  await g.startGame();
  const board = await g.rect('#game-canvas');
  assert((await g.rect('#hud')).bottom <= board.top, 'HUD covers the board');
  assert((await g.rect('#wave-controls')).top >= board.bottom, 'wave controls cover the board');
  const start = await g.rect('#start-wave-btn');
  const inside = await g.eval((r) => r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight, start);
  assert(inside, 'start button outside the viewport');
  const ratio = await g.eval(() => window.game.renderer.width / window.game.renderer.height);
  assert(Math.abs(board.width / board.height / ratio - 1) < 0.01, `board ${board.width}x${board.height} lost its ratio`);
  const [a] = await g.buildable();
  await g.placeAt('blaster', a.x, a.y);
  await g.press('#start-wave-btn');
  assert(await g.eval(() => window.game.state) === 'PLAYING', 'start button did not start the wave');
  const after = await g.rect('#game-canvas');
  assert(JSON.stringify(after) === JSON.stringify(board), `board moved when the wave started: ${JSON.stringify(board)} -> ${JSON.stringify(after)}`);
});

scenario('Landscape keeps the overlay', { layouts: ['landscape'] }, async (g) => {
  await g.startGame();
  const board = await g.rect('#game-canvas');
  const controls = await g.rect('#wave-controls');
  assert(controls.top > board.top && intersects(controls, { ...board, left: -Infinity, right: Infinity }), 'wave controls left the board column');
  assert(board.height >= 300, `board shrunk to ${board.height}px`);
});

scenario('Placing in Italian on a phone', { layouts: ['phone', 'phoneShort'], langs: ['it'] }, async (g) => {
  await g.startGame();
  await g.setGold(300);
  const [a] = await g.buildable();
  await g.placeAt('blaster', a.x, a.y);
  await g.pick('blaster');
  const cancel = await g.rect('#cancel-place-btn'), start = await g.rect('#start-wave-btn');
  assert(await g.visible('#cancel-place-btn'), 'ANNULLA hidden');
  assert(await g.visible('#start-wave-btn'), 'INIZIA ONDATA hidden');
  assert(!intersects(cancel, start), 'ANNULLA overlaps INIZIA ONDATA');
  const clipped = await g.eval(() => ['#cancel-place-btn', '#start-wave-btn'].filter(s => {
    const el = document.querySelector(s), r = el.getBoundingClientRect();
    return el.scrollWidth > el.clientWidth || r.left < 0 || r.right > innerWidth || r.bottom > innerHeight;
  }));
  assert(clipped.length === 0, `cut off: ${clipped}`);
  const labels = await g.eval(() => [document.getElementById('cancel-place-btn').textContent, document.getElementById('start-wave-btn').textContent]);
  assert(labels[0] === 'ANNULLA' && labels[1] === 'INIZIA ONDATA', `labels: ${labels}`);
  const boardTop = (await g.rect('#game-canvas')).top;
  await g.press('#start-wave-btn');
  assert(await g.eval(() => window.game.state) === 'PLAYING', 'start button did not start the wave');
  assert((await g.rect('#game-canvas')).top === boardTop, 'board moved when the wave started');
});

async function expectBesideTower(g, tile, side) {
  const panel = await g.rect('#upgrade-panel');
  const t = await tileRect(g, tile.x, tile.y);
  assert(!intersects(panel, t), 'panel covers the tower tile');
  assert(!intersects(panel, await g.rect('#wave-controls')), 'panel covers the wave controls');
  if (side === 'right') assert(panel.left >= t.right, 'panel not to the right of the tower');
  else assert(panel.right <= t.left, 'panel not to the left of the tower');
  return { panel, t };
}

scenario('Tower near the top-left corner', { layouts: ['desktop'] }, async (g) => {
  await g.startGame();
  const [tile] = await placeable(g);
  await selectPlacedTower(g, tile);
  const { panel, t } = await expectBesideTower(g, tile, 'right');
  const reach = 3.5 * t.ts;
  const cx = (t.left + t.right) / 2;
  assert(panel.left >= cx + reach, 'panel covers the range circle');
});

scenario('Tower near the bottom-right corner', { layouts: ['desktop'] }, async (g) => {
  await g.startGame();
  const tile = (await placeable(g)).pop();
  await selectPlacedTower(g, tile);
  await expectBesideTower(g, tile, 'left');
});

scenario('Upgrading in landscape', { layouts: ['landscape'], langs: ['en', 'it'] }, async (g) => {
  await g.startGame();
  await selectPlacedTower(g);
  const sheet = await g.rect('#upgrade-panel');
  assert(sheet.left >= 0 && sheet.top >= 0 && sheet.right <= 844 && sheet.bottom <= 390, `sheet outside the viewport: ${JSON.stringify(sheet)}`);
  assert(await noPageScroll(g), 'page scrolls');
  const boardSeen = await g.eval(() => {
    const c = window.game.renderer.canvas, r = c.getBoundingClientRect();
    return document.elementFromPoint(r.left + 20, r.top + r.height / 2) === c;
  });
  assert(boardSeen, 'board hidden');
  const scrolls = await g.eval(() => getComputedStyle(document.getElementById('upgrade-panel')).overflowY);
  assert(scrolls === 'auto', 'sheet does not scroll inside');
});

scenario('Tower card in landscape', { layouts: ['landscape'], langs: ['en', 'it'] }, async (g) => {
  await g.startGame();
  await g.press('.tower-btn[data-tower-type="blaster"]');
  await sleep(250); // slide-in transition
  const card = await g.rect('#tower-stats-tooltip');
  assert(card.left >= 0 && card.top >= 0 && card.right <= 844 && card.bottom <= 390, `card outside the viewport: ${JSON.stringify(card)}`);
  assert(await noPageScroll(g), 'page scrolls');
  await g.press('#tower-stats-tooltip.visible .ttp-place-btn');
  await expectPlacing(g, 'blaster');
});

scenario('Close and start', { layouts: ['phone', 'phoneShort', 'landscape'] }, async (g) => {
  await g.startGame();
  await selectPlacedTower(g);
  await g.press('#upgrade-panel .up-close');
  assert(!(await g.visible('#upgrade-panel')), 'sheet still open');
  assert(!(await g.carry()).selected, 'tower still selected');
  await g.press('#start-wave-btn');
  assert(await g.eval(() => window.game.state) === 'PLAYING', 'start button not reachable');
});

scenario('Stray tap on Sell', { layouts: ['phone', 'desktop'], langs: ['en', 'it'] }, async (g) => {
  await g.startGame();
  await selectPlacedTower(g);
  const gold = await g.eval(() => window.game.economy.gold);
  await g.press('#upgrade-panel .sell-btn');
  const label = await g.eval(() => document.querySelector('#upgrade-panel .sell-btn').textContent);
  const value = await g.eval(() => window.game.towers[0].getSellValue());
  const want = (g.lang === 'it' ? 'Vendi per {n}?' : 'Sell for {n}?').replace('{n}', value);
  assert(label === want, `Sell reads "${label}"`);
  const road = await g.roadTile();
  await g.pressTile(road.x, road.y);
  assert(await g.eval(() => window.game.towers.length) === 1, 'tower sold');
  assert(await g.eval(() => window.game.economy.gold) === gold, 'gold changed');
});

scenario('Confirmed sell', { layouts: ['phone', 'desktop'] }, async (g) => {
  await g.startGame();
  await selectPlacedTower(g);
  const gold = await g.eval(() => window.game.economy.gold);
  const value = await g.eval(() => window.game.towers[0].getSellValue());
  await g.press('#upgrade-panel .sell-btn');
  await g.press('#upgrade-panel .sell-btn');
  assert(await g.eval(() => window.game.towers.length) === 0, 'tower not sold');
  assert(await g.eval(() => window.game.economy.gold) === gold + value, 'wrong gold');
  assert(!(await g.visible('#upgrade-panel')), 'panel still open');
});

// Every visible text on the game screen at 12px or more and 4.5:1 or more
// against the backgrounds under it (DOM ancestors, composited over the page)
const sizeAndContrastIssues = (g) => g.eval(() => {
  const parse = (c) => { const m = c.match(/[\d.]+/g).map(Number); return { r: m[0], g: m[1], b: m[2], a: m.length > 3 ? m[3] : 1 }; };
  const over = (top, bottom) => ({ r: top.r * top.a + bottom.r * (1 - top.a), g: top.g * top.a + bottom.g * (1 - top.a), b: top.b * top.a + bottom.b * (1 - top.a), a: 1 });
  const lum = (c) => ['r', 'g', 'b'].map(k => { const v = c[k] / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const issues = [];
  for (const el of document.querySelectorAll('#game-container *')) {
    if (el.closest('#menu-screen, #pause-overlay, #game-over-screen, svg')) continue;
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (!own || !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const st = getComputedStyle(el);
    const size = parseFloat(st.fontSize);
    let bg = { r: 10, g: 10, b: 10, a: 1 };
    const chain = [];
    for (let e = el; e; e = e.parentElement) chain.unshift(e);
    for (const e of chain) bg = over(parse(getComputedStyle(e).backgroundColor), bg);
    const fg = over(parse(st.color), bg);
    const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a);
    const ratio = (hi + 0.05) / (lo + 0.05);
    const text = el.textContent.trim().slice(0, 30);
    if (size < 12) issues.push(`${text}: ${size}px`);
    if (ratio < 4.5) issues.push(`${text}: ${ratio.toFixed(2)}:1`);
  }
  return issues;
});

scenario('Tall phone', { layouts: ['phone'], langs: ['en', 'it'] }, async (g) => {
  await g.startGame();
  const board = await g.rect('#game-canvas'), label = await g.rect('#phase-label');
  const gap = label.top - board.bottom;
  assert(gap >= 0 && gap <= 16, `phase label ${gap}px below the board`);
  assert(await g.visible('.tower-btn:not(.tower-locked) .tower-desc'), 'descriptions hidden');
  const cut = await g.eval(() => {
    const panel = document.getElementById('tower-panel').getBoundingClientRect();
    return [...document.querySelectorAll('.tower-btn')].filter(b => {
      const r = b.getBoundingClientRect();
      return r.bottom > panel.bottom || r.bottom > innerHeight || b.scrollHeight > b.clientHeight + 1;
    }).map(b => b.dataset.towerType);
  });
  assert(cut.length === 0, `cut off: ${cut}`);
  assert(await noPageScroll(g), 'page scrolls');
  const issues = await sizeAndContrastIssues(g);
  assert(issues.length === 0, `size or contrast: ${issues.join('; ')}`);
});

scenario('Short phone', { layouts: ['phoneShort'], langs: ['en', 'it'] }, async (g) => {
  await g.startGame();
  const cut = await g.eval(() => [...document.querySelectorAll('.tower-btn')]
    .filter(b => { const r = b.getBoundingClientRect(); return r.top < 0 || r.bottom > innerHeight; })
    .map(b => b.dataset.towerType));
  assert(cut.length === 0, `not fully visible: ${cut}`);
  assert(await noPageScroll(g), 'page scrolls');
  const issues = await sizeAndContrastIssues(g);
  assert(issues.length === 0, `size or contrast: ${issues.join('; ')}`);
});

// ── Rendering ──

async function expectBacking(g, width) {
  const c = await g.eval(() => {
    const c = window.game.renderer.canvas, r = c.getBoundingClientRect();
    return { backing: c.width, shown: c.clientWidth, ratio: c.clientWidth / c.clientHeight };
  });
  const logical = await g.eval(() => [window.game.renderer.width, window.game.renderer.height]);
  assert(c.backing === logical[0] * 2, `backing store ${c.backing}px wide`);
  assert(c.shown === width, `board drawn ${c.shown}px wide, expected ${width}`);
  assert(Math.abs(c.ratio - logical[0] / logical[1]) < 0.01, 'board stretched');
}

async function expectTapPlaces(g) {
  await g.setGold(300);
  await g.pick('blaster');
  const [tile] = await g.buildable();
  await g.pressTile(tile.x, tile.y);
  assert(await g.eval((t) => !!window.game.grid.getTowerAt(t.x, t.y), tile), 'tower not on the tapped tile');
}

scenario('Phone at 3x pixel density', { layouts: ['phone'] }, async (g) => {
  await g.startGame();
  await expectBacking(g, 388); // 390 minus the border
  await expectTapPlaces(g);
});

scenario('Desktop at 2x', { layouts: ['desktop'], open: { scale: 2 } }, async (g) => {
  await g.startGame();
  await expectBacking(g, 800);
  await expectTapPlaces(g);
});

scenario('Tutorial pointer on the ghost tile', { layouts: ['phone', 'desktop'], open: { tutorial: true } }, async (g) => {
  await g.startGame();
  await g.page.waitForFunction(() => window.game.tutorial.active && window.game.tutorial.step === 0);
  await g.press('.tutorial-blocker'); // info step: tap anywhere
  await g.pick('blaster');
  await g.page.waitForFunction(() => window.game.tutorial.ghost);
  await sleep(100);
  const { pointer, centre } = await g.eval(() => {
    const p = document.getElementById('tutorial-pointer');
    const c = window.game.renderer.canvas.getBoundingClientRect();
    const ts = c.width / window.game.grid.cols;
    const gh = window.game.tutorial.ghost;
    return { pointer: [parseFloat(p.style.left), parseFloat(p.style.top)], centre: [c.left + (gh.x + 0.5) * ts, c.top + (gh.y + 0.5) * ts] };
  });
  assert(Math.hypot(pointer[0] - centre[0], pointer[1] - centre[1]) < 1, `pointer at ${pointer}, ghost tile centre ${centre}`);
});

scenario('Boss wave in Italian', { layouts: ['desktop'], langs: ['it'] }, async (g) => {
  await g.startGame();
  await g.eval(() => { window.game.waveManager.currentWave = 4; });
  await startWave(g);
  const banner = () => g.eval(() => window.game.waveBanner && window.game.waveBanner.text);
  assert(await banner() === 'ONDATA 5: BOSS', `banner reads "${await banner()}"`);
  await g.eval(() => { window.game.waveManager.spawnQueue = []; window.game.enemies = []; });
  await g.page.waitForFunction(() => window.game.state === 'BETWEEN_WAVES', { timeout: 5000 });
  const done = await banner();
  assert(done === 'ONDATA 5 COMPLETATA' || done === 'ONDATA 5 PERFETTA!', `banner reads "${done}"`);
});

// ── Tutorial ──

// Plays every step like a newcomer on a phone. On action steps the caption is
// shown and the pointer lands in the hole left for the target, not on a blocker.
scenario('Complete tutorial', { layouts: ['phone'], langs: ['en', 'it'], open: { tutorial: true } }, async (g) => {
  const info = () => g.press('.tutorial-blocker:not(.hidden)');
  const steps = [
    info, // road
    () => g.press('.tower-btn[data-tower-type="blaster"]'),
    () => g.press('#tower-stats-tooltip.visible .ttp-place-btn'),
    async () => { const gh = await g.eval(() => window.game.tutorial.ghost); await g.pressTile(gh.x, gh.y); },
    () => g.press('#start-wave-btn'),
    info, info, info, // shoot, lives, gold
    async () => { const t = await g.eval(() => window.game.towers[0]); await g.pressTile(t.gx, t.gy); },
    info, // done
  ];
  await g.startGame();
  for (let step = 0; step < steps.length; step++) {
    if (step === 8) {
      // The upgrade step waits for the wave to end
      await g.eval(() => { window.game.waveManager.spawnQueue = []; window.game.enemies = []; });
      await g.page.waitForFunction(() => window.game.state === 'BETWEEN_WAVES', { timeout: 5000 });
    }
    await g.page.waitForFunction((st) => window.game.tutorial.step === st &&
      !document.getElementById('tutorial-overlay').classList.contains('hidden'), { timeout: 3000 }, step);
    await sleep(150);
    const onBlocker = await g.eval(() => {
      const p = document.getElementById('tutorial-pointer');
      if (p.classList.contains('hidden')) return false;
      const hit = document.elementFromPoint(parseFloat(p.style.left), parseFloat(p.style.top));
      return !!(hit && hit.classList.contains('tutorial-blocker'));
    });
    if (steps[step] !== info) assert(!onBlocker, `step ${step}: pointer lands on a blocker`);
    await steps[step]();
  }
  await sleep(150);
  assert(!(await g.eval(() => window.game.tutorial.active)), 'tutorial did not finish');
  assert(await g.eval(() => localStorage.getItem('neonDefenseTutorialDone')) === 'true', 'tutorial not saved as done');
});

// ── Cores and unlocks ──

const ALL_UNLOCKED = '["frost","lightning","cannon","support","sniper"]';
const wallet = (g) => g.eval(() => ({
  cores: window.game.progressTracker.cores,
  saved: localStorage.getItem('neon_td_cores'),
  unlocked: [...window.game.progressTracker.unlocked],
}));

// Place a Blaster if the board is empty, start the next wave and clear it at once
async function clearWave(g) {
  await g.eval(() => {
    const game = window.game;
    if (game.towers.length === 0) {
      const t = game.renderer.buildableTiles(game.grid)[0];
      game.placeTower('blaster', t.x, t.y);
    }
    game.startNextWave();
    game.waveManager.spawnQueue = [];
    game.enemies = [];
  });
  await g.page.waitForFunction(() => window.game.state === 'BETWEEN_WAVES', { timeout: 5000 });
}

scenario('Fresh profile', { layouts: ['desktop'] }, async (g) => {
  await g.startGame();
  const w = await wallet(g);
  assert(w.cores === 0, `cores ${w.cores}`);
  assert(w.unlocked.includes('blaster') && !w.unlocked.includes('frost'), `unlocked ${w.unlocked}`);
});

scenario('Seeded profile', { layouts: ['desktop'], open: { storage: { neon_td_cores: '12', neon_td_unlocked: '["frost"]' } } }, async (g) => {
  await g.startGame();
  await g.eval(() => window.game.returnToMenu());
  await g.startGame();
  const w = await wallet(g);
  assert(w.cores === 12, `cores ${w.cores}`);
  assert(w.unlocked.includes('frost'), `unlocked ${w.unlocked}`);
});

scenario('Clearing wave 1 pays a core', { layouts: ['desktop'] }, async (g) => {
  await g.startGame();
  await clearWave(g);
  assert((await wallet(g)).saved === '1', `after wave 1: ${(await wallet(g)).saved}`);
  await clearWave(g);
  assert((await wallet(g)).saved === '3', `after wave 2: ${(await wallet(g)).saved}`);
});

scenario('Game over keeps cores', { layouts: ['desktop'], open: { storage: { neon_td_cores: '15' } } }, async (g) => {
  await g.startGame();
  await g.eval(() => { const t = window.game.renderer.buildableTiles(window.game.grid)[0]; window.game.placeTower('blaster', t.x, t.y); });
  await g.eval(() => { window.game.startNextWave(); window.game.lives = 0; });
  await g.page.waitForFunction(() => window.game.state === 'GAME_OVER', { timeout: 3000 });
  await g.press('#play-again-btn');
  await g.startGame();
  const w = await wallet(g);
  assert(w.cores === 15 && w.saved === '15', `cores ${w.cores}, saved ${w.saved}`);
});

async function expectLightningUnlocked(g) {
  const w = await wallet(g);
  assert(w.unlocked.includes('lightning'), 'Lightning still locked');
  assert(w.cores === 1 && w.saved === '1', `cores ${w.cores}, saved ${w.saved}`);
  const banner = await g.eval(() => document.getElementById('unlock-notification')?.textContent || '');
  assert(banner.includes('Lightning'), `banner: ${banner}`);
  await g.setGold(1000);
  await g.pick('lightning');
  await expectPlacing(g, 'lightning');
}

const SIX_CORES = { storage: { neon_td_cores: '6', neon_td_unlocked: '["frost"]' } };

scenario('Unlock from the sheet', { layouts: ['phone'], open: SIX_CORES }, async (g) => {
  await g.startGame();
  await g.press('.tower-btn[data-tower-type="lightning"]');
  const label = await g.eval(() => document.querySelector('#tower-stats-tooltip.visible .ttp-place-btn').textContent);
  assert(label === 'Unlock for 5 cores', `button: ${label}`);
  await g.press('#tower-stats-tooltip.visible .ttp-place-btn');
  await expectLightningUnlocked(g);
});

scenario('Unlock on click', { layouts: ['desktop'], open: SIX_CORES }, async (g) => {
  await g.startGame();
  const label = await g.eval(() => document.querySelector('.tower-btn[data-tower-type="lightning"] .tower-unlock-req').textContent);
  assert(label === 'Unlock for 5 cores', `button: ${label}`);
  await g.press('.tower-btn[data-tower-type="lightning"]');
  await expectLightningUnlocked(g);
});

scenario('Cannot afford', { layouts: ['phone', 'desktop'], open: { storage: { neon_td_cores: '3', neon_td_unlocked: '["frost"]' } } }, async (g) => {
  await g.startGame();
  await g.press('.tower-btn[data-tower-type="lightning"]');
  if (g.touch) {
    const disabled = await g.eval(() => document.querySelector('#tower-stats-tooltip.visible .ttp-place-btn').disabled);
    assert(disabled, 'unlock control enabled');
  }
  const w = await wallet(g);
  assert(w.cores === 3 && !w.unlocked.includes('lightning'), `cores ${w.cores}, unlocked ${w.unlocked}`);
});

const tracker = (g) => g.eval(() => ({
  label: document.querySelector('#unlock-tracker .unlock-label')?.textContent.trim(),
  fill: document.querySelector('#unlock-tracker .unlock-bar-fill')?.style.width,
  balance: document.getElementById('cores-value')?.textContent,
}));

scenario('Tracker toward Cannon', { layouts: ['phone', 'desktop'], open: { storage: { neon_td_cores: '15', neon_td_unlocked: '["frost","lightning","support","sniper"]' } } }, async (g) => {
  await g.startGame();
  const tr = await tracker(g);
  assert(tr.label === 'Next tower: Cannon, 5 cores to go', `label: ${tr.label}`);
  assert(tr.fill === '75%', `bar: ${tr.fill}`);
  assert(tr.balance === '15', `balance: ${tr.balance}`);
});

scenario('Tracker affordable', { layouts: ['phone', 'desktop'], open: { storage: { neon_td_cores: '25', neon_td_unlocked: '["frost","lightning","support","sniper"]' } } }, async (g) => {
  await g.startGame();
  const tr = await tracker(g);
  assert(tr.label === 'Cannon can be unlocked', `label: ${tr.label}`);
  assert(tr.fill === '100%', `bar: ${tr.fill}`);
});

scenario('Tracker with everything unlocked', { layouts: ['desktop'], open: { storage: { neon_td_cores: '40', neon_td_unlocked: ALL_UNLOCKED } } }, async (g) => {
  await g.startGame();
  const tr = await tracker(g);
  assert(tr.label === undefined && tr.fill === undefined, `still shows ${JSON.stringify(tr)}`);
  assert(tr.balance === '40', `balance: ${tr.balance}`);
});

scenario('Tracker on a phone', { layouts: ['phone'], langs: ['en', 'it'] }, async (g) => {
  await g.startGame();
  const size = await g.eval(() => parseFloat(getComputedStyle(document.querySelector('#unlock-tracker .unlock-label')).fontSize));
  assert(size >= 12, `label is ${size}px`);
  const label = await g.rect('#unlock-tracker .unlock-label');
  const controls = await g.rect('#speed-controls');
  assert(label.width > 0 && !intersects(label, controls), 'label overlaps the controls');
});

scenario('End screen after wave 2', { layouts: ['desktop'], langs: ['en', 'it'] }, async (g) => {
  await g.startGame();
  await clearWave(g);
  await clearWave(g);
  await g.eval(() => { window.game.startNextWave(); window.game.lives = 0; });
  await g.page.waitForFunction(() => window.game.state === 'GAME_OVER', { timeout: 3000 });
  const earned = await g.eval(() => document.getElementById('cores-earned').textContent);
  const expected = g.lang === 'it' ? '+3 core in questa partita' : '+3 cores this run';
  assert(earned === expected, `earned: ${earned}`);
  assert(await g.visible('#next-unlock-hint'), 'next-unlock line hidden');
  const hint = await g.eval(() => document.getElementById('next-unlock-hint').textContent);
  const frost = g.lang === 'it' ? 'Gelo' : 'Frost';
  assert(hint.includes(frost), `hint: ${hint}`);
});

scenario('End screen with everything unlocked', { layouts: ['desktop'], langs: ['en', 'it'], open: { storage: { neon_td_unlocked: ALL_UNLOCKED } } }, async (g) => {
  await g.startGame();
  await clearWave(g);
  await g.eval(() => { window.game.startNextWave(); window.game.lives = 0; });
  await g.page.waitForFunction(() => window.game.state === 'GAME_OVER', { timeout: 3000 });
  const earned = await g.eval(() => document.getElementById('cores-earned').textContent);
  assert(earned.startsWith('+1 core'), `earned: ${earned}`);
  assert(!(await g.visible('#next-unlock-hint')), 'next-unlock line shown');
});

scenario('Visual unlock states refresh after spending', { layouts: ['phone', 'desktop'], langs: ['en', 'it'], open: { storage: { neon_td_cores: '5' } } }, async (g) => {
  await g.startGame();
  const state = () => g.eval(() => Object.fromEntries(['frost', 'lightning'].map(type => {
    const card = document.querySelector(`.tower-btn[data-tower-type="${type}"]`);
    return [type, { ready: card.classList.contains('tower-can-unlock'), locked: card.classList.contains('tower-locked') }];
  })));
  let before = await state();
  assert(before.frost.ready && before.lightning.ready, `initial states: ${JSON.stringify(before)}`);
  if (g.touch) {
    await g.press('.tower-btn[data-tower-type="frost"]');
    await g.press('#tower-stats-tooltip.visible .ttp-place-btn');
  } else await g.press('.tower-btn[data-tower-type="frost"]');
  const after = await state();
  assert(!after.frost.locked && !after.lightning.ready && after.lightning.locked, `after purchase: ${JSON.stringify(after)}`);
  assert(await g.visible('#unlock-notification .unlock-pic'), 'reward picture missing');
});

scenario('Visual upgrade picture follows tier and path', { layouts: ['phone', 'desktop'] }, async (g) => {
  await g.startGame();
  const tile = (await g.buildable())[0];
  await g.placeAt('blaster', tile.x, tile.y);
  await g.eval(() => { const game = window.game; game.economy.gold = 1000; game.input.selectedTower = game.towers[0]; game.ui.showUpgradePanel(game.towers[0]); });
  const picture = () => g.eval(() => document.querySelector('#upgrade-panel .up-pic').src);
  const base = await picture();
  await g.eval(() => window.game.upgradeTower(window.game.towers[0], 'B'));
  const tier1 = await picture();
  await g.eval(() => window.game.upgradeTower(window.game.towers[0], 'B'));
  const tier2 = await picture();
  assert(base !== tier1 && tier1 !== tier2, 'picture did not update with the upgrade');
});

scenario('Upgrade descriptions follow balance data', { layouts: ['phone', 'desktop'], langs: ['en', 'it'] }, async (g) => {
  await g.startGame();
  const result = await g.eval(async () => {
    const { Tower } = await import('/js/tower.js');
    const tower = new Tower('support', 0, 0);
    tower.def = structuredClone(tower.def);
    tower.def.upgrades.pathA.levels[2].stats.damageAmp = 0.33;
    tower.def.upgrades.pathA.levels[2].stats.fireRateAmp = 0.09;
    tower.def.upgrades.pathB.levels[0].stats.goldPerWave = 37;
    window.game.input.selectedTower = tower;
    window.game.ui.showUpgradePanel(tower);
    const descriptions = [...document.querySelectorAll('.up-desc')].map(el => el.textContent);
    const { TOWER_DEFS } = await import('/js/config.js');
    for (const type of Object.keys(TOWER_DEFS)) {
      const selected = new Tower(type, 0, 0);
      window.game.input.selectedTower = selected;
      window.game.ui.showUpgradePanel(selected);
      if (document.querySelector('#upgrade-panel').textContent.includes('{')) return null;
    }
    return descriptions;
  });
  assert(result, 'unresolved description placeholders');
  assert(result[2].includes('33%') && result[2].includes('9%'), `bonus description: ${result[2]}`);
  assert(result[3].includes('37'), `income description: ${result[3]}`);
});

scenario('Polish: successful upgrades give feedback, rejected upgrades do not', { layouts: ['phone', 'desktop', 'landscape'], langs: ['en', 'it'] }, async (g) => {
  await g.startGame();
  const tile = (await g.buildable())[0];
  await g.placeAt('blaster', tile.x, tile.y);
  const result = await g.eval(() => {
    const game = window.game, tower = game.towers[0];
    game.input.selectedTower = tower;
    game.economy.gold = 1000;
    const sounds = [];
    const play = game.audio.playSfx.bind(game.audio);
    game.audio.playSfx = name => { sounds.push(name); play(name); };
    game.upgradeTower(tower, 'B');
    const message = document.querySelector('.up-feedback').textContent;
    const pulsing = tower.upgradePulseUntil > Date.now();
    const until = tower.upgradePulseUntil;
    game.economy.gold = 0;
    game.upgradeTower(tower, 'B');
    game.upgradeTower(tower, 'A');
    return { message, pulsing, unchanged: until === tower.upgradePulseUntil, sounds };
  });
  assert(result.message.includes('25'), `missing upgraded damage: ${result.message}`);
  assert(result.pulsing && result.unchanged, 'upgrade pulse missing or replayed for rejected purchase');
  assert(result.sounds.join(',') === 'upgrade', `unexpected sounds: ${result.sounds}`);
  assert(await g.visible('.up-feedback'), 'upgrade confirmation hidden');
  assert(await noPageScroll(g), 'upgrade confirmation causes page scrolling');
  await sleep(650);
  assert(await g.eval(() => window.game.towers[0].upgradePulseUntil <= Date.now()), 'pulse did not expire');
});

scenario('Polish: wave progress follows spawns, splitters, leaks and completion', { langs: ['en', 'it'] }, async (g) => {
  await g.startGame();
  assert(!(await g.visible('#wave-progress')), 'progress visible before wave');
  await startWave(g);
  const results = await g.eval(async () => {
    const { t } = await import('/js/i18n.js');
    const game = window.game;
    const checks = [];
    const check = () => {
      game.ui.updateHUD();
      const spawning = game.waveManager.spawnQueue.length;
      const remaining = game.enemies.filter(e => e.active && !e.reachedEnd).length;
      checks.push(document.getElementById('wave-progress').textContent === t('wave.progress', { spawning, remaining }));
    };
    game.enemies = [];
    game.waveManager.spawnTimer = 0;
    game._update(0);
    check();
    game._spawnEnemy({ type: 'splitter', waveMult: { hp: 1, speed: 1, reward: 1 } });
    game.enemies.at(-1).active = false;
    game._update(0);
    check();
    const children = game.enemies.filter(e => e.type === 'basic').length;
    game.enemies[0].reachedEnd = true;
    game._update(0);
    check();
    game.waveManager.spawnQueue = [];
    game._update(0);
    check();
    game.togglePause();
    return { checks, children };
  });
  assert(results.checks.every(Boolean), 'wave progress differs from actual enemies');
  assert(results.children >= 2, 'splitter children missing');
  assert(await g.visible('#wave-progress'), 'progress hidden during wave or pause');
  assert(await noPageScroll(g), 'wave progress causes page scrolling');
  const progress = await g.rect('#wave-progress');
  assert(progress.left >= 0 && progress.right <= await g.eval(() => innerWidth), 'progress clipped');
  await g.eval(() => {
    const game = window.game;
    game.togglePause();
    game.enemies = [];
    game._update(0);
  });
  assert((await g.page.$eval('#wave-progress', e => e.textContent)).includes('0'), 'empty wave not reflected');
  await g.eval(() => window.game._update(1));
  assert(!(await g.visible('#wave-progress')), 'progress still visible between waves');
});

// ── Runner ──

async function main() {
  if (!fs.existsSync(CHROME)) {
    console.error(`Chrome not found at ${CHROME}. Set CHROME_PATH.`);
    process.exit(2);
  }
  const server = await serve();
  const base = `http://127.0.0.1:${server.address().port}/`;
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  let failed = 0, passed = 0;
  for (const s of scenarios) {
    if (FILTER && !s.name.toLowerCase().includes(FILTER.toLowerCase())) continue;
    for (const layout of s.layouts) {
      for (const lang of s.langs) {
        const label = `${s.name} [${layout}${s.langs.length > 1 ? ' ' + lang : ''}]`;
        leaderboard.length = 0;
        let g;
        try {
          g = await openGame(browser, base, layout, lang, s.open);
          await s.fn(g);
          await sleep(50);
          assert(g.errors.length === 0, 'page errors: ' + g.errors.join(' | '));
          passed++;
          console.log(`PASS ${label}`);
        } catch (e) {
          failed++;
          console.log(`FAIL ${label}: ${e.message.split('\n')[0]}`);
        } finally {
          if (g) await g.context.close();
        }
      }
    }
  }
  await browser.close();
  server.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main();
