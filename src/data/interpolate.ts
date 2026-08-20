import type { WeatherSample } from './types';

/** Linear interpolation between hourly samples; wind direction by shortest arc. Allocation-free with `out`. */
export function sampleAt(samples: WeatherSample[], time: number, out: WeatherSample = blank()): WeatherSample {
  const n = samples.length;
  if (n === 0) return out;
  if (time <= samples[0].time) return copy(samples[0], out);
  if (time >= samples[n - 1].time) return copy(samples[n - 1], out);
  // binary search for the bracketing pair
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (samples[mid].time <= time) lo = mid; else hi = mid; }
  const a = samples[lo], b = samples[hi];
  const t = (time - a.time) / (b.time - a.time);
  const L = (x: number, y: number) => x + (y - x) * t;
  out.time = time;
  out.temperature = L(a.temperature, b.temperature);
  out.rain = L(a.rain, b.rain);
  out.snow = L(a.snow, b.snow);
  out.cloudCover = L(a.cloudCover, b.cloudCover);
  out.cloudLow = L(a.cloudLow, b.cloudLow); out.cloudMid = L(a.cloudMid, b.cloudMid); out.cloudHigh = L(a.cloudHigh, b.cloudHigh);
  out.windSpeed = L(a.windSpeed, b.windSpeed);
  out.windGust = L(a.windGust, b.windGust);
  let d = ((b.windDir - a.windDir + 540) % 360) - 180;
  out.windDir = (a.windDir + d * t + 360) % 360;
  out.humidity = L(a.humidity, b.humidity);
  out.visibility = L(a.visibility, b.visibility);
  out.snowDepth = a.snowDepth == null || b.snowDepth == null ? (a.snowDepth ?? b.snowDepth) : L(a.snowDepth, b.snowDepth);
  return out;
}

export const blank = (): WeatherSample => ({
  time: 0, temperature: 10, rain: 0, snow: 0, cloudCover: 0.3, cloudLow: 0, cloudMid: 0, cloudHigh: 0,
  windSpeed: 3, windDir: 240, windGust: 4, humidity: 0.7, visibility: 24000, snowDepth: null,
});
function copy(s: WeatherSample, out: WeatherSample): WeatherSample { return Object.assign(out, s); }
