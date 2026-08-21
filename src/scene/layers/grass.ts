import type { Layer, Frame } from '../layer';
import { generateBand, bladePath, stepBand, type BandSpec, type GrassBand } from '../procgen/grass';
import type { Rng } from '../../core/random';
import type { Role } from '../../colour/palettes';
import { RAMP } from '../../colour/resolve';
import type { WindField, WindSample } from '../../wind/field';

/**
 * One band of individually drawn blades. Blades are grouped by tone so each frame does 5 fills.
 * `amp` is how far a full-strength wind bends a blade, as a fraction of its height.
 */
export interface GrassOptions {
  /** Roots in shadow: a soft darkening over the lower part of the band, 0..1 strength. */
  rootShade?: number;
  /** World x-range to draw (culling outside the viewport is done per frame). */
}

export function createGrassBand(spec: BandSpec, role: Role, depth: number, rng: Rng, amp = 0.55, opts: GrassOptions = {}): Layer & { band: GrassBand } {
  const band = generateBand(spec, rng);
  const bend = new Float32Array(band.count);
  const toneNow = new Uint8Array(band.count);
  const bandTop = Math.min(spec.y0(400), spec.y0(1200)), bandBottom = Math.max(spec.y1(400), spec.y1(1200));
  const rootShade = opts.rootShade ?? 0;
  const ws: WindSample = { bend: 0, flutter: 0 };
  let t = 0;
  return {
    name: `grass:${role}:${depth}`,
    band,
    update(dt, _t, wind: WindField) {
      t += dt;
      for (let i = 0; i < band.count; i++) {
        wind.sample(band.x[i], band.y[i], ws);
        // flutter: a fast per-blade tremor that only shows in strong wind
        bend[i] = ws.bend + ws.flutter * 0.08 * Math.sin(t * 9 + band.phase[i]);
      }
      stepBand(band, dt, bend, amp);
      // Silver waves: a blade bent well past its rest shows its paler side, so a gust reads as a
      // light wave crossing the field rather than as geometry alone.
      for (let i = 0; i < band.count; i++) {
        const r = (band.tipX[i] - band.lean[i]) / (band.h[i] * amp + 1e-6);
        const k = band.tone[i] + (r > 0.42 || r < -0.42 ? 1 : 0);
        toneNow[i] = k > 4 ? 4 : k;
      }
    },
    draw(ctx, f: Frame) {
      const ramp = f.colours.ramp(role);
      const a = f.alpha;
      const cover = f.weather.snowCover;
      // Snow buries the meadow: blades shorten as the blanket rises, and bend a little under the load.
      const g = f.season.grass * (1 - (depth > 0.2 ? 0.8 : 0.55) * Math.min(1, cover));
      const sag = 1 + 0.35 * Math.min(1, cover);
      const x0 = f.vp.left - 160, x1 = f.vp.right + 160;
      for (let k = 0; k < RAMP; k++) {
        ctx.fillStyle = depth > 0 ? f.colours.atmos(role, depth + (k - 2) * -0.05) : ramp[k];
        ctx.beginPath();
        for (let i = 0; i < band.count; i++) {
          if (toneNow[i] !== k) continue;
          const bx = band.x[i];
          if (bx < x0 || bx > x1) continue;
          const tx = (band.prevX[i] + (band.tipX[i] - band.prevX[i]) * a) * g * sag;
          const ty = (band.prevY[i] + (band.tipY[i] - band.prevY[i]) * a) * g;
          const mx = (band.prevMid[i] + (band.midX[i] - band.prevMid[i]) * a) * g * sag;
          bladePath(ctx, band.x[i], band.y[i], band.w[i] * (0.8 + 0.2 * g), tx, ty, mx);
        }
        ctx.fill();
      }
      if (rootShade > 0) {
        const top = bandTop + (bandBottom - bandTop) * 0.35;
        const g = ctx.createLinearGradient(0, top, 0, bandBottom);
        const c = f.colours.ramp('ground')[0];
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, c);
        ctx.globalAlpha = rootShade * (0.14 + 0.1 * f.light.contrast) * (1 - Math.min(1, cover) * 0.8);
        ctx.fillStyle = g;
        ctx.fillRect(f.vp.left, top, f.vp.right - f.vp.left, bandBottom - top);
        ctx.globalAlpha = 1;
      }
      // Snow caps on the tips of the nearer blades; hoarfrost on clear, cold, still mornings
      // whitens the tips the same way, more faintly, and the sun takes it off by mid-morning.
      const frost = f.weather.frost * (1 - Math.min(1, cover * 3));
      const capAlpha = Math.min(1, (cover - 0.12) * 2.2);
      const snowy = capAlpha > 0.02 && depth <= 0.2;
      const frosty = !snowy && frost > 0.03 && depth <= 0.2;
      if (snowy || frosty) {
        ctx.strokeStyle = f.colours.ramp('snow')[frosty ? 3 : 2];
        ctx.lineCap = 'round';
        ctx.globalAlpha = snowy ? capAlpha : frost * 0.3;
        // snow: a cap over the top fifth of every other blade; frost: a hairline over the top tenth of all
        const from = snowy ? 0.78 : 0.9, stride = 2, wf = snowy ? 0.9 : 0.3;
        ctx.beginPath();
        for (let i = 0; i < band.count; i += stride) {
          const bx = band.x[i];
          if (bx < x0 || bx > x1) continue;
          const tx = (band.prevX[i] + (band.tipX[i] - band.prevX[i]) * a) * g * sag;
          const ty = (band.prevY[i] + (band.tipY[i] - band.prevY[i]) * a) * g;
          ctx.lineWidth = band.w[i] * wf;
          ctx.moveTo(bx + tx * from, band.y[i] + ty * (from + 0.02));
          ctx.lineTo(bx + tx, band.y[i] + ty);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    },
  };
}
