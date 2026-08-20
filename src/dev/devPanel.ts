/** Development-only helpers: FPS readout and a screenshot hotkey (S). Tree-shaken out of prod. */
export function installDevPanel(canvas: HTMLCanvasElement) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;left:8px;bottom:8px;font:11px/1 ui-monospace,monospace;color:#fff;opacity:.5;pointer-events:none;z-index:9';
  document.body.appendChild(el);
  let frames = 0, last = performance.now();
  const tick = () => {
    frames++;
    const now = performance.now();
    if (now - last >= 1000) { el.textContent = `${frames} fps`; frames = 0; last = now; }
    requestAnimationFrame(tick);
  };
  tick();
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
  });
}
