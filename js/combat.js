// Combat resolution shared by the game and the balance simulator.
// No DOM: visual effects go through the ctx callbacks.
//   ctx = { spatialHash, onHit(target, proj), onSplash(target, proj), onChain(from, to) }
import { CONFIG } from './config.js';
import { distance } from './utils.js';

/** @param {import('./projectile.js').Projectile} proj */
export function resolveHit(proj, ctx) {
  const target = proj.target;
  if (!target || !target.active) return;

  target.takeDamage(proj.damage, proj.towerType);

  if (proj.slowAmount > 0) {
    target.applyEffect('slow', proj.slowDuration, proj.slowAmount);
  }

  if (proj.splashRadius > 0) {
    const radius = proj.splashRadius * CONFIG.TILE_SIZE;
    const nearby = ctx.spatialHash.query(target.x, target.y, radius);
    for (const e of nearby) {
      if (e === target || !e.active) continue;
      const d = distance(target.x, target.y, e.x, e.y);
      const falloff = 1 - (d / radius) * proj.splashDecay;
      if (falloff > 0) e.takeDamage(proj.damage * falloff, proj.towerType);
    }
    ctx.onSplash?.(target, proj);
  }

  if (proj.chainCount > 0) chainLightning(target, proj, ctx);

  ctx.onHit?.(target, proj);
}

/** @param {import('./enemy.js').Enemy} firstTarget @param {import('./projectile.js').Projectile} proj */
export function chainLightning(firstTarget, proj, ctx) {
  const visited = new Set([firstTarget]);
  let current = firstTarget;
  let dmg = proj.damage;
  const chainRange = proj.chainRange * CONFIG.TILE_SIZE;

  for (let i = 0; i < proj.chainCount; i++) {
    dmg *= proj.chainDecay;
    const nearby = ctx.spatialHash.query(current.x, current.y, chainRange);
    let next = null;
    let minDist = Infinity;
    for (const e of nearby) {
      if (!e.active || visited.has(e)) continue;
      const d = distance(current.x, current.y, e.x, e.y);
      if (d < minDist) { minDist = d; next = e; }
    }
    if (!next) break;
    visited.add(next);
    next.takeDamage(dmg, 'lightning');
    ctx.onChain?.(current, next);
    current = next;
  }
}

// Auras do not stack: a tower takes the strongest Support bonus in range
/** @param {import('./tower.js').Tower[]} towers */
export function updateSynergies(towers) {
  for (const tower of towers) {
    let damageAmp = 0, fireRateAmp = 0;
    for (const other of towers) {
      if (other === tower || other.type !== 'support') continue;
      const d = distance(tower.x, tower.y, other.x, other.y);
      if (d <= other.currentStats.buffRange * CONFIG.TILE_SIZE) {
        damageAmp = Math.max(damageAmp, other.currentStats.damageAmp || 0);
        fireRateAmp = Math.max(fireRateAmp, other.currentStats.fireRateAmp || 0);
      }
    }
    tower.damageMultiplier = 1 + damageAmp;
    tower.fireRateMultiplier = 1 + fireRateAmp;
  }
}
