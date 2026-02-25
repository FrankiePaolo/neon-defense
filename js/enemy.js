import { CONFIG, ENEMY_DEFS, SHADOW_BLUR_SCALE } from './config.js';
import { distance, drawShape } from './utils.js';

export class Enemy {
  constructor(type, path, waveMult = {}) {
    const def = ENEMY_DEFS[type];
    this.type = type;
    this.def = def;
    this.active = true;
    this.reachedEnd = false;

    this.maxHp = def.hp * (waveMult.hp || 1);
    this.hp = this.maxHp;
    this.baseSpeed = def.speed * (waveMult.speed || 1);
    this.armor = def.armor + (waveMult.armor || 0);
    this.reward = Math.floor(def.reward * (waveMult.reward || 1));
    this.color = def.color;
    this.shape = def.shape;
    this.size = def.size;

    this.flying = def.flying || false;
    this.stealth = def.stealth || false;
    this.revealRange = def.revealRange || 0;
    this.splitCount = def.splitCount || 0;
    this.splitType = def.splitType || null;
    this.healRange = def.healRange || 0;
    this.healAmount = def.healAmount || 0;
    this.healInterval = def.healInterval || 0;
    this.healTimer = 0;
    this.bossRegen = def.bossRegen || 0;
    this.shield = def.shield ? def.shield * (waveMult.hp || 1) : 0;
    this.maxShield = this.shield;
    this.shieldRegen = def.shieldRegen || 0;
    this.shieldRegenDelay = def.shieldRegenDelay || 0;
    this.shieldRegenTimer = 0;

    this.path = this.flying ? this._simplifyPath(path, 6) : path;
    this.pathIndex = 0;
    if (path.length > 0) {
      this.x = path[0].x;
      this.y = path[0].y;
    } else {
      this.x = 0;
      this.y = 0;
    }

    this.effects = new Map();
    this.revealed = false;
  }

  update(dt) {
    this._processEffects(dt);
    if (this._isStunned()) return;

    const speed = this.baseSpeed * this._getSpeedMult();

    this._moveAlongPath(dt, speed);

    if (this.healRange > 0) this.healTimer -= dt;
    if (this.bossRegen > 0) this.hp = Math.min(this.maxHp, this.hp + this.bossRegen * dt);

    if (this.maxShield > 0 && this.shield < this.maxShield) {
      this.shieldRegenTimer -= dt;
      if (this.shieldRegenTimer <= 0) {
        this.shield = Math.min(this.maxShield, this.shield + this.shieldRegen * dt);
      }
    }
  }

  takeDamage(amount, damageType) {
    const brittle = this.effects.get('brittle');
    if (brittle) amount *= (1 + brittle.magnitude);
    amount = Math.max(1, amount - this.armor);

    if (this.shield > 0) {
      this.shieldRegenTimer = this.shieldRegenDelay;
      if (this.shield >= amount) { this.shield -= amount; return; }
      amount -= this.shield;
      this.shield = 0;
    }

    this.hp -= amount;
    if (this.hp <= 0) { this.hp = 0; this.active = false; }
  }

  applyEffect(name, duration, magnitude) {
    const existing = this.effects.get(name);
    if (!existing || existing.magnitude <= magnitude) {
      this.effects.set(name, { duration, magnitude });
    }
  }

  healNearby(enemies, dt) {
    if (this.healTimer > 0) return;
    this.healTimer = this.healInterval;
    for (const e of enemies) {
      if (e === this || !e.active) continue;
      const d = distance(this.x, this.y, e.x, e.y);
      if (d <= this.healRange * CONFIG.TILE_SIZE) {
        e.hp = Math.min(e.maxHp, e.hp + this.healAmount);
      }
    }
  }

  _processEffects(dt) {
    for (const [name, effect] of this.effects) {
      effect.duration -= dt;
      if (effect.duration <= 0) this.effects.delete(name);
    }
  }

  _isStunned() { return this.effects.has('stun'); }

  _getSpeedMult() {
    const slow = this.effects.get('slow');
    return slow ? (1 - slow.magnitude) : 1;
  }

  _moveAlongPath(dt, speed) {
    if (this.pathIndex >= this.path.length - 1) { this.reachedEnd = true; return; }

    let remaining = speed * dt;
    while (remaining > 0 && this.pathIndex < this.path.length - 1) {
      const target = this.path[this.pathIndex + 1];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= remaining) {
        this.x = target.x;
        this.y = target.y;
        this.pathIndex++;
        remaining -= dist;
      } else {
        this.x += (dx / dist) * remaining;
        this.y += (dy / dist) * remaining;
        remaining = 0;
      }
    }

