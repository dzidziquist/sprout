import { SPECIES } from '../data/species';
import type { SpeciesId } from '../types';

/*
 * Pl@ntNet v2 photo ID. Free tier: 500 identifications a day, commercial use allowed under the cap,
 * and the app must credit Pl@ntNet (we show "Powered by Pl@ntNet" on the identify screen).
 *
 * Confidently wrong IDs are a top complaint about plant apps, so results are never auto-applied:
 * we map Pl@ntNet's answers onto our own catalogue, label how sure we are, and the user confirms.
 */

const ENDPOINT = 'https://my-api.plantnet.org/v2/identify/all';

/** One answer from Pl@ntNet, trimmed to what we use. */
export interface PlantNetResult {
  latinName: string;
  commonNames: string[];
  /** 0..1 */
  score: number;
  genus?: string;
}

export type Confidence = 'Pretty sure' | 'Maybe' | 'Long shot';

/** A Pl@ntNet answer mapped onto one of our catalogue species. */
export interface CatalogueMatch {
  speciesId: SpeciesId;
  /** What Pl@ntNet called it (the best-scoring answer that mapped here). */
  latinName: string;
  commonNames: string[];
  /** Combined score of every answer that mapped to this species, capped at 1. */
  score: number;
  confidence: Confidence;
  /** False when we only matched the genus (a close relative with similar care). */
  exact: boolean;
}

export type PlantIdErrorKind = 'no-key' | 'bad-key' | 'offline' | 'quota' | 'bad-image' | 'server';

export class PlantIdError extends Error {
  kind: PlantIdErrorKind;
  constructor(kind: PlantIdErrorKind, message?: string) {
    super(message ?? kind);
    this.name = 'PlantIdError';
    this.kind = kind;
  }
}

export function confidenceLabel(score: number): Confidence {
  if (score >= 0.6) return 'Pretty sure';
  if (score >= 0.25) return 'Maybe';
  return 'Long shot';
}

