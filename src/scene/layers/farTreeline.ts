import type { Layer, Frame } from '../layer';
import { LAYOUT, WORLD, groundTop } from '../composition';
import type { Rng } from '../../core/random';
import { createNoise2D } from 'simplex-noise';

/** A low conifer treeline across the far side of the meadow: two soft rows, clumped, with gaps. */
export function createFarTreeline(rng: Rng): Layer {
  const r = rng.fork('treeline');
  const noise = createNoise2D(r.next);
  const rows = [buildRow(0.80, 9, 1.0), buildRow(0.66, 0, 1.25)];

  function buildRow(depth: number, yOff: number, scale: number) {
    const pts: number[] = [];
    let x = -10;
    pts.push(x, LAYOUT.horizonY + 30);
    while (x < WORLD.w + 10) {
      const clump = 0.5 + 0.5 * noise(x * 0.0035 + depth * 10, depth); // slow variation in stand height
      const base = groundTop(x) + 4 + yOff + 6 * noise(x * 0.01, 5 + depth);
      if (clump < 0.22 && r.chance(0.6)) { x += r.range(8, 30); continue; } // a gap
      const h = (6 + 26 * clump * clump + r.range(0, 8)) * scale;
      const w = r.range(6, 12) * scale;
      const sk = r.range(-0.12, 0.12); // leaning tip
      pts.push(
        x, base,
        x + w * 0.22, base - h * 0.42,
        x + w * 0.36, base - h * 0.52,
        x + w * (0.5 + sk), base - h,
        x + w * 0.64, base - h * 0.52,
        x + w * 0.78, base - h * 0.42,
        x + w, base,
      );
      x += w * r.range(0.6, 0.95);
    }
    pts.push(x, LAYOUT.horizonY + 30);
    return { depth, arr: new Float32Array(pts) };
  }

  return {
    name: 'farTreeline',
    static: true,
    draw(ctx, f: Frame) {
      for (const row of rows) {
        ctx.fillStyle = f.colours.atmos('farTreeline', row.depth);
        ctx.beginPath();
        ctx.moveTo(row.arr[0], row.arr[1]);
        for (let i = 2; i < row.arr.length; i += 2) ctx.lineTo(row.arr[i], row.arr[i + 1]);
        ctx.closePath();
        ctx.fill();
      }
    },
  };
}
