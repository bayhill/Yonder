import type { Layer, Frame } from '../layer';
import { LAYOUT, WORLD } from '../composition';
import { smoothstep } from '../../core/easing';

/**
 * Cloud shadows on the meadow. The cloud field's own density buffer, flipped so overhead cloud
 * darkens the near ground and distant cloud the far ground, laid over the grass as a soft,
 * slowly travelling dimming. Strongest under a low, broken deck; nothing under a flat overcast.
 */
export function createCloudShadows(clouds: { canvas: HTMLCanvasElement; active: () => boolean }): Layer {
  const mask = document.createElement('canvas');
  mask.width = clouds.canvas.width; mask.height = clouds.canvas.height;
  const mctx = mask.getContext('2d')!;
  let frame = 0, colour = '';
  return {
    name: 'cloudShadows',
    draw(ctx, f: Frame) {
      const L = f.light;
      const broken = smoothstep(0.12, 0.4, L.cloud) * (1 - smoothstep(0.7, 0.95, L.cloud));
      const amount = broken * L.contrast * smoothstep(2, 12, L.sunElevation) * (1 - f.weather.snowCover * 0.5);
      if (amount < 0.01 || !clouds.active()) return;
      const c = f.colours.ramp('ground')[0];
      if (++frame % 3 === 0 || c !== colour) {
        colour = c;
        mctx.globalCompositeOperation = 'copy';
        mctx.drawImage(clouds.canvas, 0, 0);
        mctx.globalCompositeOperation = 'source-in';
        mctx.fillStyle = c;
        mctx.fillRect(0, 0, mask.width, mask.height);
      }
      const top = LAYOUT.horizonY - 6, bottom = WORLD.h + 20;
      ctx.save();
      ctx.globalAlpha = 0.2 * amount;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      // flip vertically: buffer row 0 (overhead) lands on the near ground, the horizon row on the far meadow
      ctx.translate(0, bottom);
      ctx.scale(1, -1);
      ctx.drawImage(mask, 0, 0, mask.width, mask.height, f.vp.left - 100, 0, f.vp.right - f.vp.left + 200, bottom - top);
      ctx.restore();
    },
  };
}
