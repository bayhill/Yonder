import type { Layer, Frame } from '../layer';
import { LAYOUT, WORLD, groundTop } from '../composition';
import type { Rng } from '../../core/random';
import { createNoise2D } from 'simplex-noise';

/** A low conifer treeline across the far side of the meadow: two soft rows, clumped, with gaps. */
export function createFarTreeline(rng: Rng): Layer & { drawPath: (ctx: CanvasRenderingContext2D, yOffset: (x: number) => number) => void } {
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
      const h = (5 + 28 * clump * clump + r.range(0, 10) * r.next()) * scale;
      const w = r.range(5, 13) * scale;
      if (r.chance(0.28)) {
        // a rounded deciduous crown among the spruce: a birch or aspen clump
        const dw = w * r.range(1.3, 2.0), dh = h * r.range(0.55, 0.8);
        pts.push(
          x, base,
          x + dw * 0.1, base - dh * 0.55,
          x + dw * 0.3, base - dh * 0.9,
          x + dw * 0.55, base - dh,
          x + dw * 0.8, base - dh * 0.85,
          x + dw * 0.95, base - dh * 0.5,
          x + dw, base,
        );
        x += dw * r.range(0.7, 0.95);
        continue;
      }
      const sk = r.range(-0.14, 0.14); // leaning tip
      const ragged = r.range(0.3, 0.6);  // how far down the first side branches reach
      pts.push(
        x, base,
        x + w * 0.18, base - h * ragged,
        x + w * 0.3, base - h * (ragged + 0.15),
        x + w * 0.4, base - h * 0.78,
        x + w * (0.5 + sk), base - h,
        x + w * 0.6, base - h * 0.8,
        x + w * 0.72, base - h * (ragged + 0.1),
        x + w * 0.84, base - h * ragged * 0.9,
        x + w, base,
      );
      x += w * r.range(0.6, 0.95);
    }
    pts.push(x, LAYOUT.horizonY + 30);
    return { depth, arr: new Float32Array(pts) };
  }

  const drawPath = (ctx: CanvasRenderingContext2D, yOffset: (x: number) => number) => {
    const row = rows[1];
    ctx.beginPath();
    ctx.moveTo(row.arr[0], row.arr[1]);
    for (let i = 2; i < row.arr.length; i += 2) ctx.lineTo(row.arr[i], row.arr[i + 1] + yOffset(row.arr[i]));
    ctx.closePath();
    ctx.fill();
  };
  return {
    name: 'farTreeline',
    drawPath,
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
