import { CONFIG } from './config.js';

export function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
export function randFloat(min, max) { return Math.random() * (max - min) + min; }
export function choose(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function gridToPixel(gx, gy) {
  return {
    x: gx * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
    y: gy * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
  };
}

export function pixelToGrid(px, py) {
  return {
    x: Math.floor(px / CONFIG.TILE_SIZE),
    y: Math.floor(py / CONFIG.TILE_SIZE),
  };
}

export function drawDiamond(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size, y);
  ctx.lineTo(x, y + size);
  ctx.lineTo(x - size, y);
  ctx.closePath();
}

export function drawHexagon(ctx, x, y, size) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + size * Math.cos(angle);
    const py = y + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawTriangle(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y - size);
  ctx.lineTo(x + size * 0.866, y + size * 0.5);
  ctx.lineTo(x - size * 0.866, y + size * 0.5);
  ctx.closePath();
}

export function drawOctagon(ctx, x, y, size) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI / 4) * i - Math.PI / 8;
    const px = x + size * Math.cos(angle);
    const py = y + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawPentagon(ctx, x, y, size) {
  ctx.beginPath();
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI * 2 / 5) * i - Math.PI / 2;
    const px = x + size * Math.cos(angle);
    const py = y + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

export function drawCross(ctx, x, y, size) {
  const w = size * 0.35;
  ctx.beginPath();
  ctx.moveTo(x - w, y - size);
  ctx.lineTo(x + w, y - size);
  ctx.lineTo(x + w, y - w);
  ctx.lineTo(x + size, y - w);
  ctx.lineTo(x + size, y + w);
  ctx.lineTo(x + w, y + w);
  ctx.lineTo(x + w, y + size);
  ctx.lineTo(x - w, y + size);
  ctx.lineTo(x - w, y + w);
  ctx.lineTo(x - size, y + w);
  ctx.lineTo(x - size, y - w);
  ctx.lineTo(x - w, y - w);
  ctx.closePath();
}

export function drawShape(ctx, shape, x, y, size) {
  switch (shape) {
    case 'diamond':  drawDiamond(ctx, x, y, size); break;
    case 'hexagon':  drawHexagon(ctx, x, y, size); break;
    case 'triangle': drawTriangle(ctx, x, y, size); break;
    case 'square':   ctx.beginPath(); ctx.rect(x - size, y - size, size * 2, size * 2); break;
    case 'octagon':  drawOctagon(ctx, x, y, size); break;
    case 'pentagon': drawPentagon(ctx, x, y, size); break;
    case 'cross':    drawCross(ctx, x, y, size); break;
    case 'circle':   ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); break;
    default:         ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); break;
  }
}
