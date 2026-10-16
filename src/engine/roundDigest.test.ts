import { describe, expect, it } from 'vitest';
import { isPhotoDay, photoCandidates, planRounds, roundDigestFor } from './roundDigest';
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

  it('leaves archived plants out of the round', () => {
    const gone = plant('Gifted', '2026-10-14T09:00:00', { archivedAt: '2026-10-01T00:00:00', archivedReason: 'gifted' });
    expect(roundDigestFor([gone], day)).toBeNull();
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

describe('round digest wording', () => {
  const day = new Date('2026-10-14T08:00:00');
  it('asks for a water check when only hydro plants are due, and just "a check" for a mix', () => {
    const jar = plant('Jar', '2026-10-14T09:00:00', { soil: 'water' });
    const pot = plant('Pot', '2026-10-14T09:00:00');
    expect(roundDigestFor([jar], day)?.body).toBe('Jar would love a water check. 1 min, tops.');
    expect(roundDigestFor([pot], day)?.body).toBe('Pot would love a soil check. 1 min, tops.');
    expect(roundDigestFor([jar, pot], day)?.body).toBe('Jar and Pot would love a check. 2 mins, tops.');
  });
});

describe('photo day', () => {
  const now = new Date('2026-10-14T07:00:00'); // a Wednesday

  it('comes round on Sundays, or the first Sunday of the month', () => {
    expect(isPhotoDay('weekly', new Date('2026-10-18T08:00:00'))).toBe(true);
    expect(isPhotoDay('monthly', new Date('2026-10-18T08:00:00'))).toBe(false);
    expect(isPhotoDay('monthly', new Date('2026-11-01T08:00:00'))).toBe(true);
    expect(isPhotoDay('weekly', now)).toBe(false);
    expect(isPhotoDay('off', new Date('2026-11-01T08:00:00'))).toBe(false);
  });

  it('asks for plants without a recent photo, never-photographed first, and not brand-new ones', () => {
    const day = new Date('2026-10-18T08:00:00');
    const plants = [
      plant('Old', '2026-12-01T09:00:00'),
      plant('Never', '2026-12-01T09:00:00'),
      plant('Fresh', '2026-12-01T09:00:00'),
      plant('Baby', '2026-12-01T09:00:00', { createdAt: '2026-10-17T09:00:00' }),
      plant('Gone', '2026-12-01T09:00:00', { archivedAt: '2026-10-01T00:00:00', archivedReason: 'died' }),
    ];
    const last = { old: '2026-10-05T09:00:00', fresh: '2026-10-15T09:00:00' };
    expect(photoCandidates(plants, last, 'weekly', day).map((p) => p.name)).toEqual(['Never', 'Old']);
    expect(photoCandidates(plants, last, 'off', day)).toEqual([]);
  });

  it('rides along with the round, or opens the plant when it is the only thing that day', () => {
    const due = plant('Queenie', '2026-10-18T09:00:00');
    const plan = planRounds([due], now, 8, 30, 8, { cadence: 'weekly', lastPhotoAt: {} });
    expect(plan).toHaveLength(1);
    expect(plan[0].digest.body).toBe('Queenie would love a soil check. 1 min, tops. Photo day too: snap Queenie for the diary.');

    const quiet = planRounds([plant('Monty', '2026-12-01T09:00:00')], now, 8, 30, 8, { cadence: 'weekly', lastPhotoAt: {} });
    expect(quiet).toHaveLength(1);
    expect(quiet[0].fireAt.toISOString()).toBe(new Date('2026-10-18T08:30:00').toISOString());
    expect(quiet[0].digest.title).toBe('Photo day 📸');
    expect(quiet[0].digest.route).toBe('/plant/monty');

    expect(planRounds([plant('Monty', '2026-12-01T09:00:00')], now, 8, 30, 8)).toEqual([]);
  });
});
