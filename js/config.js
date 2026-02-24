export const IS_MOBILE = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
export const SHADOW_BLUR_SCALE = IS_MOBILE ? 0.3 : 1.0;

export const CONFIG = {
  GRID_COLS: 20,
  GRID_ROWS: 15,
  TILE_SIZE: 40,
  get CANVAS_WIDTH() { return this.GRID_COLS * this.TILE_SIZE; },
  get CANVAS_HEIGHT() { return this.GRID_ROWS * this.TILE_SIZE; },
  BASE_LIVES: 20,
  START_GOLD: 100,
  INTEREST_RATE: 0.05,
  INTEREST_CAP: 500,
  MAX_WAVES: 35,
  BOSS_INTERVAL: 5,
  SELL_REFUND_RATE: 0.7,
  SYNERGY_RANGE: 3,
};

export const COLORS = {
  BACKGROUND: '#0a0a0a',
  GRID_LINE: '#1a1a2e',
  PATH: '#16213e',
  PATH_BORDER: '#0f3460',
  PATH_GLOW: 'rgba(15, 52, 96, 0.4)',
  ENTRY: '#00ff66',
  EXIT: '#ff4444',
  VALID_PLACEMENT: 'rgba(0, 255, 100, 0.15)',
  INVALID_PLACEMENT: 'rgba(255, 0, 0, 0.15)',
  TOWER_RANGE: 'rgba(0, 255, 255, 0.06)',
};

export const TOWER_DEFS = {
  blaster: {
    name: 'Blaster', cost: 50, color: '#00ffff', glowColor: '#00ccff',
    shape: 'diamond', range: 3.5, damage: 10, fireRate: 1.5,
    projectileSpeed: 400, targeting: 'first',
    description: 'Balanced all-rounder',
    upgrades: {
      pathA: {
        name: 'Rapid Fire',
        levels: [
          { cost: 75, stats: { fireRate: 2.0 }, desc: '+33% fire rate' },
          { cost: 150, stats: { fireRate: 3.0 }, desc: '+100% fire rate' },
          { cost: 300, stats: { fireRate: 4.5, damage: 15 }, desc: 'Overclocked' },
        ]
      },
      pathB: {
        name: 'Heavy Rounds',
        levels: [
          { cost: 75, stats: { damage: 18 }, desc: '+80% damage' },
          { cost: 150, stats: { damage: 30 }, desc: '+200% damage' },
          { cost: 300, stats: { damage: 50, range: 4.5 }, desc: 'Armor-piercing' },
        ]
      }
    }
  },
  frost: {
    name: 'Frost', cost: 60, color: '#88ccff', glowColor: '#4488ff',
    shape: 'hexagon', range: 3.0, damage: 3, fireRate: 1.0,
    projectileSpeed: 300, targeting: 'first',
    slowAmount: 0.4, slowDuration: 2.0,
    description: 'Slows enemies',
    upgrades: {
      pathA: {
        name: 'Deep Freeze',
        levels: [
          { cost: 80, stats: { slowAmount: 0.5 }, desc: '50% slow' },
          { cost: 160, stats: { slowAmount: 0.6, slowDuration: 3.0 }, desc: '60% slow' },
          { cost: 320, stats: { slowAmount: 0.75 }, desc: 'AoE freeze pulse' },
        ]
      },
      pathB: {
        name: 'Frostbite',
        levels: [
          { cost: 80, stats: { damage: 8 }, desc: 'Frostbite damage' },
          { cost: 160, stats: { damage: 15 }, desc: '+20% vuln (brittle)' },
          { cost: 320, stats: { damage: 25 }, desc: '+35% vuln (shatter)' },
        ]
      }
    }
  },
  lightning: {
    name: 'Lightning', cost: 80, color: '#ffff00', glowColor: '#ffcc00',
    shape: 'triangle', range: 3.0, damage: 8, fireRate: 0.8,
    chainCount: 3, chainRange: 2.0, chainDecay: 0.7,
    targeting: 'closest',
    description: 'Chain arcs between enemies',
    upgrades: {
      pathA: {
        name: 'Storm',
        levels: [
          { cost: 100, stats: { chainCount: 5 }, desc: '5 chain targets' },
          { cost: 200, stats: { chainCount: 7, chainDecay: 0.8 }, desc: '7 chains' },
          { cost: 400, stats: { chainCount: 10 }, desc: 'Storm strike AoE' },
        ]
      },
      pathB: {
        name: 'Overload',
        levels: [
          { cost: 100, stats: { damage: 15 }, desc: 'High voltage' },
          { cost: 200, stats: { damage: 25 }, desc: '15% stun chance' },
          { cost: 400, stats: { damage: 40 }, desc: '30% stun' },
        ]
      }
    }
  },
  cannon: {
    name: 'Cannon', cost: 90, color: '#ff00ff', glowColor: '#cc00cc',
    shape: 'square', range: 3.5, damage: 30, fireRate: 0.5,
    splashRadius: 1.5, splashDecay: 0.5, projectileSpeed: 250,
    targeting: 'strongest',
    description: 'AoE splash damage',
    upgrades: {
      pathA: {
        name: 'Bombardment',
        levels: [
          { cost: 100, stats: { splashRadius: 2.0 }, desc: 'Wider explosions' },
          { cost: 200, stats: { splashRadius: 2.5, fireRate: 0.65 }, desc: 'Carpet bomb' },
          { cost: 400, stats: { splashRadius: 3.0 }, desc: 'Napalm rounds' },
        ]
      },
      pathB: {
        name: 'Demolisher',
        levels: [
          { cost: 100, stats: { damage: 50 }, desc: 'HE shells' },
          { cost: 200, stats: { damage: 80 }, desc: 'Shreds 30% armor' },
          { cost: 400, stats: { damage: 130 }, desc: 'Critical strikes' },
        ]
      }
    }
  },
  sniper: {
    name: 'Sniper', cost: 100, color: '#00ff66', glowColor: '#00cc44',
    shape: 'octagon', range: 6.0, damage: 50, fireRate: 0.3,
    projectileSpeed: 800, targeting: 'strongest',
    description: 'Extreme range, high damage',
    upgrades: {
      pathA: {
        name: 'Marksman',
        levels: [
          { cost: 120, stats: { range: 7.5 }, desc: 'Extended range' },
          { cost: 240, stats: { range: 9.0, damage: 75 }, desc: 'Eagle eye' },
          { cost: 480, stats: { range: 100, damage: 120 }, desc: 'Infinite range' },
        ]
      },
      pathB: {
        name: 'Assassin',
        levels: [
          { cost: 120, stats: { damage: 80 }, desc: 'Hollow-point' },
          { cost: 240, stats: { damage: 130 }, desc: 'Execute < 30% HP' },
          { cost: 480, stats: { damage: 200 }, desc: 'Death mark' },
        ]
      }
    }
  },
  support: {
    name: 'Support', cost: 120, color: '#ffffff', glowColor: '#aaaaff',
    shape: 'circle', range: 2.5, damage: 0, fireRate: 0,
    damageAmp: 0.15, buffRange: 2.5,
    description: 'Buffs nearby towers',
    upgrades: {
      pathA: {
        name: 'Command',
        levels: [
          { cost: 100, stats: { damageAmp: 0.25 }, desc: '+25% damage amp' },
          { cost: 200, stats: { damageAmp: 0.35, buffRange: 3.0 }, desc: 'Wider aura' },
          { cost: 400, stats: { damageAmp: 0.5 }, desc: '+50% dmg +20% rate' },
        ]
      },
      pathB: {
        name: 'Economy',
        levels: [
          { cost: 100, stats: { goldPerWave: 20 }, desc: '+20 gold/wave' },
          { cost: 200, stats: { goldPerWave: 50 }, desc: '+50 gold/wave' },
          { cost: 400, stats: { goldPerWave: 100 }, desc: '+100g +10% sell' },
        ]
      }
    }
  },
};

