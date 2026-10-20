import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => void store.set(k, v),
  },
}));

import { commonsFile, fetchPhoto, fetchWiki, parsePhoto, parseSummary, wikiTitles } from './wiki';

const page = (title: string, extra: object = {}) => ({
  type: 'standard',
  title,
  description: 'Species of flowering plant',
  extract: `${title} is a plant in the arrowroot family, native to the tropical Americas and grown for its leaves.`,
  thumbnail: { source: `https://upload.wikimedia.org/${title}.jpg` },
  content_urls: { mobile: { page: `https://en.m.wikipedia.org/wiki/${title}` } },
  ...extra,
});
const reply = (status: number, body?: object) => ({ ok: status < 400, status, json: async () => body }) as Response;

beforeEach(() => store.clear());

describe('Wikipedia lookups', () => {
  it('tries the species, then the common name, and the genus only last', () => {
    expect(wikiTitles('Hoya carnosa', 'Hoya')).toEqual(['Hoya carnosa', 'Hoya']);
    expect(wikiTitles('Aloe vera', 'Aloe vera')).toEqual(['Aloe vera', 'Aloe']);
    // A variety, cultivar or group: the common name is the better article ("Beta" alone is a Greek letter).
    expect(wikiTitles('Beta vulgaris subsp. vulgaris (Cicla group)', 'Swiss chard')).toEqual(['Swiss chard', 'Beta vulgaris', 'Beta']);
    expect(wikiTitles('Brassica oleracea var. sabellica', 'Kale')).toEqual(['Kale', 'Brassica oleracea', 'Brassica']);
    expect(wikiTitles("Philodendron erubescens 'Pink Princess'", 'Pink Princess')).toEqual(['Pink Princess', 'Philodendron erubescens', 'Philodendron']);
    expect(wikiTitles('', 'Bird of paradise')).toEqual(['Bird of paradise']);
  });

  it('skips disambiguation pages and stubs', () => {
    // Text only: Wikimedia photos carry their own licences, so they're never passed on.
    expect(parseSummary(page('Goeppertia orbifolia'))).toEqual({
      title: 'Goeppertia orbifolia',
      extract: expect.stringContaining('arrowroot family'),
      description: 'Species of flowering plant',
      url: 'https://en.m.wikipedia.org/wiki/Goeppertia orbifolia',
      imageFile: undefined,
    });
    expect(parseSummary(page('Pothos', { type: 'disambiguation' }))).toBeNull();
    expect(parseSummary(page('Tiny', { extract: 'Too short.' }))).toBeNull();
  });

  it('falls through to the next name, then keeps the answer on the phone', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string) => {
      calls.push(decodeURIComponent(url));
      return url.includes('Goeppertia_orbifolia') ? reply(404) : reply(200, page('Goeppertia'));
    }) as unknown as typeof fetch;
    const titles = ['Goeppertia orbifolia', 'Goeppertia'];
    expect((await fetchWiki(titles, { fetchImpl, now: 1 }))?.title).toBe('Goeppertia');
    expect(calls).toHaveLength(2);
    // A second look, even after a restart, comes from the phone.
    expect((await fetchWiki(titles, { fetchImpl, now: 2 }))?.title).toBe('Goeppertia');
    expect(calls).toHaveLength(2);
  });

  it('does not remember an outage as "nothing found"', async () => {
    const down = (async () => reply(503)) as unknown as typeof fetch;
    expect(await fetchWiki(['Hoya carnosa'], { fetchImpl: down, now: 1 })).toBeNull();
    const up = (async () => reply(200, page('Hoya carnosa'))) as unknown as typeof fetch;
    expect((await fetchWiki(['Hoya carnosa'], { fetchImpl: up, now: 2 }))?.title).toBe('Hoya carnosa');
  });
});

describe('sharing lookups', () => {
  it('sends one set of requests when two screens ask for the same plant at once', async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return reply(200, page('Zamioculcas zamiifolia'));
    }) as unknown as typeof fetch;
    const [a, b] = await Promise.all([fetchWiki(['Zamioculcas zamiifolia'], { fetchImpl, now: 1 }), fetchWiki(['Zamioculcas zamiifolia'], { fetchImpl, now: 1 })]);
    expect(a?.title).toBe('Zamioculcas zamiifolia');
    expect(b).toEqual(a);
    expect(calls).toBe(1);
  });
});

describe('real photos', () => {
  it('only offers images that live on Commons', () => {
    expect(commonsFile('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Calathea_orbifolia_%281%29.jpg/320px-Calathea_orbifolia_%281%29.jpg')).toBe('Calathea_orbifolia_(1).jpg');
    expect(commonsFile('https://upload.wikimedia.org/wikipedia/commons/7/7f/Hoya.jpg')).toBe('Hoya.jpg');
    // Kept on English Wikipedia itself: usually non-free, never offered.
    expect(commonsFile('https://upload.wikimedia.org/wikipedia/en/thumb/1/12/Logo.png/320px-Logo.png')).toBeUndefined();
    expect(commonsFile(undefined)).toBeUndefined();
  });

  const reply2 = (meta: Record<string, string>) => ({
    query: { pages: { '1': { imageinfo: [{ thumburl: 'https://upload.wikimedia.org/x/640px-a.jpg', descriptionurl: 'https://commons.wikimedia.org/wiki/File:a.jpg', extmetadata: Object.fromEntries(Object.entries(meta).map(([k, v]) => [k, { value: v }])) }] } } },
  });

  it('needs an author and a licence, as plain text', () => {
    expect(parsePhoto(reply2({ Artist: '<a href="//commons.wikimedia.org/wiki/User:Mokkie">Mokkie</a>', LicenseShortName: 'CC BY-SA 3.0' }))).toEqual({
      src: 'https://upload.wikimedia.org/x/640px-a.jpg',
      author: 'Mokkie',
      license: 'CC BY-SA 3.0',
      page: 'https://commons.wikimedia.org/wiki/File:a.jpg',
    });
    expect(parsePhoto(reply2({ LicenseShortName: 'CC BY 4.0' }))).toBeNull();
    expect(parsePhoto(reply2({ Artist: 'Someone' }))).toBeNull();
    expect(parsePhoto(reply2({ Artist: 'Someone', LicenseShortName: 'Fair use' }))).toBeNull();
  });

  it('fetches a photo once and keeps it', async () => {
    let calls = 0;
    const fetchImpl = (async () => {
      calls += 1;
      return reply(200, reply2({ Artist: 'Jo', LicenseShortName: 'CC0' }));
    }) as unknown as typeof fetch;
    expect((await fetchPhoto('a.jpg', { fetchImpl, now: 1 }))?.author).toBe('Jo');
    expect((await fetchPhoto('a.jpg', { fetchImpl, now: 2 }))?.license).toBe('CC0');
    expect(calls).toBe(1);
  });
});
