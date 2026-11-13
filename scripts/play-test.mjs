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
  phoneSafari: { width: 390, height: 664, deviceScaleFactor: 3, hasTouch: true, isMobile: true },
  phoneShort: { width: 375, height: 667, deviceScaleFactor: 2, hasTouch: true, isMobile: true },
  landscape: { width: 844, height: 390, deviceScaleFactor: 3, hasTouch: true, isMobile: true, isLandscape: true },
  landscapeShort: { width: 667, height: 375, deviceScaleFactor: 2, hasTouch: true, isMobile: true, isLandscape: true },
  desktop: { width: 1440, height: 900, deviceScaleFactor: 1 },
  desktopShort: { width: 1280, height: 720, deviceScaleFactor: 1 },
  desktopBig: { width: 1920, height: 1080, deviceScaleFactor: 1 },
  desktopHuge: { width: 2560, height: 1440, deviceScaleFactor: 1 },
};
// The layouts outside ALL are only for the scenarios that name them
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
// insets: { top, right, bottom, left } safe-area insets to emulate
async function openGame(browser, base, layout, lang, { tutorial = false, storage = {}, userAgent, scale, insets } = {}) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (/ResizeObserver/.test(m.text())) errors.push(m.text()); });
  await page.setBypassServiceWorker(true);
  if (insets) await (await page.createCDPSession()).send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, right: 0, bottom: 0, left: 0, ...insets } });
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

// ── Board shape ──

const shape = (g) => g.eval(() => `${window.game.grid.cols}x${window.game.grid.rows}`);
const inViewport = (g, r) => g.eval((r) => r.left >= -0.5 && r.top >= -0.5 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5, r);
// Let the resize observer refit the board
const settle = (g) => g.eval(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));

scenario('Board shape follows the device', { layouts: ['phone', 'landscape', 'desktop'] }, async (g) => {
  await g.startGame();
  const want = { phone: '9x12', landscape: '12x9', desktop: '20x15' }[g.layout];
  assert(await shape(g) === want, `board ${await shape(g)}, expected ${want}`);
});

scenario('Next game after rotating', { layouts: ['landscape'] }, async (g) => {
  await g.startGame();
  assert(await shape(g) === '12x9', `landscape board ${await shape(g)}`);
  await loseGame(g);
  await g.press('#play-again-btn');
  await g.page.setViewport({ ...LAYOUTS.landscape, width: 390, height: 844, isLandscape: false });
  await g.startGame();
  assert(await shape(g) === '9x12', `portrait board ${await shape(g)}`);
  assert(await inViewport(g, await g.rect('#game-canvas')), 'board outside the viewport');
});

