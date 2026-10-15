import { classifyClimate, monthlyNormals } from './climate';
import type { Climate } from '../types';

/*
 * Pick-your-city: Open-Meteo's free geocoder finds the city (from the name typed, never GPS), then three
 * years of daily history for those coordinates give monthly normals to classify the climate.
 */

export interface PlaceResult {
  name: string;
  /** e.g. "Ontario, Canada" */
  region: string;
  country?: string;
  lat: number;
  lon: number;
}

type FetchLike = typeof fetch;

export function parseGeocode(body: unknown): PlaceResult[] {
  const rows = (body as { results?: unknown })?.results;
  if (!Array.isArray(rows)) return [];
  const out: PlaceResult[] = [];
  for (const r of rows as Record<string, unknown>[]) {
    if (typeof r.name !== 'string' || typeof r.latitude !== 'number' || typeof r.longitude !== 'number') continue;
    const region = [r.admin1, r.country].filter((x): x is string => typeof x === 'string' && !!x).join(', ');
    out.push({ name: r.name, region, country: typeof r.country_code === 'string' ? r.country_code : undefined, lat: r.latitude, lon: r.longitude });
  }
  return out;
}

export async function searchPlaces(query: string, fetchImpl: FetchLike = fetch): Promise<PlaceResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const res = await fetchImpl(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=6&language=en&format=json`);
  if (!res.ok) throw new Error(`geocoder ${res.status}`);
  return parseGeocode(await res.json());
}

export function parseArchive(body: unknown) {
  const d = (body as { daily?: Record<string, unknown[]> })?.daily;
  if (!d || !Array.isArray(d.time)) return [];
  return (d.time as string[]).map((date, i) => ({
    date,
    tMean: (d.temperature_2m_mean?.[i] as number | null) ?? null,
    tMin: (d.temperature_2m_min?.[i] as number | null) ?? null,
    precip: (d.precipitation_sum?.[i] as number | null) ?? null,
  }));
}

/** When history can't be fetched: a rough guess from latitude alone (the soil checks refine it). */
export function guessClimate(p: PlaceResult): Climate {
  const south = p.lat < 0;
  const tropical = Math.abs(p.lat) < 20;
  const place = { place: label(p), country: p.country, lat: p.lat, lon: p.lon };
  if (tropical) return { ...place, model: 'accra', shift: south ? 6 : 0, frost: false };
  return { ...place, model: 'seattle', shift: south ? 6 : 0, frost: Math.abs(p.lat) > 30 };
}

export const label = (p: PlaceResult) => (p.region ? `${p.name}, ${p.region.split(', ').pop()}` : p.name);

/** Classify a picked city from its last three full years of weather. Falls back to a latitude guess. */
export async function climateFor(p: PlaceResult, fetchImpl: FetchLike = fetch, now = new Date()): Promise<Climate> {
  const end = now.getFullYear() - 1;
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${p.lat.toFixed(3)}&longitude=${p.lon.toFixed(3)}` +
    `&start_date=${end - 2}-01-01&end_date=${end}-12-31&daily=temperature_2m_mean,temperature_2m_min,precipitation_sum&timezone=auto`;
  try {
    const res = await fetchImpl(url);
    if (!res.ok) throw new Error(`archive ${res.status}`);
    const normals = monthlyNormals(parseArchive(await res.json()));
    if (normals.some((n) => Number.isNaN(n.tMean))) throw new Error('incomplete history');
    return classifyClimate(normals, { place: label(p), country: p.country, lat: p.lat, lon: p.lon });
  } catch {
    return guessClimate(p);
  }
}
