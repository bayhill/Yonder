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
  sky: { zenith: string; mid: string; horizon: string; glow: string; sunGlow: string };
  /** Moon disc and its shadowed side. */
  moon: { lit: string; dark: string };
  /** Cloud colours: sunlit tops and shaded undersides. */
  cloud: { lit: string; shade: string };
  rain: string;
  snowFlake: string;
  star: string;
  /** The low sun's disc: pale, warm, never glaring. */
  sunDisc: string;
  /** Increments whenever colours actually change; cached layers compare it. */
  readonly version: number;
}

export function createResolver() {
  const lit: Record<Role, Oklch> = Object.fromEntries(ROLES.map((r) => [r, { l: 0, c: 0, h: 0 }])) as Record<Role, Oklch>;
  const ramps: Record<Role, string[]> = Object.fromEntries(ROLES.map((r) => [r, new Array(RAMP).fill('#000')])) as Record<Role, string[]>;
  const atmosTable: Record<Role, string[]> = Object.fromEntries(ROLES.map((r) => [r, new Array(DEPTHS + 1).fill('#000')])) as Record<Role, string[]>;
  const sky = { zenith: '#000', mid: '#000', horizon: '#000', glow: '#000', sunGlow: '#000' };
  const moon = { lit: '#000', dark: '#000' };
  const cloud = { lit: '#000', shade: '#000' };
  const skyZ: Oklch = { l: 0, c: 0, h: 0 }, skyH: Oklch = { l: 0, c: 0, h: 0 };
  const tmp: Oklch = { l: 0, c: 0, h: 0 };
  let lastKey = '';

  let version = 0;
  const resolved: Resolved = {
    get version() { return version; },
    ramp: (r) => ramps[r],
    hex: (r) => ramps[r][2],
    atmos: (r, depth) => atmosTable[r][Math.round(clamp01(depth) * DEPTHS)],
    sky,
    moon,
    cloud,
    star: '#000',
    rain: '#000',
    snowFlake: '#000',
    sunDisc: '#000',
  } as Resolved & { star: string; rain: string; snowFlake: string; sunDisc: string };

  function applyLight(p: Oklch, L: Light, out: Oklch): Oklch {
    out.l = clamp01(p.l * L.brightness + L.lift);
    out.c = p.c * L.saturation * (1 - L.skyDark * 0.45);
    out.h = p.h;
    // Warmth pulls toward amber or toward night blue — in OKLab, so nothing detours through magenta.
    if (L.warmth > 0) {
      WARM.l = out.l; WARM.c = 0.09 + out.c * 0.5;
      // Low-chroma blues (far hills, haze) resist the warm cast, so a sunset never greys them out.
      mix(out, WARM, L.warmth * 0.28 * (0.4 + 0.6 * clamp01(out.c * 12)), out);
    } else if (L.warmth < 0) {
      COOL.l = out.l; COOL.c = 0.03;
      mix(out, COOL, -L.warmth * 0.68, out);
    }
    return out;
  }

  /** Sky colours get the daylight treatment but not the scene brightness curve (they carry their own). */
  function applySky(p: Oklch, L: Light, out: Oklch): Oklch {
    const dayL = 0.55 + 0.45 * (1 - L.skyDark);
    out.l = clamp01(p.l * dayL);
    out.c = p.c * (0.7 + 0.3 * L.saturation);
    out.h = p.h;
    return out;
  }

  function resolve(palette: Palette, L: Light): Resolved {
    const key = `${q(L.brightness)}|${q(L.lift)}|${q(L.cloud)}|${q(L.wet)}|${q(L.snowCover)}|${q(L.warmth)}|${q(L.saturation)}|${q(L.contrast)}|${q(L.haze)}|${q(L.skyDark)}|${q(L.twilightGlow)}|${q(L.sunGlow)}|${q(palette.foliage.l)}|${q(palette.foliage.h / 360)}|${q(palette.skyZenith.l)}`;
    if (key === lastKey) return resolved;
    lastKey = key;
    version++;

    for (const r of ROLES) applyLight(palette[r], L, lit[r]);
    // Wet ground and grass are darker and a touch richer.
    for (const r of WETTABLE) { lit[r].l = clamp01(lit[r].l - 0.075 * L.wet); lit[r].c += 0.012 * L.wet; }

    const baseSpread = 0.04 + 0.06 * L.contrast; // lightness step per ramp index
    for (const r of ROLES) {
      const base = lit[r];
      const spread = baseSpread * (SPREAD[r] ?? 1);
      for (let i = 0; i < RAMP; i++) {
        const k = i - 2;
        // Lit side warms slightly, shadow side cools slightly and loses a little chroma.
        const hs = HUE_SPREAD[r] ?? 3;
        adjust(base, k * spread, k < 0 ? k * 0.006 : k * 0.003, k * hs * (0.4 + 0.6 * L.contrast), tmp);
        ramps[r][i] = toHex(tmp);
      }
      for (let d = 0; d <= DEPTHS; d++) {
        const depth = d / DEPTHS;
        const amt = clamp01(Math.pow(depth, 1.4) * (0.35 + L.haze * 0.65));
        mix(base, lit.farAtmosphere, amt, tmp);
        atmosTable[r][d] = toHex(tmp);
      }
    }

    // Sky: the palette sky under daylight, pulled toward a deep night sky as the sun sinks,
    // with a warm twilight band at the horizon and a sun-side glow when the sun is low.
    applySky(palette.skyZenith, L, skyZ);
    applySky(palette.skyHorizon, L, skyH);
    mix(skyZ, NIGHT_ZENITH, Math.pow(L.skyDark, 0.9), skyZ);
    mix(skyH, NIGHT_HORIZON, Math.pow(L.skyDark, 1.3), skyH);
    // Snow on the ground lights the underside of a night cloud deck: overcast winter nights are
    // noticeably pale, never darker than clear ones.
    const snowGlow = L.skyDark * L.snowCover * (0.02 + 0.07 * L.cloud);
    skyZ.l += snowGlow; skyH.l += snowGlow * 1.3;
    // Overcast flattens the sky: zenith drifts toward the horizon tone and both lose chroma.
    mix(skyZ, skyH, L.cloud * 0.45, skyZ);
    skyZ.c *= 1 - L.cloud * 0.5; skyH.c *= 1 - L.cloud * 0.35;
    skyZ.l -= L.cloud * 0.06 * (1 - L.skyDark);
    sky.zenith = toHex(skyZ);
    sky.horizon = toHex(mix(skyH, TWILIGHT_WARM, L.twilightGlow * 0.55, tmp));
    sky.mid = toHex(mix(skyZ, skyH, 0.5, tmp));
    mix(skyH, TWILIGHT_WARM, L.twilightGlow * 0.35, tmp);
    sky.glow = toHex(adjust(tmp, 0.01, 0.01, 0, tmp));
    mix(skyH, SUN_WARM, 0.35 + L.twilightGlow * 0.5, tmp);
    sky.sunGlow = toHex(adjust(tmp, 0.06 * (1 - L.skyDark), 0.02, 0, tmp));
    // Clouds: tops near white by day, warmed at twilight, dark blue-grey at night; the deck
    // greys down as cover grows. Undersides are a cooler, darker grey.
    mix(CLOUD_LIT, skyH, 0.12 + L.cloud * 0.25, tmp);
    mix(tmp, TWILIGHT_WARM, L.twilightGlow * 0.5, tmp);
    tmp.l = (tmp.l * (1 - L.skyDark * 0.72) + snowGlow * 1.5) * (1 - L.cloud * 0.12);
    cloud.lit = toHex(tmp);
    mix(CLOUD_SHADE, skyZ, 0.3, tmp);
    tmp.l = (tmp.l * (1 - L.skyDark * 0.74) + snowGlow * 1.5) * (1 - L.cloud * 0.22);
    cloud.shade = toHex(tmp);
    moon.lit = toHex(mix(MOON, skyH, 0.15, tmp));
    moon.dark = toHex(mix(skyZ, MOON, 0.06, tmp));
    resolved.star = toHex(mix(STAR, skyZ, 0.2, tmp));
    mix(SUN_DISC, TWILIGHT_WARM, L.twilightGlow * 0.45, tmp); tmp.l = Math.min(0.97, tmp.l + 0.04 * (1 - L.twilightGlow));
    resolved.sunDisc = toHex(tmp);
    resolved.rain = toHex(mix(lit.farAtmosphere, skyH, 0.5, tmp));
    mix(lit.snow, skyH, 0.12, tmp); tmp.l = Math.max(tmp.l, lit.farAtmosphere.l + 0.04);
    resolved.snowFlake = toHex(tmp);
    return resolved;
  }

  return resolve;
}

