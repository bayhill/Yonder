import { smoothstep } from '../core/easing';

/**
 * Hoarfrost: forms overnight under a clear sky in still, humid air below freezing, and burns
 * off within a couple of hours of sunrise. Inferred, like the mist, and kept off the snow.
 */
export function frostAmount(temperature: number, humidity: number, windSpeed: number, cloudCover: number, sunElevation: number): number {
  const cold = smoothstep(1, -3, temperature);
  const humid = smoothstep(0.75, 0.92, humidity);
  const calm = 1 - smoothstep(2, 5, windSpeed);
  const clear = 1 - smoothstep(0.4, 0.85, cloudCover);
  const early = 1 - smoothstep(4, 14, sunElevation);
  return cold * humid * calm * clear * early;
}
