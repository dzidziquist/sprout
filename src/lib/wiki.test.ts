import { beforeEach, describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: async (k: string) => store.get(k) ?? null,
    setItem: async (k: string, v: string) => void store.set(k, v),
  },
}));

import { fetchWiki, parseSummary, wikiTitles } from './wiki';

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
  it('tries the Latin name without its cultivar, then the genus, then the common name', () => {
    expect(wikiTitles("Philodendron erubescens 'Pink Princess'", 'Pink Princess')).toEqual(['Philodendron erubescens', 'Philodendron', 'Pink Princess']);
    expect(wikiTitles('Aloe vera', 'Aloe vera')).toEqual(['Aloe vera', 'Aloe']);
    expect(wikiTitles('', 'Bird of paradise')).toEqual(['Bird of paradise']);
  });

  it('skips disambiguation pages and stubs', () => {
    expect(parseSummary(page('Goeppertia orbifolia'))?.photo).toContain('upload.wikimedia.org');
    expect(parseSummary(page('Pothos', { type: 'disambiguation' }))).toBeNull();
    expect(parseSummary(page('Tiny', { extract: 'Too short.' }))).toBeNull();
  });

  it('falls through to the next name, then keeps the answer on the phone', async () => {
    const calls: string[] = [];
    const fetchImpl = (async (url: string) => {
      calls.push(decodeURIComponent(url));
      return url.includes('Goeppertia_orbifolia') ? reply(404) : reply(200, page('Goeppertia'));
    }) as unknown as typeof fetch;
    const titles = wikiTitles('Goeppertia orbifolia', 'Calathea');
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
