import { pixelToGrid } from './utils.js';
import { TOWER_DEFS } from './config.js';

export class InputHandler {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.mouseX = 0;
    this.mouseY = 0;
    this.hoveredCell = null;
    this.selectedTower = null;
    this.placingType = null;
    this.movingTower = null;
    this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    canvas.addEventListener('mousemove', (e) => this._onMove(e));
    canvas.addEventListener('click', (e) => this._onClick(e));
    canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); this._onRightClick(); });
    document.addEventListener('keydown', (e) => this._onKey(e));

    if (this.isTouchDevice) {
      canvas.addEventListener('touchstart', (e) => this._onTouchStart(e), { passive: false });
      canvas.addEventListener('touchmove', (e) => this._onTouchMove(e), { passive: false });
      canvas.addEventListener('touchend', (e) => this._onTouchEnd(e), { passive: false });
    }
  }

  _getTouchPos(touch) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (touch.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (this.canvas.height / rect.height),
    };
  }

  _onTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this._getTouchPos(touch);
    this.mouseX = pos.x;
    this.mouseY = pos.y;
    this.hoveredCell = pixelToGrid(pos.x, pos.y);
  }

  _onTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this._getTouchPos(touch);
    this.mouseX = pos.x;
    this.mouseY = pos.y;
    this.hoveredCell = pixelToGrid(pos.x, pos.y);
  }

  _onTouchEnd(e) {
    e.preventDefault();
    this._onClick(null);
  }

  _onMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = (e.clientX - rect.left) * (this.canvas.width / rect.width);
    this.mouseY = (e.clientY - rect.top) * (this.canvas.height / rect.height);
    this.hoveredCell = pixelToGrid(this.mouseX, this.mouseY);
  }

  _onClick(e) {
    if (!this.hoveredCell) return;
    const game = this.game;

    if (this.movingTower) {
      if (game.moveTower(this.movingTower, this.hoveredCell.x, this.hoveredCell.y)) {
        this.movingTower = null;
        game.ui.hideCancelButton();
      }
    } else if (this.placingType) {
      if (game.placeTower(this.placingType, this.hoveredCell.x, this.hoveredCell.y)) {
        const def = TOWER_DEFS[this.placingType];
        if (!game.economy.canAfford(def.cost)) {
          this.placingType = null;
          document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
          game.ui.hideCancelButton();
        }
      }
    } else {
      const tower = game.grid.getTowerAt(this.hoveredCell.x, this.hoveredCell.y);
      if (tower) {
        this.selectedTower = tower;
        game.ui.showUpgradePanel(tower);
      } else if (this.selectedTower) {
        this.selectedTower = null;
        game.ui.hideUpgradePanel();
      }
    }
  }

  _onRightClick() {
    this.placingType = null;
    this.movingTower = null;
    this.selectedTower = null;
    this.game.ui.hideUpgradePanel();
    this.game.ui.hideCancelButton();
  }

  _onKey(e) {
    const game = this.game;
    switch (e.key) {
      case ' ':
        e.preventDefault();
        if (game.state === 'BETWEEN_WAVES') game.startNextWave();
        else if (game.state === 'PLAYING') game.togglePause();
        else if (game.state === 'PAUSED') game.togglePause();
        break;
      case 'Escape':
        if (this.movingTower) { this.movingTower = null; game.ui.hideCancelButton(); }
        else if (this.placingType) { this.placingType = null; game.ui.hideCancelButton(); }
        else if (this.selectedTower) { this.selectedTower = null; game.ui.hideUpgradePanel(); }
        else { game.togglePause(); }
        break;
      case '1': game.setSpeed(1); break;
      case '2': game.setSpeed(2); break;
      case '3': game.setSpeed(3); break;
      case 's': case 'S':
        if (this.selectedTower) {
          game.sellTower(this.selectedTower);
          this.selectedTower = null;
          game.ui.hideUpgradePanel();
        }
        break;
    }
  }

  startPlacing(type) {
    this.placingType = type;
    this.movingTower = null;
    this.selectedTower = null;
    this.game.ui.hideUpgradePanel();
    this.game.ui.showCancelButton();
  }

  startMoving(tower) {
    this.movingTower = tower;
    this.placingType = null;
    this.selectedTower = null;
    this.game.ui.hideUpgradePanel();
    this.game.ui.showCancelButton();
  }
}
