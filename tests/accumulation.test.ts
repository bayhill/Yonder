import { describe, it, expect } from 'vitest';
import { Accumulation } from '../src/weather/accumulation';
import { DEFAULT_WEATHER } from '../src/weather/controls';

const run = (acc: Accumulation, hours: number, w: Partial<typeof DEFAULT_WEATHER>) => {
  const full = { ...DEFAULT_WEATHER, ...w };
  for (let i = 0; i < hours * 60; i++) acc.step(1 / 60, full);
  return acc;
};

describe('accumulation', () => {
  it('snow builds below freezing and closes to a blanket after a long fall', () => {
    const a = run(new Accumulation(), 3, { snow: 1.5, temperature: -4 });
    expect(a.snow).toBeGreaterThan(0.3);
    expect(a.snow).toBeLessThan(0.5);
    run(a, 12, { snow: 1.5, temperature: -4 });
    expect(a.snow).toBeGreaterThan(1);
  });
  it('snow melts over hours above freezing, faster when it rains', () => {
    const a = run(new Accumulation(), 10, { snow: 1.5, temperature: -4 });
    const start = a.snow;
    run(a, 6, { snow: 0, temperature: 5 });
    expect(a.snow).toBeLessThan(start * 0.6);
    expect(a.snow).toBeGreaterThan(0);
    const b = run(new Accumulation(), 10, { snow: 1.5, temperature: -4 });
    run(b, 6, { snow: 0, rain: 3, temperature: 5 });
    expect(b.snow).toBeLessThan(a.snow);
  });
  it('rain wets the ground and it dries again', () => {
    const a = run(new Accumulation(), 2, { rain: 2, temperature: 12 });
    expect(a.wet).toBeGreaterThan(0.6);
    run(a, 10, { rain: 0, temperature: 18, windSpeed: 5 });
    expect(a.wet).toBeLessThan(0.1);
  });
  it('never goes negative or explodes', () => {
    const a = run(new Accumulation(), 200, { snow: 10, temperature: -20 });
    expect(a.snow).toBeLessThanOrEqual(1.4);
    run(a, 200, { rain: 10, temperature: 30 });
    expect(a.snow).toBe(0);
    expect(a.wet).toBeLessThanOrEqual(1);
  });
});
