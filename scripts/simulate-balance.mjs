// Headless balance simulator. Runs the real wave, enemy, tower, projectile and
// combat code with scripted players and checks the balance targets in the
// wave-scaling, tower-balance and difficulty-levels specs.
//
//   npm run balance                       all grids, difficulties and players, then the checks
//   node scripts/simulate-balance.mjs --grid mobile|portrait|desktop --difficulty normal --player naive|sensible|upgrader [--without frost,support] [--seed 1] [--seeds 9]
//
// Each grid, difficulty and player runs on --seeds maps (seeds --seed, --seed+1, ...),
// the same maps for every player. Difficulty and tower-choice checks use the
// mean wave reached (a win counts as MAX_WAVES + 1): one map can swing the
// sensible player by 10 waves, which flips a median. Tower value pools all runs.

globalThis.window = {};
Object.defineProperty(globalThis, 'navigator', { value: { maxTouchPoints: 0 }, configurable: true });

const args = parseArgs(process.argv.slice(2));
const SEED = Number(args.seed ?? 1);
const SEEDS = Number(args.seeds ?? 9);
const TRACE = 'trace' in args;   // --trace 1 prints every purchase

// Seeded Math.random (mulberry32) before any map or wave is generated
let rngState = 0;
function reseed(seed) { rngState = seed >>> 0; }
Math.random = () => {
  rngState = (rngState + 0x6D2B79F5) >>> 0;
  let t = rngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const { CONFIG, TOWER_DEFS, ENEMY_DEFS } = await import('../js/config.js');
const { Grid } = await import('../js/grid.js');
const { SpatialHash } = await import('../js/pathfinding.js');
const { Enemy } = await import('../js/enemy.js');
const { Tower } = await import('../js/tower.js');
const { Projectile } = await import('../js/projectile.js');
const { WaveManager, ENEMY_UNLOCK, WAVE, waveBonusGold, waveCores } = await import('../js/waves.js');
const { repairCost } = await import('../js/economy.js');
const { resolveHit, updateSynergies } = await import('../js/combat.js');
const { maxPlausibleScore } = await import('../netlify/functions/scores.mjs');
const { gridToPixel, distance } = await import('../js/utils.js');

// mobile is the phone held sideways, portrait the phone held upright
const GRIDS = { mobile: [12, 9], portrait: [9, 12], desktop: [20, 15] };
const DIFFICULTIES = ['easy', 'normal', 'hard'];
const PLAYERS = ['naive', 'sensible'];
const DT = 1 / 60;
const ATTACKERS = ['blaster', 'frost', 'lightning', 'cannon', 'sniper'];
const UNLOCK_TARGETS = { frost: 2, lightning: 4, cannon: 7, support: 9, sniper: 11 };
// Towers that work through others: the sensible player keeps one of each,
// bought once it owns HELPER_AFTER attackers
const HELPERS = ['frost', 'support'];
const HELPER_AFTER = 3;
// An upgrade is bought before a new tower while it costs at most this many new towers
const UPGRADE_BUDGET = 2;

// ── Damage attribution ──
// Every point of HP or shield removed is credited to one tower. Damage dealt
// to a slowed enemy by another tower gives the slowing Frost its slow share;
// damage boosted by a Support aura gives the Support the boosted share.
let currentSource = null;
const realTakeDamage = Enemy.prototype.takeDamage;
Enemy.prototype.takeDamage = function (amount, type) {
  const before = this.hp + this.shield;
  realTakeDamage.call(this, amount, type);
  const dealt = before - (this.hp + this.shield);
  if (currentSource && dealt > 0) credit(currentSource, this, dealt);
};

function credit(tower, enemy, dealt) {
  const ledger = tower.ledger;
  if (!ledger) return;
  let own = dealt;
  if (tower.damageMultiplier > 1) {
    const boosted = dealt * (tower.damageMultiplier - 1) / tower.damageMultiplier;
    own -= boosted;
    const supports = tower.buffedBy || [];
    const totalAmp = supports.reduce((s, t) => s + (t.currentStats.damageAmp || 0), 0);
    for (const s of supports) addCredit(s, boosted * (s.currentStats.damageAmp || 0) / totalAmp, 'aura');
  }
  const slow = enemy.effects.get('slow');
  if (slow && enemy.slowedBy && enemy.slowedBy !== tower && enemy.slowedBy.ledger) {
    const share = own * slow.magnitude;
    own -= share;
    addCredit(enemy.slowedBy, share, 'slow');
  }
  addCredit(tower, own, 'own');
}
// ledger.damage is the total; own, slow and aura split it by source.
// slowTime (bench only) is enemy-seconds slowed times slow strength.
function addCredit(tower, amount, kind) {
  if (!tower.ledger) return;
  tower.ledger.damage += amount;
  tower.ledger[kind] += amount;
}
const newLedger = () => ({ damage: 0, own: 0, slow: 0, aura: 0, slowTime: 0 });

function hitWithAttribution(proj, ctx) {
  currentSource = proj.tower;
  resolveHit(proj, ctx);
  currentSource = null;
}

// The Frost whose slow an enemy carries gets the slow share of later damage
function markSlow(enemy, proj) {
  const slow = enemy.effects.get('slow');
  if (slow && slow.magnitude === proj.slowAmount) enemy.slowedBy = proj.tower;
}

// Auras do not stack, so the boost is credited to the strongest Support in range
function markBuffs(towers) {
  for (const tower of towers) {
    const inRange = towers.filter(o => o !== tower && o.type === 'support'
      && distance(tower.x, tower.y, o.x, o.y) <= o.currentStats.buffRange * CONFIG.TILE_SIZE);
    const amp = (s) => s.currentStats.damageAmp || 0;
    const strongest = inRange.reduce((best, s) => (!best || amp(s) > amp(best)) ? s : best, null);
    tower.buffedBy = strongest ? [strongest] : [];
  }
}

// Same cells, same iteration order and same results as SpatialHash, with
// numeric keys instead of strings (the string keys dominate the run time)
class FastSpatialHash extends SpatialHash {
  _key(x, y) { return Math.floor(x / this.cellSize) * 4096 + Math.floor(y / this.cellSize); }
  query(x, y, r) {
    const results = [];
    const minCX = Math.floor((x - r) / this.cellSize);
    const maxCX = Math.floor((x + r) / this.cellSize);
    const minCY = Math.floor((y - r) / this.cellSize);
    const maxCY = Math.floor((y + r) / this.cellSize);
    const r2 = r * r;
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cell = this.cells.get(cx * 4096 + cy);
        if (!cell) continue;
        for (const e of cell) {
          const dx = e.x - x, dy = e.y - y;
          if (dx * dx + dy * dy <= r2) results.push(e);
        }
      }
    }
    return results;
  }
}

// ── Map and tile scoring ──

function setGrid(name) {
  const [cols, rows] = GRIDS[name];
  CONFIG.GRID_COLS = cols;
  CONFIG.GRID_ROWS = rows;
}

function makeMap(gridName, difficulty, seed) {
  setGrid(gridName);
  reseed(seed);
  const grid = new Grid();
  grid.generate(CONFIG.DIFFICULTY[difficulty], Math.random, CONFIG.ROAD_MAX[difficulty]);
  return grid;
}

