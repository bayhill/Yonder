import type { Layer, Frame } from '../layer';
import { LAYOUT, WORLD } from '../composition';
import { createNoise2D } from 'simplex-noise';
import type { Rng } from '../../core/random';

interface Hill { depth: number; pts: Float32Array; }

/** Two bands of soft hills that exist mainly to be eaten by haze. */
export function createFarHills(rng: Rng): Layer {
  const noise = createNoise2D(rng.fork('hills').next);
  const hills: Hill[] = [
    build(0.97, 0.94, 52, 0.0011, 0.5),
    build(0.86, 0.965, 34, 0.0016, 0.5),
  ];
  function build(depth: number, yScale: number, amp: number, freq: number, seed: number): Hill {
    const n = 64;
    const pts = new Float32Array((n + 1) * 2 + 4);
    for (let i = 0; i <= n; i++) {
      const x = (i / n) * WORLD.w;
      const y = LAYOUT.horizonY * yScale - amp * (0.55 + 0.45 * noise(x * freq, seed)) - amp * 0.35 * noise(x * freq * 3.1, seed + 7) * 0.5;
      pts[i * 2] = x; pts[i * 2 + 1] = y;
    }
    pts[(n + 1) * 2] = WORLD.w; pts[(n + 1) * 2 + 1] = LAYOUT.horizonY + 40;
    pts[(n + 1) * 2 + 2] = 0; pts[(n + 1) * 2 + 3] = LAYOUT.horizonY + 40;
    return { depth, pts };
  }
  return {
    name: 'farHills',
    static: true,
    draw(ctx, f: Frame) {
      for (const h of hills) {
        ctx.fillStyle = f.colours.atmos('hills', h.depth);
        ctx.beginPath();
        ctx.moveTo(h.pts[0], h.pts[1]);
        for (let i = 2; i < h.pts.length; i += 2) ctx.lineTo(h.pts[i], h.pts[i + 1]);
        ctx.closePath();
        ctx.fill();
      }
    },
  };
}
