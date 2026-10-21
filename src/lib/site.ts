import { clearnessFrom, type Site } from '../engine/light';
import type { ClimateModel, ClimateProfile } from '../types';
import { coordsFor } from './weather';

/*
 * Each month's clearness (sunlight measured at the ground against the top of the atmosphere, January first)
 * for the two preset cities: Open-Meteo's ERA5 history, 2021–2025, worked out by clearnessFrom. A city
 * picked in Settings carries its own, from the same history lookup that learns its seasons.
 */
export const MODEL_CLEARNESS: Record<ClimateModel, readonly number[]> = {
  seattle: [0.367, 0.374, 0.45, 0.496, 0.489, 0.527, 0.6, 0.561, 0.52, 0.454, 0.371, 0.318],
  accra: [0.536, 0.549, 0.531, 0.545, 0.546, 0.488, 0.51, 0.489, 0.524, 0.555, 0.576, 0.562],
};

/** Where the home is, for the light estimates. A city picked before clearness was saved borrows its model city's, lined up by month. */
export function siteOf(climate: ClimateProfile): Site {
  const { lat } = coordsFor(climate);
  if (typeof climate === 'string') return { lat, clearness: MODEL_CLEARNESS[climate] };
  if (climate.clearness?.length === 12) return { lat, clearness: climate.clearness };
  const model = MODEL_CLEARNESS[climate.model];
  return { lat, clearness: model.map((_, m) => model[(((m + climate.shift) % 12) + 12) % 12]) };
}

/** Measured sunlight for a place: its last three full years of Open-Meteo history, as monthly clearness. Null when it can't be had. */
export async function fetchClearness(lat: number, lon: number, fetchImpl: typeof fetch = fetch, now = new Date()): Promise<number[] | null> {
  const end = now.getFullYear() - 1;
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}` +
    `&start_date=${end - 2}-01-01&end_date=${end}-12-31&daily=shortwave_radiation_sum&timezone=auto`;
  try {
    const res = await fetchImpl(url);
    if (!res.ok) return null;
    const d = ((await res.json()) as { daily?: { time?: unknown[]; shortwave_radiation_sum?: unknown[] } })?.daily;
    if (!d || !Array.isArray(d.time)) return null;
    const days = d.time.map((date, i) => ({ date: String(date), radiation: typeof d.shortwave_radiation_sum?.[i] === 'number' ? (d.shortwave_radiation_sum[i] as number) : null }));
    return clearnessFrom(days, lat);
  } catch {
    return null;
  }
}

let backfilling = false;
/**
 * A city picked before its sunlight was saved: look it up once, quietly, and keep it. Until then (or offline)
 * it borrows its model city's. Tries again next launch if it fails.
 */
export async function backfillClearness(climate: ClimateProfile, save: (clearness: number[]) => void, fetchImpl?: typeof fetch): Promise<void> {
  if (typeof climate === 'string' || climate.clearness?.length === 12 || backfilling) return;
  backfilling = true;
  try {
    const clearness = await fetchClearness(climate.lat, climate.lon, fetchImpl);
    if (clearness) save(clearness);
  } finally {
    backfilling = false;
  }
}
