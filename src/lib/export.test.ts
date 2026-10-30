import { describe, expect, it } from 'vitest';
import { buildCareDiaryCsv, buildExportJson, csvCell, parseBackup } from './export';
import { DEFAULT_PROFILE } from '../store/plantStore';
import type { CareEvent, Plant } from '../types';

const plant = (id: string, name: string, speciesId: Plant['speciesId']): Plant => ({
  id,
  name,
  speciesId,
  potColor: 'blue',
  soil: 'potting_mix',
  potMaterial: 'plastic',
  potDiameterCm: 15,
  light: 'medium',
  placement: 'indoor',
  origin: 'bought',
  acquiredAt: '2026-01-01T00:00:00.000Z',
  k: 1,
  nextCheckAt: '2026-02-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
});

const plants = [plant('p1', 'Queenie', 'pothos'), plant('p2', 'Tommy, "the big one"', 'tomato'), plant('p3', 'Rootie', 'pothos')];
const events: CareEvent[] = [
  { id: 'e3', plantId: 'p2', type: 'harvest', amount: 6, unit: 'fruit', note: 'Sweet!\nBest yet', at: '2026-03-02T10:00:00.000Z' },
  { id: 'e1', plantId: 'p1', type: 'check', result: 'dry', at: '2026-03-01T08:30:00.000Z' },
  { id: 'e2', plantId: 'p1', type: 'cutting', note: 'p3', at: '2026-03-01T09:00:00.000Z' },
  { id: 'e4', plantId: 'p2', type: 'stage', stage: 'fruiting', at: '2026-03-03T10:00:00.000Z' },
  { id: 'e5', plantId: 'gone', type: 'note', note: '=HYPERLINK("x")', at: '2026-03-04T10:00:00.000Z' },
];

describe('csvCell', () => {
  it('quotes and escapes only when needed', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('two\nlines')).toBe('"two\nlines"');
    expect(csvCell(6)).toBe('6');
    expect(csvCell(undefined)).toBe('');
  });
  it('defuses spreadsheet formulas in text', () => {
    expect(csvCell('=1+1')).toBe("'=1+1");
    expect(csvCell('@cmd')).toBe("'@cmd");
  });
});

describe('buildCareDiaryCsv', () => {
  const csv = buildCareDiaryCsv(plants, events);
  const lines = csv.split('\r\n');

  it('has the header and rows sorted by date', () => {
    expect(lines[0]).toBe('date,plant,species,event,result,amount,unit,note');
    expect(lines[1]).toBe('2026-03-01T08:30:00.000Z,Queenie,Pothos,check,dry,,,');
    expect(csv.endsWith('\r\n')).toBe(true);
  });
  it('names cuttings, escapes names and notes, and uses the stage as result', () => {
    expect(lines[2]).toBe('2026-03-01T09:00:00.000Z,Queenie,Pothos,cutting,,,,Cutting: Rootie');
    expect(lines[3]).toBe('2026-03-02T10:00:00.000Z,"Tommy, ""the big one""",Cherry tomato,harvest,,6,fruit,"Sweet!\nBest yet"');
    expect(lines[4]).toContain(',stage,fruiting,');
  });
  it('keeps events of deleted plants and defuses formulas', () => {
    expect(csv).toContain(`(deleted plant),,note,,,,"'=HYPERLINK(""x"")"`);
  });
});

describe('buildExportJson', () => {
  it('includes plants, events and the profile minus internal flags', () => {
    const doc = JSON.parse(buildExportJson({ profile: { ...DEFAULT_PROFILE, supporter: true }, plants, events }, new Date('2026-10-14T12:00:00Z')));
    expect(doc).toMatchObject({ app: 'PlantFam', format: 1, exportedAt: '2026-10-14T12:00:00.000Z' });
    expect(doc.plants).toHaveLength(3);
    expect(doc.events).toHaveLength(5);
    expect(doc.profile.city).toBe('Seattle');
    // The tip travels with the backup so the thank-you follows someone to a new phone.
    expect(doc.profile.supporter).toBe(true);
    expect(doc.profile).not.toHaveProperty('streakFreezes');
  });
});

