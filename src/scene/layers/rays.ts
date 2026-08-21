import type { Layer, Frame } from '../layer';
import { skyPoint } from '../celestial';
import { smoothstep } from '../../core/easing';
import type { Rng } from '../../core/random';
import { motionScale } from '../../core/motion';

const pt = { x: 0, y: 0 };

/**
 * Crepuscular rays: when a low sun sits behind a broken deck, a few faint wedges of light fan
 * out from it across the sky and the far hills, drifting very slowly. Subtle to the point of
 * doubt. Drawn after the clouds, before the meadow.
 */
export function createRays(rng: Rng, count = 7): Layer {
  const r = rng.fork('rays');
  const angle = new Float32Array(count), width = new Float32Array(count), strength = new Float32Array(count), phase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    angle[i] = (i / count - 0.5) * 1.9 + r.gauss() * 0.12;    // radians around straight-up from the sun... fanned downward too
    width[i] = r.range(0.05, 0.12);
    strength[i] = r.range(0.5, 1);
    phase[i] = r.range(0, 6.28);
  }
  let t = 0;
  return {
    name: 'rays',
    update(dt) { t += dt * motionScale(); },
    draw(ctx, f: Frame) {
      const L = f.light;
      const broken = smoothstep(0.3, 0.5, L.cloud) * (1 - smoothstep(0.75, 0.92, L.cloud));
      const low = smoothstep(-1, 3, L.sunElevation) * (1 - smoothstep(12, 24, L.sunElevation));
      const amount = broken * low * (1 - f.weather.fog) * (1 - smoothstep(0.5, 2, f.weather.rain + f.weather.snow));
      if (amount < 0.01) return;
      skyPoint(L.sunAzimuth, L.sunElevation, pt);
      const len = 1400;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = f.colours.sky.sunGlow;
      for (let i = 0; i < count; i++) {
        const a = angle[i] + Math.sin(t * 0.05 + phase[i]) * 0.03;       // a slow breathing of the fan
        const pulse = 0.6 + 0.4 * Math.sin(t * 0.11 + phase[i] * 1.7);
        const w = width[i];
        // each ray is a long thin triangle, faded along its length by a gradient
        const dx = Math.sin(a), dy = -Math.cos(a);
        const g = ctx.createLinearGradient(pt.x, pt.y, pt.x + dx * len, pt.y + dy * len);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(0.08, f.colours.sky.sunGlow);
        g.addColorStop(0.6, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.globalAlpha = 0.05 * amount * strength[i] * pulse;
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.x + Math.sin(a - w) * len, pt.y - Math.cos(a - w) * len);
        ctx.lineTo(pt.x + Math.sin(a + w) * len, pt.y - Math.cos(a + w) * len);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    },
  };
}