const q = (v: number) => Math.round(v * 200);
const WARM: Oklch = { l: 0.7, c: 0.1, h: 75 };
const COOL: Oklch = { l: 0.3, c: 0.035, h: 255 };
const NIGHT_ZENITH: Oklch = { l: 0.21, c: 0.032, h: 262 };
const NIGHT_HORIZON: Oklch = { l: 0.31, c: 0.030, h: 250 };
const TWILIGHT_WARM: Oklch = { l: 0.72, c: 0.11, h: 48 };
const SUN_WARM: Oklch = { l: 0.86, c: 0.070, h: 70 };
const SUN_DISC: Oklch = { l: 0.95, c: 0.045, h: 78 };
const CLOUD_LIT: Oklch = { l: 0.95, c: 0.008, h: 80 };
const CLOUD_SHADE: Oklch = { l: 0.70, c: 0.018, h: 245 };
const MOON: Oklch = { l: 0.93, c: 0.012, h: 95 };
const STAR: Oklch = { l: 0.92, c: 0.01, h: 90 };
/** Some roles want a quieter ramp than others. */
/** Degrees of hue shift per ramp step: lit side toward yellow, shade toward blue-green. */
const HUE_SPREAD: Partial<Record<Role, number>> = { foliage: -9, foliageBirch: -10, grassNear: -6, grassFar: -5, farTreeline: -4 };
const WETTABLE: Role[] = ['ground', 'grassNear', 'grassFar', 'trunk'];
const SPREAD: Partial<Record<Role, number>> = { grassNear: 0.6, grassFar: 0.5, ground: 0.6, foliageBirch: 0.95, foliage: 0.9 };
