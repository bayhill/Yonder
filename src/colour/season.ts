import { palettes, ROLES, type Palette, type Oklch } from './palettes';
import { mix } from './oklch';

/**
 * Seasonal blend by day of year, tuned for 59°N. Keyframes are (dayOfYear, palette);
 * between them we interpolate in OKLCH, so there is never a visible switch.
 */
const KEYS: Array<[number, Palette]> = [
  [15, palettes.winter],
  [75, palettes.thaw],     // mid-March: snow going, ground mud
  [120, palettes.spring],  // late April
  [165, palettes.summer],  // midsummer
  [230, palettes.summer],  // mid-August
  [275, palettes.autumn],  // early October: the turn
  [310, palettes.thaw],    // early November: bare and grey
  [345, palettes.winter],
];

/**
 * Seasonal form, as continuous scalars:
 *  leaf  0..1 — birch foliage (leaf-out early May, gold then bare late October)
 *  grass 0..1 — meadow height (flattened and short through winter, tall from midsummer)
 */
export interface SeasonParams { leaf: number; grass: number }
const LEAF: Array<[number, number]> = [[0, 0], [112, 0], [128, 0.35], [150, 1], [278, 1], [296, 0.55], [312, 0.05], [365, 0]];
const GRASS: Array<[number, number]> = [[0, 0.62], [95, 0.62], [140, 0.85], [175, 1], [265, 1], [320, 0.78], [365, 0.62]];

export function seasonParams(doy: number, out: SeasonParams = { leaf: 1, grass: 1 }): SeasonParams {
  const d = ((doy % 365) + 365) % 365;
  out.leaf = track(LEAF, d);
  out.grass = track(GRASS, d);
  return out;
}
function track(keys: Array<[number, number]>, d: number): number {
  let i = 1;
  while (i < keys.length - 1 && keys[i][0] < d) i++;
  const [d0, v0] = keys[i - 1], [d1, v1] = keys[i];
  return v0 + (v1 - v0) * smooth((d - d0) / (d1 - d0));
}

export function dayOfYear(d: Date): number {
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  return (d.getTime() - start) / 86400000;
}

const blank = (): Palette => Object.fromEntries(ROLES.map((r) => [r, { l: 0, c: 0, h: 0 }])) as Palette;

/** Writes the blended palette into `out` (allocation-free after first call). */
export function seasonPalette(doy: number, out: Palette = blank()): Palette {
  const d = ((doy % 365) + 365) % 365;
  let i = 0;
  while (i < KEYS.length && KEYS[i][0] <= d) i++;
  const [d0, p0] = KEYS[(i - 1 + KEYS.length) % KEYS.length];
  const [d1, p1] = KEYS[i % KEYS.length];
  let span = d1 - d0; if (span <= 0) span += 365;
  let off = d - d0; if (off < 0) off += 365;
  const t = smooth(off / span);
  for (const r of ROLES) mix(p0[r], p1[r], t, out[r] as Oklch);
  return out;
}

const smooth = (t: number) => t * t * (3 - 2 * t);