// Free tiles ranked by path tiles within range; ties go to the tile nearer
// the exit (or the entry, which is the tutorial's rule)
function rankTiles(grid, range, tieTo = 'exit') {
  const anchor = tieTo === 'entry' ? grid.entry : grid.exit;
  const r2 = range * range;
  const tiles = [];
  // Scan rows of a wide board, columns of a tall one, so the portrait board
  // (the landscape board turned) breaks ties exactly as the landscape one
  const tall = grid.rows > grid.cols;
  for (let a = 0; a < (tall ? grid.cols : grid.rows); a++) {
    for (let b = 0; b < (tall ? grid.rows : grid.cols); b++) {
      const x = tall ? a : b, y = tall ? b : a;
      if (!grid.isPlaceable(x, y)) continue;
      const covered = grid.path.filter(p => (p.x - x) ** 2 + (p.y - y) ** 2 <= r2).length;
      if (covered === 0) continue;
      tiles.push({ x, y, covered, dist: Math.abs(x - anchor.x) + Math.abs(y - anchor.y) });
    }
  }
  tiles.sort((a, b) => b.covered - a.covered || a.dist - b.dist);
  return tiles;
}

// ── One run ──

class Run {
  // player: 'naive', 'sensible', or 'upgrader' (the sensible rules with Heavy
  // Rounds Blasters only). without: tower types, comma separated, the sensible player never buys.
  // measure: false skips the stress tests that feed the tower value table.
  constructor({ gridName, difficulty, player, seed = SEED, maxWaves = CONFIG.MAX_WAVES, tieTo = 'exit', without = null, measure = true }) {
    this.grid = makeMap(gridName, difficulty, seed);
    this.gridName = gridName;
    this.difficulty = difficulty;
    this.player = player;
    this.seed = seed;
    const excluded = without ? without.split(',') : [];
    this.allowed = new Set(player === 'upgrader' ? ['blaster'] : Object.keys(TOWER_DEFS).filter(t => !excluded.includes(t)));
    this.without = without;
    this.measure = measure;
    this.tieTo = tieTo;
    this.maxWaves = maxWaves;
    this.pixelPath = this.grid.path.map(p => gridToPixel(p.x, p.y));
    this.spatialHash = new FastSpatialHash(80);
    this.ctx = { spatialHash: this.spatialHash, onSlow: markSlow };
    // Waves draw from the run seed as in the game, so a seed meets the same
    // waves on every board
    this.waveManager = new WaveManager(CONFIG.DIFFICULTY_HP[difficulty], CONFIG.DIFFICULTY_REWARD[difficulty], seed);
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.gold = CONFIG.START_GOLD;
    this.totalEarned = CONFIG.START_GOLD;
    this.score = 0;
    this.lives = CONFIG.BASE_LIVES;
    this.repairs = 0;
    this.killStreak = 0;
    this.killStreakTimer = 0;
    this.cores = 0;
    this.unlocked = new Set(['blaster']);
    this.unlockWave = { blaster: 1 };
    this.rows = [];
    this.value = {};       // stress-test damage and gold, per tower type and per 'type path' at level 3
    this.won = false;
  }

  earn(n) { this.gold += n; this.totalEarned += n; }

  isUnlocked(type) { return this.unlocked.has(type) && this.allowed.has(type); }

  // Unlocks the towers in UNLOCK_TARGETS order while the cores cover the next one
  spendCores() {
    for (const type of Object.keys(UNLOCK_TARGETS)) {
      if (this.unlocked.has(type)) continue;
      const cost = TOWER_DEFS[type].unlockCost;
      if (this.cores < cost) return;
      this.cores -= cost;
      this.unlocked.add(type);
      this.unlockWave[type] = this.waveManager.currentWave + 1;
    }
  }

  place(type, tile) {
    const tower = new Tower(type, tile.x, tile.y);
    this.gold -= TOWER_DEFS[type].cost;
    this.grid.placeTower(tile.x, tile.y, tower);
    this.towers.push(tower);
    if (TRACE) console.log(`  before wave ${this.waveManager.currentWave + 1}: buy ${type} at ${tile.x},${tile.y} (covers ${tile.covered})`);
    return tower;
  }

  bestTile(type) {
    return rankTiles(this.grid, TOWER_DEFS[type].range, this.tieTo)[0] || null;
  }

  // Free tile whose Support aura reaches the most gold of other towers, or
  // the best road tile when no tower is in reach
  supportTile() {
    const reach = TOWER_DEFS.support.buffRange ** 2;
    let best = null;
    for (const tile of rankTiles(this.grid, TOWER_DEFS.support.range, this.tieTo)) {
      const value = this.towers.filter(t => t.type !== 'support' && (t.gx - tile.x) ** 2 + (t.gy - tile.y) ** 2 <= reach)
        .reduce((s, t) => s + t.totalInvested, 0);
      if (!best || value > best.value) best = { ...tile, value };
    }
    return best && best.value > 0 ? best : this.bestTile('support');
  }

  // Free tile whose Frost range covers the road tiles that the most other
  // towers reach, so the slow lands in the kill zone
  frostTile() {
    const r2 = TOWER_DEFS.frost.range ** 2;
    const reach = this.grid.path.map(p => this.towers.filter(t => t.type !== 'support'
      && (p.x - t.gx) ** 2 + (p.y - t.gy) ** 2 <= t.currentStats.range ** 2).length);
    let best = null;
    for (const tile of rankTiles(this.grid, TOWER_DEFS.frost.range, this.tieTo)) {
      const value = this.grid.path.reduce((s, p, i) => s + ((p.x - tile.x) ** 2 + (p.y - tile.y) ** 2 <= r2 ? reach[i] : 0), 0);
      if (!best || value > best.value) best = { ...tile, value };
    }
    return best;
  }

  tryBuy(type) {
    const cost = TOWER_DEFS[type].cost;
    if (this.gold < cost || !this.isUnlocked(type)) return false;
    const tile = type === 'support' ? this.supportTile() : type === 'frost' ? this.frostTile() : this.bestTile(type);
    if (!tile) return false;
    this.place(type, tile);
    return true;
  }

  act() {
    if (this.player === 'naive') this.actNaive();
    else this.actSensible();   // the upgrader plays the same rules with Blasters only
  }

  // Buys a Blaster whenever it can afford one, never upgrades
  actNaive() {
    while (this.tryBuy('blaster')) { /* keep buying */ }
  }

  // Spends cores on the next unlock, places one Frost and one Support on the
  // first turn it can afford each once it owns HELPER_AFTER attackers (the
  // Frost in the kill zone, the Support where its aura reaches the most
  // towers), upgrades the tower that sees the most road
  // while the upgrade costs at most UPGRADE_BUDGET new towers, otherwise buys
  // the cheapest attacker it owns the fewest of, and buys back lives once
  // half are gone
  actSensible() {
    this.shop();
    while (this.lives <= CONFIG.BASE_LIVES / 2 && this.gold >= repairCost(this.repairs)) {
      this.gold -= repairCost(this.repairs);
      this.repairs++;
      this.lives++;
      if (TRACE) console.log(`  before wave ${this.waveManager.currentWave + 1}: repair to ${this.lives} lives`);
    }
  }

