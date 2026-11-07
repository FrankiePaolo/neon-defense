import { t } from './i18n.js';
import { CONFIG, IS_MOBILE, TOWER_DEFS } from './config.js';

// Each step points at one thing. Action steps leave only their target
// tappable and finish when `done` is true; info steps (`info: true`)
// continue on a tap anywhere. `allow` lists the game actions a step permits.
//   target: () => DOM element, { tile: {x, y} } or 'board'
//   pointer: 'road' traces the road, 'ghost' points at the suggested tile
const STEPS = [
  { caption: 'tut.road', info: true, pointer: 'road' },
  {
    caption: 'tut.pick',
    target: () => towerButton('blaster'),
    allow: ['pickTower'],
    done: (g) => g.input.placingType === 'blaster' || g.ui._previewingType === 'blaster',
  },
  {
    // Touch only: the first tap opens the tower card, PLACE confirms
    caption: 'tut.confirm',
    skipIf: (g) => g.input.placingType === 'blaster',
    target: () => visible(document.querySelector('#tower-stats-tooltip.visible .ttp-place-btn')) || towerButton('blaster'),
    allow: ['pickTower'],
    done: (g) => g.input.placingType === 'blaster',
  },
  {
    caption: 'tut.place',
    target: () => 'board',
    pointer: 'ghost',
    allow: ['place'],
    done: (g) => g.towers.length > 0,
  },
  {
    caption: 'tut.start',
    target: () => document.getElementById('start-wave-btn'),
    allow: ['startWave'],
    done: (g) => g.state === 'PLAYING',
  },
  { caption: 'tut.shoot', info: true, target: (g) => towerTile(g) },
  { caption: 'tut.lives', info: true, target: () => document.getElementById('hud-lives') },
  { caption: 'tut.gold', info: true, target: () => document.getElementById('hud-gold') },
  {
    caption: 'tut.upgrade',
    waitForState: 'BETWEEN_WAVES',
    target: (g) => towerTile(g),
    done: (g) => !!g.input.selectedTower,
  },
  {
    caption: 'tut.done',
    info: true,
    hole: () => visible(document.getElementById('upgrade-panel')),
  },
];

const STORAGE_KEY = 'neonDefenseTutorialDone';

function towerButton(type) {
  return document.querySelector(`.tower-btn[data-tower-type="${type}"]`);
}

function towerTile(game) {
  const tower = game.towers[0];
  return tower ? { tile: { x: tower.gx, y: tower.gy } } : null;
}

function visible(el) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 ? el : null;
}

// Caption text with a touch or desktop variant when one exists
function caption(key) {
  const variant = key + (IS_MOBILE ? '.touch' : '.desktop');
  const text = t(variant);
  return text === variant ? t(key) : text;
}

export class Tutorial {
  constructor(game) {
    this.game = game;
    this.step = -1;
    this.active = false;
    this.ghost = null;
    this.overlay = document.getElementById('tutorial-overlay');
    this.pointer = document.getElementById('tutorial-pointer');
    this.blockers = [...document.querySelectorAll('.tutorial-blocker')];
    this.blockers.forEach(b => b.addEventListener('click', () => this._onBlockerTap()));
  }

  shouldRun() {
    return !localStorage.getItem(STORAGE_KEY);
  }

  start() {
    this._hideAll();
    if (!this.shouldRun()) { this.active = false; return; }
    this.step = -1;
    this.active = true;
    this._advance();
  }

  // Whether the current step lets the player do this game action
  allows(action) {
    if (!this.active) return true;
    const s = STEPS[this.step];
    if (!s || this._waiting(s)) return true;
    return !!(s.allow && s.allow.includes(action));
  }

  // Called every frame by the game loop
  check() {
    if (!this.active) return;
    const s = STEPS[this.step];
    if (!s) return;

    const hidden = this.game.state === 'PAUSED' || this.game.state === 'GAME_OVER' ||
      document.getElementById('menu-screen').style.display !== 'none';
    if (hidden || this._waiting(s)) {
      this._hideAll();
      return;
    }

    if (!s.info && s.done && s.done(this.game)) {
      this._advance();
      return;
    }
    if (this.overlay.classList.contains('hidden')) this._render(s);
    this._layout(s);
  }

