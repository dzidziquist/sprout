import { describe, expect, it } from 'vitest';
import { markSeen, whatsNewFor } from './whatsNew';
import { WHATS_NEW } from '../data/whatsNew';
import { SPECIES } from '../data/species';

const now = new Date('2026-11-10T12:00:00Z');
const items = [
  { id: 'a', date: '2026-11-06', kind: 'plant' as const, text: 'Dragon fruit has joined the catalogue', ideas: ['2a5d8875-912b-48dd-bc07-779a3b9785a8'] },
  { id: 'b', date: '2026-11-07', kind: 'fix' as const, text: 'Grow patch dates are right again' },
  { id: 'old', date: '2026-08-01', kind: 'fix' as const, text: 'Old news' },
];

describe('whatsNew', () => {
  it('shows nothing on a phone that has never seen the list, and says to mark it all seen', () => {
    expect(whatsNewFor(items, undefined, [], now)).toEqual({ items: [], yours: [], firstRun: true });
  });

  it('shows unseen items from the last 60 days', () => {
    expect(whatsNewFor(items, ['b'], [], now).items.map((i) => i.id)).toEqual(['a']);
  });

  it('spots the items this phone asked for, whatever the id format', () => {
    const sent = [{ id: '2a5d8875912b48ddbc07779a3b9785a8', kind: 'Missing plant', label: 'Dragon fruit', at: '2026-11-05' }];
    expect(whatsNewFor(items, [], sent, now).yours.map((i) => i.id)).toEqual(['a']);
  });

  it('remembers what was seen without growing forever', () => {
    expect(markSeen(['a'], items)).toEqual(['a', 'b', 'old']);
    expect(markSeen(Array.from({ length: 300 }, (_, i) => `x${i}`), []).length).toBe(200);
  });

  it('keeps the shipped list well-formed', () => {
    const ids = new Set<string>();
    for (const i of WHATS_NEW) {
      expect(ids.has(i.id), `duplicate ${i.id}`).toBe(false);
      ids.add(i.id);
      expect(i.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(i.text.length).toBeLessThanOrEqual(80);
      if (i.plant) expect(SPECIES[i.plant as keyof typeof SPECIES], `${i.id}: unknown plant ${i.plant}`).toBeTruthy();
    }
  });
});
