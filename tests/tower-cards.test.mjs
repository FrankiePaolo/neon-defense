import { test } from 'node:test';
import assert from 'node:assert/strict';
import './shim.mjs';

const { RunCards } = await import('../js/cards.js');
const { Tower } = await import('../js/tower.js');
const { TOWER_DEFS } = await import('../js/config.js');

test('a tower built after a pick has the card in its stats', () => {
  const cards = new RunCards();
  cards.pick('allDamage', 1);
  const tower = new Tower('blaster', 1, 1, cards);
  assert.ok(tower.currentStats.damage > TOWER_DEFS.blaster.damage);
});

test('cards apply on top of path upgrades', () => {
  const cards = new RunCards();
  cards.pick('allDamage', 1);
  const plain = new Tower('blaster', 1, 1);
  const carded = new Tower('blaster', 2, 1, cards);
  plain.upgrade('B');
  carded.upgrade('B');
  assert.ok(carded.currentStats.damage > plain.currentStats.damage);
  assert.ok(plain.currentStats.damage > TOWER_DEFS.blaster.damage);
});

test('refreshStats gives an existing tower a new pick', () => {
  const cards = new RunCards();
  const tower = new Tower('cannon', 1, 1, cards);
  const before = tower.currentStats.splashRadius;
  cards.pick('cannonSplash', 1);
  tower.refreshStats();
  assert.ok(tower.currentStats.splashRadius > before);
});

test('cards never change the tower definition', () => {
  const cards = new RunCards();
  cards.pick('allRange', 1);
  const range = TOWER_DEFS.sniper.range;
  new Tower('sniper', 1, 1, cards);
  assert.equal(TOWER_DEFS.sniper.range, range);
});
