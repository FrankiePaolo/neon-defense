import { TOWER_DEFS, ENEMY_DEFS, IS_MOBILE } from './config.js';
import { gridToPixel } from './utils.js';
import { CONFIG } from './config.js';

export class UIController {
  constructor(game) {
    this.game = game;
    this.elements = {
      goldValue: document.getElementById('gold-value'),
      waveValue: document.getElementById('wave-value'),
      livesValue: document.getElementById('lives-value'),
      scoreValue: document.getElementById('score-value'),
      towerList: document.getElementById('tower-list'),
      upgradePanel: document.getElementById('upgrade-panel'),
      wavePreview: document.getElementById('wave-preview'),
      wavePreviewContent: document.getElementById('wave-preview-content'),
      startWaveBtn: document.getElementById('start-wave-btn'),
      menuScreen: document.getElementById('menu-screen'),
      pauseOverlay: document.getElementById('pause-overlay'),
      gameOverScreen: document.getElementById('game-over-screen'),
      finalScore: document.getElementById('final-score'),
      finalWave: document.getElementById('final-wave'),
      highScoresList: document.getElementById('high-scores-list'),
      towerPanel: document.getElementById('tower-panel'),
      cancelPlaceBtn: document.getElementById('cancel-place-btn'),
    };

    this._buildTowerPanel();
    this._bindButtons();
  }

  _buildTowerPanel() {
    const list = this.elements.towerList;
    list.innerHTML = '';
    const progress = this.game.progressTracker;
    const currentScore = this.game.scoreTracker ? this.game.scoreTracker.score : 0;
    for (const [type, def] of Object.entries(TOWER_DEFS)) {
      const unlocked = progress.isTowerUnlocked(type, currentScore);
      const btn = document.createElement('div');
      btn.className = 'tower-btn' + (unlocked ? '' : ' tower-locked');
      btn.dataset.towerType = type;
      btn.style.setProperty('--tower-color', unlocked ? def.color : '#333');
      if (unlocked) {
        btn.innerHTML = `
          <span class="tower-name">${def.name}</span>
          <span class="tower-cost">$${def.cost}</span>
          <span class="tower-desc">${def.description}</span>
        `;
        btn.addEventListener('click', () => {
          if (!this.game.economy.canAfford(def.cost)) return;
          const currentlySelected = btn.classList.contains('selected');
          document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
          if (currentlySelected) {
            this.game.input.placingType = null;
            this.hideCancelButton();
          } else {
            btn.classList.add('selected');
            this.game.input.startPlacing(type);
          }
        });
      } else {
        btn.innerHTML = `
          <span class="tower-name locked-name">${def.name}</span>
          <span class="tower-unlock-req">SCORE ${def.unlockScore.toLocaleString()}</span>
          <span class="tower-desc">${def.description}</span>
        `;
      }
      list.appendChild(btn);
    }
  }

  refreshTowerPanel() {
    this._lastTrackerScore = -1;
    this._buildTowerPanel();
  }

