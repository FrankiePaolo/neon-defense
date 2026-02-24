import { TOWER_DEFS } from './config.js';

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

  render(ctx) {
    for (let i = 0; i < this.trail.length; i++) {
      const alpha = (i + 1) / this.trail.length * 0.4;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.save();
    ctx.shadowBlur = 10;
    ctx.shadowColor = this.color;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
