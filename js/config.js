export const IS_MOBILE = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
export const SHADOW_BLUR_SCALE = IS_MOBILE ? 0.3 : 1.0;

export const CONFIG = {
  GRID_COLS: 20,
  GRID_ROWS: 15,
  TILE_SIZE: 40,
  get CANVAS_WIDTH() { return this.GRID_COLS * this.TILE_SIZE; },
  get CANVAS_HEIGHT() { return this.GRID_ROWS * this.TILE_SIZE; },
  BASE_LIVES: 20,
  START_GOLD: 150,
  INTEREST_RATE: 0.03,
  INTEREST_CAP: 120,
  MAX_WAVES: 35,
  BOSS_INTERVAL: 5,
  SELL_REFUND_RATE: 0.6,
  // Gold for the first life bought back between waves; each repair in a run doubles it
  REPAIR_COST: 100,
  SYNERGY_RANGE: 3,
  // Minimum path length in tiles per difficulty, same on every grid
  DIFFICULTY: { easy: 46, normal: 32, hard: 21 },
  // Enemy HP multiplier per difficulty, on top of the wave curve
  DIFFICULTY_HP: { easy: 0.75, normal: 1, hard: 1 },
  // Kill reward multiplier per difficulty, on top of the wave curve
  DIFFICULTY_REWARD: { easy: 1, normal: 1, hard: 0.95 },
};

// Board shape for the next game: 9x12 on a phone-sized screen held upright,
// 12x9 on one held sideways, 20x15 otherwise. A phone is a touch screen or a
// window at most 768px wide (the phone layout in index.html). Under the Node
// shim innerHeight is undefined, so touch there would mean landscape.
// A challenge passes its board class ('phone' or 'desktop') to replay the
// sender's map; the way the device is held still decides wide or tall.
// Returns the board class.
/** @param {'phone' | 'desktop' | null} [board] @returns {'phone' | 'desktop'} */
export function chooseGridShape(board) {
  const phone = board ? board === 'phone' : IS_MOBILE || window.innerWidth <= 768;
  const portrait = window.innerHeight > window.innerWidth;
  [CONFIG.GRID_COLS, CONFIG.GRID_ROWS] = phone ? (portrait ? [9, 12] : [12, 9]) : (portrait && board ? [15, 20] : [20, 15]);
  return phone ? 'phone' : 'desktop';
}
chooseGridShape();

export const COLORS = {
  BACKGROUND: '#0a0a0a',
  GRID_LINE: '#2a2a44',
  PATH: '#16213e',
  PATH_BORDER: '#0f3460',
  PATH_GLOW: 'rgba(15, 52, 96, 0.4)',
  ENTRY: '#00ff66',
  EXIT: '#ff4444',
  TOWER_RANGE: 'rgba(0, 255, 255, 0.06)',
};

/**
 * Stats a tower has and its upgrades change. Each tower type uses a subset.
 * @typedef {object} TowerStats
 * @property {number} [range]
 * @property {number} [damage]
 * @property {number} [fireRate]
 * @property {number} [slowAmount]
 * @property {number} [slowDuration]
 * @property {number} [chainCount]
 * @property {number} [chainRange]
 * @property {number} [chainDecay]
 * @property {number} [splashRadius]
 * @property {number} [damageAmp]
 * @property {number} [fireRateAmp]
 * @property {number} [buffRange]
 * @property {number} [goldPerWave]
 */

/**
 * @typedef {object} UpgradePath
 * @property {string} name
 * @property {{ cost: number, stats: TowerStats }[]} levels
 */

/**
 * @typedef {TowerStats & {
 *   name: string, cost: number, color: string, glowColor: string, shape: string,
 *   projectileSpeed?: number, targeting?: string, splashDecay?: number,
 *   description: string, unlockCost: number,
 *   upgrades: { pathA: UpgradePath, pathB: UpgradePath },
 * }} TowerDef
 */

