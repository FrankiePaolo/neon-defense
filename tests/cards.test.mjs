import { test } from 'node:test';
import assert from 'node:assert/strict';
import './shim.mjs';

const { CARD_DEFS, drawOffer, RunCards, OFFER_SIZE } = await import('../js/cards.js');
const { TOWER_DEFS } = await import('../js/config.js');

const ALL = Object.keys(TOWER_DEFS);

test('an offer has OFFER_SIZE distinct known cards', () => {
  for (let wave = 1; wave <= 34; wave++) {
    const offer = drawOffer(42, wave, ALL);
    assert.equal(offer.length, OFFER_SIZE);
    assert.equal(new Set(offer).size, OFFER_SIZE);
    for (const id of offer) assert.ok(CARD_DEFS[id], id);
  }
});

test('the same seed and wave give the same offer', () => {
  for (let wave = 1; wave <= 34; wave++) {
    assert.deepEqual(drawOffer(7, wave, ALL), drawOffer(7, wave, ALL));
  }
});

test('offers vary with the seed and the wave', () => {
  const bySeed = new Set();
  const byWave = new Set();
  for (let s = 0; s < 20; s++) bySeed.add(drawOffer(s, 3, ALL).join());
  for (let w = 1; w <= 20; w++) byWave.add(drawOffer(5, w, ALL).join());
  assert.ok(bySeed.size > 5);
  assert.ok(byWave.size > 5);
});

test('only cards for unlocked towers, plus global cards, are offered', () => {
  const unlocked = ['blaster'];
  for (let s = 0; s < 50; s++) {
    for (const id of drawOffer(s, 1, unlocked)) {
      const tower = CARD_DEFS[id].tower;
      assert.ok(!tower || unlocked.includes(tower), `${id} needs ${tower}`);
    }
  }
});

test('a pick stacks until its cap, then pays gold', () => {
  const cards = new RunCards();
  const id = 'allDamage';
  const max = CARD_DEFS[id].max;
  for (let i = 0; i < max; i++) {
    assert.equal(cards.isCapped(id), false);
    assert.equal(cards.pick(id, 4), 0);
  }
  assert.equal(cards.count(id), max);
  assert.equal(cards.isCapped(id), true);
  assert.ok(cards.pick(id, 4) > 0);
  assert.equal(cards.count(id), max);
});

test('earlier picks do not change later offers', () => {
  const cards = new RunCards();
  const before = drawOffer(99, 6, ALL);
  cards.pick(before[0], 5);
  assert.deepEqual(drawOffer(99, 6, ALL), before);
});

test('modifiers apply to their tower type only', () => {
  const cards = new RunCards();
  cards.pick('sniperDamage', 1);
  const sniper = cards.apply({ ...TOWER_DEFS.sniper }, 'sniper');
  const blaster = cards.apply({ ...TOWER_DEFS.blaster }, 'blaster');
  assert.ok(sniper.damage > TOWER_DEFS.sniper.damage);
  assert.equal(blaster.damage, TOWER_DEFS.blaster.damage);
});

test('global modifiers stack on every tower', () => {
  const cards = new RunCards();
  cards.pick('allRate', 1);
  cards.pick('allRate', 2);
  const one = new RunCards();
  one.pick('allRate', 1);
  const base = TOWER_DEFS.cannon.fireRate;
  const twice = cards.apply({ ...TOWER_DEFS.cannon }, 'cannon').fireRate;
  const once = one.apply({ ...TOWER_DEFS.cannon }, 'cannon').fireRate;
  assert.ok(once > base);
  assert.ok(twice > once);
});

test('a stat a tower lacks stays absent', () => {
  const cards = new RunCards();
  cards.pick('frostSlow', 1);
  const blaster = cards.apply({ ...TOWER_DEFS.blaster }, 'blaster');
  assert.equal(blaster.slowAmount, TOWER_DEFS.blaster.slowAmount);
});

test('kill gold grows with the bounty card', () => {
  const cards = new RunCards();
  assert.equal(cards.killGoldMult(), 1);
  cards.pick('bounty', 1);
  assert.ok(cards.killGoldMult() > 1);
});