  shop() {
    this.spendCores();
    for (let guard = 0; guard < 100; guard++) {
      const owned = (type) => this.towers.filter(t => t.type === type).length;
      const unlocked = Object.keys(TOWER_DEFS).filter(t => this.isUnlocked(t));

      const attackers = this.towers.filter(t => !HELPERS.includes(t.type)).length;
      const helper = attackers >= HELPER_AFTER && HELPERS.find(t => unlocked.includes(t) && owned(t) === 0);
      if (helper && this.tryBuy(helper)) continue;

      const next = unlocked.filter(t => !HELPERS.includes(t)).sort((a, b) =>
        owned(a) - owned(b) || TOWER_DEFS[a].cost - TOWER_DEFS[b].cost)[0];
      const budget = UPGRADE_BUDGET * TOWER_DEFS[next].cost;

      const best = this.towers
        .filter(t => { const p = this.upgradePath(t); return p !== null && t.getUpgradeCost(p) <= budget; })
        .sort((a, b) => this.roadInRange(b) - this.roadInRange(a))[0];
      if (best) {
        const path = this.upgradePath(best);
        const cost = best.getUpgradeCost(path);
        if (this.gold < cost) return;
        this.gold -= cost;
        best.upgrade(path);
        if (TRACE) console.log(`  before wave ${this.waveManager.currentWave + 1}: upgrade ${best.type} ${path}${path === 'A' ? best.upgradesA : best.upgradesB}`);
        continue;
      }
      if (!this.tryBuy(next)) return;
    }
  }

  roadInRange(tower) {
    const r2 = tower.currentStats.range ** 2;
    return this.grid.path.filter(p => (p.x - tower.gx) ** 2 + (p.y - tower.gy) ** 2 <= r2).length;
  }

  // Alternates attacker paths between towers of the same type so both get
  // used. The one Frost takes path A on odd maps and B on even ones; the
  // Support takes Command, placed for its aura (Economy is income, checked by
  // its repayment, and no sensible buy while the defense leaks). The
  // upgrader takes Heavy Rounds.
  upgradePath(tower) {
    const index = this.towers.filter(t => t.type === tower.type).indexOf(tower);
    const path = tower.type === 'support' ? 'A'
      : tower.type === 'frost' ? (this.seed % 2 ? 'A' : 'B')
      : this.player === 'upgrader' || index % 2 === 0 ? 'B' : 'A';
    return tower.getUpgradeCost(path) === null ? null : path;
  }

  play() {
    while (this.waveManager.currentWave < this.maxWaves && this.lives > 0) {
      this.act();
      if (this.towers.length === 0) break;
      this.playWave();
    }
    return this;
  }

  playWave() {
    const scoreBefore = this.score;
    this.waveManager.startWave();
    const wave = this.waveManager.currentWave;
    let livesLost = 0;
    const leaked = {};
    let clearDelay = 0;
    let steps = 0;
    // Towers do not move during a wave, so the aura result is fixed
    updateSynergies(this.towers);
    markBuffs(this.towers);

    while (true) {
      steps++;
      const toSpawn = this.waveManager.update(DT);
      if (toSpawn) this.enemies.push(new Enemy(toSpawn.type, this.pixelPath, toSpawn.waveMult));

      this.spatialHash.clear();
      for (const e of this.enemies) this.spatialHash.insert(e);

      for (const tower of this.towers) {
        const target = tower.update(DT, this.enemies, this.spatialHash);
        if (target) this.projectiles.push(new Projectile({ x: tower.x, y: tower.y }, target, tower));
      }

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        const enemy = this.enemies[i];
        enemy.update(DT);
        if (enemy.healRange > 0) enemy.healNearby(this.enemies, DT);
        if (!enemy.active) {
          this.onKilled(enemy, wave);
          this.enemies.splice(i, 1);
        } else if (enemy.reachedEnd) {
          this.lives -= enemy.lifeCost;
          livesLost += enemy.lifeCost;
          leaked[enemy.type] = (leaked[enemy.type] || 0) + 1;
          this.enemies.splice(i, 1);
        }
      }

      for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i];
        const wasActive = proj.active;
        proj.update(DT);
        if (wasActive && !proj.active && proj.target) hitWithAttribution(proj, this.ctx);
        if (!proj.active) this.projectiles.splice(i, 1);
      }

      this.updateKillStreak(DT);

      if (this.waveManager.isSpawningDone() && this.enemies.length === 0) {
        clearDelay += DT;
        if (clearDelay >= 1.0) break;
      } else {
        clearDelay = 0;
      }
      if (this.lives <= 0) break;
      if (steps > 60 * 60 * 20) throw new Error(`wave ${wave} did not end`);
    }
    this.projectiles = [];
    if (TRACE && livesLost) console.log(`  wave ${wave} leaked: ${Object.entries(leaked).map(([t, n]) => `${n} ${t}`).join(', ')}`);
    if (this.measure && this.lives > 0 && STRESS_WAVES.includes(wave)) this.stress(wave + 1);

    if (this.lives > 0) {
      this.score += wave * 100;
      if (livesLost === 0) this.score += wave * 200;
      this.cores += waveCores(wave);
      this.earn(Math.min(Math.floor(this.gold * CONFIG.INTEREST_RATE), CONFIG.INTEREST_CAP));
      this.earn(waveBonusGold(wave));
      for (const t of this.towers) {
        if (t.type === 'support' && t.currentStats.goldPerWave) this.earn(t.currentStats.goldPerWave);
      }
      if (wave >= CONFIG.MAX_WAVES) { this.score += 5000; this.won = true; }
    }

    const ratio = buyableOverNeeded(wave, this.totalEarned);
    this.rows.push({
      wave, livesLost, lives: Math.max(0, this.lives), gold: this.gold, earned: this.totalEarned,
      towers: this.towers.length, upgrades: this.towers.reduce((s, t) => s + t.upgradesA + t.upgradesB, 0),
      score: this.score, waveScore: this.score - scoreBefore, ratio, cleared: this.lives > 0,
    });
  }

  onKilled(enemy, wave) {
    this.earn(enemy.reward);
    this.score += Math.floor(enemy.maxHp * (1 + wave * 0.1));
    this.killStreak++;
    this.killStreakTimer = 1.5;
    if (enemy.splitCount > 0 && enemy.splitType) {
      for (let i = 0; i < enemy.splitCount; i++) {
        const remaining = this.grid.path.slice(enemy.pathIndex).map(p => gridToPixel(p.x, p.y));
        if (remaining.length < 2) continue;
        const child = new Enemy(enemy.splitType, remaining, enemy.waveMult);
        // First offset along the board's long side, so the portrait run
        // mirrors the landscape run on the same seed
        const along = (Math.random() - 0.5) * 10, across = (Math.random() - 0.5) * 10;
        const tall = this.grid.rows > this.grid.cols;
        child.x = enemy.x + (tall ? across : along);
        child.y = enemy.y + (tall ? along : across);
        this.enemies.push(child);
      }
    }
  }

  updateKillStreak(dt) {
    if (this.killStreakTimer <= 0) return;
    this.killStreakTimer -= dt;
    if (this.killStreakTimer <= 0 && this.killStreak >= 8) {
      const bonus = Math.min(this.killStreak * 2, 15);
      this.earn(bonus);
      this.score += bonus;
      this.killStreak = 0;
    } else if (this.killStreakTimer <= 0) {
      this.killStreak = 0;
    }
  }

  get waveReached() { return this.waveManager.currentWave; }
  get reached() { return this.won ? CONFIG.MAX_WAVES + 1 : this.waveReached; }

  // Tower value on this player's own board: a copy of the board plays the
  // next wave with enemies that cannot die, so every tower deals what its
  // rate, range, placement and effects allow instead of competing for kills
  stress(nextWave) {
    const saved = rngState;
    const copies = this.towers.map(t => {
      const c = new Tower(t.type, t.gx, t.gy);
      for (let i = 0; i < t.upgradesA; i++) c.upgrade('A');
      for (let i = 0; i < t.upgradesB; i++) c.upgrade('B');
      c.ledger = newLedger();
      return c;
    });
    playFixed(this.grid, copies, [nextWave], 1000);
    rngState = saved;
    const add = (key, damage, gold) => {
      this.value[key] ??= { damage: 0, gold: 0 };
      this.value[key].damage += damage;
      this.value[key].gold += gold;
    };
    for (const c of copies) {
      add(c.type, c.ledger.damage, c.totalInvested);
      if (Math.max(c.upgradesA, c.upgradesB) === 3) add(`${c.type} ${c.upgradesA ? 'A' : 'B'}`, c.ledger.damage, c.totalInvested);
    }
  }
}

