#!/usr/bin/env node
/**
 * Generates PNG app icons for the PWA manifest using only Node.js built-ins.
 * Run: node scripts/generate-icons.js
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// CRC32 table used by PNG chunk checksums
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const t = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([t, data])));
  return Buffer.concat([len, t, data, crcBuf]);
}

function createPNG(size, pixels) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA colour type
  // bytes 10-12: compression/filter/interlace = 0

  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 4)] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const src = (y * size + x) * 4;
      const dst = y * (1 + size * 4) + 1 + x * 4;
      raw[dst]     = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
      raw[dst + 3] = pixels[src + 3];
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', zlib.deflateSync(raw)),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

function setPixel(pixels, size, x, y, r, g, b, a) {
  if (x < 0 || x >= size || y < 0 || y >= size) return;
  const i = (y * size + x) * 4;
  const sa = a / 255;
  const da = pixels[i + 3] / 255;
  const oa = sa + da * (1 - sa);
  if (oa === 0) return;
  pixels[i]     = Math.round((r * sa + pixels[i]     * da * (1 - sa)) / oa);
  pixels[i + 1] = Math.round((g * sa + pixels[i + 1] * da * (1 - sa)) / oa);
  pixels[i + 2] = Math.round((b * sa + pixels[i + 2] * da * (1 - sa)) / oa);
  pixels[i + 3] = Math.round(oa * 255);
}

function drawThickLine(pixels, size, x0, y0, x1, y1, w, r, g, b) {
  const dx = x1 - x0, dy = y1 - y0;
  const len = Math.sqrt(dx * dx + dy * dy);
  const steps = Math.ceil(len * 3);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const px = x0 + dx * t, py = y0 + dy * t;
    const hw = w / 2;
    for (let qy = Math.floor(py - hw - 1); qy <= Math.ceil(py + hw + 1); qy++) {
      for (let qx = Math.floor(px - hw - 1); qx <= Math.ceil(px + hw + 1); qx++) {
        const d = Math.sqrt((qx - px) ** 2 + (qy - py) ** 2);
        if (d <= hw + 0.5) {
          const alpha = Math.min(255, Math.round(255 * Math.min(1, hw - d + 1)));
          setPixel(pixels, size, qx, qy, r, g, b, alpha);
        }
      }
    }
  }
}

function drawFilledCircle(pixels, size, cx, cy, radius, r, g, b, baseAlpha) {
  for (let y = Math.floor(cy - radius - 1); y <= Math.ceil(cy + radius + 1); y++) {
    for (let x = Math.floor(cx - radius - 1); x <= Math.ceil(cx + radius + 1); x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (d <= radius + 0.5) {
        const alpha = Math.round(baseAlpha * Math.min(1, radius - d + 1));
        setPixel(pixels, size, x, y, r, g, b, alpha);
      }
    }
  }
}

function drawIcon(size, maskable) {
  const pixels = new Uint8ClampedArray(size * size * 4);

  // Background
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = 10; pixels[i + 1] = 10; pixels[i + 2] = 10; pixels[i + 3] = 255;
  }

  // Inset content for maskable safe zone (10% each side)
  const pad = maskable ? size * 0.12 : size * 0.02;
  const s = size;
  const cx = s / 2;

  // Triangle vertices
  const tx1 = cx,               ty1 = pad + s * 0.08;
  const tx2 = s - pad - s*0.04, ty2 = s - pad - s*0.06;
  const tx3 = pad + s * 0.04,   ty3 = s - pad - s*0.06;

  const strokeW = Math.max(3, s * 0.038);
  drawThickLine(pixels, s, tx1, ty1, tx2, ty2, strokeW, 0, 255, 255);
  drawThickLine(pixels, s, tx2, ty2, tx3, ty3, strokeW, 0, 255, 255);
  drawThickLine(pixels, s, tx3, ty3, tx1, ty1, strokeW, 0, 255, 255);

  // Circle (centred on lower third of triangle)
  const circleCx = cx;
  const circleCy = (ty1 + ty2 + ty3) / 3 + s * 0.04;
  const circleR  = s * (maskable ? 0.10 : 0.115);
  drawFilledCircle(pixels, s, circleCx, circleCy, circleR, 0, 255, 255, 217);

  return pixels;
}

const iconsDir = path.join(__dirname, '..', 'icons');
fs.mkdirSync(iconsDir, { recursive: true });

for (const size of [192, 512]) {
  fs.writeFileSync(
    path.join(iconsDir, `icon-${size}.png`),
    createPNG(size, drawIcon(size, false))
  );
  console.log(`✓ icon-${size}.png`);

  fs.writeFileSync(
    path.join(iconsDir, `icon-maskable-${size}.png`),
    createPNG(size, drawIcon(size, true))
  );
  console.log(`✓ icon-maskable-${size}.png`);
}

console.log('Icons generated successfully.');