/** @type {Record<string, TowerDef>} */
export const TOWER_DEFS = {
  blaster: {
    name: 'Blaster', cost: 90, color: '#00ffff', glowColor: '#00ccff',
    shape: 'diamond', range: 3.5, damage: 10, fireRate: 1.5,
    projectileSpeed: 400, targeting: 'first',
    description: 'Balanced all-rounder',
    unlockCost: 0,
    upgrades: {
      pathA: {
        name: 'Rapid Fire',
        levels: [
          { cost: 100, stats: { fireRate: 3.8 } },
          { cost: 130, stats: { fireRate: 4.6, damage: 17 } },
          { cost: 160, stats: { fireRate: 6.0, damage: 27 } },
        ]
      },
      pathB: {
        name: 'Heavy Rounds',
        levels: [
          { cost: 100, stats: { damage: 25 } },
          { cost: 130, stats: { damage: 53 } },
          { cost: 160, stats: { damage: 107, range: 4.0 } },
        ]
      }
    }
  },
  frost: {
    name: 'Frost', cost: 130, color: '#88ccff', glowColor: '#4488ff',
    shape: 'hexagon', range: 3.0, damage: 5, fireRate: 1.0,
    projectileSpeed: 300, targeting: 'first',
    slowAmount: 0.2, slowDuration: 1.2,
    description: 'Slows enemies',
    unlockCost: 1,
    upgrades: {
      pathA: {
        name: 'Deep Freeze',
        levels: [
          { cost: 110, stats: { slowAmount: 0.26, slowDuration: 1.8, fireRate: 1.3 } },
          { cost: 140, stats: { slowAmount: 0.33, slowDuration: 2.2, fireRate: 1.6 } },
          { cost: 160, stats: { slowAmount: 0.43, slowDuration: 2.5, range: 3.5, fireRate: 2.2 } },
        ]
      },
      pathB: {
        name: 'Frostbite',
        levels: [
          { cost: 110, stats: { damage: 14, fireRate: 1.2 } },
          { cost: 140, stats: { damage: 30, fireRate: 1.4 } },
          { cost: 170, stats: { damage: 66, fireRate: 1.6 } },
        ]
      }
    }
  },
  lightning: {
    name: 'Lightning', cost: 175, color: '#ffff00', glowColor: '#ffcc00',
    shape: 'triangle', range: 3.0, damage: 20, fireRate: 0.8,
    chainCount: 3, chainRange: 2.0, chainDecay: 0.7,
    targeting: 'closest',
    description: 'Chain arcs between enemies',
    unlockCost: 5,
    upgrades: {
      pathA: {
        name: 'Storm',
        levels: [
          { cost: 130, stats: { chainCount: 4, chainRange: 2.2, damage: 36 } },
          { cost: 160, stats: { chainCount: 6, chainDecay: 0.75, damage: 56 } },
          { cost: 200, stats: { chainCount: 8, chainRange: 2.5, damage: 80 } },
        ]
      },
      pathB: {
        name: 'Overload',
        levels: [
          { cost: 130, stats: { damage: 40 } },
          { cost: 160, stats: { damage: 72 } },
          { cost: 200, stats: { damage: 98, fireRate: 1.0 } },
        ]
      }
    }
  },
  cannon: {
    name: 'Cannon', cost: 200, color: '#ff00ff', glowColor: '#cc00cc',
    shape: 'square', range: 3.5, damage: 30, fireRate: 0.5,
    splashRadius: 1.5, splashDecay: 0.5, projectileSpeed: 250,
    targeting: 'strongest',
    description: 'AoE splash damage',
    unlockCost: 20,
    upgrades: {
      pathA: {
        name: 'Bombardment',
        levels: [
          { cost: 140, stats: { splashRadius: 2.0, damage: 46 } },
          { cost: 175, stats: { splashRadius: 2.3, damage: 56, fireRate: 0.6 } },
          { cost: 215, stats: { splashRadius: 2.6, damage: 78 } },
        ]
      },
      pathB: {
        name: 'Demolisher',
        levels: [
          { cost: 140, stats: { damage: 50 } },
          { cost: 175, stats: { damage: 85 } },
          { cost: 215, stats: { damage: 140 } },
        ]
      }
    }
  },
  sniper: {
    name: 'Sniper', cost: 260, color: '#00ff66', glowColor: '#00cc44',
    shape: 'octagon', range: 6.0, damage: 100, fireRate: 0.3,
    projectileSpeed: 800, targeting: 'strongest',
    description: 'Extreme range, high damage',
    unlockCost: 25,
    upgrades: {
      pathA: {
        name: 'Marksman',
        levels: [
          { cost: 165, stats: { range: 7.5, damage: 165 } },
          { cost: 200, stats: { range: 9.0, damage: 290 } },
          { cost: 250, stats: { range: 12.0, damage: 640 } },
        ]
      },
      pathB: {
        name: 'Assassin',
        levels: [
          { cost: 165, stats: { damage: 175 } },
          { cost: 200, stats: { damage: 350 } },
          { cost: 250, stats: { damage: 720 } },
        ]
      }
    }
  },
  support: {
    name: 'Support', cost: 225, color: '#ffffff', glowColor: '#aaaaff',
    shape: 'circle', range: 2.5, damage: 0, fireRate: 0,
    damageAmp: 0.08, buffRange: 2.5,
    description: 'Buffs nearby towers',
    unlockCost: 15,
    upgrades: {
      pathA: {
        name: 'Command',
        levels: [
          { cost: 140, stats: { damageAmp: 0.13 } },
          { cost: 175, stats: { damageAmp: 0.19, buffRange: 3.0 } },
          { cost: 210, stats: { damageAmp: 0.25, fireRateAmp: 0.06 } },
        ]
      },
      pathB: {
        name: 'Economy',
        levels: [
          { cost: 150, stats: { goldPerWave: 30 } },
          { cost: 185, stats: { goldPerWave: 60 } },
          { cost: 225, stats: { goldPerWave: 100 } },
        ]
      }
    }
  },
};