const outcome = (run) => run.won ? 'W' : String(run.waveReached);

// Runs one configuration on every seed and returns the median run, which
// carries all the runs in .seeds
function runMedian(opts) {
  const all = [];
  for (let i = 0; i < SEEDS; i++) all.push(new Run({ ...opts, seed: SEED + i }).play());
  const sorted = all.slice().sort((a, b) => a.reached - b.reached);
  const median = sorted[Math.floor(sorted.length / 2)];
  median.seeds = all;
  median.meanReached = all.reduce((s, r) => s + r.reached, 0) / all.length;
  median.wins = all.filter(r => r.won).length;
  return median;
}

// Stress-test damage per gold, pooled over runs: keys are tower types, or
// 'type path' for towers on level 3 of a path
function pooled(runs, paths) {
  const value = {};
  for (const run of runs) {
    for (const [key, v] of Object.entries(run.value)) {
      if (key.includes(' ') !== paths) continue;
      value[key] ??= { damage: 0, gold: 0 };
      value[key].damage += v.damage;
      value[key].gold += v.gold;
    }
  }
  for (const v of Object.values(value)) v.perGold = v.damage / v.gold;
  return value;
}
const pooledValue = (runs) => pooled(runs, false);
const pathValue = (runs) => pooled(runs, true);

// ── Buyable over needed DPS (the headless model) ──
// Buyable: gold earned up to the end of the wave spent on the most
// gold-efficient single-target tier of any attacker, on target 60% of the time.
// Needed: the wave's effective HP (armor and shields counted, Hydra children
// included) over its exposure (spawn time plus one traversal of the Normal
// path at the wave's mean speed), averaged over generated waves.

function bestDpsPerGold() {
  let best = 0;
  for (const type of ATTACKERS) {
    const def = TOWER_DEFS[type];
    for (const path of ['pathA', 'pathB']) {
      let stats = { damage: def.damage, fireRate: def.fireRate };
      let cost = def.cost;
      best = Math.max(best, stats.damage * stats.fireRate / cost);
      for (const level of def.upgrades[path].levels) {
        stats = { ...stats, ...level.stats };
        cost += level.cost;
        best = Math.max(best, stats.damage * stats.fireRate / cost);
      }
    }
  }
  return best;
}

function effectiveHp(type, mult) {
  const def = ENEMY_DEFS[type];
  const armor = def.armor + (mult.armor || 0);
  let hp = def.hp * (mult.hp || 1) + (def.shield ? def.shield * (mult.hp || 1) : 0);
  if (def.splitCount) hp += def.splitCount * ENEMY_DEFS[def.splitType].hp * (mult.hp || 1);
  return hp * (armor + 25) / 25;
}

function waveNeed(queue, pathTiles = CONFIG.DIFFICULTY.normal) {
  const hp = queue.reduce((s, e) => s + effectiveHp(e.type, e.waveMult), 0);
  const spawnTime = 0.5 + queue.slice(0, -1).reduce((s, e) => s + e.interval, 0);
  const meanSpeed = queue.reduce((s, e) => s + ENEMY_DEFS[e.type].speed * (e.waveMult.speed || 1), 0) / queue.length;
  const exposure = spawnTime + pathTiles * CONFIG.TILE_SIZE / meanSpeed;
  return { hp, exposure, dps: hp / exposure };
}

// Needed DPS per wave number, averaged over 200 generated waves as in the
// headless model, so the ratio does not swing with one wave's random mix
const needCache = new Map();
function averageNeed(wave) {
  if (!needCache.has(wave)) {
    const saved = rngState;
    reseed(9000 + wave);
    const wm = new WaveManager();
    let hp = 0, exposure = 0;
    for (let i = 0; i < 200; i++) {
      const need = waveNeed(wm.generateWave(wave));
      hp += need.hp; exposure += need.exposure;
    }
    rngState = saved;
    needCache.set(wave, hp / exposure);
  }
  return needCache.get(wave);
}

function buyableOverNeeded(wave, earned) {
  return earned * bestDpsPerGold() * 0.6 / averageNeed(wave);
}

// ── Upgrade path bench ──
// One tower on the best tile of a fixed phone Normal map against waves 15,
// 20 and 25 at their real HP, with lives ignored, so range, time on target
// and overkill all count. Frost and Support work through other towers, so
// they get two Heavy Rounds Blasters next to them. Value is credited damage
// per gold.

const BENCH_WAVES = [15, 20, 25];
const STRESS_WAVES = [15, 20, 25, 30];

// kind: 'damage' (total credited) or one ledger part ('own', 'slow', 'aura')
function benchValue(type, path, levels = 3, kind = 'damage') {
  const grid = makeMap('mobile', 'normal', 7);
  const range = TOWER_DEFS[type].range;
  const testTile = rankTiles(grid, range)[0];
  const tower = new Tower(type, testTile.x, testTile.y);
  for (let i = 0; i < levels; i++) tower.upgrade(path);
  tower.ledger = newLedger();
  grid.placeTower(testTile.x, testTile.y, tower);
  const towers = [tower];
  const near = type === 'frost' || type === 'support'
    ? rankTiles(grid, TOWER_DEFS.blaster.range)
      .filter(t => Math.hypot(t.x - testTile.x, t.y - testTile.y) <= TOWER_DEFS.support.buffRange)
      .slice(0, 2)
    : [];
  for (const tile of near) {
    const c = new Tower('blaster', tile.x, tile.y);
    for (let i = 0; i < 3; i++) c.upgrade('B');
    c.ledger = newLedger();
    grid.placeTower(tile.x, tile.y, c);
    towers.push(c);
  }

  playFixed(grid, towers, BENCH_WAVES, 1);
  return tower.ledger[kind] / tower.totalInvested;
}