  replay() {
    localStorage.removeItem(STORAGE_KEY);
  }

  _waiting(s) {
    return s.waitForState && this.game.state !== s.waitForState;
  }

  _advance() {
    this.ghost = null;
    this._hideAll();
    do { this.step++; } while (STEPS[this.step] && STEPS[this.step].skipIf && STEPS[this.step].skipIf(this.game));
    const s = STEPS[this.step];
    if (!s) { this._complete(); return; }
    if (s.pointer === 'ghost') this.ghost = this.suggestTile('blaster');
    if (!this._waiting(s)) this._render(s);
    this.game.ui.updateHUD(); // start button state depends on the step
  }

  _onBlockerTap() {
    const s = STEPS[this.step];
    if (s && s.info) this._advance();
  }

  _render(s) {
    let html = `<div class="tutorial-msg">${caption(s.caption)}</div>`;
    html += `<div class="tutorial-actions">`;
    if (s.info) html += `<span class="tutorial-continue">${caption('tut.continue')}</span>`;
    html += `<button class="tutorial-skip">${t('tut.skip')}</button></div>`;
    this.overlay.innerHTML = html;
    this.overlay.classList.remove('hidden');
    this.overlay.querySelector('.tutorial-skip').addEventListener('click', () => this._complete());
    document.getElementById('game-container').classList.add('tutorial-on');
    this._layout(s);
  }

  // Position caption, pointer and blockers for the current layout
  _layout(s) {
    const targetRect = this._targetRect(s);
    const holeEl = s.hole ? s.hole() : null;
    const hole = s.info ? (holeEl ? holeEl.getBoundingClientRect() : null) : targetRect;
    this._setHole(hole);
    this._placeCaption(hole || targetRect);

    let point = null;
    if (s.pointer === 'road') point = this._roadPoint();
    else if (s.pointer === 'ghost' && this.ghost) point = this._tileRect(this.ghost);
    else point = targetRect;
    this._placePointer(point);
  }

  _targetRect(s) {
    const target = s.target ? s.target(this.game) : null;
    if (!target) return null;
    if (target === 'board') return this.game.renderer.canvas.getBoundingClientRect();
    if (target.tile) return this._tileRect(target.tile);
    return target.getBoundingClientRect();
  }

  // Canvas tile -> page rect
  _tileRect(tile) {
    const canvas = this.game.renderer.canvas;
    const r = canvas.getBoundingClientRect();
    const k = r.width / CONFIG.CANVAS_WIDTH;
    const ts = CONFIG.TILE_SIZE * k;
    return { left: r.left + tile.x * ts, top: r.top + tile.y * ts, width: ts, height: ts,
      right: r.left + (tile.x + 1) * ts, bottom: r.top + (tile.y + 1) * ts };
  }

  // A point that travels along the road from START to END
  _roadPoint() {
    const canvas = this.game.renderer.canvas;
    const pts = this.game.renderer._roadPoints(this.game.grid);
    if (pts.length < 2) return null;
    const lens = [];
    let total = 0;
    for (let i = 1; i < pts.length; i++) {
      const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      lens.push(len);
      total += len;
    }
    let d = ((Date.now() / 1000) % 4) / 4 * total;
    let i = 0;
    while (i < lens.length - 1 && d > lens[i]) { d -= lens[i]; i++; }
    const f = d / lens[i];
    const x = pts[i].x + (pts[i + 1].x - pts[i].x) * f;
    const y = pts[i].y + (pts[i + 1].y - pts[i].y) * f;
    const r = canvas.getBoundingClientRect();
    const k = r.width / CONFIG.CANVAS_WIDTH;
    return { left: r.left + x * k, top: r.top + y * k, width: 0, height: 0 };
  }

