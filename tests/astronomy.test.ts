import { describe, it, expect } from 'vitest';
import { sunPosition } from '../src/astronomy/sun';
import { moonState } from '../src/astronomy/moon';

const LAT = 59.758, LON = 18.705; // Norrtälje

describe('sun at 59.8°N', () => {
  it('midsummer noon is ~53° high and due south', () => {
    const s = sunPosition(new Date('2026-06-21T10:55:00Z'), LAT, LON);
    expect(s.elevation).toBeGreaterThan(52);
    expect(s.elevation).toBeLessThan(55);
    expect(Math.abs(s.azimuth - 180)).toBeLessThan(5);
  });
  it('midsummer midnight sun stays in nautical twilight (never below -12°)', () => {
    const s = sunPosition(new Date('2026-06-20T23:00:00Z'), LAT, LON);
    expect(s.elevation).toBeGreaterThan(-8);
    expect(s.elevation).toBeLessThan(0);
  });
  it('midwinter noon is ~7° high', () => {
    const s = sunPosition(new Date('2026-12-21T10:50:00Z'), LAT, LON);
    expect(s.elevation).toBeGreaterThan(6);
    expect(s.elevation).toBeLessThan(8);
  });
  it('morning sun is in the east (left of south)', () => {
    const s = sunPosition(new Date('2026-06-21T05:00:00Z'), LAT, LON);
    expect(s.azimuth).toBeGreaterThan(60);
    expect(s.azimuth).toBeLessThan(120);
  });
});

describe('moon', () => {
  it('returns a sane phase and fraction', () => {
    const m = moonState(new Date('2026-06-21T00:00:00Z'), LAT, LON);
    expect(m.fraction).toBeGreaterThanOrEqual(0);
    expect(m.fraction).toBeLessThanOrEqual(1);
    expect(m.phase).toBeGreaterThanOrEqual(0);
    expect(m.phase).toBeLessThan(1);
  });
});
