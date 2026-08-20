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
  function open() {
    name.style.display = 'none'; time.style.display = 'none';
    input.style.display = 'inline-block'; input.value = ''; input.focus();
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
      for (const r of results.slice(0, 4)) {
        const row = document.createElement('div');
        row.textContent = [r.name, r.admin1, r.country].filter(Boolean).join(', ');
        row.style.cssText = 'cursor:pointer;opacity:.75;padding:2px 0';
        row.addEventListener('mouseenter', () => (row.style.opacity = '1'));
        row.addEventListener('mouseleave', () => (row.style.opacity = '.75'));
        row.addEventListener('click', () => choose(r));
        list.appendChild(row);
      }
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
  input.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== input && list.style.display === 'none') close(); }, 150));

  const fmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
  const fmtDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });
  return {
    setLocation(loc: Location) { name.textContent = loc.name; },
    /** Shows the time; adds the weekday when the scene is not "now". */
    setTime(d: Date, isNow: boolean) { time.textContent = isNow ? fmt.format(d) : fmtDay.format(d); },
  };
}
