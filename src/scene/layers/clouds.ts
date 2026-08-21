import type { Layer, Frame } from '../layer';
import { LAYOUT, WORLD } from '../composition';
import type { Rng } from '../../core/random';
import { createNoise4D } from 'simplex-noise';
import type { WindField } from '../../wind/field';
import { clamp01, smoothstep } from '../../core/easing';
import { motionScale } from '../../core/motion';

/**
 * Clouds as a density field at three altitudes.
 * Two seamless fBm tiles are precomputed; each frame every sky pixel (at 1/5 resolution)
 * samples them through a perspective mapping, scrolled by the wind. Cover sets a density
 * threshold per layer, so 0 is a clear sky and 1 a continuous soft ceiling.
 */
const TILE = 256;
const BW = 320, BH = 110;                 // buffer size; drawn over the sky rect
const SKY_BOTTOM = LAYOUT.horizonY + 14;

interface Alt { scale: number; speed: number; soft: number; onset: number; opacity: number; warp: number; aspect: number }
// Altitudes, back to front: high thin veils, mid cumulus, low heavy deck.
const ALTS: Alt[] = [
  { scale: 0.9, speed: 0.35, soft: 0.34, onset: 0.0, opacity: 0.5, warp: 1.8, aspect: 0.5 },
  { scale: 1.8, speed: 0.7, soft: 0.10, onset: 0.06, opacity: 1.0, warp: 1.0, aspect: 1.15 },
  { scale: 2.6, speed: 1.1, soft: 0.16, onset: 0.45, opacity: 1.0, warp: 0.7, aspect: 0.7 },
];

function makeTile(rng: Rng, octaves: number): Float32Array {
  const noise = createNoise4D(rng.next);
  const t = new Float32Array(TILE * TILE);
  let min = Infinity, max = -Infinity;
  for (let j = 0; j < TILE; j++) {
    const b = (j / TILE) * Math.PI * 2;
    for (let i = 0; i < TILE; i++) {
      const a = (i / TILE) * Math.PI * 2;
      let v = 0, amp = 1, f = 1.2, norm = 0;
      for (let o = 0; o < octaves; o++) {
        v += amp * noise(f * Math.cos(a), f * Math.sin(a), f * Math.cos(b), f * Math.sin(b));
        norm += amp; amp *= 0.5; f *= 2.05;
      }
      v /= norm;
      t[j * TILE + i] = v;
      if (v < min) min = v; if (v > max) max = v;
    }
  }
  for (let k = 0; k < t.length; k++) t[k] = (t[k] - min) / (max - min);
  return t;
}

/** Bilinear, wrapping sample of a tile at (u, v) in tile texels. */
function sample(t: Float32Array, u: number, v: number): number {
  const iu = Math.floor(u), iv = Math.floor(v);
  const fu = u - iu, fv = v - iv;
  const x0 = iu & (TILE - 1), y0 = iv & (TILE - 1);
  const x1 = (x0 + 1) & (TILE - 1), y1 = (y0 + 1) & (TILE - 1);
  const r0 = y0 * TILE, r1 = y1 * TILE;
  const a = t[r0 + x0] + (t[r0 + x1] - t[r0 + x0]) * fu;
  const b = t[r1 + x0] + (t[r1 + x1] - t[r1 + x0]) * fu;
  return a + (b - a) * fv;
}