/** Lowercase "genus species", without authors, cultivars, hybrids marks or infraspecific ranks. */
export function normalizeLatin(name: string): string {
  return name
    .toLowerCase()
    .replace(/['‘’"“”].*$/, '')
    .replace(/[×✕]/g, ' ')
    .replace(/\b(subsp|ssp|var|f|cv)\..*$/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 2)
    .join(' ');
}

interface Rule {
  id: SpeciesId;
  /** Exact "genus species" names (lowercase), including synonyms. */
  species?: string[];
  /** Genera where any member is this catalogue entry (our entry is the whole genus, e.g. "Calathea"). */
  genus?: string[];
  /** Genera that are only close relatives: similar care, but not quite the same plant. */
  relatives?: string[];
}

/*
 * Species-level names are checked first, then whole-genus entries, then relatives,
 * so Ficus lyrata → fig and Ficus elastica → rubber, while a Ficus benjamina is a "close relative" of the fig.
 */
const RULES: Rule[] = [
  { id: 'monstera', species: ['monstera deliciosa', 'monstera borsigiana'], relatives: ['monstera'] },
  { id: 'pothos', species: ['epipremnum aureum', 'epipremnum pinnatum', 'scindapsus aureus'], relatives: ['epipremnum', 'scindapsus'] },
  { id: 'fig', species: ['ficus lyrata'], relatives: ['ficus'] },
  { id: 'rubber', species: ['ficus elastica'] },
  { id: 'calathea', genus: ['goeppertia', 'calathea'] },
  { id: 'snake', species: ['dracaena trifasciata', 'sansevieria trifasciata', 'dracaena angolensis', 'sansevieria cylindrica'], genus: ['sansevieria'] },
  { id: 'hoya', genus: ['hoya'] },
  { id: 'peace-lily', genus: ['spathiphyllum'] },
  { id: 'zz', genus: ['zamioculcas'] },
  { id: 'string-of-pearls', species: ['curio rowleyanus', 'senecio rowleyanus'], relatives: ['curio'] },
  { id: 'pink-princess', species: ['philodendron erubescens'], relatives: ['philodendron'] },
  { id: 'aloe', species: ['aloe vera', 'aloe barbadensis'], relatives: ['aloe'] },
  { id: 'spider', species: ['chlorophytum comosum'], relatives: ['chlorophytum'] },
  { id: 'bird-of-paradise', genus: ['strelitzia'] },
  { id: 'basil', genus: ['ocimum'] },
  { id: 'mint', genus: ['mentha'] },
  { id: 'tomato', species: ['solanum lycopersicum', 'lycopersicon esculentum'] },
  { id: 'pepper', genus: ['capsicum'] },
  { id: 'spring-onion', species: ['allium fistulosum', 'allium cepa'], relatives: ['allium'] },
];

/** Which catalogue species a Pl@ntNet answer belongs to, if any. */
export function speciesFor(latinName: string, genus?: string): { id: SpeciesId; exact: boolean } | null {
  const name = normalizeLatin(latinName);
  const g = (genus ? genus.toLowerCase().trim() : name.split(' ')[0]) || '';
  for (const r of RULES) if (r.species?.includes(name)) return { id: r.id, exact: true };
  for (const r of RULES) if (r.genus?.includes(g)) return { id: r.id, exact: true };
  for (const r of RULES) if (r.relatives?.includes(g)) return { id: r.id, exact: false };
  return null;
}

/**
 * Map Pl@ntNet answers to our catalogue: ranked best first, one entry per species.
 * Genus-only matches count for a little less, so an exact match always ranks above a cousin.
 */
export function matchCatalogue(results: PlantNetResult[], max = 3): CatalogueMatch[] {
  const bySpecies = new Map<SpeciesId, CatalogueMatch & { best: number }>();
  for (const r of results) {
    const hit = speciesFor(r.latinName, r.genus);
    if (!hit) continue;
    const score = hit.exact ? r.score : r.score * 0.8;
    const prev = bySpecies.get(hit.id);
    if (!prev) {
      bySpecies.set(hit.id, { speciesId: hit.id, latinName: r.latinName, commonNames: r.commonNames, score, best: score, exact: hit.exact, confidence: 'Long shot' });
    } else {
      prev.score += score;
      if (score > prev.best) Object.assign(prev, { best: score, latinName: r.latinName, commonNames: r.commonNames, exact: hit.exact });
      else if (hit.exact) prev.exact = true;
    }
  }
  return [...bySpecies.values()]
    .map(({ best: _best, ...m }) => {
      const score = Math.min(1, Math.round(m.score * 1000) / 1000);
      return { ...m, score, confidence: confidenceLabel(score) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, max);
}

/** Parse a Pl@ntNet v2 /identify response body. Unknown shapes give an empty list. */
export function parsePlantNet(body: unknown): PlantNetResult[] {
  const results = (body as { results?: unknown })?.results;
  if (!Array.isArray(results)) return [];
  const out: PlantNetResult[] = [];
  for (const raw of results) {
    const r = raw as {
      score?: number;
      species?: { scientificNameWithoutAuthor?: string; scientificName?: string; commonNames?: string[]; genus?: { scientificNameWithoutAuthor?: string } };
    };
    const latinName = r.species?.scientificNameWithoutAuthor ?? r.species?.scientificName;
    if (!latinName || typeof r.score !== 'number') continue;
    out.push({
      latinName,
      commonNames: Array.isArray(r.species?.commonNames) ? r.species!.commonNames!.filter((n) => typeof n === 'string') : [],
      score: Math.max(0, Math.min(1, r.score)),
      genus: r.species?.genus?.scientificNameWithoutAuthor,
    });
  }
  return out.sort((a, b) => b.score - a.score);
}

/** Pl@ntNet's catalogue name for a species we have, e.g. for "close relative" copy. */
export function catalogueName(id: SpeciesId): string {
  return SPECIES[id].commonName;
}

export function plantIdConfigured(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_PLANTNET_KEY || process.env.EXPO_PUBLIC_PLANTNET_PROXY);
}

export function buildIdentifyUrl(key: string | undefined, proxy?: string): string {
  const qs = 'include-related-images=false&nb-results=5';
  if (proxy) return `${proxy}${proxy.includes('?') ? '&' : '?'}${qs}`;
  if (!key) throw new PlantIdError('no-key');
  return `${ENDPOINT}?api-key=${encodeURIComponent(key)}&${qs}`;
}

export interface IdentifyResult {
  /** Every Pl@ntNet answer, best first (also the ones we don't have in the catalogue). */
  results: PlantNetResult[];
  /** Up to three catalogue matches, best first. Empty when nothing maps to our catalogue. */
  matches: CatalogueMatch[];
}

/**
 * Send one photo to Pl@ntNet. `uri` is a local file URI on device, or a blob:/data: URL on web.
 * Throws PlantIdError. A "species not found" answer is not an error: it returns no results.
 *
 * Set EXPO_PUBLIC_PLANTNET_PROXY to route through a small server that adds the key (recommended
 * for production so the key isn't shipped in the app); otherwise EXPO_PUBLIC_PLANTNET_KEY is used.
 */
export async function identifyPlant(uri: string, opts: { mimeType?: string; signal?: AbortSignal; fetchImpl?: typeof fetch } = {}): Promise<IdentifyResult> {
  const url = buildIdentifyUrl(process.env.EXPO_PUBLIC_PLANTNET_KEY, process.env.EXPO_PUBLIC_PLANTNET_PROXY);
  const doFetch = opts.fetchImpl ?? fetch;
  const type = opts.mimeType ?? 'image/jpeg';
  const form = new FormData();
  try {
    if (uri.startsWith('blob:') || uri.startsWith('data:') || uri.startsWith('http')) {
      const blob = await (await doFetch(uri)).blob();
      form.append('images', blob, 'plant.jpg');
    } else {
      // React Native's FormData takes a { uri, name, type } file descriptor.
      form.append('images', { uri, name: 'plant.jpg', type } as unknown as Blob);
    }
  } catch {
    throw new PlantIdError('bad-image');
  }
  form.append('organs', 'auto');

  let res: Response;
  try {
    res = await doFetch(url, { method: 'POST', body: form, signal: opts.signal, headers: { Accept: 'application/json' } });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw new PlantIdError('offline');
  }
  if (res.status === 404) return { results: [], matches: [] };
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
  const results = parsePlantNet(body);
  return { results, matches: matchCatalogue(results) };
}
