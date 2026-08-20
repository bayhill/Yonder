import { describe, it, expect } from 'vitest';
import { approach, Spring } from '../src/core/smoothing';

describe('smoothing', () => {
  it('approach never overshoots', () => {
    let v = 0;
    for (let i = 0; i < 1000; i++) { v = approach(v, 1, 2, 1 / 60); expect(v).toBeLessThanOrEqual(1); }
    expect(v).toBeGreaterThan(0.99);
  });
  it('spring is critically damped (no crossing)', () => {
    const s = new Spring(0, 6);
    let prev = 0;
    for (let i = 0; i < 600; i++) {
      const v = s.step(1, 1 / 60);
      expect(v).toBeLessThanOrEqual(1 + 1e-9);
      expect(v).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = v;
    }
    expect(prev).toBeGreaterThan(0.99);
  });
});
