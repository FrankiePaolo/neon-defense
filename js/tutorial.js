import { t } from './i18n.js';

const STEPS = [
  {
    msgKey: 'tut.1',
    highlight: null,
    btnKey: 'tut.ok',
    condition: null,
  },
  {
    msgKey: 'tut.2',
    highlight: 'tower-panel',
    btnKey: null,
    condition: (game) => game.input.placingType !== null,
  },
  {
    msgKey: 'tut.3',
    highlight: null,
    btnKey: null,
    condition: (game) => game.towers.length > 0,
  },
  {
    msgKey: 'tut.4',
    highlight: 'start-wave-btn',
    btnKey: null,
    condition: (game) => game.state === 'PLAYING',
  },
  {
    msgKey: 'tut.5',
    highlight: null,
    btnKey: null,
    autoAdvance: 4000,
  },
  {
    msgKey: 'tut.6',
    highlight: null,
    btnKey: 'tut.ok',
    waitForState: 'BETWEEN_WAVES',
  },
  {
    msgKey: 'tut.6b',
    highlight: null,
    btnKey: 'tut.ok',
    condition: null,
  },
  {
    msgKey: 'tut.7',
    highlight: null,
    btnKey: null,
    autoAdvance: 2500,
  },
];

const STORAGE_KEY = 'neonDefenseTutorialDone';

export class Tutorial {
  constructor(game) {
    this.game = game;
    this.step = -1;
    this.active = false;
    this.overlay = document.getElementById('tutorial-overlay');
    this._timer = null;
    this._highlightEl = null;
  }

  shouldRun() {
    return !localStorage.getItem(STORAGE_KEY);
  }

  start() {
    if (!this.shouldRun()) return;
    this.step = -1;
    this.active = true;
    this._advance();
  }

  _advance() {
    this._clearHighlight();
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }

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

    if (s.autoAdvance) {
      this._timer = setTimeout(() => this._advance(), s.autoAdvance);
    }
  }

  _render(s) {
    let html = `<div class="tutorial-msg">${t(s.msgKey)}</div>`;
    if (s.btnKey) {
      html += `<button class="tutorial-btn">${t(s.btnKey)}</button>`;
    }
    this.overlay.innerHTML = html;
    this.overlay.classList.remove('hidden');

    if (s.btnKey) {
      this.overlay.querySelector('.tutorial-btn').addEventListener('click', () => {
        this._advance();
      });
    }

    if (s.highlight) {
      const el = document.getElementById(s.highlight);
      if (el) {
        el.classList.add('tutorial-highlight');
        this._highlightEl = el;
      }
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
    return !!STEPS[this.step].btnKey;
  }

  check() {
    if (!this.active || this.step < 0 || this.step >= STEPS.length) return;
    const s = STEPS[this.step];

    if (s.waitForState && this.game.state === s.waitForState) {
      this._render(s);
      s.waitForState = null;
    }

    if (s.condition && s.condition(this.game)) {
      this._advance();
    }
  }

  _complete() {
    this._clearHighlight();
    this.overlay.classList.add('hidden');
    this.active = false;
    localStorage.setItem(STORAGE_KEY, 'true');
  }

  reset() {
    localStorage.removeItem(STORAGE_KEY);
  }
}
