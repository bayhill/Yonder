/**
 * One place for prefers-reduced-motion. Motion is reduced, never removed: the scene must still
 * breathe (brief §7). Layers multiply their speeds by `motionScale()`.
 */
let scale = 1;
if (typeof matchMedia === 'function') {
  const mq = matchMedia('(prefers-reduced-motion: reduce)');
  const apply = () => { scale = mq.matches ? 0.35 : 1; };
  apply();
  mq.addEventListener?.('change', apply);
}
export const motionScale = () => scale;
