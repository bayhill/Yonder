import { smoothstep } from '../core/easing';

/**
 * Radiation mist: on a still, clear, humid morning or evening the meadow breathes out a low
 * fog that the sun burns off within an hour or two of rising. Open-Meteo rarely reports it as
 * visibility, so it is inferred. Returns extra fog 0..~0.4 to add to the visibility-derived fog.
 */
export function mistAmount(humidity: number, windSpeed: number, cloudCover: number, sunElevation: number): number {
  const humid = smoothstep(0.84, 0.97, humidity);
  const calm = 1 - smoothstep(1.5, 4.5, windSpeed);
  const clear = 1 - smoothstep(0.35, 0.75, cloudCover);
  // Strongest around sunrise; lingers into the first hours of the day, and returns late evening.
  const lowSun = smoothstep(-9, -3, sunElevation) * (1 - smoothstep(6, 18, sunElevation));
  return 0.42 * humid * calm * clear * lowSun;
}
