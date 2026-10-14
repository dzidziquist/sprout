import { describe, expect, it } from 'vitest';
import { getSpecies, SPECIES_LIST } from '../data/species';
import { buildIdentifyUrl, confidenceLabel, identifyPlant, matchCatalogue, normalizeLatin, parsePlantNet, PlantIdError, speciesFor, type PlantNetResult } from './plantId';

const r = (latinName: string, score: number, commonNames: string[] = []): PlantNetResult => ({ latinName, score, commonNames });

describe('normalizeLatin', () => {
  it('keeps genus and species only', () => {
    expect(normalizeLatin("Philodendron erubescens 'Pink Princess'")).toBe('philodendron erubescens');
    expect(normalizeLatin('Capsicum annuum var. glabriusculum')).toBe('capsicum annuum');
    expect(normalizeLatin('  Ficus   Lyrata ')).toBe('ficus lyrata');
    expect(normalizeLatin('Goeppertia')).toBe('goeppertia');
  });
});

describe('speciesFor', () => {
  it.each([
    ['Epipremnum aureum', 'pothos', true],
    ['Ficus lyrata', 'fig', true],
    ['Ficus elastica', 'rubber', true],
    ['Ficus benjamina', 'ficus-benjamina', true],
    ['Ficus religiosa', 'fig', false],
    ['Goeppertia orbifolia', 'calathea', true],
    ['Calathea lutea', 'calathea', true],
    ['Dracaena trifasciata', 'snake', true],
    ['Sansevieria cylindrica', 'snake', true],
    ['Solanum lycopersicum', 'tomato', true],
    ['Capsicum annuum', 'pepper', true],
    ['Allium fistulosum', 'spring-onion', true],
    ["Philodendron erubescens 'Pink Princess'", 'pink-princess', true],
    ['Philodendron hederaceum', 'philodendron-heartleaf', true],
    ["Philodendron hederaceum 'Brasil'", 'philodendron-heartleaf', true],
    ['Philodendron gloriosum', 'philodendron-gloriosum', true],
    ['Philodendron rugosum', 'pink-princess', false],
    ['Philodendron selloum', 'philodendron-selloum', true],
    ['Philodendron xanadu', 'philodendron-xanadu', true],
    ['Monstera deliciosa', 'monstera', true],
    ['Zamioculcas zamiifolia', 'zz', true],
    ['Curio rowleyanus', 'string-of-pearls', true],
    // Synonyms and old names
    ['Sansevieria trifasciata', 'snake', true],
    ['Sansevieria masoniana', 'whale-fin', true],
    ['Scindapsus pictus', 'satin-pothos', true],
    ['Scindapsus aureus', 'pothos', true],
    ['Calathea makoyana', 'peacock-plant', true],
    ['Calathea lancifolia', 'rattlesnake-plant', true],
    ['Calathea musaica', 'calathea-network', true],
    ['Calathea warszewiczii', 'calathea', true],
    ['Dracaena marginata', 'dracaena-marginata', true],
    ['Dracaena reflexa', 'dracaena-marginata', true],
    ['Dracaena surculosa', 'corn-plant', false],
    ['Dypsis lutescens', 'areca-palm', true],
    ['Saintpaulia ionantha', 'african-violet', true],
    ['Schefflera arboricola', 'umbrella-tree', true],
    ['Schlumbergera truncata', 'christmas-cactus', true],
    ['Hatiora gaertneri', 'easter-cactus', true],
    ['Echinocactus grusonii', 'golden-barrel', true],
    ['Senecio radicans', 'string-of-bananas', true],
    ['Rhoeo spathacea', 'moses-in-the-cradle', true],
    ['Philodendron scandens', 'philodendron-heartleaf', true],
    // Whole-genus entries
    ['Echeveria agavoides', 'echeveria', true],
    ['Haworthia cooperi', 'haworthia', true],
    ['Aglaonema modestum', 'aglaonema', true],
    ['Tradescantia sillamontana', 'tradescantia', true],
    ['Hoya lacunosa', 'hoya', true],
    ['Alocasia cuprea', 'alocasia-polly', false],
    ['Begonia lucerna', 'rex-begonia', false],
  ])('%s → %s', (name, id, exact) => {
    expect(speciesFor(name)).toEqual({ id, exact });
  });

  it('does not map unrelated plants', () => {
    expect(speciesFor('Quercus robur')).toBeNull();
    expect(speciesFor('Rhododendron simsii')).toBeNull();
    expect(speciesFor('Rosa canina')).toBeNull();
  });

  it('maps every catalogue latin name to itself, or a cultivar to its plain species', () => {
    for (const s of SPECIES_LIST) {
      const hit = speciesFor(s.latinName);
      if (hit?.id === s.id) continue;
      // Cultivars (e.g. 'Brasil') share their species' Latin name; photo ID can't tell them apart.
      expect(s.latinName, s.id).toMatch(/'/);
      expect(normalizeLatin(getSpecies(hit!.id).latinName), s.id).toBe(normalizeLatin(s.latinName));
      expect(getSpecies(hit!.id).latinName, s.id).not.toMatch(/'/);
    }
  });

  it('lets each genus be claimed by one entry at most', () => {
    const seen = new Map<string, string>();
    for (const s of SPECIES_LIST) {
      for (const g of [...(s.match?.genus ?? []), ...(s.match?.relatives ?? [])]) {
        expect(seen.get(g), `${g}: ${s.id}`).toBeUndefined();
        seen.set(g, s.id);
      }
    }
  });

  it('never claims the same exact name for two entries', () => {
    const seen = new Map<string, string>();
    for (const s of SPECIES_LIST) {
      const own = s.latinName.includes("'") ? [] : [normalizeLatin(s.latinName)];
      for (const n of [...own, ...(s.match?.species ?? [])]) {
        expect(seen.get(n), `${n}: ${s.id}`).toBeUndefined();
        seen.set(n, s.id);
      }
    }
  });
});

describe('confidenceLabel', () => {
  it('uses the agreed thresholds', () => {
    expect(confidenceLabel(0.6)).toBe('Pretty sure');
    expect(confidenceLabel(0.59)).toBe('Maybe');
    expect(confidenceLabel(0.25)).toBe('Maybe');
    expect(confidenceLabel(0.24)).toBe('Long shot');
  });
});

describe('matchCatalogue', () => {
  it('ranks matches, merges answers for the same species and drops unknowns', () => {
    const out = matchCatalogue([r('Goeppertia orbifolia', 0.4), r('Calathea lutea', 0.25), r('Rosa canina', 0.2), r('Epipremnum aureum', 0.1)]);
    expect(out.map((m) => m.speciesId)).toEqual(['calathea', 'pothos']);
    expect(out[0].score).toBeCloseTo(0.65);
    expect(out[0].confidence).toBe('Pretty sure');
    expect(out[0].latinName).toBe('Goeppertia orbifolia');
    expect(out[1].confidence).toBe('Long shot');
  });

  it('ranks an exact match above a genus cousin with the same raw score', () => {
    const out = matchCatalogue([r('Ficus religiosa', 0.3), r('Ficus elastica', 0.3)]);
    expect(out[0]).toMatchObject({ speciesId: 'rubber', exact: true });
    expect(out[1]).toMatchObject({ speciesId: 'fig', exact: false, confidence: 'Long shot' });
    expect(out[1].score).toBeCloseTo(0.24);
  });

  it('returns at most three and caps the score at 1', () => {
    const out = matchCatalogue([r('Hoya carnosa', 0.7), r('Hoya lacunosa', 0.5), r('Aloe vera', 0.1), r('Mentha spicata', 0.05), r('Ocimum basilicum', 0.02)]);
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ speciesId: 'hoya', score: 1, confidence: 'Pretty sure' });
  });

  it('is empty when nothing maps', () => {
    expect(matchCatalogue([r('Rosa canina', 0.9)])).toEqual([]);
  });
});

