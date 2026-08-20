import { buildScene } from './scene/scene';
import { createRenderer } from './render/renderer';
import { createResolver } from './colour/resolve';
import { seasonPalette, dayOfYear } from './colour/season';
import { computeLight, blankLight } from './colour/light';
import { startLoop } from './core/loop';
import { SEED, DEFAULT_LOCATION } from './config';
import { installGrain } from './scene/layers/grain';
import { createRng } from './core/random';
import { sunPosition } from './astronomy/sun';
import { moonState } from './astronomy/moon';
import { createClock } from './time';
import { WindField } from './wind/field';

const params = new URLSearchParams(location.search);
const location_ = {
  lat: Number(params.get('lat') ?? DEFAULT_LOCATION.lat),
  lon: Number(params.get('lon') ?? DEFAULT_LOCATION.lon),
};

const clock = createClock(params);
const moon = moonState(clock.now(), location_.lat, location_.lon);
const sun = sunPosition(clock.now(), location_.lat, location_.lon);

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const layers = buildScene(SEED, moon).filter((l) => !params.has('skip') || !params.get('skip')!.split(',').some((n) => l.name.startsWith(n)));
const renderer = createRenderer(canvas, layers);
const resolve = createResolver();
installGrain(createRng(SEED));

// Step 2: weather is still fixed; light and season follow the scene clock.
const weather = {
  cloudCover: Number(params.get('cloud') ?? 0.35),
  fog: Number(params.get('fog') ?? 0.08),
  windSpeed: Number(params.get('wind') ?? 4),
  windDir: Number(params.get('dir') ?? 240),
  windGust: Number(params.get('gust') ?? NaN),
};
const wind = new WindField(createRng(SEED));
wind.configure(weather.windSpeed, weather.windDir, Number.isNaN(weather.windGust) ? weather.windSpeed * 1.6 : weather.windGust);
const light = blankLight();
const palette = seasonPalette(dayOfYear(clock.now()));
let t = 0;

startLoop({
  update(dt) {
    t += dt;
    wind.update(dt);
    for (const l of layers) l.update?.(dt, t, wind);
  },
  render(alpha) {
    const now = clock.now();
    sunPosition(now, location_.lat, location_.lon, sun);
    moonState(now, location_.lat, location_.lon, moon);
    seasonPalette(dayOfYear(now), palette);
    computeLight({
      sunElevation: sun.elevation, sunAzimuth: sun.azimuth,
      cloudCover: weather.cloudCover, fog: weather.fog,
      moonElevation: moon.elevation, moonFraction: moon.fraction,
    }, light);
    renderer.render(resolve(palette, light), light, t, alpha);
  },
});

if (import.meta.env.DEV) {
  import('./dev/devPanel').then((m) => m.installDevPanel(canvas, clock, () => ({ sun, moon, light })));
  (window as unknown as { __yonder: unknown }).__yonder = {
    layers, renderer, clock, wind, profile: () => renderer.profile(resolve(palette, light), light, t),
  };
}
