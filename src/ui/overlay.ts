/**
 * Zero chrome by default. The overlay (corner label + timeline) fades in over 400 ms when the
 * pointer moves or the screen is touched, and out after 3 s of stillness. Text is a caption on
 * a print: one light typeface, small, low contrast, tinted against the current sky.
 */
export function createOverlay(root: HTMLElement) {
  root.innerHTML = '';
  root.style.cssText = 'position:fixed;inset:0;pointer-events:none;opacity:0;transition:opacity 400ms ease;' +
    'font:300 13px/1.4 "Helvetica Neue",Inter,system-ui,sans-serif;letter-spacing:.02em;color:var(--ink,rgba(255,255,255,.72))';
  let shown = false, hideAt = 0, held = 0;
  const show = () => { shown = true; root.style.opacity = '1'; hideAt = performance.now() + 3000; };
  const tick = () => {
    if (shown && held === 0 && performance.now() > hideAt) { shown = false; root.style.opacity = '0'; }
    requestAnimationFrame(tick);
  };
  tick();
  window.addEventListener('pointermove', show, { passive: true });
  window.addEventListener('pointerdown', show, { passive: true });
  window.addEventListener('touchstart', show, { passive: true });
  window.addEventListener('keydown', show);
  return {
    root,
    show,
    /** Keep the overlay visible while something is being interacted with (drag, typing). */
    hold(on: boolean) { held += on ? 1 : -1; if (held < 0) held = 0; if (!on) show(); },
    /** Ink colour follows scene brightness: dark caption by day, pale by night. */
    setInk(brightness: number) {
      const day = Math.min(1, Math.max(0, (brightness - 0.35) / 0.45));
      root.style.setProperty('--ink', day > 0.5 ? `rgba(18,26,32,${0.38 + 0.2 * day})` : `rgba(240,244,246,${0.5 + 0.25 * (1 - day)})`);
    },
  };
}
