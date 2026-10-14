import { describe, expect, it } from 'vitest';
import { planRounds, roundDigestFor } from './roundDigest';
import type { Plant } from '../types';

function plant(name: string, nextCheckAt: string, extra: Partial<Plant> = {}): Plant {
  return {
    id: name.toLowerCase(),
    name,
    speciesId: 'pothos',
    potColor: 'blue',
    soil: 'potting_mix',
    potMaterial: 'plastic',
    potDiameterCm: 15,
    light: 'bright',
    placement: 'indoor',
    origin: 'bought',
    acquiredAt: '2026-01-01T00:00:00',
    k: 1,
    nextCheckAt,
    createdAt: '2026-01-01T00:00:00',
    ...extra,
  };
}

describe('round digest', () => {
  const day = new Date('2026-10-14T08:00:00');

  it('is silent when nothing is due', () => {
    expect(roundDigestFor([plant('Queenie', '2026-10-16T09:00:00')], day)).toBeNull();
  });

  it('names one or two plants in their own voice', () => {
    expect(roundDigestFor([plant('Queenie', '2026-10-14T09:00:00')], day)?.body).toBe('Queenie would love a soil check. 1 min, tops.');
    expect(roundDigestFor([plant('Queenie', '2026-10-13T09:00:00'), plant('Cal', '2026-10-14T20:00:00')], day)?.body).toMatch(/^Queenie and Cal would love/);
  });

  it('summarises bigger rounds and never mentions rooting cuttings', () => {
    const list = ['A', 'B', 'C', 'D'].map((n) => plant(n, '2026-10-14T09:00:00'));
    list.push(plant('Rootie', '2026-10-14T09:00:00', { rooting: { method: 'water', startedAt: '2026-10-01T00:00:00' } }));
    const d = roundDigestFor(list, day)!;
    expect(d.body).toBe('A, B and 2 more would love a soil check. 5 mins, tops.');
    expect(d.plantIds).not.toContain('rootie');
  });
});

describe('planning a week of rounds', () => {
  const now = new Date('2026-10-14T07:00:00');

  it('schedules only days with something new due, at the chosen time', () => {
    const plants = [plant('Queenie', '2026-10-14T09:00:00'), plant('Cal', '2026-10-17T09:00:00')];
    const plan = planRounds(plants, now, 8, 30);
    expect(plan).toHaveLength(2);
    expect(plan[0].fireAt.toISOString()).toBe(new Date('2026-10-14T08:30:00').toISOString());
    expect(plan[0].digest.plantIds).toEqual(['queenie']);
    expect(plan[1].fireAt.getDate()).toBe(17);
    expect(plan[1].digest.plantIds).toEqual(['cal']);
  });

  it("doesn't re-announce a plant every day while it stays due", () => {
    const plan = planRounds([plant('Queenie', '2026-10-14T09:00:00')], now, 8, 30);
    expect(plan).toHaveLength(1);
  });

  it("skips today when today's round time has already passed", () => {
    const late = new Date('2026-10-14T19:00:00');
    const plan = planRounds([plant('Queenie', '2026-10-14T09:00:00'), plant('Cal', '2026-10-15T09:00:00')], late, 8, 30);
    expect(plan).toHaveLength(1);
    expect(plan[0].digest.plantIds).toEqual(['cal']);
  });
});
