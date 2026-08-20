import type { Layer, Frame } from '../layer';
import { LAYOUT } from '../composition';

/** Zenith → horizon gradient with a soft band just above the horizon. */
export const skyLayer: Layer = {
  name: 'sky',
    static: true,
  draw(ctx, f: Frame) {
    const { vp, colours } = f;
    const g = ctx.createLinearGradient(0, vp.top, 0, LAYOUT.horizonY + 8);
    g.addColorStop(0, colours.sky.zenith);
    g.addColorStop(0.55, colours.sky.mid);
    g.addColorStop(0.9, colours.sky.glow);
    g.addColorStop(1, colours.sky.horizon);
    ctx.fillStyle = g;
    ctx.fillRect(vp.left, vp.top, vp.right - vp.left, LAYOUT.horizonY + 10 - vp.top);
  },
};
