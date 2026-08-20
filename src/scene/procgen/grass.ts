import type { Rng } from '../../core/random';

/**
 * Grass is stored as flat typed arrays so the per-frame loop allocates nothing.
 * Each blade: base (x, y), height, width, lean (resting tip offset), tone index, and a
 * phase used later for wind sampling.
 */
export interface GrassBand {
  count: number;
  x: Float32Array; y: Float32Array;
  h: Float32Array; w: Float32Array;
  lean: Float32Array;
  tone: Uint8Array;       // 0..4 index into a colour ramp
  phase: Float32Array;
  /** Current tip offset (x, y) after wind; initialised to the resting lean. */
  tipX: Float32Array; tipY: Float32Array;
  /** Previous-step tip offset, for render interpolation. */
  prevX: Float32Array; prevY: Float32Array;
  /** Spring velocity of the tip (x only; y follows the arc). */
  vel: Float32Array;
  /** Per-blade spring stiffness (rad/s). Shorter, stiffer blades respond faster. */
  omega: Float32Array;
}

export interface BandSpec {
  count: number;
  x0: number; x1: number;
  /** y range of bases; callers usually pass the ground profile for y0. */
  y0: (x: number) => number; y1: (x: number) => number;
  hMin: number; hMax: number;
  wMin: number; wMax: number;
  /** Taller toward the bottom (perspective): 0 none .. 1 strong. */
  perspective: number;
  leanBias: number; // resting lean, in units of height (e.g. 0.15 = tips drift right)
  /** 0 = uniform scatter, 1 = strongly clumped into tussocks. */
  clump?: number;
}

export function generateBand(spec: BandSpec, rng: Rng): GrassBand {
  const n = spec.count;
  const band: GrassBand = {
    count: n,
    x: new Float32Array(n), y: new Float32Array(n), h: new Float32Array(n), w: new Float32Array(n),
    lean: new Float32Array(n), tone: new Uint8Array(n), phase: new Float32Array(n),
    tipX: new Float32Array(n), tipY: new Float32Array(n),
    prevX: new Float32Array(n), prevY: new Float32Array(n), vel: new Float32Array(n), omega: new Float32Array(n),
  };
  // Generate, then sort by y so nearer blades draw over farther ones.
  const order: number[] = [];
  const clump = spec.clump ?? 0;
  const nClumps = Math.max(1, Math.round(n / 6));
  const clumpX = new Float32Array(nClumps), clumpV = new Float32Array(nClumps);
  for (let k = 0; k < nClumps; k++) { clumpX[k] = rng.range(spec.x0, spec.x1); clumpV[k] = rng.next(); }
  for (let i = 0; i < n; i++) {
    let x = rng.range(spec.x0, spec.x1);
    let v = rng.next();
    if (rng.next() < clump) {
      const k = rng.int(0, nClumps - 1);
      x = clumpX[k] + rng.gauss() * 18;
      v = Math.min(1, Math.max(0, clumpV[k] + rng.gauss() * 0.08));
    }
    const ya = spec.y0(x), yb = spec.y1(x);
    const y = ya + (yb - ya) * v;
    const persp = 1 + spec.perspective * v;
    const h = rng.range(spec.hMin, spec.hMax) * persp;
    band.x[i] = x; band.y[i] = y; band.h[i] = h;
    band.w[i] = rng.range(spec.wMin, spec.wMax) * persp;
    band.lean[i] = (spec.leanBias + rng.gauss() * 0.22) * h;
    const tone = Math.round(2 + rng.gauss() * 0.8 + (v - 0.5) * -0.8);
    band.tone[i] = Math.max(0, Math.min(4, tone));
    band.phase[i] = rng.range(0, Math.PI * 2);
    order.push(i);
  }
  order.sort((a, b) => band.y[a] - band.y[b]);
  const sorted: GrassBand = { ...band,
    x: new Float32Array(n), y: new Float32Array(n), h: new Float32Array(n), w: new Float32Array(n),
    lean: new Float32Array(n), tone: new Uint8Array(n), phase: new Float32Array(n),
    tipX: new Float32Array(n), tipY: new Float32Array(n),
    prevX: new Float32Array(n), prevY: new Float32Array(n), vel: new Float32Array(n), omega: new Float32Array(n) };
  order.forEach((src, dst) => {
    sorted.x[dst] = band.x[src]; sorted.y[dst] = band.y[src]; sorted.h[dst] = band.h[src]; sorted.w[dst] = band.w[src];
    sorted.lean[dst] = band.lean[src]; sorted.tone[dst] = band.tone[src]; sorted.phase[dst] = band.phase[src];
    sorted.tipX[dst] = sorted.prevX[dst] = band.lean[src]; sorted.tipY[dst] = sorted.prevY[dst] = -band.h[src];
    sorted.omega[dst] = 5.5 + 2.5 * (spec.hMax - band.h[src]) / (spec.hMax - spec.hMin + 1e-6) + rng.range(-0.6, 0.6);
  });
  return sorted;
}

/**
 * Advances every blade's tip toward the wind-bent target with a critically damped spring.
 * `bendAt(i)` gives the field's signed bend for blade i; `amp` scales it to a fraction of height.
 */
export function stepBand(band: GrassBand, dt: number, bend: Float32Array, amp: number): void {
  const n = band.count;
  for (let i = 0; i < n; i++) {
    const h = band.h[i];
    band.prevX[i] = band.tipX[i]; band.prevY[i] = band.tipY[i];
    const target = band.lean[i] + h * amp * bend[i];
    // exact critically damped step (see core/smoothing)
    const w = band.omega[i];
    const x0 = band.tipX[i] - target, v0 = band.vel[i];
    const e = Math.exp(-w * dt);
    const c2 = v0 + w * x0;
    const x = (x0 + c2 * dt) * e;
    band.vel[i] = (c2 - w * (x0 + c2 * dt)) * e;
    const tx = target + x;
    band.tipX[i] = tx;
    // The tip follows an arc: a bent blade is a little shorter on screen.
    const r = tx / h;
    band.tipY[i] = -h * (1 - 0.16 * r * r);
  }
}

/** Draws one blade as a tapered curved shape. Caller sets fillStyle and calls beginPath/fill. */
export function bladePath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, tipX: number, tipY: number): void {
  // Control point: a little over halfway up, biased toward the base so the blade bends at the top.
  const cx = x + tipX * 0.28, cy = y + tipY * 0.58;
  const hw = w * 0.5;
  ctx.moveTo(x - hw, y);
  ctx.quadraticCurveTo(cx - hw * 0.5, cy, x + tipX, y + tipY);
  ctx.quadraticCurveTo(cx + hw * 0.5, cy, x + hw, y);
}
