import type { Layer, Frame } from '../layer';
import type { Rng } from '../../core/random';
import { LAYOUT, WORLD } from '../composition';
import { smoothstep } from '../../core/easing';

/**
 * Sheet lightning. Under a thunderstorm deck, every half minute or so the cloud base brightens
 * somewhere — a soft, slow bloom that is gone within half a second. Never a bolt, never white,
 * never the whole sky: the viewer sees the storm is there without being startled by it.
 */
export function createLightning(rng: Rng): Layer {
  const r = rng.fork('lightning');
  let next = r.range(8, 20), level = 0, x = 800, y = 300, radius = 500, thunder = 0, cloud = 0;
  return {
    name: 'lightning',
    update(dt) {
      const storm = thunder * smoothstep(0.55, 0.8, cloud);
      if (storm > 0.05) {
        next -= dt * (0.6 + storm);
        if (next <= 0) {
          next = r.range(18, 55);
          x = r.range(-100, WORLD.w + 100); y = r.range(LAYOUT.horizonY - 320, LAYOUT.horizonY - 60);
          radius = r.range(380, 720);
          level = r.range(0.6, 1) * (r.chance(0.3) ? 1.4 : 1);   // the occasional closer one
        }
      }
      // fast rise, slow fall — but nothing faster than the eye reads as a glow
      level = Math.max(0, level - dt * (level > 0.5 ? 1.9 : 1.3));
    },
    draw(ctx, f: Frame) {
      thunder = f.weather.thunder; cloud = f.weather.cloudCover;
      if (level < 0.01) return;
      const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
      g.addColorStop(0, f.colours.cloud.lit);
      g.addColorStop(0.5, f.colours.cloud.lit);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.22 * Math.min(1, level) * (0.5 + 0.5 * f.light.skyDark);
      ctx.fillStyle = g;
      ctx.fillRect(f.vp.left, f.vp.top, f.vp.right - f.vp.left, LAYOUT.horizonY + 20 - f.vp.top);
      ctx.restore();
    },
  };
}
