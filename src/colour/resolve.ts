import { ROLES, type Palette, type Role, type Oklch } from './palettes';
import type { Light } from './light';
import { mix, toHex, adjust } from './oklch';
import { clamp01 } from '../core/easing';

/**
 * Turns (palette × light) into the concrete CSS colours layers draw with.
 * Results are memoised on a quantised key so culori runs only when something changed,
 * never per element.
 */
export const RAMP = 5; // shades per role: index 0 darkest .. 4 lightest, 2 = base
const DEPTHS = 8;      // atmospheric depth buckets for far layers

export interface Resolved {
  ramp(role: Role): readonly string[];
  hex(role: Role): string;
  /** Role colour pushed toward the far atmosphere by depth (0 near .. 1 far) and haze. */
  atmos(role: Role, depth: number): string;
  sky: { zenith: string; mid: string; horizon: string; glow: string };
  /** Increments whenever colours actually change; cached layers compare it. */
  readonly version: number;
}

export function createResolver() {
  const lit: Record<Role, Oklch> = Object.fromEntries(ROLES.map((r) => [r, { l: 0, c: 0, h: 0 }])) as Record<Role, Oklch>;
  const ramps: Record<Role, string[]> = Object.fromEntries(ROLES.map((r) => [r, new Array(RAMP).fill('#000')])) as Record<Role, string[]>;
  const atmosTable: Record<Role, string[]> = Object.fromEntries(ROLES.map((r) => [r, new Array(DEPTHS + 1).fill('#000')])) as Record<Role, string[]>;
  const sky = { zenith: '#000', mid: '#000', horizon: '#000', glow: '#000' };
  const tmp: Oklch = { l: 0, c: 0, h: 0 };
  let lastKey = '';

  let version = 0;
  const resolved: Resolved = {
    get version() { return version; },
    ramp: (r) => ramps[r],
    hex: (r) => ramps[r][2],
    atmos: (r, depth) => atmosTable[r][Math.round(clamp01(depth) * DEPTHS)],
    sky,
  };

  function applyLight(p: Oklch, L: Light, out: Oklch): Oklch {
    out.l = clamp01(p.l * L.brightness);
    out.c = p.c * L.saturation;
    // Warmth pulls hue toward ~70° (amber) or ~250° (blue) and adds a touch of chroma.
    const target = L.warmth >= 0 ? 70 : 250;
    const w = Math.abs(L.warmth) * 0.35;
    let dh = ((target - p.h + 540) % 360) - 180;
    out.h = (p.h + dh * w * (0.4 + p.c * 4) + 360) % 360;
    out.c += Math.abs(L.warmth) * 0.02;
    return out;
  }

  function resolve(palette: Palette, L: Light): Resolved {
    const key = `${q(L.brightness)}|${q(L.warmth)}|${q(L.saturation)}|${q(L.contrast)}|${q(L.haze)}|${q(palette.foliage.l)}|${q(palette.foliage.h / 360)}|${q(palette.skyZenith.l)}`;
    if (key === lastKey) return resolved;
    lastKey = key;
    version++;

    for (const r of ROLES) applyLight(palette[r], L, lit[r]);

    const baseSpread = 0.04 + 0.06 * L.contrast; // lightness step per ramp index
    for (const r of ROLES) {
      const base = lit[r];
      const spread = baseSpread * (SPREAD[r] ?? 1);
      for (let i = 0; i < RAMP; i++) {
        const k = i - 2;
        // Lit side warms slightly, shadow side cools slightly and loses a little chroma.
        adjust(base, k * spread, k < 0 ? k * 0.006 : k * 0.004, k * 3 * L.contrast, tmp);
        ramps[r][i] = toHex(tmp);
      }
      for (let d = 0; d <= DEPTHS; d++) {
        const depth = d / DEPTHS;
        const amt = clamp01(Math.pow(depth, 1.4) * (0.35 + L.haze * 0.65));
        mix(base, lit.farAtmosphere, amt, tmp);
        atmosTable[r][d] = toHex(tmp);
      }
    }

    sky.zenith = toHex(lit.skyZenith);
    sky.horizon = toHex(lit.skyHorizon);
    sky.mid = toHex(mix(lit.skyZenith, lit.skyHorizon, 0.5, tmp));
    sky.glow = toHex(adjust(lit.skyHorizon, 0.02, 0.03 * (0.3 + Math.max(0, L.warmth)), 0, tmp));
    return resolved;
  }

  return resolve;
}

const q = (v: number) => Math.round(v * 200);
/** Some roles want a quieter ramp than others. */
const SPREAD: Partial<Record<Role, number>> = { grassNear: 0.6, grassFar: 0.5, ground: 0.6, foliageBirch: 0.9, foliage: 0.8 };