// Plays the given waves against a fixed set of towers with lives ignored.
// toughness multiplies enemy HP (1000 makes them survive the whole path).
function playFixed(grid, towers, waves, toughness) {
  updateSynergies(towers);
  markBuffs(towers);
  const pixelPath = grid.path.map(p => gridToPixel(p.x, p.y));
  const hash = new FastSpatialHash(80);
  const ctx = { spatialHash: hash, onSlow: markSlow };
  for (const w of waves) {
    reseed(1000 + w);
    const wm = new WaveManager();
    wm.spawnQueue = wm.generateWave(w); wm.spawnTimer = 0.5; wm.waveActive = true; wm.currentWave = w;
    let enemies = [];
    let projectiles = [];
    for (let steps = 0; steps < 60 * 60 * 10; steps++) {
      const s = wm.update(DT);
      if (s) {
        const e = new Enemy(s.type, pixelPath, s.waveMult);
        e.maxHp *= toughness; e.hp = e.maxHp;
        enemies.push(e);
      }
      hash.clear();
      for (const e of enemies) hash.insert(e);
      for (const t of towers) {
        const target = t.update(DT, enemies, hash);
        if (target) projectiles.push(new Projectile({ x: t.x, y: t.y }, target, t));
      }
      for (const e of enemies) {
        e.update(DT);
        const slow = e.effects.get('slow');
        if (slow && e.slowedBy?.ledger) e.slowedBy.ledger.slowTime += slow.magnitude * DT;
      }
      enemies = enemies.filter(e => e.active && !e.reachedEnd);
      for (const p of projectiles) {
        const was = p.active;
        p.update(DT);
        if (was && !p.active && p.target) hitWithAttribution(p, ctx);
      }
      projectiles = projectiles.filter(p => p.active);
      if (wm.isSpawningDone() && enemies.length === 0) break;
    }
  }
}

// What each upgrade path is named for: Frostbite is Frost's own damage, Deep
// Freeze how much it slows (enemy-seconds times strength); every other path
// is the tower's total credited damage
const namedEffect = (type, path) => type === 'frost' ? (path === 'A' ? 'slowTime' : 'own') : 'damage';

// ── Static wave samples ──

function sampleWaves(wave, n = 200) {
  reseed(5000 + wave);
  const wm = new WaveManager();
  let hp = 0;
  for (let i = 0; i < n; i++) {
    hp += wm.generateWave(wave).reduce((s, e) => s + effectiveHp(e.type, e.waveMult), 0);
  }
  return hp / n;
}

function fallbackShare(gridName, difficulty, runs = 300) {
  setGrid(gridName);
  reseed(42);
  let fallbacks = 0;
  const real = Grid.prototype._fallbackPath;
  Grid.prototype._fallbackPath = function (...a) { fallbacks++; return real.apply(this, a); };
  for (let i = 0; i < runs; i++) new Grid().generate(CONFIG.DIFFICULTY[difficulty], Math.random, CONFIG.ROAD_MAX[difficulty]);
  Grid.prototype._fallbackPath = real;
  return fallbacks / runs;
}

// ── Output ──

const fmt = (n, d = 0) => Number(n).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });

function printRun(run) {
  console.log(`\n== ${run.gridName} ${run.difficulty} ${run.player}${run.without ? ` without ${run.without}` : ''}: ${run.won ? 'WON' : `lost on wave ${run.waveReached}`} (median of seeds ${run.seeds.map(r => outcome(r)).join(' ')}; mean ${run.meanReached.toFixed(1)}, ${run.wins} wins)`);
  console.log('wave  lost  lives    gold  towers  upg      score  ratio');
  for (const r of run.rows) {
    console.log(`${String(r.wave).padStart(4)}  ${String(r.livesLost).padStart(4)}  ${String(r.lives).padStart(5)}  ${String(Math.floor(r.gold)).padStart(6)}  ${String(r.towers).padStart(6)}  ${String(r.upgrades).padStart(3)}  ${String(r.score).padStart(9)}  ${r.ratio.toFixed(2).padStart(5)}`);
  }
  const value = pooledValue(run.seeds);
  const blaster = value.blaster?.perGold || 1;
  console.log(`stress test after waves ${STRESS_WAVES.join(', ')}: next wave, enemies cannot die`);
  console.log('tower          damage        gold  dmg/gold  vs blaster');
  for (const [type, v] of Object.entries(value)) {
    console.log(`${type.padEnd(10)} ${fmt(v.damage).padStart(11)}  ${fmt(v.gold).padStart(10)}  ${v.perGold.toFixed(2).padStart(8)}  ${(v.perGold / blaster).toFixed(2).padStart(10)}`);
  }
  const paths = pathValue(run.seeds);
  if (Object.keys(paths).length) {
    console.log('level-3 path   dmg/gold  vs Blaster Heavy Rounds');
    const ref = paths['blaster B']?.perGold;
    for (const [k, v] of Object.entries(paths).sort()) console.log(`${k.padEnd(12)} ${v.perGold.toFixed(2).padStart(10)}  ${ref ? (v.perGold / ref).toFixed(2) : '-'}`);
  }
  console.log('unlock wave: ' + Object.entries(run.unlockWave).map(([t, w]) => `${t} ${w}`).join(', '));
}

// ── Checks ──

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
}

