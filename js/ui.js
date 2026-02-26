import { TOWER_DEFS, ENEMY_DEFS, IS_MOBILE } from './config.js';
import { gridToPixel } from './utils.js';
import { CONFIG } from './config.js';
import { t, getLang, setLang } from './i18n.js';

const STAT_LABELS = {
  fireRate: 'RATE', damage: 'DMG', range: 'RNG',
  slowAmount: 'SLOW', slowDuration: 'DUR',
  chainCount: 'CHAIN', chainDecay: 'DECAY', chainRange: 'C.RNG',
  splashRadius: 'SPLASH', damageAmp: 'AMP', buffRange: 'B.RNG',
  goldPerWave: 'GOLD', fireRateAmp: 'SPD AMP',
};

function formatStatVal(key, val) {
  if (key === 'slowAmount' || key === 'damageAmp' || key === 'fireRateAmp' ||
      key === 'splashDecay' || key === 'chainDecay') return Math.round(val * 100) + '%';
  return val;
}

function formatStatChanges(stats) {
  return Object.entries(stats)
    .filter(([k]) => STAT_LABELS[k])
    .map(([k, v]) => `${STAT_LABELS[k]} ${formatStatVal(k, v)}`)
    .join('  ');
}

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
    this.applyLanguage();
  }

  applyLanguage() {
    // Menu
    document.querySelector('#menu-screen h1').textContent = t('menu.title');
    document.getElementById('difficulty-label').textContent = t('menu.difficulty');
    document.querySelector('[data-difficulty="hard"]').textContent = t('menu.hard');
    document.querySelector('[data-difficulty="normal"]').textContent = t('menu.normal');
    document.querySelector('[data-difficulty="easy"]').textContent = t('menu.easy');
    document.getElementById('high-scores-btn').textContent = t('menu.scores');

    // HUD
    document.querySelector('#hud-wave').innerHTML = `${t('hud.wave')} <span id="wave-value">${this.elements.waveValue.textContent}</span>`;
    document.querySelector('#hud-score').innerHTML = `${t('hud.score')} <span id="score-value">${this.elements.scoreValue.textContent}</span>`;
    this.elements.waveValue = document.getElementById('wave-value');
    this.elements.scoreValue = document.getElementById('score-value');

    // Buttons
    this.elements.cancelPlaceBtn.textContent = t('game.cancel');

    // Pause
    document.querySelector('#pause-overlay h2').textContent = t('game.paused');
    document.querySelector('#pause-overlay p').textContent = t('game.pauseHint');
    document.getElementById('resume-btn').textContent = t('game.resume');

    // Game over
    document.querySelector('#game-over-screen h2').textContent = t('game.gameOver');
    document.querySelector('#game-over-screen p:nth-of-type(1)').innerHTML = `${t('game.score')}: <span id="final-score">${this.elements.finalScore.textContent}</span>`;
    document.querySelector('#game-over-screen p:nth-of-type(2)').innerHTML = `${t('game.wave')}: <span id="final-wave">${this.elements.finalWave.textContent}</span>`;
    this.elements.finalScore = document.getElementById('final-score');
    this.elements.finalWave = document.getElementById('final-wave');
    document.getElementById('player-name').placeholder = t('game.enterName');
    document.getElementById('save-score-btn').textContent = t('game.saveScore');
    document.getElementById('play-again-btn').textContent = t('game.playAgain');

    // Tower panel title
    document.querySelector('#tower-panel h3').textContent = t('towers.title');

    // Wave preview label
    const wpEl = document.getElementById('wave-preview');
    if (wpEl) {
      wpEl.firstChild.textContent = t('game.next') + ': ';
    }

    // Language buttons
    document.querySelectorAll('.lang-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.lang === getLang());
    });

    // Rebuild tower panel with new language
    this._buildTowerPanel();
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
          <span class="tower-name">${t('tower.' + type)}</span>
          <span class="tower-cost">$${def.cost}</span>
          <span class="tower-desc">${t('tower.' + type + '.desc')}</span>
        `;
        btn.addEventListener('click', () => {
          if (this.game.tutorial.isBlocking()) return;
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
          <span class="tower-name locked-name">${t('tower.' + type)}</span>
          <span class="tower-unlock-req">${t('hud.score')} ${def.unlockScore.toLocaleString()}</span>
          <span class="tower-desc">${t('tower.' + type + '.desc')}</span>
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
      const diffBtn = e.target.closest('.difficulty-btn');
      if (diffBtn) {
        this.elements.menuScreen.style.display = 'none';
        this.game.startNewGame(diffBtn.dataset.difficulty);
      }
      const langBtn = e.target.closest('.lang-btn');
      if (langBtn) {
        setLang(langBtn.dataset.lang);
        this.applyLanguage();
      }
    });

    document.getElementById('high-scores-btn').addEventListener('click', () => {
      this._showHighScores();
    });

    this.elements.startWaveBtn.addEventListener('click', () => {
      this.game.startNextWave();
    });

    const saveBtn = document.getElementById('save-score-btn');
    const nameInput = document.getElementById('player-name');
    saveBtn.disabled = true;
    const updateSaveBtn = () => { saveBtn.disabled = !nameInput.value.trim(); };
    nameInput.addEventListener('input', updateSaveBtn);
    nameInput.addEventListener('change', updateSaveBtn);
    nameInput.addEventListener('keyup', updateSaveBtn);
    saveBtn.addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) return;
      saveBtn.disabled = true;
      try { localStorage.setItem('neon_td_player_name', name); } catch {}
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
    if (this.game.state === 'BETWEEN_WAVES') {
      this.elements.startWaveBtn.disabled = this.game.towers.length === 0;
    }
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
    const type = tower.type;
    const pos = gridToPixel(tower.gx, tower.gy);
    const game = this.game;

    const canModify = game.state === 'BETWEEN_WAVES';
    let html = `<div class="up-title" style="color:${def.color}">${t('tower.' + type)}</div>`;

    // Current stats summary
    const s = tower.currentStats;
    html += `<div class="up-stats">`;
    if (s.damage > 0) html += `<span>DMG ${s.damage}</span>`;
    if (s.fireRate > 0) html += `<span>RATE ${s.fireRate}/s</span>`;
    html += `<span>RNG ${s.range}</span>`;
    if (s.slowAmount) html += `<span>SLOW ${Math.round(s.slowAmount * 100)}%</span>`;
    if (s.chainCount) html += `<span>CHAIN ${s.chainCount}</span>`;
    if (s.splashRadius) html += `<span>SPLASH ${s.splashRadius}</span>`;
    if (s.damageAmp) html += `<span>AMP +${Math.round(s.damageAmp * 100)}%</span>`;
    if (s.goldPerWave) html += `<span>+${s.goldPerWave}g/wave</span>`;
    html += `</div>`;

    for (const [pathKey, pathLabel] of [['A', 'pathA'], ['B', 'pathB']]) {
      const upgradePath = def.upgrades[pathLabel];
      html += `<div class="up-path-name">${t('up.' + type + '.' + pathKey)}</div>`;
      for (let i = 0; i < upgradePath.levels.length; i++) {
        const level = upgradePath.levels[i];
        const currentLevel = pathKey === 'A' ? tower.upgradesA : tower.upgradesB;
        const purchased = i < currentLevel;
        const available = i === currentLevel && tower.getUpgradeCost(pathKey) !== null;
        const canAfford = available && canModify && game.economy.canAfford(level.cost);
        const desc = t('up.' + type + '.' + pathKey + '.' + i);

        const changes = formatStatChanges(level.stats);
        const changesHtml = changes ? `<span class="up-changes">${changes}</span>` : '';

        if (purchased) {
          html += `<div class="upgrade-option up-level up-purchased" data-upgrade-path="">
            <span class="up-check">&#10003;</span><span class="up-info"><span class="up-desc">${desc}</span>${changesHtml}</span></div>`;
        } else if (available) {
          html += `<div class="upgrade-option up-level ${canAfford ? 'up-available' : 'up-unaffordable'}"
            data-upgrade-path="${canAfford ? pathKey : ''}">
            <span class="up-cost">$${level.cost}</span><span class="up-info"><span class="up-desc">${desc}</span>${changesHtml}</span></div>`;
        } else {
          html += `<div class="upgrade-option up-level up-locked">
            <span class="up-cost">$${level.cost}</span><span class="up-info"><span class="up-desc">${desc}</span>${changesHtml}</span></div>`;
        }
      }
    }

    if (canModify) {
      html += `<div class="up-actions">`;
      html += `<div class="move-btn">${t('towers.move')}</div>`;
      html += `<div class="sell-btn">${t('towers.sell')} ($${tower.getSellValue()})</div>`;
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
    this.elements.towerPanel.classList.remove('panel-hidden');
    this.elements.startWaveBtn.textContent = IS_MOBILE ? t('game.startWave') : t('game.startWaveDesktop');
    this.elements.startWaveBtn.disabled = this.game.towers.length === 0;
    const preview = this.game.waveManager.getPreview();
    const text = Object.entries(preview).map(([type, count]) => {
      const def = ENEMY_DEFS[type];
      return `<span style="color:${def.color}">${count}x ${t('enemy.' + type)}</span>`;
    }).join(' ');
    this.elements.wavePreviewContent.innerHTML = text;
    document.getElementById('wave-controls').classList.add('visible');
  }

  hideBetweenWaves() {
    this.elements.towerPanel.classList.add('panel-hidden');
    document.getElementById('wave-controls').classList.remove('visible');
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
      const towerName = t('tower.' + next.type);
      nextUnlockEl.innerHTML = `${t('unlock.next')}: <span style="color:${TOWER_DEFS[next.type].color}">${towerName}</span> ${t('unlock.in')} <span style="color:#ffd700">${remaining.toLocaleString()}</span> ${t('unlock.pts')}`;
      nextUnlockEl.style.display = 'block';
    } else if (nextUnlockEl) {
      nextUnlockEl.style.display = 'none';
    }

    const nameInput = document.getElementById('player-name');
    const saveBtn = document.getElementById('save-score-btn');
    const lastUsed = localStorage.getItem('neon_td_player_name') || '';
    nameInput.value = lastUsed;
    saveBtn.disabled = !lastUsed;

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
    const prevThreshold = allThresholds.filter(th => th <= effective).pop() || 0;
    const range = next.score - prevThreshold;
    const progress = Math.min((effective - prevThreshold) / range, 1);
    const color = TOWER_DEFS[next.type].color;
    const towerName = t('tower.' + next.type);

    el.innerHTML = `
      <div class="unlock-label" style="color:${color}">${towerName}</div>
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

  dismissUnlockNotification() {
    const el = document.getElementById('unlock-notification');
    if (el) el.remove();
  }

  showUnlockNotifications(newUnlocks) {
    let existing = document.getElementById('unlock-notification');
    if (existing) existing.remove();

    const container = document.createElement('div');
    container.id = 'unlock-notification';
    const names = newUnlocks.map(u => `<span style="color:${u.def.color}">${t('tower.' + u.type)}</span>`).join(', ');
    container.innerHTML = `
      <div class="unlock-title">${newUnlocks.length > 1 ? t('unlock.plural') : t('unlock.single')}</div>
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
    const wasVisible = list.style.display === 'block';

    if (!tracker.globalLoaded) {
      list.innerHTML = `<div style="color:#666; padding:8px">${t('scores.loading')}</div>`;
      list.style.display = 'block';
      await tracker.fetchGlobalScores();
    }

    const scores = tracker.highScores;
    if (scores.length === 0) {
      list.innerHTML = `<div style="color:#666; padding:8px">${t('scores.empty')}</div>`;
    } else {
      list.innerHTML = scores.map((s, i) =>
        `<div class="score-entry">${i + 1}. ${s.name} — ${s.score.toLocaleString()} (${t('game.wave')} ${s.wave})</div>`
      ).join('');
    }
    list.style.display = wasVisible ? 'none' : 'block';
  }
}
