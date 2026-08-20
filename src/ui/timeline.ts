import type { Clock } from '../time';

const H = 3600e3;

/**
 * The timeline: a thin line along the bottom edge with a marker and a small time label.
 * Dragging moves the scene through the next 48 hours; releasing returns to now after a few
 * seconds of stillness, or stays if the viewer taps the marker to lock. ←/→ step one hour
 * (and lock); Escape or 0 returns to now. The word "forecast" appears nowhere.
 */
export function createTimeline(parent: HTMLElement, clock: Clock, hold: (on: boolean) => void, onScrub: (scrubbing: boolean) => void, sunElevationAt: (time: number) => number, range = 48 * H) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:absolute;left:max(24px,env(safe-area-inset-left));right:max(24px,env(safe-area-inset-right));bottom:max(22px,env(safe-area-inset-bottom));height:28px;pointer-events:auto;cursor:ew-resize;touch-action:none';
  const line = document.createElement('div');
  line.style.cssText = 'position:absolute;left:0;right:0;top:14px;height:1px;background:currentColor;opacity:.9';
  const marker = document.createElement('div');
  marker.style.cssText = 'position:absolute;top:10px;width:9px;height:9px;margin-left:-4.5px;border-radius:50%;background:currentColor;opacity:.85;transition:transform 200ms';
  // Midnights as hairline ticks, so the two days ahead have a shape without a single word.
  const ticks = document.createElement('div');
  ticks.style.cssText = 'position:absolute;left:0;right:0;top:11px;height:7px;pointer-events:none';
  const label = document.createElement('div');
  label.style.cssText = 'position:absolute;top:-18px;transform:translateX(-50%);white-space:nowrap;font-size:12px;opacity:.8;font-variant-numeric:tabular-nums';
  wrap.append(line, ticks, marker, label);
  parent.appendChild(wrap);

  let locked = false, dragging = false, returnAt = 0;
  const fmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' });

  const frac = () => Math.min(1, Math.max(0, clock.offsetMs / range));
  let tickDay = -1;
  function renderTicks() {
    const base = Date.now();
    const d = new Date(base);
    if (d.getDate() === tickDay) return;
    tickDay = d.getDate();
    // The line itself carries the days: full where the sun is up, faint through the nights.
    const stops: string[] = [];
    const N = 96;
    for (let i = 0; i <= N; i++) {
      const el = sunElevationAt(base + (i / N) * range);
      const a = 0.12 + 0.33 * Math.min(1, Math.max(0, (el + 6) / 12));
      stops.push(`rgba(0,0,0,${a.toFixed(2)}) ${((i / N) * 100).toFixed(1)}%`);
    }
    const mask = `linear-gradient(to right, ${stops.join(',')})`;
    line.style.setProperty('-webkit-mask-image', mask); line.style.setProperty('mask-image', mask);
    ticks.innerHTML = '';
    d.setHours(24, 0, 0, 0);
    for (let t = d.getTime(); t < base + range; t += 24 * H) {
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;left:${((t - base) / range) * 100}%;top:0;width:1px;height:7px;background:currentColor;opacity:.45`;
      ticks.appendChild(el);
    }
  }
  function render() {
    renderTicks();
    const f = frac();
    marker.style.left = `${f * 100}%`;
    label.style.left = `${f * 100}%`;
    label.style.transform = f > 0.94 ? 'translateX(-100%)' : f < 0.04 ? 'none' : 'translateX(-50%)';
    label.textContent = clock.offsetMs < 60e3 ? '' : fmt.format(clock.now());
    marker.style.transform = locked ? 'scale(1.35)' : '';
  }
  function setFrac(f: number) {
    clock.offsetMs = Math.round(Math.min(1, Math.max(0, f)) * range / (15 * 60e3)) * 15 * 60e3; // 15-minute steps
    render();
  }
  function scheduleReturn() { returnAt = locked ? 0 : performance.now() + 5000; }

  wrap.addEventListener('pointerdown', (e) => {
    dragging = true; wrap.setPointerCapture(e.pointerId); hold(true); onScrub(true);
    const r = wrap.getBoundingClientRect();
    const near = Math.abs(e.clientX - (r.left + frac() * r.width)) < 14;
    if (near && clock.offsetMs > 0) { locked = !locked; }  // tap the marker to lock / unlock
    else setFrac((e.clientX - r.left) / r.width);
  });
  wrap.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const r = wrap.getBoundingClientRect();
    setFrac((e.clientX - r.left) / r.width);
  });
  const up = () => { if (!dragging) return; dragging = false; hold(false); scheduleReturn(); render(); };
  wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);

  window.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      onScrub(true);
      clock.offsetMs = Math.min(range, Math.max(0, clock.offsetMs + (e.key === 'ArrowRight' ? H : -H)));
      locked = clock.offsetMs > 0;
      render();
    }
    if (e.key === 'Escape') { locked = false; clock.reset(); onScrub(true); render(); }
  });

  let lastOffset = clock.offsetMs;
  const tick = () => {
    if (!dragging && !locked && returnAt && performance.now() > returnAt) {
      returnAt = 0; clock.reset(); onScrub(true); render();
    }
    if (clock.offsetMs !== lastOffset) { lastOffset = clock.offsetMs; render(); } // time moved elsewhere (keys, dev)
    requestAnimationFrame(tick);
  };
  tick();
  render();
  return { render, get locked() { return locked; } };
}
