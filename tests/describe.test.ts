import { describe, it, expect } from 'vitest';
import { describeScene } from '../src/ui/describe';
import { DEFAULT_WEATHER } from '../src/weather/controls';

describe('scene in words', () => {
  it('reads like a caption', () => {
    const s = describeScene('Norrtälje', new Date('2026-01-20T23:00:00'), { ...DEFAULT_WEATHER, temperature: -4, cloudCover: 0.95, windSpeed: 3, snow: 1 }, -30, 0.8);
    expect(s).toBe('A meadow near Norrtälje, night: -4 degrees, overcast, a light breeze, snow falling, snow on the ground.');
  });
});
