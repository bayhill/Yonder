import type { Location, WeatherSeries } from './types';

const KEY = (loc: Location) => `yonder:forecast:${loc.lat.toFixed(2)},${loc.lon.toFixed(2)}`;

export function loadCached(loc: Location): WeatherSeries | null {
  try {
    const raw = localStorage.getItem(KEY(loc));
    if (!raw) return null;
    const s = JSON.parse(raw) as WeatherSeries;
    if (!Array.isArray(s.samples) || s.samples.length < 24) return null;
    return s;
  } catch { return null; }
}

export function saveCached(series: WeatherSeries): void {
  try { localStorage.setItem(KEY(series.location), JSON.stringify(series)); } catch { /* quota or private mode: fine */ }
}
