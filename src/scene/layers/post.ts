import type { Layer, Frame } from '../layer';
import type { Rng } from '../../core/random';

/**
 * One old fence post, a little way into the meadow. The only made thing in the scene; it exists
 * to give the grass a scale. Leaning, weathered, half-sunk in the grass in front of it.
 */
export function createPost(rng: Rng, x = 515, y = 714, h = 66): Layer {
  const r = rng.fork('post');
  const lean = r.range(-0.16, -0.08);
  const w = h * 0.22;
  const ax = Math.sin(lean), ay = -Math.cos(lean);   // along the post (up)
  const cx = Math.cos(lean), cy = Math.sin(lean);    // across the post (right)
  /** Local coords: s up the post (0 base .. 1 top), u across (-0.5 .. 0.5). */
  const P = (s: number, u: number): [number, number] => [x + ax * s * h + cx * u * w, y + ay * s * h + cy * u * w];
  const poly = (...pts: Array<[number, number]>) => new Float32Array(pts.flat());
  const topL = 1 + r.range(0, 0.03), topR = 1 - r.range(0, 0.04);
  const body = poly(P(0, -0.5), P(topL, -0.42), P(1.01, -0.05), P(topR, 0.42), P(0, 0.5));
  const lit = poly(P(0.02, -0.5), P(topL, -0.42), P(topL - 0.02, -0.18), P(0.02, -0.22));
  const lichen = poly(P(0.88, -0.3), P(0.93, 0.35), P(0.7, 0.3), P(0.66, -0.15));
  const cap = poly(P(topL - 0.01, -0.46), P(topL + 0.05, -0.3), P(1.08, 0.0), P(topR + 0.05, 0.3), P(topR - 0.01, 0.46), P(1.0, 0.1));
  const fill = (ctx: CanvasRenderingContext2D, p: Float32Array) => {
    ctx.beginPath(); ctx.moveTo(p[0], p[1]);
    for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]);
    ctx.closePath(); ctx.fill();
  };
  return {
    name: 'post',
    static: true,
    draw(ctx, f: Frame) {
      const c = f.colours;
      const cover = Math.min(1, f.weather.snowCover);
      ctx.fillStyle = c.atmos('trunk', 0.25);
      fill(ctx, body);
      // The side facing the light is a shade paler; under flat light the post is one grey.
      ctx.globalAlpha = 0.25 + 0.5 * f.light.contrast * (f.light.dirX < 0 ? 1 : 0.45);
      ctx.fillStyle = c.ramp('trunk')[4];
      fill(ctx, lit);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = c.ramp('bark')[1];
      fill(ctx, lichen);
      ctx.globalAlpha = 1;
      if (cover > 0.1) {
        ctx.fillStyle = c.ramp('snow')[2];
        ctx.globalAlpha = Math.min(1, (cover - 0.1) * 2);
        fill(ctx, cap);
        ctx.globalAlpha = 1;
      }
    },
  };
}
