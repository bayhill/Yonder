import type { Layer, Frame } from '../layer';
import { LAYOUT, WORLD } from '../composition';
import type { Rng } from '../../core/random';

/** A quiet star field: a few hundred points, fewer and fainter toward the horizon. */
export function createStars(rng: Rng): Layer {
  const r = rng.fork('stars');
  const nField = 260, nWay = 700, n = nField + nWay;
  const x = new Float32Array(n), y = new Float32Array(n), s = new Float32Array(n), a = new Float32Array(n);
  for (let i = 0; i < nField; i++) {
    x[i] = r.range(-20, WORLD.w + 20);
    const v = Math.pow(r.next(), 1.6);           // denser toward the zenith
    y[i] = v * (LAYOUT.horizonY - 40);
    s[i] = r.chance(0.12) ? r.range(1.6, 2.4) : r.range(0.8, 1.4);
    a[i] = r.range(0.35, 1) * (1 - v * 0.7);
  }
  // The Milky Way: a faint band of very small stars, sweeping from the upper left down toward
  // the south-east, only there on the darkest, clearest nights.
  for (let i = nField; i < n; i++) {
    const u = r.next();
    const cx = -100 + u * 1700, cy = 40 + u * 330 + Math.sin(u * 3) * 40;
    const spread = 55 + 35 * Math.sin(u * 5.1);
    x[i] = cx + r.gauss() * spread * 0.5; y[i] = cy + r.gauss() * spread;
    s[i] = r.range(0.6, 1.2);
    a[i] = r.range(0.2, 0.7) * (1 - Math.max(0, y[i] / LAYOUT.horizonY) * 0.8);
  }
  return {
    name: 'stars',
    static: true,
    draw(ctx, f: Frame) {
      if (f.light.stars < 0.01) return;
      ctx.fillStyle = f.colours.star;
      const way = Math.pow(f.light.stars, 3) * (1 - f.light.haze) * (1 - f.light.moon * 0.8);
      if (way > 0.02) {
        // the faint luminous band itself, under the dense small stars
        ctx.save();
        ctx.translate(750, 215); ctx.rotate(0.19);
        const g = ctx.createLinearGradient(0, -110, 0, 110);
        g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.5, f.colours.star); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.045 * way;
        ctx.fillStyle = g;
        ctx.fillRect(-1100, -110, 2200, 220);
        ctx.restore();
      }
      for (let i = 0; i < n; i++) {
        ctx.globalAlpha = a[i] * (i < nField ? f.light.stars : way);
        if (ctx.globalAlpha < 0.02) continue;
        ctx.fillRect(x[i] - s[i] / 2, y[i] - s[i] / 2, s[i], s[i]);
      }
      ctx.globalAlpha = 1;
    },
  };
}
