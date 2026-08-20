import { clamp01, smoothstep, lerp } from '../core/easing';

/** Inputs the lighting model needs. All from astronomy + smoothed weather. */
export interface LightInput {
  sunElevation: number;  // degrees above horizon (negative below)
  sunAzimuth: number;    // degrees, 0 = north, 90 = east, 180 = south
  cloudCover: number;    // 0..1
  fog: number;           // 0..1 (visibility-derived)
  moonIllumination?: number; // 0..1, used at night (Step 2)
}

/** Derived scene lighting. Every colour on screen is palette × this. */
export interface Light {
  brightness: number;  // multiplier on lightness, ~0.25 (night) .. 1.05 (noon)
  warmth: number;      // -1 cool .. +1 warm (golden hour)
  saturation: number;  // multiplier on chroma
  /** Which side the light comes from in screen space: -1 left .. +1 right (camera faces ~south). */
  dirX: number;
  /** 0 = flat overcast, 1 = crisp low sun. Drives lit/shade contrast. */
  contrast: number;
  haze: number;        // 0..1 baseline atmospheric mixing on far layers
  twilight: number;    // 0 day .. 1 full night (Step 2 refines)
}

export function computeLight(i: LightInput, out: Light = blankLight()): Light {
  const el = i.sunElevation;
  // Day/night curve. Civil twilight ends at -6°, nautical -12°, astronomical -18°.
  const day = smoothstep(-6, 8, el);
  const night = 1 - smoothstep(-18, -6, el);
  const cloud = clamp01(i.cloudCover);

  const sunHeight = smoothstep(0, 40, el);
  const golden = smoothstep(-4, 2, el) * (1 - smoothstep(6, 18, el));

  out.brightness = lerp(0.28, 1.0, day) * lerp(1, 0.72, cloud) + 0.02 * sunHeight;
  out.warmth = golden * lerp(1, 0.3, cloud) - night * 0.6 - cloud * 0.15;
  out.saturation = lerp(0.55, 1.0, day) * lerp(1, 0.7, cloud) + golden * 0.12;
  // Camera looks roughly south; the sun moves from left (east) to right (west).
  out.dirX = Math.sin((i.sunAzimuth - 180) * (Math.PI / 180)) * -1;
  out.contrast = day * lerp(1, 0.15, cloud) * lerp(0.55, 1, 1 - sunHeight) ;
  out.haze = clamp01(0.25 + cloud * 0.2 + i.fog * 0.55);
  out.twilight = night;
  return out;
}

export const blankLight = (): Light => ({
  brightness: 1, warmth: 0, saturation: 1, dirX: -0.5, contrast: 0.5, haze: 0.3, twilight: 0,
});
