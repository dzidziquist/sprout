import { describe, expect, it } from 'vitest';
import { closestJoined, closestOption, CUT, GONE, WATERED } from './when';

const now = new Date('2026-10-17T12:00:00');
const ago = (d: number) => new Date(now.getTime() - d * 86_400_000).toISOString();

describe('when', () => {
  it('picks the nearest option for a date', () => {
    expect(closestOption(CUT, ago(0), now)).toBe('today');
    expect(closestOption(CUT, ago(4), now)).toBe('few');
    expect(closestOption(CUT, ago(18), now)).toBe('weeks');
    expect(closestOption(CUT, ago(200), now)).toBe('months');
  });

  it('buckets when a plant left', () => {
    expect(closestOption(GONE, ago(100), now)).toBe('months');
  });

  it('skips "not sure"', () => {
    expect(closestOption(WATERED, ago(0), now)).toBe('today');
  });

  it('buckets the joined date', () => {
    expect(closestJoined(ago(3), now)).toBe('week');
    expect(closestJoined(ago(500), now)).toBe('year');
  });
});