const SAMPLE = {
  bestMatch: 'Epipremnum aureum (Linden & André) G.S.Bunting',
  results: [
    { score: 0.21, species: { scientificNameWithoutAuthor: 'Philodendron hederaceum', genus: { scientificNameWithoutAuthor: 'Philodendron' }, commonNames: ['Heartleaf philodendron'] } },
    { score: 0.72, species: { scientificNameWithoutAuthor: 'Epipremnum aureum', genus: { scientificNameWithoutAuthor: 'Epipremnum' }, commonNames: ['Golden pothos', "Devil's ivy"] } },
    { score: 'x', species: {} },
  ],
};

describe('parsePlantNet', () => {
  it('reads results best first and skips junk', () => {
    const out = parsePlantNet(SAMPLE);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ latinName: 'Epipremnum aureum', score: 0.72, commonNames: ['Golden pothos', "Devil's ivy"], genus: 'Epipremnum' });
  });
  it('tolerates unknown shapes', () => {
    expect(parsePlantNet(null)).toEqual([]);
    expect(parsePlantNet({ results: 'nope' })).toEqual([]);
  });
});

describe('buildIdentifyUrl', () => {
  it('needs a key unless a proxy is set', () => {
    expect(() => buildIdentifyUrl(undefined)).toThrow(PlantIdError);
    expect(buildIdentifyUrl('abc')).toBe('https://my-api.plantnet.org/v2/identify/all?api-key=abc&include-related-images=false&nb-results=5');
    expect(buildIdentifyUrl(undefined, 'https://proxy.example/id')).toBe('https://proxy.example/id?include-related-images=false&nb-results=5');
  });
});

