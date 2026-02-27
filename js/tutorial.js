import { t } from './i18n.js';

const STEPS = [
  {
    msgKey: 'tut.1',
    showSkip: true,
  },
  {
    msgKey: 'tut.2',
  },
  {
    msgKey: 'tut.3',
    highlight: 'tower-panel',
    condition: (game) => game.towers.length > 0,
  },
  {
    msgKey: 'tut.4',
    highlight: 'start-wave-btn',
    condition: (game) => game.state === 'PLAYING',
  },
  {
    msgKey: 'tut.5',
  },
  {
    msgKey: 'tut.6',
    waitForState: 'BETWEEN_WAVES',
  },
  {
    msgKey: 'tut.6b',
  },
  {
    msgKey: 'tut.7',
  },
];

const STORAGE_KEY = 'neonDefenseTutorialDone';

export class Tutorial {
  constructor(game) {
    this.game = game;
    this.step = -1;
    this.active = false;
    this._awaitingAction = false;
    this.overlay = document.getElementById('tutorial-overlay');
    this._highlightEl = null;
  }

  shouldRun() {
    return !localStorage.getItem(STORAGE_KEY);
  }

  start() {
    if (!this.shouldRun()) return;
    this.step = -1;
    this.active = true;
    this._awaitingAction = false;
    this._advance();
  }

  _advance() {
    this._clearHighlight();
    this._awaitingAction = false;

    this.step++;
    if (this.step >= STEPS.length) {
      this._complete();
      return;
    }

    const s = STEPS[this.step];

    if (s.waitForState && this.game.state !== s.waitForState) {
      this.overlay.classList.add('hidden');
      return;
    }

    this._render(s);
  }

  _blockUI() {
    document.getElementById('tower-panel').classList.add('tutorial-blocked');
    const btn = document.getElementById('start-wave-btn');
    if (btn) btn.disabled = true;
  }

  _unblockUI() {
    document.getElementById('tower-panel').classList.remove('tutorial-blocked');
    const btn = document.getElementById('start-wave-btn');
    if (btn) btn.disabled = this.game.towers.length === 0;
  }

  _dismiss() {
    const s = STEPS[this.step];
    this.overlay.classList.add('hidden');
    this._unblockUI();

    if (s.condition) {
      this._awaitingAction = true;
      if (s.highlight) {
        const el = document.getElementById(s.highlight);
        if (el) {
          el.classList.add('tutorial-highlight');
          this._highlightEl = el;
        }
      }
    } else {
      this._clearHighlight();
      this._advance();
    }
  }

  _render(s) {
    let html = `<div class="tutorial-step-count">${this.step + 1} / ${STEPS.length}</div>`;
    html += `<div class="tutorial-msg">${t(s.msgKey)}</div>`;
    if (s.showSkip) {
      html += `<div class="tutorial-actions"><button class="tutorial-btn">${t('tut.ok')}</button><div class="tutorial-skip">${t('tut.skip')}</div></div>`;
    } else {
      html += `<button class="tutorial-btn">${t('tut.ok')}</button>`;
    }
    this.overlay.innerHTML = html;
    this.overlay.classList.remove('hidden');
    this._blockUI();

    this.overlay.querySelector('.tutorial-btn').addEventListener('click', () => {
      this._dismiss();
    });

    if (s.showSkip) {
      this.overlay.querySelector('.tutorial-skip').addEventListener('click', () => {
        this._complete();
      });
    }
  }

  _clearHighlight() {
    if (this._highlightEl) {
      this._highlightEl.classList.remove('tutorial-highlight');
      this._highlightEl = null;
    }
  }

  isBlocking() {
    if (!this.active || this.step < 0 || this.step >= STEPS.length) return false;
    return !this._awaitingAction;
  }

  check() {
    if (!this.active || this.step < 0 || this.step >= STEPS.length) return;
    const s = STEPS[this.step];

    if (s.waitForState && this.game.state === s.waitForState) {
      this._render(s);
      s.waitForState = null;
    }

    if (this._awaitingAction && s.condition && s.condition(this.game)) {
      this._advance();
    }
  }

  _complete() {
    this._clearHighlight();
    this._unblockUI();
    this.overlay.classList.add('hidden');
    this.active = false;
    this._awaitingAction = false;
    localStorage.setItem(STORAGE_KEY, 'true');
  }

  reset() {
    localStorage.removeItem(STORAGE_KEY);
  }
}
