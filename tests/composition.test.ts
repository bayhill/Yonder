import { describe, it, expect } from 'vitest';
import { fitViewport, LAYOUT, WORLD } from '../src/scene/composition';

describe('viewport crop', () => {
  it('covers the whole world at 16:9', () => {
    const vp = fitViewport(1600, 900);
    expect(vp.left).toBe(0); expect(vp.right).toBe(WORLD.w); expect(vp.top).toBe(0); expect(vp.bottom).toBe(WORLD.h);
  });
  it('keeps the near trees in frame on a portrait phone', () => {
    const vp = fitViewport(390, 844);
    expect(vp.left).toBeLessThan(LAYOUT.mainTreeX - 100);
    expect(vp.right).toBeGreaterThan(1165 + 40);
    expect(vp.bottom).toBe(WORLD.h); // the foreground grass is never cropped away
  });
  it('never letterboxes on an ultrawide', () => {
    const vp = fitViewport(3440, 1440);
    expect(vp.right - vp.left).toBeCloseTo(WORLD.w, 5);
    expect(vp.top).toBeGreaterThan(0);
  });
});
