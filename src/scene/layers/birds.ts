import type { Layer, Frame } from '../layer';
import { WORLD } from '../composition';
import type { Rng } from '../../core/random';
import type { WindField } from '../../wind/field';
import { motionScale } from '../../core/motion';
import { smoothstep } from '../../core/easing';

/**
 * Now and then — a few times an hour, in daylight, in fair weather, in the leafy half of the
 * year — a loose line of distant birds crosses the sky. Far, small, faint, slow. The viewer
 * who glances up at the right moment sees them; nobody is told to look.
 */
const MAX = 11;

export function createBirds(rng: Rng): Layer & { launch: () => void } {
  const r = rng.fork('birds');
  const ox = new Float32Array(MAX), oy = new Float32Array(MAX), ph = new Float32Array(MAX), size = new Float32Array(MAX);
  let n = 0, x = 0, y = 0, vx = 0, dir = 1, t = 0, life = 0, total = 1, nextAt = r.range(120, 360);
  let allowed = false, prevX = 0, prevT = 0;

  function launch() {
    n = r.int(4, MAX);
    dir = r.chance(0.5) ? 1 : -1;
    y = r.range(120, 330);
    x = dir > 0 ? -80 : WORLD.w + 80;
    vx = r.range(26, 40) * dir;
    total = (WORLD.w + 200) / Math.abs(vx);
    life = 0;
    // loose, slightly ragged echelon
    for (let i = 0; i < n; i++) {
      ox[i] = -i * r.range(9, 15) * dir + r.gauss() * 3;
      oy[i] = i * r.range(2.5, 4.5) * (r.chance(0.6) ? 1 : -1) + r.gauss() * 2.5;
      ph[i] = r.range(0, Math.PI * 2);
      size[i] = r.range(2.6, 3.6);
    }
  }

  return {
    name: 'birds',
    launch,
    update(dt, _t, wind: WindField) {
      const m = motionScale();
      t += dt;
      if (n === 0) {
        nextAt -= dt;
        if (nextAt <= 0) { nextAt = r.range(300, 840); if (allowed) launch(); }
        return;
      }
      prevX = x; prevT = life;
      x += (vx + wind.dirX * wind.strength * 8) * m * dt;
      life += dt;
      if (life > total + 5) n = 0;
    },
    draw(ctx, f: Frame) {
      const L = f.light, w = f.weather;
      allowed = L.sunElevation > -3 && w.rain < 0.8 && w.snow < 0.3 && f.season.leaf > 0.25 && w.fog < 0.5;
      if (n === 0) return;
      const fade = smoothstep(0, 4, life) * (1 - smoothstep(total - 4, total, life));
      if (fade <= 0) return;
      const cx = prevX + (x - prevX) * f.alpha;
      const tt = prevT + (life - prevT) * f.alpha;
      ctx.strokeStyle = f.colours.atmos('farTreeline', 0.55);
      ctx.lineWidth = 1.1;
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.55 * fade * (1 - L.haze * 0.5);
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        // slow wingbeats with glides: a few beats, then a pause
        const beat = Math.sin(tt * 7 + ph[i]);
        const glide = 0.5 + 0.5 * Math.sin(tt * 0.9 + ph[i] * 0.7);
        const a = (glide > 0.6 ? beat : 0.15) * 0.9;
        const s = size[i], bx = cx + ox[i], by = y + oy[i] + Math.sin(tt * 0.5 + ph[i]) * 1.5;
        ctx.moveTo(bx - s, by - a * s * 0.7);
        ctx.lineTo(bx, by);
        ctx.lineTo(bx + s, by - a * s * 0.7);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
  };
}
