import { PlantIdError, confidenceLabel, type Confidence } from './plantId';

/*
 * Pl@ntNet's disease photo check (beta). Same key and the same free daily quota as plant ID: when the
 * quota runs out Pl@ntNet says no (429) and nothing is charged. Answers come back as EPPO codes, which
 * we turn into names with Pl@ntNet's own list, and link to our plant doctor's causes where we can.
 * Coverage is limited (mostly crop problems), so results are only ever "it might be".
 */

const BASE = 'https://my-api.plantnet.org/v2/diseases';

export interface HealthResult {
  /** EPPO code, e.g. "TETRUR". */
  code: string;
  /** Plain name from Pl@ntNet's list, when we have it. */
  name?: string;
  score: number;
  confidence: Confidence;
  /** The plant doctor cause this most likely matches, so we can show what to check and do. */
  causeId?: string;
}

/** Map a Pl@ntNet disease name onto one of our causes by keyword. */
export function causeForLabel(label: string | undefined): string | undefined {
  if (!label) return undefined;
  const l = label.toLowerCase();
  const rules: [RegExp, string][] = [
    [/powdery mildew|erysiph|podosphaera|golovinomyces/, 'powdery-mildew'],
    [/spider mite|tetranych|red spider/, 'spider-mites'],
    [/aphid|aphis|myzus|aphididae/, 'aphids'],
    [/mealybug|pseudococc|planococc/, 'mealybugs'],
    [/whitefl|bemisia|trialeurodes|aleyrod/, 'whitefly'],
    [/thrip/, 'thrips'],
    [/scale|coccid|diaspid/, 'scale'],
    [/fungus gnat|sciarid|bradysia/, 'fungus-gnats'],
    [/caterpillar|moth|slug|snail|beetle|weevil|leaf miner|leafminer|lepidopter|worm|looper|borer|sawfly|grasshopper|locust/, 'pests-chewing'],
    [/root rot|pythium|phytophthora|crown rot|stem rot/, 'root-rot'],
    [/blossom end rot/, 'blossom-end-rot'],
    [/leaf spot|blight|anthracnose|rust|septoria|alternaria|cercospora|downy mildew|mildew|spot|botrytis|grey mould|gray mold/, 'leaf-spot'],
    [/sunburn|sunscald|scorch/, 'sunburn'],
    [/deficien|chlorosis/, 'hungry'],
  ];
  return rules.find(([re]) => re.test(l))?.[1];
}

/**
 * Pests of fields and veg beds that are very unlikely on a plant kept indoors, so a match on a
 * houseplant is probably Pl@ntNet guessing.
 */
const FIELD_PESTS = /armyworm|cutworm|bollworm|earworm|rootworm|wireworm|corn borer|stem borer|maize|locust|grasshopper|colorado potato|codling|cabbage (white|moth|looper)|flea beetle|carrot fly|onion fly|spodoptera|helicoverpa|diabrotica|ostrinia|leptinotarsa|cydia pomonella/;

/** True when the match is an outdoor crop pest. */
export function isFieldPest(label: string | undefined): boolean {
  return Boolean(label && FIELD_PESTS.test(label.toLowerCase()));
}

/** How much to trust a set of results as a whole: none found, only long shots, or at least one real lead. */
export function photoVerdict(results: Pick<HealthResult, 'confidence'>[]): 'none' | 'unsure' | 'leads' {
  if (!results.length) return 'none';
  return results.every((r) => r.confidence === 'Long shot') ? 'unsure' : 'leads';
}

/**
 * A page with photos of the match to compare against. Pl@ntNet names read "Spodoptera frugiperda - Fall
 * armyworm"; the Latin part finds the right page more often than the common name.
 */
export function lookUpUrl(result: Pick<HealthResult, 'name' | 'code'>): string {
  const term = (result.name ?? result.code).split(' - ')[0].trim();
  return `https://en.wikipedia.org/wiki/Special:Search?search=${encodeURIComponent(term)}`;
}

export function plantHealthConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_PLANTNET_KEY);
}

let labels: Promise<Record<string, string>> | null = null;

/** How long the optional name list may hold up a result that is otherwise ready. */
export const NAMES_WAIT_MS = 4000;

/**
 * Pl@ntNet's EPPO code → name list, fetched once per app run. Failure, or no answer within
 * NAMES_WAIT_MS, just means codes without names; the next check tries again.
 */
