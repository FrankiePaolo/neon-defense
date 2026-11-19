// Upgrade cards: after each cleared wave the player picks one of OFFER_SIZE
// cards, which lasts the whole run. DOM-free, shared with the balance simulator.
//
// The offer for a wave depends only on the seed, the wave and the unlocked
// towers, never on earlier picks, so two players on the same challenge see the
// same offers all run. A card at its cap still appears and pays gold instead.
import { mulberry32 } from './utils.js';
import { waveBonusGold } from './waves.js';
import { CONFIG } from './config.js';

export const OFFER_SIZE = 3;

/**
 * @typedef {Object} CardDef
 * @property {string} [tower]  only this tower type; absent means every tower
 * @property {string} [stat]   the stat it changes
 * @property {number} [mult]   stat grows by this fraction per stack
 * @property {number} [add]    stat grows by this amount per stack
 * @property {number} [killGold] kill gold grows by this fraction per stack
 * @property {number} max      stacks before it pays gold instead
 */

/** @type {Record<string, CardDef>} */
export const CARD_DEFS = {
  blasterRate:    { tower: 'blaster',   stat: 'fireRate',     mult: 0.06, max: 3 },
  frostSlow:      { tower: 'frost',     stat: 'slowAmount',   add: 0.04,  max: 3 },
  lightningArc:   { tower: 'lightning', stat: 'chainDecay',   add: 0.03,  max: 2 },
  cannonSplash:   { tower: 'cannon',    stat: 'splashRadius', mult: 0.1,  max: 3 },
  sniperDamage:   { tower: 'sniper',    stat: 'damage',       mult: 0.15, max: 3 },
  supportRange:   { tower: 'support',   stat: 'buffRange',    add: 0.5,   max: 2 },
  allDamage:      { stat: 'damage',   mult: 0.05, max: 3 },
  allRate:        { stat: 'fireRate', mult: 0.05, max: 3 },
  allRange:       { stat: 'range',    mult: 0.04, max: 2 },
  bounty:         { killGold: 0.1, max: 3 },
};

// Its own stream of the seed, apart from the map and the waves
const CARD_SALT = 0x5EED_CA4D;

/**
 * @param {number | null} seed  null draws from Math.random (the balance simulator)
 * @param {number} wave
 * @param {string[]} unlocked  tower types the player can build
 * @returns {string[]}
 */
export function drawOffer(seed, wave, unlocked) {
  const rng = seed === null ? Math.random : mulberry32((seed ^ CARD_SALT ^ Math.imul(wave, 0x9E3779B1)) >>> 0);
  const pool = Object.keys(CARD_DEFS).filter(id => {
    const tower = CARD_DEFS[id].tower;
    return !tower || unlocked.includes(tower);
  });
  for (let i = 0; i < OFFER_SIZE; i++) {
    const j = i + Math.floor(rng() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, OFFER_SIZE);
}

// Frost can never stop an enemy outright
const SLOW_CAP = 0.9;

export class RunCards {
  constructor() {
    /** @type {Record<string, number>} */
    this.picks = {};
    // The cards on offer after a cleared wave, until one is chosen
    /** @type {string[] | null} */
    this.offer = null;
    this.offerWave = 0;
  }

  // After a cleared wave; the last wave ends the run, so it offers nothing
  /** @param {number | null} seed @param {number} wave @param {string[]} unlocked */
  openOffer(seed, wave, unlocked) {
    this.offer = wave < CONFIG.MAX_WAVES ? drawOffer(seed, wave, unlocked) : null;
    this.offerWave = wave;
  }

  // Takes the card at index from the offer. Returns its id and the gold it
  // pays, or null when there is no such card on offer.
  /** @param {number} index @returns {{ id: string, gold: number } | null} */
  choose(index) {
    const id = this.offer?.[index];
    if (!id) return null;
    this.offer = null;
    return { id, gold: this.pick(id, this.offerWave) };
  }

  /** @param {string} id */
  count(id) { return this.picks[id] || 0; }

  /** @param {string} id */
  isCapped(id) { return this.count(id) >= CARD_DEFS[id].max; }

  // Gold a capped card pays on this wave
  /** @param {number} wave */
  cappedGold(wave) { return waveBonusGold(wave); }

  // Records a pick. Returns the gold it pays: 0, or the capped payout.
  /** @param {string} id @param {number} wave */
  pick(id, wave) {
    if (this.isCapped(id)) return this.cappedGold(wave);
    this.picks[id] = this.count(id) + 1;
    return 0;
  }

  // Applies the picked cards to a tower's stats, in place, and returns them
  /** @template {Record<string, any>} T @param {T} stats @param {string} type @returns {T} */
  apply(stats, type) {
    /** @type {Record<string, any>} */
    const s = stats;
    for (const id in this.picks) {
      const def = CARD_DEFS[id];
      const n = this.picks[id];
      if (!def.stat || (def.tower && def.tower !== type)) continue;
      if (typeof s[def.stat] !== 'number') continue;
      if (def.mult) s[def.stat] *= 1 + def.mult * n;
      if (def.add) s[def.stat] += def.add * n;
    }
    if (typeof s.slowAmount === 'number') s.slowAmount = Math.min(SLOW_CAP, s.slowAmount);
    return stats;
  }

  killGoldMult() {
    let mult = 1;
    for (const id in this.picks) mult += (CARD_DEFS[id].killGold || 0) * this.picks[id];
    return mult;
  }
}
