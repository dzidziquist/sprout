import { describe, expect, it } from 'vitest';
import { HOUSEPLANTS } from './houseplants';
import { EDIBLE_PLANTS } from './edibles';
import { EDIBLES } from '../edibles';
import { OTHER, SPECIES_LIST, searchSpecies, speciesOf } from '../species';

const ART = ['monstera', 'pothos', 'fig', 'calathea', 'snake', 'hoya', 'peace-lily', 'zz', 'string-of-pearls', 'pink-princess', 'aloe', 'spider', 'rubber', 'bird-of-paradise', 'basil', 'mint', 'tomato', 'pepper', 'spring-onion'];
const SOILS = ['potting_mix', 'chunky_aroid', 'gritty', 'perlite_mix', 'bagged_cactus', 'veg_mix', 'coir', 'moisture_control', 'moss', 'garden_soil', 'leca', 'unsure'];
const ALL = [...HOUSEPLANTS, ...EDIBLE_PLANTS];

describe('catalogue data', () => {
  it('has unique kebab-case ids that never clash with the generic "other" ids', () => {
    const ids = ALL.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(id.startsWith('other-')).toBe(false);
    }
  });

  it('has unique Latin names', () => {
    const names = ALL.map((s) => s.latinName.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('uses only valid enums and existing illustrations', () => {
    for (const s of ALL) {
      expect(ART, s.id).toContain(s.art);
      expect(SOILS, s.id).toContain(s.defaultSoil);
      expect(['low', 'medium', 'bright', 'direct'], s.id).toContain(s.defaultLight);
      expect(['succulent', 'tropical', 'moisture', 'edible'], s.id).toContain(s.group);
      expect(['yellow', 'blue', 'coral', 'grape', 'bubblegum'], s.id).toContain(s.artPot);
      expect(['houseplant', 'succulent', 'vegetable', 'herb', 'fruit'], s.id).toContain(s.category);
      expect(s.commonName.trim(), s.id).not.toBe('');
      expect(s.latinName.trim(), s.id).not.toBe('');
      if (s.tip) expect(s.tip.length, s.id).toBeLessThanOrEqual(140);
    }
  });

  it('keeps houseplants inedible and edibles edible', () => {
    for (const s of HOUSEPLANTS) expect(s.edible, s.id).toBe(false);
    for (const s of EDIBLE_PLANTS) expect(s.edible, s.id).toBe(true);
  });

  it('gives every edible a grow guide', () => {
    for (const s of EDIBLE_PLANTS) expect(EDIBLES[s.id], s.id).toBeDefined();
  });
});

describe('species helpers', () => {
  it('finds plants by common name, alias or Latin name', () => {
    expect(searchSpecies('pothos')[0].id).toBe('pothos');
    expect(searchSpecies('epipremnum')[0].id).toBe('pothos');
    expect(searchSpecies('zzzzqq')).toEqual([]);
  });

  it('lets "other" plants carry their own names', () => {
    const sp = speciesOf({ speciesId: 'other-succulent', custom: { commonName: 'Echeveria', latinName: 'Echeveria elegans' } });
    expect(sp).toMatchObject({ commonName: 'Echeveria', latinName: 'Echeveria elegans', group: 'succulent', art: OTHER.succulent.art });
  });

  it('never returns undefined for an unknown id', () => {
    expect(speciesOf({ speciesId: 'not-a-plant' }).group).toBe('tropical');
    expect(SPECIES_LIST.every((s) => !s.id.startsWith('other-'))).toBe(true);
  });
});
