import { CONFIG, TOWER_DEFS, IS_MOBILE } from './config.js';
import { distance, gridToPixel } from './utils.js';
import { Grid } from './grid.js';
import { SpatialHash } from './pathfinding.js';
import { ParticleSystem } from './particles.js';
import { Enemy } from './enemy.js';
import { Projectile } from './projectile.js';
import { Tower } from './tower.js';
import { WaveManager } from './waves.js';
import { Economy, ScoreTracker, ProgressTracker } from './economy.js';
import { Renderer } from './renderer.js';
import { InputHandler } from './input.js';
import { UIController } from './ui.js';
import { Tutorial } from './tutorial.js';
import { AudioEngine } from './audio.js';

export class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.renderer = new Renderer(this.canvas);
    this.grid = new Grid();
    this.particles = new ParticleSystem(IS_MOBILE ? 200 : 500);
    this.spatialHash = new SpatialHash(80);
    this.economy = new Economy();
    this.scoreTracker = new ScoreTracker();
    this.progressTracker = new ProgressTracker();
    this.waveManager = new WaveManager();
    this.audio = new AudioEngine();
    this.input = new InputHandler(this.canvas, this);
    this.ui = new UIController(this);
    this.tutorial = new Tutorial(this);

    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this._lightningChains = [];
    this.floatingTexts = [];
    this.killStreak = 0;
    this.killStreakTimer = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.waveBanner = null;

    this.lives = CONFIG.BASE_LIVES;
    this.state = 'MENU';
    this.speedMultiplier = 1;
    this.lastTimestamp = 0;
    this.livesLostThisWave = 0;
    this.waveClearDelay = 0;

    this._loop = this._loop.bind(this);
    requestAnimationFrame(this._loop);
  }

  startNewGame(difficulty = 'normal') {
    const cols = this.grid.cols;
    const pathLengths = { hard: cols, normal: Math.floor(cols * 2.5), easy: cols * 4 };
    this.grid.generate(pathLengths[difficulty] || Math.floor(cols * 2.5));
    this.renderer.markDirty();
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this._lightningChains = [];
    this.floatingTexts = [];
    this.killStreak = 0;
    this.killStreakTimer = 0;
    this.shakeTimer = 0;
    this.shakeIntensity = 0;
    this.waveBanner = null;
    this.particles.clear();
    this.economy = new Economy();
    this.scoreTracker = new ScoreTracker();
    this.progressTracker.reset();
    this.waveManager = new WaveManager();
    this.lives = CONFIG.BASE_LIVES;
    this.state = 'BETWEEN_WAVES';
    this.speedMultiplier = 1;
    this.livesLostThisWave = 0;
    this.waveClearDelay = 0;
    this.input.selectedTower = null;
    this.input.placingType = null;
    this.input.movingTower = null;
    this.ui.hideUpgradePanel();
    this.ui.dismissUnlockNotification();
    this.ui.refreshTowerPanel();
    this.ui.updateSpeedButtons(1);
    this.ui.updateHUD();
    this.ui.showBetweenWaves();
    this.audio.init();
    this.audio.playTrack('gameplay');
    this.tutorial.start();
  }

  startNextWave() {
    if (this.state !== 'BETWEEN_WAVES') return;
    this.state = 'PLAYING';
    this.livesLostThisWave = 0;
    this.waveManager.startWave();
    const wave = this.waveManager.currentWave;
    const isBoss = wave % CONFIG.BOSS_INTERVAL === 0;
    this.waveBanner = {
      text: isBoss ? `WAVE ${wave} — BOSS` : `WAVE ${wave}`,
      color: isBoss ? '#ff4444' : '#00ffff',
      timer: 2.0,
      duration: 2.0,
    };
    this.audio.playTrack(isBoss ? 'boss' : 'gameplay');
    this.audio.playSfx('wave');
    this.ui.hideBetweenWaves();
  }

  placeTower(type, gx, gy) {
    if (this.state !== 'BETWEEN_WAVES') return false;
    const def = TOWER_DEFS[type];
    if (!def) return false;
    if (!this.progressTracker.isTowerUnlocked(type, this.scoreTracker.score)) return false;
    if (!this.grid.isPlaceable(gx, gy)) return false;
    if (!this.economy.canAfford(def.cost)) return false;

    const tower = new Tower(type, gx, gy);
    this.economy.spend(def.cost);
    this.grid.placeTower(gx, gy, tower);
    this.towers.push(tower);
    this.renderer.markDirty();
    this.ui.updateHUD();
    this.audio.playSfx('place');
    return true;
  }

  moveTower(tower, newGx, newGy) {
    if (this.state !== 'BETWEEN_WAVES') return false;
    if (tower.gx === newGx && tower.gy === newGy) return false;
    if (!this.grid.isPlaceable(newGx, newGy)) return false;

    this.grid.removeTower(tower.gx, tower.gy);
    this.grid.placeTower(newGx, newGy, tower);
    tower.gx = newGx;
    tower.gy = newGy;
    const pos = gridToPixel(newGx, newGy);
    tower.x = pos.x;
    tower.y = pos.y;
    this.renderer.markDirty();
    return true;
  }

  sellTower(tower) {
    if (this.state !== 'BETWEEN_WAVES') return;
    const value = tower.getSellValue();
    this.economy.earn(value);
    this.grid.removeTower(tower.gx, tower.gy);
    this.towers = this.towers.filter(t => t !== tower);
    this.renderer.markDirty();
    this.audio.playSfx('sell');
    this.ui.updateHUD();
  }

  sellSelectedTower() {
    if (this.input.selectedTower) {
      this.sellTower(this.input.selectedTower);
      this.input.selectedTower = null;
      this.ui.hideUpgradePanel();
    }
  }

  upgradeTower(tower, path) {
    if (this.state !== 'BETWEEN_WAVES') return;
    if (!tower) return;
    const cost = tower.getUpgradeCost(path);
    if (cost === null || !this.economy.canAfford(cost)) return;
    this.economy.spend(cost);
    tower.upgrade(path);
    this.ui.updateHUD();
    if (this.input.selectedTower === tower) {
      this.ui.showUpgradePanel(tower);
    }
  }

  setSpeed(speed) {
    this.speedMultiplier = speed;
    this.ui.updateSpeedButtons(speed);
  }

  togglePause() {
    if (this.state === 'PLAYING' || this.state === 'BETWEEN_WAVES') {
      this._prevState = this.state;
      this.state = 'PAUSED';
      this.audio.stopMusic();
      this.ui.showPause();
    } else if (this.state === 'PAUSED') {
      this.state = this._prevState || 'PLAYING';
      this.audio.playTrack('gameplay');
      this.ui.hidePause();
    }
  }

  _loop(timestamp) {
    if (!this.lastTimestamp) this.lastTimestamp = timestamp;
    let rawDt = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;
    rawDt = Math.min(rawDt, 0.1);

    if (this.state === 'PLAYING') {
      const dt = rawDt * this.speedMultiplier;
      this._update(dt);
    }

    if (this.waveBanner) {
      this.waveBanner.timer -= rawDt;
      if (this.waveBanner.timer <= 0) this.waveBanner = null;
    }

    if (this.tutorial.active) this.tutorial.check();

    if (this.state !== 'MENU') {
      this.renderer.renderFrame(this);
    }

    requestAnimationFrame(this._loop);
  }

  _update(dt) {
    const toSpawn = this.waveManager.update(dt);
    if (toSpawn) this._spawnEnemy(toSpawn);

    this.spatialHash.clear();
    for (const e of this.enemies) this.spatialHash.insert(e);

    this._updateSynergies();

    for (const tower of this.towers) {
      const firedAt = tower.update(dt, this.enemies, this.spatialHash);
      if (firedAt) this._createProjectile(tower, firedAt);
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      enemy.update(dt);
      if (enemy.healRange > 0) enemy.healNearby(this.enemies, dt);

      if (!enemy.active) {
        this._onEnemyKilled(enemy);
        this.enemies.splice(i, 1);
      } else if (enemy.reachedEnd) {
        this._onEnemyReachedEnd(enemy);
        this.enemies.splice(i, 1);
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const proj = this.projectiles[i];
      const wasActive = proj.active;
      proj.update(dt);
      if (wasActive && !proj.active && proj.target) {
        this._onProjectileHit(proj);
      }
      if (!proj.active) this.projectiles.splice(i, 1);
    }

    this.particles.update(dt);
    this._updateFloatingTexts(dt);
    this._updateKillStreak(dt);
    if (this.shakeTimer > 0) this.shakeTimer -= dt;

    if (this.waveManager.isSpawningDone() && this.enemies.length === 0) {
      this.waveClearDelay += dt;
      if (this.waveClearDelay >= 1.0) {
        this._onWaveComplete();
      }
    } else {
      this.waveClearDelay = 0;
    }

    if (this.lives <= 0) this._onGameOver();

    this.ui.updateHUD();
  }

  _spawnEnemy(spawnData) {
    const pixelPath = this.grid.path.map(p => gridToPixel(p.x, p.y));
    const enemy = new Enemy(spawnData.type, pixelPath, spawnData.waveMult);
    this.enemies.push(enemy);
  }

  _createProjectile(tower, target) {
    const proj = new Projectile({ x: tower.x, y: tower.y }, target, tower);
    this.projectiles.push(proj);
  }

  _onProjectileHit(proj) {
    const target = proj.target;
    if (!target || !target.active) return;

    target.takeDamage(proj.damage, proj.towerType);

    if (proj.slowAmount > 0) {
      target.applyEffect('slow', proj.slowDuration, proj.slowAmount);
    }

    if (proj.splashRadius > 0) {
      const radius = proj.splashRadius * CONFIG.TILE_SIZE;
      const nearby = this.spatialHash.query(target.x, target.y, radius);
      for (const e of nearby) {
        if (e === target || !e.active) continue;
        const d = distance(target.x, target.y, e.x, e.y);
        const falloff = 1 - (d / radius) * proj.splashDecay;
        if (falloff > 0) e.takeDamage(proj.damage * falloff, proj.towerType);
      }
      this.particles.emit(target.x, target.y, proj.color, 'explosion');
    }

    if (proj.chainCount > 0) this._chainLightning(target, proj);

    this.particles.emit(target.x, target.y, proj.color, 'hit');
  }

  _chainLightning(firstTarget, proj) {
    const visited = new Set([firstTarget]);
    let current = firstTarget;
    let dmg = proj.damage;
    const chainRange = proj.chainRange * CONFIG.TILE_SIZE;

    for (let i = 0; i < proj.chainCount; i++) {
      dmg *= proj.chainDecay;
      const nearby = this.spatialHash.query(current.x, current.y, chainRange);
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
      this._lightningChains.push({
        from: { x: current.x, y: current.y },
        to: { x: next.x, y: next.y },
        time: Date.now()
      });
      this.particles.emit(next.x, next.y, '#ffff00', 'lightning');
      current = next;
    }
  }

  _updateSynergies() {
    for (const tower of this.towers) {
      tower.damageMultiplier = 1.0;
      tower.fireRateMultiplier = 1.0;
      for (const other of this.towers) {
        if (other === tower || other.type !== 'support') continue;
        const d = distance(tower.x, tower.y, other.x, other.y);
        if (d <= other.currentStats.buffRange * CONFIG.TILE_SIZE) {
          tower.damageMultiplier += other.currentStats.damageAmp || 0;
          tower.fireRateMultiplier += other.currentStats.fireRateAmp || 0;
        }
      }
    }
  }

  _onEnemyKilled(enemy) {
    this.economy.earn(enemy.reward);
    this.scoreTracker.addKill(enemy, this.waveManager.currentWave);
    this._checkUnlocks();
    this.particles.emit(enemy.x, enemy.y, enemy.color, 'death');

    // Floating gold text
    this.floatingTexts.push({
      x: enemy.x, y: enemy.y,
      text: `+${enemy.reward}g`, color: '#ffd700',
      life: 1.0, maxLife: 1.0,
    });

    // Screen shake on boss kill
    if (enemy.type === 'boss') this.triggerShake(6, 0.4);

    // Kill streak
    this.killStreak++;
    this.killStreakTimer = 1.5;

    if (enemy.splitCount > 0 && enemy.splitType) {
      for (let i = 0; i < enemy.splitCount; i++) {
        const remainingPath = this.grid.path
          .slice(enemy.pathIndex)
          .map(p => gridToPixel(p.x, p.y));
        if (remainingPath.length < 2) continue;
        const child = new Enemy(enemy.splitType, remainingPath, {});
        child.x = enemy.x + (Math.random() - 0.5) * 10;
        child.y = enemy.y + (Math.random() - 0.5) * 10;
        this.enemies.push(child);
      }
    }
  }

  _updateFloatingTexts(dt) {
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 30 * dt;
      ft.life -= dt;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }
  }

  _updateKillStreak(dt) {
    if (this.killStreakTimer <= 0) return;
    this.killStreakTimer -= dt;
    if (this.killStreakTimer <= 0 && this.killStreak >= 8) {
      const bonus = Math.min(this.killStreak * 2, 20);
      this.economy.earn(bonus);
      this.scoreTracker.score += bonus;
      this.floatingTexts.push({
        x: CONFIG.CANVAS_WIDTH / 2, y: CONFIG.CANVAS_HEIGHT / 2 - 20,
        text: `${this.killStreak}x COMBO  +${bonus}g`,
        color: '#ff8800', life: 2.0, maxLife: 2.0, large: true,
      });
      this.triggerShake(4, 0.25);
      this.killStreak = 0;
    } else if (this.killStreakTimer <= 0) {
      this.killStreak = 0;
    }
  }

  triggerShake(intensity, duration) {
    this.shakeIntensity = intensity;
    this.shakeTimer = duration;
  }

  _onEnemyReachedEnd(enemy) {
    this.lives--;
    this.livesLostThisWave++;
    this.audio.playSfx('damage');
  }

  _onWaveComplete() {
    this.scoreTracker.addWaveBonus(this.waveManager.currentWave);
    if (this.livesLostThisWave === 0) {
      this.scoreTracker.addPerfectWaveBonus(this.waveManager.currentWave);
    }
    this.economy.applyInterest();
    this.economy.earn(20 + this.waveManager.currentWave * 3);

    for (const tower of this.towers) {
      if (tower.type === 'support' && tower.currentStats.goldPerWave) {
        this.economy.earn(tower.currentStats.goldPerWave);
      }
    }

    if (this.waveManager.currentWave >= CONFIG.MAX_WAVES) {
      this._onVictory();
      return;
    }

    const wave = this.waveManager.currentWave;
    const perfect = this.livesLostThisWave === 0;
    this.waveBanner = {
      text: perfect ? `WAVE ${wave} PERFECT!` : `WAVE ${wave} CLEARED`,
      color: perfect ? '#00ff66' : '#00ccff',
      timer: 2.5,
      duration: 2.5,
    };
    this.state = 'BETWEEN_WAVES';
    this.ui.showBetweenWaves();
    this.ui.updateHUD();
  }

  _onGameOver() {
    this.state = 'GAME_OVER';
    this._processEndOfGame();
    this.audio.stopMusic();
    this.audio.playSfx('gameover');
    this.ui.showGameOver(this.scoreTracker.score, this.waveManager.currentWave);
  }

  _onVictory() {
    this.scoreTracker.score += 5000;
    this.state = 'GAME_OVER';
    this._processEndOfGame();
    this.audio.stopMusic();
    this.audio.playSfx('wave');
    this.ui.showGameOver(this.scoreTracker.score, this.waveManager.currentWave);
  }

  _regenerateMap() {
    for (const tower of this.towers) {
      this.economy.earn(tower.totalInvested);
    }
    this.towers = [];
    const wave = this.waveManager.currentWave;
    const minLength = Math.min(20 + wave * 3, 120);
    this.grid.generate(minLength);
    this.renderer.markDirty();
  }

  _checkUnlocks() {
    const score = this.scoreTracker.score;
    const previousBest = this.progressTracker.bestScore;
    const newUnlocks = this.progressTracker.getNewlyUnlockedTowers(previousBest, score);
    if (newUnlocks.length > 0) {
      this.progressTracker.updateBestScore(score);
      this.ui.showUnlockNotifications(newUnlocks);
      this.ui.refreshTowerPanel();
    }
  }

  _processEndOfGame() {
    this.progressTracker.updateBestScore(this.scoreTracker.score);
  }
}
