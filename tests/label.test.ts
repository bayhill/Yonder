import { describe, it, expect } from 'vitest';
import { coordName } from '../src/ui/label';

describe('coordinate caption', () => {
  it('formats a quiet caption', () => {
    expect(coordName(59.758, 18.705)).toBe('59.8°N 18.7°E');
    expect(coordName(-33.9, -70.6)).toBe('33.9°S 70.6°W');
  });
});
