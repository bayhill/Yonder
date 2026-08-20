import type { Layer, Frame } from '../layer';
import { WORLD } from '../composition';
import type { Rng } from '../../core/random';
import type { WindField, WindSample } from '../../wind/field';
import { smoothstep } from '../../core/easing';
import { motionScale } from '../../core/motion';

const ws: WindSample = { bend: 0, flutter: 0 };

/**
 * Rain: fine diagonal streaks. Intensity first shows as haze (see light model); streaks
 * ramp in later and stay sparse. Angle follows the wind field.
 */
export function createRain(rng: Rng, max = 420): Layer {
  const r = rng.fork('rain');
  const x = new Float32Array(max), y = new Float32Array(max), len = new Float32Array(max), spd = new Float32Array(max), depth = new Float32Array(max);
  for (let i = 0; i < max; i++) {
    x[i] = r.range(-200, WORLD.w + 200); y[i] = r.range(-100, WORLD.h);
    depth[i] = r.next();
    len[i] = 22 + depth[i] * 40; spd[i] = 900 + depth[i] * 700;
  }
  let dx = 0, active = 0;
  return {
    name: 'rain',
    update(dt, _t, wind: WindField) {
      wind.sample(WORLD.w / 2, 400, ws);
      dx = ws.bend * 380; // horizontal drift per second from the wind
      const m = motionScale();
      for (let i = 0; i < active; i++) {
        y[i] += spd[i] * m * dt; x[i] += dx * m * dt;
        if (y[i] > WORLD.h + 40) { y[i] = -60 - r.range(0, 80); x[i] = r.range(-200, WORLD.w + 200); }
        if (x[i] > WORLD.w + 220) x[i] -= WORLD.w + 440; else if (x[i] < -220) x[i] += WORLD.w + 440;
      }
    },
    draw(ctx, f: Frame) {
      const rain = f.weather.rain;
      if (rain < 0.02) { active = 0; return; }
      // mm/h → streak count: 0.3 mm/h ≈ 60, 2 mm/h ≈ 220, 6 mm/h ≈ 420
      active = Math.round(max * (1 - Math.exp(-rain / 2.8)));
      const alpha = 0.10 + 0.22 * (1 - Math.exp(-rain / 3));
      ctx.strokeStyle = f.colours.rain;
      ctx.lineCap = 'round';
      // two passes: far (thin, faint) and near (a touch bolder)
      for (let pass = 0; pass < 2; pass++) {
        ctx.globalAlpha = alpha * (pass ? 1 : 0.6);
        ctx.lineWidth = pass ? 1.6 : 1.0;
        ctx.beginPath();
        for (let i = 0; i < active; i++) {
          if ((depth[i] > 0.5) !== !!pass) continue;
          const l = len[i], vx = dx, vy = spd[i];
          const k = l / Math.hypot(vx, vy);
          ctx.moveTo(x[i], y[i]);
          ctx.lineTo(x[i] - vx * k, y[i] - vy * k);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },
  };
}

/**
 * Snow: slow, drifting, wind-affected flakes of varied size at a given depth band.
 * Warmer than ~0.5 °C the flakes get smaller and faster (sleet), blending toward rain.
 */
export function createSnow(rng: Rng, band: 'far' | 'near', max = 360): Layer {
  const r = rng.fork(`snow:${band}`);
  const x = new Float32Array(max), y = new Float32Array(max), s = new Float32Array(max), ph = new Float32Array(max), vy = new Float32Array(max);
  const near = band === 'near';
  for (let i = 0; i < max; i++) {
    x[i] = r.range(-100, WORLD.w + 100); y[i] = r.range(-50, WORLD.h);
    s[i] = near ? r.range(1.6, 3.6) : r.range(0.9, 2.0);
    ph[i] = r.range(0, Math.PI * 2);
    vy[i] = (near ? 34 : 22) * r.range(0.75, 1.3);
  }
  let active = 0, t = 0, temp = 0;
  return {
    name: `snow:${band}`,
    update(dt, _t, wind: WindField) {
      t += dt;
      const sleet = smoothstep(0.5, 3, temp);
      const m = motionScale();
      for (let i = 0; i < active; i++) {
        wind.sample(x[i], y[i], ws);
        const fall = vy[i] * (1 + sleet * 4) * (near ? 1 : 0.8) * m;
        y[i] += fall * dt;
        x[i] += (ws.bend * (near ? 160 : 90) + Math.sin(t * 1.3 + ph[i]) * 9 * (1 - sleet)) * dt;
        if (y[i] > WORLD.h + 20) { y[i] = -30; x[i] = r.range(-100, WORLD.w + 100); }
        if (x[i] > WORLD.w + 120) x[i] -= WORLD.w + 240; else if (x[i] < -120) x[i] += WORLD.w + 240;
      }
    },
    draw(ctx, f: Frame) {
      temp = f.weather.temperature;
      const snow = f.weather.snow;
      if (snow < 0.02) { active = 0; return; }
      active = Math.round(max * (1 - Math.exp(-snow / 2.2)));
      const sleet = smoothstep(0.5, 3, temp);
      ctx.fillStyle = f.colours.snowFlake;
      ctx.globalAlpha = (near ? 0.85 : 0.55) * (1 - sleet * 0.5);
      ctx.beginPath();
      for (let i = 0; i < active; i++) {
        const rad = s[i] * (1 - sleet * 0.5);
        ctx.moveTo(x[i] + rad, y[i]);
        ctx.arc(x[i], y[i], rad, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.globalAlpha = 1;
    },
  };
}
