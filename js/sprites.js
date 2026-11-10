// Pictures of towers and enemies for the HTML UI, drawn once with the same
// render code the board uses, so the panel always matches the game.
import { Tower } from './tower.js';
import { Enemy } from './enemy.js';

const cache = new Map();

function draw(key, size, renderFn) {
  if (cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  renderFn(canvas.getContext('2d'), size / 2);
  const url = canvas.toDataURL();
  cache.set(key, url);
  return url;
}

export function towerSprite(type, branch = 'A', tier = 0) {
  return draw(`tower:${type}:${branch}:${tier}`, 96, (ctx, c) => {
    const tower = new Tower(type, 0, 0);
    tower.x = c;
    tower.y = c;
    tower.angle = -Math.PI / 4;
    ctx.translate(c, c);
    const scale = type === 'sniper' && branch === 'A' && tier > 0 ? 1.1 : 1.5;
    ctx.scale(scale, scale);
    ctx.translate(-c, -c);
    for (let i = 0; i < tier; i++) tower.upgrade(branch);
    tower.render(ctx, false, false, true);
  });
}

export function enemySprite(type) {
  return draw('enemy:' + type, 48, (ctx, c) => {
    const enemy = new Enemy(type, [{ x: c, y: c }, { x: c + 10, y: c }]);
    enemy.revealed = true;
    // Small enemies are scaled up so every picture reads at the same size
    const scale = Math.min(1.6, 12 / enemy.size);
    ctx.translate(c, c);
    ctx.scale(scale, scale);
    ctx.translate(-c, -c);
    enemy.render(ctx, null);
  });
}

export function spriteImg(url, className = 'sprite') {
  return `<img class="${className}" src="${url}" alt="" draggable="false">`;
}
