export class SpatialHash {
  constructor(cellSize) {
    this.cellSize = cellSize;
    this.cells = new Map();
  }

  clear() { this.cells.clear(); }

  insert(entity) {
    const k = this._key(entity.x, entity.y);
    if (!this.cells.has(k)) this.cells.set(k, []);
    this.cells.get(k).push(entity);
  }

  query(x, y, radius) {
    const results = [];
    const r = radius;
    const minCX = Math.floor((x - r) / this.cellSize);
    const maxCX = Math.floor((x + r) / this.cellSize);
    const minCY = Math.floor((y - r) / this.cellSize);
    const maxCY = Math.floor((y + r) / this.cellSize);
    const r2 = r * r;
    for (let cx = minCX; cx <= maxCX; cx++) {
      for (let cy = minCY; cy <= maxCY; cy++) {
        const cell = this.cells.get(`${cx},${cy}`);
        if (!cell) continue;
        for (const e of cell) {
          const dx = e.x - x, dy = e.y - y;
          if (dx * dx + dy * dy <= r2) results.push(e);
        }
      }
    }
    return results;
  }

  _key(x, y) {
    return `${Math.floor(x / this.cellSize)},${Math.floor(y / this.cellSize)}`;
  }
}
