import { clearnessFrom, type Site } from '../engine/light';
import type { Sunlight } from '../store/plantStore';
import type { ClimateModel, ClimateProfile } from '../types';
import { coordsFor } from './weather';

/*
 * How sunny each month is where the user lives, for the light estimates: clearness (sunlight measured at
 * the ground against the top of the atmosphere, January first) averaged over the last 36 months of
 * Open-Meteo's ERA5 history. Three years so one unusually grey or sunny month doesn't decide a verdict;
 * this week's weather comes from the forecast instead. Looked up for the city's coordinates, saved, and
 * refreshed about once a year.
 */

/** Built in until the first lookup (and offline): Open-Meteo history for 2021–2025, worked out by clearnessFrom. */
export const MODEL_CLEARNESS: Record<ClimateModel, readonly number[]> = {
  seattle: [0.367, 0.374, 0.45, 0.496, 0.489, 0.527, 0.6, 0.561, 0.52, 0.454, 0.371, 0.318],
  accra: [0.536, 0.549, 0.531, 0.545, 0.546, 0.488, 0.51, 0.489, 0.524, 0.555, 0.576, 0.562],
};

const REFRESH_MS = 365 * 86400000;

/** Which place a saved lookup belongs to. */
export function sunlightKey(climate: ClimateProfile): string {
  const { lat, lon } = coordsFor(climate);
  return `${lat.toFixed(2)},${lon.toFixed(2)}`;
}

/**
 * Where the home is, for the light estimates: the saved lookup when it's for this city, else the model
 * city's built-in values (lined up by month for a city whose seasons are shifted).
 */
export function siteOf(climate: ClimateProfile, sunlight?: Sunlight): Site {
  const { lat } = coordsFor(climate);
  if (sunlight?.key === sunlightKey(climate) && sunlight.clearness.length === 12) return { lat, clearness: sunlight.clearness };
  if (typeof climate === 'string') return { lat, clearness: MODEL_CLEARNESS[climate] };
  const model = MODEL_CLEARNESS[climate.model];
  return { lat, clearness: model.map((_, m) => model[(((m + climate.shift) % 12) + 12) % 12]) };
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** The 36 whole months before this one: every month of the year three times. */
export function historyRange(now: Date): { start: string; end: string } {
  return { start: ymd(new Date(now.getFullYear(), now.getMonth() - 36, 1)), end: ymd(new Date(now.getFullYear(), now.getMonth(), 0)) };
}

/** Measured sunlight for a place over the last 36 months, as monthly clearness. Null when it can't be had. */
export async function fetchClearness(lat: number, lon: number, fetchImpl: typeof fetch = fetch, now = new Date()): Promise<number[] | null> {
  const { start, end } = historyRange(now);
  const url =
    `https://archive-api.open-meteo.com/v1/archive?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}` +
    `&start_date=${start}&end_date=${end}&daily=shortwave_radiation_sum&timezone=auto`;
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

let refreshing: string | null = null;
/**
 * Looks up the city's sunlight when there's none saved for it, or the saved one is a year old. Quiet: on
 * failure the built-in values stand and it tries again next time.
 */
export async function refreshSunlight(
  climate: ClimateProfile,
  saved: Sunlight | undefined,
  save: (sunlight: Sunlight) => void,
  opts: { fetchImpl?: typeof fetch; now?: Date } = {},
): Promise<void> {
  const now = opts.now ?? new Date();
  const key = sunlightKey(climate);
  if (saved?.key === key && now.getTime() - new Date(saved.at).getTime() < REFRESH_MS) return;
  if (refreshing === key) return;
  refreshing = key;
  try {
    const { lat, lon } = coordsFor(climate);
    const clearness = await fetchClearness(lat, lon, opts.fetchImpl, now);
    if (clearness) save({ key, clearness, at: now.toISOString() });
  } finally {
    refreshing = null;
  }
}
