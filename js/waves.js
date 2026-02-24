import { CONFIG } from './config.js';
import { choose, randInt } from './utils.js';

const ENEMY_UNLOCK = [
  { wave: 1,  type: 'basic' },
  { wave: 3,  type: 'fast' },
  { wave: 5,  type: 'tank' },
  { wave: 7,  type: 'armored' },
  { wave: 10, type: 'healer' },
  { wave: 12, type: 'splitter' },
  { wave: 15, type: 'flying' },
  { wave: 18, type: 'stealth' },
  { wave: 22, type: 'shielded' },
];

export class WaveManager {
  constructor() {
    this.currentWave = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveActive = false;
  }

  generateWave(waveNum) {
    const baseCount = 8 + Math.floor(waveNum * 2);
    const hpMult = Math.pow(1.10, waveNum - 1);
    const speedMult = 1 + (waveNum - 1) * 0.03;
    const armorBonus = Math.max(0, Math.floor((waveNum - 8) * 0.5));
    const rewardMult = 1 + (waveNum - 1) * 0.05;
    const isBoss = waveNum % CONFIG.BOSS_INTERVAL === 0;

    const available = ENEMY_UNLOCK.filter(u => waveNum >= u.wave).map(u => u.type);
    const queue = [];

    let remaining = baseCount;
    while (remaining > 0) {
      const type = choose(available);
      const count = Math.min(remaining, randInt(2, 5));
      for (let i = 0; i < count; i++) {
        queue.push({
          type,
          interval: type === 'fast' ? 0.3 : type === 'tank' ? 1.0 : 0.6,
          waveMult: { hp: hpMult, speed: speedMult, reward: rewardMult, armor: armorBonus },
        });
      }
      remaining -= count;
    }

    if (isBoss) {
      queue.push({
        type: 'boss',
        interval: 1.5,
        waveMult: { hp: hpMult * 0.5, speed: 1, reward: rewardMult * 2, armor: armorBonus },
      });
    }

    return queue;
  }

  startWave() {
    this.currentWave++;
    this.spawnQueue = this.generateWave(this.currentWave);
    this.spawnTimer = 0.5;
    this.waveActive = true;
  }

  update(dt) {
    if (!this.waveActive || this.spawnQueue.length === 0) return null;

    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0 && this.spawnQueue.length > 0) {
      const next = this.spawnQueue.shift();
      this.spawnTimer = next.interval;
      return next;
    }
    return null;
  }

  isSpawningDone() {
    return this.waveActive && this.spawnQueue.length === 0;
  }

  getPreview() {
    const nextWave = this.currentWave + 1;
    const queue = this.generateWave(nextWave);
    const counts = {};
    for (const e of queue) {
      counts[e.type] = (counts[e.type] || 0) + 1;
    }
    return counts;
  }
}
