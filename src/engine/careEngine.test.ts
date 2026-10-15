import { describe, expect, it } from 'vitest';
import {
  applyCheck,
  checkIntervalDays,
  isDue,
  isFeedingPaused,
  isMixOld,
  isRefreshDue,
  K_MAX,
  K_MIN,
  moodFor,
  refreshDueAt,
  seasonMultiplier,
  updateK,
  type IntervalInput,
} from './careEngine';

const basePlant: IntervalInput['plant'] = {
  soil: 'potting_mix',
  light: 'bright',
  potMaterial: 'plastic',
  potDiameterCm: 15,
  placement: 'indoor',
  k: 1,
  acquiredAt: '2026-05-01T00:00:00.000Z',
};

const july = new Date('2026-07-15T12:00:00');
const december = new Date('2026-12-15T12:00:00');

function interval(plant: Partial<IntervalInput['plant']> = {}, at = july, group: IntervalInput['group'] = 'tropical') {
  return checkIntervalDays({ group, plant: { ...basePlant, ...plant }, profile: 'seattle', at });
}

describe('check interval', () => {
  it('uses the tropical base of 7 days, scaled by the Seattle July indoor season', () => {
    expect(interval()).toBeCloseTo(7 * 0.85, 1);
  });

  it('checks chunky aroid mix sooner than standard potting mix, and gritty sooner still', () => {
    expect(interval({ soil: 'chunky_aroid' })).toBeLessThan(interval());
    expect(interval({ soil: 'gritty' })).toBeLessThan(interval({ soil: 'chunky_aroid' }));
  });

  it('checks moss and garden soil later than potting mix', () => {
    expect(interval({ soil: 'moss' })).toBeGreaterThan(interval());
    expect(interval({ soil: 'garden_soil' })).toBeGreaterThan(interval({ soil: 'moss' }));
  });

  it('spaces checks out in a Seattle December compared with July', () => {
    expect(interval({}, december)).toBeGreaterThan(interval({}, july));
  });

  it('barely changes across seasons under a grow light', () => {
    const ratio = interval({ placement: 'growlight' }, december) / interval({ placement: 'growlight' }, july);
    expect(ratio).toBeLessThan(1.2);
  });

  it('makes terracotta, small pots and strong light dry faster', () => {
    expect(interval({ potMaterial: 'terracotta' })).toBeLessThan(interval());
    expect(interval({ potDiameterCm: 8 })).toBeLessThan(interval());
    expect(interval({ light: 'direct' })).toBeLessThan(interval({ light: 'low' }));
  });

  it('treats mix older than two years as slower to dry', () => {
    expect(interval({ acquiredAt: '2023-01-01T00:00:00.000Z' })).toBeGreaterThan(interval());
  });

  it('uses a reservoir cadence for LECA', () => {
    expect(interval({ soil: 'leca' })).toBeCloseTo(7 * 0.85, 1);
  });

  it('never goes below 1 day or above 45 days', () => {
    expect(interval({ soil: 'gritty', potDiameterCm: 6, potMaterial: 'fabric', light: 'direct', k: K_MIN }, july, 'edible')).toBeGreaterThanOrEqual(1);
    expect(interval({ soil: 'garden_soil', light: 'low', potDiameterCm: 40, placement: 'outdoor', k: K_MAX }, december, 'succulent')).toBeLessThanOrEqual(45);
  });
});

describe('season', () => {
  it('damps the winter stretch for covered outdoor pots that miss the rain', () => {
    const open = seasonMultiplier('seattle', 'outdoor', december);
    const covered = seasonMultiplier('seattle', 'covered_outdoor', december);
    expect(covered).toBeLessThan(open);
    expect(covered).toBeGreaterThan(1);
  });

  it('pauses feeding in Seattle from Oct 15 to the end of February, except under grow lights', () => {
    expect(isFeedingPaused('seattle', 'indoor', new Date('2026-10-20T12:00:00'))).toBe(true);
    expect(isFeedingPaused('seattle', 'indoor', new Date('2026-10-10T12:00:00'))).toBe(false);
    expect(isFeedingPaused('seattle', 'indoor', new Date('2027-02-20T12:00:00'))).toBe(true);
    expect(isFeedingPaused('seattle', 'indoor', new Date('2027-03-02T12:00:00'))).toBe(false);
    expect(isFeedingPaused('seattle', 'growlight', december)).toBe(false);
  });
});

