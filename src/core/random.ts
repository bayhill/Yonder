/** Seeded, deterministic PRNG (sfc32). Every piece of procedural generation goes through this. */
export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform in [a, b). */
  range(a: number, b: number): number;
  /** Integer in [a, b]. */
  int(a: number, b: number): number;
  /** Approximately normal, mean 0, sd 1 (clamped to ±3). */
  gauss(): number;
  pick<T>(items: readonly T[]): T;
  chance(p: number): boolean;
  /** Independent child stream, so adding a generator never reshuffles its siblings. */
  fork(label: string): Rng;
}

function hash(str: string): number {
  // FNV-1a 32-bit
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function createRng(seed: number | string): Rng {
  const s = typeof seed === 'number' ? seed >>> 0 : hash(seed);
  let a = s ^ 0x9e3779b9, b = s ^ 0x243f6a88, c = s ^ 0xb7e15162, d = s | 1;
  // warm up
  for (let i = 0; i < 12; i++) next();

  function next(): number {
    a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  const rng: Rng = {
    next,
    range: (lo, hi) => lo + (hi - lo) * next(),
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    gauss() {
      const u = 1 - next(), v = next();
      const g = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
      return g < -3 ? -3 : g > 3 ? 3 : g;
    },
    pick: (items) => items[Math.floor(next() * items.length)],
    chance: (p) => next() < p,
    fork: (label) => createRng(`${s}:${label}`),
  };
  return rng;
}
