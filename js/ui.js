import { TOWER_DEFS, ENEMY_DEFS, IS_MOBILE } from './config.js';
import { gridToPixel } from './utils.js';
import { CONFIG } from './config.js';
import { t, getLang, setLang, cores } from './i18n.js';
import { ICONS } from './icons.js';
import { towerSprite, enemySprite, spriteImg } from './sprites.js';
import { encodeChallenge } from './challenge.js';

// Stat key -> [i18n label key, icon]
const STAT_LABELS = {
  damage: ['stats.dmg', 'damage'], fireRate: ['stats.rate', 'fireRate'], range: ['stats.rng', 'range'],
  slowAmount: ['stats.slow', 'slow'], slowDuration: ['stats.slowDuration', 'slow'],
  chainCount: ['stats.chain', 'chain'], chainDecay: ['stats.chainDecay', 'chain'], chainRange: ['stats.chainRange', 'chain'],
  splashRadius: ['stats.splash', 'splash'], damageAmp: ['stats.amp', 'boost'], buffRange: ['stats.buffRange', 'boost'],
  goldPerWave: ['stats.gold', 'coin'], fireRateAmp: ['stats.rateAmp', 'boost'],
};

// "<icon> Label value" for one stat
function statHTML(key, val, valColor) {
  const [labelKey, icon] = STAT_LABELS[key];
  const shown = (key === 'damageAmp' || key === 'fireRateAmp' ? '+' : '') + formatStatVal(key, val);
  const valHtml = valColor ? `<span class="ttp-stat-val" style="color:${valColor}">${shown}</span>` : shown;
  return `<span class="stat">${ICONS[icon]}${t(labelKey)} ${valHtml}</span>`;
}

// Stats a tower shows in its details, in display order
const SHOWN_STATS = ['damage', 'fireRate', 'range', 'slowAmount', 'chainCount', 'splashRadius', 'damageAmp', 'goldPerWave'];

function formatStatVal(key, val) {
  if (key === 'slowAmount' || key === 'damageAmp' || key === 'fireRateAmp' ||
      key === 'splashDecay' || key === 'chainDecay') return Math.round(val * 100) + '%';
  return val;
}

function formatStatChanges(stats) {
  return Object.entries(stats)
    .filter(([k]) => STAT_LABELS[k])
    .map(([k, v]) => `${t(STAT_LABELS[k][0])} ${formatStatVal(k, v)}`)
    .join(' · ');
}

