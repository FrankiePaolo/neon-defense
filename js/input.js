import { pixelToGrid, gridToPixel } from './utils.js';
import { CONFIG, TOWER_DEFS } from './config.js';
import { t } from './i18n.js';

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
    canvas.addEventListener('mouseleave', () => { this.hoveredCell = null; });
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
    this.hoveredCell = this._touchCell(pos);
  }

  _onTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const pos = this._getTouchPos(touch);
    this.mouseX = pos.x;
    this.mouseY = pos.y;
    this.hoveredCell = this._touchCell(pos);
  }

  // A fingertip covers more than a tile, so while placing or moving, a touch
  // that lands on the road or a tower snaps to the nearest free tile in reach
  _touchCell(pos) {
    const cell = pixelToGrid(pos.x, pos.y);
    const grid = this.game.grid;
    if (!(this.placingType || this.movingTower) || grid.isPlaceable(cell.x, cell.y)) return cell;
    const ts = CONFIG.TILE_SIZE;
    let best = null, bestDist = ts * ts;
    for (let y = cell.y - 1; y <= cell.y + 1; y++) {
      for (let x = cell.x - 1; x <= cell.x + 1; x++) {
        if (!grid.isPlaceable(x, y)) continue;
        const c = gridToPixel(x, y);
        const dist = (c.x - pos.x) ** 2 + (c.y - pos.y) ** 2;
        if (dist < bestDist) { best = { x, y }; bestDist = dist; }
      }
    }
    return best || cell;
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
      } else {
        this._explainBadTile(this.hoveredCell, 0);
      }
    } else if (this.placingType) {
      if (game.placeTower(this.placingType, this.hoveredCell.x, this.hoveredCell.y)) {
        if (this.isTouchDevice) this.hoveredCell = game.tutorial.suggestTile(this.placingType);
        const def = TOWER_DEFS[this.placingType];
        if (!game.economy.canAfford(def.cost)) {
          this.placingType = null;
          document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('selected'));
          game.ui.hideCancelButton();
        }
      } else {
        this._explainBadTile(this.hoveredCell, TOWER_DEFS[this.placingType].cost);
      }
    } else {
      const tower = game.grid.getTowerAt(this.hoveredCell.x, this.hoveredCell.y);
      if (tower) {
        this.selectedTower = tower;
        game.ui.showUpgradePanel(tower);
      } else {
        if (this.selectedTower) {
          this.selectedTower = null;
          game.ui.hideUpgradePanel();
        }
        game.ui._hideTooltip();
      }
    }
  }

  // Short reason at the tile when a tower can't go there
  _explainBadTile(cell, cost) {
    const game = this.game;
    const grid = game.grid;
    if (game.state !== 'BETWEEN_WAVES' || !game.tutorial.allows('place')) return;
    if (cell.x < 0 || cell.x >= grid.cols || cell.y < 0 || cell.y >= grid.rows) return;
    if (this.movingTower && grid.getTowerAt(cell.x, cell.y) === this.movingTower) return;

    let key;
    if (grid.getTowerAt(cell.x, cell.y)) key = 'place.taken';
    else if (!grid.isPlaceable(cell.x, cell.y)) key = 'place.road';
    else if (!game.economy.canAfford(cost)) key = 'place.gold';
    else return;

    const pos = gridToPixel(cell.x, cell.y);
    game.floatingTexts.push({
      x: pos.x, y: pos.y, text: t(key), color: '#ff8866',
      life: 1.2, maxLife: 1.2, boxed: true,
    });
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
    // Touch has no hover: start with the tower floating over the best tile
    if (this.isTouchDevice) this.hoveredCell = this.game.tutorial.suggestTile(type);
    this.movingTower = null;
    this.selectedTower = null;
    this.game.ui.hideUpgradePanel();
    this.game.ui.showCancelButton();
  }

  startMoving(tower) {
    this.movingTower = tower;
    this.hoveredCell = { x: tower.gx, y: tower.gy };
    this.placingType = null;
    this.selectedTower = null;
    this.game.ui.hideUpgradePanel();
    this.game.ui.showCancelButton();
  }
}
