/**
 * The one number a weather view owes its viewer: the temperature, top right. Set like a caption
 * on a print — a light numeral and a hairline gauge beside it, -20 to +30 with a tick at zero.
 * Always present at low contrast; it rises with the rest of the overlay when the pointer moves.
 */
export function createTemperature(parent: HTMLElement) {
  const box = document.createElement('div');
  box.style.cssText = 'position:fixed;right:max(22px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));' +
    'display:flex;align-items:flex-start;gap:10px;pointer-events:none;color:var(--ink,rgba(255,255,255,.72));' +
    'font:200 26px/1 "Helvetica Neue",Inter,system-ui,sans-serif;letter-spacing:-.01em;font-variant-numeric:tabular-nums;' +
    'opacity:.55;transition:opacity 400ms ease';
  const num = document.createElement('span');
  num.style.cssText = 'display:inline-block;min-width:2.2ch;text-align:right;margin-top:6px';
  const gauge = document.createElement('div');
  gauge.style.cssText = 'position:relative;width:9px;height:44px';
  const line = document.createElement('div');
  line.style.cssText = 'position:absolute;left:4px;top:0;bottom:0;width:1px;background:currentColor;opacity:.45';
  const zero = document.createElement('div');
  zero.style.cssText = 'position:absolute;left:2px;width:5px;height:1px;background:currentColor;opacity:.5';
  const dot = document.createElement('div');
  dot.style.cssText = 'position:absolute;left:1.5px;width:6px;height:6px;margin-top:-3px;border-radius:50%;background:currentColor;transition:top 1200ms cubic-bezier(.4,0,.2,1)';
  gauge.append(line, zero, dot);
  box.append(num, gauge);
  parent.appendChild(box);
  const LO = -20, HI = 30;
  const pos = (t: number) => `${(1 - (Math.min(HI, Math.max(LO, t)) - LO) / (HI - LO)) * 100}%`;
  zero.style.top = pos(0);
  let last = '';
  return {
    set(celsius: number) {
      const r = Math.round(celsius);
      const text = `${r === 0 ? 0 : r}°`;  // never "-0°"
      if (text !== last) { last = text; num.textContent = text; }
      dot.style.top = pos(celsius);
    },
    /** Full contrast while the overlay is shown, quiet otherwise. */
    raise(on: boolean) { box.style.opacity = on ? '.95' : '.55'; },
  };
}
