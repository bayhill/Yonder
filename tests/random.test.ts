import { describe, it, expect } from 'vitest';
import { createRng } from '../src/core/random';

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = createRng('yonder'), b = createRng('yonder');
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });
  it('forks are independent and stable', () => {
    const a = createRng('s').fork('trees'), b = createRng('s').fork('trees');
    expect(a.next()).toBe(b.next());
    expect(createRng('s').fork('grass').next()).not.toBe(createRng('s').fork('trees').next());
  });
  it('stays in range', () => {
    const r = createRng(42);
    for (let i = 0; i < 1000; i++) { const v = r.next(); expect(v).toBeGreaterThanOrEqual(0); expect(v).toBeLessThan(1); }
  });
});
