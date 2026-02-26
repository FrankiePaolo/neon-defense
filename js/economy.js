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
    this._flushPendingScores();
    this.fetchGlobalScores();
  }

  addKill(enemy, wave) {
    this.score += Math.floor(enemy.maxHp * (1 + wave * 0.1));
  }

  addWaveBonus(wave) { this.score += wave * 100; }
  addPerfectWaveBonus(wave) { this.score += wave * 200; }

  hasName(name) {
    return this.highScores.some(s => s.name.toLowerCase() === name.toLowerCase());
  }

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
        this.highScores = (await res.json()).sort((a, b) => b.score - a.score);
        this.globalLoaded = true;
      }
    } catch {}
  }

  async _submitRemote(name, wave) {
    const payload = { name, score: this.score, wave };
    try {
      await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      this.fetchGlobalScores();
    } catch {
      // Offline — queue for later sync
      try {
        const pending = JSON.parse(localStorage.getItem('neon_td_pending_scores') || '[]');
        pending.push(payload);
        localStorage.setItem('neon_td_pending_scores', JSON.stringify(pending));
      } catch {}
    }
  }

  async _flushPendingScores() {
    try {
      const pending = JSON.parse(localStorage.getItem('neon_td_pending_scores') || '[]');
      if (!pending.length) return;
      const remaining = [];
      for (const entry of pending) {
        try {
          const res = await fetch('/api/scores', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
          });
          if (!res.ok) remaining.push(entry);
        } catch {
          remaining.push(entry);
        }
      }
      localStorage.setItem('neon_td_pending_scores', JSON.stringify(remaining));
      if (remaining.length < pending.length) this.fetchGlobalScores();
    } catch {}
  }

  _loadLocal() {
    try {
      const scores = JSON.parse(localStorage.getItem('neon_td_scores')) || [];
      return scores.sort((a, b) => b.score - a.score);
    } catch { return []; }
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
