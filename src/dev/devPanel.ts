import type { Clock } from '../time';
import type { Light } from '../colour/light';
import type { SunState } from '../astronomy/sun';
import type { MoonState } from '../astronomy/moon';
import type { WeatherControls } from '../weather/controls';
import { dayOfYear } from '../colour/season';
import type { Accumulation } from '../weather/accumulation';

/**
 * Development-only control panel (tree-shaken out of production).
 *  `  toggle panel      S  save PNG      0  back to now
 *  [ ]  ±1 h (shift: 10 min)     { }  ±1 day
 * Every change is mirrored into the URL so a state can be shared as a link.
 */
export interface DevHooks {
  clock: Clock;
  weather: WeatherControls;
  /** Simulated seconds per real second (time-lapse for accumulation and the sun). */
  sim: { speed: number };
  accumulation: Accumulation;
  /** 'live' = Open-Meteo drives the weather; 'manual' = the sliders do. */
  source: { mode: 'live' | 'manual' };
  /** The smoothed live values, so the sliders can show the truth while live. */
  live: () => WeatherControls;
  store: () => { status: string; samples: number };
  onLive: () => void;
  /** Called after any weather change so dependents (wind field…) can reconfigure. */
  onWeather: () => void;
  state: () => { sun: SunState; moon: MoonState; light: Light };
}

