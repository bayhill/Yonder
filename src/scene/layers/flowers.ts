import type { Layer, Frame } from '../layer';
import type { Rng } from '../../core/random';
import type { WindField, WindSample } from '../../wind/field';
import { groundTop } from '../composition';

/**
 * Midsummer wildflowers in the mid meadow: oxeye daisies and harebells, a sparse scatter that
 * opens in June, peaks in July and is gone by late August. Heads only, at grass-top height,
 * swaying with the blades around them. Colours come from the palette under the current light.
 */
const ws: WindSample = { bend: 0, flutter: 0 };

export function createFlowers(rng: Rng, count = 110): Layer {
  const r = rng.fork('flowers');
  const x = new Float32Array(count), y = new Float32Array(count), h = new Float32Array(count), sz = new Float32Array(count);
  const kind = new Uint8Array(count), ph = new Float32Array(count);
  const ox = new Float32Array(count), prev = new Float32Array(count);
  const nClumps = 16, cx = new Float32Array(nClumps), cy = new Float32Array(nClumps), ck = new Uint8Array(nClumps);
  for (let k = 0; k < nClumps; k++) { cx[k] = r.range(-40, 1640); cy[k] = r.range(660, 790); ck[k] = r.chance(0.6) ? 0 : 1; }
  for (let i = 0; i < count; i++) {
    const k = r.int(0, nClumps - 1);
    x[i] = cx[k] + r.gauss() * 60; y[i] = Math.max(groundTop(x[i]) + 80, cy[k] + r.gauss() * 28);
    const persp = 0.6 + ((y[i] - 650) / 140) * 0.7;
    h[i] = r.range(34, 58) * persp; sz[i] = r.range(2.2, 3.4) * persp;
    kind[i] = r.chance(0.15) ? 1 - ck[k] : ck[k];
    ph[i] = r.range(0, Math.PI * 2);
  }
  let t = 0;
  return {
    name: 'flowers',
    update(dt, _t, wind: WindField) {
      t += dt;
      for (let i = 0; i < count; i++) {
        prev[i] = ox[i];
        wind.sample(x[i], y[i], ws);
        const target = ws.bend * h[i] * 0.5 + Math.sin(t * 1.1 + ph[i]) * 0.6;
        ox[i] += (target - ox[i]) * Math.min(1, dt * 5);
      }
    },
    draw(ctx, f: Frame) {
      const bloom = f.season.bloom * (1 - Math.min(1, f.weather.snowCover * 4));
      if (bloom < 0.02) return;
      const c = f.colours;
      const a = f.alpha;
      const n = Math.round(count * bloom);
      ctx.globalAlpha = 0.9;
      // daisies: pale heads with a warm centre
      ctx.fillStyle = c.ramp('snow')[3];
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        if (kind[i] !== 0) continue;
        const px = x[i] + prev[i] + (ox[i] - prev[i]) * a, py = y[i] - h[i] * f.season.grass;
        ctx.moveTo(px + sz[i], py); ctx.ellipse(px, py, sz[i], sz[i] * 0.7, 0, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.fillStyle = c.ramp('ground')[4];
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        if (kind[i] !== 0) continue;
        const px = x[i] + prev[i] + (ox[i] - prev[i]) * a, py = y[i] - h[i] * f.season.grass;
        ctx.moveTo(px + sz[i] * 0.38, py); ctx.arc(px, py, sz[i] * 0.38, 0, Math.PI * 2);
      }
      ctx.fill();
      // harebells: small nodding bells in the sky's blue
      ctx.fillStyle = c.hex('skyZenith');
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        if (kind[i] !== 1) continue;
        const px = x[i] + prev[i] + (ox[i] - prev[i]) * a, py = y[i] - h[i] * f.season.grass * 0.92;
        const s = sz[i] * 0.8;
        ctx.moveTo(px - s * 0.6, py - s);
        ctx.quadraticCurveTo(px, py - s * 1.6, px + s * 0.6, py - s);
        ctx.lineTo(px + s * 0.8, py + s * 0.4);
        ctx.quadraticCurveTo(px, py + s * 0.1, px - s * 0.8, py + s * 0.4);
        ctx.closePath();
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    },
  };
}
