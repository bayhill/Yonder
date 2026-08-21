import { buildScene } from './scene/scene';
import { createRenderer } from './render/renderer';
import { createResolver } from './colour/resolve';
import { seasonPalette, seasonParams, dayOfYear } from './colour/season';
import { computeLight, blankLight } from './colour/light';
import { startLoop } from './core/loop';
import { SEED, DEFAULT_LOCATION, REFRESH_MINUTES } from './config';
import { installGrain } from './scene/layers/grain';
import { createRng } from './core/random';
import { sunPosition } from './astronomy/sun';
import { moonState } from './astronomy/moon';
import { createClock } from './time';
import { WindField } from './wind/field';
import { weatherFromParams, type WeatherControls } from './weather/controls';
import { SmoothedWeather } from './weather/smoothed';
import { Accumulation } from './weather/accumulation';
import { controlsFromSample } from './weather/state';
import { buildTrack, trackAt, type AccumulationTrack } from './weather/track';
import { mistAmount } from './weather/mist';
import { frostAmount } from './weather/frost';
import { sampleAt, blank as blankSample } from './data/interpolate';
import { createWeatherStore } from './data/store';
import type { Location, WeatherSeries } from './data/types';
import type { FrameWeather } from './scene/layer';
import { createOverlay } from './ui/overlay';
import { createLabel } from './ui/label';
import { createTimeline } from './ui/timeline';
import { createBrowserChrome } from './ui/chrome';
import { describeScene } from './ui/describe';
import { createCurtain } from './ui/curtain';
import { createTemperature } from './ui/temperature';

const params = new URLSearchParams(location.search);
const place: Location = {
  name: params.get('name') ?? (params.has('lat') ? `${Number(params.get('lat')).toFixed(2)}, ${Number(params.get('lon')).toFixed(2)}` : DEFAULT_LOCATION.name),
  lat: Number(params.get('lat') ?? DEFAULT_LOCATION.lat),
  lon: Number(params.get('lon') ?? DEFAULT_LOCATION.lon),
};

// --- time ---
const clock = createClock(params);
const moon = moonState(clock.now(), place.lat, place.lon);
const sun = sunPosition(clock.now(), place.lat, place.lon);

// --- weather: live data drives the targets unless the dev panel takes over ---
const manual = weatherFromParams(params);            // dev/URL overrides
const source = { mode: (params.has('cloud') || params.has('wind') || params.has('rain') || params.has('snow') || params.has('temp') || params.has('fog')) ? 'manual' : 'live' as 'live' | 'manual' };
const target: WeatherControls = { ...manual };
const smoothed = new SmoothedWeather(target);
const accumulation = new Accumulation();              // manual mode integrates live
const sim = { speed: 1 };
const wind = new WindField(createRng(SEED));
const frameWeather: FrameWeather = { rain: 0, snow: 0, temperature: 15, fog: 0, cloudCover: 0, snowCover: 0, wet: 0, frost: 0 };

let series: WeatherSeries | null = null;
let track: AccumulationTrack | null = null;
const sampleBuf = blankSample();
const trackBuf = { snow: 0, wet: 0 };
let scrubUntil = 0;                                    // smoothing is fast while scrubbing

// Back from a long sleep: the sun has already moved, so the weather should simply be right too.
let hiddenAt = 0;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { hiddenAt = Date.now(); return; }
  if (hiddenAt && Date.now() - hiddenAt > 10 * 60e3) { updateTargets(clock.now().getTime()); smoothed.snap(); syncAccumulation(true); }
});

const store = createWeatherStore(REFRESH_MINUTES, (s) => {
  const first = !series;
  series = s;
  track = buildTrack(s);
  if (first && source.mode === 'live') { updateTargets(clock.now().getTime()); smoothed.snap(); syncAccumulation(true); }
  if (first) curtain.raise(150);
});
setTimeout(() => curtain.raise(), 1500);   // no data yet (offline, first visit): arrive anyway

function updateTargets(time: number) {
  if (source.mode === 'manual' || !series) { Object.assign(target, manual); return; }
  sampleAt(series.samples, time, sampleBuf);
  controlsFromSample(sampleBuf, target);
}
function syncAccumulation(snap = false) {
  if (!track || source.mode === 'manual') return;
  trackAt(track, clock.now().getTime(), trackBuf);
  if (snap) { accumulation.snow = trackBuf.snow; accumulation.wet = trackBuf.wet; }
}

// --- scene ---
const canvas = document.getElementById('scene') as HTMLCanvasElement;
const layers = buildScene(SEED, moon, () => smoothed.value.cloudCover).filter((l) => !params.has('skip') || !params.get('skip')!.split(',').some((n) => l.name.startsWith(n)));
const renderer = createRenderer(canvas, layers);
const resolve = createResolver();
installGrain(createRng(SEED));

// --- ui ---
const curtain = createCurtain();
const overlay = createOverlay(document.getElementById('overlay') as HTMLElement);
const label = createLabel(overlay.root, overlay.hold, (loc) => setPlace(loc));
const temperature = createTemperature(document.body);
overlay.onVisible((on) => temperature.raise(on));
const sunProbe = { elevation: 0, azimuth: 0 };
createTimeline(overlay.root, clock, overlay.hold, () => { scrubUntil = performance.now() + 2500; }, (time) => sunPosition(new Date(time), place.lat, place.lon, sunProbe).elevation);
label.setLocation(place);
const browserChrome = createBrowserChrome();

