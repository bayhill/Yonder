import { describe, it, expect } from 'vitest';
import { parseForecast } from '../src/data/openMeteo';
import { sampleAt } from '../src/data/interpolate';
import { controlsFromSample } from '../src/weather/state';
import { buildTrack, trackAt } from '../src/weather/track';
import { DEFAULT_WEATHER } from '../src/weather/controls';

const loc = { name: 'Test', lat: 59.76, lon: 18.7 };
function raw(hours: number, f: (i: number) => Partial<Record<string, number>>) {
  const time: string[] = [];
  const cols: Record<string, number[]> = {};
  const keys = ['temperature_2m', 'rain', 'snowfall', 'cloud_cover', 'cloud_cover_low', 'cloud_cover_mid', 'cloud_cover_high', 'wind_speed_10m', 'wind_direction_10m', 'wind_gusts_10m', 'relative_humidity_2m', 'visibility', 'snow_depth'];
  for (const k of keys) cols[k] = [];
  for (let i = 0; i < hours; i++) {
    time.push(new Date(Date.UTC(2026, 0, 10, i)).toISOString().slice(0, 16));
    const v = f(i);
    for (const k of keys) cols[k].push(v[k] ?? (k === 'snow_depth' ? NaN : 0));
  }
  return { hourly: { time, ...cols } };
}

describe('open-meteo parsing', () => {
  it('normalises units', () => {
    const s = parseForecast(raw(3, () => ({ temperature_2m: -2, snowfall: 0.5, cloud_cover: 80, wind_speed_10m: 6, relative_humidity_2m: 95, visibility: 3000 })), loc, 0);
    expect(s.samples).toHaveLength(3);
    expect(s.samples[0].cloudCover).toBeCloseTo(0.8);
    expect(s.samples[0].humidity).toBeCloseTo(0.95);
    expect(s.samples[0].snow).toBeCloseTo(0.5);
    expect(new Date(s.samples[1].time).getUTCHours()).toBe(1);
  });
});

describe('interpolation', () => {
  const s = parseForecast(raw(4, (i) => ({ temperature_2m: i * 2, wind_direction_10m: i === 1 ? 350 : i === 2 ? 10 : 0, visibility: 20000 })), loc, 0);
  it('is linear between hours and takes the short way round for direction', () => {
    const t = s.samples[1].time + 30 * 60e3;
    const v = sampleAt(s.samples, t);
    expect(v.temperature).toBeCloseTo(3);
    expect(v.windDir).toBeCloseTo(0, 0);
  });
  it('clamps outside the series', () => {
    expect(sampleAt(s.samples, s.samples[0].time - 1e9).temperature).toBe(0);
    expect(sampleAt(s.samples, s.samples[3].time + 1e9).temperature).toBe(6);
  });
});

describe('controls mapping', () => {
  it('turns poor visibility into fog and clear air into none', () => {
    const out = { ...DEFAULT_WEATHER };
    const s = parseForecast(raw(2, (i) => ({ visibility: i ? 24000 : 800, relative_humidity_2m: 60 })), loc, 0).samples;
    expect(controlsFromSample(s[0], out).fog).toBeGreaterThan(0.8);
    expect(controlsFromSample(s[1], out).fog).toBeLessThan(0.05);
  });
});

describe('accumulation track', () => {
  it('replays history: snow that fell 12 h ago is on the ground now and melts into the forecast', () => {
    const s = parseForecast(raw(48, (i) => ({ temperature_2m: i < 20 ? -3 : 6, snowfall: i >= 4 && i < 16 ? 1 : 0, visibility: 20000 })), loc, 0);
    const tr = buildTrack(s);
    const at = (h: number) => trackAt(tr, s.samples[0].time + h * 3600e3, { snow: 0, wet: 0 });
    expect(at(2).snow).toBeCloseTo(0, 1);
    expect(at(18).snow).toBeGreaterThan(0.6);
    expect(at(40).snow).toBeLessThan(at(18).snow * 0.3);
  });
});

import { parseForecast } from '../src/data/openMeteo';
describe('thunderstorm code', () => {
  it('maps WMO 95+ to thunder', () => {
    const raw = { hourly: { time: ['2026-08-21T10:00', '2026-08-21T11:00'], temperature_2m: [20, 21], weather_code: [61, 95] } };
    const s = parseForecast(raw as never, { name: 'x', lat: 0, lon: 0 });
    expect(s.samples.map((x) => x.thunder)).toEqual([0, 1]);
  });
});
