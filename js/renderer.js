import { CONFIG, COLORS, TOWER_DEFS, SHADOW_BLUR_SCALE } from './config.js';
import { gridToPixel } from './utils.js';
import { t } from './i18n.js';
import { Tower } from './tower.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = CONFIG.CANVAS_WIDTH;
    this.height = CONFIG.CANVAS_HEIGHT;
    // Draw at the screen's pixel density so the board stays sharp when scaled
    // up; capped at 2 to bound fill cost on 3x phones. Drawing code keeps
    // using logical pixels through the context transform.
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = this.width * this.dpr;
    canvas.height = this.height * this.dpr;
    // Never shown larger than the logical size (plus its 1px border); the
    // max sizes keep the ratio
    canvas.style.maxWidth = `min(100%, ${this.width + 2}px)`;
    canvas.style.maxHeight = `min(100%, ${this.height + 2}px)`;

    this.staticCanvas = document.createElement('canvas');
    this.staticCanvas.width = canvas.width;
    this.staticCanvas.height = canvas.height;
    this.staticCtx = this.staticCanvas.getContext('2d');
    this.staticCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.staticDirty = true;
  }

  renderStatic(grid) {
    const ctx = this.staticCtx;
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, this.width, this.height);

    const ts = CONFIG.TILE_SIZE;

    ctx.strokeStyle = COLORS.GRID_LINE;
    ctx.lineWidth = 0.8;
    for (let x = 0; x <= grid.cols; x++) {
      ctx.beginPath(); ctx.moveTo(x * ts, 0); ctx.lineTo(x * ts, this.height); ctx.stroke();
    }
    for (let y = 0; y <= grid.rows; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * ts); ctx.lineTo(this.width, y * ts); ctx.stroke();
    }

    // ── Road: one continuous stroked strip from START to END ──
    const road = this._roadPoints(grid);
    if (road.length >= 2) {
      const traceRoad = () => {
        ctx.beginPath();
        ctx.moveTo(road[0].x, road[0].y);
        for (let i = 1; i < road.length; i++) ctx.lineTo(road[i].x, road[i].y);
      };
      ctx.save();
      ctx.lineJoin = 'round';
      ctx.lineCap = 'butt';

      // Outer glow
      ctx.shadowBlur = 12 * SHADOW_BLUR_SCALE;
      ctx.shadowColor = '#1a6fff';
      ctx.strokeStyle = 'rgba(30, 80, 170, 0.35)';
      ctx.lineWidth = ts * 0.86;
      traceRoad(); ctx.stroke();

      // Border
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#2a64c8';
      ctx.lineWidth = ts * 0.76;
      traceRoad(); ctx.stroke();

      // Fill
      ctx.strokeStyle = '#16213e';
      ctx.lineWidth = ts * 0.68;
      traceRoad(); ctx.stroke();
      ctx.restore();
    }

    this.staticDirty = false;
  }

  // Tile centres of the path, extended to the left and right board edges
  // (START is always in the first column, END in the last).
  _roadPoints(grid) {
    const path = grid.path;
    if (!path || path.length < 2) return [];
    const pts = path.map(p => gridToPixel(p.x, p.y));
    const half = CONFIG.TILE_SIZE / 2;
    const first = pts[0], last = pts[pts.length - 1];
    return [{ x: first.x - half, y: first.y }, ...pts, { x: last.x + half, y: last.y }];
  }

  // Chevrons that flow along the road toward END
  _renderRoadArrows(ctx, grid) {
    if (this._arrowPath !== grid.path) {
      this._arrowPath = grid.path;
      const pts = this._roadPoints(grid);
      const segs = [];
      let total = 0;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1], b = pts[i];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        segs.push({ a, b, start: total, len });
        total += len;
      }
      this._arrowSegs = segs;
      this._arrowTotal = total;
    }
    const segs = this._arrowSegs;
    if (!segs || segs.length === 0) return;

    const ts = CONFIG.TILE_SIZE;
    const spacing = ts;
    const size = ts * 0.13;
    const offset = (Date.now() / 1000 * ts * 0.8) % spacing;

    ctx.save();
    ctx.strokeStyle = '#5a9cff';
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let si = 0;
    for (let d = offset + ts * 0.5; d < this._arrowTotal - ts * 0.5; d += spacing) {
      while (si < segs.length - 1 && d > segs[si].start + segs[si].len) si++;
      const sg = segs[si];
      const f = (d - sg.start) / sg.len;
      const ux = (sg.b.x - sg.a.x) / sg.len, uy = (sg.b.y - sg.a.y) / sg.len;
      const x = sg.a.x + (sg.b.x - sg.a.x) * f;
      const y = sg.a.y + (sg.b.y - sg.a.y) * f;
      ctx.moveTo(x - ux * size - uy * size, y - uy * size + ux * size);
      ctx.lineTo(x + ux * size, y + uy * size);
      ctx.lineTo(x - ux * size + uy * size, y - uy * size - ux * size);
    }
    ctx.stroke();
    ctx.restore();
  }

  renderFrame(game) {
    const ctx = this.ctx;

    // Screen shake offset
    let shakeX = 0, shakeY = 0;
    if (game.shakeTimer > 0) {
      const intensity = game.shakeIntensity * (game.shakeTimer / 0.4);
      shakeX = (Math.random() - 0.5) * 2 * intensity;
      shakeY = (Math.random() - 0.5) * 2 * intensity;
    }

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.save();
    ctx.translate(shakeX, shakeY);

    if (this.staticDirty) this.renderStatic(game.grid);
    ctx.drawImage(this.staticCanvas, 0, 0, this.width, this.height);

    this._renderRoadArrows(ctx, game.grid);
    this._baseFlash = game.baseFlash || 0;
    this._renderPortals(ctx, game.grid);

    if (game.input && (game.input.placingType || game.input.movingTower)) {
      this._renderBuildableTiles(ctx, game);
    }

    // The carried tower replaces the tutorial ghost once placing starts
    if (game.tutorial && game.tutorial.ghost && !(game.input && game.input.placingType && game.input.hoveredCell)) {
      this._renderGhost(ctx, game.tutorial.ghost);
    }

    const moving = game.input && game.input.movingTower;
    for (const tower of game.towers) {
      if (tower === moving) { this._tileCorners(ctx, tower.gx, tower.gy, tower.def.color, 0.35); continue; }
      const isSelected = game.input && game.input.selectedTower === tower;
      const isHovered = game.input && game.input.hoveredCell &&
        tower.gx === game.input.hoveredCell.x && tower.gy === game.input.hoveredCell.y;
      tower.render(ctx, isSelected, isHovered);
    }
    if (game.input) this._renderCarry(ctx, game);

    for (const enemy of game.enemies) {
      enemy.render(ctx, game.towers);
    }

    for (const proj of game.projectiles) {
      proj.render(ctx);
    }

    game.particles.render(ctx);
    this._renderLightningChains(ctx, game);
    this._renderFloatingTexts(ctx, game);
    this._renderKillStreak(ctx, game);

    ctx.restore(); // end shake transform

    this._renderWaveBanner(ctx, game);
  }

  _renderPortals(ctx, grid) {
    const time = Date.now() / 1000;
    if (grid.entry && grid.path && grid.path.length >= 2) {
      const p = gridToPixel(grid.entry.x, grid.entry.y);
      const next = gridToPixel(grid.path[1].x, grid.path[1].y);
      const angle = Math.atan2(next.y - p.y, next.x - p.x);
      this._renderEntryArrow(ctx, p.x, p.y, angle, COLORS.ENTRY, time);
      this._renderEndpointLabel(ctx, p.x, p.y, COLORS.ENTRY, t('map.start'));
    }
    if (grid.exit) {
      const p = gridToPixel(grid.exit.x, grid.exit.y);
      this._renderBase(ctx, p.x, p.y, COLORS.EXIT, time);
      this._renderEndpointLabel(ctx, p.x, p.y, COLORS.EXIT, t('map.end'));
    }
  }

  // Player base: a hexagon with a heart, the lives the player must protect.
  // Flashes while game.baseFlash > 0 (0..1, set when an enemy gets through).
  _renderBase(ctx, x, y, color, t) {
    const ts = CONFIG.TILE_SIZE;
    const flash = this._baseFlash || 0;
    const pulse = 0.75 + 0.25 * Math.sin(t * 3);
    const r = ts * 0.44 * (1 + flash * 0.25);

    ctx.save();
    ctx.fillStyle = '#1a0a0e';
    ctx.strokeStyle = flash > 0 ? '#ffffff' : color;
    ctx.lineWidth = 2.5;
    ctx.shadowBlur = (12 + flash * 25) * SHADOW_BLUR_SCALE;
    ctx.shadowColor = color;
    ctx.globalAlpha = Math.min(1, pulse + flash);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i - Math.PI / 2;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Heart
    const h = r * 0.45;
    ctx.fillStyle = flash > 0 ? '#ffffff' : color;
    ctx.beginPath();
    ctx.moveTo(x, y + h * 0.9);
    ctx.bezierCurveTo(x - h * 1.4, y - h * 0.1, x - h * 0.6, y - h * 1.1, x, y - h * 0.4);
    ctx.bezierCurveTo(x + h * 0.6, y - h * 1.1, x + h * 1.4, y - h * 0.1, x, y + h * 0.9);
    ctx.fill();
    ctx.restore();
  }

  _renderEntryArrow(ctx, x, y, angle, color, t) {
    const size = 14 + 2 * Math.sin(t * 3);
    const pulse = 0.7 + 0.3 * Math.sin(t * 3);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.shadowBlur = 14 * SHADOW_BLUR_SCALE;
    ctx.shadowColor = color;
    ctx.fillStyle = color;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.6, -size * 0.8);
    ctx.lineTo(-size * 0.15, 0);
    ctx.lineTo(-size * 0.6, size * 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _renderEndpointLabel(ctx, x, y, color, text) {
    const ts = CONFIG.TILE_SIZE;
    ctx.save();
    ctx.font = `bold ${Math.round(ts * 0.32)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(text).width + 8;
    const h = ts * 0.42;
    const cx = Math.max(w / 2 + 1, Math.min(this.width - w / 2 - 1, x));
    // Below the tile, or above it on the bottom row
    let cy = y + ts * 0.5 + h / 2 + 1;
    if (cy + h / 2 > this.height) cy = y - ts * 0.5 - h / 2 - 1;

    ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(text, cx, cy + 1);
    ctx.restore();
  }

  // Empty tiles from which a tower of this range reaches the road
  buildableTiles(grid, range) {
    const key = `${range}|${[...grid.towers.keys()].join(";")}`;
    if (this._buildable && this._buildable.path === grid.path && this._buildable.key === key) {
      return this._buildable.tiles;
    }
    const tiles = [];
    const r2 = range * range;
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        if (!grid.isPlaceable(x, y)) continue;
        if (grid.path.some(p => (p.x - x) ** 2 + (p.y - y) ** 2 <= r2)) tiles.push({ x, y });
      }
    }
    this._buildable = { path: grid.path, key, tiles };
    return tiles;
  }

  _renderBuildableTiles(ctx, game) {
    const input = game.input;
    const color = input.movingTower ? input.movingTower.def.color : TOWER_DEFS[input.placingType].color;
    const range = input.movingTower ? input.movingTower.currentStats.range : TOWER_DEFS[input.placingType].range;
    const ts = CONFIG.TILE_SIZE;
    const pulse = 0.14 + 0.05 * Math.sin(Date.now() / 300);
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    for (const tile of this.buildableTiles(game.grid, range)) {
      ctx.globalAlpha = pulse;
      ctx.fillRect(tile.x * ts + 3, tile.y * ts + 3, ts - 6, ts - 6);
      ctx.globalAlpha = 0.35;
      ctx.strokeRect(tile.x * ts + 3.5, tile.y * ts + 3.5, ts - 7, ts - 7);
    }
    ctx.restore();
  }

  // Tutorial suggestion: a see-through tower with its range
  _renderGhost(ctx, ghost) {
    if (!this._ghostTower || this._ghostTower.type !== ghost.type) this._ghostTower = new Tower(ghost.type, 0, 0);
    const tower = this._ghostTower;
    const c = gridToPixel(ghost.x, ghost.y);
    tower.x = c.x;
    tower.y = c.y;
    ctx.save();
    ctx.globalAlpha = 0.45 + 0.15 * Math.sin(Date.now() / 250);
    ctx.strokeStyle = tower.def.color;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.arc(c.x, c.y, tower.def.range * CONFIG.TILE_SIZE, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    tower.render(ctx, false, false);
    ctx.restore();
  }

  // The tower being placed or moved floats over the tile it would land on.
  // It glides between tiles and shows its range and a landing frame;
  // everything turns red where it can't go.
  _renderCarry(ctx, game) {
    const input = game.input;
    const cell = input.hoveredCell;
    const moving = input.movingTower;
    if (!cell || !(moving || input.placingType)) { this._carry = null; return; }

    let tower = moving;
    if (!tower) {
      if (!this._carryTower || this._carryTower.type !== input.placingType) {
        this._carryTower = new Tower(input.placingType, 0, 0);
      }
      tower = this._carryTower;
    }
    const home = moving && cell.x === moving.gx && cell.y === moving.gy;
    const valid = home || (game.grid.isPlaceable(cell.x, cell.y) &&
      (moving || game.economy.canAfford(tower.def.cost)));
    const color = valid ? tower.def.color : '#ff3355';
    const ts = CONFIG.TILE_SIZE;
    const target = gridToPixel(cell.x, cell.y);

    if (!this._carry || this._carry.tower !== tower) this._carry = { tower, x: target.x, y: target.y };
    const pos = this._carry;
    pos.x += (target.x - pos.x) * 0.35;
    pos.y += (target.y - pos.y) * 0.35;

    const time = Date.now() / 1000;
    const bob = Math.sin(time * 5);
    const lift = ts * (0.2 + 0.05 * bob);
    const range = (moving ? moving.currentStats.range : tower.def.range) * ts;

    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.07;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, range, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.45;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.lineDashOffset = -time * 12;
    ctx.stroke();
    ctx.restore();

    if (!home) {
      // The tile itself lights up at once; the tower glides after it
      ctx.save();
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.45 + 0.1 * bob;
      ctx.beginPath();
      ctx.roundRect(cell.x * ts + 3, cell.y * ts + 3, ts - 6, ts - 6, 4);
      ctx.fill();
      ctx.restore();
      this._tileCorners(ctx, cell.x, cell.y, '#ffffff', 0.9);
    }

    // Soft glow on the ground, fainter while the tower is higher
    ctx.save();
    ctx.translate(pos.x, pos.y + ts * 0.3);
    ctx.scale(1, 0.35);
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, ts * 0.42);
    glow.addColorStop(0, color);
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.globalAlpha = 0.5 - 0.15 * bob;
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, ts * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const { x, y } = tower;
    tower.x = pos.x;
    tower.y = pos.y - lift;
    tower.render(ctx, false, false);
    tower.x = x;
    tower.y = y;
  }

  // Neon corner brackets around a tile
  _tileCorners(ctx, gx, gy, color, alpha) {
    const ts = CONFIG.TILE_SIZE;
    const x0 = gx * ts + 3, y0 = gy * ts + 3, x1 = x0 + ts - 6, y1 = y0 + ts - 6, l = ts * 0.25;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 8 * SHADOW_BLUR_SCALE;
    ctx.beginPath();
    ctx.moveTo(x0, y0 + l); ctx.lineTo(x0, y0); ctx.lineTo(x0 + l, y0);
    ctx.moveTo(x1 - l, y0); ctx.lineTo(x1, y0); ctx.lineTo(x1, y0 + l);
    ctx.moveTo(x1, y1 - l); ctx.lineTo(x1, y1); ctx.lineTo(x1 - l, y1);
    ctx.moveTo(x0 + l, y1); ctx.lineTo(x0, y1); ctx.lineTo(x0, y1 - l);
    ctx.stroke();
    ctx.restore();
  }

  _renderLightningChains(ctx, game) {
    if (!game._lightningChains || game._lightningChains.length === 0) return;
    const now = Date.now();
    for (let i = game._lightningChains.length - 1; i >= 0; i--) {
      const chain = game._lightningChains[i];
      const age = now - chain.time;
      if (age > 150) { game._lightningChains.splice(i, 1); continue; }
      const alpha = 1 - age / 150;
      ctx.save();
      ctx.strokeStyle = '#ffff00'; ctx.lineWidth = 2;
      ctx.globalAlpha = alpha; ctx.shadowBlur = 10 * SHADOW_BLUR_SCALE; ctx.shadowColor = '#ffff00';
      ctx.beginPath();
      ctx.moveTo(chain.from.x, chain.from.y);
      const dx = chain.to.x - chain.from.x;
      const dy = chain.to.y - chain.from.y;
      const segments = 4;
      for (let s = 1; s <= segments; s++) {
        const t = s / segments;
        const jx = (s < segments) ? (Math.random() - 0.5) * 15 : 0;
        const jy = (s < segments) ? (Math.random() - 0.5) * 15 : 0;
        ctx.lineTo(chain.from.x + dx * t + jx, chain.from.y + dy * t + jy);
      }
      ctx.stroke(); ctx.restore();
    }
  }

  _renderFloatingTexts(ctx, game) {
    for (const ft of game.floatingTexts) {
      const alpha = ft.life / ft.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = ft.large ? 'bold 18px Courier New' : 'bold 12px Courier New';
      ctx.textAlign = 'center';
      let x = ft.x;
      if (ft.boxed) {
        // Message on a dark pill, kept inside the board
        ctx.font = 'bold 13px Courier New';
        ctx.textBaseline = 'middle';
        const w = ctx.measureText(ft.text).width + 12;
        x = Math.max(w / 2 + 2, Math.min(this.width - w / 2 - 2, x));
        ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
        ctx.strokeStyle = ft.color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x - w / 2, ft.y - 11, w, 22, 4);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = ft.color;
      ctx.shadowBlur = 8 * SHADOW_BLUR_SCALE;
      ctx.shadowColor = ft.color;
      ctx.fillText(ft.text, x, ft.y);
      ctx.restore();
    }
  }

  _renderKillStreak(ctx, game) {
    if (game.killStreak < 8 || game.killStreakTimer <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, game.killStreakTimer * 2);
    ctx.font = 'bold 22px Courier New';
    ctx.fillStyle = '#ff8800';
    ctx.shadowBlur = 14 * SHADOW_BLUR_SCALE;
    ctx.shadowColor = '#ff8800';
    ctx.textAlign = 'center';
    ctx.fillText(t('banner.combo').replace('{n}', game.killStreak), CONFIG.CANVAS_WIDTH / 2, 70);
    ctx.restore();
  }

  _renderWaveBanner(ctx, game) {
    if (!game.waveBanner) return;
    const b = game.waveBanner;
    const progress = 1 - b.timer / b.duration;

    // Fade in fast, hold, then fade out
    let alpha;
    if (progress < 0.15) alpha = progress / 0.15;
    else if (progress > 0.7) alpha = (1 - progress) / 0.3;
    else alpha = 1;

    // Slide in from left, settle at center
    const slideT = Math.min(1, progress / 0.2);
    const ease = 1 - Math.pow(1 - slideT, 3); // ease-out cubic
    const x = -200 + (this.width / 2 + 200) * ease;
    const y = this.height / 2;

    // Background bar
    ctx.save();
    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, y - 25, this.width, 50);
    ctx.restore();

    // Text
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 28px Courier New';
    ctx.fillStyle = b.color;
    ctx.shadowBlur = 20 * SHADOW_BLUR_SCALE;
    ctx.shadowColor = b.color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(b.text, x, y);
    ctx.restore();
  }

  markDirty() { this.staticDirty = true; }
}
