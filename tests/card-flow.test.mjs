import { test } from 'node:test';
import assert from 'node:assert/strict';
import './shim.mjs';

const { RunCards, drawOffer, CARD_DEFS } = await import('../js/cards.js');
const { CONFIG, TOWER_DEFS } = await import('../js/config.js');

const ALL = Object.keys(TOWER_DEFS);

test('a cleared wave opens the seeded offer', () => {
  const cards = new RunCards();
  assert.equal(cards.offer, null);
  cards.openOffer(11, 1, ALL);
  assert.deepEqual(cards.offer, drawOffer(11, 1, ALL));
});

test('the last wave opens no offer', () => {
  const cards = new RunCards();
  cards.openOffer(11, CONFIG.MAX_WAVES, ALL);
  assert.equal(cards.offer, null);
});

test('choosing records the card and closes the offer', () => {
  const cards = new RunCards();
  cards.openOffer(11, 2, ALL);
  const id = cards.offer[1];
  const result = cards.choose(1);
  assert.deepEqual(result, { id, gold: 0 });
  assert.equal(cards.count(id), 1);
  assert.equal(cards.offer, null);
});

test('choosing a capped card pays the wave gold', () => {
  const cards = new RunCards();
  cards.openOffer(11, 3, ALL);
  const id = cards.offer[0];
  cards.picks[id] = CARD_DEFS[id].max;
  const { gold } = cards.choose(0);
  assert.equal(gold, cards.cappedGold(3));
  assert.equal(cards.count(id), CARD_DEFS[id].max);
});

test('choosing without an offer, or out of range, does nothing', () => {
  const cards = new RunCards();
  assert.equal(cards.choose(0), null);
  cards.openOffer(11, 4, ALL);
  assert.equal(cards.choose(5), null);
  assert.notEqual(cards.offer, null);
});
