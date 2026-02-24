const STEPS = [
  {
    msg: 'Welcome to <span style="color:#00ffff">NEON DEFENSE</span>! Enemies travel along the glowing path. Place towers to stop them before they reach the exit.',
    highlight: null,
    btn: 'GOT IT',
    condition: null,
  },
  {
    msg: 'Select a tower from the <span style="color:#00ffff">TOWERS</span> panel to start building.',
    highlight: 'tower-panel',
    btn: null,
    condition: (game) => game.input.placingType !== null,
  },
  {
    msg: 'Now tap a <span style="color:#aaa">dark tile</span> next to the path to place your tower.',
    highlight: null,
    btn: null,
    condition: (game) => game.towers.length > 0,
  },
  {
    msg: 'Press <span style="color:#00ffff">START WAVE</span> to send enemies. Your towers fire automatically!',
    highlight: 'start-wave-btn',
    btn: null,
    condition: (game) => game.state === 'PLAYING',
  },
  {
    msg: 'Enemies that reach the exit cost you a life. Destroy them all to clear the wave!',
    highlight: null,
    btn: null,
    autoAdvance: 4000,
  },
  {
    msg: 'You earned gold! Place more towers or tap an existing tower to see upgrades. You can only build <span style="color:#ffd700">between waves</span>.',
    highlight: null,
    btn: 'GOT IT',
    waitForState: 'BETWEEN_WAVES',
  },
  {
    msg: 'You\'ve got the basics! Good luck, commander.',
    highlight: null,
    btn: null,
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

    // If step waits for a game state, defer rendering until that state is reached
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
    let html = `<div class="tutorial-msg">${s.msg}</div>`;
    if (s.btn) {
      html += `<button class="tutorial-btn">${s.btn}</button>`;
    }
    this.overlay.innerHTML = html;
    this.overlay.classList.remove('hidden');

    if (s.btn) {
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

  // Called every frame from game._update()
  check() {
    if (!this.active || this.step < 0 || this.step >= STEPS.length) return;
    const s = STEPS[this.step];

    // Handle steps waiting for a specific game state
    if (s.waitForState && this.game.state === s.waitForState) {
      this._render(s);
      s.waitForState = null; // only trigger once
    }

    // Handle condition-based auto-advance
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
