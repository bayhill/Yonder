/**
 * The scene clock. Scene time is wall time plus an offset, so the timeline (and dev scrubbing)
 * can move through the forecast while real time keeps flowing underneath.
 * Dev overrides: ?hour=13.5 (local hour today), ?doy=172 (day of year), ?time=ISO.
 */
export interface Clock {
  now(): Date;
  offsetMs: number;
  shift(ms: number): void;
  reset(): void;
}

export function createClock(params: URLSearchParams): Clock {
  let offsetMs = 0;
  const fixed = params.get('time');
  const hour = params.get('hour');
  const doy = params.get('doy');
  if (fixed) offsetMs = new Date(fixed).getTime() - Date.now();
  else if (hour !== null || doy !== null) {
    const d = new Date();
    if (doy !== null) { d.setMonth(0, 1); d.setDate(Number(doy)); }
    if (hour !== null) { const h = Number(hour); d.setHours(Math.floor(h), Math.round((h % 1) * 60), 0, 0); }
    offsetMs = d.getTime() - Date.now();
  }
  const clock: Clock = {
    get offsetMs() { return offsetMs; },
    set offsetMs(v: number) { offsetMs = v; },
    now: () => new Date(Date.now() + offsetMs),
    shift: (ms) => { offsetMs += ms; },
    reset: () => { offsetMs = 0; },
  };
  return clock;
}
