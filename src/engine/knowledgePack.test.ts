import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CAUSES, SPECIES_NOTES, SYMPTOMS, TAP_SENSITIVE } from '../data/diagnosis';
import { mixBrand } from '../data/mixes';
import { getSpecies, SPECIES } from '../data/species';
import { symptomById } from './diagnose';
import { APP_VOCAB, applyPack, builtInIds, KB_FORMAT, PackError, snapshotPack, validatePack, type KnowledgePack } from './knowledgePack';

const formats = readdirSync('knowledge/formats').map((f) => JSON.parse(readFileSync(`knowledge/formats/${f}`, 'utf8')));
const latest = formats.reduce((a, b) => (b.format > a.format ? b : a));
const ids = JSON.parse(readFileSync('knowledge/ids.json', 'utf8')) as { causes: string[]; symptoms: string[]; species: string[] };
const V = '2026-10-31T17:00:00Z';
const fresh = () => JSON.parse(JSON.stringify({ ...snapshotPack(V), images: {} })) as KnowledgePack;

describe('knowledge pack format', () => {
  it('matches what this build understands (raise KB_FORMAT and run scripts/freeze-kb-format.ts when it changes)', () => {
    expect(latest.format).toBe(KB_FORMAT);
    const { signals, areas, tweaks, mixKinds } = latest;
    expect({ signals, areas, tweaks, mixKinds }).toEqual(APP_VOCAB);
  });

  it('carries every built-in entry, with nothing dropped, in every published format', () => {
    for (const f of formats) {
      const { pack, dropped } = validatePack({ ...fresh(), format: f.format }, f, f.format, { causes: [], symptoms: [], species: Object.keys(SPECIES) });
      expect(dropped).toEqual([]);
      expect(pack.causes.length).toBe(Object.keys(CAUSES).length);
    }
  });

  it('never removes an id a plant or a diary might point to (add new ids to knowledge/ids.json)', () => {
    const now = builtInIds();
    for (const k of ['causes', 'symptoms', 'species'] as const) {
      expect(ids[k].filter((id) => !now[k].includes(id)), `${k} removed`).toEqual([]);
      expect(now[k].filter((id) => !ids[k].includes(id)), `${k} missing from knowledge/ids.json`).toEqual([]);
    }
  });
});

describe('validatePack', () => {
  const known = builtInIds();

  it('refuses a pack in another format, or not a pack at all', () => {
    expect(() => validatePack({ ...fresh(), format: 99 }, APP_VOCAB, KB_FORMAT, known)).toThrow(PackError);
    expect(() => validatePack('hello', APP_VOCAB, KB_FORMAT, known)).toThrow(PackError);
    expect(() => validatePack({ ...fresh(), version: 'soon' }, APP_VOCAB, KB_FORMAT, known)).toThrow(PackError);
  });

  it('drops only the entries this build cannot use, keeping the rest', () => {
    const p = fresh() as unknown as Record<string, unknown> & KnowledgePack;
    const c = p.causes.find((x) => x.id === 'overwatering') as { signals: { signal: string }[] };
    c.signals[0].signal = 'moonPhase';
    p.mixes.push({ match: '(', name: 'Broken', kind: 'organic', source: 'x' });
    p.species['not-a-plant'] = { tip: 'Hi' };
    p.images['yellow-lower'] = { file: '../../etc/passwd', md5: 'a'.repeat(32) };
    (p.symptoms as unknown[]).push({ id: 'new-thing', area: 'leaves', label: 'New', hint: 'New', causes: [{ cause: 'no-such-cause', prior: 1 }] });
    const { pack, dropped } = validatePack(p, APP_VOCAB, KB_FORMAT, known);
    expect(dropped).toEqual(['cause overwatering', 'symptom new-thing', 'mix Broken', 'plant not-a-plant', 'picture for yellow-lower']);
    expect(pack.causes.find((x) => x.id === 'overwatering')).toBeUndefined();
    expect(pack.causes.length).toBe(Object.keys(CAUSES).length - 1);
  });

  it('accepts a withdrawal stub and rejects text that is too long', () => {
    const p = fresh();
    p.causes.push({ id: 'old-leaves', status: 'draft' });
    (p.causes.find((x) => x.id === 'cold') as { title: string }).title = 'x'.repeat(500);
    const { pack, dropped } = validatePack(p, APP_VOCAB, KB_FORMAT, known);
    expect(dropped).toEqual(['cause cold']);
    expect(pack.causes.filter((x) => x.id === 'old-leaves').at(-1)).toEqual({ id: 'old-leaves', status: 'draft' });
  });
});

describe('applyPack', () => {
  it('lays new and changed knowledge over the built-in copy, and hides withdrawn entries', () => {
    const p = fresh();
    (p.causes.find((x) => x.id === 'hungry') as { title: string }).title = 'Hungry for food';
    p.symptoms = p.symptoms.map((s) => (s.id === 'webbing' ? { id: 'webbing', status: 'draft' as const } : s));
    (p.symptoms as unknown[]).push({ id: 'silver-leaves', area: 'leaves', label: 'Silvery leaves', hint: 'A silvery sheen', causes: [{ cause: 'dry-air', prior: 2 }] });
    p.speciesNotes.monstera = { 'brown-tips': 'Monsteras brown at the tips in dry air.' };
    p.tapSensitive = ['spider'];
    p.mixes.push({ match: 'black\\s*gold', name: 'Black Gold', kind: 'organic', source: 'Black Gold label' });
    p.species.pothos = { tip: 'A new pothos tip.' };
    const { pack } = validatePack(p, APP_VOCAB, KB_FORMAT, builtInIds());
    applyPack(pack);

    expect(CAUSES.hungry.title).toBe('Hungry for food');
    expect(symptomById('webbing')).toBeUndefined();
    expect(symptomById('silver-leaves')?.label).toBe('Silvery leaves');
    expect(SYMPTOMS.filter((s) => s.id === 'silver-leaves')).toHaveLength(1);
    expect(SPECIES_NOTES.monstera?.['brown-tips']).toMatch(/dry air/);
    expect([...TAP_SENSITIVE]).toEqual(['spider']);
    expect(mixBrand('Black Gold potting soil')?.kind).toBe('organic');
    expect(mixBrand('fox farm ocean forest')?.name).toBe('FoxFarm Ocean Forest');
    expect(getSpecies('pothos').tip).toBe('A new pothos tip.');
    expect(getSpecies('pothos').commonName).toBe('Pothos');

    // Applying it again (a "Check now" after startup) changes nothing.
    applyPack(pack);
    expect(SYMPTOMS.filter((s) => s.id === 'silver-leaves')).toHaveLength(1);
  });
});
