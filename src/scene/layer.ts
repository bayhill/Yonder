import type { Resolved } from '../colour/resolve';
import type { Light } from '../colour/light';
import type { Viewport } from './composition';
import type { WindField } from '../wind/field';

/** Everything a layer needs to draw one frame. Built once per frame, never per layer. */
export interface Frame {
  colours: Resolved;
  light: Light;
  vp: Viewport;
  /** Scene time in seconds (simulation clock, for idle motion). */
  t: number;
  /** Interpolation factor between the previous and current sim step, 0..1. */
  alpha: number;
  dpr: number;
}

export interface Layer {
  readonly name: string;
  /** True when the layer only depends on colours/viewport (no per-frame motion); it is cached offscreen. */
  readonly static?: boolean;
  /** Fixed-timestep simulation hook. */
  update?(dt: number, t: number, wind: WindField): void;
  /** Called when the canvas size changes; rebuild any size-dependent caches here. */
  resize?(vp: Viewport, dpr: number): void;
  draw(ctx: CanvasRenderingContext2D, f: Frame): void;
}

export function fillPoly(ctx: CanvasRenderingContext2D, pts: Float32Array, ox = 0, oy = 0): void {
  ctx.moveTo(pts[0] + ox, pts[1] + oy);
  for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i] + ox, pts[i + 1] + oy);
  ctx.closePath();
}
