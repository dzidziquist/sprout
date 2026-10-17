import { describe, expect, it } from 'vitest';
import { HOUSEPLANTS } from './houseplants';
import { EDIBLE_PLANTS } from './edibles';
import { CALENDAR, EDIBLES } from '../edibles';
import { OTHER, SPECIES_LIST, searchSpecies, speciesOf } from '../species';

const ART = ['monstera', 'pothos', 'fig', 'calathea', 'snake', 'hoya', 'peace-lily', 'zz', 'string-of-pearls', 'pink-princess', 'aloe', 'spider', 'rubber', 'bird-of-paradise', 'basil', 'mint', 'tomato', 'pepper', 'bell-pepper', 'potato', 'sweet-potato', 'okra', 'cucumber', 'zucchini', 'lettuce', 'kale', 'garlic', 'carrot', 'garden-egg', 'eggplant', 'ginger', 'radish', 'chard', 'spinach', 'pea', 'runner-bean', 'mustard-greens', 'microgreens', 'kontomire', 'fava-bean', 'bush-bean', 'amaranth', 'leek', 'bok-choy', 'spring-onion'];
const SOILS = ['potting_mix', 'chunky_aroid', 'gritty', 'perlite_mix', 'bagged_cactus', 'veg_mix', 'coir', 'moisture_control', 'moss', 'garden_soil', 'leca', 'water', 'unsure'];
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

  it('covers the common houseplants, including the ids the illustrations are drawn for', () => {
    expect(HOUSEPLANTS.length).toBeGreaterThanOrEqual(140);
    const ids = new Set(HOUSEPLANTS.map((s) => s.id));
    const required = ['philodendron-heartleaf', 'philodendron-brasil', 'alocasia-polly', 'anthurium', 'phalaenopsis', 'boston-fern', 'pilea', 'begonia-maculata', 'jade', 'echeveria', 'christmas-cactus', 'dracaena-marginata', 'croton', 'african-violet', 'aglaonema', 'parlor-palm', 'english-ivy', 'tradescantia', 'maranta', 'syngonium'];
    for (const id of required) expect(ids.has(id), id).toBe(true);
    const popular = HOUSEPLANTS.filter((s) => s.popular).length;
    expect(popular).toBeGreaterThanOrEqual(30);
    expect(popular).toBeLessThanOrEqual(50);
  });

  it('gives every houseplant a tip, a pet-safety flag and a houseplant or succulent category', () => {
    for (const s of HOUSEPLANTS) {
      expect(s.tip, s.id).toBeTruthy();
      expect(typeof s.petToxic, s.id).toBe('boolean');
      expect(['houseplant', 'succulent'], s.id).toContain(s.category);
      expect(s.group, s.id).not.toBe('edible');
    }
  });

  it('writes photo-ID synonyms as lowercase "genus species"', () => {
    for (const s of ALL) {
      for (const n of s.match?.species ?? []) expect(n, s.id).toMatch(/^[a-z-]+ [a-z-]+$/);
      for (const g of [...(s.match?.genus ?? []), ...(s.match?.relatives ?? [])]) expect(g, s.id).toMatch(/^[a-z-]+$/);
    }
  });

  it('keeps houseplants inedible and edibles edible', () => {
    for (const s of HOUSEPLANTS) expect(s.edible, s.id).toBe(false);
    for (const s of EDIBLE_PLANTS) expect(s.edible, s.id).toBe(true);
  });

  it('gives every edible a grow guide', () => {
    for (const s of EDIBLE_PLANTS) expect(EDIBLES[s.id], s.id).toBeDefined();
  });

  it('has the edibles whose illustrations are being commissioned', () => {
    const ids = new Set(EDIBLE_PLANTS.map((s) => s.id));
    for (const id of ['lettuce', 'kale', 'bush-bean', 'pea', 'cucumber', 'zucchini', 'strawberry', 'blueberry', 'rosemary', 'parsley', 'cilantro', 'chives', 'garlic', 'radish', 'carrot', 'meyer-lemon']) {
      expect(ids.has(id), id).toBe(true);
    }
    expect(EDIBLE_PLANTS.length).toBeGreaterThanOrEqual(45);
  });

  it('keeps grow-guide labels short enough for the stage track', () => {
    for (const g of Object.values(EDIBLES)) {
      expect(g.stages.length, g.id).toBeGreaterThan(0);
      for (const s of g.stages) expect(g.info[s]?.label.length ?? 99, `${g.id}/${s}`).toBeLessThanOrEqual(7);
    }
  });

  it('keeps calendar cards short and every edible on the Seattle calendar', () => {
    for (const t of [...CALENDAR.seattle, ...CALENDAR.accra]) {
      expect(t.title.length, t.id).toBeLessThanOrEqual(24);
      expect(t.body.length, t.id).toBeLessThanOrEqual(110);
    }
    for (const s of EDIBLE_PLANTS) expect(CALENDAR.seattle.some((t) => t.species.includes(s.id)), s.id).toBe(true);
  });

  it('flags alliums, nightshade foliage and ASPCA-listed herbs as pet-toxic', () => {
    const toxic = new Map(EDIBLE_PLANTS.map((s) => [s.id, s.petToxic]));
    for (const id of ['garlic', 'chives', 'leek', 'spring-onion', 'tomato', 'eggplant', 'parsley', 'oregano', 'lavender', 'lemongrass', 'bay-laurel', 'meyer-lemon', 'common-fig', 'kontomire']) {
      expect(toxic.get(id), id).toBe(true);
    }
    for (const id of ['lettuce', 'cucumber', 'zucchini', 'carrot', 'strawberry', 'blueberry', 'rosemary', 'thyme', 'sage', 'cilantro', 'basil']) {
      expect(toxic.get(id), id).toBe(false);
    }
  });
});

describe('species helpers', () => {
  it('finds plants by common name, alias or Latin name', () => {
    expect(searchSpecies('pothos')[0].id).toBe('pothos');
    expect(searchSpecies('epipremnum')[0].id).toBe('pothos');
    expect(searchSpecies("devil's ivy")[0].id).toBe('pothos');
    expect(searchSpecies('sansevieria')[0].id).toBe('snake');
    expect(searchSpecies('chinese money plant')[0].id).toBe('pilea');
    expect(searchSpecies('prayer plant')[0].id).toBe('maranta');
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
