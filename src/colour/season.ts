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
  [175, palettes.summer],  // midsummer
  [225, palettes.summer],  // mid-August
  [275, palettes.autumn],  // early October: the turn
  [315, palettes.thaw],    // mid-November: bare and grey
  [350, palettes.winter],
];

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
