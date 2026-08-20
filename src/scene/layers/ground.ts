import type { Layer, Frame } from '../layer';
import { WORLD, groundTop } from '../composition';
import type { Rng } from '../../core/random';

/**
 * The meadow ground plane plus the far grass texture: a band of tiny blades drawn as one
 * path so the far meadow reads as texture, not as individual plants.
 */
export function createGround(rng: Rng): Layer {
  const r = rng.fork('ground');
  const n = 48;
  const ground = new Float32Array((n + 1) * 2 + 4);
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * WORLD.w;
    ground[i * 2] = x; ground[i * 2 + 1] = groundTop(x);
  }
  ground[(n + 1) * 2] = WORLD.w; ground[(n + 1) * 2 + 1] = WORLD.h + 10;
  ground[(n + 1) * 2 + 2] = 0; ground[(n + 1) * 2 + 3] = WORLD.h + 10;

  // Far texture: many tiny triangles along the ground edge, in two tones.
  const tex: Float32Array[] = [0, 1].map((k) => {
    const pts: number[] = [];
    let x = -4;
    while (x < WORLD.w + 4) {
      const gy = groundTop(x) + 1 + k * 3 + r.range(0, 4);
      const h = r.range(3, 9) + k * 2;
      const w = r.range(2, 4);
      pts.push(x, gy + 3, x + w * 0.5 + r.range(-1.5, 1.5), gy - h, x + w, gy + 3);
      x += r.range(1.5, 3.2);
    }
    return new Float32Array(pts);
  });

  // Broad, soft tonal patches across the meadow so the mid-ground is not one flat band.
  const patches: Array<[number, number, number, number, number]> = []; // x, y, rx, ry, sign
  for (let i = 0; i < 14; i++) {
    const y = r.range(560, 800);
    const k = (y - 540) / 360;
    patches.push([r.range(-100, WORLD.w + 100), y, r.range(120, 320) * (0.5 + k), r.range(10, 26) * (0.4 + k), r.chance(0.5) ? 1 : -1]);
  }

  return {
    name: 'ground',
    static: true,
    draw(ctx, f: Frame) {
      const c = f.colours;
      // Ground: a vertical gradient from far (atmospheric) to near.
      const g = ctx.createLinearGradient(0, 480, 0, WORLD.h);
      g.addColorStop(0, c.atmos('grassFar', 0.6));
      g.addColorStop(0.35, c.ramp('grassFar')[2]);
      g.addColorStop(1, c.ramp('ground')[1]);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(ground[0], ground[1]);
      for (let i = 2; i < ground.length; i += 2) ctx.lineTo(ground[i], ground[i + 1]);
      ctx.closePath();
      ctx.fill();
      // Tonal patches
      ctx.globalAlpha = 0.16;
      for (const [px, py, rx, ry, sign] of patches) {
        ctx.fillStyle = c.ramp('grassFar')[sign > 0 ? 3 : 1];
        ctx.beginPath();
        ctx.ellipse(px, py, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      // Far texture
      ctx.fillStyle = c.atmos('grassFar', 0.5);
      drawTex(ctx, tex[0]);
      ctx.fillStyle = c.atmos('grassNear', 0.45);
      drawTex(ctx, tex[1]);
    },
  };
}

function drawTex(ctx: CanvasRenderingContext2D, t: Float32Array) {
  ctx.beginPath();
  for (let i = 0; i < t.length; i += 6) {
    ctx.moveTo(t[i], t[i + 1]);
    ctx.lineTo(t[i + 2], t[i + 3]);
    ctx.lineTo(t[i + 4], t[i + 5]);
  }
  ctx.fill();
}
