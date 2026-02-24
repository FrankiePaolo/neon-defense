import { PARTICLE_PRESETS } from './config.js';
import { clamp } from './utils.js';

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
        color: color,
        size: p.size * (0.5 + Math.random() * 0.5),
        gravity: p.gravity || 0,
      });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  render(ctx) {
    for (const p of this.particles) {
      const alpha = clamp(p.life / p.maxLife, 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowBlur = 5;
      ctx.shadowColor = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  clear() { this.particles = []; }
}