/**
 * @typedef {object} EnemyDef
 * @property {string} name
 * @property {number} hp
 * @property {number} speed
 * @property {number} armor
 * @property {number} reward
 * @property {string} color
 * @property {string} shape
 * @property {number} size
 * @property {number} [healRange]
 * @property {number} [healShare]
 * @property {number} [healInterval]
 * @property {number} [splitCount]
 * @property {string} [splitType]
 * @property {boolean} [flying]
 * @property {number} [bossRegen]
 * @property {number} [lives]
 * @property {boolean} [stealth]
 * @property {number} [revealRange]
 * @property {number} [shield]
 * @property {number} [shieldRegen]
 * @property {number} [shieldRegenDelay]
 */

/** @type {Record<string, EnemyDef>} */
export const ENEMY_DEFS = {
  basic:    { name: 'Drone',    hp: 20,   speed: 60,  armor: 0, reward: 5,   color: '#ff4444', shape: 'circle',   size: 8 },
  fast:     { name: 'Scout',    hp: 20,   speed: 120, armor: 0, reward: 5,   color: '#ff8844', shape: 'triangle', size: 6 },
  tank:     { name: 'Brute',    hp: 150,  speed: 30,  armor: 0, reward: 15,  color: '#aa44aa', shape: 'square',   size: 12 },
  armored:  { name: 'Sentinel', hp: 240,  speed: 45,  armor: 5, reward: 12,  color: '#888888', shape: 'pentagon', size: 10 },
  healer:   { name: 'Medic',    hp: 200,  speed: 50,  armor: 0, reward: 20,  color: '#44ff44', shape: 'cross',    size: 8,  healRange: 2, healShare: 0.01, healInterval: 1.0 },
  splitter: { name: 'Hydra',    hp: 240,  speed: 50,  armor: 0, reward: 8,   color: '#44ffff', shape: 'diamond',  size: 10, splitCount: 2, splitType: 'basic' },
  flying:   { name: 'Wraith',   hp: 170,  speed: 70,  armor: 0, reward: 10,  color: '#ff44ff', shape: 'triangle', size: 7,  flying: true },
  boss:     { name: 'Overlord', hp: 1000, speed: 20,  armor: 5, reward: 150, color: '#ff0000', shape: 'hexagon',  size: 18, bossRegen: 5, lives: 5 },
  stealth:  { name: 'Phantom',  hp: 145,  speed: 80,  armor: 0, reward: 15,  color: '#666666', shape: 'circle',   size: 6,  stealth: true, revealRange: 2.0 },
  shielded: { name: 'Guardian', hp: 240,  speed: 40,  armor: 0, reward: 18,  color: '#4488ff', shape: 'octagon',  size: 10, shield: 50, shieldRegen: 2, shieldRegenDelay: 3.0 },
};

export const PARTICLE_PRESETS = {
  hit:       { count: 5,  speed: 80,  spread: 1,   life: 0.3, size: 3, gravity: 0 },
  death:     { count: 15, speed: 120, spread: 1,   life: 0.5, size: 4, gravity: 50 },
  explosion: { count: 25, speed: 150, spread: 1,   life: 0.6, size: 5, gravity: 30 },
  frost:     { count: 8,  speed: 40,  spread: 0.5, life: 0.4, size: 3, gravity: -20 },
  lightning: { count: 3,  speed: 200, spread: 0.3, life: 0.15, size: 2, gravity: 0 },
};
