/**
 * Smoothing primitives. Weather data arrives discretely; the scene never may.
 * Everything here is monotone toward its target — no overshoot, ever.
 */

/** Frame-rate independent exponential approach. `tau` is the time constant in seconds. */
export function approach(current: number, target: number, tau: number, dt: number): number {
  if (tau <= 0) return target;
  const k = 1 - Math.exp(-dt / tau);
  return current + (target - current) * k;
}

/** Shortest-arc version for angles in degrees. */
export function approachAngle(current: number, target: number, tau: number, dt: number): number {
  let d = ((target - current + 540) % 360) - 180;
  if (d < -180) d += 360;
  return (approach(0, d, tau, dt) + current + 360) % 360;
}

/** Critically damped spring: returns to target as fast as possible without crossing it. */
export class Spring {
  value: number;
  velocity = 0;
  constructor(value = 0, public omega = 8) {
    this.value = value;
  }
  step(target: number, dt: number): number {
    // Exact solution of the critically damped oscillator over dt (no numerical overshoot).
    const w = this.omega;
    const x0 = this.value - target;
    const v0 = this.velocity;
    const e = Math.exp(-w * dt);
    const c2 = v0 + w * x0;
    const x = (x0 + c2 * dt) * e;
    this.velocity = (c2 - w * (x0 + c2 * dt)) * e;
    this.value = target + x;
    return this.value;
  }
}

/**
 * Driven damped oscillator for things that really do swing — tree stems in wind.
 * `freqHz` is the natural frequency, `zeta` the damping ratio (< 1 lets it swing through
 * gusts; 1 would be critical). Semi-implicit Euler is plenty stable at 60 Hz for these rates.
 */
export class Oscillator {
  value: number;
  velocity = 0;
  constructor(value = 0, public freqHz = 0.4, public zeta = 0.35) {
    this.value = value;
  }
  step(target: number, dt: number): number {
    const w = this.freqHz * Math.PI * 2;
    const acc = w * w * (target - this.value) - 2 * this.zeta * w * this.velocity;
    this.velocity += acc * dt;
    this.value += this.velocity * dt;
    return this.value;
  }
}