describe('parseBackup', () => {
  const plant = { id: 'p1', name: 'Queenie', speciesId: 'pothos', nextCheckAt: '2026-10-20T09:00:00.000Z', k: 1 };
  const good = { app: 'PlantFam', format: 1, exportedAt: '2026-10-14T09:00:00.000Z', profile: { city: 'Seattle' }, plants: [plant], events: [{ id: 'e1', plantId: 'p1', type: 'check', at: '2026-10-14T09:00:00.000Z' }, { id: 'e2', plantId: 'ghost', type: 'check', at: 'x' }] };

  it('round-trips an export', () => {
    const out = parseBackup(buildExportJson({ profile: DEFAULT_PROFILE, plants: [plant as never], events: [] }));
    expect(out.ok).toBe(true);
  });

  it('accepts a valid backup and drops events for unknown plants', () => {
    const out = parseBackup('﻿' + JSON.stringify(good));
    expect(out.ok && out.data.plants.length).toBe(1);
    expect(out.ok && out.data.events.map((e) => e.id)).toEqual(['e1']);
  });

  it('rejects other files, newer formats and damaged plants', () => {
    expect(parseBackup('not json').ok).toBe(false);
    expect(parseBackup(JSON.stringify({ hello: 1 })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ ...good, format: 2 })).ok).toBe(false);
    expect(parseBackup(JSON.stringify({ ...good, plants: [{ id: 'x' }] })).ok).toBe(false);
  });

  it('fills what an older backup never had, and drops settings with the wrong shape', () => {
    const out = parseBackup(JSON.stringify({ ...good, profile: { city: 'Seattle', round: null, theme: 'neon', grows: { houseplants: true, edibles: false, cuttings: true } } }));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.data.plants[0]).toMatchObject({ soil: 'potting_mix', potMaterial: 'plastic', potDiameterCm: 15, placement: 'indoor', acquiredAt: plant.nextCheckAt });
    expect(out.data.profile).toEqual({ city: 'Seattle', grows: { houseplants: true, edibles: false, cuttings: true } });
  });

  it('rejects a plant with a wrong value, a bad date or a repeated id', () => {
    const bad = (patch: object) => parseBackup(JSON.stringify({ ...good, plants: [{ ...plant, ...patch }] })).ok;
    expect(bad({ soil: 'lava' })).toBe(false);
    expect(bad({ potDiameterCm: -3 })).toBe(false);
    expect(bad({ nextCheckAt: 'tomorrow' })).toBe(false);
    expect(bad({ lastRepottedAt: 'never' })).toBe(false);
    expect(bad({ k: Number.NaN })).toBe(false);
    expect(bad({ mix: { fertiliser: 'yes' } })).toBe(false);
    expect(parseBackup(JSON.stringify({ ...good, plants: [plant, plant] })).ok).toBe(false);
  });

  it('drops events with an unknown type or an unreadable date', () => {
    const out = parseBackup(JSON.stringify({ ...good, events: [{ id: 'a', plantId: 'p1', type: 'check', at: 'x' }, { id: 'b', plantId: 'p1', type: 'dance', at: '2026-10-14T09:00:00.000Z' }, good.events[0]] }));
    expect(out.ok && out.data.events.map((e) => e.id)).toEqual(['e1']);
  });

  it('checks nested values all the way down (the reviewers’ crash reproductions)', () => {
    const bad = (patch: object) => parseBackup(JSON.stringify({ ...good, plants: [{ ...plant, ...patch }] })).ok;
    expect(bad({ rooting: { method: 'air', startedAt: '2026-10-01T00:00:00Z' } })).toBe(false);
    expect(bad({ rooting: { method: 'water' } })).toBe(false);
    expect(bad({ mix: { fertiliser: 'yes', pottedAt: '2026-10-01T00:00:00Z', kind: 'rocket' } })).toBe(false);
    expect(bad({ custom: { latinName: 'x' } })).toBe(false);
    expect(bad({ stage: 'teenager' })).toBe(false);
    expect(bad({ lastResult: 'wet' })).toBe(false);

    const profile = (p: object) => {
      const out = parseBackup(JSON.stringify({ ...good, profile: p }));
      return out.ok ? out.data.profile : null;
    };
    // Climates the app can't work with are left out, so the phone keeps its own.
    expect(profile({ climate: 'paris' })).toEqual({});
    expect(profile({ climate: { model: 'mars', shift: 0, place: 'x', lat: 1, lon: 1, frost: false } })).toEqual({});
    expect(profile({ climate: { model: 'seattle', shift: 1.5, place: 'x', lat: 1, lon: 1, frost: false } })).toEqual({});
    expect(profile({ climate: { model: 'seattle', shift: 3, place: 'Toronto', lat: 43.7, lon: -79.4, frost: true } })).toHaveProperty('climate');
    expect(profile({ climate: 'accra' })).toEqual({ climate: 'accra' });
    expect(profile({ sunlight: { key: 'k', clearness: [0.5], at: '2026-01-01T00:00:00Z' } })).toEqual({});
    expect(profile({ sunlight: { key: 'k', clearness: Array(12).fill(0.5), at: '2026-01-01T00:00:00Z' } })).toHaveProperty('sunlight');
    expect(profile({ rooms: { Kitchen: { windows: [{ id: 'w', shade: 'lace' }] } } })).toEqual({});
    expect(profile({ wishlist: [{ id: 'w' }] })).toEqual({});
    expect(profile({ trips: [{ from: 'soon', to: 'later' }] })).toEqual({});
    expect(profile({ round: { enabled: true, hour: 31, minute: 0 } })).toEqual({});
    // Never part of a backup: a household or iCloud state in the file is ignored.
    expect(profile({ household: { role: 'owner' }, cloudBackup: {}, made: 'up' })).toEqual({});
  });

  it('drops diary entries with damaged details, and keeps the good light readings', () => {
    const at = '2026-10-14T09:00:00.000Z';
    const out = parseBackup(JSON.stringify({ ...good, plants: [{ ...plant, lightReadings: [{ at, lux: 900, share: 0.4, sunny: false }, { lux: 'bright' }] }], events: [good.events[0], { id: 'r', plantId: 'p1', type: 'check', result: 'wet', at }, { id: 's', plantId: 'p1', type: 'undo', at }, { id: 'b', plantId: 'p1', type: 'check', at, before: { k: 1 } }] }));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.data.events.map((e) => e.id)).toEqual(['e1']);
    expect(out.data.plants[0].lightReadings).toHaveLength(1);
  });
});
