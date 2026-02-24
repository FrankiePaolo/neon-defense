import { CONFIG } from './config.js';

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
    this.highScores = this._load();
  }

  addKill(enemy, wave) {
    this.score += Math.floor(enemy.maxHp * (1 + wave * 0.1));
  }

  addWaveBonus(wave) { this.score += wave * 100; }
  addPerfectWaveBonus(wave) { this.score += wave * 200; }

  save(name, wave) {
    this.highScores.push({ name, score: this.score, wave, date: Date.now() });
    this.highScores.sort((a, b) => b.score - a.score);
    this.highScores = this.highScores.slice(0, 10);
    try { localStorage.setItem('neon_td_scores', JSON.stringify(this.highScores)); } catch {}
  }

  _load() {
    try { return JSON.parse(localStorage.getItem('neon_td_scores')) || []; } catch { return []; }
  }
}
