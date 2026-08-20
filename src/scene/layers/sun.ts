import type { Layer, Frame } from '../layer';
import { skyPoint } from '../celestial';
import { smoothstep } from '../../core/easing';

const pt = { x: 0, y: 0 };

/**
 * The sun itself, only when it can be looked at: low, and softened by haze or thin cloud —
 * a pale disc in the Hasui manner. High in a clear sky it is too bright to draw and is left
 * to the glow. Drawn before the clouds so a deck can cover it.
 */
export const sunLayer: Layer = {
  name: 'sun',
  draw(ctx, f: Frame) {
    const L = f.light;
    const el = L.sunElevation;
    const low = (1 - smoothstep(6, 16, el)) * smoothstep(-0.8, 0.6, el);
    const veil = 0.55 + 0.45 * Math.min(1, L.haze * 1.2 + L.cloud * 0.8);   // haze makes it visible
    const vis = low * veil * (1 - smoothstep(0.55, 0.9, L.cloud));
    if (vis < 0.01) return;
    skyPoint(L.sunAzimuth, el, pt);
    const R = 15;
    const halo = ctx.createRadialGradient(pt.x, pt.y, R * 0.6, pt.x, pt.y, R * 4.5);
    halo.addColorStop(0, f.colours.sky.sunGlow);
    halo.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = vis * 0.35;
    ctx.fillStyle = halo;
    ctx.fillRect(pt.x - R * 4.5, pt.y - R * 4.5, R * 9, R * 9);
    ctx.globalAlpha = vis * 0.8;
    ctx.fillStyle = f.colours.sunDisc;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, R, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  },
};
