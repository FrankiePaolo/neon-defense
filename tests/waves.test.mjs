import { test } from 'node:test';
import assert from 'node:assert/strict';
import './shim.mjs';

const { WaveManager } = await import('../js/waves.js');
const { CONFIG } = await import('../js/config.js');

const hpOf = (manager, wave) => manager.generateWave(wave).map(e => e.waveMult.hp);

test('Hard HP leaves wave 1 at the Normal level', () => {
  const normal = new WaveManager(CONFIG.DIFFICULTY_HP.normal, 1, 5);
  const hard = new WaveManager(CONFIG.DIFFICULTY_HP.hard, 1, 5);
  assert.ok(CONFIG.DIFFICULTY_HP.hard > 1);
  assert.deepEqual(hpOf(hard, 1), hpOf(normal, 1));
  assert.ok(hpOf(hard, 2)[0] > hpOf(normal, 2)[0]);
});

test('Easy HP still lowers wave 1', () => {
  const normal = new WaveManager(CONFIG.DIFFICULTY_HP.normal, 1, 5);
  const easy = new WaveManager(CONFIG.DIFFICULTY_HP.easy, 1, 5);
  assert.ok(hpOf(easy, 1)[0] < hpOf(normal, 1)[0]);
});
