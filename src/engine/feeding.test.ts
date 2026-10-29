import { describe, expect, it } from 'vitest';
import { feedEveryDays, fedWithin, withNextFeed } from './feeding';
import type { CareEvent } from '../types';

const fed = (at: string): CareEvent => ({ id: at, plantId: 'p', type: 'feed', at });

describe('feeding cadence', () => {
  it('reads the cadence in advice', () => {
    expect(feedEveryDays('High-potash feed every 10–14 days')).toBe(10);
    expect(feedEveryDays('Half-strength tomato feed every 2 weeks')).toBe(14);
    expect(feedEveryDays('Light balanced feed monthly')).toBe(30);
    expect(feedEveryDays('Feeding paused for winter')).toBeUndefined();
    expect(feedEveryDays('Weak nutrients with every top-up')).toBeUndefined();
  });
  it('says when the next feed is due, once one is logged', () => {
    const now = new Date('2026-11-10T12:00:00Z');
    expect(withNextFeed('Light balanced feed monthly', 'p', [], now)).toBe('Light balanced feed monthly');
    expect(withNextFeed('Half-strength tomato feed every 2 weeks', 'p', [fed('2026-11-01T12:00:00Z')], now)).toMatch(/· next about Nov 1[45]$/);
    expect(withNextFeed('Half-strength tomato feed every 2 weeks', 'p', [fed('2026-10-20T12:00:00Z')], now)).toBe('Half-strength tomato feed every 2 weeks · due now');
    expect(withNextFeed('Paused till spring', 'p', [fed('2026-10-20T12:00:00Z')], now)).toBe('Paused till spring');
  });
  it('knows a recent feed', () => {
    const now = new Date('2026-11-10T12:00:00Z');
    expect(fedWithin('p', [fed('2026-11-01T12:00:00Z')], 14, now)).toBe(true);
    expect(fedWithin('p', [fed('2026-10-20T12:00:00Z')], 14, now)).toBe(false);
    expect(fedWithin('p', [], 14, now)).toBe(false);
  });
});
