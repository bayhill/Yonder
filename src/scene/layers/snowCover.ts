import type { Layer, Frame } from '../layer';
import { WORLD, groundTop } from '../composition';
import type { Rng } from '../../core/random';
import { smoothstep } from '../../core/easing';

/**
 * Snow on the ground: a white blanket rising out of the meadow with a soft, uneven edge.
 * Drawn in two sheets (far meadow, near meadow) so grass bands in between poke through.
 * The soft edge is made by stacking three copies of the same wavy outline, each a little
 * higher and fainter — no straight lines anywhere. Static-cached; re-rendered as cover changes.
 */
export function createSnowSheet(rng: Rng, band: 'far' | 'near'): Layer {
  const r = rng.fork(`snowsheet:${band}`);
  const n = 72;
  const bump = new Float32Array(n + 1), bump2 = new Float32Array(n + 1);
  for (let i = 0; i <= n; i++) { bump[i] = r.gauss(); bump2[i] = r.gauss(); }
  const far = band === 'far';

  function outline(ctx: CanvasRenderingContext2D, cover: number, lift: number, wobble: number) {
    const rise = far ? 2 + 30 * smoothstep(0, 1, cover) : 0;
    ctx.beginPath();
    for (let i = 0; i <= n; i++) {
      const x = (i / n) * (WORLD.w + 40) - 20;
      const base = far ? groundTop(x) + 6 : 772 + 50 * (1 - Math.min(1, cover) * 0.6);
      const y = base - rise - lift + (bump[i] * (far ? 3 : 9) + bump2[i] * wobble) * Math.min(1, cover);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.lineTo(WORLD.w + 20, WORLD.h + 20); ctx.lineTo(-20, WORLD.h + 20);
    ctx.closePath();
    ctx.fill();
  }

  return {
    name: `snowSheet:${band}`,
    static: true,
    draw(ctx, f: Frame) {
      const cover = f.weather.snowCover;
      if (cover < 0.01) return;
      const c = f.colours;
      const alpha = far ? smoothstep(0.02, 0.35, cover) : smoothstep(0.15, 0.7, cover);
      ctx.fillStyle = far ? c.atmos('snow', 0.35) : c.ramp('snow')[2];
      const edge = far ? 6 : 16;
      ctx.globalAlpha = alpha * 0.22; outline(ctx, cover, edge * 2, 6);
      ctx.globalAlpha = alpha * 0.35; outline(ctx, cover, edge, 4);
      ctx.globalAlpha = alpha;        outline(ctx, cover, 0, 0);
      ctx.globalAlpha = 1;
    },
  };
}
