import { CONFIG, TOWER_DEFS } from './config.js';

export class Economy {
  constructor() {
    this.gold = CONFIG.START_GOLD;
    this.totalEarned = CONFIG.START_GOLD;
    this.totalSpent = 0;
  }

  earn(amount) { this.gold += amount; this.totalEarned += amount; }

  spend(amount) {
    if (this.gold < amount) return false;
    this.gold -= amount;
    this.totalSpent += amount;
    return true;
  }

  canAfford(amount) { return this.gold >= amount; }

  applyInterest() {
    const interest = Math.min(Math.floor(this.gold * CONFIG.INTEREST_RATE), CONFIG.INTEREST_CAP);
    this.earn(interest);
    return interest;
  }
}

export class ScoreTracker {
  constructor() {
    this.score = 0;
    this.highScores = this._loadLocal();
    this.globalLoaded = false;
    this.fetchGlobalScores();
  }

  addKill(enemy, wave) {
    this.score += Math.floor(enemy.maxHp * (1 + wave * 0.1));
  }

  addWaveBonus(wave) { this.score += wave * 100; }
  addPerfectWaveBonus(wave) { this.score += wave * 200; }

  save(name, wave) {
    const entry = { name, score: this.score, wave, date: Date.now() };
    this.highScores.push(entry);
    this.highScores.sort((a, b) => b.score - a.score);
    this.highScores = this.highScores.slice(0, 50);
    try { localStorage.setItem('neon_td_scores', JSON.stringify(this.highScores.slice(0, 10))); } catch {}
    this._submitRemote(name, wave);
  }

  async fetchGlobalScores() {
    try {
      const res = await fetch('/api/scores');
      if (res.ok) {
        this.highScores = await res.json();
        this.globalLoaded = true;
      }
    } catch {}
  }

  async _submitRemote(name, wave) {
    try {
      await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, score: this.score, wave }),
      });
      this.fetchGlobalScores();
    } catch {}
  }

  _loadLocal() {
    try { return JSON.parse(localStorage.getItem('neon_td_scores')) || []; } catch { return []; }
  }
}

export class ProgressTracker {
  constructor() {
    this.bestScore = 0;
  }

  reset() {
    this.bestScore = 0;
  }

  updateBestScore(score) {
    const previousBest = this.bestScore;
    if (score > this.bestScore) {
      this.bestScore = score;
    }
    return previousBest;
  }

  isTowerUnlocked(type, currentScore = 0) {
    const def = TOWER_DEFS[type];
    const effective = Math.max(this.bestScore, currentScore);
    return def && effective >= (def.unlockScore || 0);
  }

  getNewlyUnlockedTowers(previousBest, currentScore) {
    const unlocked = [];
    for (const [type, def] of Object.entries(TOWER_DEFS)) {
      const threshold = def.unlockScore || 0;
      if (threshold > previousBest && threshold <= currentScore) {
        unlocked.push({ type, def });
      }
    }
    return unlocked;
  }

  getNextUnlock(currentScore = 0) {
    const effective = Math.max(this.bestScore, currentScore);
    let nearest = null;
    for (const [type, def] of Object.entries(TOWER_DEFS)) {
      const threshold = def.unlockScore || 0;
      if (threshold > effective) {
        if (!nearest || threshold < nearest.score) {
          nearest = { type, name: def.name, score: threshold };
        }
      }
    }
    return nearest;
  }
}
