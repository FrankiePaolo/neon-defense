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

    const tier = Math.max(this.upgradesA, this.upgradesB);
    switch (this.type) {
      case 'blaster':   this._renderBlaster(ctx, size, t, pulse, hasTarget, tier); break;
      case 'frost':     this._renderFrost(ctx, size, t, pulse, hasTarget, tier); break;
      case 'lightning':  this._renderLightning(ctx, size, t, pulse, hasTarget, tier); break;
      case 'cannon':    this._renderCannon(ctx, size, t, pulse, hasTarget, tier); break;
      case 'sniper':    this._renderSniper(ctx, size, t, pulse, hasTarget, tier); break;
      case 'support':   this._renderSupport(ctx, size, t, pulse, tier); break;
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

  _renderBlaster(ctx, size, t, pulse, hasTarget, tier) {
    const pathA = this.upgradesA > 0; // Rapid Fire — many thin barrels, speed lines
    const pathB = this.upgradesB > 0; // Heavy Rounds — thick barrel, armored look

    this._rotated(ctx, (c) => {
      this._glow(c, pulse, hasTarget);
      this._body(c, 'diamond', size);
      this._outline(c, 'diamond', size);

      this._barrelStyle(c, hasTarget);
      if (pathA) {
        // Rapid Fire: many thin barrels fanning out
        this._barrel(c, size, { width: 1, offset: -4 });
        this._barrel(c, size, { width: 1, offset: -1.5 });
        this._barrel(c, size, { width: 1, offset: 1.5 });
        this._barrel(c, size, { width: 1, offset: 4 });
        if (tier >= 2) {
          this._barrel(c, size, { width: 0.8, offset: -6.5 });
          this._barrel(c, size, { width: 0.8, offset: 6.5 });
        }
        // Speed lines behind
        if (tier >= 2) {
          c.strokeStyle = this.def.color;
          c.lineWidth = 0.5;
          c.globalAlpha = 0.3;
          for (let i = 0; i < 3; i++) {
            const y = -4 + i * 4;
            c.beginPath();
            c.moveTo(-size * 0.8 - i * 2, y);
            c.lineTo(-size * 0.3, y);
            c.stroke();
          }
        }
      } else if (pathB) {
        // Heavy Rounds: single fat reinforced barrel
        const bw = 3 + tier;
        this._barrel(c, size, { width: bw, length: size + 5 + tier });
        // Barrel reinforcement rings
        if (tier >= 2) {
          c.strokeStyle = '#fff';
          c.lineWidth = 1;
          c.globalAlpha = 0.3;
          for (let i = 1; i <= tier; i++) {
            const rx = size * 0.3 * i;
            c.beginPath();
            c.moveTo(rx, -bw - 1); c.lineTo(rx, bw + 1);
            c.stroke();
          }
        }
      } else {
        // Base: twin barrels
        this._barrel(c, size, { width: 1.5, offset: -3 });
        this._barrel(c, size, { width: 1.5, offset: 3 });
      }

      // Core
      const coreSize = size * (0.25 + tier * 0.06);
      c.globalAlpha = (0.6 + tier * 0.12) * pulse;
      c.fillStyle = pathA && tier >= 3 ? '#aaffff' : pathB && tier >= 3 ? '#ffffcc' : '#fff';
      c.shadowBlur = (4 + tier * 4) * SB;
      c.shadowColor = pathA ? '#aaffff' : pathB ? '#ffffaa' : '#fff';
      this._circle(c, 0, 0, coreSize);
      c.fill();
    });

    // Tier 3 extras
    if (tier >= 3) {
      ctx.save();
      ctx.translate(this.x, this.y);
      if (pathA) {
        // Rapid Fire: spinning speed ring
        ctx.strokeStyle = this.def.color;
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 5);
        ctx.shadowBlur = 8 * SB;
        ctx.shadowColor = this.def.glowColor;
        ctx.setLineDash([2, 3]);
        ctx.rotate(t * 4);
        this._circle(ctx, 0, 0, size + 5);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (pathB) {
        // Heavy Rounds: pulsing heavy glow
        ctx.fillStyle = this.def.color;
        ctx.globalAlpha = 0.1 + 0.05 * Math.sin(t * 2);
        ctx.shadowBlur = 15 * SB;
        ctx.shadowColor = this.def.glowColor;
        this._circle(ctx, 0, 0, size + 6);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  _renderFrost(ctx, size, t, pulse, hasTarget, tier) {
    const pathA = this.upgradesA > 0; // Deep Freeze — icy aura, snowflake, slow-focused
    const pathB = this.upgradesB > 0; // Frostbite — sharp jagged shards, damage-focused

    this._rotated(ctx, (c) => {
      this._glow(c, pulse, hasTarget);
      this._body(c, 'hexagon', size);
      this._outline(c, 'hexagon', size, 0.5);

      // Inner crystalline ring
      c.strokeStyle = '#fff';
      c.globalAlpha = 0.2;
      drawShape(c, 'hexagon', 0, 0, size * 0.7);
      c.stroke();

      if (pathA) {
        // Deep Freeze: snowflake pattern
        if (tier >= 2) {
          c.strokeStyle = '#cceeFF';
          c.lineWidth = 0.8;
          c.globalAlpha = 0.5 * pulse;
          c.shadowBlur = 4 * SB;
          c.shadowColor = '#aaddff';
          for (let i = 0; i < 6; i++) {
            const a = i * Math.PI / 3;
            c.beginPath();
            c.moveTo(0, 0);
            c.lineTo(Math.cos(a) * size * 0.6, Math.sin(a) * size * 0.6);
            c.stroke();
            // Branches on snowflake at tier 3
            if (tier >= 3) {
              const mid = size * 0.35;
              c.beginPath();
              c.moveTo(Math.cos(a) * mid, Math.sin(a) * mid);
              c.lineTo(Math.cos(a + 0.4) * size * 0.5, Math.sin(a + 0.4) * size * 0.5);
              c.moveTo(Math.cos(a) * mid, Math.sin(a) * mid);
              c.lineTo(Math.cos(a - 0.4) * size * 0.5, Math.sin(a - 0.4) * size * 0.5);
              c.stroke();
            }
          }
        }
      } else if (pathB) {
        // Frostbite: inner cracked/shattered pattern
        if (tier >= 2) {
          c.strokeStyle = '#88aadd';
          c.lineWidth = 1;
          c.globalAlpha = 0.4 * pulse;
          // Crack lines
          c.beginPath();
          c.moveTo(-size * 0.4, -size * 0.2); c.lineTo(size * 0.1, size * 0.3);
          c.moveTo(size * 0.3, -size * 0.4); c.lineTo(-size * 0.2, size * 0.1);
          c.moveTo(0, -size * 0.5); c.lineTo(0, size * 0.5);
          c.stroke();
        }
      }

      // Barrel
      this._barrelStyle(c, hasTarget);
      c.strokeStyle = pathB ? '#8899cc' : '#aaddff';
      this._barrel(c, size, { width: pathB ? 2.5 + tier * 0.5 : 2, length: size + 4 });
    });

    // Orbiting elements
    if (pathA) {
      // Deep Freeze: round soft ice particles orbiting slowly
      const particleCount = 4 + tier * 2;
      for (let i = 0; i < particleCount; i++) {
        const a = t * 1.0 + i * (Math.PI * 2 / particleCount);
        const dist = size + 5 + Math.sin(t * 1.5 + i) * 2;
        ctx.save();
        ctx.fillStyle = '#cceeFF';
        ctx.globalAlpha = 0.4 + 0.2 * Math.sin(t * 2 + i);
        ctx.shadowBlur = 4 * SB;
        ctx.shadowColor = '#aaddff';
        this._circle(ctx, this.x + Math.cos(a) * dist, this.y + Math.sin(a) * dist, 1.5 + tier * 0.3);
        ctx.fill();
        ctx.restore();
      }
      // Tier 3: cold aura ring
      if (tier >= 3) {
        ctx.save();
        ctx.strokeStyle = '#aaddff';
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = 0.15 + 0.1 * Math.sin(t * 2);
        ctx.shadowBlur = 12 * SB;
        ctx.shadowColor = '#88ccff';
        this._circle(ctx, this.x, this.y, size + 7);
        ctx.stroke();
        ctx.restore();
      }
    } else if (pathB) {
      // Frostbite: sharp jagged shards, faster, angular
      const shardCount = 3 + tier;
      for (let i = 0; i < shardCount; i++) {
        const a = t * 2.5 + i * (Math.PI * 2 / shardCount);
        const dist = size + 4;
        ctx.save();
        ctx.translate(this.x + Math.cos(a) * dist, this.y + Math.sin(a) * dist);
        ctx.rotate(a + t * 4);
        ctx.fillStyle = '#8899cc';
        ctx.globalAlpha = 0.6 + 0.2 * Math.sin(t * 4 + i);
        // Jagged triangle shard
        ctx.beginPath();
        const ss = 2 + tier * 0.5;
        ctx.moveTo(0, -ss * 2);
        ctx.lineTo(-ss, ss);
        ctx.lineTo(ss, ss);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    } else {
      // Base: original ice shards
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
  }

  _renderLightning(ctx, size, t, pulse, hasTarget, tier) {
    const pathA = this.upgradesA > 0; // Storm — many spreading arcs, chain-focused
    const pathB = this.upgradesB > 0; // Overload — thick intense bolts, damage-focused

    this._rotated(ctx, (c) => {
      this._glow(c, pulse, hasTarget);
      this._body(c, 'triangle', size);
      this._outline(c, 'triangle', size, 0.4);

      // Inner bolt symbol
      c.globalAlpha = 0.7 * pulse;
      c.strokeStyle = '#fff';
      c.lineWidth = pathB ? 1.5 + tier * 0.5 : 1.5;
      c.shadowBlur = 6 * SB;
      c.shadowColor = pathB ? '#ffff88' : '#fff';
      c.beginPath();
      c.moveTo(-2, -size * 0.35);
      c.lineTo(1, -1);
      c.lineTo(-1, 1);
      c.lineTo(2, size * 0.35);
      c.stroke();
      if (pathA && tier >= 2) { // Storm: second smaller bolt
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(2, -size * 0.3);
        c.lineTo(-1, -2);
        c.lineTo(1, 2);
        c.lineTo(-2, size * 0.3);
        c.stroke();
      }

      // Barrel
      this._barrelStyle(c, hasTarget);
      if (pathA) {
        // Storm: forked prongs
        this._barrel(c, size, { width: 1.5, length: size + 4 });
        this._barrel(c, size, { width: 1, offset: -2, length: size + 3 });
        this._barrel(c, size, { width: 1, offset: 2, length: size + 3 });
        if (tier >= 3) {
          this._barrel(c, size, { width: 0.8, offset: -4, length: size + 2 });
          this._barrel(c, size, { width: 0.8, offset: 4, length: size + 2 });
        }
      } else if (pathB) {
        // Overload: single thick glowing barrel
        this._barrel(c, size, { width: 3 + tier * 0.5, length: size + 4 });
      } else {
        this._barrel(c, size, { width: 2, length: size + 4 });
      }
    });

    // Crackling arcs
    if (pathA) {
      // Storm: many small spreading arcs, always some visible
      const arcCount = 4 + tier * 2;
      if (hasTarget || Math.sin(t * 5) > 0.1) {
        ctx.save();
        ctx.strokeStyle = this.def.color;
        ctx.lineWidth = 0.6;
        ctx.globalAlpha = 0.35 + 0.2 * Math.random();
        ctx.shadowBlur = 5 * SB;
        ctx.shadowColor = this.def.color;
        for (let i = 0; i < arcCount; i++) {
          const a = t * 5 + i * (Math.PI * 2 / arcCount);
          const r1 = size * 0.5, r2 = size + 4 + tier, midA = a + 0.25;
          ctx.beginPath();
          ctx.moveTo(this.x + Math.cos(a) * r1, this.y + Math.sin(a) * r1);
          ctx.lineTo(
            this.x + Math.cos(midA) * (r1 + r2) * 0.5 + (Math.random() - 0.5) * 3,
            this.y + Math.sin(midA) * (r1 + r2) * 0.5 + (Math.random() - 0.5) * 3
          );
          ctx.lineTo(this.x + Math.cos(a + 0.4) * r2, this.y + Math.sin(a + 0.4) * r2);
          ctx.stroke();
        }
        ctx.restore();
      }
      // Tier 3: wide electric field
      if (tier >= 3) {
        ctx.save();
        ctx.strokeStyle = this.def.color;
        ctx.lineWidth = 0.8;
        ctx.globalAlpha = 0.2 + 0.1 * Math.sin(t * 3);
        ctx.shadowBlur = 12 * SB;
        ctx.shadowColor = this.def.glowColor;
        ctx.setLineDash([2, 4]);
        this._circle(ctx, this.x, this.y, size + 8);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    } else if (pathB) {
      // Overload: fewer but thick, intense arcs
      const arcCount = 2 + Math.floor(tier / 2);
      const alwaysArc = tier >= 2;
      if (alwaysArc || hasTarget || Math.sin(t * 5) > 0.3) {
        ctx.save();
        ctx.strokeStyle = '#ffff44';
        ctx.lineWidth = 1.5 + tier * 0.5;
        ctx.globalAlpha = 0.5 + 0.3 * Math.random();
        ctx.shadowBlur = (8 + tier * 4) * SB;
        ctx.shadowColor = '#ffff00';
        for (let i = 0; i < arcCount; i++) {
          const a = t * 3 + i * 2.5;
          const r1 = size * 0.5, r2 = size + 3, midA = a + 0.3;
          ctx.beginPath();
          ctx.moveTo(this.x + Math.cos(a) * r1, this.y + Math.sin(a) * r1);
          ctx.lineTo(
            this.x + Math.cos(midA) * (r1 + r2) * 0.5 + (Math.random() - 0.5) * 5,
            this.y + Math.sin(midA) * (r1 + r2) * 0.5 + (Math.random() - 0.5) * 5
          );
          ctx.lineTo(this.x + Math.cos(a + 0.5) * r2, this.y + Math.sin(a + 0.5) * r2);
          ctx.stroke();
        }
        ctx.restore();
      }
      // Tier 3: intense core glow
      if (tier >= 3) {
        ctx.save();
        ctx.fillStyle = '#ffff00';
        ctx.globalAlpha = 0.12 + 0.06 * Math.sin(t * 3);
        ctx.shadowBlur = 20 * SB;
        ctx.shadowColor = '#ffff00';
        this._circle(ctx, this.x, this.y, size + 5);
        ctx.fill();
        ctx.restore();
      }
    } else {
      // Base arcs
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
  }

  _renderCannon(ctx, size, t, pulse, hasTarget, tier) {
    const pathA = this.upgradesA > 0; // Bombardment — wide flared barrel, splash-focused
    const pathB = this.upgradesB > 0; // Demolisher — reinforced heavy barrel, damage-focused

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

      if (pathB && tier >= 2) {
        // Demolisher: extra armor plates
        c.strokeStyle = '#fff';
        c.lineWidth = 0.8;
        c.globalAlpha = 0.25;
        c.strokeRect(-size * 0.85, -size * 0.85, size * 1.7, size * 1.7);
        if (tier >= 3) {
          // Corner rivets
          const r = size * 0.9;
          c.fillStyle = '#fff';
          c.globalAlpha = 0.35;
          for (const [cx, cy] of [[-r,-r],[r,-r],[-r,r],[r,r]]) {
            c.beginPath(); c.arc(cx, cy, 1.5, 0, Math.PI * 2); c.fill();
          }
        }
      }

      // Barrel
      c.globalAlpha = hasTarget ? 1 : 0.6;
      c.fillStyle = this.def.color;
      c.shadowBlur = hasTarget ? 8 * SB : 0;

      if (pathA) {
        // Bombardment: flared/widening barrel
        const bLen = size + 7 + tier;
        const bNarrow = 2.5;
        const bWide = 4 + tier * 1.5;
        c.beginPath();
        c.moveTo(0, -bNarrow);
        c.lineTo(bLen, -bWide);
        c.lineTo(bLen, bWide);
        c.lineTo(0, bNarrow);
        c.closePath();
        c.fill();
        c.strokeStyle = '#fff'; c.lineWidth = 0.5; c.globalAlpha = 0.25;
        c.stroke();
        // Tier 3: blast ring at muzzle
        if (tier >= 3) {
          c.globalAlpha = 0.3 + 0.15 * Math.sin(t * 3);
          c.strokeStyle = this.def.color;
          c.lineWidth = 1;
          c.beginPath();
          c.arc(bLen, 0, bWide + 2, -Math.PI / 2, Math.PI / 2);
          c.stroke();
        }
      } else if (pathB) {
        // Demolisher: thick reinforced barrel
        const bLen = size + 8 + tier;
        const bWidth = 4 + tier * 0.8;
        c.fillRect(0, -bWidth, bLen, bWidth * 2);
        c.strokeStyle = '#fff'; c.lineWidth = 0.5; c.globalAlpha = 0.25;
        c.strokeRect(0, -bWidth, bLen, bWidth * 2);
        // Reinforcement bands
        c.globalAlpha = 0.3;
        c.strokeStyle = '#fff';
        c.lineWidth = 1.2;
        for (let i = 1; i <= tier; i++) {
          const sx = bLen * (i / (tier + 1));
          c.beginPath();
          c.moveTo(sx, -bWidth - 1); c.lineTo(sx, bWidth + 1);
          c.stroke();
        }
        // Muzzle brake
        c.globalAlpha = hasTarget ? 0.8 : 0.4;
        c.fillStyle = '#fff';
        c.fillRect(bLen - 2, -bWidth - 2, 2, (bWidth + 2) * 2);
      } else {
        // Base barrel
        const bLen = size + 7;
        c.fillRect(0, -3.5, bLen, 7);
        c.strokeStyle = '#fff'; c.lineWidth = 0.5; c.globalAlpha = 0.25;
        c.strokeRect(0, -3.5, bLen, 7);
        c.globalAlpha = hasTarget ? 0.8 : 0.4;
        c.fillStyle = '#fff';
        c.fillRect(bLen - 2, -5, 2, 10);
      }
    });
  }

  _renderSniper(ctx, size, t, pulse, hasTarget, tier) {
    const pathA = this.upgradesA > 0; // Marksman — extended barrel, scope enhancements, range
    const pathB = this.upgradesB > 0; // Assassin — dark/red tint, skull crosshair, lethal

    this._rotated(ctx, (c) => {
      this._glow(c, pulse, hasTarget);
      this._body(c, 'octagon', size);
      this._outline(c, 'octagon', size);

      this._barrelStyle(c, hasTarget);
      if (pathA) {
        // Marksman: extra-long barrel with scope mount
        this._barrel(c, size, { width: 1.5, length: size + 12 + tier * 3 });
        // Scope mount on barrel
        if (tier >= 1) {
          c.fillStyle = this.def.color;
          c.globalAlpha = 0.5;
          c.fillRect(size * 0.4, -4, 3, -3);
        }
        // Bipod
        if (tier >= 2) {
          c.strokeStyle = this.def.color;
          c.lineWidth = 1;
          c.globalAlpha = 0.4;
          c.beginPath();
          c.moveTo(-size * 0.3, 0); c.lineTo(-size - 3, size * 0.8);
          c.moveTo(-size * 0.3, 0); c.lineTo(-size - 3, -size * 0.8);
          c.stroke();
        }
      } else if (pathB) {
        // Assassin: shorter, thicker suppressed barrel
        const bLen = size + 8;
        this._barrel(c, size, { width: 2 + tier * 0.3, length: bLen });
        // Suppressor
        if (tier >= 1) {
          c.fillStyle = '#333';
          c.globalAlpha = 0.7;
          c.fillRect(bLen - 4, -3.5 - tier * 0.3, 5, 7 + tier * 0.6);
          c.strokeStyle = '#666';
          c.lineWidth = 0.5;
          c.globalAlpha = 0.4;
          c.strokeRect(bLen - 4, -3.5 - tier * 0.3, 5, 7 + tier * 0.6);
        }
      } else {
        this._barrel(c, size, { width: 1.5, length: size + 10 });
      }
    });

    // Scope crosshair
    const cr = size * 0.55;
    const color = this.def.color;
    ctx.save();

    if (pathB) {
      // Assassin: red-tinted crosshair
      ctx.strokeStyle = '#ff4444';
      ctx.lineWidth = 0.8;
      ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 3);
      ctx.shadowBlur = 6 * SB;
      ctx.shadowColor = '#ff0000';
      this._circle(ctx, this.x, this.y, cr);
      ctx.stroke();
      // X-crosshair instead of +
      ctx.beginPath();
      const xr = cr * 0.7;
      ctx.moveTo(this.x - xr, this.y - xr); ctx.lineTo(this.x - xr * 0.3, this.y - xr * 0.3);
      ctx.moveTo(this.x + xr * 0.3, this.y + xr * 0.3); ctx.lineTo(this.x + xr, this.y + xr);
      ctx.moveTo(this.x + xr, this.y - xr); ctx.lineTo(this.x + xr * 0.3, this.y - xr * 0.3);
      ctx.moveTo(this.x - xr * 0.3, this.y + xr * 0.3); ctx.lineTo(this.x - xr, this.y + xr);
      ctx.stroke();
      // Red center dot
      ctx.fillStyle = '#ff4444';
      ctx.globalAlpha = 0.8 * pulse;
      this._circle(ctx, this.x, this.y, 2);
      ctx.fill();
      // Tier 3: kill mark notches
      if (tier >= 3) {
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.4;
        for (let i = 0; i < 3; i++) {
          const ny = this.y - size - 2 - i * 3;
          ctx.beginPath();
          ctx.moveTo(this.x - 2, ny); ctx.lineTo(this.x + 2, ny);
          ctx.stroke();
        }
      }
    } else {
      // Marksman or base: green crosshair
      ctx.strokeStyle = color;
      ctx.lineWidth = 0.6;
      ctx.globalAlpha = 0.4 + 0.15 * Math.sin(t * 2);
      ctx.shadowBlur = 4 * SB;
      ctx.shadowColor = this.def.glowColor;
      this._circle(ctx, this.x, this.y, cr);
      ctx.stroke();
      if (pathA && tier >= 2) {
        // Double crosshair ring
        ctx.globalAlpha = 0.2 + 0.1 * Math.sin(t * 2.5);
        this._circle(ctx, this.x, this.y, cr * 1.4);
        ctx.stroke();
      }
      ctx.globalAlpha = 0.4 + 0.15 * Math.sin(t * 2);
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
      // Marksman tier 3: green laser sight
      if (pathA && tier >= 3 && hasTarget && this.target) {
        ctx.strokeStyle = '#00ff66';
        ctx.lineWidth = 0.6;
        ctx.globalAlpha = 0.3 + 0.15 * Math.sin(t * 6);
        ctx.shadowBlur = 4 * SB;
        ctx.shadowColor = '#00ff44';
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.target.x, this.target.y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  _renderSupport(ctx, size, t, pulse, tier) {
    const pathA = this.upgradesA > 0; // Command — bright blue aura, star symbol, buff-focused
    const pathB = this.upgradesB > 0; // Economy — gold tint, coin symbol, gold-focused

    const color = pathB ? '#ffd700' : this.def.color;
    const glow = pathB ? '#cc9900' : this.def.glowColor;
    const auraR = this.currentStats.buffRange * CONFIG.TILE_SIZE;

    // Dashed aura ring
    ctx.save();
    ctx.strokeStyle = glow;
    ctx.lineWidth = pathA ? 1 + tier * 0.3 : 1;
    ctx.globalAlpha = 0.2 + 0.1 * Math.sin(t * 2);
    ctx.setLineDash([4, 6]);
    this._circle(ctx, this.x, this.y, auraR);
    ctx.stroke();

    if (pathA && tier >= 3) {
      // Command: rotating inner aura rings
      ctx.globalAlpha = 0.15;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(t * 0.5);
      this._circle(ctx, 0, 0, auraR * 0.75);
      ctx.stroke();
      ctx.rotate(-t);
      this._circle(ctx, 0, 0, auraR * 0.55);
      ctx.stroke();
      ctx.restore();
    }
    ctx.setLineDash([]);
    ctx.restore();

    // Radiating pulse wave(s)
    const waveCount = pathA ? 1 + Math.min(tier, 2) : 1;
    for (let w = 0; w < waveCount; w++) {
      const phase = (t * 0.8 + w * (1 / waveCount)) % 1;
      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.3 * (1 - phase);
      this._circle(ctx, this.x, this.y, size + phase * (auraR - size));
      ctx.stroke();
      ctx.restore();
    }

    // Body — glowing orb
    ctx.save();
    ctx.shadowBlur = (15 + tier * 5) * SB * pulse;
    ctx.shadowColor = glow;
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.15 + tier * 0.03;
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

    // Inner symbol
    ctx.globalAlpha = 0.6 * pulse;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 6 * SB;
    const s = size * 0.45;

    if (pathA) {
      // Command: 6-point star, blue/white glow
      ctx.strokeStyle = '#aaccff';
      ctx.shadowColor = '#aaccff';
      ctx.beginPath();
      const points = tier >= 2 ? 6 : 4;
      for (let i = 0; i < points; i++) {
        const a = i * (Math.PI * 2 / points) - Math.PI / 2;
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + Math.cos(a) * s, this.y + Math.sin(a) * s);
      }
      ctx.stroke();
      // Tier 3: outer chevrons
      if (tier >= 3) {
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 4; i++) {
          const a = i * Math.PI / 2 + t * 0.3;
          const d = size + 4;
          ctx.beginPath();
          ctx.moveTo(this.x + Math.cos(a - 0.3) * d, this.y + Math.sin(a - 0.3) * d);
          ctx.lineTo(this.x + Math.cos(a) * (d + 3), this.y + Math.sin(a) * (d + 3));
          ctx.lineTo(this.x + Math.cos(a + 0.3) * d, this.y + Math.sin(a + 0.3) * d);
          ctx.stroke();
        }
      }
    } else if (pathB) {
      // Economy: $ symbol / coin look
      ctx.strokeStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      // Circle outline (coin edge)
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.5 * pulse;
      this._circle(ctx, this.x, this.y, s * 0.85);
      ctx.stroke();
      // $ sign
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = 0.7 * pulse;
      ctx.beginPath();
      // S-curve
      const h = s * 0.6;
      ctx.moveTo(this.x + h * 0.3, this.y - h);
      ctx.quadraticCurveTo(this.x - h * 0.5, this.y - h * 0.5, this.x + h * 0.3, this.y);
      ctx.quadraticCurveTo(this.x - h * 0.5, this.y + h * 0.5, this.x + h * 0.3, this.y + h);
      ctx.stroke();
      // Vertical line through $
      ctx.beginPath();
      ctx.moveTo(this.x, this.y - h * 1.2);
      ctx.lineTo(this.x, this.y + h * 1.2);
      ctx.stroke();
      // Tier 3: orbiting coin particles
      if (tier >= 3) {
        for (let i = 0; i < 3; i++) {
          const a = t * 1.2 + i * (Math.PI * 2 / 3);
          const d = size + 5;
          ctx.fillStyle = '#ffd700';
          ctx.globalAlpha = 0.5 + 0.2 * Math.sin(t * 2 + i);
          ctx.shadowBlur = 4 * SB;
          this._circle(ctx, this.x + Math.cos(a) * d, this.y + Math.sin(a) * d, 2);
          ctx.fill();
        }
      }
    } else {
      // Base: plus symbol
      ctx.strokeStyle = '#fff';
      ctx.shadowColor = '#fff';
      ctx.beginPath();
      ctx.moveTo(this.x - s, this.y); ctx.lineTo(this.x + s, this.y);
      ctx.moveTo(this.x, this.y - s); ctx.lineTo(this.x, this.y + s);
      ctx.stroke();
    }
    ctx.restore();
  }
}
