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

    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        const cell = grid.cells[y][x];
        if (cell === CELL_PATH || cell === CELL_ENTRY || cell === CELL_EXIT) {
          ctx.save();
          ctx.shadowBlur = 3 * SHADOW_BLUR_SCALE;
          ctx.shadowColor = COLORS.PATH_GLOW;
          ctx.fillStyle = COLORS.PATH;
          ctx.fillRect(x * ts + 1, y * ts + 1, ts - 2, ts - 2);
          ctx.restore();
          ctx.strokeStyle = COLORS.PATH_BORDER;
          ctx.lineWidth = 1;
          ctx.strokeRect(x * ts + 0.5, y * ts + 0.5, ts - 1, ts - 1);
        }
      }
    }

    this.staticDirty = false;
  }

  renderFrame(game) {
    const ctx = this.ctx;

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

  markDirty() { this.staticDirty = true; }
}
