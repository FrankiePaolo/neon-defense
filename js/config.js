export const IS_MOBILE = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
export const SHADOW_BLUR_SCALE = IS_MOBILE ? 0.3 : 1.0;

export const CONFIG = {
  GRID_COLS: IS_MOBILE ? 12 : 20,
  GRID_ROWS: IS_MOBILE ? 9 : 15,
  TILE_SIZE: 40,
  get CANVAS_WIDTH() { return this.GRID_COLS * this.TILE_SIZE; },
  get CANVAS_HEIGHT() { return this.GRID_ROWS * this.TILE_SIZE; },
  BASE_LIVES: 20,
  START_GOLD: 100,
  INTEREST_RATE: 0.04,
  INTEREST_CAP: 200,
  MAX_WAVES: 35,
  BOSS_INTERVAL: 5,
  SELL_REFUND_RATE: 0.7,
  SYNERGY_RANGE: 3,
};

export const COLORS = {
  BACKGROUND: '#0a0a0a',
  GRID_LINE: '#2a2a44',
  PATH: '#16213e',
  PATH_BORDER: '#0f3460',
  PATH_GLOW: 'rgba(15, 52, 96, 0.4)',
  ENTRY: '#00ff66',
  EXIT: '#ff4444',
  VALID_PLACEMENT: 'rgba(0, 255, 100, 0.35)',
  INVALID_PLACEMENT: 'rgba(255, 0, 0, 0.3)',
  TOWER_RANGE: 'rgba(0, 255, 255, 0.06)',
};

export const TOWER_DEFS = {
  blaster: {
    name: 'Blaster', cost: 80, color: '#00ffff', glowColor: '#00ccff',
    shape: 'diamond', range: 3.5, damage: 10, fireRate: 1.5,
    projectileSpeed: 400, targeting: 'first',
    description: 'Balanced all-rounder',
    unlockScore: 0,
    upgrades: {
      pathA: {
        name: 'Rapid Fire',
        levels: [
          { cost: 45, stats: { fireRate: 2.5 }, desc: '+67% fire rate' },
          { cost: 110, stats: { fireRate: 3.5, damage: 12 }, desc: '+133% fire rate' },
          { cost: 250, stats: { fireRate: 5.0, damage: 16 }, desc: 'Overclocked' },
        ]
      },
      pathB: {
        name: 'Heavy Rounds',
        levels: [
          { cost: 45, stats: { damage: 20 }, desc: '+100% damage' },
          { cost: 110, stats: { damage: 38 }, desc: '+280% damage' },
          { cost: 250, stats: { damage: 55, range: 4.0 }, desc: 'Armor-piercing' },
        ]
      }
    }
  },
  frost: {
    name: 'Frost', cost: 100, color: '#88ccff', glowColor: '#4488ff',
    shape: 'hexagon', range: 3.0, damage: 3, fireRate: 1.0,
    projectileSpeed: 300, targeting: 'first',
    slowAmount: 0.35, slowDuration: 2.0,
    description: 'Slows enemies',
    unlockScore: 500,
    upgrades: {
      pathA: {
        name: 'Deep Freeze',
        levels: [
          { cost: 55, stats: { slowAmount: 0.45 }, desc: '45% slow' },
          { cost: 130, stats: { slowAmount: 0.55, slowDuration: 2.5 }, desc: '55% slow' },
          { cost: 300, stats: { slowAmount: 0.65, range: 3.5 }, desc: 'AoE freeze pulse' },
        ]
      },
      pathB: {
        name: 'Frostbite',
        levels: [
          { cost: 55, stats: { damage: 8, fireRate: 1.2 }, desc: 'Frostbite damage' },
          { cost: 130, stats: { damage: 15, fireRate: 1.4 }, desc: '+20% vuln (brittle)' },
          { cost: 300, stats: { damage: 24, fireRate: 1.6 }, desc: '+30% vuln (shatter)' },
        ]
      }
    }
  },
  lightning: {
    name: 'Lightning', cost: 150, color: '#ffff00', glowColor: '#ffcc00',
    shape: 'triangle', range: 3.0, damage: 8, fireRate: 0.8,
    chainCount: 3, chainRange: 2.0, chainDecay: 0.7,
    targeting: 'closest',
    description: 'Chain arcs between enemies',
    unlockScore: 1500,
    upgrades: {
      pathA: {
        name: 'Storm',
        levels: [
          { cost: 80, stats: { chainCount: 4, chainRange: 2.2 }, desc: '4 chain targets' },
          { cost: 185, stats: { chainCount: 6, chainDecay: 0.75 }, desc: '6 chains, less decay' },
          { cost: 400, stats: { chainCount: 8, chainRange: 2.5 }, desc: 'Storm strike AoE' },
        ]
      },
      pathB: {
        name: 'Overload',
        levels: [
          { cost: 80, stats: { damage: 15 }, desc: 'High voltage' },
          { cost: 185, stats: { damage: 25 }, desc: '15% stun chance' },
          { cost: 400, stats: { damage: 40, fireRate: 1.0 }, desc: '30% stun' },
        ]
      }
    }
  },
  cannon: {
    name: 'Cannon', cost: 175, color: '#ff00ff', glowColor: '#cc00cc',
    shape: 'square', range: 3.5, damage: 30, fireRate: 0.5,
    splashRadius: 1.5, splashDecay: 0.5, projectileSpeed: 250,
    targeting: 'strongest',
    description: 'AoE splash damage',
    unlockScore: 3500,
    upgrades: {
      pathA: {
        name: 'Bombardment',
        levels: [
          { cost: 90, stats: { splashRadius: 2.0, damage: 38 }, desc: 'Wider explosions' },
          { cost: 210, stats: { splashRadius: 2.5, damage: 50, fireRate: 0.6 }, desc: 'Carpet bomb' },
          { cost: 425, stats: { splashRadius: 3.0, damage: 65 }, desc: 'Napalm rounds' },
        ]
      },
      pathB: {
        name: 'Demolisher',
        levels: [
          { cost: 90, stats: { damage: 50 }, desc: 'HE shells' },
          { cost: 210, stats: { damage: 85 }, desc: 'Shreds 30% armor' },
          { cost: 425, stats: { damage: 130 }, desc: 'Critical strikes' },
        ]
      }
    }
  },
  sniper: {
    name: 'Sniper', cost: 225, color: '#00ff66', glowColor: '#00cc44',
    shape: 'octagon', range: 6.0, damage: 50, fireRate: 0.3,
    projectileSpeed: 800, targeting: 'strongest',
    description: 'Extreme range, high damage',
    unlockScore: 6000,
    upgrades: {
      pathA: {
        name: 'Marksman',
        levels: [
          { cost: 110, stats: { range: 7.5 }, desc: 'Extended range' },
          { cost: 250, stats: { range: 9.0, damage: 70 }, desc: 'Eagle eye' },
          { cost: 500, stats: { range: 12.0, damage: 110 }, desc: 'Full-map range' },
        ]
      },
      pathB: {
        name: 'Assassin',
        levels: [
          { cost: 110, stats: { damage: 80 }, desc: 'Hollow-point' },
          { cost: 250, stats: { damage: 130 }, desc: 'Execute < 30% HP' },
          { cost: 500, stats: { damage: 190 }, desc: 'Death mark' },
        ]
      }
    }
  },
  support: {
    name: 'Support', cost: 200, color: '#ffffff', glowColor: '#aaaaff',
    shape: 'circle', range: 2.5, damage: 0, fireRate: 0,
    damageAmp: 0.15, buffRange: 2.5,
    description: 'Buffs nearby towers',
    unlockScore: 5000,
    upgrades: {
      pathA: {
        name: 'Command',
        levels: [
          { cost: 100, stats: { damageAmp: 0.20 }, desc: '+20% damage amp' },
          { cost: 225, stats: { damageAmp: 0.30, buffRange: 3.0 }, desc: 'Wider aura' },
          { cost: 450, stats: { damageAmp: 0.40 }, desc: '+40% dmg +15% rate' },
        ]
      },
      pathB: {
        name: 'Economy',
        levels: [
          { cost: 100, stats: { goldPerWave: 20 }, desc: '+20 gold/wave' },
          { cost: 225, stats: { goldPerWave: 45 }, desc: '+45 gold/wave' },
          { cost: 450, stats: { goldPerWave: 80 }, desc: '+80g +10% sell' },
        ]
      }
    }
  },
};

