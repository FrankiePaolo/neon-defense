import { CONFIG, COLORS, TOWER_DEFS, SHADOW_BLUR_SCALE } from './config.js';
import { gridToPixel } from './utils.js';
import { CELL_PATH, CELL_ENTRY, CELL_EXIT } from './grid.js';

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.width = CONFIG.CANVAS_WIDTH;
    this.height = CONFIG.CANVAS_HEIGHT;
    canvas.width = this.width;
    canvas.height = this.height;

    this.staticCanvas = document.createElement('canvas');
    this.staticCanvas.width = this.width;
    this.staticCanvas.height = this.height;
    this.staticCtx = this.staticCanvas.getContext('2d');
    this.staticDirty = true;
  }

  renderStatic(grid) {
    const ctx = this.staticCtx;
    ctx.fillStyle = COLORS.BACKGROUND;
    ctx.fillRect(0, 0, this.width, this.height);

    const ts = CONFIG.TILE_SIZE;

    ctx.strokeStyle = COLORS.GRID_LINE;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= grid.cols; x++) {
      ctx.beginPath(); ctx.moveTo(x * ts, 0); ctx.lineTo(x * ts, this.height); ctx.stroke();
    }
    for (let y = 0; y <= grid.rows; y++) {
      ctx.beginPath(); ctx.moveTo(0, y * ts); ctx.lineTo(this.width, y * ts); ctx.stroke();
    }

    // ── Path tiles ──
    const isPathCell = (px, py) => {
      if (px < 0 || px >= grid.cols || py < 0 || py >= grid.rows) return false;
      const c = grid.cells[py][px];
      return c === CELL_PATH || c === CELL_ENTRY || c === CELL_EXIT;
    };

    // Base fill with subtle radial gradient
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        if (!isPathCell(x, y)) continue;
        const cx = x * ts + ts / 2;
        const cy = y * ts + ts / 2;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, ts * 0.7);
        grad.addColorStop(0, '#1c2d50');
        grad.addColorStop(1, '#141e38');
        ctx.fillStyle = grad;
        ctx.fillRect(x * ts + 1, y * ts + 1, ts - 2, ts - 2);
      }
    }

    // Glowing neon edges on outer boundaries of the path (channel walls)
    ctx.save();
    ctx.shadowBlur = 8 * SHADOW_BLUR_SCALE;
    ctx.shadowColor = '#1a6fff';
    ctx.strokeStyle = '#1e50aa';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.6;
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        if (!isPathCell(x, y)) continue;
        const px = x * ts;
        const py = y * ts;
        if (!isPathCell(x, y - 1)) { ctx.beginPath(); ctx.moveTo(px, py + 0.5); ctx.lineTo(px + ts, py + 0.5); ctx.stroke(); }
        if (!isPathCell(x, y + 1)) { ctx.beginPath(); ctx.moveTo(px, py + ts - 0.5); ctx.lineTo(px + ts, py + ts - 0.5); ctx.stroke(); }
        if (!isPathCell(x - 1, y)) { ctx.beginPath(); ctx.moveTo(px + 0.5, py); ctx.lineTo(px + 0.5, py + ts); ctx.stroke(); }
        if (!isPathCell(x + 1, y)) { ctx.beginPath(); ctx.moveTo(px + ts - 0.5, py); ctx.lineTo(px + ts - 0.5, py + ts); ctx.stroke(); }
      }
    }
    ctx.restore();

    // Dashed center-line along path direction
    if (grid.path && grid.path.length >= 2) {
      ctx.save();
      ctx.strokeStyle = '#2a4a7a';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.25;
      ctx.setLineDash([4, 8]);
      ctx.beginPath();
      ctx.moveTo(grid.path[0].x * ts + ts / 2, grid.path[0].y * ts + ts / 2);
      for (let i = 1; i < grid.path.length; i++) {
        ctx.lineTo(grid.path[i].x * ts + ts / 2, grid.path[i].y * ts + ts / 2);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Node dots at path turns
    if (grid.path && grid.path.length >= 3) {
      ctx.save();
      ctx.fillStyle = '#2a5aaa';
      ctx.globalAlpha = 0.3;
      for (let i = 1; i < grid.path.length - 1; i++) {
        const prev = grid.path[i - 1];
        const curr = grid.path[i];
        const next = grid.path[i + 1];
        const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y;
        const dx2 = next.x - curr.x, dy2 = next.y - curr.y;
        if (dx1 !== dx2 || dy1 !== dy2) {
          ctx.beginPath();
          ctx.arc(curr.x * ts + ts / 2, curr.y * ts + ts / 2, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    this.staticDirty = false;
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

    ctx.save();
    ctx.translate(shakeX, shakeY);

    if (this.staticDirty) this.renderStatic(game.grid);
    ctx.drawImage(this.staticCanvas, 0, 0);

    this._renderPortals(ctx, game.grid);

    if (game.input && game.input.hoveredCell && game.input.placingType) {
      this._renderPlacementPreview(ctx, game);
    }

    if (game.input && game.input.hoveredCell && game.input.movingTower) {
      this._renderMovePreview(ctx, game);
    }

    for (const tower of game.towers) {
      const isSelected = game.input && game.input.selectedTower === tower;
      const isHovered = game.input && game.input.hoveredCell &&
        tower.gx === game.input.hoveredCell.x && tower.gy === game.input.hoveredCell.y;
      tower.render(ctx, isSelected, isHovered);
    }

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
    const t = Date.now() / 1000;
    if (grid.entry) {
      const p = gridToPixel(grid.entry.x, grid.entry.y);
      this._renderPortal(ctx, p.x, p.y, COLORS.ENTRY, t, 1);
    }
    if (grid.exit) {
      const p = gridToPixel(grid.exit.x, grid.exit.y);
      this._renderPortal(ctx, p.x, p.y, COLORS.EXIT, t, -1);
    }
  }

  _renderPortal(ctx, x, y, color, t, dir) {
    const ts = CONFIG.TILE_SIZE;
    const pulse = 0.7 + 0.3 * Math.sin(t * 3);
    const r = ts * 0.42;

    // Ambient glow
    ctx.save();
    ctx.shadowBlur = 25 * SHADOW_BLUR_SCALE;
    ctx.shadowColor = color;
    ctx.globalAlpha = 0.12 + 0.06 * Math.sin(t * 2);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r + 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Outer ring — slow rotation, dashed
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 0.5 * dir);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.4 * pulse;
    ctx.shadowBlur = 8 * SHADOW_BLUR_SCALE;
    ctx.shadowColor = color;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Middle ring — faster, opposite direction
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-t * 1.2 * dir);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5 * pulse;
    ctx.shadowBlur = 6 * SHADOW_BLUR_SCALE;
    ctx.shadowColor = color;
    ctx.setLineDash([3, 10]);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.65, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Orbiting particles (6 dots at varying distances)
    for (let i = 0; i < 6; i++) {
      const angle = t * (0.8 + i * 0.3) * dir + (i * Math.PI / 3);
      const dist = r * (0.4 + 0.25 * Math.sin(t * 2 + i));
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      const size = 1.2 + 0.8 * Math.sin(t * 4 + i * 1.5);
      ctx.save();
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 3 + i);
      ctx.shadowBlur = 6 * SHADOW_BLUR_SCALE;
      ctx.shadowColor = color;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Core — bright pulsing center
    ctx.save();
    ctx.shadowBlur = 18 * SHADOW_BLUR_SCALE;
    ctx.shadowColor = color;
    ctx.globalAlpha = 0.6 + 0.3 * pulse;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(x, y, 3 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.4 * pulse;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 5 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Energy arcs — 3 rotating spokes from core to ring
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 0.8 * dir);
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.2 + 0.1 * Math.sin(t * 4);
    ctx.shadowBlur = 4 * SHADOW_BLUR_SCALE;
    ctx.shadowColor = color;
    for (let i = 0; i < 3; i++) {
      const a = (i * Math.PI * 2) / 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const jitter = Math.sin(t * 6 + i * 2) * 3;
      ctx.quadraticCurveTo(
        Math.cos(a + 0.3) * r * 0.5 + jitter,
        Math.sin(a + 0.3) * r * 0.5 + jitter,
        Math.cos(a) * r * 0.9,
        Math.sin(a) * r * 0.9
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  _renderPlacementPreview(ctx, game) {
    const cell = game.input.hoveredCell;
    const ts = CONFIG.TILE_SIZE;
    const valid = game.grid.isPlaceable(cell.x, cell.y) &&
      game.economy.canAfford(TOWER_DEFS[game.input.placingType].cost);

    ctx.fillStyle = valid ? COLORS.VALID_PLACEMENT : COLORS.INVALID_PLACEMENT;
    ctx.fillRect(cell.x * ts, cell.y * ts, ts, ts);
    ctx.strokeStyle = valid ? 'rgba(0, 255, 100, 0.6)' : 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(cell.x * ts + 1, cell.y * ts + 1, ts - 2, ts - 2);

    if (valid) {
      const def = TOWER_DEFS[game.input.placingType];
      const center = gridToPixel(cell.x, cell.y);
      ctx.save();
      ctx.strokeStyle = def.color; ctx.lineWidth = 1; ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.arc(center.x, center.y, def.range * CONFIG.TILE_SIZE, 0, Math.PI * 2);
      ctx.stroke(); ctx.restore();
    }
  }

  _renderMovePreview(ctx, game) {
    const cell = game.input.hoveredCell;
    const tower = game.input.movingTower;
    const ts = CONFIG.TILE_SIZE;
    const valid = game.grid.isPlaceable(cell.x, cell.y);

    ctx.fillStyle = valid ? COLORS.VALID_PLACEMENT : COLORS.INVALID_PLACEMENT;
    ctx.fillRect(cell.x * ts, cell.y * ts, ts, ts);
    ctx.strokeStyle = valid ? 'rgba(0, 255, 100, 0.6)' : 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(cell.x * ts + 1, cell.y * ts + 1, ts - 2, ts - 2);

    const center = gridToPixel(cell.x, cell.y);
    ctx.save();
    ctx.strokeStyle = tower.def.color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(center.x, center.y, tower.currentStats.range * CONFIG.TILE_SIZE, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = COLORS.TOWER_RANGE;
    ctx.fill();
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
      ctx.fillStyle = ft.color;
      ctx.shadowBlur = 8 * SHADOW_BLUR_SCALE;
      ctx.shadowColor = ft.color;
      ctx.textAlign = 'center';
      ctx.fillText(ft.text, ft.x, ft.y);
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
    ctx.fillText(`${game.killStreak}x COMBO`, CONFIG.CANVAS_WIDTH / 2, 70);
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