describe('learning from checks', () => {
  it('stretches k on damp more than it shrinks k on dry (errs long)', () => {
    const up = updateK(1, 'damp') - 1;
    const down = 1 - updateK(1, 'dry');
    expect(up).toBeGreaterThan(down);
    expect(updateK(1, 'soggy')).toBeGreaterThan(updateK(1, 'damp'));
  });

  it('keeps k within bounds', () => {
    let k = 1;
    for (let i = 0; i < 50; i++) k = updateK(k, 'soggy');
    expect(k).toBe(K_MAX);
    for (let i = 0; i < 100; i++) k = updateK(k, 'dry');
    expect(k).toBe(K_MIN);
  });

  it('waters on dry and schedules a full interval', () => {
    const out = applyCheck({ group: 'tropical', plant: basePlant, profile: 'seattle', at: july }, 'dry');
    expect(out.watered).toBe(true);
    const days = (new Date(out.nextCheckAt).getTime() - july.getTime()) / 86400000;
    expect(days).toBeGreaterThan(4);
  });

  it('skips on damp and peeks again within two days', () => {
    const out = applyCheck({ group: 'tropical', plant: basePlant, profile: 'seattle', at: july }, 'damp');
    expect(out.watered).toBe(false);
    const days = (new Date(out.nextCheckAt).getTime() - july.getTime()) / 86400000;
    expect(days).toBeLessThanOrEqual(2);
    expect(out.message).toMatch(/skip/i);
  });

  it('flags possible overwatering on soggy', () => {
    const out = applyCheck({ group: 'tropical', plant: basePlant, profile: 'seattle', at: july }, 'soggy');
    expect(out.flags).toContain('possible_overwatering');
  });

  it('warns about garden soil in pots', () => {
    const out = applyCheck({ group: 'tropical', plant: { ...basePlant, soil: 'garden_soil' }, profile: 'seattle', at: july }, 'dry');
    expect(out.flags).toContain('garden_soil');
  });
});

describe('due and mood', () => {
  const now = new Date('2026-10-13T09:00:00');

  it('is due when the next check falls any time today', () => {
    expect(isDue({ nextCheckAt: '2026-10-13T20:00:00' }, now)).toBe(true);
    expect(isDue({ nextCheckAt: '2026-10-14T08:00:00' }, now)).toBe(false);
  });

  it('is thirsty when due, snoozing right after a damp skip, happy otherwise', () => {
    expect(moodFor({ nextCheckAt: '2026-10-12T00:00:00' }, now)).toBe('thirsty');
    expect(moodFor({ nextCheckAt: '2026-10-15T00:00:00', lastResult: 'damp', lastCheckAt: '2026-10-12T09:00:00' }, now)).toBe('snoozing');
    expect(moodFor({ nextCheckAt: '2026-10-20T00:00:00', lastResult: 'dry', lastCheckAt: '2026-10-12T09:00:00' }, now)).toBe('happy');
  });
});

describe('hydro and semi-hydro', () => {
  const at = july;
  const check = (soil: 'leca' | 'water', result: 'dry' | 'damp') =>
    applyCheck({ group: 'tropical', plant: { ...basePlant, soil }, profile: 'seattle', at }, result);

  it('checks water culture on the reservoir cadence, ignoring pot size and material', () => {
    expect(interval({ soil: 'water' })).toBeCloseTo(7 * 0.85, 1);
    expect(interval({ soil: 'water', potDiameterCm: 32, potMaterial: 'terracotta' })).toBe(interval({ soil: 'water' }));
  });

  it('answers Low with a top-up and Plenty with a skip, never an overwatering flag', () => {
    const low = check('water', 'dry');
    expect(low.watered).toBe(true);
    expect(low.message).toMatch(/Topped up/);
    const plenty = check('leca', 'damp');
    expect(plenty.watered).toBe(false);
    expect(plenty.message).toMatch(/Plenty left/);
    expect(plenty.flags).toEqual([]);
    // Peeks again in about half a rhythm, not the soil's 2 days.
    const days = (new Date(plenty.nextCheckAt).getTime() - at.getTime()) / 86400000;
    expect(days).toBeGreaterThanOrEqual(2);
    expect(days).toBeLessThan(interval({ soil: 'leca' }));
  });

  it('never calls a reservoir an old mix', () => {
    expect(isMixOld({ ...basePlant, soil: 'water', acquiredAt: '2020-01-01T00:00:00Z' }, at)).toBe(false);
  });

  it('asks for fresh water every 2 weeks in water and a flush monthly in LECA, from the last refresh or repot', () => {
    const joined = '2026-07-01T09:00:00.000Z';
    expect(refreshDueAt({ soil: 'potting_mix', createdAt: joined })).toBeUndefined();
    expect(refreshDueAt({ soil: 'water', createdAt: joined })?.toISOString()).toBe('2026-07-15T09:00:00.000Z');
    expect(refreshDueAt({ soil: 'leca', createdAt: joined })?.toISOString()).toBe('2026-07-29T09:00:00.000Z');
    expect(refreshDueAt({ soil: 'water', createdAt: joined, lastRefreshedAt: '2026-07-10T09:00:00.000Z' })?.toISOString()).toBe('2026-07-24T09:00:00.000Z');
    expect(refreshDueAt({ soil: 'water', createdAt: joined, lastRepottedAt: '2026-07-12T09:00:00.000Z' })?.toISOString()).toBe('2026-07-26T09:00:00.000Z');
    expect(isRefreshDue({ soil: 'water', createdAt: joined }, new Date('2026-07-16T00:00:00Z'))).toBe(true);
    expect(isRefreshDue({ soil: 'water', createdAt: joined }, new Date('2026-07-10T00:00:00Z'))).toBe(false);
  });
});