function waveChecks() {
  const w1 = new WaveManager().generateWave(1);
  check('wave 1 is unscaled', w1.every(e => e.waveMult.hp === 1 && e.waveMult.speed === 1 && e.waveMult.reward === 1 && e.waveMult.armor === 0));

  const speeds = [];
  for (let w = 1; w <= CONFIG.MAX_WAVES; w++) speeds.push(new WaveManager().generateWave(w)[0].waveMult.speed);
  const capWave = speeds.findIndex(s => s >= WAVE.SPEED_CAP) + 1;
  check('speed grows to a cap and stays there',
    capWave > 0 && speeds.slice(capWave - 1).every(s => s === WAVE.SPEED_CAP) && speeds.every((s, i) => i === 0 || s >= speeds[i - 1]),
    capWave > 0 ? `capped at ${WAVE.SPEED_CAP} from wave ${capWave}` : `max ${Math.max(...speeds).toFixed(2)}`);

  let armorOk = true;
  let sentinelMax = 0;
  const armoredTypes = ['armored', 'shielded', 'boss'];
  for (let w = 1; w <= CONFIG.MAX_WAVES; w++) {
    reseed(w);
    for (const e of new WaveManager().generateWave(w)) {
      const enemy = new Enemy(e.type, [{ x: 0, y: 0 }], e.waveMult);
      if (!armoredTypes.includes(e.type) && enemy.armor !== 0) armorOk = false;
    }
    const sentinel = new Enemy('armored', [{ x: 0, y: 0 }], new WaveManager().generateWave(w)[0].waveMult);
    sentinelMax = Math.max(sentinelMax, sentinel.armor / (sentinel.armor + 25));
  }
  check('wave armor only on Sentinels, Guardians and bosses', armorOk);
  check('Sentinel damage reduction stays below 50%', sentinelMax < 0.5, `max ${(sentinelMax * 100).toFixed(0)}%`);

  let bossRatioMin = Infinity;
  let peakOk = true;
  const peakDetail = [];
  for (let w = CONFIG.BOSS_INTERVAL; w <= CONFIG.MAX_WAVES; w += CONFIG.BOSS_INTERVAL) {
    const q = new WaveManager().generateWave(w);
    const boss = q.find(e => e.type === 'boss');
    const brute = q.find(e => e.type !== 'boss');
    bossRatioMin = Math.min(bossRatioMin, (ENEMY_DEFS.boss.hp * boss.waveMult.hp) / (ENEMY_DEFS.tank.hp * brute.waveMult.hp));
    const block = [];
    for (let b = w - CONFIG.BOSS_INTERVAL + 1; b <= w; b++) block.push(sampleWaves(b));
    if (block[block.length - 1] < Math.max(...block)) { peakOk = false; peakDetail.push(`wave ${w}`); }
  }
  check('boss has at least 3x a Brute\'s HP on every boss wave', bossRatioMin >= 3, `min ${bossRatioMin.toFixed(2)}x`);
  check('each boss wave is the peak of its block', peakOk, peakDetail.length ? `not the peak: ${peakDetail.join(', ')}` : '');

  // Waves fill an HP budget: two seeds of the same wave differ little
  let spreadMax = 0, spreadWave = 0;
  for (let w = 8; w <= CONFIG.MAX_WAVES; w++) {
    const hp = [];
    for (let seed = 1; seed <= 200; seed++) hp.push(new WaveManager(1, 1, seed).generateWave(w).reduce((t, e) => t + effectiveHp(e.type, e.waveMult), 0));
    hp.sort((a, b) => a - b);
    const spread = hp[179] / hp[20];
    if (spread > spreadMax) { spreadMax = spread; spreadWave = w; }
  }
  check('wave HP spread (90th over 10th percentile) stays at or below 1.2 from wave 8', spreadMax <= 1.2, `max ${spreadMax.toFixed(2)} on wave ${spreadWave}`);

  const expected = [[1, 'basic'], [3, 'fast'], [5, 'tank'], [7, 'armored'], [10, 'healer'], [12, 'splitter'], [15, 'flying'], [18, 'stealth'], [22, 'shielded']];
  check('enemy types unlock at the fixed waves',
    JSON.stringify(ENEMY_UNLOCK.map(u => [u.wave, u.type])) === JSON.stringify(expected));
}

function ratioChecks(runs) {
  for (const run of runs.filter(r => r.difficulty === 'normal' && r.player === 'sensible')) {
    const rows = run.rows.filter(r => r.cleared || r.wave === run.waveReached);
    const low = rows.filter(r => r.ratio < 1.2).map(r => `${r.wave} (${r.ratio.toFixed(2)})`);
    // Waves 1-6 are exempt from the ceiling: one Blaster must hold wave 1 on
    // Hard on every map, and the waves before the first Sentinel (wave 7)
    // must stay that forgiving, which puts their ratio above 3.0
    const high = rows.filter(r => r.wave > 6 && r.ratio > 3.0).map(r => `${r.wave} (${r.ratio.toFixed(2)})`);
    check(`ratio stays above 1.2 on Normal (${run.gridName})`, low.length === 0, low.length ? `waves ${low.join(', ')}` : '');
    check(`ratio stays at or below 3.0 from wave 7 on Normal (${run.gridName})`, high.length === 0, high.length ? `waves ${high.join(', ')}` : '');
  }
}

function towerChecks(runs) {
  check('start gold covers a Blaster', CONFIG.START_GOLD >= TOWER_DEFS.blaster.cost);

  for (const run of runs.filter(r => r.difficulty === 'normal' && r.player === 'sensible')) {
    for (const [type, wave] of Object.entries(UNLOCK_TARGETS)) {
      const at = run.unlockWave[type];
      check(`${type} unlocks by wave ${wave} (${run.gridName})`, at !== undefined && at <= wave, at ? `wave ${at}` : 'never');
    }
  }

  // Fully upgraded paths, measured in the sensible Normal runs on the phone
  // grid, where range and time on target count. Specialist paths stay close
  // to their median; the Blaster, the starter, stays below it without being
  // useless. Frost and Support work through other towers, which the damage
  // credit cannot price, so the tower-choice ablation targets value them.
  const phone = runs.find(r => r.gridName === 'mobile' && r.difficulty === 'normal' && r.player === 'sensible');
  const paths = pathValue(phone.seeds);
  const specialists = ['lightning', 'cannon', 'sniper'];
  const values = specialists.flatMap(t => ['A', 'B'].map(p => paths[`${t} ${p}`]?.perGold || 0)).sort((a, b) => a - b);
  const median = (values[2] + values[3]) / 2;
  for (const type of ['blaster', ...specialists]) {
    const [lo, hi] = type === 'blaster' ? [0.5, 0.9] : [0.75, 1.33];
    for (const path of ['A', 'B']) {
      const v = paths[`${type} ${path}`];
      const name = TOWER_DEFS[type].upgrades[`path${path}`].name;
      check(`${type} ${name} is within ${lo}x-${hi}x of the specialist median`, v && v.perGold / median >= lo && v.perGold / median <= hi,
        v ? `${(v.perGold / median).toFixed(2)}x` : 'no tower reached level 3');
    }
  }

  // Each upgrade level keeps the per-gold value of what its path is named for
  // (5% slack: the spec's own example, a Blaster doubling its damage for 2.11x the gold)
  for (const type of Object.keys(TOWER_DEFS)) {
    for (const path of ['A', 'B']) {
      if (type === 'support' && path === 'B') continue; // Economy pays gold, checked by repayment
      const name = TOWER_DEFS[type].upgrades[`path${path}`].name;
      const weak = [];
      const kind = namedEffect(type, path);
      let prev = benchValue(type, path, 0, kind);
      for (let level = 1; level <= 3; level++) {
        const v = benchValue(type, path, level, kind);
        if (v < prev * 0.95) weak.push(`level ${level} ${(v / prev).toFixed(2)}x`);
        prev = v;
      }
      check(`${type} ${name} upgrades keep damage per gold`, weak.length === 0, weak.join(', '));
    }
  }

  // Economy tier 3 repays its cost within 8 waves
  const eco = TOWER_DEFS.support;
  const ecoCost = eco.cost + eco.upgrades.pathB.levels.reduce((s, l) => s + l.cost, 0);
  const ecoGold = eco.upgrades.pathB.levels.at(-1).stats.goldPerWave;
  check('Support Economy tier 3 repays its cost within 8 waves', ecoGold * 8 >= ecoCost, `${(ecoCost / ecoGold).toFixed(1)} waves`);

  // Naive player can afford a second Blaster by the end of wave 2 on Normal
  for (const run of runs.filter(r => r.difficulty === 'normal' && r.player === 'naive')) {
    const towersAfter2 = run.rows[2]?.towers ?? run.rows.at(-1).towers;
    check(`naive player owns two Blasters by wave 3 (${run.gridName})`, towersAfter2 >= 2 || run.rows[1]?.gold >= TOWER_DEFS.blaster.cost, `${towersAfter2} towers`);
  }

  // One Blaster on the tutorial tile holds wave 1
  for (const gridName of Object.keys(GRIDS)) {
    for (const difficulty of DIFFICULTIES) {
      const leaks = [];
      for (let i = 0; i < SEEDS; i++) {
        const run = new Run({ gridName, difficulty, player: 'naive', seed: SEED + i, maxWaves: 1, tieTo: 'entry' });
        run.gold = TOWER_DEFS.blaster.cost;
        run.play();
        if (run.rows[0].livesLost > 0 || run.towers.length !== 1) leaks.push(`seed ${SEED + i}: ${run.rows[0].livesLost} lost`);
      }
      check(`one Blaster holds wave 1 (${gridName} ${difficulty})`, leaks.length === 0, leaks.join(', '));
    }
  }

  // Naive player with 95 gold places exactly one Blaster
  const naive = new Run({ gridName: 'mobile', difficulty: 'normal', player: 'naive' });
  naive.gold = 95;
  naive.act();
  check('naive player with 95 gold places one Blaster', naive.towers.length === 1 && naive.towers[0].type === 'blaster');

  // Sensible player with 6 cores and Frost unlocks Lightning before buying
  const sensible = new Run({ gridName: 'mobile', difficulty: 'normal', player: 'sensible' });
  sensible.cores = 6;
  sensible.unlocked.add('frost');
  sensible.act();
  check('sensible player with 6 cores unlocks Lightning', sensible.isUnlocked('lightning') && sensible.cores === 1);
}

