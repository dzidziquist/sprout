import { describe, expect, it } from 'vitest';
import { defaultSpot } from './spots';

describe('default spot for a new plant', () => {
  it('keeps the species default when we were not told', () => {
    expect(defaultSpot(undefined, true)).toBeUndefined();
    expect(defaultSpot([], false)).toBeUndefined();
  });

  it('puts edibles in the garden bed, else the balcony, else a sunny window', () => {
    expect(defaultSpot(['indoors', 'garden', 'balcony'], true)).toEqual({ placement: 'ground', light: 'direct' });
    expect(defaultSpot(['indoors', 'balcony'], true)).toEqual({ placement: 'covered_outdoor' });
    expect(defaultSpot(['window'], true)).toEqual({ placement: 'indoor', light: 'bright' });
  });

  it('keeps houseplants inside when someone grows inside', () => {
    expect(defaultSpot(['garden', 'indoors'], false)).toEqual({ placement: 'indoor' });
    expect(defaultSpot(['growlights', 'balcony'], false)).toEqual({ placement: 'growlight', light: 'bright' });
    expect(defaultSpot(['garden'], false)).toEqual({ placement: 'ground', light: 'direct' });
  });
});
