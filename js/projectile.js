import { TOWER_DEFS, SHADOW_BLUR_SCALE } from './config.js';

const SB = SHADOW_BLUR_SCALE;

export class Projectile {
  constructor(origin, target, tower) {
    this.x = origin.x;
    this.y = origin.y;
    this.target = target;
    this.tower = tower;
    this.speed = tower.currentStats.projectileSpeed || 400;
    this.damage = tower.currentStats.damage * tower.damageMultiplier;
    this.active = true;
    this.trail = [];
    this.towerType = tower.type;
    this.color = TOWER_DEFS[tower.type].color;

    this.slowAmount = tower.currentStats.slowAmount || 0;
    this.slowDuration = tower.currentStats.slowDuration || 0;
    this.splashRadius = tower.currentStats.splashRadius || 0;
    this.splashDecay = tower.currentStats.splashDecay || 0.5;
    this.chainCount = tower.currentStats.chainCount || 0;
    this.chainRange = tower.currentStats.chainRange || 0;
    this.chainDecay = tower.currentStats.chainDecay || 0.7;
  }

  update(dt) {
    if (!this.target || !this.target.active) {
      this.active = false;
      return;
    }

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 8) this.trail.shift();

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= this.speed * dt + this.target.size) {
      this.onHit();
      this.active = false;
      return;
    }

    this.x += (dx / dist) * this.speed * dt;
    this.y += (dy / dist) * this.speed * dt;
  }

  onHit() {}

  _angle() {
    if (!this.target) return 0;
    return Math.atan2(this.target.y - this.y, this.target.x - this.x);
  }

  render(ctx) {
    switch (this.towerType) {
      case 'blaster':   this._renderBlaster(ctx); break;
      case 'frost':     this._renderFrost(ctx); break;
      case 'lightning':  this._renderLightning(ctx); break;
      case 'cannon':    this._renderCannon(ctx); break;
      case 'sniper':    this._renderSniper(ctx); break;
      default:          this._renderDefault(ctx); break;
    }
  }

  // ── Trail helpers ──

  _trailDots(ctx, radius = 2) {
    for (let i = 0; i < this.trail.length; i++) {
      const a = (i + 1) / this.trail.length * 0.4;
      ctx.globalAlpha = a;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // ── Type-specific renders ──

  // Blaster: elongated bullet shape rotated toward target
  _renderBlaster(ctx) {
    const angle = this._angle();

    // Trail — tapered line segments
    for (let i = 0; i < this.trail.length; i++) {
      const a = (i + 1) / this.trail.length;
      ctx.globalAlpha = a * 0.5;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, 1 + a, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Bullet body
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);
    ctx.shadowBlur = 10 * SB;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, 5, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Bright tip
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.ellipse(3, 0, 2, 1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Frost: spinning ice crystal with sparkle trail
  _renderFrost(ctx) {
    const t = Date.now() / 1000;

    // Sparkle trail
    for (let i = 0; i < this.trail.length; i++) {
      const a = (i + 1) / this.trail.length;
      ctx.save();
      ctx.globalAlpha = a * 0.4;
      ctx.fillStyle = '#aaddff';
      ctx.translate(this.trail[i].x, this.trail[i].y);
      ctx.rotate(t * 8 + i);
      ctx.fillRect(-1, -1, 2, 2);
      ctx.restore();
    }

    // Spinning crystal shard
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(t * 10);
    ctx.shadowBlur = 8 * SB;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.moveTo(0, -4);
    ctx.lineTo(2.5, 0);
    ctx.lineTo(0, 4);
    ctx.lineTo(-2.5, 0);
    ctx.closePath();
    ctx.fill();
    // Inner highlight
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(1, 0);
    ctx.lineTo(0, 2);
    ctx.lineTo(-1, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Lightning: electric bolt with jagged jittering trail
  _renderLightning(ctx) {
    // Jagged trail
    if (this.trail.length >= 2) {
      ctx.save();
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 1.5;
      ctx.shadowBlur = 8 * SB;
      ctx.shadowColor = this.color;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      ctx.moveTo(this.trail[0].x, this.trail[0].y);
      for (let i = 1; i < this.trail.length; i++) {
        const jx = (Math.random() - 0.5) * 6;
        const jy = (Math.random() - 0.5) * 6;
        ctx.lineTo(this.trail[i].x + jx, this.trail[i].y + jy);
      }
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
      ctx.restore();
    }

    // Bright core
    ctx.save();
    ctx.shadowBlur = 14 * SB;
    ctx.shadowColor = this.color;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = this.color;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Cannon: large round shell with thick fading smoke trail
  _renderCannon(ctx) {
    const angle = this._angle();

    // Smoke trail — larger, fading circles
    for (let i = 0; i < this.trail.length; i++) {
      const a = (i + 1) / this.trail.length;
      const r = 3 * (1 - a * 0.5);
      ctx.globalAlpha = a * 0.2;
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Shell body
    ctx.save();
    ctx.shadowBlur = 8 * SB;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 4, 0, Math.PI * 2);
    ctx.fill();
    // Dark inner ring
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Highlight
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(this.x - 1, this.y - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Sniper: thin fast laser streak with sharp glow
  _renderSniper(ctx) {
    const angle = this._angle();

    // Laser line trail
    if (this.trail.length >= 1) {
      const start = this.trail[Math.max(0, this.trail.length - 4)];
      ctx.save();
      // Outer glow line
      ctx.strokeStyle = this.color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.2;
      ctx.shadowBlur = 12 * SB;
      ctx.shadowColor = this.color;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
      // Inner bright line
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(this.x, this.y);
      ctx.stroke();
      ctx.restore();
    }

    // Bright tip
    ctx.save();
    ctx.shadowBlur = 10 * SB;
    ctx.shadowColor = this.color;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Fallback for any other type
  _renderDefault(ctx) {
    this._trailDots(ctx);
    ctx.save();
    ctx.shadowBlur = 10 * SB;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