export const ENEMY_DEFS = {
  basic:    { name: 'Drone',    hp: 30,   speed: 60,  armor: 0, reward: 5,   color: '#ff4444', shape: 'circle',   size: 8 },
  fast:     { name: 'Scout',    hp: 15,   speed: 120, armor: 0, reward: 4,   color: '#ff8844', shape: 'triangle', size: 6 },
  tank:     { name: 'Brute',    hp: 150,  speed: 30,  armor: 0, reward: 15,  color: '#aa44aa', shape: 'square',   size: 12 },
  armored:  { name: 'Sentinel', hp: 80,   speed: 45,  armor: 5, reward: 12,  color: '#888888', shape: 'pentagon', size: 10 },
  healer:   { name: 'Medic',    hp: 40,   speed: 50,  armor: 0, reward: 20,  color: '#44ff44', shape: 'cross',    size: 8,  healRange: 2, healAmount: 5, healInterval: 1.0 },
  splitter: { name: 'Hydra',    hp: 60,   speed: 50,  armor: 0, reward: 8,   color: '#44ffff', shape: 'diamond',  size: 10, splitCount: 2, splitType: 'basic' },
  flying:   { name: 'Wraith',   hp: 35,   speed: 70,  armor: 0, reward: 10,  color: '#ff44ff', shape: 'triangle', size: 7,  flying: true },
  boss:     { name: 'Overlord', hp: 1000, speed: 20,  armor: 3, reward: 200, color: '#ff0000', shape: 'hexagon',  size: 18, bossRegen: 2 },
  stealth:  { name: 'Phantom',  hp: 25,   speed: 80,  armor: 0, reward: 15,  color: '#666666', shape: 'circle',   size: 6,  stealth: true, revealRange: 2.0 },
  shielded: { name: 'Guardian', hp: 60,   speed: 40,  armor: 0, reward: 18,  color: '#4488ff', shape: 'octagon',  size: 10, shield: 40, shieldRegen: 3, shieldRegenDelay: 3.0 },
};

export const PARTICLE_PRESETS = {
  hit:       { count: 5,  speed: 80,  spread: 1,   life: 0.3, size: 3, gravity: 0 },
  death:     { count: 15, speed: 120, spread: 1,   life: 0.5, size: 4, gravity: 50 },
  explosion: { count: 25, speed: 150, spread: 1,   life: 0.6, size: 5, gravity: 30 },
  frost:     { count: 8,  speed: 40,  spread: 0.5, life: 0.4, size: 3, gravity: -20 },
  lightning: { count: 3,  speed: 200, spread: 0.3, life: 0.15, size: 2, gravity: 0 },
};
