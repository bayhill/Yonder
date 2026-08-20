import type { Clock } from '../time';
import type { Light } from '../colour/light';
import type { SunState } from '../astronomy/sun';
import type { MoonState } from '../astronomy/moon';

/**
 * Development-only helpers (tree-shaken out of production):
 *  S  save a PNG of the canvas        [ / ]  step scene time −/+ 1 h (shift: 10 min)
 *  0  back to now                     { / }  step −/+ 1 day
 */
export function installDevPanel(canvas: HTMLCanvasElement, clock: Clock, state: () => { sun: SunState; moon: MoonState; light: Light }) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:8px;bottom:8px;font:11px/1.5 ui-monospace,monospace;color:#fff;opacity:.55;pointer-events:none;z-index:9;white-space:pre;text-shadow:0 0 3px rgba(0,0,0,.6)';
  document.body.appendChild(el);
  let frames = 0, last = performance.now(), fps = 0;
  const tick = () => {
    frames++;
    const now = performance.now();
    if (now - last >= 1000) { fps = frames; frames = 0; last = now; }
    const { sun, moon, light } = state();
    const d = clock.now();
    el.textContent = `${fps} fps  ${d.toLocaleString('sv-SE')}\nsun ${sun.elevation.toFixed(1)}° @${sun.azimuth.toFixed(0)}°  moon ${moon.elevation.toFixed(0)}° ${(moon.fraction * 100).toFixed(0)}%\nbright ${light.brightness.toFixed(2)} warm ${light.warmth.toFixed(2)} dark ${light.skyDark.toFixed(2)}`;
    requestAnimationFrame(tick);
  };
  tick();
  const H = 3600e3;
  window.addEventListener('keydown', (e) => {
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