function setPlace(loc: Location) {
  void curtain.through(() => applyPlace(loc));
}
function applyPlace(loc: Location) {
  Object.assign(place, loc);
  const p = new URLSearchParams(location.search);
  p.set('lat', loc.lat.toFixed(3)); p.set('lon', loc.lon.toFixed(3)); p.set('name', loc.name);
  history.replaceState(null, '', `${location.pathname}?${p}`);
  label.setLocation(loc);
  document.title = `Yonder · ${loc.name}`;
  series = null; track = null;
  store.setLocation(loc);
}
store.setLocation(place);
document.title = `Yonder · ${place.name}`;
canvas.setAttribute('role', 'img');
let describedAt = 0;

// --- loop ---
const light = blankLight();
const palette = seasonPalette(dayOfYear(clock.now()));
const season = seasonParams(dayOfYear(clock.now()));
let t = 0;

const loopCb = {
  update(dt: number) {
    t += dt;
    if (sim.speed !== 1) clock.shift((sim.speed - 1) * dt * 1000);
    const now = clock.now().getTime();
    updateTargets(now);
    // Minutes for weather arriving on its own; about a second when the viewer moves time.
    smoothed.tau = performance.now() < scrubUntil ? 0.9 : source.mode === 'live' ? 90 : 1.5;
    smoothed.step(dt);
    const w = smoothed.value;
    wind.configure(w.windSpeed, w.windDir, w.windGust);
    wind.update(dt);
    if (source.mode === 'live' && track) {
      // Accumulated state follows the precomputed track, smoothed like everything else.
      trackAt(track, now, trackBuf);
      const k = 1 - Math.exp(-dt / (performance.now() < scrubUntil ? 0.9 : 20));
      accumulation.snow += (trackBuf.snow - accumulation.snow) * k;
      accumulation.wet += (trackBuf.wet - accumulation.wet) * k;
    } else {
      accumulation.step((dt * sim.speed) / 3600, w);
    }
    frameWeather.rain = w.rain; frameWeather.snow = w.snow; frameWeather.temperature = w.temperature;
    frameWeather.fog = Math.min(1, w.fog + mistAmount(w.humidity, w.windSpeed, w.cloudCover, sun.elevation));
    frameWeather.cloudCover = w.cloudCover;
    frameWeather.snowCover = accumulation.snow; frameWeather.wet = accumulation.wet;
    // Frost settles and lifts over tens of minutes, not instantly.
    frameWeather.frost += (frostAmount(w.temperature, w.humidity, w.windSpeed, w.cloudCover, sun.elevation) - frameWeather.frost) * (1 - Math.exp(-dt / (performance.now() < scrubUntil ? 0.9 : source.mode === 'live' ? 600 : 2)));
    for (const l of layers) l.update?.(dt, t, wind);
  },
  render(alpha: number) {
    const now = clock.now();
    sunPosition(now, place.lat, place.lon, sun);
    moonState(now, place.lat, place.lon, moon);
    const doy = dayOfYear(now);
    seasonPalette(doy, palette);
    seasonParams(doy, season);
    const w = smoothed.value;
    computeLight({
      sunElevation: sun.elevation, sunAzimuth: sun.azimuth,
      cloudCover: w.cloudCover, fog: frameWeather.fog,
      moonElevation: moon.elevation, moonFraction: moon.fraction,
      precip: 1 - Math.exp(-(w.rain + w.snow * 0.7) / 3),
      wet: accumulation.wet, snowCover: Math.min(1, accumulation.snow),
    }, light);
    const colours = resolve(palette, light);
    renderer.render(colours, light, t, alpha, season, frameWeather);
    browserChrome.update(colours.version, colours.sky, colours.hex('grassFar'), colours.atmos('farTreeline', 0.7));
    overlay.setInk(light.brightness * (1 - light.skyDark * 0.6));
    label.setTime(now, clock.offsetMs < 60e3);
    temperature.set(w.temperature);
    if (performance.now() - describedAt > 60e3) { describedAt = performance.now(); canvas.setAttribute('aria-label', describeScene(place.name, now, w, sun.elevation, accumulation.snow)); }
  },
};
startLoop(loopCb);

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* offline shell is optional */ }); });
}

if (import.meta.env.DEV) {
  import('./dev/devPanel').then((m) => m.installDevPanel(canvas, {
    clock, weather: manual, sim, accumulation, source, live: () => smoothed.value, store: () => ({ status: store.status, samples: series?.samples.length ?? 0 }),
    onWeather: () => { source.mode = 'manual'; },
    onLive: () => { source.mode = 'live'; updateTargets(clock.now().getTime()); syncAccumulation(true); },
    state: () => ({ sun, moon, light }),
  }));
  (window as unknown as { __yonder: unknown }).__yonder = {
    layers, renderer, clock, wind, weather: manual, smoothed, accumulation, sim, source, store, frameWeather, get series() { return series; },
    profile: () => renderer.profile(resolve(palette, light), light, t), season,
    /** Dev: advance the whole scene n fixed steps and draw once (for hidden tabs where rAF is paused). */
    step: (n = 1) => { for (let i = 0; i < n; i++) loopCb.update(1 / 60); loopCb.render(1); },
  };
}
