import type { Layer, Frame } from '../layer';
import { generateBand, bladePath, type BandSpec, type GrassBand } from '../procgen/grass';
import type { Rng } from '../../core/random';
import type { Role } from '../../colour/palettes';
import { RAMP } from '../../colour/resolve';

/** One band of individually drawn blades. Blades are grouped by tone so each frame does 5 fills. */
export function createGrassBand(spec: BandSpec, role: Role, depth: number, rng: Rng): Layer & { band: GrassBand } {
  const band = generateBand(spec, rng);
  return {
    name: `grass:${role}:${depth}`,
    band,
    draw(ctx, f: Frame) {
      const ramp = f.colours.ramp(role);
      for (let k = 0; k < RAMP; k++) {
        ctx.fillStyle = depth > 0 ? f.colours.atmos(role, depth + (k - 2) * -0.05) : ramp[k];
        ctx.beginPath();
        for (let i = 0; i < band.count; i++) {
          if (band.tone[i] !== k) continue;
          bladePath(ctx, band.x[i], band.y[i], band.w[i], band.tipX[i], band.tipY[i]);
        }
        ctx.fill();
      }
    },
  };
}
