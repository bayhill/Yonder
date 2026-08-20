import { describe, it, expect } from 'vitest';
import { WindField } from '../src/wind/field';
import { createRng } from '../src/core/random';

function run(speed: number, dir: number, seconds = 10) {
  const w = new WindField(createRng('t'));
  w.configure(speed, dir, speed * 1.5);
  const out = { bend: 0, flutter: 0 };
  const samples: number[] = [];
  for (let i = 0; i < seconds * 60; i++) {
    w.update(1 / 60);
    if (i % 7 === 0) for (let k = 0; k < 10; k++) samples.push(w.sample(k * 160, 600 + k * 30, out).bend);
  }
  return samples;
}

describe('wind field', () => {
  it('is deterministic', () => {
    expect(run(8, 240)).toEqual(run(8, 240));
  });
  it('stays bounded and scales with speed', () => {
    const calm = run(0, 240), breeze = run(5, 240), gale = run(15, 240);
    const rms = (a: number[]) => Math.sqrt(a.reduce((s, v) => s + v * v, 0) / a.length);
    for (const v of gale) expect(Math.abs(v)).toBeLessThan(1.6);
    expect(rms(calm)).toBeGreaterThan(0);        // never perfectly still
    expect(rms(calm)).toBeLessThan(0.06);
    expect(rms(breeze)).toBeGreaterThan(rms(calm));
    expect(rms(gale)).toBeGreaterThan(rms(breeze));
  });
  it('follows the wind direction on screen', () => {
    const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    expect(mean(run(10, 90))).toBeGreaterThan(0.2);   // from the east → blown to screen right
    expect(mean(run(10, 270))).toBeLessThan(-0.2);    // from the west → screen left
  });
});
