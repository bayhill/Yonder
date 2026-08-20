/**
 * Fixed-timestep simulation with interpolated rendering.
 * Pauses when the tab is hidden and resumes without a jump.
 */
export interface LoopCallbacks {
  update(dt: number): void;          // called at a fixed 1/60 s
  render(alpha: number, dt: number): void; // called once per displayed frame
}

export function startLoop(cb: LoopCallbacks, stepSeconds = 1 / 60) {
  let last = -1;
  let acc = 0;
  let raf = 0;
  let running = false;

  const frame = (nowMs: number) => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    if (last < 0) last = nowMs;
    let dt = (nowMs - last) / 1000;
    last = nowMs;
    if (dt > 0.1) dt = 0.1; // never let a stall turn into a leap
    acc += dt;
    let n = 0;
    while (acc >= stepSeconds && n < 8) {
      cb.update(stepSeconds);
      acc -= stepSeconds;
      n++;
    }
    cb.render(acc / stepSeconds, dt);
  };

  const start = () => {
    if (running) return;
    running = true;
    last = -1;
    raf = requestAnimationFrame(frame);
  };
  const stop = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  start();
  return { start, stop };
}
