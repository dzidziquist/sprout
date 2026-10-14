import { describe, expect, it } from 'vitest';
import { badgesFor, computeStreak, lapsesFor, startOfWeek } from './streak';
import type { CareEvent, CheckResult, Plant } from '../types';

// Pothos in standard mix under a grow light: a 7-day interval in May/June, which keeps the maths readable.
function plant(id: string, extra: Partial<Plant> = {}): Plant {
  return {
    id,
    name: id,
    speciesId: 'pothos',
    potColor: 'blue',
    soil: 'potting_mix',
    potMaterial: 'plastic',
    potDiameterCm: 15,
    light: 'bright',
    placement: 'growlight',
    origin: 'bought',
    acquiredAt: '2026-06-01T09:00:00',
    createdAt: '2026-06-01T09:00:00',
    k: 1,
    nextCheckAt: '2026-06-08T09:00:00',
    ...extra,
  };
}

let n = 0;
const check = (plantId: string, at: string, result: CheckResult = 'dry'): CareEvent => ({ id: `e${n++}`, plantId, type: 'check', result, at });
const ev = (plantId: string, type: CareEvent['type'], at: string, extra: Partial<CareEvent> = {}): CareEvent => ({ id: `e${n++}`, plantId, type, at, ...extra });

describe('weeks', () => {
  it('start on Monday', () => {
    expect(startOfWeek(new Date('2026-10-14T15:00:00')).getDate()).toBe(12);
    expect(startOfWeek(new Date('2026-10-18T23:00:00')).getDate()).toBe(12);
    expect(startOfWeek(new Date('2026-10-12T00:00:00')).getDate()).toBe(12);
  });
});

describe('lapses', () => {
  it('only count time more than 2 days past due', () => {
    const p = plant('a', { nextCheckAt: '2026-06-15T09:00:00' });
    // Due Jun 8, checked Jun 9: within grace.
    expect(lapsesFor(p, [check('a', '2026-06-09T09:00:00')], 'seattle', new Date('2026-06-12T12:00:00'))).toEqual([]);
    // Due Jun 8, checked Jun 12: overdue from Jun 10 09:00 to Jun 12 09:00.
    const late = lapsesFor({ ...p, nextCheckAt: '2026-06-19T09:00:00' }, [check('a', '2026-06-12T09:00:00')], 'seattle', new Date('2026-06-13T12:00:00'));
    expect(late).toEqual([[new Date('2026-06-10T09:00:00').getTime(), new Date('2026-06-12T09:00:00').getTime()]]);
  });

  it('ignore rooting cuttings and stop at archive', () => {
    const rooting = plant('r', { rooting: { method: 'water', startedAt: '2026-06-01T09:00:00' }, nextCheckAt: '2026-06-02T09:00:00' });
    expect(lapsesFor(rooting, [], 'seattle', new Date('2026-07-01T12:00:00'))).toEqual([]);
    const gone = plant('g', { archivedAt: '2026-06-09T09:00:00' });
    expect(lapsesFor(gone, [], 'seattle', new Date('2026-07-01T12:00:00'))).toEqual([]);
  });

  it('start after a cutting roots', () => {
    const p = plant('c', { origin: 'cutting', nextCheckAt: '2026-06-27T09:00:00' });
    const events = [ev('c', 'rooted', '2026-06-20T09:00:00')];
    expect(lapsesFor(p, events, 'seattle', new Date('2026-06-28T12:00:00'))).toEqual([]);
  });
});

