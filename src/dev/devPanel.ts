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
  /** Called after any weather change so dependents (wind field…) can reconfigure. */
  onWeather: () => void;
  state: () => { sun: SunState; moon: MoonState; light: Light };
}

export function installDevPanel(canvas: HTMLCanvasElement, hooks: DevHooks) {
  const { clock, weather, sim, accumulation } = hooks;
  const root = document.createElement('div');
  root.style.cssText = [
    'position:fixed;left:10px;bottom:10px;z-index:9;width:250px;padding:10px 12px;border-radius:6px',
    'background:rgba(12,16,20,.62);backdrop-filter:blur(6px);color:#e8ecef',
    'font:11px/1.45 ui-monospace,Menlo,monospace;user-select:none',
  ].join(';');
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
    input.addEventListener('input', () => { set(Number(input.value)); sliders.forEach((r) => r()); syncUrl(); });
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
  nowBtn.addEventListener('click', () => { clock.reset(); sim.speed = 1; sliders.forEach((r) => r()); syncUrl(); });
  root.appendChild(nowBtn);

  // --- sky ---
  section('sky');
  slider('cloud', 0, 1, 0.01, () => weather.cloudCover, (v) => { weather.cloudCover = v; hooks.onWeather(); });
  slider('fog', 0, 1, 0.01, () => weather.fog, (v) => { weather.fog = v; hooks.onWeather(); });

  // --- wind ---
  section('wind');
  slider('speed', 0, 25, 0.1, () => weather.windSpeed, (v) => { weather.windSpeed = v; if (weather.windGust < v) weather.windGust = v; hooks.onWeather(); }, (v) => `${v.toFixed(1)} m/s`);
  slider('gust', 0, 35, 0.1, () => weather.windGust, (v) => { weather.windGust = Math.max(v, weather.windSpeed); hooks.onWeather(); }, (v) => `${v.toFixed(1)} m/s`);
  slider('from', 0, 359, 1, () => weather.windDir, (v) => { weather.windDir = v; hooks.onWeather(); }, (v) => `${v.toFixed(0)}° ${compass(v)}`);

  // --- precipitation (Step 6) ---
  section('precipitation');
  slider('rain', 0, 10, 0.1, () => weather.rain, (v) => { weather.rain = v; hooks.onWeather(); }, (v) => `${v.toFixed(1)} mm/h`);
  slider('snow', 0, 10, 0.1, () => weather.snow, (v) => { weather.snow = v; hooks.onWeather(); }, (v) => `${v.toFixed(1)} mm/h`);
  slider('temp', -25, 32, 0.5, () => weather.temperature, (v) => { weather.temperature = v; hooks.onWeather(); }, (v) => `${v.toFixed(1)} °C`);

  const help = document.createElement('div');
  help.textContent = '`  hide    S  screenshot    [ ]  ±1h    { }  ±1d    0  now';
  help.style.cssText = 'margin-top:8px;opacity:.45;font-size:9.5px';
  root.appendChild(help);

  function syncUrl() {
    const p = new URLSearchParams(location.search);
    const set = (k: string, v: number, d: number, digits = 2) => (Math.abs(v - d) < 1e-9 ? p.delete(k) : p.set(k, String(+v.toFixed(digits))));
    set('cloud', weather.cloudCover, 0.35); set('fog', weather.fog, 0.08);
    set('wind', weather.windSpeed, 4, 1); set('gust', weather.windGust, 6.5, 1); set('dir', weather.windDir, 240, 0);
    set('rain', weather.rain, 0, 1); set('snow', weather.snow, 0, 1); set('temp', weather.temperature, 16, 1);
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
    if (frames % 15 === 0) sliders.slice(0, 2).forEach((r) => r()); // time sliders follow the clock
    requestAnimationFrame(tick);
  };
  tick();

  const H = 3600e3;
  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (e.key === '`') root.style.display = root.style.display === 'none' ? '' : 'none';
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
    if ('[]{}0'.includes(e.key)) syncUrl();
  });
}

function compass(deg: number): string {
  return ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(deg / 45) % 8];
}
