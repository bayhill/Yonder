import type { Layer, Frame } from '../layer';
import { skyPoint } from '../celestial';
import type { MoonState } from '../../astronomy/moon';

const pt = { x: 0, y: 0 };

/** The moon at its real position and phase. Small, matte, never a spotlight. */
export function createMoon(moon: MoonState): Layer {
  return {
    name: 'moon',
    static: true,
    draw(ctx, f: Frame) {
      const vis = f.light.moon;
      if (vis < 0.01 || moon.elevation < -1) return;
      skyPoint(moon.azimuth, moon.elevation, pt);
      const R = 17;
      // A soft halo: wide and faint in clear air, tighter and brighter through haze or thin cloud.
      const veil = Math.min(1, f.light.haze * 0.8 + f.light.cloud * 1.2);
      const haloR = R * (5 + 3 * (1 - veil));
      const halo = ctx.createRadialGradient(pt.x, pt.y, R * 0.8, pt.x, pt.y, haloR);
      halo.addColorStop(0, f.colours.moon.lit);
      halo.addColorStop(0.35, f.colours.moon.lit);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.globalAlpha = vis * (0.05 + 0.14 * veil) * moon.fraction;
      ctx.fillStyle = halo;
      ctx.fillRect(pt.x - haloR, pt.y - haloR, haloR * 2, haloR * 2);
      ctx.globalAlpha = vis * 0.95;
      ctx.fillStyle = f.colours.moon.lit;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, R, 0, Math.PI * 2); ctx.fill();

      // Shadow as one closed path: the dark limb, then back along the terminator ellipse.
      // In the northern sky a waxing moon is lit on the right, so its dark side is the left.
      const k = Math.cos(moon.phase * Math.PI * 2); // +1 new .. -1 full
      if (k > -0.995) {
        const darkLeft = moon.phase < 0.5;
        const rx = Math.max(0.01, Math.abs(k)) * R;
        ctx.fillStyle = f.colours.moon.dark;
        ctx.beginPath();
        // limb from top to bottom along the dark side
        ctx.arc(pt.x, pt.y, R, -Math.PI / 2, Math.PI / 2, darkLeft);
        // terminator from bottom to top: crescent (k>0) bulges into the lit side, gibbous into the dark side
        const throughLit = k > 0;
        const anticlockwise = darkLeft ? throughLit : !throughLit;
        ctx.ellipse(pt.x, pt.y, rx, R, 0, Math.PI / 2, -Math.PI / 2, anticlockwise);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
}
