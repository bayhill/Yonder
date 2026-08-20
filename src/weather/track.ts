import type { WeatherSeries } from '../data/types';
import { sampleAt, blank } from '../data/interpolate';
import { Accumulation } from './accumulation';
import { controlsFromSample } from './state';
import { DEFAULT_WEATHER } from './controls';
import { clamp } from '../core/easing';

/**
 * Accumulated state (snow cover, wet ground) precomputed along the whole series, so the scene is
 * right on first load (history replayed) and right when scrubbing into the forecast (future
 * snowfall already lies on the ground). Sampled at 10-minute resolution.
 */
export interface AccumulationTrack { t0: number; step: number; snow: Float32Array; wet: Float32Array }

export function buildTrack(series: WeatherSeries, stepMinutes = 10): AccumulationTrack {
  const { samples } = series;
  const t0 = samples[0].time, t1 = samples[samples.length - 1].time;
  const step = stepMinutes * 60_000;
  const n = Math.max(1, Math.floor((t1 - t0) / step) + 1);
  const snow = new Float32Array(n), wet = new Float32Array(n);
  const acc = new Accumulation();
  const s = blank(), c = { ...DEFAULT_WEATHER };
  for (let i = 0; i < n; i++) {
    const time = t0 + i * step;
    sampleAt(samples, time, s);
    controlsFromSample(s, c);
    acc.step(stepMinutes / 60, c);
    // The model's own snow depth is better truth than our integrator when it is available.
    if (s.snowDepth != null) acc.snow = acc.snow * 0.3 + clamp(s.snowDepth / 0.14, 0, 1.4) * 0.7;
    snow[i] = acc.snow; wet[i] = acc.wet;
  }
  return { t0, step, snow, wet };
}

export function trackAt(track: AccumulationTrack, time: number, out: { snow: number; wet: number }) {
  const f = (time - track.t0) / track.step;
  const i = clamp(Math.floor(f), 0, track.snow.length - 1);
  const j = Math.min(i + 1, track.snow.length - 1);
  const u = clamp(f - i, 0, 1);
  out.snow = track.snow[i] + (track.snow[j] - track.snow[i]) * u;
  out.wet = track.wet[i] + (track.wet[j] - track.wet[i]) * u;
  return out;
}
