// Generates many maps per grid size and difficulty and fails if any path
// touches itself (a path cell with an orthogonal path neighbour that is not
// its previous or next step), or if a portrait path does not run from the top
// row to the bottom row. Usage: node scripts/check-paths.mjs [runs]

globalThis.window = {};
Object.defineProperty(globalThis, 'navigator', { value: { maxTouchPoints: 0 }, configurable: true });

const { CONFIG } = await import('../js/config.js');
const { Grid } = await import('../js/grid.js');

const RUNS = Number(process.argv[2]) || 2000;
const GRIDS = { mobile: [12, 9], portrait: [9, 12], desktop: [20, 15] };

let failed = false;

for (const [gridName, [cols, rows]] of Object.entries(GRIDS)) {
  CONFIG.GRID_COLS = cols;
  CONFIG.GRID_ROWS = rows;

  for (const [diff, minLength] of Object.entries(CONFIG.DIFFICULTY)) {
    let touching = 0;
    let fallbacks = 0;
    let offEdge = 0;
    const realFallback = Grid.prototype._fallbackPath;
    Grid.prototype._fallbackPath = function (...args) {
      fallbacks++;
      return realFallback.apply(this, args);
    };

    for (let i = 0; i < RUNS; i++) {
      const grid = new Grid();
      grid.generate(minLength);
      if (touchesItself(grid.path)) touching++;
      if (rows > cols && !(grid.path[0].y === 0 && grid.path.at(-1).y === rows - 1)) offEdge++;
    }
    Grid.prototype._fallbackPath = realFallback;

    const pct = (n) => `${((n / RUNS) * 100).toFixed(1)}%`;
    console.log(`${gridName.padEnd(8)} ${diff.padEnd(6)} min=${String(minLength).padEnd(3)} touching=${pct(touching)} fallback=${pct(fallbacks)}${rows > cols ? ` off-edge=${pct(offEdge)}` : ''}`);
    if (touching > 0 || offEdge > 0) failed = true;
  }
}

function touchesItself(path) {
  const index = new Map(path.map((c, i) => [`${c.x},${c.y}`, i]));
  return path.some((c, i) =>
    [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
      const j = index.get(`${c.x + dx},${c.y + dy}`);
      return j !== undefined && Math.abs(i - j) !== 1;
    })
  );
}

if (failed) {
  console.error('FAIL: some paths touch themselves or miss the top or bottom row');
  process.exit(1);
}
console.log('OK: no path touches itself');
