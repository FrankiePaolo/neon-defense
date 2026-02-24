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
    const size = CONFIG.TILE_SIZE * 0.35 + (this.upgradesA + this.upgradesB) * 1;
    const color = this.def.color;

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

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.translate(-this.x, -this.y);
    ctx.shadowBlur = 12 * SHADOW_BLUR_SCALE;
    ctx.shadowColor = this.def.glowColor;
    ctx.fillStyle = color;
    drawShape(ctx, this.def.shape, this.x, this.y, size);
    ctx.fill();
    ctx.restore();

    if (this.type === 'support') {
      ctx.save();
      ctx.strokeStyle = this.def.glowColor;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 500) * 0.1;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.currentStats.buffRange * CONFIG.TILE_SIZE, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