export const ENEMY_DEFS = {
  basic:    { name: 'Drone',    hp: 30,   speed: 60,  armor: 0, reward: 5,   color: '#ff4444', shape: 'circle',   size: 8 },
  fast:     { name: 'Scout',    hp: 20,   speed: 120, armor: 0, reward: 5,   color: '#ff8844', shape: 'triangle', size: 6 },
  tank:     { name: 'Brute',    hp: 120,  speed: 30,  armor: 0, reward: 15,  color: '#aa44aa', shape: 'square',   size: 12 },
  armored:  { name: 'Sentinel', hp: 70,   speed: 45,  armor: 3, reward: 12,  color: '#888888', shape: 'pentagon', size: 10 },
  healer:   { name: 'Medic',    hp: 45,   speed: 50,  armor: 0, reward: 20,  color: '#44ff44', shape: 'cross',    size: 8,  healRange: 2, healAmount: 3, healInterval: 1.0 },
  splitter: { name: 'Hydra',    hp: 55,   speed: 50,  armor: 0, reward: 8,   color: '#44ffff', shape: 'diamond',  size: 10, splitCount: 2, splitType: 'basic' },
  flying:   { name: 'Wraith',   hp: 40,   speed: 70,  armor: 0, reward: 10,  color: '#ff44ff', shape: 'triangle', size: 7,  flying: true },
  boss:     { name: 'Overlord', hp: 800,  speed: 20,  armor: 3, reward: 150, color: '#ff0000', shape: 'hexagon',  size: 18, bossRegen: 3 },
  stealth:  { name: 'Phantom',  hp: 35,   speed: 80,  armor: 0, reward: 15,  color: '#666666', shape: 'circle',   size: 6,  stealth: true, revealRange: 2.0 },
  shielded: { name: 'Guardian', hp: 55,   speed: 40,  armor: 0, reward: 18,  color: '#4488ff', shape: 'octagon',  size: 10, shield: 30, shieldRegen: 2, shieldRegenDelay: 3.0 },
};

export const PARTICLE_PRESETS = {
  hit:       { count: 5,  speed: 80,  spread: 1,   life: 0.3, size: 3, gravity: 0 },
  death:     { count: 15, speed: 120, spread: 1,   life: 0.5, size: 4, gravity: 50 },
  explosion: { count: 25, speed: 150, spread: 1,   life: 0.6, size: 5, gravity: 30 },
  frost:     { count: 8,  speed: 40,  spread: 0.5, life: 0.4, size: 3, gravity: -20 },
  lightning: { count: 3,  speed: 200, spread: 0.3, life: 0.15, size: 2, gravity: 0 },
};
