import { describe, expect, it } from 'vitest';
import { rewardsFor } from './rewards';
import type { Badge } from './streak';

const badge = (day: number | null): Badge => ({ id: 'first-check', title: '', hint: '', earnedAt: day === null ? undefined : `2026-10-${String(day).padStart(2, '0')}T09:00:00.000Z` });

describe('rewards', () => {
  it('unlock with milestones, dated by the milestone that unlocked them', () => {
    const r = rewardsFor([badge(5), badge(1), badge(null), badge(3), badge(9), badge(7)]);
    expect(r.earned).toBe(5);
    expect(r.gold).toEqual({ unlocked: true, at: '2026-10-05T09:00:00.000Z' });
    expect(r.party).toEqual({ unlocked: true, at: '2026-10-09T09:00:00.000Z' });
    expect(r.icons.unlocked).toBe(false);
    expect(r.medal.unlocked).toBe(false);
  });

  it('a tip unlocks everything', () => {
    const r = rewardsFor([], { supporter: true, supporterSince: '2026-10-01T00:00:00.000Z' });
    expect([r.gold, r.party, r.icons, r.medal].every((x) => x.unlocked)).toBe(true);
  });
});
