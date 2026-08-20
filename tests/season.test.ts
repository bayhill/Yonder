import { describe, it, expect } from 'vitest';
import { seasonPalette } from '../src/colour/season';
import { ROLES } from '../src/colour/palettes';

describe('season blend', () => {
  it('is continuous across the year (no jumps)', () => {
    let prev = seasonPalette(0);
    for (let d = 1; d <= 366; d++) {
      const p = seasonPalette(d);
      for (const r of ROLES) {
        expect(Math.abs(p[r].l - prev[r].l)).toBeLessThan(0.02);
        expect(Math.abs(p[r].c - prev[r].c)).toBeLessThan(0.02);
      }
      prev = p;
    }
  });
});

import { seasonParams } from '../src/colour/season';
describe('season params', () => {
  it('are continuous and in range', () => {
    let prev = seasonParams(0);
    for (let d = 1; d <= 366; d++) {
      const p = seasonParams(d);
      expect(Math.abs(p.leaf - prev.leaf)).toBeLessThan(0.06);
      expect(Math.abs(p.grass - prev.grass)).toBeLessThan(0.03);
      expect(p.leaf).toBeGreaterThanOrEqual(0); expect(p.leaf).toBeLessThanOrEqual(1);
      prev = p;
    }
  });
  it('birches are bare in winter and in leaf at midsummer', () => {
    expect(seasonParams(20).leaf).toBe(0);
    expect(seasonParams(172).leaf).toBe(1);
    expect(seasonParams(290).leaf).toBeGreaterThan(0.3);
    expect(seasonParams(290).leaf).toBeLessThan(1);
  });
});
