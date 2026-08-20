/**
 * The mutable weather inputs the scene is driven by. In Step 7 these are fed by Open-Meteo
 * through smoothing; until then (and in the dev panel) they are set directly.
 */
export interface WeatherControls {
  cloudCover: number;   // 0..1
  fog: number;          // 0..1
  windSpeed: number;    // m/s
  windGust: number;     // m/s
  windDir: number;      // compass degrees the wind blows from
  rain: number;         // mm/h (Step 6)
  snow: number;         // mm/h water equivalent (Step 6)
  temperature: number;  // °C (Step 6)
  humidity: number;     // 0..1 relative humidity (dawn mist)
}

export const DEFAULT_WEATHER: WeatherControls = {
  cloudCover: 0.35, fog: 0.08, windSpeed: 4, windGust: 6.5, windDir: 240, rain: 0, snow: 0, temperature: 16, humidity: 0.7,
};

/** Reads overrides from URL parameters (cloud, fog, wind, gust, dir, rain, snow, temp). */
export function weatherFromParams(p: URLSearchParams, base: WeatherControls = DEFAULT_WEATHER): WeatherControls {
  const n = (k: string, d: number) => (p.has(k) ? Number(p.get(k)) : d);
  const windSpeed = n('wind', base.windSpeed);
  return {
    cloudCover: n('cloud', base.cloudCover),
    fog: n('fog', base.fog),
    windSpeed,
    windGust: n('gust', p.has('wind') ? windSpeed * 1.6 : base.windGust),
    windDir: n('dir', base.windDir),
    rain: n('rain', base.rain),
    snow: n('snow', base.snow),
    temperature: n('temp', base.temperature),
    humidity: n('hum', base.humidity),
  };
}
