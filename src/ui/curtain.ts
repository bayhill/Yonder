/**
 * Arrival. The page opens on paper and the meadow comes up through it over a couple of seconds;
 * a change of place goes back to paper and returns. Never a cut.
 */
export function createCurtain() {
  const el = document.createElement('div');
  el.id = 'curtain';
  el.style.cssText = 'position:fixed;inset:0;z-index:5;pointer-events:none;background:#e7e2d6;opacity:1;transition:opacity 2200ms cubic-bezier(.4,0,.2,1)';
  document.body.appendChild(el);
  let raised = false;
  return {
    /** Lift the curtain (first frames are drawn underneath already). */
    raise(delayMs = 0) {
      if (raised) return; raised = true;
      setTimeout(() => { el.style.opacity = '0'; }, delayMs);
    },
    /** Paper in, do something, paper out. */
    async through(swap: () => void | Promise<void>) {
      el.style.transition = 'opacity 600ms cubic-bezier(.4,0,.2,1)';
      el.style.opacity = '1';
      await new Promise((r) => setTimeout(r, 650));
      await swap();
      await new Promise((r) => setTimeout(r, 250));
      el.style.transition = 'opacity 1800ms cubic-bezier(.4,0,.2,1)';
      el.style.opacity = '0';
    },
  };
}
