import type { Layer, Frame } from '../layer';
import { LAYOUT, WORLD } from '../composition';
import { smoothstep } from '../../core/easing';

/**
 * Low fog over the far meadow: a soft band of far-atmosphere colour that deepens with fog and
 * with heavy rain. The distance haze on far layers is handled by the colour resolver; this
 * adds the ground-hugging part, strongest just beyond the trees.
 */
export const fogLayer: Layer = {
  name: 'fog',
  draw(ctx, f: Frame) {
    const w = f.weather;
    const amount = Math.min(1, w.fog * 1.1 + smoothstep(0.5, 6, w.rain) * 0.35);
    if (amount < 0.01) return;
    const top = LAYOUT.horizonY - 150, bottom = 780;
    const g = ctx.createLinearGradient(0, top, 0, bottom);
    const c = f.colours.atmos('farAtmosphere', 1);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.38, c);
    g.addColorStop(0.55, c);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = amount * 0.55;
    ctx.fillStyle = g;
    ctx.fillRect(f.vp.left, top, f.vp.right - f.vp.left, bottom - top);
    ctx.globalAlpha = 1;
  },
};

/**
 * Heat shimmer on hot, clear, sunny afternoons: a faint wavering ghost of the far treeline.
 * Subtle to the point of doubt, by design.
 */
export function createShimmer(treeline: { drawPath: (ctx: CanvasRenderingContext2D, yOffset: (x: number) => number) => void }): Layer {
  let t = 0;
  return {
    name: 'shimmer',
    update(dt) { t += dt; },
    draw(ctx, f: Frame) {
      const w = f.weather;
      const heat = smoothstep(22, 30, w.temperature) * (1 - w.cloudCover) * smoothstep(20, 35, f.light.sunElevation) * (1 - Math.min(1, w.rain + w.snow));
      if (heat < 0.02) return;
      ctx.fillStyle = f.colours.atmos('farTreeline', 0.75);
      ctx.globalAlpha = 0.28 * heat;
      treeline.drawPath(ctx, (x) => Math.sin(t * 2.1 + x * 0.013) * 1.1 * heat + Math.sin(t * 3.7 + x * 0.031) * 0.6 * heat);
      ctx.globalAlpha = 1;
      void WORLD;
    },
  };
}
