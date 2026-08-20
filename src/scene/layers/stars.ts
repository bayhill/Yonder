import type { Layer, Frame } from '../layer';
import { LAYOUT, WORLD } from '../composition';
import type { Rng } from '../../core/random';

/** A quiet star field: a few hundred points, fewer and fainter toward the horizon. */
export function createStars(rng: Rng): Layer {
  const r = rng.fork('stars');
  const n = 260;
  const x = new Float32Array(n), y = new Float32Array(n), s = new Float32Array(n), a = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    x[i] = r.range(-20, WORLD.w + 20);
    const v = Math.pow(r.next(), 1.6);           // denser toward the zenith
    y[i] = v * (LAYOUT.horizonY - 40);
    s[i] = r.chance(0.12) ? r.range(1.6, 2.4) : r.range(0.8, 1.4);
    a[i] = r.range(0.35, 1) * (1 - v * 0.7);
  }
  return {
    name: 'stars',
    static: true,
    draw(ctx, f: Frame) {
      if (f.light.stars < 0.01) return;
      ctx.fillStyle = f.colours.star;
      for (let i = 0; i < n; i++) {
        ctx.globalAlpha = a[i] * f.light.stars;
        ctx.fillRect(x[i] - s[i] / 2, y[i] - s[i] / 2, s[i], s[i]);
      }
      ctx.globalAlpha = 1;
    },
  };
}
