import { formatHex } from 'culori';
import type { Oklch } from './palettes';

/** Hue-aware OKLCH interpolation (shortest arc). Allocation-free when `out` is supplied. */
export function mix(a: Oklch, b: Oklch, t: number, out: Oklch = { l: 0, c: 0, h: 0 }): Oklch {
  let dh = ((b.h - a.h + 540) % 360) - 180;
  if (dh < -180) dh += 360;
  // Near-achromatic colours have meaningless hue; weight the hue toward the chromatic one.
  const wa = a.c, wb = b.c, ws = wa + wb;
  const ht = ws > 1e-6 ? (wb * t) / ((1 - t) * wa + t * wb || 1) : t;
  out.l = a.l + (b.l - a.l) * t;
  out.c = a.c + (b.c - a.c) * t;
  out.h = (a.h + dh * ht + 360) % 360;
  return out;
}

export function toHex(col: Oklch): string {
  return formatHex({ mode: 'oklch', l: col.l, c: col.c, h: col.h }) ?? '#000000';
}

export function adjust(col: Oklch, dl: number, dc = 0, dh = 0, out: Oklch = { l: 0, c: 0, h: 0 }): Oklch {
  out.l = Math.min(1, Math.max(0, col.l + dl));
  out.c = Math.max(0, col.c + dc);
  out.h = (col.h + dh + 360) % 360;
  return out;
}
