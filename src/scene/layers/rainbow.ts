import type { Layer, Frame } from '../layer';
import { skyPoint } from '../celestial';
import { smoothstep } from '../../core/easing';
import { LAYOUT } from '../composition';

const pt = { x: 0, y: 0 };
// Outer to inner, as the primary bow shows them; the secondary reverses the order.
const BANDS = ['#c8423a', '#d98a3a', '#cdbd4a', '#6fa85c', '#4d8fb8', '#5a63a8', '#7a5a9a'];
const R1 = 42, R2 = 51, WIDTH = 2.0;           // degrees
const PX_AZ = 7.47, PX_EL = 11;                // the sky mapping's pixels per degree (see celestial.ts)

/**
 * A rainbow where one would really be: centred on the anti-solar point, 42° across for the
 * primary, a fainter reversed secondary at 51°, only while rain falls into a sky the sun can
 * get through and the sun is low behind the viewer. Rare, and kept translucent.
 */
export const rainbowLayer: Layer = {
  name: 'rainbow',
  draw(ctx, f: Frame) {
    const L = f.light, w = f.weather;
    const el = L.sunElevation;
    const sun = smoothstep(0.5, 4, el) * (1 - smoothstep(36, 42, el)) * (1 - smoothstep(0.45, 0.8, L.cloud));
    const rain = smoothstep(0.15, 0.8, w.rain) * (1 - smoothstep(3, 6, w.rain));
    const amount = sun * rain * (1 - w.fog);
    if (amount < 0.01) return;
    skyPoint((L.sunAzimuth + 180) % 360, -el, pt);
    // only the part above the horizon is visible; the ground layers cover the rest anyway
    ctx.save();
    ctx.beginPath(); ctx.rect(f.vp.left, f.vp.top, f.vp.right - f.vp.left, LAYOUT.horizonY + 30 - f.vp.top); ctx.clip();
    const band = WIDTH / BANDS.length;
    ctx.lineWidth = band * PX_EL * 1.15;
    for (let pass = 0; pass < 2; pass++) {
      const R = pass ? R2 : R1;
      ctx.globalAlpha = amount * (pass ? 0.045 : 0.14);
      for (let i = 0; i < BANDS.length; i++) {
        const k = pass ? BANDS.length - 1 - i : i;
        const deg = R + (BANDS.length / 2 - i - 0.5) * band;
        ctx.strokeStyle = BANDS[k];
        ctx.beginPath();
        ctx.ellipse(pt.x, pt.y, deg * PX_AZ, deg * PX_EL, 0, Math.PI, 2 * Math.PI);
        ctx.stroke();
      }
    }
    // Alexander's dark band between the bows, and the brighter sky inside the primary
    ctx.globalAlpha = amount * 0.05;
    ctx.fillStyle = f.colours.sky.horizon;
    ctx.beginPath(); ctx.ellipse(pt.x, pt.y, (R1 - WIDTH / 2) * PX_AZ, (R1 - WIDTH / 2) * PX_EL, 0, Math.PI, 2 * Math.PI); ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  },
};
