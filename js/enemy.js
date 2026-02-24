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

    this.path = path;
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

    if (this.flying) {
      this._moveStraight(dt, speed);
    } else {
      this._moveAlongPath(dt, speed);
    }

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

  _moveStraight(dt, speed) {
    const target = this.path[this.path.length - 1];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= speed * dt) {
      this.x = target.x;
      this.y = target.y;
      this.reachedEnd = true;
    } else {
      this.x += (dx / dist) * speed * dt;
      this.y += (dy / dist) * speed * dt;
    }
  }

  render(ctx, towers) {
    if (this.stealth && !this.revealed) {
      let visible = false;
      if (towers) {
        for (const t of towers) {
          if (distance(this.x, this.y, t.x, t.y) <= this.revealRange * CONFIG.TILE_SIZE) {
            visible = true; break;
          }
        }
      }
      if (!visible) {
        ctx.globalAlpha = 0.15;
        drawShape(ctx, this.shape, this.x, this.y, this.size);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.globalAlpha = 1;
        return;
      }
    }

    ctx.save();
    ctx.shadowBlur = 8 * SHADOW_BLUR_SCALE;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    drawShape(ctx, this.shape, this.x, this.y, this.size);
    ctx.fill();
    ctx.restore();

    if (this.hp < this.maxHp) {
      const barW = this.size * 2.5, barH = 3;
      const barX = this.x - barW / 2, barY = this.y - this.size - 6;
      const hpRatio = this.hp / this.maxHp;
      ctx.fillStyle = '#333';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = hpRatio > 0.5 ? '#00ff66' : hpRatio > 0.25 ? '#ffaa00' : '#ff4444';
      ctx.fillRect(barX, barY, barW * hpRatio, barH);
    }

    if (this.maxShield > 0 && this.shield > 0) {
      const barW = this.size * 2.5, barH = 2;
      const barX = this.x - barW / 2, barY = this.y - this.size - 10;
      ctx.fillStyle = '#4488ff';
      ctx.fillRect(barX, barY, barW * (this.shield / this.maxShield), barH);
    }

    if (this.effects.has('slow')) {
      ctx.save();
      ctx.strokeStyle = '#88ccff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size + 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}