export function installDevPanel(canvas: HTMLCanvasElement, hooks: DevHooks) {
  const { clock, weather, sim, accumulation, source } = hooks;
  // While live, the weather sliders read the live values; the first touch copies them into the
  // manual set and takes over from there, so nothing jumps.
  const cur = (): WeatherControls => (source.mode === 'live' ? hooks.live() : weather);
  const takeOver = () => { if (source.mode === 'live') Object.assign(weather, hooks.live()); };
  const root = document.createElement('div');
  root.style.cssText = [
    'position:fixed;left:10px;bottom:10px;z-index:9;width:250px;padding:10px 12px;border-radius:6px',
    'background:rgba(12,16,20,.62);backdrop-filter:blur(6px);color:#e8ecef',
    'font:11px/1.45 ui-monospace,Menlo,monospace;user-select:none',
  ].join(';');
  // Hidden state is remembered (and `?panel=0` / `?panel=1` overrides it), so the illustration
  // can be reviewed in dev without the panel coming back on every reload.
  const panelParam = new URLSearchParams(location.search).get('panel');
  const hidden = panelParam != null ? panelParam === '0' : localStorage.getItem('yonder:devpanel') === 'hidden';
  if (hidden) root.style.display = 'none';
  document.body.appendChild(root);

  const readout = document.createElement('div');
  readout.style.cssText = 'white-space:pre;opacity:.8;margin-bottom:8px;font-size:10.5px';
  root.appendChild(readout);

  const sliders: Array<() => void> = [];
  function slider(label: string, min: number, max: number, step: number, get: () => number, set: (v: number) => void, fmt = (v: number) => v.toFixed(step < 1 ? 2 : 0)) {
    const row = document.createElement('label');
    row.style.cssText = 'display:grid;grid-template-columns:44px 1fr 64px;gap:6px;align-items:center;margin:3px 0;cursor:pointer';
    const name = document.createElement('span'); name.textContent = label; name.style.opacity = '.75';
    const input = document.createElement('input');
    input.type = 'range'; input.min = String(min); input.max = String(max); input.step = String(step);
    input.style.cssText = 'width:100%;height:14px;accent-color:#9fb3a4;margin:0';
    const val = document.createElement('span'); val.style.cssText = 'text-align:right;opacity:.9';
    const refresh = () => { input.value = String(get()); val.textContent = fmt(get()); };
    input.addEventListener('input', () => { set(Number(input.value)); sliders.forEach((r) => r()); });
    row.append(name, input, val);
    root.appendChild(row);
    sliders.push(refresh);
    refresh();
  }
  function section(title: string) {
    const h = document.createElement('div');
    h.textContent = title;
    h.style.cssText = 'margin:8px 0 2px;letter-spacing:.08em;text-transform:uppercase;font-size:9.5px;opacity:.55';
    root.appendChild(h);
  }

  // --- time ---
  const localHour = () => { const d = clock.now(); return d.getHours() + d.getMinutes() / 60; };
  const localDoy = () => { const d = clock.now(); return Math.round(dayOfYear(new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))) + 1); };
  function setTime(hour: number, doy: number) {
    const d = new Date();
    d.setMonth(0, 1); d.setDate(doy);
    d.setHours(Math.floor(hour), Math.round((hour % 1) * 60), 0, 0);
    clock.offsetMs = d.getTime() - Date.now();
  }
  section('time');
  slider('hour', 0, 23.99, 0.05, localHour, (v) => setTime(v, localDoy()), (v) => `${String(Math.floor(v)).padStart(2, '0')}:${String(Math.round((v % 1) * 60)).padStart(2, '0')}`);
  slider('day', 1, 365, 1, localDoy, (v) => setTime(localHour(), v), (v) => {
    const d = new Date(); d.setMonth(0, 1); d.setDate(v);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  });
  slider('speed', 0, 3.56, 0.02, () => Math.log10(sim.speed), (v) => { sim.speed = Math.round(Math.pow(10, v)); }, (v) => `×${Math.round(Math.pow(10, v))}`);
  const nowBtn = document.createElement('button');
  nowBtn.textContent = 'now';
  nowBtn.style.cssText = 'margin:2px 0 0;padding:1px 8px;font:inherit;color:inherit;background:rgba(255,255,255,.1);border:0;border-radius:3px;cursor:pointer';
  nowBtn.addEventListener('click', () => { clock.reset(); sim.speed = 1; sliders.forEach((r) => r()); });
  root.appendChild(nowBtn);

  // --- source ---
  section('weather');
  const srcRow = document.createElement('div');
  srcRow.style.cssText = 'display:flex;gap:6px;align-items:center;margin:2px 0 4px';
  const liveBtn = document.createElement('button');
  liveBtn.textContent = 'live';
  liveBtn.style.cssText = nowBtn.style.cssText;
  liveBtn.addEventListener('click', () => { hooks.onLive(); clearWeatherUrl(); sliders.forEach((r) => r()); });
  // A link to the current state is made on request, never behind your back: a URL with weather
  // in it reopens in manual mode, which is confusing when you did not ask for it.
  const linkBtn = document.createElement('button');
  linkBtn.textContent = 'link';
  linkBtn.title = 'Put the current time and weather into the URL (reopens in manual mode)';
  linkBtn.style.cssText = nowBtn.style.cssText;
  linkBtn.addEventListener('click', () => { syncUrl(); void navigator.clipboard?.writeText(location.href); linkBtn.textContent = 'copied'; setTimeout(() => (linkBtn.textContent = 'link'), 1200); });
  const srcInfo = document.createElement('span');
  srcInfo.style.cssText = 'opacity:.7';
  srcRow.append(liveBtn, linkBtn, srcInfo);
  root.appendChild(srcRow);

  // --- sky ---
  section('sky');
  slider('cloud', 0, 1, 0.01, () => cur().cloudCover, (v) => { takeOver(); weather.cloudCover = v; hooks.onWeather(); });
  slider('fog', 0, 1, 0.01, () => cur().fog, (v) => { takeOver(); weather.fog = v; hooks.onWeather(); });

  // --- wind ---
  section('wind');
  slider('speed', 0, 25, 0.1, () => cur().windSpeed, (v) => { takeOver(); weather.windSpeed = v; if (weather.windGust < v) weather.windGust = v; hooks.onWeather(); }, (v) => `${v.toFixed(1)} m/s`);
  slider('gust', 0, 35, 0.1, () => cur().windGust, (v) => { takeOver(); weather.windGust = Math.max(v, weather.windSpeed); hooks.onWeather(); }, (v) => `${v.toFixed(1)} m/s`);
  slider('from', 0, 359, 1, () => cur().windDir, (v) => { takeOver(); weather.windDir = v; hooks.onWeather(); }, (v) => `${v.toFixed(0)}° ${compass(v)}`);

  // --- precipitation (Step 6) ---
  section('precipitation');
  slider('rain', 0, 10, 0.1, () => cur().rain, (v) => { takeOver(); weather.rain = v; hooks.onWeather(); }, (v) => `${v.toFixed(1)} mm/h`);
  slider('snow', 0, 10, 0.1, () => cur().snow, (v) => { takeOver(); weather.snow = v; hooks.onWeather(); }, (v) => `${v.toFixed(1)} mm/h`);
  slider('thunder', 0, 1, 0.05, () => cur().thunder, (v) => { takeOver(); weather.thunder = v; hooks.onWeather(); });
  slider('humid', 0, 1, 0.01, () => cur().humidity, (v) => { takeOver(); weather.humidity = v; hooks.onWeather(); }, (v) => `${Math.round(v * 100)} %`);
  slider('temp', -25, 32, 0.5, () => cur().temperature, (v) => { takeOver(); weather.temperature = v; hooks.onWeather(); }, (v) => `${v.toFixed(1)} °C`);

  const help = document.createElement('div');
  help.textContent = '`  hide    S  screenshot    [ ]  ±1h    { }  ±1d    0  now';
  help.style.cssText = 'margin-top:8px;opacity:.45;font-size:9.5px';
  root.appendChild(help);

  function clearWeatherUrl() {
    const p = new URLSearchParams(location.search);
    for (const k of ['cloud', 'fog', 'wind', 'gust', 'dir', 'rain', 'snow', 'temp', 'hum', 'thunder', 'hour', 'doy', 'time']) p.delete(k);
    history.replaceState(null, '', `${location.pathname}${p.size ? '?' + p.toString() : ''}`);
  }
  function syncUrl() {
    const p = new URLSearchParams(location.search);
    const set = (k: string, v: number, d: number, digits = 2) => (Math.abs(v - d) < 1e-9 ? p.delete(k) : p.set(k, String(+v.toFixed(digits))));
    set('cloud', weather.cloudCover, 0.35); set('fog', weather.fog, 0.08);
    set('wind', weather.windSpeed, 4, 1); set('gust', weather.windGust, 6.5, 1); set('dir', weather.windDir, 240, 0);
    set('rain', weather.rain, 0, 1); set('snow', weather.snow, 0, 1); set('temp', weather.temperature, 16, 1); set('hum', weather.humidity, 0.7); set('thunder', weather.thunder, 0);
    p.delete('hour'); p.delete('doy');
    if (clock.offsetMs !== 0) p.set('time', clock.now().toISOString()); else p.delete('time');
    history.replaceState(null, '', `${location.pathname}${p.size ? '?' + p.toString() : ''}`);
  }

  // --- readout + fps ---
  let frames = 0, last = performance.now(), fps = 0;
  const tick = () => {
    frames++;
    const now = performance.now();
    if (now - last >= 1000) { fps = frames; frames = 0; last = now; }
    const { sun, moon, light } = hooks.state();
    const d = clock.now();
    readout.textContent = `${fps} fps   ${d.toLocaleString('sv-SE')}\nsun ${sun.elevation.toFixed(1)}° @${sun.azimuth.toFixed(0)}°   moon ${moon.elevation.toFixed(0)}° ${(moon.fraction * 100).toFixed(0)}%\nbright ${light.brightness.toFixed(2)}  warm ${light.warmth.toFixed(2)}  dark ${light.skyDark.toFixed(2)}\nsnow cover ${(accumulation.snow * 100).toFixed(0)}%   wet ${(accumulation.wet * 100).toFixed(0)}%`;
    const st = hooks.store();
    srcInfo.textContent = source.mode === 'live' ? `live · ${st.status} · ${st.samples} h · sliders mirror` : `manual (sliders) · data ${st.status}`;
    liveBtn.style.opacity = source.mode === 'live' ? '.45' : '1';
    liveBtn.style.outline = source.mode === 'manual' ? '1px solid #d9b36a' : '';
    if (frames % 15 === 0) (source.mode === 'live' ? sliders : sliders.slice(0, 2)).forEach((r) => r()); // time (and, while live, weather) sliders follow the scene
    requestAnimationFrame(tick);
  };
  tick();

  const H = 3600e3;
  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (e.key === '`') { const hide = root.style.display !== 'none'; root.style.display = hide ? 'none' : ''; localStorage.setItem('yonder:devpanel', hide ? 'hidden' : 'shown'); }
    if (e.key === 's' || e.key === 'S') {
      canvas.toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `yonder-${Date.now()}.png`;
        a.click();
      });
    }
    if (e.key === '[') clock.shift(e.shiftKey ? -H / 6 : -H);
    if (e.key === ']') clock.shift(e.shiftKey ? H / 6 : H);
    if (e.key === '{') clock.shift(-24 * H);
    if (e.key === '}') clock.shift(24 * H);
    if (e.key === '0') clock.reset();
  });
}

function compass(deg: number): string {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];
}
