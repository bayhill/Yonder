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
