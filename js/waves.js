import { CONFIG, ENEMY_DEFS } from './config.js';
import { choose, randInt } from './utils.js';

export const ENEMY_UNLOCK = [
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

// Wave scaling: one curve per stat. Tuned with scripts/simulate-balance.mjs.
export const WAVE = {
  COUNT_BASE: 6,          // enemies on wave 0
  COUNT_PER_WAVE: 1.6,    // extra enemies per wave
  HP_RATE: 1.09,          // HP multiplier grows by this factor each wave
  SPEED_SLOPE: 0.012,     // speed multiplier gained per wave
  SPEED_CAP: 1.4,         // speed multiplier never exceeds this
  ARMOR_START: 7,         // wave armor bonus counts waves after this one
  ARMOR_STEP: 3,          // one armor point every ARMOR_STEP waves
  ARMOR_CAP: 15,          // wave armor bonus never exceeds this
  REWARD_SLOPE: 0.04,     // kill reward multiplier gained per wave
  BONUS_BASE: 20,         // wave-clear gold on wave 0
  BONUS_PER_WAVE: 4,      // extra wave-clear gold per wave
  BOSS_HP: 470,           // boss HP before the wave HP multiplier
  BOSS_REWARD_MULT: 1,    // boss reward on top of the wave reward multiplier
};

// Only these types take the per-wave armor bonus
const ARMORED_TYPES = new Set(['armored', 'shielded', 'boss']);

export function waveBonusGold(wave) {
  return WAVE.BONUS_BASE + wave * WAVE.BONUS_PER_WAVE;
}

// Cores paid for clearing a wave: the wave number, doubled on a boss wave
export function waveCores(wave) {
  return wave % CONFIG.BOSS_INTERVAL === 0 ? 2 * wave : wave;
}

export function waveScaling(waveNum) {
  return {
    count: Math.floor(WAVE.COUNT_BASE + waveNum * WAVE.COUNT_PER_WAVE),
    hp: Math.pow(WAVE.HP_RATE, waveNum - 1),
    speed: Math.min(WAVE.SPEED_CAP, 1 + (waveNum - 1) * WAVE.SPEED_SLOPE),
    armor: Math.min(WAVE.ARMOR_CAP, Math.max(0, Math.floor((waveNum - WAVE.ARMOR_START) / WAVE.ARMOR_STEP))),
    reward: 1 + (waveNum - 1) * WAVE.REWARD_SLOPE,
  };
}

export class WaveManager {
  constructor(hpMult = 1) {
    this.hpMult = hpMult;
    this.currentWave = 0;
    this.spawnQueue = [];
    this.spawnTimer = 0;
    this.waveActive = false;
  }

  generateWave(waveNum) {
    const scale = waveScaling(waveNum);
    scale.hp *= this.hpMult;
    const isBoss = waveNum % CONFIG.BOSS_INTERVAL === 0;
    const waveMult = (type) => ({
      hp: scale.hp, speed: scale.speed, reward: scale.reward,
      armor: ARMORED_TYPES.has(type) ? scale.armor : 0,
    });

    const available = ENEMY_UNLOCK.filter(u => waveNum >= u.wave).map(u => u.type);
    const queue = [];

    let remaining = scale.count;
    while (remaining > 0) {
      const type = choose(available);
      const count = Math.min(remaining, randInt(2, 5));
      for (let i = 0; i < count; i++) {
        queue.push({
          type,
          interval: type === 'fast' ? 0.3 : type === 'tank' ? 1.0 : 0.6,
          waveMult: waveMult(type),
        });
      }
      remaining -= count;
    }

    if (isBoss) {
      queue.push({
        type: 'boss',
        interval: 1.5,
        waveMult: {
          ...waveMult('boss'),
          hp: scale.hp * WAVE.BOSS_HP / ENEMY_DEFS.boss.hp,
          speed: 1,
          reward: scale.reward * WAVE.BOSS_REWARD_MULT,
        },
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
