import { CONFIG, TOWER_DEFS, SHADOW_BLUR_SCALE } from './config.js';
import { gridToPixel, distance, drawShape } from './utils.js';
import { COLORS } from './config.js';

const SB = SHADOW_BLUR_SCALE;

export class Tower {
  constructor(type, gx, gy) {
    this.type = type;
    this.gx = gx;
    this.gy = gy;
    const pos = gridToPixel(gx, gy);
    this.x = pos.x;
    this.y = pos.y;
    this.def = TOWER_DEFS[type];
    this.active = true;

    this.upgradesA = 0;
    this.upgradesB = 0;
    this.totalInvested = this.def.cost;

    this.currentStats = this._computeStats();
    this.cooldown = 0;
    this.target = null;
    this.angle = 0;

    this.damageMultiplier = 1.0;
    this.fireRateMultiplier = 1.0;
  }

  _computeStats() {
    const base = { ...this.def };
    if (this.upgradesA > 0) {
      for (let i = 0; i < this.upgradesA; i++) {
        Object.assign(base, this.def.upgrades.pathA.levels[i].stats);
      }
    }
    if (this.upgradesB > 0) {
      for (let i = 0; i < this.upgradesB; i++) {
        Object.assign(base, this.def.upgrades.pathB.levels[i].stats);
      }
    }
    return base;
  }

  getUpgradeCost(path) {
    const level = path === 'A' ? this.upgradesA : this.upgradesB;
    const pathKey = path === 'A' ? 'pathA' : 'pathB';
    const upgradeLevels = this.def.upgrades[pathKey].levels;
    if (level >= upgradeLevels.length) return null;
    const otherLevel = path === 'A' ? this.upgradesB : this.upgradesA;
    if (otherLevel > 0) return null;
    return upgradeLevels[level].cost;
  }

  upgrade(path) {
    const cost = this.getUpgradeCost(path);
    if (cost === null) return false;
    if (path === 'A') this.upgradesA++;
    else this.upgradesB++;
    this.totalInvested += cost;
    this.currentStats = this._computeStats();
    return true;
  }

  getSellValue() {
    return Math.floor(this.totalInvested * CONFIG.SELL_REFUND_RATE);
  }

  update(dt, enemies, spatialHash) {
    if (this.type === 'support') return null;

    this.cooldown -= dt;

    const range = this.currentStats.range * CONFIG.TILE_SIZE;
    const inRange = spatialHash.query(this.x, this.y, range).filter(e => {
      if (!e.active) return false;
      if (e.stealth && !e.revealed) {
        if (distance(this.x, this.y, e.x, e.y) <= (e.revealRange || 2) * CONFIG.TILE_SIZE) {
          e.revealed = true;
          return true;
        }
        return false;
      }
      return true;
    });

    if (inRange.length === 0) { this.target = null; return null; }

    const targeting = this.currentStats.targeting || 'first';
    if (targeting === 'first') {
      this.target = inRange.reduce((best, e) => (!best || e.pathIndex > best.pathIndex) ? e : best, null);
    } else if (targeting === 'strongest') {
      this.target = inRange.reduce((best, e) => (!best || e.hp > best.hp) ? e : best, null);
    } else if (targeting === 'closest') {
      this.target = inRange.reduce((best, e) => {
        const d = distance(this.x, this.y, e.x, e.y);
        return (!best || d < best._dist) ? (e._dist = d, e) : best;
      }, null);
    } else {
      this.target = inRange[0];
    }

    if (this.target) {
      this.angle = Math.atan2(this.target.y - this.y, this.target.x - this.x);
    }

    if (this.cooldown <= 0 && this.target) {
      this.cooldown = 1 / (this.currentStats.fireRate * this.fireRateMultiplier);
      return this.target;
    }
    return null;
  }

  // ── Render helpers ──

  _glow(ctx, pulse, hasTarget) {
    ctx.shadowBlur = (hasTarget ? 16 : 8) * SB * pulse;
    ctx.shadowColor = this.def.glowColor;
  }

  _body(ctx, shape, size) {
    ctx.fillStyle = this.def.color;
    drawShape(ctx, shape, 0, 0, size);
    ctx.fill();
  }

  _outline(ctx, shape, size, alpha = 0.35) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = alpha;
    drawShape(ctx, shape, 0, 0, size);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  _barrel(ctx, size, { length = size + 5, width = 2, offset = 0 } = {}) {
    ctx.strokeStyle = this.def.color;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(2, offset);
    ctx.lineTo(length, offset);
    ctx.stroke();
  }

  _barrelStyle(ctx, hasTarget) {
    ctx.globalAlpha = hasTarget ? 0.9 : 0.5;
    ctx.shadowBlur = hasTarget ? 6 * SB : 0;
    ctx.shadowColor = this.def.glowColor;
  }

