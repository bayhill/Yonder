import { formatHex } from 'culori';
import type { Oklch } from './palettes';

/**
 * Interpolation in OKLab (a/b rather than hue): passes through grey instead of around the hue
 * wheel, which is how dimming, haze and night actually behave. Allocation-free with `out`.
 */
export function mix(a: Oklch, b: Oklch, t: number, out: Oklch = { l: 0, c: 0, h: 0 }): Oklch {
  const ra = a.h * D2R, rb = b.h * D2R;
  const aa = a.c * Math.cos(ra), ab = a.c * Math.sin(ra);
  const ba = b.c * Math.cos(rb), bb = b.c * Math.sin(rb);
  const la = aa + (ba - aa) * t, lb = ab + (bb - ab) * t;
  out.l = a.l + (b.l - a.l) * t;
  out.c = Math.hypot(la, lb);
  out.h = out.c < 1e-6 ? (t < 0.5 ? a.h : b.h) : ((Math.atan2(lb, la) / D2R) + 360) % 360;
  return out;
}
const D2R = Math.PI / 180;

export function toHex(col: Oklch): string {
  return formatHex({ mode: 'oklch', l: col.l, c: col.c, h: col.h }) ?? '#000000';
}

export function adjust(col: Oklch, dl: number, dc = 0, dh = 0, out: Oklch = { l: 0, c: 0, h: 0 }): Oklch {
  out.l = Math.min(1, Math.max(0, col.l + dl));
  out.c = Math.max(0, col.c + dc);
  out.h = (col.h + dh + 360) % 360;
  return out;
}
