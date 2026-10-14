import { useEffect, useState } from 'react';
import type { DailyForecast } from '../engine/growPatch';
import type { ClimateProfile } from '../types';

export type { DailyForecast };

/*
 * 7-day daily forecast from Open-Meteo (free, no API key). Cached in memory for a few hours.
 * Every failure (offline, timeout, odd payload) returns null so the Grow patch just hides weather.
 */

export const CITY_COORDS: Record<ClimateProfile, { lat: number; lon: number }> = {
  seattle: { lat: 47.61, lon: -122.33 },
  accra: { lat: 5.6, lon: -0.19 },
};

export const CACHE_MS = 3 * 60 * 60 * 1000;
const TIMEOUT_MS = 8000;

export function forecastUrl(lat: number, lon: number): string {
  return `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Turns an Open-Meteo daily payload into forecast days. Days with missing temperatures are skipped. */
export function parseForecast(json: unknown): DailyForecast[] | null {
  const daily = (json as { daily?: Record<string, unknown> } | null)?.daily;
  if (!daily || !Array.isArray(daily.time)) return null;
  const max = Array.isArray(daily.temperature_2m_max) ? daily.temperature_2m_max : [];
  const min = Array.isArray(daily.temperature_2m_min) ? daily.temperature_2m_min : [];
  const rain = Array.isArray(daily.precipitation_sum) ? daily.precipitation_sum : [];
  const out: DailyForecast[] = [];
  daily.time.forEach((date, i) => {
    if (typeof date !== 'string' || !isNum(max[i]) || !isNum(min[i])) return;
    out.push({ date, minC: min[i], maxC: max[i], precipMm: isNum(rain[i]) ? rain[i] : 0 });
  });
  return out.length ? out.slice(0, 7) : null;
}

const cache = new Map<ClimateProfile, { at: number; days: DailyForecast[] }>();

export function clearForecastCache() {
  cache.clear();
}

/** Cached forecast if it's fresh, without fetching. */
export function cachedForecast(climate: ClimateProfile, now = Date.now()): DailyForecast[] | null {
  const hit = cache.get(climate);
  return hit && now - hit.at < CACHE_MS ? hit.days : null;
}

export async function fetchForecast(
  climate: ClimateProfile,
  opts: { now?: number; fetchImpl?: typeof fetch } = {},
): Promise<DailyForecast[] | null> {
  const now = opts.now ?? Date.now();
  const fresh = cachedForecast(climate, now);
  if (fresh) return fresh;
  const { lat, lon } = CITY_COORDS[climate];
  const doFetch = opts.fetchImpl ?? (typeof fetch === 'function' ? fetch : undefined);
  if (!doFetch) return null;
  const ctrl = typeof AbortController === 'function' ? new AbortController() : undefined;
  const timer = setTimeout(() => ctrl?.abort(), TIMEOUT_MS);
  try {
    const res = await doFetch(forecastUrl(lat, lon), { signal: ctrl?.signal });
    if (!res.ok) return null;
    const days = parseForecast(await res.json());
    if (days) cache.set(climate, { at: now, days });
    return days;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** React hook: the forecast for the user's city, or null while loading / offline. Pass enabled=false to skip fetching. */
export function useForecast(climate: ClimateProfile, enabled = true): DailyForecast[] | null {
  const [days, setDays] = useState<DailyForecast[] | null>(() => cachedForecast(climate));
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    setDays(cachedForecast(climate));
    fetchForecast(climate).then((d) => {
      if (live) setDays(d);
    });
    return () => {
      live = false;
    };
  }, [climate, enabled]);
  return days;
}