  _placePointer(rect) {
    if (!rect) { this.pointer.classList.add('hidden'); return; }
    this.pointer.style.left = (rect.left + rect.width / 2) + 'px';
    this.pointer.style.top = (rect.top + rect.height / 2) + 'px';
    this.pointer.classList.remove('hidden');
  }

  // Dock the caption where it covers neither the board nor the step target:
  // above the wave controls, else above the board, else over the top bar,
  // else over the tower panel.
  _placeCaption(avoid) {
    const wrapper = document.getElementById('canvas-wrapper').getBoundingClientRect();
    const board = this.game.renderer.canvas.getBoundingClientRect();
    const controls = document.getElementById('wave-controls').getBoundingClientRect();
    const speed = document.getElementById('speed-controls').getBoundingClientRect();
    const h = this.overlay.offsetHeight;
    const gap = 6;
    const clearOf = (rects) => (top) => rects.every(r => !r || top + h <= r.top || top >= r.bottom);
    const clear = clearOf([board, avoid]);

    const panel = document.getElementById('tower-panel').getBoundingClientRect();
    const candidates = [controls.top - gap - h, board.top - gap - h, wrapper.top + 2, panel.top + gap];
    // Last resort before the default: inside the bottom of a target taller than
    // the caption (the upgrade sheet on a phone), so the board stays clear
    const inside = avoid ? avoid.bottom - gap - h : -1;
    const top = candidates.find(c => c >= wrapper.top && c >= speed.bottom - 1 && clear(c))
      ?? candidates.find(c => c >= wrapper.top && clear(c))
      ?? (avoid && inside >= avoid.top && clearOf([board])(inside) ? inside : null)
      ?? candidates[0];
    this.overlay.style.top = (top - wrapper.top) + 'px';
  }

  // Four transparent blockers around the hole; no hole blocks everything
  _setHole(rect) {
    const [top, bottom, left, right] = this.blockers;
    const vw = window.innerWidth, vh = window.innerHeight;
    const set = (el, x, y, w, h) => {
      el.style.cssText = `left:${x}px;top:${y}px;width:${Math.max(0, w)}px;height:${Math.max(0, h)}px`;
      el.classList.remove('hidden');
    };
    if (!rect) {
      set(top, 0, 0, vw, vh);
      [bottom, left, right].forEach(b => b.classList.add('hidden'));
      return;
    }
    const pad = 4;
    const l = rect.left - pad, tp = rect.top - pad, r = rect.left + rect.width + pad, b = rect.top + rect.height + pad;
    set(top, 0, 0, vw, tp);
    set(bottom, 0, b, vw, vh - b);
    set(left, 0, tp, l, b - tp);
    set(right, r, tp, vw - r, b - tp);
  }

  // Buildable tile whose range covers the most road; ties go to the one
  // nearest START, where the first enemies arrive
  suggestTile(type) {
    const grid = this.game.grid;
    const range = TOWER_DEFS[type].range;
    const start = grid.entry;
    let best = null;
    for (const tile of this.game.renderer.buildableTiles(grid)) {
      const covered = grid.path.filter(p => (p.x - tile.x) ** 2 + (p.y - tile.y) ** 2 <= range * range).length;
      const dist = Math.abs(tile.x - start.x) + Math.abs(tile.y - start.y);
      if (!best || covered > best.covered || (covered === best.covered && dist < best.dist)) {
        best = { x: tile.x, y: tile.y, covered, dist };
      }
    }
    return best && { x: best.x, y: best.y, type };
  }

  _hideAll() {
    this.overlay.classList.add('hidden');
    this.pointer.classList.add('hidden');
    this.blockers.forEach(b => b.classList.add('hidden'));
    document.getElementById('game-container').classList.remove('tutorial-on');
  }

  _complete() {
    this._hideAll();
    this.ghost = null;
    this.active = false;
    localStorage.setItem(STORAGE_KEY, 'true');
    this.game.ui.updateHUD();
  }
}
