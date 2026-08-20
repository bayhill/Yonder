import { createNoise3D } from 'simplex-noise';
import type { Rng } from '../core/random';
import { clamp01 } from '../core/easing';

/**
 * Wind as a field, not a number. Sampled in world space and time:
 *  - a slow base flow scaled by wind speed and biased by direction,
 *  - turbulence: mid-frequency noise so neighbours never move in lockstep,
 *  - gusts: low-frequency noise advected downwind and toward the viewer, so a gust
 *    visibly reaches the far trees first and the front grass about a second later,
 *  - idle drift: a faint residual so nothing is ever perfectly still.
 * `sample` returns the signed screen-x bend in roughly -1..1 (positive = blown to the right).
 */
export interface WindSample { bend: number; flutter: number }

export class WindField {
  private noise: (x: number, y: number, z: number) => number;
  private t = 0;
  /** Normalised mean strength 0..1 (1 ≈ 15+ m/s). */
  strength = 0;
  /** Gust headroom above the mean, 0..1. */
  gustiness = 0;
  /** Screen-x direction of the flow, -1 (to the left) .. +1 (to the right). */
  dirX = 1;
  /** Travel offsets for the gust field, in world px. */
  private gx = 0;
  private gy = 0;
  private reduceMotion = 1;

  constructor(rng: Rng) {
    this.noise = createNoise3D(rng.fork('wind').next);
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) this.reduceMotion = 0.35;
  }

  /** Meteorological input: speed and gust in m/s, direction the wind blows FROM in compass degrees. */
  configure(speed: number, directionDeg: number, gust = speed) {
    this.strength = 1 - Math.exp(-Math.max(0, speed) / 7);
    this.gustiness = clamp01((gust - speed) / 10);
    // Camera faces south: wind from the east blows toward the west, which is screen right.
    const sx = Math.sin(directionDeg * (Math.PI / 180));
    // Keep a direction even when the wind is nearly along the view axis.
    this.dirX = Math.abs(sx) < 0.25 ? Math.sign(sx || 1) * 0.25 : sx;
  }

  update(dt: number) {
    this.t += dt;
    // Gust fronts travel faster in stronger wind; they also advance toward the viewer (+y).
    const v = 260 + 900 * this.strength;
    this.gx += this.dirX * v * dt;
    this.gy += (120 + 260 * this.strength) * dt;
  }

  sample(x: number, y: number, out: WindSample): WindSample {
    const s = this.strength;
    const t = this.t;
    const gust = this.noise((x - this.gx) * 0.0011, (y - this.gy) * 0.0022, t * 0.05);
    const gustUp = Math.max(0, gust + 0.15);
    const turb = this.noise(x * 0.0035, y * 0.006, t * 0.55);
    const idle = this.noise(x * 0.002 + 40, y * 0.003, t * 0.18) * 0.035;
    const flow = s * (0.5 + 0.7 * gustUp * (0.6 + 0.9 * this.gustiness)) + s * turb * 0.3;
    out.bend = (this.dirX * flow + idle + turb * 0.02) * this.reduceMotion;
    // Flutter: fast small-scale agitation, only meaningful in stronger wind.
    out.flutter = s * s * (0.5 + 0.5 * gustUp) * this.reduceMotion;
    return out;
  }
}
