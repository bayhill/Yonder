import { describe, it, expect } from 'vitest';
import { mistAmount } from '../src/weather/mist';

describe('dawn mist', () => {
  it('forms on a still, clear, humid sunrise', () => {
    expect(mistAmount(0.97, 0.5, 0.1, 2)).toBeGreaterThan(0.3);
  });
  it('is absent in wind, under cloud, or by midday', () => {
    expect(mistAmount(0.97, 6, 0.1, 2)).toBe(0);
    expect(mistAmount(0.97, 0.5, 0.9, 2)).toBe(0);
    expect(mistAmount(0.97, 0.5, 0.1, 30)).toBe(0);
    expect(mistAmount(0.6, 0.5, 0.1, 2)).toBe(0);
  });
  it('fades continuously with humidity', () => {
    const a = mistAmount(0.86, 0.5, 0.1, 2), b = mistAmount(0.9, 0.5, 0.1, 2), c = mistAmount(0.95, 0.5, 0.1, 2);
    expect(a).toBeLessThan(b); expect(b).toBeLessThan(c);
  });
});
