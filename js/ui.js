import { TOWER_DEFS, ENEMY_DEFS } from './config.js';
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
    };

    this._buildTowerPanel();
    this._bindButtons();
  }

  _buildTowerPanel() {
    const list = this.elements.towerList;
    list.innerHTML = '';
    for (const [type, def] of Object.entries(TOWER_DEFS)) {
      const btn = document.createElement('div');
      btn.className = 'tower-btn';
      btn.style.setProperty('--tower-color', def.color);
      btn.innerHTML = `
        <span class="tower-name">${def.name}</span>
        <span class="tower-cost">$${def.cost}</span>
        <span class="tower-desc">${def.description}</span>
      `;
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.game.input.startPlacing(type);
      });
      list.appendChild(btn);
    }
  }

  _bindButtons() {
    document.getElementById('new-game-btn').addEventListener('click', () => {
      this.elements.menuScreen.style.display = 'none';
      this.game.startNewGame();
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
    });

    document.getElementById('play-again-btn').addEventListener('click', () => {
      this.elements.gameOverScreen.style.display = 'none';
      this.game.startNewGame();
    });

    document.querySelectorAll('.speed-btn[data-speed]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.game.setSpeed(parseInt(btn.dataset.speed));
      });
    });

    document.getElementById('pause-btn').addEventListener('click', () => {
      this.game.togglePause();
    });
  }

  updateHUD() {
    this.elements.goldValue.textContent = this.game.economy.gold;
    this.elements.waveValue.textContent = this.game.waveManager.currentWave;
    this.elements.livesValue.textContent = this.game.lives;
    this.elements.scoreValue.textContent = this.game.scoreTracker.score;
  }

  showUpgradePanel(tower) {
    const panel = this.elements.upgradePanel;
    const def = tower.def;
    const pos = gridToPixel(tower.gx, tower.gy);
    const game = this.game;

    const canModify = game.state === 'BETWEEN_WAVES';
    let html = `<div style="color:${def.color}; font-weight:bold; margin-bottom:8px">${def.name}</div>`;

    for (const [pathKey, pathLabel] of [['A', 'pathA'], ['B', 'pathB']]) {
      const upgradePath = def.upgrades[pathLabel];
      html += `<div style="margin-top:6px; color:#aaa; font-size:11px">${upgradePath.name}</div>`;
      for (let i = 0; i < upgradePath.levels.length; i++) {
        const level = upgradePath.levels[i];
        const currentLevel = pathKey === 'A' ? tower.upgradesA : tower.upgradesB;
        const purchased = i < currentLevel;
        const available = i === currentLevel && tower.getUpgradeCost(pathKey) !== null;
        const canAfford = available && game.economy.canAfford(level.cost);

        html += `<div class="upgrade-option" style="font-size:10px; padding:3px 0; color:${purchased ? '#00ff66' : available ? (canAfford ? '#fff' : '#666') : '#333'}; cursor:${canAfford ? 'pointer' : 'default'}"
          data-upgrade-path="${canAfford ? pathKey : ''}"
          >${purchased ? '&#10003;' : `$${level.cost}`} ${level.desc}</div>`;
      }
    }

    if (canModify) {
      html += `<div class="sell-btn" style="margin-top:8px; font-size:10px; color:#ff6666; cursor:pointer">SELL ($${tower.getSellValue()})</div>`;
    }

    panel.innerHTML = html;
    panel.style.display = 'block';
    panel.style.left = Math.min(pos.x + 30, CONFIG.CANVAS_WIDTH - 320) + 'px';
    panel.style.top = Math.min(pos.y, CONFIG.CANVAS_HEIGHT - 200) + 'px';

    // Bind upgrade clicks
    panel.querySelectorAll('.upgrade-option[data-upgrade-path]').forEach(el => {
      const path = el.dataset.upgradePath;
      if (path) {
        el.addEventListener('click', () => {
          game.upgradeTower(game.input.selectedTower, path);
        });
      }
    });

    // Bind sell click
    const sellBtn = panel.querySelector('.sell-btn');
    if (sellBtn) {
      sellBtn.addEventListener('click', () => { game.sellSelectedTower(); });
    }
  }

  hideUpgradePanel() {
    this.elements.upgradePanel.style.display = 'none';
  }

  showBetweenWaves() {
    this.elements.towerPanel.classList.remove('hidden');
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
  }

  showPause() { this.elements.pauseOverlay.style.display = 'flex'; }
  hidePause() { this.elements.pauseOverlay.style.display = 'none'; }

  showGameOver(score, wave) {
    this.elements.finalScore.textContent = score;
    this.elements.finalWave.textContent = wave;
    this.elements.gameOverScreen.style.display = 'flex';
  }

  updateSpeedButtons(speed) {
    document.querySelectorAll('.speed-btn[data-speed]').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.speed) === speed);
    });
  }

  _showHighScores() {
    const list = this.elements.highScoresList;
    const scores = this.game.scoreTracker.highScores;
    if (scores.length === 0) {
      list.innerHTML = '<div style="color:#666; padding:8px">No scores yet</div>';
    } else {
      list.innerHTML = scores.map((s, i) =>
        `<div class="score-entry">${i + 1}. ${s.name} — ${s.score} (Wave ${s.wave})</div>`
      ).join('');
    }
    list.style.display = list.style.display === 'block' ? 'none' : 'block';
  }
}
