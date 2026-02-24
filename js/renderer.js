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

    if (grid.entry) {
      const ep = gridToPixel(grid.entry.x, grid.entry.y);
      ctx.save();
      ctx.shadowBlur = 15 * SHADOW_BLUR_SCALE; ctx.shadowColor = COLORS.ENTRY;
      ctx.fillStyle = COLORS.ENTRY; ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(ep.x - 12, ep.y - 8); ctx.lineTo(ep.x + 6, ep.y); ctx.lineTo(ep.x - 12, ep.y + 8);
      ctx.closePath(); ctx.fill(); ctx.restore();
    }

    if (grid.exit) {
      const xp = gridToPixel(grid.exit.x, grid.exit.y);
      ctx.save();
      ctx.shadowBlur = 15 * SHADOW_BLUR_SCALE; ctx.shadowColor = COLORS.EXIT;
      ctx.fillStyle = COLORS.EXIT; ctx.globalAlpha = 0.6;
      ctx.beginPath(); ctx.arc(xp.x, xp.y, 8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }

    this.staticDirty = false;
  }

  renderFrame(game) {
    const ctx = this.ctx;

    if (this.staticDirty) this.renderStatic(game.grid);
    ctx.drawImage(this.staticCanvas, 0, 0);

    if (game.input && game.input.hoveredCell && game.input.placingType) {
      this._renderPlacementPreview(ctx, game);
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

  _renderPlacementPreview(ctx, game) {
    const cell = game.input.hoveredCell;
    const ts = CONFIG.TILE_SIZE;
    const valid = game.grid.isPlaceable(cell.x, cell.y) &&
      game.economy.canAfford(TOWER_DEFS[game.input.placingType].cost);

    ctx.fillStyle = valid ? COLORS.VALID_PLACEMENT : COLORS.INVALID_PLACEMENT;
    ctx.fillRect(cell.x * ts, cell.y * ts, ts, ts);

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