  _rotated(ctx, fn) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    fn(ctx);
    ctx.restore();
  }

  _circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }

  // ── Main render ──

  render(ctx, isSelected, isHovered) {
    const upgrades = this.upgradesA + this.upgradesB;
    const size = CONFIG.TILE_SIZE * 0.35 + upgrades;
    const color = this.def.color;
    const t = Date.now() / 1000;
    const pulse = 0.85 + 0.15 * Math.sin(t * 2.5);
    const hasTarget = !!(this.target && this.target.active);

    if (isSelected || isHovered) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.2;
      this._circle(ctx, this.x, this.y, this.currentStats.range * CONFIG.TILE_SIZE);
      ctx.stroke();
      ctx.fillStyle = COLORS.TOWER_RANGE;
      ctx.fill();
      ctx.restore();
    }

    // Base platform
    ctx.save();
    ctx.fillStyle = '#151520';
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    this._circle(ctx, this.x, this.y, size + 3);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    switch (this.type) {
      case 'blaster':   this._renderBlaster(ctx, size, t, pulse, hasTarget); break;
      case 'frost':     this._renderFrost(ctx, size, t, pulse, hasTarget); break;
      case 'lightning':  this._renderLightning(ctx, size, t, pulse, hasTarget); break;
      case 'cannon':    this._renderCannon(ctx, size, t, pulse, hasTarget); break;
      case 'sniper':    this._renderSniper(ctx, size, t, pulse, hasTarget); break;
      case 'support':   this._renderSupport(ctx, size, t, pulse); break;
    }

    // Upgrade pips
    if (upgrades > 0) {
      const pipR = size + 6;
      for (let i = 0; i < upgrades; i++) {
        const a = -Math.PI / 2 + (i / upgrades) * Math.PI * 2;
        ctx.save();
        ctx.shadowBlur = 4 * SB;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        this._circle(ctx, this.x + Math.cos(a) * pipR, this.y + Math.sin(a) * pipR, 1.5);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // ── Tower-specific renders ──

  _renderBlaster(ctx, size, t, pulse, hasTarget) {
    this._rotated(ctx, (c) => {
      this._glow(c, pulse, hasTarget);
      this._body(c, 'diamond', size);
      this._outline(c, 'diamond', size);

      // Twin barrels
      this._barrelStyle(c, hasTarget);
      this._barrel(c, size, { width: 1.5, offset: -3 });
      this._barrel(c, size, { width: 1.5, offset: 3 });

      // Core
      c.globalAlpha = 0.6 * pulse;
      c.fillStyle = '#fff';
      c.shadowBlur = 4 * SB;
      c.shadowColor = '#fff';
      this._circle(c, 0, 0, size * 0.25);
      c.fill();
    });
  }

  _renderFrost(ctx, size, t, pulse, hasTarget) {
    this._rotated(ctx, (c) => {
      this._glow(c, pulse, hasTarget);
      this._body(c, 'hexagon', size);
      this._outline(c, 'hexagon', size, 0.5);

      // Inner crystalline ring
      c.strokeStyle = '#fff';
      c.globalAlpha = 0.2;
      drawShape(c, 'hexagon', 0, 0, size * 0.7);
      c.stroke();

      // Barrel
      this._barrelStyle(c, hasTarget);
      c.strokeStyle = '#aaddff';
      this._barrel(c, size, { width: 2, length: size + 4 });
    });

    // Orbiting ice shards
    for (let i = 0; i < 4; i++) {
      const a = t * 1.5 + i * Math.PI / 2;
      const dist = size + 4 + Math.sin(t * 2 + i) * 2;
      ctx.save();
      ctx.translate(this.x + Math.cos(a) * dist, this.y + Math.sin(a) * dist);
      ctx.rotate(a + t * 3);
      ctx.fillStyle = '#aaddff';
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 3 + i);
      ctx.fillRect(-1.5, -3, 3, 6);
      ctx.restore();
    }
  }

  _renderLightning(ctx, size, t, pulse, hasTarget) {
    this._rotated(ctx, (c) => {
      this._glow(c, pulse, hasTarget);
      this._body(c, 'triangle', size);
      this._outline(c, 'triangle', size, 0.4);

      // Inner bolt symbol
      c.globalAlpha = 0.7 * pulse;
      c.strokeStyle = '#fff';
      c.lineWidth = 1.5;
      c.shadowBlur = 6 * SB;
      c.shadowColor = '#fff';
      c.beginPath();
      c.moveTo(-2, -size * 0.35);
      c.lineTo(1, -1);
      c.lineTo(-1, 1);
      c.lineTo(2, size * 0.35);
      c.stroke();

      // Barrel
      this._barrelStyle(c, hasTarget);
      this._barrel(c, size, { width: 2, length: size + 4 });
    });

    // Crackling arcs
    if (hasTarget || Math.sin(t * 5) > 0.3) {
      ctx.save();
      ctx.strokeStyle = this.def.color;
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.4 + 0.3 * Math.random();
      ctx.shadowBlur = 6 * SB;
      ctx.shadowColor = this.def.color;
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + i * 2.1;
        const r1 = size * 0.6, r2 = size + 3, midA = a + 0.3;
        ctx.beginPath();
        ctx.moveTo(this.x + Math.cos(a) * r1, this.y + Math.sin(a) * r1);
        ctx.lineTo(
          this.x + Math.cos(midA) * (r1 + r2) * 0.5 + (Math.random() - 0.5) * 4,
          this.y + Math.sin(midA) * (r1 + r2) * 0.5 + (Math.random() - 0.5) * 4
        );
        ctx.lineTo(this.x + Math.cos(a + 0.5) * r2, this.y + Math.sin(a + 0.5) * r2);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  _renderCannon(ctx, size, t, pulse, hasTarget) {
    this._rotated(ctx, (c) => {
      this._glow(c, pulse, hasTarget);

      // Body — square with dark inner
      c.fillStyle = this.def.color;
      c.fillRect(-size, -size, size * 2, size * 2);
      c.fillStyle = 'rgba(0,0,0,0.3)';
      c.fillRect(-size * 0.6, -size * 0.6, size * 1.2, size * 1.2);
      c.strokeStyle = '#fff';
      c.lineWidth = 1;
      c.globalAlpha = 0.3;
      c.strokeRect(-size, -size, size * 2, size * 2);

      // Heavy barrel
      c.globalAlpha = hasTarget ? 1 : 0.6;
      c.fillStyle = this.def.color;
      c.shadowBlur = hasTarget ? 8 * SB : 0;
      const bLen = size + 7;
      c.fillRect(0, -3.5, bLen, 7);
      c.strokeStyle = '#fff';
      c.lineWidth = 0.5;
      c.globalAlpha = 0.25;
      c.strokeRect(0, -3.5, bLen, 7);

      // Muzzle brake
      c.globalAlpha = hasTarget ? 0.8 : 0.4;
      c.fillStyle = '#fff';
      c.fillRect(bLen - 2, -5, 2, 10);
    });
  }

  _renderSniper(ctx, size, t, pulse, hasTarget) {
    this._rotated(ctx, (c) => {
      this._glow(c, pulse, hasTarget);
      this._body(c, 'octagon', size);
      this._outline(c, 'octagon', size);

      // Long barrel
      this._barrelStyle(c, hasTarget);
      this._barrel(c, size, { width: 1.5, length: size + 10 });
    });

    // Scope crosshair
    const cr = size * 0.55;
    const color = this.def.color;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.4 + 0.15 * Math.sin(t * 2);
    ctx.shadowBlur = 4 * SB;
    ctx.shadowColor = this.def.glowColor;
    this._circle(ctx, this.x, this.y, cr);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.x - cr, this.y); ctx.lineTo(this.x - cr * 0.3, this.y);
    ctx.moveTo(this.x + cr * 0.3, this.y); ctx.lineTo(this.x + cr, this.y);
    ctx.moveTo(this.x, this.y - cr); ctx.lineTo(this.x, this.y - cr * 0.3);
    ctx.moveTo(this.x, this.y + cr * 0.3); ctx.lineTo(this.x, this.y + cr);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6 * pulse;
    this._circle(ctx, this.x, this.y, 1.5);
    ctx.fill();
    ctx.restore();
  }

  _renderSupport(ctx, size, t, pulse) {
    const color = this.def.color;
    const glow = this.def.glowColor;
    const auraR = this.currentStats.buffRange * CONFIG.TILE_SIZE;

    // Dashed aura ring
    ctx.save();
    ctx.strokeStyle = glow;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.2 + 0.1 * Math.sin(t * 2);
    ctx.setLineDash([4, 6]);
    this._circle(ctx, this.x, this.y, auraR);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Radiating pulse wave
    const phase = (t * 0.8) % 1;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3 * (1 - phase);
    this._circle(ctx, this.x, this.y, size + phase * (auraR - size));
    ctx.stroke();
    ctx.restore();

    // Body — glowing orb
    ctx.save();
    ctx.shadowBlur = 15 * SB * pulse;
    ctx.shadowColor = glow;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.15;
    this._circle(ctx, this.x, this.y, size + 2);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    this._circle(ctx, this.x, this.y, size);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.4;
    this._circle(ctx, this.x, this.y, size);
    ctx.stroke();

    // Inner plus symbol
    ctx.globalAlpha = 0.6 * pulse;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 6 * SB;
    ctx.shadowColor = '#fff';
    const s = size * 0.45;
    ctx.beginPath();
    ctx.moveTo(this.x - s, this.y); ctx.lineTo(this.x + s, this.y);
    ctx.moveTo(this.x, this.y - s); ctx.lineTo(this.x, this.y + s);
    ctx.stroke();
    ctx.restore();
  }
}