    if (this.pathIndex >= this.path.length - 1) this.reachedEnd = true;
  }

  _simplifyPath(path, step) {
    if (path.length <= 2) return path;
    const simplified = [path[0]];
    for (let i = step; i < path.length - 1; i += step) {
      simplified.push(path[i]);
    }
    simplified.push(path[path.length - 1]);
    return simplified;
  }

  _moveAngle() {
    const next = this.path[Math.min(this.pathIndex + 1, this.path.length - 1)];
    return Math.atan2(next.y - this.y, next.x - this.x);
  }

  // ── Render helpers ──

  _circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
  }

  _hpBar(ctx) {
    if (this.hp >= this.maxHp) return;
    const barW = this.size * 2.5, barH = 3;
    const barX = this.x - barW / 2, barY = this.y - this.size - 6;
    const ratio = this.hp / this.maxHp;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = ratio > 0.5 ? '#00ff66' : ratio > 0.25 ? '#ffaa00' : '#ff4444';
    ctx.fillRect(barX, barY, barW * ratio, barH);
  }

  _shieldBar(ctx) {
    if (this.maxShield <= 0 || this.shield <= 0) return;
    const barW = this.size * 2.5, barH = 2;
    const barX = this.x - barW / 2, barY = this.y - this.size - 10;
    ctx.fillStyle = '#4488ff';
    ctx.fillRect(barX, barY, barW * (this.shield / this.maxShield), barH);
  }

  _slowEffect(ctx) {
    if (!this.effects.has('slow')) return;
    ctx.save();
    ctx.strokeStyle = '#88ccff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    this._circle(ctx, this.x, this.y, this.size + 3);
    ctx.stroke();
    ctx.restore();
  }

  // ── Main render ──

  render(ctx, towers) {
    const t = Date.now() / 1000;
    const SB = SHADOW_BLUR_SCALE;

    // Stealth check
    if (this.stealth && !this.revealed) {
      let visible = false;
      if (towers) {
        for (const tw of towers) {
          if (distance(this.x, this.y, tw.x, tw.y) <= this.revealRange * CONFIG.TILE_SIZE) {
            visible = true; break;
          }
        }
      }
      if (!visible) {
        // Glitch flicker
        const flicker = Math.sin(t * 15) > 0.3 ? 0.12 : 0.04;
        ctx.save();
        ctx.globalAlpha = flicker;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        drawShape(ctx, this.shape, this.x, this.y, this.size);
        ctx.stroke();
        // Offset ghost
        ctx.globalAlpha = flicker * 0.5;
        const gx = Math.sin(t * 8) * 2;
        drawShape(ctx, this.shape, this.x + gx, this.y, this.size);
        ctx.stroke();
        ctx.restore();
        return;
      }
    }

    const angle = this._moveAngle();

    switch (this.type) {
      case 'basic':    this._renderBasic(ctx, t, SB); break;
      case 'fast':     this._renderFast(ctx, t, SB, angle); break;
      case 'tank':     this._renderTank(ctx, t, SB); break;
      case 'armored':  this._renderArmored(ctx, t, SB); break;
      case 'healer':   this._renderHealer(ctx, t, SB); break;
      case 'splitter': this._renderSplitter(ctx, t, SB); break;
      case 'flying':   this._renderFlying(ctx, t, SB, angle); break;
      case 'boss':     this._renderBoss(ctx, t, SB); break;
      case 'stealth':  this._renderStealth(ctx, t, SB); break;
      case 'shielded': this._renderShielded(ctx, t, SB); break;
    }

    this._shieldBar(ctx);
    this._hpBar(ctx);
    this._slowEffect(ctx);
  }

  // ── Type-specific renders ──

  // Drone: pulsing core, outline, trailing dot
  _renderBasic(ctx, t, SB) {
    const s = this.size;
    const pulse = 0.8 + 0.2 * Math.sin(t * 4);

    ctx.save();
    ctx.shadowBlur = 8 * SB * pulse;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    this._circle(ctx, this.x, this.y, s);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.3;
    this._circle(ctx, this.x, this.y, s);
    ctx.stroke();
    // Core
    ctx.globalAlpha = 0.5 * pulse;
    ctx.fillStyle = '#fff';
    this._circle(ctx, this.x, this.y, s * 0.35);
    ctx.fill();
    ctx.restore();
  }

  // Scout: pointed triangle facing movement, speed lines behind
  _renderFast(ctx, t, SB, angle) {
    const s = this.size;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.shadowBlur = 10 * SB;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    // Pointed triangle facing right
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * 0.7, -s * 0.7);
    ctx.lineTo(-s * 0.3, 0);
    ctx.lineTo(-s * 0.7, s * 0.7);
    ctx.closePath();
    ctx.fill();
    // Speed lines
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 3; i++) {
      const off = -s - 3 - i * 4;
      const yOff = (i - 1) * 3;
      ctx.beginPath();
      ctx.moveTo(off, yOff);
      ctx.lineTo(off - 5, yOff);
      ctx.stroke();
    }
    ctx.restore();
  }

  // Brute: heavy square, dark inner armor plate, corner bolts
  _renderTank(ctx, t, SB) {
    const s = this.size;
    ctx.save();
    ctx.shadowBlur = 8 * SB;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - s, this.y - s, s * 2, s * 2);
    // Inner plate
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(this.x - s * 0.65, this.y - s * 0.65, s * 1.3, s * 1.3);
    // Outline
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.25;
    ctx.strokeRect(this.x - s, this.y - s, s * 2, s * 2);
    // Corner bolts
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#fff';
    for (const [cx, cy] of [[-1,-1],[1,-1],[1,1],[-1,1]]) {
      this._circle(ctx, this.x + cx * s * 0.7, this.y + cy * s * 0.7, 1.2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Sentinel: pentagon with metallic ring + rivet dots
  _renderArmored(ctx, t, SB) {
    const s = this.size;
    ctx.save();
    ctx.shadowBlur = 6 * SB;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    drawShape(ctx, 'pentagon', this.x, this.y, s);
    ctx.fill();
    // Armor ring
    ctx.strokeStyle = '#bbb';
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.5;
    this._circle(ctx, this.x, this.y, s + 2);
    ctx.stroke();
    // Rivets around ring
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ddd';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      this._circle(ctx, this.x + Math.cos(a) * (s + 2), this.y + Math.sin(a) * (s + 2), 1);
      ctx.fill();
    }
    ctx.restore();
  }

  // Medic: glowing cross body + heal pulse ring
  _renderHealer(ctx, t, SB) {
    const s = this.size;
    const pulse = 0.8 + 0.2 * Math.sin(t * 3);

    // Heal pulse ring
    const phase = (t * 0.6) % 1;
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3 * (1 - phase);
    this._circle(ctx, this.x, this.y, s + phase * this.healRange * CONFIG.TILE_SIZE * 0.5);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.shadowBlur = 12 * SB * pulse;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    drawShape(ctx, 'cross', this.x, this.y, s);
    ctx.fill();
    // White cross highlight
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.3 * pulse;
    drawShape(ctx, 'cross', this.x, this.y, s * 0.5);
    ctx.fill();
    ctx.restore();
  }

  // Hydra: diamond with inner fracture lines
  _renderSplitter(ctx, t, SB) {
    const s = this.size;
    ctx.save();
    ctx.shadowBlur = 10 * SB;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    drawShape(ctx, 'diamond', this.x, this.y, s);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.3;
    drawShape(ctx, 'diamond', this.x, this.y, s);
    ctx.stroke();
    // Fracture lines from center
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - s * 0.15);
    ctx.lineTo(this.x - s * 0.5, this.y - s * 0.8);
    ctx.moveTo(this.x, this.y + s * 0.15);
    ctx.lineTo(this.x + s * 0.5, this.y + s * 0.8);
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x, this.y - s * 0.3);
    ctx.lineTo(this.x, this.y + s * 0.3);
    ctx.stroke();
    // Twin inner diamonds
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#fff';
    drawShape(ctx, 'diamond', this.x - 2, this.y, s * 0.3);
    ctx.fill();
    drawShape(ctx, 'diamond', this.x + 2, this.y, s * 0.3);
    ctx.fill();
    ctx.restore();
  }

  // Wraith: ghostly layered triangle + afterimage trail
  _renderFlying(ctx, t, SB, angle) {
    const s = this.size;
    // Afterimage trail
    for (let i = 3; i >= 1; i--) {
      const lag = i * 6;
      const tx = this.x - Math.cos(angle) * lag;
      const ty = this.y - Math.sin(angle) * lag;
      ctx.save();
      ctx.translate(tx, ty);
      ctx.rotate(angle);
      ctx.globalAlpha = 0.08 * (4 - i);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(s * 0.8, 0);
      ctx.lineTo(-s * 0.6, -s * 0.5);
      ctx.lineTo(-s * 0.6, s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Main body
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.shadowBlur = 12 * SB;
    ctx.shadowColor = this.color;
    // Outer ghost layer
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(s, 0);
    ctx.lineTo(-s * 0.7, -s * 0.7);
    ctx.lineTo(-s * 0.7, s * 0.7);
    ctx.closePath();
    ctx.fill();
    // Inner solid
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.moveTo(s * 0.7, 0);
    ctx.lineTo(-s * 0.4, -s * 0.45);
    ctx.lineTo(-s * 0.4, s * 0.45);
    ctx.closePath();
    ctx.fill();
    // Eye dot
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 5);
    this._circle(ctx, s * 0.15, 0, 1.5);
    ctx.fill();
    ctx.restore();
  }

  // Overlord: large hexagon, pulsing danger aura, rotating segments, inner eye
  _renderBoss(ctx, t, SB) {
    const s = this.size;
    const pulse = 0.8 + 0.2 * Math.sin(t * 2);

    // Danger aura
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.15 + 0.1 * Math.sin(t * 1.5);
    ctx.shadowBlur = 20 * SB;
    ctx.shadowColor = this.color;
    this._circle(ctx, this.x, this.y, s + 8 + Math.sin(t * 2) * 3);
    ctx.stroke();
    ctx.restore();

    // Rotating outer segments
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(t * 0.4);
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(0, 0, s + 4, a, a + 0.3);
      ctx.stroke();
    }
    ctx.restore();

    // Body
    ctx.save();
    ctx.shadowBlur = 15 * SB * pulse;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    drawShape(ctx, 'hexagon', this.x, this.y, s);
    ctx.fill();
    // Dark inner
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    drawShape(ctx, 'hexagon', this.x, this.y, s * 0.7);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.2;
    drawShape(ctx, 'hexagon', this.x, this.y, s);
    ctx.stroke();

    // Inner eye
    ctx.globalAlpha = 0.8 * pulse;
    ctx.fillStyle = '#ff0000';
    ctx.shadowBlur = 10 * SB;
    ctx.shadowColor = '#ff0000';
    this._circle(ctx, this.x, this.y, s * 0.2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.6;
    this._circle(ctx, this.x, this.y, s * 0.08);
    ctx.fill();
    ctx.restore();
  }

  // Phantom: flickering body with glitch offset
  _renderStealth(ctx, t, SB) {
    const s = this.size;
    const flicker = 0.5 + 0.3 * Math.sin(t * 8);
    const glitchX = Math.sin(t * 12) * 1.5;

    ctx.save();
    ctx.shadowBlur = 6 * SB;
    ctx.shadowColor = this.color;
    // Glitch offset copy
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.2 * flicker;
    this._circle(ctx, this.x + glitchX, this.y, s);
    ctx.fill();
    // Main body
    ctx.globalAlpha = 0.6 * flicker;
    this._circle(ctx, this.x, this.y, s);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.2 * flicker;
    this._circle(ctx, this.x, this.y, s);
    ctx.stroke();
    ctx.restore();
  }

  // Guardian: octagon body + visible hex shield barrier
  _renderShielded(ctx, t, SB) {
    const s = this.size;
    const pulse = 0.85 + 0.15 * Math.sin(t * 3);

    // Body
    ctx.save();
    ctx.shadowBlur = 8 * SB;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    drawShape(ctx, 'octagon', this.x, this.y, s);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 0.6;
    ctx.globalAlpha = 0.3;
    drawShape(ctx, 'octagon', this.x, this.y, s);
    ctx.stroke();
    ctx.restore();

    // Shield barrier (when shield is up)
    if (this.shield > 0) {
      const shieldAlpha = (this.shield / this.maxShield) * 0.4;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(t * 0.5);
      ctx.strokeStyle = '#4488ff';
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = shieldAlpha * pulse;
      ctx.shadowBlur = 10 * SB;
      ctx.shadowColor = '#4488ff';
      // Hexagonal shield outline
      drawShape(ctx, 'hexagon', 0, 0, s + 4);
      ctx.stroke();
      ctx.restore();
    }
  }
}
