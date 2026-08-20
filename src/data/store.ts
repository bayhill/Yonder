import type { Location, WeatherSeries } from './types';
import { fetchForecast } from './openMeteo';
import { loadCached, saveCached } from './cache';

export type StoreStatus = 'idle' | 'loading' | 'live' | 'cached' | 'error';

/**
 * Owns the forecast for one location: cached-first, background refresh every `refreshMinutes`,
 * and a failed fetch never takes the last good series away.
 */
export function createWeatherStore(refreshMinutes: number, onSeries: (s: WeatherSeries) => void) {
  let location: Location | null = null;
  let series: WeatherSeries | null = null;
  let status: StoreStatus = 'idle';
  let timer = 0;
  let abort: AbortController | null = null;

  async function refresh() {
    if (!location) return;
    abort?.abort();
    abort = new AbortController();
    status = series ? status : 'loading';
    try {
      const s = await fetchForecast(location, abort.signal);
      if (location && s.location.lat === location.lat && s.location.lon === location.lon) {
        series = s; status = 'live';
        saveCached(s);
        onSeries(s);
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      status = series ? 'cached' : 'error';
    }
  }

  function setLocation(loc: Location) {
    location = loc;
    series = loadCached(loc);
    status = series ? 'cached' : 'loading';
    if (series) onSeries(series);
    void refresh();
    clearInterval(timer);
    timer = window.setInterval(refresh, refreshMinutes * 60_000);
  }

  document.addEventListener('visibilitychange', () => {
    // Coming back after a long sleep: refresh if the data is stale.
    if (!document.hidden && series && Date.now() - series.fetchedAt > refreshMinutes * 60_000) void refresh();
  });

  return {
    setLocation,
    refresh,
    get series() { return series; },
    get status() { return status; },
    get location() { return location; },
  };
}
