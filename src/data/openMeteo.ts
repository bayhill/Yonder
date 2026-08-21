import type { Location, WeatherSample, WeatherSeries } from './types';

const HOURLY = [
  'temperature_2m', 'rain', 'snowfall', 'cloud_cover', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high',
  'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m', 'relative_humidity_2m', 'visibility', 'snow_depth', 'weather_code',
].join(',');

export function forecastUrl(loc: Location): string {
  const p = new URLSearchParams({
    latitude: loc.lat.toFixed(4), longitude: loc.lon.toFixed(4),
    hourly: HOURLY, past_days: '1', forecast_days: '3',
    wind_speed_unit: 'ms', timezone: 'UTC',
  });
  return `https://api.open-meteo.com/v1/forecast?${p}`;
}

/** Shape of the bits of the Open-Meteo response we read. */
interface Raw { hourly: Record<string, Array<number | null> | string[]> }

/** Pure: turns an Open-Meteo response into a normalised series. Exported for tests. */
export function parseForecast(raw: Raw, loc: Location, fetchedAt = Date.now()): WeatherSeries {
  const h = raw.hourly;
  const times = h.time as string[];
  const num = (k: string, i: number, d = 0) => { const v = (h[k] as Array<number | null> | undefined)?.[i]; return v == null || Number.isNaN(v) ? d : v; };
  const samples: WeatherSample[] = times.map((t, i) => ({
    time: Date.parse(t.endsWith('Z') ? t : t + 'Z'),
    temperature: num('temperature_2m', i, 10),
    rain: num('rain', i),
    snow: num('snowfall', i) * 10 / 10,   // cm of snow ≈ mm water equivalent at a 10:1 ratio
    cloudCover: num('cloud_cover', i) / 100,
    cloudLow: num('cloud_cover_low', i) / 100,
    cloudMid: num('cloud_cover_mid', i) / 100,
    cloudHigh: num('cloud_cover_high', i) / 100,
    windSpeed: num('wind_speed_10m', i),
    windDir: num('wind_direction_10m', i),
    windGust: num('wind_gusts_10m', i, num('wind_speed_10m', i)),
    humidity: num('relative_humidity_2m', i, 70) / 100,
    visibility: num('visibility', i, 24000),
    snowDepth: finiteOrNull((h.snow_depth as Array<number | null> | undefined)?.[i]),
    thunder: num('weather_code', i) >= 95 ? 1 : 0,   // WMO 95, 96, 99: thunderstorm
  }));
  return { location: loc, fetchedAt, samples };
}

const finiteOrNull = (v: number | null | undefined) => (v == null || !Number.isFinite(v) ? null : v);

export async function fetchForecast(loc: Location, signal?: AbortSignal): Promise<WeatherSeries> {
  const res = await fetch(forecastUrl(loc), { signal });
  if (!res.ok) throw new Error(`open-meteo ${res.status}`);
  return parseForecast(await res.json(), loc);
}

export interface GeoResult { name: string; country?: string; admin1?: string; lat: number; lon: number }

export async function geocode(query: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const p = new URLSearchParams({ name: query, count: '5', language: 'en', format: 'json' });
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${p}`, { signal });
  if (!res.ok) throw new Error(`geocoding ${res.status}`);
  const json = await res.json() as { results?: Array<{ name: string; country?: string; admin1?: string; latitude: number; longitude: number }> };
  return (json.results ?? []).map((r) => ({ name: r.name, country: r.country, admin1: r.admin1, lat: r.latitude, lon: r.longitude }));
}
