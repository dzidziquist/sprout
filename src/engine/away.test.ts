import { describe, expect, it } from 'vitest';
import { activeTrip, prepList, sitterNote, subtractRanges, upcomingTrip, type Trip } from './away';
import { computeStreak } from './streak';
import { planRounds } from './roundDigest';
import type { CareEvent, Plant } from '../types';

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
const check = (at: string): CareEvent => ({ id: at, plantId: 'a', type: 'check', result: 'dry', at });
const trip: Trip = { from: '2026-06-10T00:00:00', to: '2026-06-24T00:00:00' };

describe('away mode', () => {
  it('knows the current and next trip', () => {
    expect(activeTrip([trip], new Date('2026-06-12T12:00:00'))).toBe(trip);
    expect(activeTrip([trip], new Date('2026-06-24T08:00:00'))).toBeUndefined();
    expect(upcomingTrip([trip], new Date('2026-06-05T12:00:00'))).toBe(trip);
  });

  it('cuts trips out of lapses', () => {
    expect(subtractRanges([[0, 10]], [[3, 5]])).toEqual([[0, 3], [5, 10]]);
    expect(subtractRanges([[0, 10]], [[-5, 20]])).toEqual([]);
    expect(subtractRanges([[0, 10]], [[12, 20]])).toEqual([[0, 10]]);
  });

  it('keeps the streak through a two-week trip', () => {
    // Checked on the 1st and 8th, then away the 10th to the 24th, back checking on the 25th.
    const events = [check('2026-06-01T09:00:00'), check('2026-06-08T09:00:00'), check('2026-06-25T09:00:00'), check('2026-06-29T09:00:00')];
    const p = plant('a', { nextCheckAt: '2026-07-02T09:00:00' });
    const now = new Date('2026-06-30T12:00:00');
    const without = computeStreak({ plants: [p], events, climate: 'seattle', now });
    const withTrip = computeStreak({ plants: [p], events, climate: 'seattle', now, trips: [trip] });
    expect(withTrip.weeks.some((w) => w.status === 'missed')).toBe(false);
    expect(withTrip.freezesLeft).toBeGreaterThanOrEqual(without.freezesLeft);
    expect(withTrip.current).toBeGreaterThan(0);
  });

  it('goes quiet while away, warns the day before and says welcome back', () => {
    const plants = [plant('a', { name: 'Monty', nextCheckAt: '2026-06-12T09:00:00' })];
    const rounds = planRounds(plants, new Date('2026-06-08T07:00:00'), 8, 30, 20, undefined, [trip]);
    const days = rounds.map((r) => `${r.fireAt.getDate()} ${r.digest.title}`);
    expect(days).toContain('9 Off tomorrow? 🧳');
    expect(rounds.some((r) => r.fireAt.getDate() > 9 && r.fireAt.getDate() < 24)).toBe(false);
    const back = rounds.find((r) => r.fireAt.getDate() === 24)!;
    expect(back.digest.title).toBe('Welcome back 🧳');
    expect(back.digest.body).toMatch(/Monty/);
  });

  it('writes a prep list and a sitter note for these plants', () => {
    const plants = [plant('a', { name: 'Monty', room: 'Lounge' }), plant('b', { name: 'Bubbles', soil: 'leca' }), plant('c', { name: 'Spike', speciesId: 'aloe' })];
    const list = prepList(plants, trip).join(' ');
    expect(list).toMatch(/water everyone deeply/);
    expect(list).toMatch(/Bubbles/);
    expect(list).toMatch(/Spike will be fine/);
    expect(list).toMatch(/plant sitter/);
    const note = sitterNote(plants, 'seattle', trip, new Date('2026-06-09T12:00:00'));
    expect(note).toMatch(/Monty \(Pothos, Lounge\): water when the top/);
    expect(note).toMatch(/Bubbles .*top up when the water line/);
  });
});