// One definition of "phone layout", shared with the CSS phone rules in index.html.
// IS_MOBILE (touch) only decides tap versus hover.
// Seconds as mm:ss, the survival time on the end card
function formatTime(seconds) {
  const s = Math.floor(seconds || 0);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

const PHONE_LAYOUT = '(max-width: 768px), (max-height: 500px) and (pointer: coarse)';

export function isPhoneLayout() {
  return window.matchMedia(PHONE_LAYOUT).matches;
}

export class UIController {
  /** @param {import('./game.js').Game} game */
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
      startWaveBtn: /** @type {HTMLButtonElement} */ (document.getElementById('start-wave-btn')),
      menuScreen: document.getElementById('menu-screen'),
      pauseOverlay: document.getElementById('pause-overlay'),
      gameOverScreen: document.getElementById('game-over-screen'),
      finalScore: document.getElementById('final-score'),
      finalWave: document.getElementById('final-wave'),
      highScoresList: document.getElementById('high-scores-list'),
      towerPanel: document.getElementById('tower-panel'),
      cancelPlaceBtn: document.getElementById('cancel-place-btn'),
      towerStatsTooltip: document.getElementById('tower-stats-tooltip'),
    };

    this._previewingType = null;

    this._buildTowerPanel();
    this._bindButtons();
    this._placeCancelButton();
    window.matchMedia(PHONE_LAYOUT).addEventListener('change', () => this._placeCancelButton());
    window.addEventListener('resize', () => this._fitSheet());
    new ResizeObserver(() => this.fitBoard()).observe(document.getElementById('board-slot'));
    window.visualViewport?.addEventListener('resize', () => this.fitBoard());
    this.applyLanguage();
  }

  // The board's displayed size: the largest that fits the slot CSS leaves
  // for it, keeping the ratio, at most twice the logical size. The slot never
  // depends on the canvas, so this cannot loop. Wave controls placed under the
  // board follow it through --board-bottom.
  fitBoard() {
    const slot = document.getElementById('board-slot');
    const w = CONFIG.CANVAS_WIDTH, h = CONFIG.CANVAS_HEIGHT;
    const scale = Math.min(slot.clientWidth / w, slot.clientHeight / h, 2);
    if (!(scale > 0)) return;
    const canvas = this.game.renderer.canvas;
    canvas.style.width = w * scale + 'px';
    canvas.style.height = h * scale + 'px';
    const container = document.getElementById('game-container');
    container.style.setProperty('--board-w', w * scale + 'px');
    const top = slot.getBoundingClientRect().top - slot.parentElement.getBoundingClientRect().top;
    container.style.setProperty('--board-bottom', top + h * scale + 'px');
    this.game.renderer.resize(scale);
  }

  applyLanguage() {
    // Menu
    document.querySelector('#menu-screen h1').textContent = t('menu.title');
    document.getElementById('difficulty-label').textContent = t('menu.difficulty');
    for (const diff of ['easy', 'normal', 'hard']) {
      document.querySelector(`[data-difficulty="${diff}"]`).innerHTML =
        `${t('menu.' + diff)}<span class="diff-sub">${t('menu.' + diff + '.sub')}</span>`;
    }
    document.getElementById('high-scores-btn').textContent = t('menu.scores');
    if (this.elements.highScoresList.style.display === 'block') this._renderHighScores(this._board);

    // HUD: icon and value, with a word label under them
    const hudItem = (id, icon, valueId, label, extra = '') => {
      document.getElementById(id).innerHTML =
        `<span class="hud-main">${ICONS[icon]}<span id="${valueId}">${document.getElementById(valueId).textContent}</span>${extra}</span>` +
        `<span class="hud-label">${t(label)}</span>`;
    };
    hudItem('hud-gold', 'coin', 'gold-value', 'hud.gold');
    hudItem('hud-wave', 'wave', 'wave-value', 'hud.wave', `<span class="hud-total">/ ${CONFIG.MAX_WAVES}</span>`);
    hudItem('hud-lives', 'heart', 'lives-value', 'hud.lives');
    hudItem('hud-score', 'star', 'score-value', 'hud.score');
    this.elements.goldValue = document.getElementById('gold-value');
    this.elements.waveValue = document.getElementById('wave-value');
    this.elements.livesValue = document.getElementById('lives-value');
    this.elements.scoreValue = document.getElementById('score-value');

    // Buttons
    this.elements.cancelPlaceBtn.textContent = t('game.cancel');
    this.updateSpeedButtons(this.game.speedMultiplier || 1);
    const pauseBtn = document.getElementById('pause-btn');
    pauseBtn.innerHTML = ICONS.pause;
    pauseBtn.setAttribute('aria-label', t('ctrl.pause'));
    document.getElementById('mute-btn').setAttribute('aria-label', t('ctrl.sound'));

    // Pause
    document.querySelector('#pause-overlay h2').textContent = t('game.paused');
    document.querySelector('#pause-overlay p').textContent = t('game.pauseHint');
    document.getElementById('resume-btn').textContent = t('game.resume');
    document.getElementById('restart-btn').textContent = t('game.restart');
    document.getElementById('main-menu-btn').textContent = t('game.mainMenu');
    document.getElementById('replay-tutorial-btn').textContent = t('game.replayTutorial');

    // Game over
    document.querySelector('#game-over-screen h2').textContent = t(this._won ? 'game.victory' : 'game.gameOver');
    document.getElementById('final-rank-label').textContent = t('game.rank');
    document.getElementById('final-time-label').textContent = t('game.survival');
    document.getElementById('share-cta-title').textContent = t('share.cta.title');
    document.getElementById('share-cta-sub').textContent = t('share.cta.sub');
    if (this._lastWave !== undefined) this.elements.finalWave.textContent = t('game.waveReached').replace('{n}', this._lastWave);
    if (this._linkChallenge) this.showChallengeBanner(this._linkChallenge);
    /** @type {HTMLInputElement} */ (document.getElementById('player-name')).placeholder = t('game.enterName');
    document.getElementById('save-score-btn').textContent = t('game.saveScore');
    document.getElementById('share-score-btn').textContent = t('share.button');
    document.getElementById('retry-map-btn').textContent = t('game.retryMap');
    document.getElementById('play-again-btn').textContent = t('game.newMap');
    document.getElementById('end-menu-btn').textContent = t('game.mainMenu');
    if (this._won !== undefined) this._fillCoreProgress();
    this._trackerKey = null;

    // Tower panel title and the mid-wave note
    document.querySelector('#tower-panel h3').textContent = t('towers.title');
    document.getElementById('build-note').textContent = t('phase.buildAfter');
    this._updatePhaseLabel();

    // Wave preview label
    const wpEl = document.getElementById('wave-preview');
    if (wpEl) {
      wpEl.firstChild.textContent = t('game.next') + ': ';
    }

    // Language buttons
    document.querySelectorAll('.lang-btn').forEach((/** @type {HTMLElement} */ b) => {
      b.classList.toggle('active', b.dataset.lang === getLang());
    });

    // Rebuild tower panel with new language
    this._buildTowerPanel();
  }

  _buildTowerPanel() {
    this._hideTooltip();
    const list = this.elements.towerList;
    list.innerHTML = '';
    const progress = this.game.progressTracker;
    for (const [type, def] of Object.entries(TOWER_DEFS)) {
      const unlocked = progress.isTowerUnlocked(type);
      const btn = document.createElement('div');
      btn.className = 'tower-btn' + (unlocked ? '' : ' tower-locked') +
        (progress.canUnlock(type) ? ' tower-can-unlock' : '') +
        (type === this.game.input.placingType ? ' selected' : '');
      btn.dataset.towerType = type;
      // The phone tray shows picture and price only, so the name is the accessible name
      btn.setAttribute('role', 'button');
      btn.setAttribute('aria-label', t('tower.' + type));
      btn.style.setProperty('--tower-color', unlocked ? def.color : '#333');
      if (unlocked) {
        btn.innerHTML = `
          ${spriteImg(towerSprite(type), 'tower-pic')}
          <span class="tower-text">
            <span class="tower-name">${t('tower.' + type)}</span>
            <span class="tower-cost">${ICONS.coin}${def.cost}</span>
            <span class="tower-need"></span>
            <span class="tower-desc">${t('tower.' + type + '.desc')}</span>
          </span>
        `;
        btn.addEventListener('click', () => {
          if (!this.game.tutorial.allows('pickTower')) return;

          if (IS_MOBILE) {
            if (this._previewingType === type) {
              // Same tower tapped again — deselect
              this._hideTooltip();
              return;
            }
            // Show stats preview (PLACE button in tooltip enters placement mode)
            this.game.input.clearCarry();
            this._previewingType = type;
            btn.classList.add('previewing');
            this._showMobileTooltip(type);
          } else {
            // Desktop: immediate placement toggle
            if (!this.game.economy.canAfford(def.cost)) return;
            if (this.game.input.placingType === type) this.game.input.clearCarry();
            else this.game.input.startPlacing(type);
          }
        });
      } else {
        btn.innerHTML = `
          <span class="tower-pic-wrap">${spriteImg(towerSprite(type), 'tower-pic')}${progress.canUnlock(type) ? ICONS.unlock : ICONS.lock}</span>
          <span class="tower-text">
            <span class="tower-name locked-name">${t('tower.' + type)}</span>
            <span class="tower-unlock-req">${t('unlock.price').replace('{n}', cores(def.unlockCost))}</span>
            <span class="tower-short-price">${ICONS.core}${def.unlockCost}</span>
            <span class="tower-desc">${t('tower.' + type + '.desc')}</span>
          </span>
        `;
        if (IS_MOBILE) {
          btn.addEventListener('click', () => {
            if (this._previewingType === type) {
              this._hideTooltip();
            } else {
              this.game.input.clearCarry();
              this._previewingType = type;
              btn.classList.add('previewing');
              this._showMobileTooltip(type);
            }
          });
        } else {
          btn.addEventListener('click', () => this._unlockTower(type));
        }
      }

      // Desktop: hover tooltip for all towers (unlocked + locked)
      if (!IS_MOBILE) {
        btn.addEventListener('mouseenter', () => {
          this._showDesktopTooltip(type, btn);
        });
        btn.addEventListener('mouseleave', () => {
          this._hideTooltip();
        });
      }

      list.appendChild(btn);
    }
  }

  refreshTowerPanel() {
    this._trackerKey = null;
    this._buildTowerPanel();
  }

  // Spend cores on a locked tower, then show it as a new tower
  _unlockTower(type) {
    if (!this.game.progressTracker.unlock(type)) return;
    this.showUnlockNotifications([{ type, def: TOWER_DEFS[type] }]);
    this.refreshTowerPanel();
    document.querySelector(`.tower-btn[data-tower-type="${type}"]`)?.classList.add('tower-unlocked-pulse');
    this.updateUnlockTracker();
  }

  _bindButtons() {
    this.elements.menuScreen.addEventListener('click', (e) => {
      const target = /** @type {Element} */ (e.target);
      const diffBtn = /** @type {HTMLElement} */ (target.closest('.difficulty-btn'));
      if (diffBtn) {
        this.elements.menuScreen.style.display = 'none';
        this.game.startNewGame(diffBtn.dataset.difficulty);
      }
      if (target.closest('#accept-challenge-btn')) {
        this.elements.menuScreen.style.display = 'none';
        this.game.startNewGame(this._linkChallenge.difficulty, this._linkChallenge);
      }
      const langBtn = /** @type {HTMLElement} */ (target.closest('.lang-btn'));
      if (langBtn) {
        setLang(langBtn.dataset.lang);
        this.applyLanguage();
      }
    });

    document.getElementById('high-scores-btn').addEventListener('click', (e) => {
      /** @type {HTMLElement} */ (e.currentTarget).blur();
      this._showHighScores();
    });

    // Board tabs are redrawn with the list, so listen on the list
    this.elements.highScoresList.addEventListener('click', (e) => {
      const tab = /** @type {HTMLElement} */ (/** @type {Element} */ (e.target).closest('.board-tab'));
      if (tab) this._renderHighScores(tab.dataset.board);
    });

    this.elements.startWaveBtn.addEventListener('click', () => {
      this.game.startNextWave();
    });

    document.getElementById('repair-btn').addEventListener('click', () => {
      this.game.repairLife();
    });

    const saveBtn = /** @type {HTMLButtonElement} */ (document.getElementById('save-score-btn'));
    const nameInput = /** @type {HTMLInputElement} */ (document.getElementById('player-name'));
    const nameWarn = document.getElementById('name-taken-warn');
    saveBtn.disabled = true;
    const updateSaveBtn = () => {
      nameWarn.style.visibility = 'hidden';
      saveBtn.disabled = !nameInput.value.trim();
    };
    nameInput.addEventListener('input', updateSaveBtn);
    nameInput.addEventListener('change', updateSaveBtn);
    nameInput.addEventListener('keyup', updateSaveBtn);
    saveBtn.addEventListener('click', async () => {
      const name = nameInput.value.trim();
      if (!name) return;
      if (this.game.scoreTracker.isNameTakenByOther(name)) {
        nameWarn.textContent = t('game.nameTaken');
        nameWarn.style.display = '';
        nameWarn.style.visibility = 'visible';
        return;
      }
      saveBtn.disabled = true;
      try { localStorage.setItem('neon_td_player_name', name); } catch {}
      await this.game.scoreTracker.save(name, this.game.waveManager.currentWave, this.game.difficulty);
      if (this.game.scoreTracker.submitFailed) {
        nameWarn.textContent = t('score.notSaved');
        nameWarn.style.display = '';
        nameWarn.style.visibility = 'visible';
        return;
      }
      this.game.returnToMenu();
    });

    // The same map and waves again, so the player can try what the loss taught
    document.getElementById('retry-map-btn').addEventListener('click', () => {
      this.elements.gameOverScreen.style.display = 'none';
      this.elements.towerPanel.style.display = '';
      this.game.startNewGame(this.game.difficulty, this.game.challenge, { seed: this.game.seed, board: this.game.board });
    });

    // A fresh run on the same difficulty, as RESTART on the pause screen
    document.getElementById('play-again-btn').addEventListener('click', () => {
      this.elements.gameOverScreen.style.display = 'none';
      this.elements.towerPanel.style.display = '';
      this.game.startNewGame(this.game.difficulty, this.game.challenge);
    });

    document.getElementById('end-menu-btn').addEventListener('click', () => {
      this.game.returnToMenu();
    });

    document.getElementById('share-score-btn').addEventListener('click', () => {
      this._shareScore();
    });

    // One button cycles 1x, 2x, 3x
    document.getElementById('speed-btn').addEventListener('click', () => {
      this.game.setSpeed((this.game.speedMultiplier || 1) % 3 + 1);
    });

    document.getElementById('pause-btn').addEventListener('click', () => {
      this.game.togglePause();
    });

    document.getElementById('resume-btn').addEventListener('click', () => {
      this.game.togglePause();
    });

    document.getElementById('replay-tutorial-btn').addEventListener('click', () => {
      this.game.togglePause();
      this.hidePause();
      this.game.tutorial.replay();
      this.game.startNewGame(this.game.difficulty, this.game.challenge);
    });

    // A fresh run on the same difficulty, or the same challenge again
    document.getElementById('restart-btn').addEventListener('click', () => {
      this.hidePause();
      this.game.startNewGame(this.game.difficulty, this.game.challenge);
    });

    document.getElementById('main-menu-btn').addEventListener('click', () => {
      this.game.returnToMenu();
    });

    document.getElementById('mute-btn').addEventListener('click', () => {
      this.setMuteIcon(this.game.audio.toggleMute());
    });

    this.elements.cancelPlaceBtn.addEventListener('click', () => {
      this.game.input.clearCarry();
    });
  }

  updateHUD() {
    this.elements.goldValue.textContent = String(this.game.economy.gold);
    this.elements.waveValue.textContent = String(this.game.waveManager.currentWave);
    this.elements.livesValue.textContent = String(this.game.lives);
    this.elements.scoreValue.textContent = String(this.game.scoreTracker.score);
    if (this.game.state === 'BETWEEN_WAVES') {
      this.elements.startWaveBtn.disabled = this.game.towers.length === 0 || !this.game.tutorial.allows('startWave');
      this._updatePhaseLabel();
      this.updateRepairButton();
    }
    this.updateWaveProgress();
    this.updateUnlockTracker();
    this._updateTowerAffordability();
  }

  // +1 life and its price, shown while lives are below the start
  updateRepairButton() {
    const btn = /** @type {HTMLButtonElement} */ (document.getElementById('repair-btn'));
    const cost = this.game.getRepairCost();
    btn.classList.toggle('hidden', cost === null);
    if (cost === null) return;
    btn.innerHTML = `${ICONS.heart}+1 <span class="repair-cost">${ICONS.coin}${cost}</span>`;
    btn.disabled = !this.game.economy.canAfford(cost);
    btn.setAttribute('aria-label', t('game.repair').replace('{n}', cost));
  }

  updateWaveProgress() {
    const remaining = this.game.enemies.filter(enemy => enemy.active && !enemy.reachedEnd).length;
    const text = t('wave.progress', { spawning: this.game.waveManager.spawnQueue.length, remaining });
    const progress = document.getElementById('wave-progress');
    if (progress.textContent !== text) progress.textContent = text;
  }

  _updateTowerAffordability() {
    const gold = this.game.economy.gold;
    this.elements.towerList.querySelectorAll('.tower-btn:not(.tower-locked)').forEach((/** @type {HTMLElement} */ btn) => {
      const type = btn.dataset.towerType;
      const def = TOWER_DEFS[type];
      if (def) {
        const short = def.cost - gold;
        btn.classList.toggle('tower-unaffordable', short > 0);
        const need = btn.querySelector('.tower-need');
        if (need) need.textContent = short > 0 ? t('panel.need').replace('{n}', short) : '';
      }
    });
  }

  showUpgradePanel(tower, upgradedStats = null) {
    const panel = this.elements.upgradePanel;
    const def = tower.def;
    const type = tower.type;
    const pos = gridToPixel(tower.gx, tower.gy);
    const game = this.game;

    const canModify = game.state === 'BETWEEN_WAVES';
    let html = `<button class="up-close" aria-label="${t('ctrl.close')}">&times;</button>`;
    html += `<div class="up-title" style="color:${def.color}">${spriteImg(towerSprite(type, tower.upgradesB ? 'B' : 'A', Math.max(tower.upgradesA, tower.upgradesB)), 'up-pic')}${t('tower.' + type)}</div>`;

    // Current stats summary
    const s = tower.currentStats;
    html += `<div class="up-stats">`;
    for (const key of SHOWN_STATS) {
      if (s[key] > 0 || key === 'range') html += statHTML(key, s[key]);
    }
    html += `</div>`;

    if (upgradedStats) {
      html += `<div class="up-feedback" role="status">${t('upgrade.done')}: ${formatStatChanges(upgradedStats)}</div>`;
    }

    for (const [pathKey, pathLabel] of [['A', 'pathA'], ['B', 'pathB']]) {
      const upgradePath = def.upgrades[pathLabel];
      const otherPicked = (pathKey === 'A' ? tower.upgradesB : tower.upgradesA) > 0;
      html += `<div class="up-path-name">${t('up.' + type + '.' + pathKey)}</div>`;
      if (otherPicked) html += `<div class="up-path-locked">${ICONS.lock}${t('up.otherPath')}</div>`;
      for (let i = 0; i < upgradePath.levels.length; i++) {
        const level = upgradePath.levels[i];
        const currentLevel = pathKey === 'A' ? tower.upgradesA : tower.upgradesB;
        const purchased = i < currentLevel;
        const available = i === currentLevel && tower.getUpgradeCost(pathKey) !== null;
        const canAfford = available && canModify && game.economy.canAfford(level.cost);
        const desc = t('up.' + type + '.' + pathKey + '.' + i, {
          ...level.stats,
          damageAmpPercent: Math.round((level.stats.damageAmp || 0) * 100),
          fireRateAmpPercent: Math.round((level.stats.fireRateAmp || 0) * 100),
          chainDecayPercent: Math.round((level.stats.chainDecay || 0) * 100),
        });

        const changes = formatStatChanges(level.stats);
        const changesHtml = changes ? `<span class="up-changes">${changes}</span>` : '';

        if (purchased) {
          html += `<div class="upgrade-option up-level up-purchased" data-upgrade-path="">
            <span class="up-check">&#10003;</span><span class="up-info"><span class="up-desc">${desc}</span>${changesHtml}</span></div>`;
        } else if (available) {
          const short = level.cost - game.economy.gold;
          const needHtml = short > 0 ? `<span class="up-need">${t('panel.need').replace('{n}', short)}</span>` : '';
          html += `<div class="upgrade-option up-level ${canAfford ? 'up-available' : 'up-unaffordable'}"
            data-upgrade-path="${canAfford ? pathKey : ''}">
            <span class="up-cost">${ICONS.coin}${level.cost}</span><span class="up-info"><span class="up-desc">${desc}</span>${changesHtml}${needHtml}</span></div>`;
        } else {
          html += `<div class="upgrade-option up-level up-locked">
            <span class="up-cost">${ICONS.coin}${level.cost}</span><span class="up-info"><span class="up-desc">${desc}</span>${changesHtml}</span></div>`;
        }
      }
    }

    if (canModify) {
      html += `<div class="up-actions">`;
      html += `<div class="move-btn">${t('towers.move')}</div>`;
      if (game.canSell(tower)) {
        html += `<div class="sell-btn">${t('towers.sell')} ($${tower.getSellValue()})</div>`;
        html += `</div>`;
      } else {
        html += `<div class="sell-btn sell-blocked">${t('towers.sell')} ($${tower.getSellValue()})</div>`;
        html += `</div><div class="up-need">${t('towers.lastTower')}</div>`;
      }
    }

    panel.innerHTML = html;
    panel.style.display = 'block';

    if (isPhoneLayout()) {
      panel.style.left = '';
      panel.style.top = '';
      this._fitSheet();
    } else {
      panel.classList.remove('sheet-top', 'sheet-left');
      panel.style.maxWidth = panel.style.maxHeight = '';
      this._placeBesideTower(panel, pos);
    }

    panel.querySelector('.up-close').addEventListener('click', () => {
      game.input.selectedTower = null;
      this.hideUpgradePanel();
    });

    // Bind upgrade clicks
    panel.querySelectorAll('.upgrade-option[data-upgrade-path]').forEach((/** @type {HTMLElement} */ el) => {
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

    // Sell asks once: the first tap arms it, the second sells. Any re-render
    // or closing the panel builds a new, unarmed button.
    const sellBtn = /** @type {HTMLElement} */ (panel.querySelector('.sell-btn:not(.sell-blocked)'));
    if (sellBtn) {
      sellBtn.addEventListener('click', () => {
        if (!sellBtn.dataset.armed) {
          sellBtn.dataset.armed = 'true';
          sellBtn.textContent = t('towers.sellConfirm').replace('{n}', tower.getSellValue());
          return;
        }
        game.sellSelectedTower();
      });
    }
  }

  // Desktop: beside the tower, on the side of the board with more room, clear
  // of the range circle when it fits, between the HUD and the wave controls
  _placeBesideTower(panel, pos) {
    const wrapper = document.getElementById('canvas-wrapper').getBoundingClientRect();
    const board = this.game.renderer.canvas.getBoundingClientRect();
    const controls = document.getElementById('wave-controls').getBoundingClientRect();
    const hud = document.getElementById('hud').getBoundingClientRect();
    const k = board.width / CONFIG.CANVAS_WIDTH;
    const reach = Math.max(CONFIG.TILE_SIZE / 2, this.game.input.selectedTower.currentStats.range * CONFIG.TILE_SIZE) * k;
    const x = board.left - wrapper.left + pos.x * k;
    const y = board.top - wrapper.top + pos.y * k;
    const w = panel.offsetWidth, h = panel.offsetHeight, gap = 8;

    const right = pos.x < CONFIG.CANVAS_WIDTH / 2;
    let left = right ? x + reach + gap : x - reach - gap - w;
    // No room clear of the range: at least clear of the tile
    const tile = CONFIG.TILE_SIZE / 2 * k + gap;
    if (left < 4 || left + w > wrapper.width - 4) left = right ? x + tile : x - tile - w;
    left = Math.max(4, Math.min(left, wrapper.width - w - 4));

    const bottom = controls.top - wrapper.top - gap;
    const top = Math.max(hud.bottom - wrapper.top, Math.min(y - h / 2, bottom - h));
    panel.style.left = left + 'px';
    panel.style.top = top + 'px';
  }

  hideUpgradePanel() {
    this.elements.upgradePanel.style.display = 'none';
  }

  // Phones: CANCEL is a flex item of the wave controls, so it never covers
  // START WAVE. Desktop: it sits at the bottom right of the board area.
  _placeCancelButton() {
    const btn = this.elements.cancelPlaceBtn;
    const controls = document.getElementById('wave-controls');
    if (isPhoneLayout()) controls.insertBefore(btn, this.elements.startWaveBtn);
    else controls.after(btn);
  }

  // Phones: the upgrade sheet docks to the screen edge away from the selected
  // tower (bottom or top in portrait, right or left in landscape) and may
  // grow up to the near edge of the tower's tile, never over it
  _fitSheet() {
    const panel = this.elements.upgradePanel;
    const tower = this.game.input.selectedTower;
    if (panel.style.display !== 'block' || !isPhoneLayout() || !tower) return;
    const board = this.game.renderer.canvas.getBoundingClientRect();
    const ts = CONFIG.TILE_SIZE * board.width / CONFIG.CANVAS_WIDTH;
    const left = board.left + tower.gx * ts, top = board.top + tower.gy * ts, gap = 8;
    let side;
    if (window.matchMedia('(max-height: 500px) and (pointer: coarse)').matches) {
      side = left + ts / 2 < board.left + board.width / 2 ? 'right' : 'left';
      panel.style.maxWidth = (side === 'right' ? window.innerWidth - left - ts : left) - gap + 'px';
      panel.style.maxHeight = '';
    } else {
      side = top + ts / 2 < board.top + board.height / 2 ? 'bottom' : 'top';
      panel.style.maxHeight = (side === 'bottom' ? window.innerHeight - top - ts : top) - gap + 'px';
      panel.style.maxWidth = '';
    }
    panel.classList.toggle('sheet-top', side === 'top');
    panel.classList.toggle('sheet-left', side === 'left');
  }

  // The only code that shows carry state outside the board: tower button
  // highlight, CANCEL, data-carry on the container, the card and the panel
  syncCarry(input) {
    const carrying = !!(input.placingType || input.movingTower);
    document.querySelectorAll('.tower-btn').forEach((/** @type {HTMLElement} */ b) => {
      b.classList.toggle('selected', b.dataset.towerType === input.placingType);
    });
    this.elements.cancelPlaceBtn.classList.toggle('hidden', !carrying);
    document.getElementById('game-container').toggleAttribute('data-carry', carrying);
    this._hideTooltip();
    if (!input.selectedTower) this.hideUpgradePanel();
  }

  _buildStatsTooltipHTML(type, isMobile) {
    const def = TOWER_DEFS[type];
    const progress = this.game.progressTracker;
    const unlocked = progress.isTowerUnlocked(type);
    const canAfford = unlocked && this.game.economy.canAfford(def.cost);
    const color = unlocked ? def.color : '#8c8c96';

    let html = `<div class="ttp-title" style="color:${color}">${spriteImg(towerSprite(type), 'ttp-pic')}${t('tower.' + type)}</div>`;
    html += `<div class="ttp-desc">${t('tower.' + type + '.desc')}</div>`;

    html += `<div class="ttp-stats">`;
    for (const key of SHOWN_STATS) {
      if (def[key] > 0 || key === 'range') html += statHTML(key, def[key], color);
    }
    html += `</div>`;

    if (def.targeting) {
      html += `<div class="ttp-targeting">${t('stats.targeting')}: ${t('targeting.' + def.targeting)}</div>`;
    }

    if (!unlocked) {
      html += `<div class="ttp-locked-hint">${ICONS.lock}${t('unlock.price').replace('{n}', cores(def.unlockCost))}</div>`;
    } else if (isMobile && !canAfford) {
      // The phone tray shows the price only, so the card says what is missing
      html += `<div class="ttp-need">${t('panel.need').replace('{n}', def.cost - this.game.economy.gold)}</div>`;
    }

    if (isMobile && !unlocked) {
      html += `<button class="ttp-place-btn" ${progress.canUnlock(type) ? '' : 'disabled'} data-tower-type="${type}" data-action="unlock">${ICONS.core}${t('unlock.price').replace('{n}', cores(def.unlockCost))}</button>`;
    } else if (isMobile) {
      html += `<button class="ttp-place-btn" ${canAfford ? '' : 'disabled'} data-tower-type="${type}">${t('stats.place')} (${def.cost})</button>`;
    }

    return html;
  }

  _showDesktopTooltip(type, btnEl) {
    const tooltip = this.elements.towerStatsTooltip;
    tooltip.innerHTML = this._buildStatsTooltipHTML(type, false);
    tooltip.style.borderColor = TOWER_DEFS[type].color;

    // Make visible first to measure dimensions
    tooltip.classList.add('visible');

    const panelRect = this.elements.towerPanel.getBoundingClientRect();
    const btnRect = btnEl.getBoundingClientRect();
    const wrapperRect = document.getElementById('canvas-wrapper').getBoundingClientRect();

    const left = panelRect.left - wrapperRect.left - tooltip.offsetWidth - 8;
    const top = btnRect.top - wrapperRect.top;

    tooltip.style.left = Math.max(4, left) + 'px';
    tooltip.style.top = Math.min(top, wrapperRect.height - tooltip.offsetHeight - 4) + 'px';
  }

  _showMobileTooltip(type) {
    const tooltip = this.elements.towerStatsTooltip;
    this.hideUpgradePanel();
    tooltip.innerHTML = this._buildStatsTooltipHTML(type, true);
    tooltip.style.borderColor = TOWER_DEFS[type].color;

    if (!isPhoneLayout()) {
      // Touch screen with the desktop layout: position left of the panel
      tooltip.classList.add('visible');
      const panelRect = this.elements.towerPanel.getBoundingClientRect();
      const wrapperRect = document.getElementById('canvas-wrapper').getBoundingClientRect();
      const left = panelRect.left - wrapperRect.left - tooltip.offsetWidth - 8;
      tooltip.style.left = Math.max(4, left) + 'px';
      tooltip.style.top = '40px';
    } else {
      // Phones: CSS docks it above the tower panel, or at the right edge in landscape
      tooltip.classList.add('visible');
    }

    // Bind PLACE button
    const placeBtn = /** @type {HTMLButtonElement} */ (tooltip.querySelector('.ttp-place-btn'));
    if (placeBtn && !placeBtn.disabled) {
      placeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (placeBtn.dataset.action === 'unlock') this._unlockTower(placeBtn.dataset.towerType);
        else this.game.input.startPlacing(placeBtn.dataset.towerType);
      });
    }
  }

  _hideTooltip() {
    const tooltip = this.elements.towerStatsTooltip;
    if (tooltip) {
      tooltip.classList.remove('visible');
    }
    this._previewingType = null;
    document.querySelectorAll('.tower-btn.previewing').forEach(b => b.classList.remove('previewing'));
  }

  showBetweenWaves() {
    this._buildTowerPanel();
    this.elements.towerPanel.classList.remove('panel-hidden');
    this.elements.startWaveBtn.textContent = IS_MOBILE ? t('game.startWave') : t('game.startWaveDesktop');
    this.elements.startWaveBtn.disabled = this.game.towers.length === 0 || !this.game.tutorial.allows('startWave');
    this.updateRepairButton();
    const preview = this.game.waveManager.getPreview();
    const text = Object.entries(preview).map(([type, count]) => {
      const def = ENEMY_DEFS[type];
      return `<span class="wp-enemy" style="color:${def.color}" title="${t('enemy.' + type)}">${spriteImg(enemySprite(type), 'wp-pic')}x${count}</span>`;
    }).join(' ');
    this.elements.wavePreviewContent.innerHTML = text;
    document.getElementById('wave-controls').classList.add('visible');
    this.setPhase('build');
  }

  hideBetweenWaves() {
    this._hideTooltip();
    this.setPhase('wave');
  }

  // 'build' between waves, 'wave' while enemies walk. CSS dims the tower
  // panel and swaps the wave controls for a status label during a wave.
  setPhase(phase) {
    this._phase = phase;
    document.getElementById('game-container').dataset.phase = phase;
    this._updatePhaseLabel();
    this.updateWaveProgress();
  }

  _updatePhaseLabel() {
    const label = document.getElementById('phase-label');
    if (!label || !this._phase) return;
    label.textContent = this._phase === 'wave'
      ? t('phase.wave').replace('{n}', this.game.waveManager.currentWave)
      : this.game.towers.length === 0 ? t('phase.needTower') : t('phase.build');
  }

  flashLives() {
    this._restartAnimation(document.getElementById('hud-lives'), 'hud-hit');
  }

  pulseGold() {
    this._restartAnimation(document.getElementById('hud-gold'), 'hud-pulse');
  }

  pulseCores() {
    this._restartAnimation(document.querySelector('#unlock-tracker .unlock-cores'), 'hud-pulse');
  }

  _restartAnimation(el, className) {
    if (!el) return;
    el.classList.remove(className);
    void el.offsetWidth; // reflow so the animation starts again
    el.classList.add(className);
  }

  showPause() {
    this.elements.pauseOverlay.style.display = 'flex';
    document.getElementById('tower-panel').style.display = 'none';
  }
  hidePause() {
    this.elements.pauseOverlay.style.display = 'none';
    document.getElementById('tower-panel').style.display = '';
  }

  showMenu() {
    this.hidePause();
    this.elements.gameOverScreen.style.display = 'none';
    document.getElementById('wave-controls').classList.remove('visible');
    delete document.getElementById('game-container').dataset.phase;
    this._phase = null;
    this.elements.menuScreen.style.display = 'flex';
  }

  showGameOver(score, wave, won) {
    this._won = won;
    document.querySelector('#game-over-screen h2').textContent = t(won ? 'game.victory' : 'game.gameOver');
    document.querySelector('#game-over-screen h2').classList.toggle('victory', won);
    this.hideUnlockTracker();
    this._lastScore = score;
    this._lastWave = wave;
    this.elements.finalScore.textContent = score.toLocaleString();
    this.elements.finalWave.textContent = t('game.waveReached').replace('{n}', wave);
    document.getElementById('final-time').textContent = formatTime(this.game.runTime);
    this._fillRank(score);

    this._fillCoreProgress();

    // Result against the challenge this run replayed
    const resultEl = document.getElementById('challenge-result');
    const challenge = this.game.challenge;
    if (challenge) {
      const beat = score > challenge.score;
      resultEl.textContent = t(beat ? 'challenge.beat' : 'challenge.lost')
        .replace('{name}', challenge.name)
        .replace('{n}', Math.abs(score - challenge.score).toLocaleString());
      resultEl.className = beat ? 'beat' : 'lost';
      resultEl.style.display = 'block';
    } else {
      resultEl.style.display = 'none';
    }
    // A challenge run starts again on the challenge's map, so only RETRY MAP fits
    document.getElementById('play-again-btn').style.display = challenge ? 'none' : '';

    const nameInput = /** @type {HTMLInputElement} */ (document.getElementById('player-name'));
    const saveBtn = /** @type {HTMLButtonElement} */ (document.getElementById('save-score-btn'));
    const lastUsed = localStorage.getItem('neon_td_player_name') || '';
    nameInput.value = lastUsed;
    saveBtn.disabled = !lastUsed;
    document.getElementById('name-taken-warn').style.display = 'none';

    // Share button
    document.getElementById('share-score-btn').textContent = t('share.button');

    this.elements.gameOverScreen.style.display = 'flex';
    this.elements.towerPanel.style.display = 'none';
  }

  // Rank among saved scores of this difficulty; hidden until it arrives and
  // when the API cannot be reached
  async _fillRank(score) {
    const stat = document.getElementById('final-rank-stat');
    stat.style.display = 'none';
    this._rank = null;
    const query = new URLSearchParams({ score: String(score), difficulty: this.game.difficulty || 'normal' });
    try {
      const res = await fetch(`/api/scores?${query}`);
      if (!res.ok) return;
      const { top } = await res.json();
      // A newer end screen may have started meanwhile
      if (this._lastScore !== score || !Number.isInteger(top)) return;
      this._rank = top;
      document.getElementById('final-rank').textContent = t('game.rankTop').replace('{n}', top);
      stat.style.display = '';
    } catch {
      // Offline: the card shows the time alone
    }
  }

  // End screen: cores earned this run and the next locked tower, both gone
  // once every tower is unlocked
  _fillCoreProgress() {
    const coresEl = document.getElementById('cores-earned');
    coresEl.innerHTML =
      `${ICONS.core}${t('unlock.earned').replace('{n}', cores(this.game.coresThisRun || 0))}`;
    const nextUnlockEl = document.getElementById('next-unlock-hint');
    const next = this.game.progressTracker.getNextUnlock();
    coresEl.style.display = next ? '' : 'none';
    if (next) {
      const towerName = t('tower.' + next.type);
      nextUnlockEl.innerHTML = `${spriteImg(towerSprite(next.type), 'unlock-pic')} ${next.toGo === 0 ? t('unlock.canUnlock').replace('{name}', towerName) : `${t('unlock.next')}: <span style="color:${TOWER_DEFS[next.type].color}">${towerName}</span> ${t('unlock.in')} <span class="core-amount">${cores(next.toGo)}</span>`}`;
      nextUnlockEl.style.display = 'block';
    } else {
      nextUnlockEl.style.display = 'none';
    }
  }

  // The multiplier takes the speed's colour; pop plays it when the player changes speed
  updateSpeedButtons(speed, pop = false) {
    const btn = document.getElementById('speed-btn');
    btn.dataset.speed = speed;
    btn.innerHTML = `${t('ctrl.speed')} <span class="speed-x">${speed}x</span>`;
    if (pop) this._restartAnimation(btn.querySelector('.speed-x'), 'speed-pop');
  }

  // Speaker icon shows whether sound is on
  setMuteIcon(muted) {
    const btn = document.getElementById('mute-btn');
    btn.innerHTML = muted ? ICONS.speakerOff : ICONS.speakerOn;
    btn.setAttribute('aria-pressed', String(!muted));
    btn.classList.toggle('active', !muted);
  }

  // The wallet row, laid out like the counters above it: the core balance,
  // kept out of sight once every tower is unlocked and cores buy nothing
  updateUnlockTracker() {
    const el = document.getElementById('unlock-tracker');
    if (!el) return;
    const progress = this.game.progressTracker;
    const key = progress.getNextUnlock() ? progress.cores : 'done';
    if (key === this._trackerKey) return;
    this._trackerKey = key;
    if (key === 'done') { el.classList.add('hidden'); return; }

    el.innerHTML = `<span class="hud-item unlock-cores">` +
      `<span class="hud-main">${ICONS.core}<span id="cores-value">${progress.cores}</span></span>` +
      `<span class="hud-label">${t('hud.cores')}</span></span>`;
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
    const color = newUnlocks[0].def.color;
    container.style.borderColor = color;
    container.style.boxShadow = `0 0 30px ${color}66, 0 0 60px ${color}26`;
    const names = newUnlocks.map(u => `<span style="color:${u.def.color}">${t('tower.' + u.type)}</span>`).join(', ');
    container.innerHTML = `
      <div class="unlock-title" style="color:${color}; text-shadow:0 0 15px ${color}99">${newUnlocks.length > 1 ? t('unlock.plural') : t('unlock.single')}</div>
      <div class="unlock-names">${newUnlocks.map(u => spriteImg(towerSprite(u.type), 'unlock-pic')).join('')} ${names}</div>
    `;
    document.getElementById('canvas-wrapper').appendChild(container);
    setTimeout(() => container.classList.add('unlock-visible'), 50);
    setTimeout(() => {
      container.classList.remove('unlock-visible');
      setTimeout(() => container.remove(), 500);
    }, 1500);
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

    // Open on the board of the last game played
    if (!wasVisible) this._renderHighScores(this.game.difficulty || 'normal');
    const nowVisible = !wasVisible;
    list.style.display = nowVisible ? 'block' : 'none';
    document.getElementById('high-scores-btn').classList.toggle('active', nowVisible);
  }

  _renderHighScores(difficulty) {
    this._board = difficulty;
    const tabs = ['easy', 'normal', 'hard'].map(d =>
      `<button class="board-tab${d === difficulty ? ' active' : ''}" data-board="${d}">${t('menu.' + d)}</button>`
    ).join('');
    // Scores saved before difficulty was recorded count as normal
    const scores = this.game.scoreTracker.highScores.filter(s => (s.difficulty || 'normal') === difficulty);
    const entries = scores.length === 0
      ? `<div class="board-empty">${t('scores.empty')}</div>`
      : scores.map((s, i) =>
        `<div class="score-entry"><span class="se-rank">${i + 1}</span><span class="se-name">${s.name}</span>` +
        `<span class="se-score">${s.score.toLocaleString()}</span><span class="se-wave">${t('game.wave')} ${s.wave}</span></div>`
      ).join('');
    this.elements.highScoresList.innerHTML = `<div class="board-tabs">${tabs}</div>${entries}`;
  }

  // ── Share Feature ──

  // Menu banner for a challenge link. The name comes from the URL, so it
  // only ever goes in as text. A link from before seeds has no accept button.
  /** @param {import('./challenge.js').Challenge | null} challenge */
  showChallengeBanner(challenge) {
    if (!challenge) return;
    this._linkChallenge = challenge;
    const banner = document.getElementById('challenge-banner');
    const line = (className, text) => {
      const el = document.createElement('div');
      el.className = className;
      el.textContent = text;
      return el;
    };
    banner.replaceChildren(
      line('challenge-from', t('challenge.from')),
      line('challenge-name', challenge.name),
      line('challenge-stats', t('challenge.stats')
        .replace('{score}', challenge.score.toLocaleString())
        .replace('{wave}', String(challenge.wave))
        .replace('{difficulty}', t('menu.' + challenge.difficulty))),
    );
    if (challenge.seed !== null) {
      const accept = document.createElement('button');
      accept.id = 'accept-challenge-btn';
      accept.className = 'menu-btn';
      accept.textContent = t('challenge.accept');
      banner.append(accept);
    }
    banner.classList.remove('hidden');
  }

  _getShareText(score, wave) {
    const maxWave = CONFIG.MAX_WAVES;
    let key;
    if (wave >= maxWave) key = 'share.text.victory';
    else if (wave > 20) key = 'share.text.high';
    else if (wave > 5) key = 'share.text.mid';
    else key = 'share.text.low';
    return t(key).replace('{score}', score.toLocaleString()).replace('{wave}', wave);
  }

  _generateScoreCard(score, wave, playerName) {
    return new Promise((resolve) => {
      const W = 600, H = 340;
      const c = document.createElement('canvas');
      c.width = W; c.height = H;
      const ctx = c.getContext('2d');

      // Background
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, W, H);

      // Subtle grid
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = 0.3;
      for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
      for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
      ctx.globalAlpha = 1;

      // Top/bottom accent lines
      ctx.fillStyle = '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 20;
      ctx.fillRect(0, 0, W, 2);
      ctx.fillRect(0, H - 2, W, 2);
      ctx.shadowBlur = 0;

      ctx.textAlign = 'center';

      // Title
      ctx.font = 'bold 22px "Courier New", monospace';
      ctx.fillStyle = '#00ffff';
      ctx.shadowColor = '#00ffff';
      ctx.shadowBlur = 15;
      ctx.fillText('NEON DEFENSE', W / 2, 42);
      ctx.shadowBlur = 0;

      // Player name
      if (playerName) {
        ctx.font = '14px "Courier New", monospace';
        ctx.fillStyle = '#888';
        ctx.fillText(playerName, W / 2, 64);
      }

      // Score
      ctx.font = 'bold 64px "Courier New", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = '#ffffff';
      ctx.shadowBlur = 25;
      ctx.fillText(score.toLocaleString(), W / 2, 145);
      ctx.shadowBlur = 0;

      // POINTS label
      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = '#666';
      ctx.fillText(this._rank ? `POINTS  ·  TOP ${this._rank}%` : 'POINTS', W / 2, 168);

      // Stats row
      const diffLabels = { hard: 'SHORT PATH', normal: 'MEDIUM PATH', easy: 'LONG PATH' };
      const diff = this.game.difficulty || 'normal';
      ctx.font = 'bold 16px "Courier New", monospace';
      ctx.fillStyle = '#ffd700';
      ctx.shadowColor = '#ffd700';
      ctx.shadowBlur = 8;
      ctx.fillText(`WAVE ${wave}  ·  ${formatTime(this.game.runTime)}  ·  ${diffLabels[diff] || 'MEDIUM PATH'}`, W / 2, 208);
      ctx.shadowBlur = 0;

      // Divider
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(100, 235);
      ctx.lineTo(W - 100, 235);
      ctx.stroke();

      // CTA
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.fillStyle = '#ff8800';
      ctx.shadowColor = '#ff8800';
      ctx.shadowBlur = 10;
      ctx.fillText(t('share.card.beatThis'), W / 2, 272);
      ctx.shadowBlur = 0;

      // URL
      ctx.font = '12px "Courier New", monospace';
      ctx.fillStyle = '#555';
      ctx.fillText(window.location.hostname || 'neondefense.netlify.app', W / 2, 300);

      c.toBlob((blob) => resolve(blob), 'image/png');
    });
  }

  async _shareScore() {
    const score = this._lastScore;
    const wave = this._lastWave;
    const playerName = /** @type {HTMLInputElement} */ (document.getElementById('player-name')).value.trim() ||
                       localStorage.getItem('neon_td_player_name') || '';
    const diff = this.game.difficulty || 'normal';

    const challengeData = encodeChallenge({
      seed: this.game.seed, board: this.game.board,
      difficulty: /** @type {import('./challenge.js').Challenge['difficulty']} */ (diff),
      name: playerName || 'Anon', score, wave,
    });
    const shareUrl = `${window.location.origin}${window.location.pathname}?c=${challengeData}`;
    const shareText = this._getShareText(score, wave);

    try {
      const blob = await this._generateScoreCard(score, wave, playerName);
      const file = new File([blob], 'neon-defense-score.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'NEON DEFENSE',
          text: shareText,
          url: shareUrl,
          files: [file],
        });
        return;
      }
    } catch (e) {
      // Share cancelled or not supported — fall through to clipboard
      if (e.name === 'AbortError') return;
    }

    // Desktop fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
    } catch {
      // Last resort: prompt
      prompt(t('share.copied'), `${shareText}\n${shareUrl}`);
      return;
    }
    this._showShareToast();
  }

  _showShareToast() {
    const toast = document.getElementById('share-toast');
    toast.textContent = t('share.copied');
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2500);
  }
}