describe('streak', () => {
  it('counts clean weeks including the current one', () => {
    const p = plant('a', { nextCheckAt: '2026-06-29T09:00:00' });
    const events = ['2026-06-08', '2026-06-15', '2026-06-22'].map((d) => check('a', `${d}T09:00:00`));
    const s = computeStreak({ plants: [p], events, climate: 'seattle', now: new Date('2026-06-30T12:00:00') });
    // Week of Jun 1 had nothing checked: quiet, neither counts nor breaks. This week has no check yet.
    expect(s.weeks.map((w) => w.status)).toEqual(['quiet', 'kept', 'kept', 'kept']);
    expect(s.current).toBe(3);
    expect(s.best).toBe(3);
    expect(s.thisWeek).toBe('clean');
    expect(s.freezesLeft).toBe(2);
  });

  it('repairs up to two missed weeks a month for free, then starts fresh', () => {
    const p = plant('a', { nextCheckAt: '2026-06-30T09:00:00' });
    const events = [
      check('a', '2026-06-11T09:00:00', 'damp'), // due Jun 8 → lapse in week of Jun 8
      check('a', '2026-06-16T09:00:00', 'damp'), // due Jun 13 → lapse in week of Jun 15
      check('a', '2026-06-23T09:00:00', 'dry'), // due Jun 18 → lapse Jun 20–23, also week of Jun 22
    ];
    const s = computeStreak({ plants: [p], events, climate: 'seattle', now: new Date('2026-07-01T12:00:00') });
    expect(s.weeks.map((w) => w.status)).toEqual(['quiet', 'repaired', 'repaired', 'missed']);
    expect(s.best).toBe(2);
    expect(s.current).toBe(0);
    // July brings fresh freezes.
    expect(s.freezesLeft).toBe(2);
  });

  it('lets a freeze cover the current week, and never breaks the run mid-week', () => {
    const p = plant('a', { nextCheckAt: '2026-06-08T09:00:00' });
    const covered = computeStreak({ plants: [p], events: [check('a', '2026-06-02T09:00:00', 'damp')], climate: 'seattle', now: new Date('2026-06-11T12:00:00') });
    expect(covered.thisWeek).toBe('covered');
    expect(covered.current).toBe(1);
    expect(covered.freezesLeft).toBe(1);
  });

  it('is never handed out before the first soil check', () => {
    const p = plant('a', { nextCheckAt: '2026-07-30T09:00:00' });
    const s = computeStreak({ plants: [p], events: [], climate: 'seattle', now: new Date('2026-06-30T12:00:00') });
    expect(s.current).toBe(0);
    expect(s.best).toBe(0);
  });

  it('is empty with no plants', () => {
    expect(computeStreak({ plants: [], events: [], climate: 'seattle', now: new Date() }).current).toBe(0);
  });
});

describe('badges', () => {
  const now = new Date('2026-06-30T12:00:00');

  it('are locked with a hint until earned', () => {
    const b = badgesFor({ plants: [plant('a')], events: [], climate: 'seattle', now });
    expect(b.every((x) => !x.earnedAt || x.id === 'streak-4')).toBe(true);
    expect(b.find((x) => x.id === 'first-skip')?.hint).toMatch(/Damp/);
  });

  it('record when skips, cuttings and the 5th plant happened', () => {
    const skips = Array.from({ length: 10 }, (_, i) => check('a', `2026-06-${String(10 + i).padStart(2, '0')}T09:00:00`, 'damp'));
    const plants = ['a', 'b', 'c', 'd', 'e'].map((id, i) => plant(id, { createdAt: `2026-06-0${i + 1}T09:00:00` }));
    const b = badgesFor({ plants, events: [check('a', '2026-06-09T08:00:00', 'dry'), ...skips, ev('a', 'cutting', '2026-06-12T10:00:00')], climate: 'seattle', now });
    const at = (id: string) => b.find((x) => x.id === id)?.earnedAt;
    expect(at('first-check')).toBe('2026-06-09T08:00:00');
    expect(at('first-skip')).toBe('2026-06-10T09:00:00');
    expect(at('ten-skips')).toBe('2026-06-19T09:00:00');
    expect(at('first-cutting')).toBe('2026-06-12T10:00:00');
    expect(at('fam-5')).toBe('2026-06-05T09:00:00');
    expect(at('first-roots')).toBeUndefined();
  });

  it('celebrate surviving the grey season', () => {
    const veteran = plant('v', { createdAt: '2025-09-01T09:00:00', acquiredAt: '2025-09-01T09:00:00' });
    const newbie = plant('n', { createdAt: '2025-12-01T09:00:00', acquiredAt: '2025-12-01T09:00:00' });
    const title = (events: CareEvent[], plants: Plant[]) => badgesFor({ plants, events, climate: 'seattle', now: new Date('2026-04-01T12:00:00') }).find((x) => x.id === 'season');
    expect(title([check('v', '2026-03-05T09:00:00')], [veteran])?.earnedAt).toBe('2026-03-05T09:00:00');
    expect(title([check('v', '2026-02-20T09:00:00')], [veteran])?.earnedAt).toBeUndefined();
    // Joined mid-winter: the grey season it has to survive is next year's.
    expect(title([check('n', '2026-03-05T09:00:00')], [newbie])?.earnedAt).toBeUndefined();
    expect(title([], [veteran])?.title).toBe('Survived grey season');
  });
});
