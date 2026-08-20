import type { WeatherSample } from '../data/types';
import type { WeatherControls } from './controls';
import { clamp01, smoothstep } from '../core/easing';

/** Maps a (possibly interpolated) sample onto the controls the scene is driven by. */
export function controlsFromSample(s: WeatherSample, out: WeatherControls): WeatherControls {
  out.cloudCover = clamp01(s.cloudCover);
  // Fog: mostly visibility, with a little from saturation-level humidity. Clear air is ~20 km+.
  const vis = 1 - smoothstep(400, 14000, s.visibility);
  const humid = smoothstep(0.9, 1.0, s.humidity) * 0.25;
  out.fog = clamp01(Math.pow(vis, 1.3) + humid);
  out.windSpeed = Math.max(0, s.windSpeed);
  out.windGust = Math.max(out.windSpeed, s.windGust);
  out.windDir = s.windDir;
  out.rain = Math.max(0, s.rain);
  out.snow = Math.max(0, s.snow);
  out.temperature = s.temperature;
  return out;
}