function difficultyChecks(runs) {
  const d = CONFIG.DIFFICULTY;
  check('Easy path is longer than Normal, Hard shorter', d.easy > d.normal && d.normal > d.hard);
  const hp = CONFIG.DIFFICULTY_HP;
  check('Normal enemy HP is unscaled, Easy not above it, Hard not below it', hp.normal === 1 && hp.easy <= 1 && hp.hard >= 1);

  const get = (g, diff, p) => runs.find(r => r.gridName === g && r.difficulty === diff && r.player === p);
  const wave = (n) => `wave ${n.toFixed(1)}`;
  for (const g of Object.keys(GRIDS)) {
    const reached = (diff, p) => get(g, diff, p).meanReached;
    check(`naive player on Easy reaches wave 20 (${g})`, reached('easy', 'naive') >= 20, wave(reached('easy', 'naive')));
    check(`naive player on Normal ends between wave 12 and 20 (${g})`, reached('normal', 'naive') >= 12 && reached('normal', 'naive') <= 20, wave(reached('normal', 'naive')));
    check(`naive player on Hard ends before wave 14 (${g})`, reached('hard', 'naive') < 14, wave(reached('hard', 'naive')));
    check(`naive outcomes ordered Easy > Normal > Hard (${g})`,
      reached('easy', 'naive') > reached('normal', 'naive') && reached('normal', 'naive') > reached('hard', 'naive'));
    check(`sensible player on Hard reaches wave 25 (${g})`, reached('hard', 'sensible') >= 25, wave(reached('hard', 'sensible')));
  }
  for (const diff of DIFFICULTIES) {
    for (const p of PLAYERS) {
      for (const [ga, gb, label] of [['mobile', 'desktop', 'phone and desktop'], ['portrait', 'desktop', 'portrait phone and desktop'], ['portrait', 'mobile', 'portrait and landscape phone']]) {
        const wa = get(ga, diff, p).meanReached, wb = get(gb, diff, p).meanReached;
        check(`${label} within 3 waves (${diff} ${p})`, Math.abs(wa - wb) <= 3, `${wa.toFixed(1)} vs ${wb.toFixed(1)}`);
      }
    }
  }

  // Wave-1 Scout stays in range of a Blaster on the suggested tile for two shots
  for (const g of Object.keys(GRIDS)) {
    const grid = makeMap(g, 'hard', SEED);
    const range = TOWER_DEFS.blaster.range;
    const tile = rankTiles(grid, range, 'entry')[0];
    const inRange = grid.path.filter(p => (p.x - tile.x) ** 2 + (p.y - tile.y) ** 2 <= range * range).length;
    const seconds = inRange * CONFIG.TILE_SIZE / ENEMY_DEFS.fast.speed;
    check(`wave-1 Scout gets two Blaster shots on Hard (${g})`, seconds * TOWER_DEFS.blaster.fireRate >= 2, `${(seconds * TOWER_DEFS.blaster.fireRate).toFixed(1)} shots`);
  }

  for (const g of Object.keys(GRIDS)) {
    for (const diff of DIFFICULTIES) {
      const share = fallbackShare(g, diff);
      check(`map generates without fallback 90% of the time (${g} ${diff})`, share <= 0.10, `${(share * 100).toFixed(1)}% fallback`);
    }
  }
}

// ── Tower choice ──
// The Blaster upgrader, and the sensible player without one tower type (or
// without both helpers), on the same maps as the sensible player. Choosing
// towers should beat upgrading Blasters, and every tower type should earn
// its place on every setup.

const CHOICE_SETUPS = [['portrait', 'normal'], ['portrait', 'hard'], ['desktop', 'hard']];
const REMOVALS = ['frost', 'lightning', 'cannon', 'sniper', 'support', 'frost,support'];
const CHOICE_MARGIN = 3;   // waves the sensible player should gain over the upgrader
const REMOVAL_NOISE = 1;   // waves of mean gain a removal may show on 9 maps before it counts

function choiceRuns() {
  const upgrader = CHOICE_SETUPS.map(([gridName, difficulty]) =>
    runMedian({ gridName, difficulty, player: 'upgrader', measure: false }));
  const without = CHOICE_SETUPS.flatMap(([gridName, difficulty]) => REMOVALS.map(t =>
    runMedian({ gridName, difficulty, player: 'sensible', without: t, measure: false })));
  return { upgrader, without };
}

function printChoice(runs, choice) {
  const sensible = (g, d) => runs.find(r => r.gridName === g && r.difficulty === d && r.player === 'sensible');
  console.log(`\n== tower choice: mean wave on the same ${SEEDS} maps (a win counts as ${CONFIG.MAX_WAVES + 1}), wins in brackets`);
  console.log('setup               sensible      upgrader   margin');
  for (const u of choice.upgrader) {
    const s = sensible(u.gridName, u.difficulty);
    console.log(`${`${u.gridName} ${u.difficulty}`.padEnd(16)} ${s.meanReached.toFixed(1).padStart(6)} (${s.wins})  ${u.meanReached.toFixed(1).padStart(8)} (${u.wins})  ${(s.meanReached - u.meanReached).toFixed(1).padStart(7)}`);
  }
  for (const [g, d] of CHOICE_SETUPS) {
    const all = sensible(g, d);
    console.log(`sensible player without a tower type (${g} ${d}, all types: ${all.meanReached.toFixed(1)} (${all.wins}))`);
    for (const w of choice.without.filter(r => r.gridName === g && r.difficulty === d)) {
      console.log(`  without ${w.without.padEnd(14)} ${w.meanReached.toFixed(1).padStart(5)} (${w.wins})  ${(w.meanReached - all.meanReached).toFixed(1).padStart(6)}`);
    }
  }
}