function hexToRgb(h: string): [number, number, number] {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

export function createClouds(rng: Rng, cover: () => number): Layer & { canvas: HTMLCanvasElement; active: () => boolean } {
  const r = rng.fork('clouds');
  const tileA = makeTile(r.fork('a'), 4);
  const tileB = makeTile(r.fork('b'), 3);
  // Quantiles of the blended noise, so "cover a" really covers a fraction a of the sky.
  const quant = new Float32Array(101);
  {
    const vals = new Float32Array(TILE * TILE);
    for (let i = 0; i < vals.length; i++) vals[i] = tileA[i] * 0.62 + tileB[(i * 7 + 13) & (TILE * TILE - 1)] * 0.38;
    vals.sort();
    for (let q = 0; q <= 100; q++) quant[q] = vals[Math.min(vals.length - 1, Math.floor((q / 100) * vals.length))];
  }
  const threshold = (amount: number) => quant[Math.round((1 - clamp01(amount)) * 100)];
  const canvas = document.createElement('canvas');
  canvas.width = BW; canvas.height = BH;
  const cctx = canvas.getContext('2d')!;
  const img = cctx.createImageData(BW, BH);
  const px = img.data;
  const dens = new Float32Array(BW * BH);
  const thick = new Float32Array(BW * BH);
  const acc = new Float32Array(BW * BH * 4); // premultiplied rgb + alpha, float
  // perspective per row: depth 1 at the top of the sky, large near the horizon
  const depth = new Float32Array(BH), fade = new Float32Array(BH);
  for (let j = 0; j < BH; j++) {
    const p = 1 - j / (BH - 1);
    depth[j] = 1 / (0.14 + p * 0.86);
    fade[j] = smoothstep(0.0, 0.22, p);
  }
  const offU = new Float32Array(ALTS.length), offV = new Float32Array(ALTS.length), morph = new Float32Array(ALTS.length);
  let lit: [number, number, number] = [240, 240, 240], shade: [number, number, number] = [170, 175, 185];
  let colourVersion = -1;
  let lastCover = -1, dirty = true, frame = 0;

  return {
    name: 'clouds',
    canvas,
    active: () => clamp01(cover()) >= 0.005,
    update(dt, _t, wind: WindField) {
      // Scroll with the wind; higher layers move slower on screen; shapes morph slowly over time.
      const s = (0.15 + wind.strength) * motionScale();
      for (let k = 0; k < ALTS.length; k++) {
        const a = ALTS[k];
        offU[k] += wind.dirX * s * a.speed * 7 * dt;
        offV[k] += s * a.speed * 1.2 * dt;
        morph[k] += dt * (0.9 + k * 0.3);
      }
      // The field moves a fraction of a pixel per step; rebuilding it at 20 Hz is invisible and
      // keeps the heaviest layer at ~1 ms per frame on average.
      if (++frame % 3 === 0) dirty = true;
    },
    draw(ctx, f: Frame) {
      const c = clamp01(cover());
      if (c < 0.005) return;
      if (f.colours.version !== colourVersion) {
        colourVersion = f.colours.version;
        lit = hexToRgb(f.colours.cloud.lit);
        shade = hexToRgb(f.colours.cloud.shade);
      }
      if (dirty || c !== lastCover) {
        dirty = false; lastCover = c;
        acc.fill(0);
        for (let k = 0; k < ALTS.length; k++) {
          const a = ALTS[k];
          // How much of the sky this altitude covers: veils ride along with any cover, the mid
          // layer carries most of it, the low deck closes in at high cover.
          const amount = k === 0 ? c * 0.7 : k === 1 ? smoothstep(0.02, 0.8, c) : smoothstep(0.45, 1, c) * 1.05;
          if (amount <= 0.005) continue;
          const th = threshold(amount) - (amount >= 1 ? 0.2 : 0);
          const soft = a.soft + 0.05 * (1 - Math.min(1, amount));
          const inv = 1 / soft;
          const relInv = 1 / Math.max(0.05, 1 - th);
          const sc = a.scale * 28;
          const ou = offU[k], ov = offV[k], m = morph[k];
          // pass 1: density
          for (let j = 0; j < BH; j++) {
            const d = depth[j], row = j * BW;
            const vv = d * sc * a.aspect + ov * 4 + 37 * k;
            for (let i = 0; i < BW; i++) {
              const uu = (i / BW - 0.5) * d * sc + ou * 4;
              const n = sample(tileA, uu, vv) * 0.62 + sample(tileB, uu * 0.5 + m * a.warp, vv * 0.5 - m * 0.4) * 0.38;
              const v = clamp01((n - th) * inv);
              dens[row + i] = v * v * (3 - 2 * v);
              thick[row + i] = n;
            }
          }
          // pass 2: shade and composite (top edges lit, thick undersides darker)
          for (let j = 0; j < BH; j++) {
            const row = j * BW, up = Math.max(0, j - 1) * BW;
            const fd = fade[j] * a.opacity;
            for (let i = 0; i < BW; i++) {
              const dv = dens[row + i];
              if (dv <= 0.002) continue;
              // Shade by thickness (so a full deck stays mottled) and light the top edges.
              const n = thick[row + i];
              const rel = clamp01((n - th) * relInv); // thickness within the cloud, 0 edge .. 1 core
              const t = clamp01(0.12 + rel * 0.7 + (dens[up + i] - dv) * 1.2 + (thick[up + i] - n) * 2.0);
              const alpha = dv * fd;
              const o = (row + i) * 4;
              const ia = 1 - alpha;
              acc[o] = acc[o] * ia + (lit[0] + (shade[0] - lit[0]) * t) * alpha;
              acc[o + 1] = acc[o + 1] * ia + (lit[1] + (shade[1] - lit[1]) * t) * alpha;
              acc[o + 2] = acc[o + 2] * ia + (lit[2] + (shade[2] - lit[2]) * t) * alpha;
              acc[o + 3] = acc[o + 3] * ia + alpha;
            }
          }
        }
        // un-premultiply into the ImageData
        for (let o = 0; o < acc.length; o += 4) {
          const al = acc[o + 3];
          if (al <= 0.002) { px[o + 3] = 0; continue; }
          px[o] = acc[o] / al; px[o + 1] = acc[o + 1] / al; px[o + 2] = acc[o + 2] / al; px[o + 3] = al * 255;
        }
        cctx.putImageData(img, 0, 0);
      }
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(canvas, 0, 0, BW, BH, -2, f.vp.top, WORLD.w + 4, SKY_BOTTOM - f.vp.top);
    },
  };
}
