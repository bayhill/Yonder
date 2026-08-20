/**
 * The one fixed composition. Everything is laid out in a 1600×900 world.
 * The viewport covers the world (never letterboxes) and, when cropping, anchors on the
 * main tree and the foreground grass — portrait mobile crops toward them rather than squashing.
 */
export const WORLD = { w: 1600, h: 900 } as const;

export const LAYOUT = {
  horizonY: 548,          // base horizon height at the left edge
  mainTreeX: 1010,
  /** Centre of the near group (birch + pine); portrait crops keep both. */
  groupX: 1085,
  anchorY: 600,           // vertical anchor when the viewport is wider than 16:9
} as const;

/** Ground profile: a gentle rise to one side, slightly off centre. Returns world y for world x. */
export function groundTop(x: number): number {
  const t = x / WORLD.w;
  // Broad rise peaking right of centre, plus a smaller swell to the left for rhythm.
  const rise = 44 * bump(t, 0.68, 0.42) + 10 * bump(t, 0.22, 0.25);
  return LAYOUT.horizonY - rise;
}
function bump(t: number, centre: number, width: number): number {
  const d = Math.abs(t - centre) / width;
  if (d >= 1) return 0;
  const s = 1 - d * d;
  return s * s;
}

export interface Viewport {
  cw: number; ch: number;   // canvas CSS pixels
  scale: number;            // world → CSS px
  ox: number; oy: number;   // world origin in CSS px
  /** Visible world rect. */
  left: number; top: number; right: number; bottom: number;
}

export function fitViewport(cw: number, ch: number, out: Viewport = blankViewport()): Viewport {
  const scale = Math.max(cw / WORLD.w, ch / WORLD.h);
  const visW = cw / scale, visH = ch / scale;
  const left = clamp(LAYOUT.groupX - visW * 0.5, 0, WORLD.w - visW);
  const top = clamp(LAYOUT.anchorY - visH * 0.6, 0, WORLD.h - visH);
  out.cw = cw; out.ch = ch; out.scale = scale;
  out.ox = -left * scale; out.oy = -top * scale;
  out.left = left; out.top = top; out.right = left + visW; out.bottom = top + visH;
  return out;
}

const blankViewport = (): Viewport => ({ cw: 0, ch: 0, scale: 1, ox: 0, oy: 0, left: 0, top: 0, right: 0, bottom: 0 });
const clamp = (v: number, lo: number, hi: number) => (hi < lo ? lo : v < lo ? lo : v > hi ? hi : v);
