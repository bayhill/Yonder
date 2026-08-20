import type { Location } from '../data/types';
import { geocode, type GeoResult } from '../data/openMeteo';

/**
 * The corner label: place name and time. Clicking the name opens a very quiet picker: a text
 * field and up to four results, geocoded by Open-Meteo.
 */
export function createLabel(parent: HTMLElement, hold: (on: boolean) => void, onLocation: (loc: Location) => void) {
  const box = document.createElement('div');
  box.style.cssText = 'position:absolute;left:max(20px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));pointer-events:auto;';
  const name = document.createElement('span');
  name.style.cssText = 'cursor:text;border-bottom:1px solid transparent;transition:border-color 300ms';
  name.title = 'Somewhere else';
  const time = document.createElement('span');
  time.style.cssText = 'margin-left:.7em;opacity:.8;font-variant-numeric:tabular-nums';
  const input = document.createElement('input');
  input.type = 'text'; input.placeholder = 'a place'; input.autocomplete = 'off'; input.spellcheck = false;
  input.style.cssText = 'display:none;font:inherit;color:inherit;background:none;border:0;border-bottom:1px solid currentColor;outline:0;padding:0 0 2px;width:14em;letter-spacing:inherit';
  const list = document.createElement('div');
  list.style.cssText = 'margin-top:6px;display:none';
  box.append(name, time, input, list);
  parent.appendChild(box);

  let ctrl: AbortController | null = null;
  function row(text: string, onPick: () => void) {
    const el = document.createElement('div');
    el.textContent = text;
    el.style.cssText = 'cursor:pointer;opacity:.75;padding:2px 0';
    el.addEventListener('mouseenter', () => (el.style.opacity = '1'));
    el.addEventListener('mouseleave', () => (el.style.opacity = '.75'));
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); onPick(); });
    return el;
  }
  function here() {
    if (!('geolocation' in navigator)) return;
    input.placeholder = '…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lon } = pos.coords;
        onLocation({ name: coordName(lat, lon), lat, lon });
        close();
      },
      () => { input.placeholder = 'a place'; },
      { maximumAge: 600e3, timeout: 8000 },
    );
  }
  function open() {
    name.style.display = 'none'; time.style.display = 'none';
    input.style.display = 'inline-block'; input.value = ''; input.placeholder = 'a place'; input.focus();
    list.innerHTML = '';
    if ('geolocation' in navigator) { list.appendChild(row('here', here)); list.style.display = 'block'; }
    hold(true);
  }
  function close() {
    input.style.display = 'none'; list.style.display = 'none'; list.innerHTML = '';
    name.style.display = ''; time.style.display = '';
    hold(false);
  }
  function choose(r: GeoResult) {
    onLocation({ name: r.name, lat: r.lat, lon: r.lon });
    close();
  }
  async function search(q: string) {
    ctrl?.abort(); ctrl = new AbortController();
    try {
      const results = await geocode(q, ctrl.signal);
      list.innerHTML = '';
      for (const r of results.slice(0, 4)) list.appendChild(row([r.name, r.admin1, r.country].filter(Boolean).join(', '), () => choose(r)));
      list.style.display = results.length ? 'block' : 'none';
      if (results.length === 1) choose(results[0]);
    } catch { /* keep the list as it was */ }
  }
  name.addEventListener('click', open);
  name.addEventListener('mouseenter', () => (name.style.borderBottomColor = 'currentColor'));
  name.addEventListener('mouseleave', () => (name.style.borderBottomColor = 'transparent'));
  input.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') close();
    if (e.key === 'Enter' && input.value.trim()) void search(input.value.trim());
  });
  input.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== input) close(); }, 150));

  const fmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
  const fmtDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return {
    setLocation(loc: Location) { name.textContent = loc.name; },
    /** Shows the time; adds the weekday when the scene is not "now". */
    setTime(d: Date, isNow: boolean) { time.textContent = isNow ? fmt.format(d) : fmtDay.format(d); },
  };
}

/** A quiet caption for an unnamed point: 59.8°N 18.7°E. */
export function coordName(lat: number, lon: number): string {
  return `${Math.abs(lat).toFixed(1)}°${lat >= 0 ? 'N' : 'S'} ${Math.abs(lon).toFixed(1)}°${lon >= 0 ? 'E' : 'W'}`;
}