function diseaseNames(key: string, doFetch: typeof fetch): Promise<Record<string, string>> {
  if (!labels) {
    const ctl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const fetched = doFetch(`${BASE}?api-key=${encodeURIComponent(key)}&lang=en`, { headers: { Accept: 'application/json' }, signal: ctl.signal })
      .then((r) => {
        // A refused list (quota, server trouble) isn't kept: try again on the next check.
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((list: unknown) => {
        const out: Record<string, string> = {};
        if (Array.isArray(list)) for (const d of list as { name?: unknown; label?: unknown }[]) if (typeof d?.name === 'string' && typeof d?.label === 'string') out[d.name] = d.label;
        return out;
      });
    const pending: Promise<Record<string, string>> = Promise.race([
      fetched,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          ctl.abort();
          reject(new Error('timeout'));
        }, NAMES_WAIT_MS);
      }),
    ])
      .catch(() => {
        if (labels === pending) labels = null;
        return {};
      })
      .finally(() => clearTimeout(timer));
    labels = pending;
  }
  return labels;
}

/** Wait for `p`, but not past the caller giving up. */
function unlessAborted<T>(p: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return p;
  return new Promise<T>((resolve, reject) => {
    const stop = () => reject(Object.assign(new Error('Aborted'), { name: 'AbortError' }));
    if (signal.aborted) return stop();
    signal.addEventListener('abort', stop, { once: true });
    p.then(resolve, reject).finally(() => signal.removeEventListener('abort', stop));
  });
}

/** Pull results out of a Pl@ntNet diseases answer, tolerating missing fields. */
export function parseHealth(body: unknown, names: Record<string, string> = {}): HealthResult[] {
  const results = (body as { results?: unknown })?.results;
  if (!Array.isArray(results)) return [];
  const out: HealthResult[] = [];
  for (const r of results as { name?: unknown; description?: unknown; label?: unknown; score?: unknown }[]) {
    if (typeof r?.name !== 'string' || typeof r?.score !== 'number') continue;
    // The answer carries its own readable `description`; the separate name list is only a fallback.
    const name = typeof r.description === 'string' && r.description ? r.description : typeof r.label === 'string' ? r.label : names[r.name];
    const score = Math.max(0, Math.min(1, r.score));
    out.push({ code: r.name, name, score, confidence: confidenceLabel(score), causeId: causeForLabel(name) });
  }
  return out.sort((a, b) => b.score - a.score);
}

/**
 * Send one photo of the problem to Pl@ntNet. `uri` is a local file URI on device, or a blob:/data:
 * URL on web. Throws PlantIdError (same kinds as plant ID). No match is not an error: it returns [].
 */
export async function checkPlantHealth(uri: string, opts: { mimeType?: string; signal?: AbortSignal; fetchImpl?: typeof fetch } = {}): Promise<HealthResult[]> {
  const key = process.env.EXPO_PUBLIC_PLANTNET_KEY;
  if (!key) throw new PlantIdError('no-key');
  const doFetch = opts.fetchImpl ?? fetch;
  const form = new FormData();
  try {
    if (uri.startsWith('blob:') || uri.startsWith('data:') || uri.startsWith('http')) {
      form.append('images', await (await doFetch(uri)).blob(), 'plant.jpg');
    } else {
      form.append('images', { uri, name: 'plant.jpg', type: opts.mimeType ?? 'image/jpeg' } as unknown as Blob);
    }
  } catch {
    throw new PlantIdError('bad-image');
  }
  const names = diseaseNames(key, doFetch);
  let res: Response;
  try {
    res = await doFetch(`${BASE}/identify?api-key=${encodeURIComponent(key)}&lang=en&include-related-images=false&nb-results=5`, { method: 'POST', body: form, signal: opts.signal, headers: { Accept: 'application/json' } });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw new PlantIdError('offline');
  }
  if (res.status === 404) return [];
  if (res.status === 401 || res.status === 403) throw new PlantIdError('bad-key');
  if (res.status === 429) throw new PlantIdError('quota');
  if (res.status === 400 || res.status === 413 || res.status === 415) throw new PlantIdError('bad-image');
  if (!res.ok) throw new PlantIdError('server', `HTTP ${res.status}`);
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    throw new PlantIdError('server', 'Bad JSON');
  }
  return parseHealth(body, await unlessAborted(names, opts.signal));
}
