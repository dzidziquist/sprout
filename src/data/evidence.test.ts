import { describe, expect, it } from 'vitest';
import { CAUSES } from './diagnosis';
import { checkedMonth, evidenceFor } from './evidence';

describe('why this advice', () => {
  it('shows a verified cause’s sources with the publisher’s name and the exact words', () => {
    const ev = evidenceFor('magnesium');
    expect(ev.length).toBeGreaterThan(0);
    expect(ev[0].publisher).toBe('Royal Horticultural Society');
    expect(ev[0].quote.length).toBeGreaterThan(20);
    expect(evidenceFor('too-much-nitrogen')[0].publisher).toBe('UC Statewide IPM Program');
    expect(checkedMonth(CAUSES.magnesium)).toBe('Oct 2026');
  });

  it('gives every verified cause something to show, and older causes nothing', () => {
    for (const c of Object.values(CAUSES)) {
      if (c.status === 'verified') {
        expect(evidenceFor(c.id).length, c.id).toBeGreaterThan(0);
        expect(checkedMonth(c), c.id).toBeDefined();
      } else {
        expect(evidenceFor(c.id), c.id).toEqual([]);
        expect(checkedMonth(c), c.id).toBeUndefined();
      }
    }
  });
});
