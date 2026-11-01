import { describe, expect, it } from 'vitest';
import { previewChips } from './preview';

const now = new Date('2026-11-01T12:00:00');

describe('previewChips', () => {
  it('shows next check and last watering for a plant on the rhythm', () => {
    expect(previewChips({ nextCheckAt: '2026-11-03T09:00:00' }, '2026-10-26T09:00:00', now)).toEqual([
      { num: 'In 2 days', label: 'next check', tone: 'mint' },
      { num: '6 days ago', label: 'last watered', tone: 'butter' },
    ]);
  });

  it('leaves out the watering chip when it was never watered', () => {
    expect(previewChips({ nextCheckAt: '2026-10-20T09:00:00' }, undefined, now)).toEqual([{ num: 'Today', label: 'next check', tone: 'mint' }]);
  });

  it('shows rooting progress for a cutting, not a stale next check', () => {
    const chips = previewChips({ nextCheckAt: '2026-01-01T09:00:00', rooting: { method: 'leca', startedAt: '2026-10-25T09:00:00' } }, undefined, now);
    expect(chips).toEqual([{ num: 'Day 8', label: 'rooting in LECA', tone: 'mint' }]);
  });

  it('shows where an archived plant went', () => {
    const chips = previewChips({ nextCheckAt: '2026-01-01T09:00:00', archivedAt: '2026-10-01T09:00:00', archivedReason: 'died' }, '2026-09-30T09:00:00', now);
    expect(chips).toHaveLength(1);
    expect(chips[0].num).toBe('In memory');
    expect(chips[0].label).toMatch(/^since /);
  });
});