  _bindButtons() {
    this.elements.menuScreen.addEventListener('click', (e) => {
      const btn = e.target.closest('.difficulty-btn');
      if (btn) {
        this.elements.menuScreen.style.display = 'none';
        this.game.startNewGame(btn.dataset.difficulty);
      }
    });

    document.getElementById('high-scores-btn').addEventListener('click', () => {
      this._showHighScores();
    });

    this.elements.startWaveBtn.addEventListener('click', () => {
      this.game.startNextWave();
    });

    document.getElementById('save-score-btn').addEventListener('click', () => {
      const name = document.getElementById('player-name').value.trim() || 'ANON';
      this.game.scoreTracker.save(name, this.game.waveManager.currentWave);
      this.elements.gameOverScreen.style.display = 'none';
      this.elements.menuScreen.style.display = 'flex';
      this.game.audio.playTrack('menu');
    });

    document.getElementById('play-again-btn').addEventListener('click', () => {
      this.elements.gameOverScreen.style.display = 'none';
      this.elements.menuScreen.style.display = 'flex';
      this.game.audio.playTrack('menu');
    });

    document.querySelectorAll('.speed-btn[data-speed]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.game.setSpeed(parseInt(btn.dataset.speed));
      });
    });

    document.getElementById('pause-btn').addEventListener('click', () => {
      this.game.togglePause();
    });

    document.getElementById('resume-btn').addEventListener('click', () => {
      this.game.togglePause();
    });

    document.getElementById('mute-btn').addEventListener('click', () => {
      const muted = this.game.audio.toggleMute();
      const btn = document.getElementById('mute-btn');
      btn.classList.toggle('active', !muted);
      btn.style.opacity = muted ? '0.4' : '';
    });

    this.elements.cancelPlaceBtn.addEventListener('click', () => {
      this.game.input.placingType = null;
      this.game.input.movingTower = null;
      this.game.input.selectedTower = null;
      document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
      this.hideUpgradePanel();
      this.hideCancelButton();
    });
  }

  updateHUD() {
    this.elements.goldValue.textContent = this.game.economy.gold;
    this.elements.waveValue.textContent = this.game.waveManager.currentWave;
    this.elements.livesValue.textContent = this.game.lives;
    this.elements.scoreValue.textContent = this.game.scoreTracker.score;
    this.updateUnlockTracker();
    this._updateTowerAffordability();
  }

  _updateTowerAffordability() {
    const gold = this.game.economy.gold;
    this.elements.towerList.querySelectorAll('.tower-btn:not(.tower-locked)').forEach(btn => {
      const type = btn.dataset.towerType;
      const def = TOWER_DEFS[type];
      if (def) {
        btn.classList.toggle('tower-unaffordable', gold < def.cost);
      }
    });
  }

  showUpgradePanel(tower) {
    const panel = this.elements.upgradePanel;
    const def = tower.def;
    const pos = gridToPixel(tower.gx, tower.gy);
    const game = this.game;

    const canModify = game.state === 'BETWEEN_WAVES';
    let html = `<div class="up-title" style="color:${def.color}">${def.name}</div>`;

    for (const [pathKey, pathLabel] of [['A', 'pathA'], ['B', 'pathB']]) {
      const upgradePath = def.upgrades[pathLabel];
      html += `<div class="up-path-name">${upgradePath.name}</div>`;
      for (let i = 0; i < upgradePath.levels.length; i++) {
        const level = upgradePath.levels[i];
        const currentLevel = pathKey === 'A' ? tower.upgradesA : tower.upgradesB;
        const purchased = i < currentLevel;
        const available = i === currentLevel && tower.getUpgradeCost(pathKey) !== null;
        const canAfford = available && game.economy.canAfford(level.cost);

        html += `<div class="upgrade-option up-level" style="color:${purchased ? '#00ff66' : available ? (canAfford ? '#fff' : '#666') : '#333'}; cursor:${canAfford ? 'pointer' : 'default'}"
          data-upgrade-path="${canAfford ? pathKey : ''}"
          >${purchased ? '&#10003;' : `$${level.cost}`} ${level.desc}</div>`;
      }
    }

    if (canModify) {
      html += `<div class="up-actions">`;
      html += `<div class="move-btn">MOVE</div>`;
      html += `<div class="sell-btn">SELL ($${tower.getSellValue()})</div>`;
      html += `</div>`;
    }

    panel.innerHTML = html;
    panel.style.display = 'block';

    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    if (isMobile) {
      panel.style.left = '';
      panel.style.top = '';
    } else {
      panel.style.left = Math.min(pos.x + 30, CONFIG.CANVAS_WIDTH - 320) + 'px';
      panel.style.top = Math.min(pos.y, CONFIG.CANVAS_HEIGHT - 200) + 'px';
    }

    // Bind upgrade clicks
    panel.querySelectorAll('.upgrade-option[data-upgrade-path]').forEach(el => {
      const path = el.dataset.upgradePath;
      if (path) {
        el.addEventListener('click', () => {
          game.upgradeTower(game.input.selectedTower, path);
        });
      }
    });

    // Bind move click
    const moveBtn = panel.querySelector('.move-btn');
    if (moveBtn) {
      moveBtn.addEventListener('click', () => {
        game.input.startMoving(game.input.selectedTower);
      });
    }

    // Bind sell click
    const sellBtn = panel.querySelector('.sell-btn');
    if (sellBtn) {
      sellBtn.addEventListener('click', () => { game.sellSelectedTower(); });
    }
  }

  hideUpgradePanel() {
    this.elements.upgradePanel.style.display = 'none';
  }

  showCancelButton() {
    this.elements.cancelPlaceBtn.classList.remove('hidden');
  }

  hideCancelButton() {
    this.elements.cancelPlaceBtn.classList.add('hidden');
  }

  showBetweenWaves() {
    this._buildTowerPanel();
    this.elements.towerPanel.classList.remove('hidden');
    this.elements.startWaveBtn.textContent = IS_MOBILE ? 'START WAVE' : 'START WAVE (SPACE)';
    this.elements.startWaveBtn.style.display = 'block';
    const preview = this.game.waveManager.getPreview();
    const text = Object.entries(preview).map(([type, count]) => {
      const def = ENEMY_DEFS[type];
      return `<span style="color:${def.color}">${count}x ${def.name}</span>`;
    }).join(' ');
    this.elements.wavePreviewContent.innerHTML = text;
    this.elements.wavePreview.style.display = 'block';
  }

  hideBetweenWaves() {
    this.elements.towerPanel.classList.add('hidden');
    this.elements.startWaveBtn.style.display = 'none';
    this.elements.wavePreview.style.display = 'none';
    this.hideCancelButton();
  }

  showPause() { this.elements.pauseOverlay.style.display = 'flex'; }
  hidePause() { this.elements.pauseOverlay.style.display = 'none'; }

  showGameOver(score, wave) {
    this.hideUnlockTracker();
    this.elements.finalScore.textContent = score;
    this.elements.finalWave.textContent = wave;

    const nextUnlockEl = document.getElementById('next-unlock-hint');
    const next = this.game.progressTracker.getNextUnlock(score);
    if (next && nextUnlockEl) {
      const remaining = next.score - Math.max(this.game.progressTracker.bestScore, score);
      nextUnlockEl.innerHTML = `Next unlock: <span style="color:${TOWER_DEFS[next.type].color}">${next.name}</span> in <span style="color:#ffd700">${remaining.toLocaleString()}</span> pts`;
      nextUnlockEl.style.display = 'block';
    } else if (nextUnlockEl) {
      nextUnlockEl.style.display = 'none';
    }

    this.elements.gameOverScreen.style.display = 'flex';
  }

  updateSpeedButtons(speed) {
    document.querySelectorAll('.speed-btn[data-speed]').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.speed) === speed);
    });
  }

  updateUnlockTracker() {
    const el = document.getElementById('unlock-tracker');
    if (!el) return;
    const score = this.game.scoreTracker.score;
    if (score === this._lastTrackerScore) return;
    this._lastTrackerScore = score;

    const best = this.game.progressTracker.bestScore;
    const effective = Math.max(score, best);
    const next = this.game.progressTracker.getNextUnlock(effective);

    if (!next) {
      el.classList.add('hidden');
      return;
    }

    const allThresholds = Object.values(TOWER_DEFS)
      .map(d => d.unlockScore || 0)
      .sort((a, b) => a - b);
    const prevThreshold = allThresholds.filter(t => t <= effective).pop() || 0;
    const range = next.score - prevThreshold;
    const progress = Math.min((effective - prevThreshold) / range, 1);
    const color = TOWER_DEFS[next.type].color;

    el.innerHTML = `
      <div class="unlock-label" style="color:${color}">${next.name}</div>
      <div class="unlock-bar-bg">
        <div class="unlock-bar-fill" style="width:${Math.round(progress * 100)}%; background:${color}; color:${color}"></div>
      </div>
    `;
    el.classList.remove('hidden');
  }

  hideUnlockTracker() {
    const el = document.getElementById('unlock-tracker');
    if (el) el.classList.add('hidden');
  }

  showUnlockNotifications(newUnlocks) {
    let existing = document.getElementById('unlock-notification');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'unlock-notification';
    const names = newUnlocks.map(u => `<span style="color:${u.def.color}">${u.def.name}</span>`).join(', ');
    container.innerHTML = `
      <div class="unlock-title">NEW TOWER${newUnlocks.length > 1 ? 'S' : ''} UNLOCKED</div>
      <div class="unlock-names">${names}</div>
    `;
    document.getElementById('canvas-wrapper').appendChild(container);
    setTimeout(() => container.classList.add('unlock-visible'), 50);
    setTimeout(() => {
      container.classList.remove('unlock-visible');
      setTimeout(() => container.remove(), 500);
    }, 4000);
  }

  async _showHighScores() {
    const list = this.elements.highScoresList;
    const tracker = this.game.scoreTracker;

    if (!tracker.globalLoaded) {
      list.innerHTML = '<div style="color:#666; padding:8px">Loading...</div>';
      list.style.display = 'block';
      await tracker.fetchGlobalScores();
    }

    const scores = tracker.highScores;
    if (scores.length === 0) {
      list.innerHTML = '<div style="color:#666; padding:8px">No scores yet</div>';
    } else {
      list.innerHTML = scores.map((s, i) =>
        `<div class="score-entry">${i + 1}. ${s.name} — ${s.score.toLocaleString()} (Wave ${s.wave})</div>`
      ).join('');
    }
    list.style.display = list.style.display === 'block' ? 'none' : 'block';
  }
}
