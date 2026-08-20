/** Monotone helpers only. Nothing in here overshoots. */
export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);
export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const remap = (v: number, a0: number, a1: number, b0: number, b1: number) =>
  b0 + ((v - a0) / (a1 - a0)) * (b1 - b0);
export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}
export const TAU = Math.PI * 2;
export const DEG = Math.PI / 180;
