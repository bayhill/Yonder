// Renders the app icons (PNG) without a browser: a sky-to-meadow gradient, a far treeline, two
// ground bands and one pine, in the summer palette. Run: node scripts/icons.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const SKY_Z = hex('#8fa3b8'), SKY_H = hex('#dcd6c6'), FAR = hex('#7f96a0'), G1 = hex('#8a9a6a'), G2 = hex('#74884f');
const TRUNK = hex('#5a4a3c'), CROWN = hex('#3f6a55'), CROWN2 = hex('#4a7a62');

function render(n) {
  const px = new Uint8Array(n * n * 3);
  const put = (x, y, c) => { const o = (y * n + x) * 3; px[o] = c[0]; px[o + 1] = c[1]; px[o + 2] = c[2]; };
  const band = (x, c, a, b) => { const t = x / n; return a + (b - a) * (4 * t * (1 - t)); }; // gentle rise
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const t = Math.min(1, y / (n * 0.62));
    put(x, y, SKY_Z.map((v, i) => Math.round(v + (SKY_H[i] - v) * t)));
    const u = y / n;
    if (u > band(x, 0, 0.64, 0.58)) put(x, y, FAR);
    if (u > band(x, 0, 0.72, 0.66)) put(x, y, G1);
    if (u > band(x, 0, 0.82, 0.77)) put(x, y, G2);
  }
  // pine: trunk and two soft crown ellipses, right of centre
  const cx = n * 0.66;
  for (let y = Math.round(n * 0.36); y < n * 0.76; y++) for (let x = Math.round(cx - n * 0.018); x <= cx + n * 0.018; x++) put(x, y, TRUNK);
  const ell = (ex, ey, rx, ry, c) => { for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const dx = (x - ex) / rx, dy = (y - ey) / ry; if (dx * dx + dy * dy <= 1) put(x, y, c); } };
  ell(cx, n * 0.36, n * 0.13, n * 0.095, CROWN);
  ell(cx - n * 0.03, n * 0.27, n * 0.09, n * 0.065, CROWN2);
  return px;
}
function png(n, px) {
  const raw = Buffer.alloc((n * 3 + 1) * n);
  for (let y = 0; y < n; y++) { raw[y * (n * 3 + 1)] = 0; Buffer.from(px.buffer, y * n * 3, n * 3).copy(raw, y * (n * 3 + 1) + 1); }
  const crcTable = Array.from({ length: 256 }, (_, k) => { let c = k; for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const v of b) c = crcTable[(c ^ v) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(n, 0); ihdr.writeUInt32BE(n, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
for (const n of [180, 512]) writeFileSync(new URL(`../public/icon-${n}.png`, import.meta.url), png(n, render(n)));
console.log('icons written');
