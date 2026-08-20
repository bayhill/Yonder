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
export function createGrassBand(spec: BandSpec, role: Role, depth: number, rng: Rng, amp = 0.55): Layer & { band: GrassBand } {
  const band = generateBand(spec, rng);
  const bend = new Float32Array(band.count);
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
    },
    draw(ctx, f: Frame) {
      const ramp = f.colours.ramp(role);
      const a = f.alpha;
      const cover = f.weather.snowCover;
      // Snow buries the meadow: blades shorten as the blanket rises, and bend a little under the load.
      const g = f.season.grass * (1 - (depth > 0.2 ? 0.8 : 0.55) * Math.min(1, cover));
      const sag = 1 + 0.35 * Math.min(1, cover);
      for (let k = 0; k < RAMP; k++) {
        ctx.fillStyle = depth > 0 ? f.colours.atmos(role, depth + (k - 2) * -0.05) : ramp[k];
        ctx.beginPath();
        for (let i = 0; i < band.count; i++) {
          if (band.tone[i] !== k) continue;
          const tx = (band.prevX[i] + (band.tipX[i] - band.prevX[i]) * a) * g * sag;
          const ty = (band.prevY[i] + (band.tipY[i] - band.prevY[i]) * a) * g;
          bladePath(ctx, band.x[i], band.y[i], band.w[i] * (0.8 + 0.2 * g), tx, ty);
        }
        ctx.fill();
      }
      // Snow caps on the tips of the nearer blades.
      if (cover > 0.12 && depth <= 0.2) {
        ctx.strokeStyle = f.colours.ramp('snow')[2];
        ctx.lineCap = 'round';
        ctx.globalAlpha = Math.min(1, (cover - 0.12) * 2.2);
        ctx.beginPath();
        for (let i = 0; i < band.count; i += 2) {
          const tx = (band.prevX[i] + (band.tipX[i] - band.prevX[i]) * a) * g * sag;
          const ty = (band.prevY[i] + (band.tipY[i] - band.prevY[i]) * a) * g;
          ctx.lineWidth = band.w[i] * 0.9;
          ctx.moveTo(band.x[i] + tx * 0.78, band.y[i] + ty * 0.8);
          ctx.lineTo(band.x[i] + tx, band.y[i] + ty);
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    },
  };
}
