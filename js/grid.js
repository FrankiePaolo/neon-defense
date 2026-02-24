import { CONFIG } from './config.js';
import { randInt } from './utils.js';

export const CELL_EMPTY = 0;
export const CELL_PATH = 1;
export const CELL_ENTRY = 2;
export const CELL_EXIT = 3;

export class Grid {
  constructor() {
    this.cols = CONFIG.GRID_COLS;
    this.rows = CONFIG.GRID_ROWS;
    this.cells = [];
    this.entry = null;
    this.exit = null;
    this.path = [];
    this.towers = new Map();
  }

  init() {
    this.cells = [];
    for (let y = 0; y < this.rows; y++) {
      this.cells[y] = [];
      for (let x = 0; x < this.cols; x++) {
        this.cells[y][x] = CELL_EMPTY;
      }
    }
    this.towers.clear();
  }

  generate() {
    for (let attempt = 0; attempt < 50; attempt++) {
      this.init();
      const entryY = randInt(2, this.rows - 3);
      const exitY = randInt(2, this.rows - 3);
      this.entry = { x: 0, y: entryY };
      this.exit = { x: this.cols - 1, y: exitY };

      const path = this._randomWalk();
      if (path && path.length >= 25) {
        for (const p of path) {
          this.cells[p.y][p.x] = CELL_PATH;
        }
        this.cells[this.entry.y][this.entry.x] = CELL_ENTRY;
        this.cells[this.exit.y][this.exit.x] = CELL_EXIT;
        this.path = path;
        return true;
      }
    }
    this._fallbackPath();
    return true;
  }

  _randomWalk() {
    const visited = new Set();
    const path = [];
    let x = this.entry.x;
    let y = this.entry.y;
    const key = (x, y) => `${x},${y}`;

    visited.add(key(x, y));
    path.push({ x, y });

    const dirs = [
      { dx: 1, dy: 0 },
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
    ];

    let stuckCount = 0;

    while (x !== this.exit.x || y !== this.exit.y) {
      if (path.length > 200) return null;

      const candidates = [];
      for (const dir of dirs) {
        const nx = x + dir.dx;
        const ny = y + dir.dy;
        if (nx < 0 || nx >= this.cols || ny < 0 || ny >= this.rows) continue;
        if (visited.has(key(nx, ny))) continue;
        if (this._countPathNeighbors(nx, ny, visited) > 1 && !(nx === this.exit.x && ny === this.exit.y)) continue;

        let weight = 1;
        if (dir.dx > 0) weight += 3;
        if ((ny > y && this.exit.y > y) || (ny < y && this.exit.y < y)) weight += 1;
        if (ny <= 0 || ny >= this.rows - 1) weight *= 0.3;

        candidates.push({ nx, ny, weight });
      }

      if (candidates.length === 0) {
        stuckCount++;
        if (stuckCount > 10) return null;
        path.pop();
        if (path.length === 0) return null;
        const prev = path[path.length - 1];
        x = prev.x;
        y = prev.y;
        continue;
      }

      stuckCount = 0;
      const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);
      let roll = Math.random() * totalWeight;
      let chosen = candidates[0];
      for (const c of candidates) {
        roll -= c.weight;
        if (roll <= 0) { chosen = c; break; }
      }

      x = chosen.nx;
      y = chosen.ny;
      visited.add(key(x, y));
      path.push({ x, y });

      if (Math.abs(x - this.exit.x) + Math.abs(y - this.exit.y) <= 3 && path.length >= 20) {
        const direct = this._directConnect(x, y, this.exit.x, this.exit.y, visited);
        if (direct) {
          for (const p of direct) {
            visited.add(key(p.x, p.y));
            path.push(p);
          }
          return path;
        }
      }
    }
    return path;
  }

  _countPathNeighbors(x, y, visited) {
    let count = 0;
    const key = (x, y) => `${x},${y}`;
    if (visited.has(key(x - 1, y))) count++;
    if (visited.has(key(x + 1, y))) count++;
    if (visited.has(key(x, y - 1))) count++;
    if (visited.has(key(x, y + 1))) count++;
    return count;
  }

  _directConnect(x1, y1, x2, y2, visited) {
    const path = [];
    let x = x1, y = y1;
    const key = (x, y) => `${x},${y}`;
    while (x !== x2 || y !== y2) {
      if (x < x2) x++;
      else if (x > x2) x--;
      else if (y < y2) y++;
      else if (y > y2) y--;
      if (visited.has(key(x, y)) && !(x === x2 && y === y2)) return null;
      path.push({ x, y });
    }
    return path;
  }

  _fallbackPath() {
    this.init();
    const midY = Math.floor(this.rows / 2);
    this.entry = { x: 0, y: midY };
    this.exit = { x: this.cols - 1, y: midY };
    const path = [];
    let y = midY;
    for (let x = 0; x < this.cols; x++) {
      path.push({ x, y });
      if (x === Math.floor(this.cols / 3)) {
        for (let dy = 0; dy < 4 && y > 2; dy++) { y--; path.push({ x, y }); }
      } else if (x === Math.floor(2 * this.cols / 3)) {
        for (let dy = 0; dy < 4 && y < this.rows - 3; dy++) { y++; path.push({ x, y }); }
      }
    }
    for (const p of path) this.cells[p.y][p.x] = CELL_PATH;
    this.cells[this.entry.y][this.entry.x] = CELL_ENTRY;
    this.cells[this.exit.y][this.exit.x] = CELL_EXIT;
    this.path = path;
  }

  isPlaceable(gx, gy) {
    if (gx < 0 || gx >= this.cols || gy < 0 || gy >= this.rows) return false;
    if (this.cells[gy][gx] !== CELL_EMPTY) return false;
    if (this.towers.has(`${gx},${gy}`)) return false;
    return true;
  }

  placeTower(gx, gy, tower) { this.towers.set(`${gx},${gy}`, tower); }
  removeTower(gx, gy) { this.towers.delete(`${gx},${gy}`); }
  getTowerAt(gx, gy) { return this.towers.get(`${gx},${gy}`) || null; }

  getWalkableNeighbors(x, y) {
    const neighbors = [];
    const dirs = [{ dx: 1, dy: 0 }, { dx: -1, dy: 0 }, { dx: 0, dy: 1 }, { dx: 0, dy: -1 }];
    for (const d of dirs) {
      const nx = x + d.dx, ny = y + d.dy;
      if (nx >= 0 && nx < this.cols && ny >= 0 && ny < this.rows) {
        const cell = this.cells[ny][nx];
        if (cell === CELL_PATH || cell === CELL_ENTRY || cell === CELL_EXIT) {
          neighbors.push({ x: nx, y: ny });
        }
      }
    }
    return neighbors;
  }
}