function choiceChecks(runs, choice) {
  const sensible = (g, d) => runs.find(r => r.gridName === g && r.difficulty === d && r.player === 'sensible');
  for (const u of choice.upgrader) {
    const s = sensible(u.gridName, u.difficulty);
    if (u.gridName === 'desktop') {
      check(`Blaster upgrader wins fewer than half the maps (${u.gridName} ${u.difficulty})`, u.wins < SEEDS / 2, `${u.wins} of ${SEEDS}`);
    } else {
      check(`sensible player beats the Blaster upgrader by ${CHOICE_MARGIN} waves (${u.gridName} ${u.difficulty})`,
        s.meanReached - u.meanReached >= CHOICE_MARGIN, `${s.meanReached.toFixed(1)} vs ${u.meanReached.toFixed(1)}`);
    }
  }
  // No removal raises the mean by more than REMOVAL_NOISE: one map flipping
  // moves a 9-map mean by up to 2 waves. On Hard, paired by map, a removal
  // must also lower at least as many maps as it raises: a win caps a map at
  // MAX_WAVES + 1, so the mean alone hides a tower that helps wherever the
  // player does not win anyway. Normal is won too often to show a cost.
  for (const w of choice.without) {
    const all = sensible(w.gridName, w.difficulty);
    const lower = w.seeds.filter((r, i) => r.reached < all.seeds[i].reached).length;
    const higher = w.seeds.filter((r, i) => r.reached > all.seeds[i].reached).length;
    const paired = w.difficulty === 'hard';
    check(`removing ${w.without} does not help the sensible player (${w.gridName} ${w.difficulty})`,
      (!paired || lower >= higher) && w.meanReached <= all.meanReached + REMOVAL_NOISE,
      `lower on ${lower} maps, higher on ${higher}; mean ${all.meanReached.toFixed(1)} with, ${w.meanReached.toFixed(1)} without`);
  }
}

function scoreChecks(runs) {
  const top = topScores(runs);
  const tight = [];
  for (const [wave, score] of top) {
    if (score * 1.5 > maxPlausibleScore(wave)) tight.push(`${wave} (${fmt(score)} vs cap ${fmt(maxPlausibleScore(wave))})`);
  }
  check('leaderboard cap is at least 1.5x the top score at every wave', tight.length === 0, tight.slice(0, 4).join(', '));
}

function topScores(runs) {
  const top = new Map();
  for (const run of runs.flatMap(r => r.seeds)) {
    for (const r of run.rows) {
      if (!r.cleared) continue;
      top.set(r.wave, Math.max(top.get(r.wave) || 0, r.score));
    }
  }
  return [...top.entries()].sort((a, b) => a[0] - b[0]);
}

// ── Main ──

function parseArgs(list) {
  const out = {};
  for (let i = 0; i < list.length; i++) {
    if (list[i].startsWith('--')) out[list[i].slice(2)] = list[i + 1];
  }
  return out;
}

// --curve 1: buyable over needed DPS per wave for a player who kills every
// enemy and banks no interest, a quick check of the wave curve
if ('curve' in args) {
  let earned = CONFIG.START_GOLD;
  console.log('wave   need DPS   earned  ratio');
  for (let w = 1; w <= CONFIG.MAX_WAVES; w++) {
    reseed(7000 + w);
    const wm = new WaveManager();
    let reward = 0;
    for (let i = 0; i < 50; i++) {
      for (const e of wm.generateWave(w)) {
        const def = ENEMY_DEFS[e.type];
        reward += Math.floor(def.reward * (e.waveMult.reward || 1)) + (def.splitCount ? def.splitCount * Math.floor(ENEMY_DEFS[def.splitType].reward * (e.waveMult.reward || 1)) : 0);
      }
    }
    earned += reward / 50 + waveBonusGold(w);
    console.log(`${String(w).padStart(4)}  ${averageNeed(w).toFixed(1).padStart(9)}  ${Math.round(earned).toString().padStart(7)}  ${buyableOverNeeded(w, earned).toFixed(2).padStart(5)}`);
  }
  process.exit(0);
}

// --bench 1: bench value of every tower, path and level against Blaster Heavy Rounds 3
if ('bench' in args) {
  const ref = benchValue('blaster', 'B');
  console.log('tower      path            L0    L1    L2    L3   (damage per gold vs Blaster Heavy Rounds 3)');
  for (const type of Object.keys(TOWER_DEFS)) {
    for (const path of ['A', 'B']) {
      const kind = namedEffect(type, path);
      const vals = [0, 1, 2, 3].map(l => (benchValue(type, path, l) / ref).toFixed(2).padStart(5));
      const named = [0, 1, 2, 3].map(l => benchValue(type, path, l, kind));
      const steps = named.slice(1).map((v, i) => (v / named[i]).toFixed(2)).join(' ');
      console.log(`${type.padEnd(10)} ${TOWER_DEFS[type].upgrades[`path${path}`].name.padEnd(13)} ${vals.join(' ')}   ${kind} per gold step: ${steps}`);
    }
  }
  process.exit(0);
}

const single = args.grid || args.difficulty || args.player;
const runs = [];
for (const gridName of args.grid ? [args.grid] : Object.keys(GRIDS)) {
  for (const difficulty of args.difficulty ? [args.difficulty] : DIFFICULTIES) {
    for (const player of args.player ? [args.player] : PLAYERS) {
      const run = runMedian({ gridName, difficulty, player, without: args.without ?? null });
      runs.push(run);
      printRun(run);
    }
  }
}

const choice = single ? null : choiceRuns();
if (choice) printChoice(runs, choice);
const scored = choice ? [...runs, ...choice.upgrader, ...choice.without] : runs;

console.log('\n== top score per wave (cap = leaderboard plausibility cap)');
console.log('wave       top score         cap  cap/top');
for (const [wave, score] of topScores(scored)) {
  console.log(`${String(wave).padStart(4)}  ${fmt(score).padStart(14)}  ${fmt(maxPlausibleScore(wave)).padStart(10)}  ${(maxPlausibleScore(wave) / score).toFixed(2).padStart(7)}`);
}

if (single) {
  console.log('\nSingle run: checks skipped. Run `npm run balance` for the full check.');
  process.exit(0);
}

waveChecks();
ratioChecks(runs);
towerChecks(runs);
difficultyChecks(runs);
choiceChecks(runs, choice);
scoreChecks(scored);

console.log('\n== checks');
for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${r.name}${r.detail ? `: ${r.detail}` : ''}`);
const failed = results.filter(r => !r.ok);
if (failed.length) {
  console.error(`\nFAIL: ${failed.length} of ${results.length} checks failed, first: ${failed[0].name}`);
  process.exit(1);
}
console.log(`\nOK: all ${results.length} checks pass`);