describe('identifyPlant', () => {
  const withKey = async (fn: () => Promise<void>) => {
    const prev = process.env.EXPO_PUBLIC_PLANTNET_KEY;
    process.env.EXPO_PUBLIC_PLANTNET_KEY = 'test-key';
    try {
      await fn();
    } finally {
      if (prev === undefined) delete process.env.EXPO_PUBLIC_PLANTNET_KEY;
      else process.env.EXPO_PUBLIC_PLANTNET_KEY = prev;
    }
  };
  const res = (status: number, body?: unknown) => new Response(body === undefined ? null : JSON.stringify(body), { status });

  it('throws no-key when unconfigured', async () => {
    const prev = process.env.EXPO_PUBLIC_PLANTNET_KEY;
    delete process.env.EXPO_PUBLIC_PLANTNET_KEY;
    await expect(identifyPlant('file:///a.jpg')).rejects.toMatchObject({ kind: 'no-key' });
    if (prev !== undefined) process.env.EXPO_PUBLIC_PLANTNET_KEY = prev;
  });

  it('posts the photo and maps the answer', () =>
    withKey(async () => {
      const calls: [string, RequestInit | undefined][] = [];
      const fetchImpl = (async (url: string, init?: RequestInit) => {
        calls.push([url, init]);
        if (url.startsWith('data:')) return new Response(new Blob(['x']));
        return res(200, SAMPLE);
      }) as unknown as typeof fetch;
      const out = await identifyPlant('data:image/jpeg;base64,eA==', { fetchImpl });
      const [url, init] = calls[1];
      expect(url).toContain('api-key=test-key');
      expect(init?.method).toBe('POST');
      expect((init?.body as FormData).get('organs')).toBe('auto');
      expect((init?.body as FormData).get('images')).toBeTruthy();
      expect(out.matches[0]).toMatchObject({ speciesId: 'pothos', confidence: 'Pretty sure' });
    }));

  it('treats 404 as "no match" and maps other failures to friendly kinds', () =>
    withKey(async () => {
      const make = (status: number) => (async (url: string) => (url.startsWith('data:') ? new Response(new Blob(['x'])) : res(status, {}))) as unknown as typeof fetch;
      await expect(identifyPlant('data:x', { fetchImpl: make(404) })).resolves.toEqual({ results: [], matches: [] });
      await expect(identifyPlant('data:x', { fetchImpl: make(429) })).rejects.toMatchObject({ kind: 'quota' });
      await expect(identifyPlant('data:x', { fetchImpl: make(401) })).rejects.toMatchObject({ kind: 'bad-key' });
      await expect(identifyPlant('data:x', { fetchImpl: make(500) })).rejects.toMatchObject({ kind: 'server' });
      const offline = (async (url: string) => {
        if (url.startsWith('data:')) return new Response(new Blob(['x']));
        throw new TypeError('Network request failed');
      }) as unknown as typeof fetch;
      await expect(identifyPlant('data:x', { fetchImpl: offline })).rejects.toMatchObject({ kind: 'offline' });
    }));
});
