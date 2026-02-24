import { pixelToGrid } from './utils.js';

export class InputHandler {
  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;
    this.mouseX = 0;
    this.mouseY = 0;
    this.hoveredCell = null;
    this.selectedTower = null;
    this.placingType = null;

    canvas.addEventListener('mousemove', (e) => this._onMove(e));
    canvas.addEventListener('click', (e) => this._onClick(e));
    canvas.addEventListener('contextmenu', (e) => { e.preventDefault(); this._onRightClick(); });
    document.addEventListener('keydown', (e) => this._onKey(e));
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

    if (this.placingType) {
      if (game.placeTower(this.placingType, this.hoveredCell.x, this.hoveredCell.y)) {
        // Keep placing mode active
      }
    } else {
      const tower = game.grid.getTowerAt(this.hoveredCell.x, this.hoveredCell.y);
      if (tower) {
        this.selectedTower = tower;
        game.ui.showUpgradePanel(tower);
      } else {
        this.selectedTower = null;
        game.ui.hideUpgradePanel();
      }
    }
  }

  _onRightClick() {
    this.placingType = null;
    this.selectedTower = null;
    this.game.ui.hideUpgradePanel();
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
        if (this.placingType) { this.placingType = null; }
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
    this.selectedTower = null;
    this.game.ui.hideUpgradePanel();
  }
}
