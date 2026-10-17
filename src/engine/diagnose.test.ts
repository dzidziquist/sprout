import { describe, expect, it } from 'vitest';
import { diagnose, signalsFor, speciesNote, symptomsFor } from './diagnose';
import { CAUSES, SHADE_LOVERS, SPECIES_NOTES, SYMPTOMS, TAP_SENSITIVE } from '../data/diagnosis';
import { causeForLabel, parseHealth } from '../lib/plantHealth';
import { SPECIES } from '../data/species';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { CareEvent, CheckResult, Plant } from '../types';

function plant(extra: Partial<Plant> = {}): Plant {
  return {
    id: 'a',
    name: 'Monty',
    speciesId: 'pothos',
    potColor: 'blue',
    soil: 'potting_mix',
    potMaterial: 'plastic',
    potDiameterCm: 15,
    light: 'bright',
    placement: 'indoor',
    origin: 'bought',
    acquiredAt: '2026-01-01T09:00:00',
    createdAt: '2026-01-01T09:00:00',
    lastRepottedAt: '2026-03-01T09:00:00',
    k: 1,
    nextCheckAt: '2026-07-16T09:00:00',
    ...extra,
  };
}
const checks = (...results: CheckResult[]): CareEvent[] =>
  results.map((result, i) => ({ id: `c${i}`, plantId: 'a', type: 'check', result, at: `2026-07-1${i}T09:00:00` }));
const now = new Date('2026-07-15T12:00:00');
const run = (symptom: string, p: Plant, events: CareEvent[] = []) => diagnose(symptom, { plant: p, events, climate: 'seattle', now });

describe('plant doctor knowledge', () => {
  it('only points at causes, species and plants that exist', () => {
    for (const s of SYMPTOMS) {
      expect(s.causes.length, s.id).toBeGreaterThan(0);
      for (const c of s.causes) expect(CAUSES[c.cause], `${s.id} → ${c.cause}`).toBeDefined();
    }
    for (const c of Object.values(CAUSES)) {
      expect(c.check.length, c.id).toBeGreaterThan(0);
      expect(c.fix.length, c.id).toBeGreaterThan(0);
    }
    for (const id of [...TAP_SENSITIVE, ...SHADE_LOVERS, ...Object.keys(SPECIES_NOTES)]) expect(SPECIES[id], id).toBeDefined();
    for (const [id, notes] of Object.entries(SPECIES_NOTES)) for (const sym of Object.keys(notes)) expect(SYMPTOMS.some((s) => s.id === sym), `${id}: ${sym}`).toBe(true);
    expect(new Set(SYMPTOMS.map((s) => s.id)).size).toBe(SYMPTOMS.length);
    // Every symptom tile has its picture, registered under its id (read as text: tests can't load PNGs).
    const art = readFileSync(join(__dirname, '../data/symptomArt.ts'), 'utf8');
    for (const s of SYMPTOMS) {
      expect(art, s.id).toContain(`'${s.id}': require('../../assets/symptoms/symptom-${s.id}.png')`);
      expect(existsSync(join(__dirname, `../../assets/symptoms/symptom-${s.id}.png`)), s.id).toBe(true);
    }
  });

  it('never gives pesticide doses', () => {
    const text = JSON.stringify(CAUSES).toLowerCase();
    expect(text).not.toMatch(/\bml\b|per litre|per gallon|neem|insecticide|pesticide/);
  });
});

