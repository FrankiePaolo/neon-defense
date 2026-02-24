import { CONFIG, TOWER_DEFS, SHADOW_BLUR_SCALE } from './config.js';
import { gridToPixel, distance, drawShape } from './utils.js';
import { COLORS } from './config.js';

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
    if (level === 2) {
      const otherLevel = path === 'A' ? this.upgradesB : this.upgradesA;
      if (otherLevel >= 3) return null;
    }
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

  render(ctx, isSelected, isHovered) {
    const upgrades = this.upgradesA + this.upgradesB;
    const size = CONFIG.TILE_SIZE * 0.35 + upgrades * 1;
    const color = this.def.color;
    const glow = this.def.glowColor;
    const t = Date.now() / 1000;
    const pulse = 0.85 + 0.15 * Math.sin(t * 2.5);
    const hasTarget = this.target && this.target.active;

    // Range circle
    if (isSelected || isHovered) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.currentStats.range * CONFIG.TILE_SIZE, 0, Math.PI * 2);
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
    ctx.beginPath();
    ctx.arc(this.x, this.y, size + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Type-specific rendering
    switch (this.type) {
      case 'blaster':  this._renderBlaster(ctx, size, t, pulse, hasTarget); break;
      case 'frost':    this._renderFrost(ctx, size, t, pulse, hasTarget); break;
      case 'lightning': this._renderLightning(ctx, size, t, pulse, hasTarget); break;
      case 'cannon':   this._renderCannon(ctx, size, t, pulse, hasTarget); break;
      case 'sniper':   this._renderSniper(ctx, size, t, pulse, hasTarget); break;
      case 'support':  this._renderSupport(ctx, size, t, pulse); break;
    }

    // Upgrade pips
    if (upgrades > 0) {
      const pipRadius = size + 6;
      for (let i = 0; i < upgrades; i++) {
        const a = -Math.PI / 2 + (i / Math.max(upgrades, 1)) * Math.PI * 2;
        const px = this.x + Math.cos(a) * pipRadius;
        const py = this.y + Math.sin(a) * pipRadius;
        ctx.save();
        ctx.shadowBlur = 4 * SHADOW_BLUR_SCALE;
        ctx.shadowColor = color;
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // Blaster: clean twin-barrel turret
  _renderBlaster(ctx, size, t, pulse, hasTarget) {
    const color = this.def.color;
    const glow = this.def.glowColor;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Body
    ctx.shadowBlur = (hasTarget ? 16 : 8) * SHADOW_BLUR_SCALE * pulse;
    ctx.shadowColor = glow;
    ctx.fillStyle = color;
    drawShape(ctx, 'diamond', 0, 0, size);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.35;
    drawShape(ctx, 'diamond', 0, 0, size);
    ctx.stroke();

    // Twin barrels
    ctx.globalAlpha = hasTarget ? 0.9 : 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = hasTarget ? 6 * SHADOW_BLUR_SCALE : 0;
    const bLen = size + 5;
    ctx.beginPath();
    ctx.moveTo(2, -3); ctx.lineTo(bLen, -3);
    ctx.moveTo(2, 3); ctx.lineTo(bLen, 3);
    ctx.stroke();

    // Inner core
    ctx.globalAlpha = 0.6 * pulse;
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 4 * SHADOW_BLUR_SCALE;
    ctx.shadowColor = '#fff';
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.25, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Frost: crystalline hexagon with orbiting ice shards
  _renderFrost(ctx, size, t, pulse, hasTarget) {
    const color = this.def.color;
    const glow = this.def.glowColor;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Body
    ctx.shadowBlur = 12 * SHADOW_BLUR_SCALE * pulse;
    ctx.shadowColor = glow;
    ctx.fillStyle = color;
    drawShape(ctx, 'hexagon', 0, 0, size);
    ctx.fill();

    // Crystalline edges
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    drawShape(ctx, 'hexagon', 0, 0, size);
    ctx.stroke();
    ctx.globalAlpha = 0.2;
    drawShape(ctx, 'hexagon', 0, 0, size * 0.7);
    ctx.stroke();

    // Barrel
    ctx.globalAlpha = hasTarget ? 0.8 : 0.4;
    ctx.strokeStyle = '#aaddff';
    ctx.lineWidth = 2;
    const bLen = size + 4;
    ctx.beginPath();
    ctx.moveTo(2, 0); ctx.lineTo(bLen, 0);
    ctx.stroke();

    ctx.restore();

    // Orbiting ice shards (unrotated, around tower)
    for (let i = 0; i < 4; i++) {
      const a = t * 1.5 + i * Math.PI / 2;
      const dist = size + 4 + Math.sin(t * 2 + i) * 2;
      const sx = this.x + Math.cos(a) * dist;
      const sy = this.y + Math.sin(a) * dist;
      ctx.save();
      ctx.translate(sx, sy);
      ctx.rotate(a + t * 3);
      ctx.fillStyle = '#aaddff';
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 3 + i);
      ctx.fillRect(-1.5, -3, 3, 6);
      ctx.restore();
    }
  }

  // Lightning: triangle with crackling arcs
  _renderLightning(ctx, size, t, pulse, hasTarget) {
    const color = this.def.color;
    const glow = this.def.glowColor;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Body
    ctx.shadowBlur = (hasTarget ? 20 : 10) * SHADOW_BLUR_SCALE * pulse;
    ctx.shadowColor = glow;
    ctx.fillStyle = color;
    drawShape(ctx, 'triangle', 0, 0, size);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.4;
    drawShape(ctx, 'triangle', 0, 0, size);
    ctx.stroke();

    // Inner bolt symbol
    ctx.globalAlpha = 0.7 * pulse;
    ctx.fillStyle = '#fff';
    ctx.shadowBlur = 6 * SHADOW_BLUR_SCALE;
    ctx.shadowColor = '#fff';
    ctx.beginPath();
    ctx.moveTo(-2, -size * 0.35);
    ctx.lineTo(1, -1);
    ctx.lineTo(-1, 1);
    ctx.lineTo(2, size * 0.35);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#fff';
    ctx.stroke();

    // Barrel
    ctx.globalAlpha = hasTarget ? 0.9 : 0.4;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = hasTarget ? 8 * SHADOW_BLUR_SCALE : 0;
    ctx.shadowColor = glow;
    ctx.beginPath();
    ctx.moveTo(2, 0); ctx.lineTo(size + 4, 0);
    ctx.stroke();

    ctx.restore();

    // Crackling arcs around tower (unrotated)
    if (hasTarget || Math.sin(t * 5) > 0.3) {
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.4 + 0.3 * Math.random();
      ctx.shadowBlur = 6 * SHADOW_BLUR_SCALE;
      ctx.shadowColor = color;
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + i * 2.1;
        const r1 = size * 0.6;
        const r2 = size + 3;
        ctx.beginPath();
        ctx.moveTo(this.x + Math.cos(a) * r1, this.y + Math.sin(a) * r1);
        const midA = a + 0.3;
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

  // Cannon: heavy square with thick double barrel
  _renderCannon(ctx, size, t, pulse, hasTarget) {
    const color = this.def.color;
    const glow = this.def.glowColor;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Body — filled square with darker inner
    ctx.shadowBlur = (hasTarget ? 14 : 8) * SHADOW_BLUR_SCALE * pulse;
    ctx.shadowColor = glow;
    ctx.fillStyle = color;
    ctx.fillRect(-size, -size, size * 2, size * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(-size * 0.6, -size * 0.6, size * 1.2, size * 1.2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    ctx.strokeRect(-size, -size, size * 2, size * 2);

    // Heavy barrel
    ctx.globalAlpha = hasTarget ? 1 : 0.6;
    ctx.fillStyle = color;
    ctx.shadowBlur = hasTarget ? 8 * SHADOW_BLUR_SCALE : 0;
    const bLen = size + 7;
    ctx.fillRect(0, -3.5, bLen, 7);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.25;
    ctx.strokeRect(0, -3.5, bLen, 7);

    // Muzzle brake
    ctx.globalAlpha = hasTarget ? 0.8 : 0.4;
    ctx.fillStyle = '#fff';
    ctx.fillRect(bLen - 2, -5, 2, 10);

    ctx.restore();
  }

  // Sniper: octagon with long thin barrel and crosshair
  _renderSniper(ctx, size, t, pulse, hasTarget) {
    const color = this.def.color;
    const glow = this.def.glowColor;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Body
    ctx.shadowBlur = (hasTarget ? 14 : 8) * SHADOW_BLUR_SCALE * pulse;
    ctx.shadowColor = glow;
    ctx.fillStyle = color;
    drawShape(ctx, 'octagon', 0, 0, size);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.35;
    drawShape(ctx, 'octagon', 0, 0, size);
    ctx.stroke();

    // Long barrel
    ctx.globalAlpha = hasTarget ? 0.9 : 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.shadowBlur = hasTarget ? 6 * SHADOW_BLUR_SCALE : 0;
    ctx.shadowColor = glow;
    const bLen = size + 10;
    ctx.beginPath();
    ctx.moveTo(2, 0); ctx.lineTo(bLen, 0);
    ctx.stroke();

    ctx.restore();

    // Scope crosshair (unrotated, on the tower body)
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.4 + 0.15 * Math.sin(t * 2);
    ctx.shadowBlur = 4 * SHADOW_BLUR_SCALE;
    ctx.shadowColor = glow;
    const cr = size * 0.55;
    ctx.beginPath();
    ctx.arc(this.x, this.y, cr, 0, Math.PI * 2);
    ctx.stroke();
    // Cross lines
    ctx.beginPath();
    ctx.moveTo(this.x - cr, this.y); ctx.lineTo(this.x - cr * 0.3, this.y);
    ctx.moveTo(this.x + cr * 0.3, this.y); ctx.lineTo(this.x + cr, this.y);
    ctx.moveTo(this.x, this.y - cr); ctx.lineTo(this.x, this.y - cr * 0.3);
    ctx.moveTo(this.x, this.y + cr * 0.3); ctx.lineTo(this.x, this.y + cr);
    ctx.stroke();
    // Center dot
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.6 * pulse;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Support: pulsing circle with radiating wave rings
  _renderSupport(ctx, size, t, pulse) {
    const color = this.def.color;
    const glow = this.def.glowColor;
    const auraR = this.currentStats.buffRange * CONFIG.TILE_SIZE;

    // Aura rings
    ctx.save();
    ctx.strokeStyle = glow;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.2 + 0.1 * Math.sin(t * 2);
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.arc(this.x, this.y, auraR, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    // Radiating pulse wave
    const wavePhase = (t * 0.8) % 1;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3 * (1 - wavePhase);
    ctx.beginPath();
    ctx.arc(this.x, this.y, size + wavePhase * (auraR - size), 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Body — glowing orb
    ctx.save();
    ctx.shadowBlur = 15 * SHADOW_BLUR_SCALE * pulse;
    ctx.shadowColor = glow;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.arc(this.x, this.y, size + 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
    ctx.stroke();

    // Inner plus symbol
    ctx.globalAlpha = 0.6 * pulse;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 6 * SHADOW_BLUR_SCALE;
    ctx.shadowColor = '#fff';
    const s = size * 0.45;
    ctx.beginPath();
    ctx.moveTo(this.x - s, this.y); ctx.lineTo(this.x + s, this.y);
    ctx.moveTo(this.x, this.y - s); ctx.lineTo(this.x, this.y + s);
    ctx.stroke();
    ctx.restore();
  }
}
