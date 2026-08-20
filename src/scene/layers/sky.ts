import type { Layer, Frame } from '../layer';
import { LAYOUT } from '../composition';
import { skyPoint } from '../celestial';

const pt = { x: 0, y: 0 };

/** Zenith → horizon gradient, a soft band above the horizon, and a sun-side glow when the sun is low. */
export const skyLayer: Layer = {
  name: 'sky',
  static: true,
  draw(ctx, f: Frame) {
    const { vp, colours, light } = f;
    const bottom = LAYOUT.horizonY + 10;
    const g = ctx.createLinearGradient(0, vp.top, 0, LAYOUT.horizonY + 8);
    g.addColorStop(0, colours.sky.zenith);
    g.addColorStop(0.55, colours.sky.mid);
    g.addColorStop(0.9, colours.sky.glow);
    g.addColorStop(1, colours.sky.horizon);
    ctx.fillStyle = g;
    ctx.fillRect(vp.left, vp.top, vp.right - vp.left, bottom - vp.top);

    if (light.sunGlow > 0.01) {
      skyPoint(light.sunAzimuth, Math.max(-4, light.sunElevation), pt);
      const r = 640 + 420 * light.twilightGlow;
      const rg = ctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, r);
      rg.addColorStop(0, colours.sky.sunGlow);
      rg.addColorStop(0.25, colours.sky.sunGlow);
      rg.addColorStop(1, colours.sky.zenith);
      ctx.globalAlpha = light.sunGlow * 0.85;
      ctx.fillStyle = rg;
      ctx.fillRect(vp.left, vp.top, vp.right - vp.left, bottom - vp.top);
      ctx.globalAlpha = 1;
    }
  },
};