// The 9x12 board: START in the top row, END in the bottom row, the road drawn
// to both edges, and the START and END labels and the widest banner inside it
scenario('Portrait road runs top to bottom', { layouts: ['phone'], langs: ['en', 'it'] }, async (g) => {
  for (const difficulty of ['easy', 'normal', 'hard']) {
    await g.startGame(difficulty);
    const r = await g.eval(async () => {
      const { t } = await import('/js/i18n.js');
      const game = window.game, grid = game.grid, rd = game.renderer, ctx = rd.ctx;
      const labels = [];
      const proto = CanvasRenderingContext2D.prototype, roundRect = proto.roundRect;
      proto.roundRect = function (x, y, w, h, rad) { labels.push({ x, y, w, h }); return roundRect.call(this, x, y, w, h, rad); };
      ctx.save(); rd._renderPortals(ctx, grid); ctx.restore();
      proto.roundRect = roundRect;
      ctx.save(); ctx.font = 'bold 28px Courier New';
      const banner = Math.max(...['banner.wave', 'banner.boss', 'banner.cleared', 'banner.perfect'].map(k => ctx.measureText(t(k).replace('{n}', 35)).width));
      ctx.restore();
      const road = rd._roadPoints(grid);
      return { entry: grid.entry, exit: grid.exit, rows: grid.rows, labels, w: rd.width, h: rd.height, first: road[0], last: road.at(-1), banner };
    });
    assert(r.entry.y === 0 && r.exit.y === r.rows - 1, `${difficulty}: START row ${r.entry.y}, END row ${r.exit.y}`);
    assert(r.first.y === 0 && r.last.y === r.h, `${difficulty}: road ends at y ${r.first.y} and ${r.last.y}`);
    assert(r.labels.length === 2, `${r.labels.length} labels drawn`);
    for (const l of r.labels) assert(l.x >= 0 && l.y >= 0 && l.x + l.w <= r.w && l.y + l.h <= r.h, `${difficulty}: label outside the board: ${JSON.stringify(l)}`);
    assert(r.banner <= r.w, `banner ${r.banner}px wide on a ${r.w}px board`);
    await g.eval(() => window.game.returnToMenu());
  }
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

scenario('Sheet over the wave controls', { layouts: ['phone', 'phoneShort'] }, async (g) => {
  await g.startGame();
  await selectPlacedTower(g);
  await expectOpaqueOver(g, '#upgrade-panel', '#start-wave-btn');
  await g.press('#upgrade-panel .up-close');
  await g.press('.tower-btn[data-tower-type="blaster"]');
  await expectOpaqueOver(g, '#tower-stats-tooltip', '#start-wave-btn');
});

scenario('Desktop panel over the wave controls', { layouts: ['desktop', 'desktopBig'] }, async (g) => {
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
  // The board grows past its logical size where there is room
  if (g.layout === 'desktop') assert(board.width > 800 && board.height >= 700, `board ${board.width}x${board.height}`);
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

scenario('Landscape build phase', { layouts: ['landscape'], langs: ['en', 'it'] }, async (g) => {
  await g.startGame();
  const board = await g.rect('#game-canvas');
  for (const sel of ['#hud', '#wave-controls', '#tower-panel']) assert(!intersects(await g.rect(sel), board), `${sel} covers the board`);
  assert(await inViewport(g, await g.rect('#start-wave-btn')), 'start button outside the viewport');
  const issues = await layoutIssues(g);
  assert(issues.length === 0, issues.join('; '));
});

scenario('Short landscape', { layouts: ['landscapeShort'], langs: ['it'] }, async (g) => {
  await g.startGame();
  const issues = await layoutIssues(g);
  assert(issues.length === 0, issues.join('; '));
  assert(await tileSize(g) >= 30, `tiles ${await tileSize(g)}px`);
});

scenario('Board position during a wave', { layouts: ['landscape', 'landscapeShort'] }, async (g) => {
  await g.startGame();
  const board = await g.rect('#game-canvas');
  const [a] = await g.buildable();
  await g.placeAt('blaster', a.x, a.y);
  await g.press('#start-wave-btn');
  assert(await g.eval(() => window.game.state) === 'PLAYING', 'start button did not start the wave');
  const after = await g.rect('#game-canvas');
  assert(JSON.stringify(after) === JSON.stringify(board), `board moved: ${JSON.stringify(board)} -> ${JSON.stringify(after)}`);
});

scenario('Landscape tray', { layouts: ['landscape', 'landscapeShort'] }, async (g) => {
  await g.startGame();
  const b = await g.eval(() => [...document.querySelectorAll('.tower-btn')].map(e => { const r = e.getBoundingClientRect(); return { left: Math.round(r.left), top: Math.round(r.top), w: r.width, h: r.height, bottom: r.bottom }; }));
  assert(new Set(b.map(x => x.left)).size === 2 && new Set(b.map(x => x.top)).size === 3, `buttons not in 2 columns of 3: ${JSON.stringify(b)}`);
  assert(b.every(x => x.w >= 44 && x.h >= 44 && x.bottom <= 375), `buttons ${b.map(x => `${x.w.toFixed(0)}x${x.h.toFixed(0)}`)}`);
});

// ── Desktop sizes ──

scenario('Full HD desktop', { layouts: ['desktopBig'] }, async (g) => {
  await g.startGame();
  const board = await g.rect('#game-canvas');
  assert(board.height >= 880, `board ${board.height}px tall`);
  assert(Math.abs(board.width / board.height / (4 / 3) - 1) < 0.01, `board ${board.width}x${board.height} lost its ratio`);
});

scenario('Laptop', { layouts: ['desktop'] }, async (g) => {
  await g.startGame();
  const board = await g.rect('#game-canvas');
  assert(board.height >= 700, `board ${board.height}px tall`);
});

scenario('Very large window', { layouts: ['desktopHuge'] }, async (g) => {
  await g.startGame();
  const board = await g.rect('#game-canvas');
  assert(Math.abs(board.width - 1600) <= 2 && Math.abs(board.height - 1200) <= 2, `board ${board.width}x${board.height}`);
});

scenario('HUD width', { layouts: ['desktopBig', 'desktop', 'desktopShort'] }, async (g) => {
  await g.startGame();
  const board = await g.rect('#game-canvas'), hud = await g.rect('#hud');
  assert(Math.abs(hud.left - board.left) <= 2 && Math.abs(hud.right - board.right) <= 2, `HUD ${hud.left}-${hud.right}, board ${board.left}-${board.right}`);
  assert(hud.bottom <= board.top + 0.5 && board.top - hud.bottom <= 2, 'HUD not directly above the board');
});

scenario('Panel text does not wrap', { layouts: ['desktop'], langs: ['en', 'it'] }, async (g) => {
  await g.startGame();
  const bad = await g.eval(() => {
    const out = [];
    for (const btn of document.querySelectorAll('.tower-btn')) {
      for (const [sel, max] of [['.tower-name', 1], ['.tower-cost', 1], ['.tower-unlock-req', 1], ['.tower-desc', 2]]) {
        const el = btn.querySelector(sel);
        if (!el || !el.checkVisibility()) continue;
        const r = el.getBoundingClientRect(), lh = parseFloat(getComputedStyle(el).fontSize) * 1.25;
        if (Math.round(r.height / lh) > max || el.scrollWidth > el.clientWidth + 1) out.push(`${btn.dataset.towerType} ${sel}: ${el.textContent.trim()}`);
      }
    }
    return out;
  });
  assert(bad.length === 0, `wraps or is cut off: ${bad.join('; ')}`);
});

scenario('Placing in Italian on a phone', { layouts: ['phone', 'phoneSafari', 'phoneShort'], langs: ['it'] }, async (g) => {
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

scenario('Tower near the top-left corner', { layouts: ['desktop', 'desktopBig'] }, async (g) => {
  await g.startGame();
  const [tile] = await placeable(g);
  await selectPlacedTower(g, tile);
  const { panel, t } = await expectBesideTower(g, tile, 'right');
  const reach = 3.5 * t.ts;
  const cx = (t.left + t.right) / 2;
  assert(panel.left >= cx + reach, 'panel covers the range circle');
});

scenario('Tower near the bottom-right corner', { layouts: ['desktop', 'desktopBig'] }, async (g) => {
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
  // The board edge away from the sheet stays in view
  const boardSeen = await g.eval((left) => {
    const c = window.game.renderer.canvas, r = c.getBoundingClientRect();
    return document.elementFromPoint(left ? r.right - 20 : r.left + 20, r.top + r.height / 2) === c;
  }, sheet.left === 0);
  assert(boardSeen, 'board hidden');
  const scrolls = await g.eval(() => getComputedStyle(document.getElementById('upgrade-panel')).overflowY);
  assert(scrolls === 'auto', 'sheet does not scroll inside');
});

// The sheet docks to the screen edge `side` and leaves the tower's tile in view
async function expectSheetAway(g, tile, side) {
  const sheet = await g.rect('#upgrade-panel');
  const t = await tileRect(g, tile.x, tile.y);
  const vw = await g.eval(() => innerWidth), vh = await g.eval(() => innerHeight);
  const docked = { bottom: Math.abs(sheet.bottom - vh) < 1, top: Math.abs(sheet.top) < 1, left: Math.abs(sheet.left) < 1, right: Math.abs(sheet.right - vw) < 1 }[side];
  assert(docked, `sheet not on the ${side} edge: ${JSON.stringify(sheet)}`);
  assert(!intersects(sheet, t), `sheet covers the tower tile: ${JSON.stringify(sheet)} over ${JSON.stringify(t)}`);
  assert(await inViewport(g, await g.rect('#upgrade-panel .up-close')), 'close control outside the viewport');
}

// Placeable tile picked by `score` (lowest first)
const placeableBy = async (g, score) => (await placeable(g)).sort((a, b) => score(a) - score(b))[0];

scenario('Upgrading on a phone', { layouts: ['phone', 'phoneShort'] }, async (g) => {
  await g.startGame();
  const tile = await placeableBy(g, t => t.y);
  await selectPlacedTower(g, tile);
  await expectSheetAway(g, tile, 'bottom');
});

scenario('Upgrading a tower near the bottom', { layouts: ['phone', 'phoneShort'] }, async (g) => {
  await g.startGame();
  const tile = await placeableBy(g, t => -t.y);
  assert(tile.y === await g.eval(() => window.game.grid.rows - 1), `lowest free tile in row ${tile.y}`);
  await selectPlacedTower(g, tile);
  await expectSheetAway(g, tile, 'top');
});

scenario('Tower on the right side', { layouts: ['landscape'] }, async (g) => {
  await g.startGame();
  const tile = await placeableBy(g, t => -t.x);
  assert(tile.x === await g.eval(() => window.game.grid.cols - 1), `rightmost free tile in column ${tile.x}`);
  await selectPlacedTower(g, tile);
  await expectSheetAway(g, tile, 'left');
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
  const board = await g.rect('#game-canvas'), controls = await g.rect('#wave-controls');
  const gap = controls.top - board.bottom;
  assert(gap >= 0 && gap <= 16, `wave controls ${gap}px below the board`);
  const tray = await g.rect('#tower-panel');
  assert(Math.abs(tray.bottom - await g.eval(() => innerHeight)) < 1, `tray ends at ${tray.bottom}`);
  assert(!(await g.visible('.tower-btn .tower-desc')), 'descriptions shown in the tray');
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

// Every control on the game screen inside the viewport, none over the board
// and no text cut off
const layoutIssues = (g) => g.eval(() => {
  const board = window.game.renderer.canvas.getBoundingClientRect();
  const hit = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
  const issues = [];
  for (const el of document.querySelectorAll('#hud, #hud *, #wave-controls, #wave-controls *, #tower-panel, #tower-panel *')) {
    if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) continue;
    const name = el.id || el.className.baseVal || el.className || el.tagName;
    if (r.left < -0.5 || r.top < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5) issues.push(`${name} outside the viewport`);
    if (['hud', 'wave-controls', 'tower-panel'].includes(el.id) && hit(r, board)) issues.push(`${name} over the board`);
    const own = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim());
    if (own && getComputedStyle(el).textOverflow !== 'ellipsis' && (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)) issues.push(`${name} text cut off`);
  }
  return issues;
});

const tileSize = (g) => g.eval(() => window.game.renderer.canvas.getBoundingClientRect().width / window.game.grid.cols);

scenario('Tall phone board', { layouts: ['phone'] }, async (g) => {
  await g.startGame();
  const board = await g.rect('#game-canvas');
  assert(board.width >= 388, `board ${board.width}px wide`);
  assert(await tileSize(g) >= 43, `tiles ${await tileSize(g)}px`);
});

scenario('Phone browser with toolbars', { layouts: ['phoneSafari'], langs: ['en', 'it'] }, async (g) => {
  await g.startGame();
  assert(await tileSize(g) >= 33, `tiles ${await tileSize(g)}px`);
  const issues = await layoutIssues(g);
  assert(issues.length === 0, issues.join('; '));
  assert(await inViewport(g, await g.rect('#game-canvas')), 'board outside the viewport');
});

scenario('Short phone board', { layouts: ['phoneShort'], langs: ['en', 'it'] }, async (g) => {
  await g.startGame();
  assert(await tileSize(g) >= 33, `tiles ${await tileSize(g)}px`);
  const issues = await layoutIssues(g);
  assert(issues.length === 0, issues.join('; '));
});

scenario('Landscape with a notch', { layouts: ['landscape', 'landscapeShort'], open: { insets: { left: 47, right: 47, bottom: 21 } } }, async (g) => {
  await g.startGame();
  const tooClose = await g.eval(() => {
    const out = [];
    for (const el of document.querySelectorAll('#game-canvas, #hud *, #wave-controls *, #tower-panel *')) {
      if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.height && (r.left < 47 - 0.5 || r.right > innerWidth - 47 + 0.5)) out.push(el.id || el.className.baseVal || el.className);
    }
    return out;
  });
  assert(tooClose.length === 0, `inside the side insets: ${tooClose.join(', ')}`);
});

scenario('Installed app in portrait', { layouts: ['phone'], open: { insets: { top: 47, bottom: 34 } } }, async (g) => {
  await g.startGame();
  const low = await g.eval(() => [...document.querySelectorAll('.tower-btn')]
    .filter(b => b.getBoundingClientRect().bottom > innerHeight - 34 + 0.5).map(b => b.dataset.towerType));
  assert(low.length === 0, `inside the bottom inset: ${low.join(', ')}`);
  assert((await g.rect('#hud')).top >= 47 - 0.5, 'HUD under the status bar');
  assert(await tileSize(g) >= 33, `tiles ${await tileSize(g)}px`);
});

scenario('Browser toolbar shown', { layouts: ['phoneSafari'] }, async (g) => {
  await g.startGame();
  const tray = await g.rect('#tower-panel');
  assert(tray.bottom <= await g.eval(() => innerHeight), `tray ends at ${tray.bottom}`);
  assert(await noPageScroll(g), 'page scrolls');
  const height = (await g.rect('#game-container')).height;
  assert(height === await g.eval(() => innerHeight), `game ${height}px tall`);
});

// Six buttons in one row, at least 44x44, the same tray in both phases
scenario('Portrait tray', { layouts: ['phone', 'phoneShort'], langs: ['en', 'it'] }, async (g) => {
  await g.startGame();
  const buttons = () => g.eval(() => [...document.querySelectorAll('.tower-btn')].map(b => {
    const r = b.getBoundingClientRect();
    return { top: r.top, width: r.width, height: r.height };
  }));
  const before = await buttons();
  assert(before.length === 6 && before.every(b => Math.abs(b.top - before[0].top) < 1), 'buttons not in one row');
  assert(before.every(b => b.width >= 44 && b.height >= 44), `buttons ${before.map(b => `${b.width.toFixed(0)}x${b.height.toFixed(0)}`)}`);
  const issues = await sizeAndContrastIssues(g);
  assert(issues.length === 0, `size or contrast: ${issues.join('; ')}`);
  const tray = await g.rect('#tower-panel');
  await startWave(g);
  assert(JSON.stringify(await g.rect('#tower-panel')) === JSON.stringify(tray), 'tray changed when the wave started');
});

scenario('Reading costs mid-wave on a phone', { layouts: ['phone'], langs: ['en', 'it'] }, async (g) => {
  await g.startGame();
  const tray = await g.rect('#tower-panel');
  await startWave(g);
  await g.setGold(15);
  assert(await g.visible('#build-note'), 'build note hidden');
  const note = await g.eval(async () => { const { t } = await import('/js/i18n.js'); return document.getElementById('build-note').textContent === t('phase.buildAfter'); });
  assert(note, 'build note text');
  assert(await g.visible('.tower-btn[data-tower-type="blaster"] .tower-cost'), 'Blaster cost hidden');
  const issues = await sizeAndContrastIssues(g);
  assert(issues.length === 0, `size or contrast: ${issues.join('; ')}`);
  assert(JSON.stringify(await g.rect('#tower-panel')) === JSON.stringify(tray), 'tray height changed mid-wave');
});

scenario('Phone tray button', { layouts: ['phone'] }, async (g) => {
  await g.startGame();
  const b = await g.eval(() => {
    const btn = document.querySelector('.tower-btn[data-tower-type="blaster"]');
    const vis = (s) => { const el = btn.querySelector(s); return !!el && el.checkVisibility({ opacityProperty: true, visibilityProperty: true }); };
    return { pic: vis('.tower-pic'), cost: btn.querySelector('.tower-cost').textContent.trim(), coin: !!btn.querySelector('.tower-cost svg'),
      name: vis('.tower-name'), label: btn.getAttribute('aria-label') };
  });
  assert(b.pic && b.coin && b.cost === '90', `button shows ${JSON.stringify(b)}`);
  assert(!b.name, 'name shown on the button');
  assert(b.label === 'Blaster', `accessible name ${b.label}`);
  await g.press('.tower-btn[data-tower-type="blaster"]');
  const title = await g.eval(() => document.querySelector('#tower-stats-tooltip.visible .ttp-title')?.textContent.trim());
  assert(title === 'Blaster', `card titled ${title}`);
});

scenario('Locked tower on a phone', { layouts: ['phone'], langs: ['en', 'it'] }, async (g) => {
  await g.startGame();
  const b = await g.eval(() => {
    const btn = document.querySelector('.tower-btn[data-tower-type="lightning"]');
    const price = btn.querySelector('.tower-short-price');
    return { lock: !!btn.querySelector('.tower-pic-wrap svg'), price: price.textContent.trim(), core: !!price.querySelector('svg'),
      shown: price.checkVisibility(), sentence: btn.querySelector('.tower-unlock-req').checkVisibility() };
  });
  assert(b.lock && b.core && b.shown && b.price === '5', `button shows ${JSON.stringify(b)}`);
  assert(!b.sentence, 'unlock sentence on the button');
  await g.press('.tower-btn[data-tower-type="lightning"]');
  const ok = await g.eval(async () => {
    const { t, cores } = await import('/js/i18n.js');
    return document.querySelector('#tower-stats-tooltip.visible .ttp-locked-hint')?.textContent.trim() === t('unlock.price').replace('{n}', cores(5));
  });
  assert(ok, 'card does not show the unlock sentence');
});

scenario('Not enough gold on a phone', { layouts: ['phone'], langs: ['en', 'it'] }, async (g) => {
  await g.startGame();
  await g.setGold(40);
  const b = await g.eval(() => {
    const btn = document.querySelector('.tower-btn[data-tower-type="blaster"]');
    return { opacity: getComputedStyle(btn.querySelector('.tower-pic')).opacity, color: getComputedStyle(btn.querySelector('.tower-cost')).color };
  });
  assert(+b.opacity < 1, `picture opacity ${b.opacity}`);
  assert(b.color === 'rgb(255, 136, 102)', `price colour ${b.color}`);
  await g.press('.tower-btn[data-tower-type="blaster"]');
  const card = await g.eval(async () => {
    const { t } = await import('/js/i18n.js');
    const c = document.querySelector('#tower-stats-tooltip.visible');
    return { need: c.querySelector('.ttp-need')?.textContent.trim() === t('panel.need').replace('{n}', 50), disabled: c.querySelector('.ttp-place-btn').disabled };
  });
  assert(card.need, 'card does not say what is missing');
  assert(card.disabled, 'PLACE enabled');
});

// ── Rendering ──

async function expectBacking(g, width, backing) {
  const c = await g.eval(() => {
    const c = window.game.renderer.canvas, r = c.getBoundingClientRect();
    return { backing: c.width, shown: r.width, ratio: r.width / r.height };
  });
  const logical = await g.eval(() => [window.game.renderer.width, window.game.renderer.height]);
  assert(Math.abs(c.shown - width) < 0.5, `board drawn ${c.shown}px wide, expected ${width}`);
  assert(c.backing === backing, `backing store ${c.backing}px wide, expected ${backing}`);
  assert(Math.abs(c.ratio - logical[0] / logical[1]) < 0.01, 'board stretched');
}

// Narrow the board slot so the board is shown `width` px wide
async function showBoardAt(g, width) {
  await g.eval((w) => { document.getElementById('board-slot').style.maxWidth = w + 'px'; }, width);
  await settle(g);
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
  await expectBacking(g, 390, 780); // the density is capped at 2
  await expectTapPlaces(g);
});

scenario('Desktop at 2x', { layouts: ['desktopBig'], open: { scale: 2 } }, async (g) => {
  await g.startGame();
  await showBoardAt(g, 1000);
  await expectBacking(g, 1000, 2000);
  await expectTapPlaces(g);
});

scenario('Enlarged board at 1x', { layouts: ['desktopHuge'] }, async (g) => {
  await g.startGame();
  await showBoardAt(g, 1200);
  await expectBacking(g, 1200, 1200);
});

scenario('Backing store cap', { layouts: ['desktopHuge'], open: { scale: 2 } }, async (g) => {
  await g.startGame();
  await expectBacking(g, 1600, 2400); // 3x the 800px logical width
});

scenario('Resizing a desktop window', { layouts: ['desktopBig'] }, async (g) => {
  await g.startGame();
  await g.page.setViewport(LAYOUTS.desktopShort);
  await settle(g);
  const board = await g.rect('#game-canvas');
  assert(await inViewport(g, board), `board outside the window: ${JSON.stringify(board)}`);
  assert((await g.rect('#hud')).bottom <= board.top && (await g.rect('#wave-controls')).top >= board.bottom, 'controls cover the board');
  assert(await inViewport(g, await g.rect('#start-wave-btn')), 'start button outside the window');
  await expectTapPlaces(g);
});

scenario('Rotating mid-game', { layouts: ['phone'] }, async (g) => {
  await g.startGame();
  await startWave(g);
  await g.page.setViewport(LAYOUTS.landscape);
  await settle(g);
  await sleep(300);
  assert(await g.eval(() => window.game.state) === 'PLAYING', 'wave stopped');
  assert(await shape(g) === '9x12', `board ${await shape(g)}`);
  const board = await g.rect('#game-canvas');
  assert(await inViewport(g, board), `board outside the viewport: ${JSON.stringify(board)}`);
  for (const sel of ['#hud', '#wave-controls', '#tower-panel', '#cancel-place-btn']) {
    const r = await g.rect(sel);
    assert(!r || r.width === 0 || !intersects(r, board), `${sel} overlaps the board`);
  }
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

// What each step points at, for the caption check: a selector, 'board' or 'tower'
const STEP_TARGETS = [null, '.tower-btn[data-tower-type="blaster"]', '#tower-stats-tooltip.visible .ttp-place-btn', 'board',
  '#start-wave-btn', 'tower', '#hud-lives', '#hud-gold', 'tower', null];

// The caption covers no road tile (START and END included) and not the step target
const captionIssue = (g, step) => g.eval((target) => {
  const cap = document.getElementById('tutorial-overlay').getBoundingClientRect();
  const board = window.game.renderer.canvas.getBoundingClientRect();
  const ts = board.width / window.game.grid.cols;
  const tile = (p) => ({ left: board.left + p.x * ts, top: board.top + p.y * ts, right: board.left + (p.x + 1) * ts, bottom: board.top + (p.y + 1) * ts });
  const hit = (a, b) => a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5;
  const road = window.game.grid.path.find(p => hit(cap, tile(p)));
  if (road) return `covers road tile ${road.x},${road.y}`;
  const t = target === 'board' ? board : target === 'tower' ? tile({ x: window.game.towers[0].gx, y: window.game.towers[0].gy })
    : target && document.querySelector(target)?.getBoundingClientRect();
  return t && hit(cap, t) ? `covers the target ${target}` : null;
}, STEP_TARGETS[step]);

// Plays every step like a newcomer on a phone. On action steps the caption is
// shown and the pointer lands in the hole left for the target, not on a blocker.
scenario('Complete tutorial', { layouts: ['phone', 'phoneSafari', 'phoneShort', 'landscape'], langs: ['en', 'it'], open: { tutorial: true } }, async (g) => {
  // Info step: tap a point of a blocker that nothing covers
  const info = async () => {
    const p = await g.eval(() => {
      for (const b of document.querySelectorAll('.tutorial-blocker:not(.hidden)')) {
        const r = b.getBoundingClientRect();
        for (let fy = 0.1; fy < 1; fy += 0.2) for (let fx = 0.1; fx < 1; fx += 0.2) {
          const x = r.left + r.width * fx, y = r.top + r.height * fy;
          if (r.width > 0 && r.height > 0 && document.elementFromPoint(x, y) === b) return { x, y };
        }
      }
      return null;
    });
    assert(p, 'no blocker to tap');
    if (g.touch) await g.page.touchscreen.tap(p.x, p.y); else await g.page.mouse.click(p.x, p.y);
    await sleep(80);
  };
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
    const issue = await captionIssue(g, step);
    assert(!issue, `step ${step}: caption ${issue}`);
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

// The wallet row: balance over the next price with a small label, nothing else
const tracker = (g) => g.eval(() => ({
  balance: document.getElementById('cores-value')?.textContent,
  price: document.querySelector('#unlock-tracker .hud-total')?.textContent,
  label: document.querySelector('#unlock-tracker .hud-label')?.textContent,
  extras: document.querySelectorAll('#unlock-tracker img, #unlock-tracker .unlock-bar-bg').length,
}));

scenario('Wallet toward Cannon', { layouts: ['phone', 'desktop'], open: { storage: { neon_td_cores: '15', neon_td_unlocked: '["frost","lightning","support","sniper"]' } } }, async (g) => {
  await g.startGame();
  const tr = await tracker(g);
  assert(tr.balance === '15' && tr.price === '/ 20' && tr.label === 'Cores' && tr.extras === 0, `wallet row: ${JSON.stringify(tr)}`);
});

scenario('Wallet price follows the next unlock', { layouts: ['phone', 'desktop'], open: { storage: { neon_td_cores: '20', neon_td_unlocked: '["frost","lightning"]' } } }, async (g) => {
  await g.startGame();
  const before = await tracker(g);
  assert(before.balance === '20' && before.price === '/ 15', `before: ${JSON.stringify(before)}`);
  await g.eval(() => window.game.ui._unlockTower(window.game.progressTracker.getNextUnlock().type));
  const after = await tracker(g);
  assert(after.balance === '5' && after.price === '/ 20', `after: ${JSON.stringify(after)}`);
});

scenario('Wallet with everything unlocked', { layouts: ['desktop'], open: { storage: { neon_td_cores: '40', neon_td_unlocked: ALL_UNLOCKED } } }, async (g) => {
  await g.startGame();
  const tr = await tracker(g);
  assert(tr.balance === '40' && tr.price === undefined, `wallet row: ${JSON.stringify(tr)}`);
});

scenario('Wallet on a phone', { layouts: ['phone'], langs: ['en', 'it'] }, async (g) => {
  await g.startGame();
  const size = await g.eval(() => Math.min(...[...document.querySelectorAll('#unlock-tracker .hud-total, #unlock-tracker .hud-label')].map(e => parseFloat(getComputedStyle(e).fontSize))));
  assert(size >= 12, `smallest text is ${size}px`);
  const wallet = await g.rect('#unlock-tracker .unlock-cores');
  const controls = await g.rect('#speed-controls');
  assert(wallet.width > 0 && !intersects(wallet, controls), 'wallet overlaps the controls');
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
