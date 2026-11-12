import assert from 'node:assert/strict';
import { test } from 'node:test';

globalThis.window = {};
Object.defineProperty(globalThis, 'navigator', { value: { maxTouchPoints: 0 }, configurable: true });
const { WaveManager } = await import('../js/waves.js');

function counts(queue) {
  const result = {};
  for (const enemy of queue) result[enemy.type] = (result[enemy.type] || 0) + 1;
  return result;
}

test('preview matches actual spawns across all waves and difficulties', () => {
  for (const hpMult of [0.75, 1]) {
    const manager = new WaveManager(hpMult);
    const generate = manager.generateWave.bind(manager);
    let generated;
    let calls = 0;
    manager.generateWave = (wave) => {
      calls++;
      generated = structuredClone(generate(wave));
      return structuredClone(generated);
    };
    for (let wave = 1; wave <= 35; wave++) {
      const preview = manager.getPreview();
      assert.deepEqual(manager.getPreview(), preview);
      assert.equal(calls, wave, 'repeated previews must not reroll');
      assert.equal(preview.boss || 0, wave % 5 === 0 ? 1 : 0);
      manager.startWave();
      assert.equal(calls, wave, 'starting must reuse the previewed lineup');
      assert.equal(manager.currentWave, wave);
      assert.equal(manager.update(0.49), null);
      const spawned = [];
      while (!manager.isSpawningDone()) {
        const enemy = manager.update(spawned.length === 0 ? 0.02 : spawned.at(-1).interval);
        assert.ok(enemy);
        spawned.push(enemy);
      }
      assert.deepEqual(spawned, generated, 'preserve spawn order, intervals, and scaling');
      assert.deepEqual(counts(spawned), preview);
    }
  }
});

test('starting without a preview and creating a fresh game work independently', () => {
  const manager = new WaveManager();
  manager.startWave();
  assert.equal(manager.currentWave, 1);
  assert.equal(manager.spawnQueue.length, 7);
  manager.startWave();
  assert.equal(manager.currentWave, 2);
  assert.equal(manager.spawnQueue.length, 9);
  manager.getPreview();
  const fresh = new WaveManager();
  assert.deepEqual(fresh.getPreview(), { basic: 7 });
  assert.equal(fresh.currentWave, 0);
});
