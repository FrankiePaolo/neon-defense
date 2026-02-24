import { PARTICLE_PRESETS, SHADOW_BLUR_SCALE } from './config.js';
import { clamp } from './utils.js';

const SB = SHADOW_BLUR_SCALE;

export class ParticleSystem {
  constructor(maxParticles = 500) {
    this.particles = [];
    this.max = maxParticles;
  }

  emit(x, y, color, preset) {
    const p = PARTICLE_PRESETS[preset] || PARTICLE_PRESETS.hit;
    for (let i = 0; i < p.count && this.particles.length < this.max; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = p.speed * (0.5 + Math.random() * 0.5);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed * p.spread,
        vy: Math.sin(angle) * speed * p.spread,
        life: p.life * (0.5 + Math.random() * 0.5),
        maxLife: p.life,
        color,
        size: p.size * (0.5 + Math.random() * 0.5),
        gravity: p.gravity || 0,
        type: preset,
        rotation: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 10,
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.rotation += p.spin * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  render(ctx) {
    for (const p of this.particles) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      const s = p.size * a;
      switch (p.type) {
        case 'hit':       this._renderHit(ctx, p, a, s); break;
        case 'death':     this._renderDeath(ctx, p, a, s); break;
        case 'explosion': this._renderExplosion(ctx, p, a, s); break;
        case 'frost':     this._renderFrost(ctx, p, a, s); break;
        case 'lightning':  this._renderLightning(ctx, p, a, s); break;
        default:          this._renderDefault(ctx, p, a, s); break;
      }
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // Hit: elongated spark streaks aligned with movement direction
  _renderHit(ctx, p, a, s) {
    const angle = Math.atan2(p.vy, p.vx);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(angle);
    ctx.globalAlpha = a;
    ctx.shadowBlur = 6 * SB;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 2, s * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = a * 0.8;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.8, s * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Death: spinning square debris with inner highlight
  _renderDeath(ctx, p, a, s) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = a;
    ctx.shadowBlur = 4 * SB;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = a * 0.3;
    ctx.fillRect(-s / 4, -s / 4, s / 2, s / 2);
    ctx.restore();
  }

  // Explosion: large outer glow + bright white core
  _renderExplosion(ctx, p, a, s) {
    ctx.save();
    ctx.shadowBlur = 10 * SB;
    ctx.shadowColor = p.color;
    ctx.globalAlpha = a * 0.3;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, s * 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Frost: spinning diamond ice crystals with inner highlight
  _renderFrost(ctx, p, a, s) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.globalAlpha = a;
    ctx.shadowBlur = 6 * SB;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.6, 0);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.6, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = a * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.4);
    ctx.lineTo(s * 0.2, 0);
    ctx.lineTo(0, s * 0.4);
    ctx.lineTo(-s * 0.2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Lightning: bright white flash with colored outer halo
  _renderLightning(ctx, p, a, s) {
    ctx.save();
    ctx.shadowBlur = 12 * SB;
    ctx.shadowColor = p.color;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = a * 0.5;
    ctx.beginPath();
    ctx.arc(p.x, p.y, s * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = a;
    ctx.beginPath();
    ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Fallback
  _renderDefault(ctx, p, a, s) {
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 5 * SB;
    ctx.shadowColor = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
    ctx.fill();
  }

  clear() { this.particles = []; }
}
