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

// Gold for the next life bought back, after `repairs` repairs this run
export function repairCost(repairs) {
  return CONFIG.REPAIR_COST * 2 ** repairs;
}

// Highest first, at most n per difficulty board. Scores saved before
// difficulty was recorded count as normal
function topPerDifficulty(scores, n) {
  const kept = { easy: 0, normal: 0, hard: 0 };
  return [...scores].sort((a, b) => b.score - a.score)
    .filter(s => kept[s.difficulty || 'normal']++ < n);
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

  // A leaderboard name is taken unless it is the one last saved on this device
  isNameTakenByOther(name) {
    const lower = name.toLowerCase();
    let own = '';
    try { own = (localStorage.getItem('neon_td_player_name') || '').toLowerCase(); } catch {}
    return lower !== own && this.highScores.some(s => s.name.toLowerCase() === lower);
  }

  save(name, wave, difficulty) {
    const entry = { name, score: this.score, wave, difficulty, date: Date.now() };
    this.highScores = topPerDifficulty([...this.highScores, entry], 50);
    try { localStorage.setItem('neon_td_scores', JSON.stringify(topPerDifficulty(this.highScores, 10))); } catch {}
    return this._submitRemote(name, wave, difficulty);
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

  async _submitRemote(name, wave, difficulty) {
    const payload = { name, score: this.score, wave, difficulty };
    this.submitFailed = false;
    try {
      const res = await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      // Rejected by the server: keep the local list, which has the run
      if (!res.ok) { this.submitFailed = true; return; }
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

// Cores and unlocked towers, saved on the device across runs
export class ProgressTracker {
  constructor() {
    this.cores = 0;
    this.unlocked = new Set(['blaster']);
    try {
      this.cores = Math.max(0, parseInt(localStorage.getItem('neon_td_cores'), 10) || 0);
      const saved = JSON.parse(localStorage.getItem('neon_td_unlocked')) || [];
      for (const type of saved) if (TOWER_DEFS[type]) this.unlocked.add(type);
    } catch {}
  }

  earn(n) {
    this.cores += n;
    this._save();
  }

  isTowerUnlocked(type) { return this.unlocked.has(type); }

  canUnlock(type) {
    const def = TOWER_DEFS[type];
    return !!def && !this.unlocked.has(type) && this.cores >= def.unlockCost;
  }

  unlock(type) {
    if (!this.canUnlock(type)) return false;
    this.cores -= TOWER_DEFS[type].unlockCost;
    this.unlocked.add(type);
    this._save();
    return true;
  }

  // First locked tower in the tower bar as { type, cost, toGo }, or null when all are unlocked
  getNextUnlock() {
    const entry = Object.entries(TOWER_DEFS).find(([type]) => !this.unlocked.has(type));
    if (!entry) return null;
    const [type, def] = entry;
    return { type, cost: def.unlockCost, toGo: Math.max(0, def.unlockCost - this.cores) };
  }

  _save() {
    try {
      localStorage.setItem('neon_td_cores', String(this.cores));
      localStorage.setItem('neon_td_unlocked', JSON.stringify([...this.unlocked].filter(t => t !== 'blaster')));
    } catch {}
  }
}