describe('plant doctor', () => {
  it('blames wet soil when the checks keep finding it wet', () => {
    const top = run('yellow-lower', plant(), checks('damp', 'soggy', 'damp'))[0];
    expect(top.cause.id).toBe('overwatering');
    expect(top.likelihood).toBe('Likely');
    expect(top.why.join(' ')).toMatch(/wet/);
  });

  it('blames thirst when the checks keep finding it bone dry', () => {
    const top = run('drooping', plant({ potMaterial: 'terracotta', potDiameterCm: 10 }), checks('dry', 'dry', 'dry'))[0];
    expect(top.cause.id).toBe('underwatering');
    expect(top.cause.tweak).toBe('more-water');
  });

  it('knows calatheas hate tap water', () => {
    const results = run('brown-tips', plant({ speciesId: 'calathea' }));
    expect(results.map((r) => r.cause.id)).toContain('tap-water');
    expect(results[0].cause.id).toBe('tap-water');
    expect(speciesNote({ speciesId: 'calathea' }, 'brown-tips')).toMatch(/tap water/);
  });

  it('points at settling in for a plant that just came home', () => {
    expect(run('dropping', plant({ acquiredAt: '2026-07-05T09:00:00', createdAt: '2026-07-05T09:00:00' }))[0].cause.id).toBe('shock');
  });

  it('works out the plant’s story', () => {
    const s = signalsFor({ plant: plant({ light: 'low', potDiameterCm: 10, acquiredAt: '2025-01-01T00:00:00', lastRepottedAt: undefined }), events: checks('damp', 'damp'), climate: 'seattle', now });
    expect([...s]).toEqual(expect.arrayContaining(['wetChecks', 'lowLight', 'smallPot', 'oldMix', 'indoor', 'unfed']));
    expect(s.has('dryChecks')).toBe(false);
  });

  it('shows fruit problems for edibles only', () => {
    expect(symptomsFor({ speciesId: 'pothos', soil: 'potting_mix' }).some((s) => s.area === 'fruit')).toBe(false);
    expect(symptomsFor({ speciesId: 'tomato', soil: 'veg_mix' }).some((s) => s.id === 'fruit-rot-end')).toBe(true);
  });

  it('gives water and LECA plants water advice, never soil advice', () => {
    const syms = symptomsFor({ speciesId: 'lucky-bamboo', soil: 'water' });
    expect(syms.some((x) => x.soilOnly)).toBe(false);
    expect(syms.find((x) => x.id === 'soil-smell')?.label).toBe('Water smells bad or looks cloudy');
    const bamboo = plant({ speciesId: 'lucky-bamboo', soil: 'water' });
    for (const s of syms) for (const r of run(s.id, bamboo, checks('damp', 'damp', 'damp'))) expect(r.cause.soilOnly, `${s.id} → ${r.cause.id}`).toBeFalsy();
    expect(run('yellow-lower', bamboo)[0].cause.id).toBe('stale-water');
    for (const r of run('yellow-lower', plant())) expect(r.cause.waterOnly).toBeFalsy();
  });

  it('returns at most three causes that add up to everything shown', () => {
    const r = run('yellow-lower', plant());
    expect(r.length).toBeLessThanOrEqual(3);
    expect(r.reduce((n, x) => n + x.share, 0)).toBeCloseTo(1);
  });
});

describe('photo check (Pl@ntNet diseases)', () => {
  it('reads results, names them and links them to plant doctor causes', () => {
    const out = parseHealth({ results: [{ name: 'ERYSSP', score: 0.2 }, { name: 'TETRUR', score: 0.71 }, { name: 42 }] }, { TETRUR: 'Two-spotted spider mite', ERYSSP: 'Powdery mildews' });
    // The answer's own description wins, so names still show when the name list didn't load.
    expect(parseHealth({ results: [{ name: 'APHISP', description: 'Aphids', score: 0.5 }] })[0]).toMatchObject({ name: 'Aphids', causeId: 'aphids' });
    expect(out.map((r) => r.code)).toEqual(['TETRUR', 'ERYSSP']);
    expect(out[0]).toMatchObject({ name: 'Two-spotted spider mite', causeId: 'spider-mites', confidence: 'Pretty sure' });
    expect(out[1].causeId).toBe('powdery-mildew');
    expect(parseHealth(null)).toEqual([]);
  });

  it('maps common names onto causes', () => {
    expect(causeForLabel('Green peach aphid')).toBe('aphids');
    expect(causeForLabel('Citrus mealybug')).toBe('mealybugs');
    expect(causeForLabel('Tomato early blight')).toBe('leaf-spot');
    expect(causeForLabel('Something unheard of')).toBeUndefined();
  });
});
