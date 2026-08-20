import { clamp01, smoothstep, lerp } from '../core/easing';

/** Inputs the lighting model needs. All from astronomy + smoothed weather. */
export interface LightInput {
  sunElevation: number;  // degrees above horizon (negative below)
  sunAzimuth: number;    // compass degrees
  cloudCover: number;    // 0..1
  fog: number;           // 0..1 (visibility-derived)
  moonElevation: number; // degrees
  moonFraction: number;  // illuminated fraction 0..1
}

/** Derived scene lighting. Every colour on screen is palette × this. */
export interface Light {
  brightness: number;  // multiplier on lightness for scene objects
  warmth: number;      // -1 cool .. +1 warm (golden hour)
  saturation: number;  // multiplier on chroma
  /** Which side the light comes from in screen space: -1 left .. +1 right (camera faces south). */
  dirX: number;
  /** 0 = flat overcast / night, 1 = crisp low sun. Drives lit/shade contrast and shadows. */
  contrast: number;
  haze: number;        // 0..1 baseline atmospheric mixing on far layers
  /** 0 day .. 1 full night, for the sky and for stars. */
  skyDark: number;
  /** Strength of the warm twilight band at the horizon, 0..1. */
  twilightGlow: number;
  /** Sun-side horizon glow strength (low sun, clear sky). */
  sunGlow: number;
  /** Visible stars, 0..1 (night × clear). */
  stars: number;
  /** Moon visibility 0..1 (up × clear × dark enough to see). */
  moon: number;
  /** Additive lightness at night so shadows stay blue-grey rather than black. */
  lift: number;
  /** Shadow length multiplier (1 / tan elevation, clamped). */
  shadowLength: number;
  sunElevation: number;
  sunAzimuth: number;
  /** Cloud cover 0..1, for sky flattening and cloud colours. */
  cloud: number;
}

export function computeLight(i: LightInput, out: Light = blankLight()): Light {
  const el = i.sunElevation;
  const cloud = clamp01(i.cloudCover);
  const clear = 1 - cloud;

  // Twilight bands: astronomical (-18..-12), nautical (-12..-6), civil (-6..0), then day.
  const astro = smoothstep(-18, -12, el);
  const naut = smoothstep(-12, -6, el);
  const civil = smoothstep(-6, 0, el);
  const day = smoothstep(0, 14, el);
  const sunHigh = smoothstep(10, 45, el);

  // Moon as a faint cool key light at night.
  const moonUp = smoothstep(0, 10, i.moonElevation);
  const night = 1 - smoothstep(-12, 0, el);
  const moonLight = moonUp * i.moonFraction * clear * night;

  // Night floor is deliberately high: the scene is deep blue-grey at night, never black.
  const lowDay = smoothstep(-1, 10, el);
  out.brightness =
    (0.22 + 0.04 * astro + 0.09 * naut + 0.18 * civil + 0.22 * lowDay + 0.25 * day) * lerp(1, 0.76, cloud)
    + 0.05 * moonLight + 0.02 * sunHigh;
  out.lift = night * 0.05 + moonLight * 0.03;

  const golden = smoothstep(-5, 1, el) * (1 - smoothstep(5, 16, el));
  const dusk = smoothstep(-9, -3, el) * (1 - smoothstep(-2, 3, el)); // deeper pink/violet band
  out.warmth = (golden * 0.9 + dusk * 0.35) * lerp(1, 0.25, cloud) - night * 0.7 - cloud * 0.12;
  out.saturation = lerp(0.5, 1.0, smoothstep(-8, 10, el)) * lerp(1, 0.72, cloud) + golden * 0.12;

  out.dirX = Math.sin((i.sunAzimuth - 180) * (Math.PI / 180));
  out.contrast = smoothstep(-2, 6, el) * lerp(1, 0.12, cloud) * lerp(0.55, 1, 1 - sunHigh) + moonLight * 0.25;
  out.haze = clamp01(0.22 + cloud * 0.2 + i.fog * 0.55 + night * 0.05);

  out.skyDark = 1 - smoothstep(-16, 4, el);
  out.twilightGlow = (smoothstep(-12, -4, el) * (1 - smoothstep(2, 10, el))) * lerp(1, 0.15, cloud);
  out.sunGlow = (1 - smoothstep(4, 22, el)) * smoothstep(-8, 0, el) * lerp(1, 0.1, cloud);
  out.stars = (1 - smoothstep(-16, -8, el)) * clear * clear;
  out.moon = moonUp * clear * (1 - smoothstep(-6, 6, el));
  const elRad = Math.max(3, el) * (Math.PI / 180);
  out.shadowLength = Math.min(8, 1 / Math.tan(elRad));
  out.sunElevation = el;
  out.sunAzimuth = i.sunAzimuth;
  out.cloud = cloud;
  return out;
}

export const blankLight = (): Light => ({
  brightness: 1, warmth: 0, saturation: 1, dirX: 0.5, contrast: 0.5, haze: 0.3, skyDark: 0, lift: 0,
  twilightGlow: 0, sunGlow: 0, stars: 0, moon: 0, shadowLength: 2, sunElevation: 20, sunAzimuth: 200, cloud: 0,
});
