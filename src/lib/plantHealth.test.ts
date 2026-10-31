import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NAMES_WAIT_MS, checkPlantHealth } from './plantHealth';

const identified = () => new Response(JSON.stringify({ results: [{ name: 'ERYSGR', description: 'Powdery mildew', score: 0.8 }] }), { status: 200 });

beforeEach(() => {
  vi.useFakeTimers();
  process.env.EXPO_PUBLIC_PLANTNET_KEY = 'test-key';
});
afterEach(() => {
  vi.useRealTimers();
  delete process.env.EXPO_PUBLIC_PLANTNET_KEY;
});

/** Photo fetch and identify answer; the name list never does. */
const stalledNames = () => {
  const names = vi.fn(() => new Promise<Response>(() => {}));
  const fetchImpl = vi.fn((url: string | URL | Request) => {
    const u = String(url);
    if (u.startsWith('data:')) return Promise.resolve(new Response('img'));
    if (u.includes('/identify')) return Promise.resolve(identified());
    return names();
  }) as unknown as typeof fetch;
  return { fetchImpl, names };
};

describe('checkPlantHealth', () => {
  it('returns the identification when the optional name list never answers', async () => {
    const { fetchImpl } = stalledNames();
    const result = checkPlantHealth('data:image/jpeg;base64,AAAA', { fetchImpl });
    await vi.advanceTimersByTimeAsync(NAMES_WAIT_MS + 10);
    expect(await result).toMatchObject([{ code: 'ERYSGR', name: 'Powdery mildew' }]);
  });

  it('asks for the name list again on the next check after it timed out', async () => {
    const { fetchImpl, names } = stalledNames();
    const first = checkPlantHealth('data:image/jpeg;base64,AAAA', { fetchImpl });
    await vi.advanceTimersByTimeAsync(NAMES_WAIT_MS + 10);
    await first;
    const second = checkPlantHealth('data:image/jpeg;base64,AAAA', { fetchImpl });
    await vi.advanceTimersByTimeAsync(NAMES_WAIT_MS + 10);
    await second;
    expect(names).toHaveBeenCalledTimes(2);
  });

  it('stops waiting as soon as the person cancels', async () => {
    const { fetchImpl } = stalledNames();
    const ctl = new AbortController();
    const result = checkPlantHealth('data:image/jpeg;base64,AAAA', { fetchImpl, signal: ctl.signal });
    const settled = expect(result).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(10);
    ctl.abort();
    await settled;
  });
});

describe('photo result helpers', () => {
  it('sends caterpillar names to the chewing pests card', async () => {
    const { causeForLabel } = await import('./plantHealth');
    for (const name of ['Spodoptera frugiperda - Fall armyworm', 'Agrotis ipsilon - Black cutworm', 'Manduca sexta - Tobacco hornworm', 'Trichoplusia ni - Cabbage looper', 'Otiorhynchus sulcatus - Vine weevil'])
      expect(causeForLabel(name)).toBe('pests-chewing');
    expect(causeForLabel('Erysiphe - Powdery mildew')).toBe('powdery-mildew');
  });

  it('flags outdoor crop pests', async () => {
    const { isFieldPest } = await import('./plantHealth');
    expect(isFieldPest('Spodoptera frugiperda - Fall armyworm')).toBe(true);
    expect(isFieldPest('Leptinotarsa decemlineata - Colorado potato beetle')).toBe(true);
    expect(isFieldPest('Tetranychus urticae - Two-spotted spider mite')).toBe(false);
    expect(isFieldPest('Otiorhynchus sulcatus - Vine weevil')).toBe(false);
    expect(isFieldPest(undefined)).toBe(false);
  });

  it('says how far to trust the results', async () => {
    const { photoVerdict } = await import('./plantHealth');
    expect(photoVerdict([])).toBe('none');
    expect(photoVerdict([{ confidence: 'Long shot' }, { confidence: 'Long shot' }])).toBe('unsure');
    expect(photoVerdict([{ confidence: 'Long shot' }, { confidence: 'Maybe' }])).toBe('leads');
  });

  it('looks up the Latin name', async () => {
    const { lookUpUrl } = await import('./plantHealth');
    expect(lookUpUrl({ code: 'LAPHFR', name: 'Spodoptera frugiperda - Fall armyworm' })).toBe('https://en.wikipedia.org/wiki/Special:Search?search=Spodoptera%20frugiperda');
    expect(lookUpUrl({ code: 'TETRUR' })).toBe('https://en.wikipedia.org/wiki/Special:Search?search=TETRUR');
  });
});
