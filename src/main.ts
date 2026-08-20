import { buildScene } from './scene/scene';
import { createRenderer } from './render/renderer';
import { createResolver } from './colour/resolve';
import { seasonPalette, seasonParams, dayOfYear } from './colour/season';
import { computeLight, blankLight } from './colour/light';
import { startLoop } from './core/loop';
import { SEED, DEFAULT_LOCATION } from './config';
import { installGrain } from './scene/layers/grain';
import { createRng } from './core/random';
import { sunPosition } from './astronomy/sun';
import { moonState } from './astronomy/moon';
import { createClock } from './time';
import { WindField } from './wind/field';
import { weatherFromParams } from './weather/controls';
import { SmoothedWeather } from './weather/smoothed';
import { Accumulation } from './weather/accumulation';
import type { FrameWeather } from './scene/layer';

const params = new URLSearchParams(location.search);
const location_ = {
  lat: Number(params.get('lat') ?? DEFAULT_LOCATION.lat),
  lon: Number(params.get('lon') ?? DEFAULT_LOCATION.lon),
};

const clock = createClock(params);
const moon = moonState(clock.now(), location_.lat, location_.lon);
const sun = sunPosition(clock.now(), location_.lat, location_.lon);

const weather = weatherFromParams(params);          // targets (dev panel / URL; live data in Step 7)
const smoothed = new SmoothedWeather(weather);       // what the scene actually sees
const accumulation = new Accumulation();
const sim = { speed: 1 };                            // dev: simulated seconds per real second
const wind = new WindField(createRng(SEED));
const applyWeather = () => { /* targets are read continuously; nothing to push */ };
const frameWeather: FrameWeather = { rain: 0, snow: 0, temperature: 15, fog: 0, cloudCover: 0, snowCover: 0, wet: 0 };

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const layers = buildScene(SEED, moon, () => smoothed.value.cloudCover).filter((l) => !params.has('skip') || !params.get('skip')!.split(',').some((n) => l.name.startsWith(n)));
const renderer = createRenderer(canvas, layers);
const resolve = createResolver();
installGrain(createRng(SEED));

const light = blankLight();
const palette = seasonPalette(dayOfYear(clock.now()));
const season = seasonParams(dayOfYear(clock.now()));
let t = 0;

startLoop({
  update(dt) {
    t += dt;
    if (sim.speed !== 1) clock.shift((sim.speed - 1) * dt * 1000);
    smoothed.step(dt);
    const w = smoothed.value;
    wind.configure(w.windSpeed, w.windDir, w.windGust);
    wind.update(dt);
    accumulation.step((dt * sim.speed) / 3600, w);
    frameWeather.rain = w.rain; frameWeather.snow = w.snow; frameWeather.temperature = w.temperature;
    frameWeather.fog = w.fog; frameWeather.cloudCover = w.cloudCover;
    frameWeather.snowCover = accumulation.snow; frameWeather.wet = accumulation.wet;
    for (const l of layers) l.update?.(dt, t, wind);
  },
  render(alpha) {
    const now = clock.now();
    sunPosition(now, location_.lat, location_.lon, sun);
    moonState(now, location_.lat, location_.lon, moon);
    const doy = dayOfYear(now);
    seasonPalette(doy, palette);
    seasonParams(doy, season);
    const w = smoothed.value;
    computeLight({
      sunElevation: sun.elevation, sunAzimuth: sun.azimuth,
      cloudCover: w.cloudCover, fog: w.fog,
      moonElevation: moon.elevation, moonFraction: moon.fraction,
      precip: 1 - Math.exp(-(w.rain + w.snow * 0.7) / 3),
      wet: accumulation.wet, snowCover: Math.min(1, accumulation.snow),
    }, light);
    renderer.render(resolve(palette, light), light, t, alpha, season, frameWeather);
  },
});

if (import.meta.env.DEV) {
  import('./dev/devPanel').then((m) => m.installDevPanel(canvas, { clock, weather, sim, accumulation, onWeather: applyWeather, state: () => ({ sun, moon, light }) }));
  (window as unknown as { __yonder: unknown }).__yonder = {
    layers, renderer, clock, wind, weather, smoothed, accumulation, sim, applyWeather, profile: () => renderer.profile(resolve(palette, light), light, t),
    season,
  };
}
