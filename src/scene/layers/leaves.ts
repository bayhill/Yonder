import type { Layer, Frame } from '../layer';
import type { Rng } from '../../core/random';
import type { WindField, WindSample } from '../../wind/field';
import { motionScale } from '../../core/motion';
import { LAYOUT } from '../composition';

const ws: WindSample = { bend: 0, flutter: 0 };

/**
 * The birch turn, shed: for the few weeks the leaf scalar is falling, a handful of small gold
 * leaves let go of the near birch and drift down through the wind, tumbling slowly. Never many.
 */
export function createLeaves(rng: Rng, max = 36): Layer & { debug: () => { active: number; alive: number } } {
  const r = rng.fork('leaves');
  const x = new Float32Array(max), y = new Float32Array(max), px = new Float32Array(max), py = new Float32Array(max);
  const vx = new Float32Array(max), vy = new Float32Array(max), ph = new Float32Array(max), sz = new Float32Array(max), rot = new Float32Array(max);
  const alive = new Uint8Array(max);
  let spawn = 0, active = 0, t = 0;
  const crown = { x: LAYOUT.mainTreeX + 10, y: 260, r: 110 };
  function release(i: number) {
    x[i] = px[i] = crown.x + r.gauss() * crown.r * 0.5; y[i] = py[i] = crown.y + r.gauss() * crown.r * 0.45;
    vx[i] = 0; vy[i] = r.range(18, 30); ph[i] = r.range(0, 6.28); sz[i] = r.range(2.2, 3.4); rot[i] = r.range(0, 6.28);
    alive[i] = 1;
  }
  return {
    name: 'leaves',
    debug: () => ({ active, alive: alive.reduce((a, b) => a + b, 0) }),
    update(dt, _t, wind: WindField) {
      t += dt;
      const m = motionScale();
      // rate: a leaf every few seconds at the height of the fall, more in wind
      spawn += dt * active * (0.25 + wind.strength * 1.5);
      while (spawn > 1) { spawn -= 1; const i = alive.indexOf(0); if (i >= 0) release(i); }
      for (let i = 0; i < max; i++) {
        if (!alive[i]) continue;
        px[i] = x[i]; py[i] = y[i];
        wind.sample(x[i], y[i], ws);
        const flutter = Math.sin(t * 2.3 + ph[i]);
        vx[i] += ((ws.bend * 70 + flutter * 14) - vx[i]) * Math.min(1, dt * 2);
        x[i] += vx[i] * m * dt;
        y[i] += vy[i] * (0.7 + 0.3 * Math.cos(t * 1.7 + ph[i])) * m * dt;
        rot[i] += (1.2 + ws.flutter) * flutter * dt;
        if (y[i] > 700 + r.range(0, 60)) alive[i] = 0;
      }
    },
    draw(ctx, f: Frame) {
      active = f.season.fall * (1 - Math.min(1, f.weather.snow + f.weather.rain * 0.5));
      const c = f.colours.ramp('foliageBirch');
      const a = f.alpha;
      ctx.fillStyle = c[3];
      ctx.globalAlpha = 0.9;
      for (let i = 0; i < max; i++) {
        if (!alive[i]) continue;
        const lx = px[i] + (x[i] - px[i]) * a, ly = py[i] + (y[i] - py[i]) * a;
        const s = sz[i], cs = Math.cos(rot[i]), sn = Math.sin(rot[i]);
        ctx.beginPath();
        ctx.moveTo(lx + cs * s, ly + sn * s * 0.6);
        ctx.quadraticCurveTo(lx - sn * s * 0.7, ly + cs * s * 0.7, lx - cs * s, ly - sn * s * 0.6);
        ctx.quadraticCurveTo(lx + sn * s * 0.7, ly - cs * s * 0.7, lx + cs * s, ly + sn * s * 0.6);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },
  };
}
