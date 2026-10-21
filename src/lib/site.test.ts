import { describe, expect, it } from 'vitest';
import { clearnessFrom, typicalSky } from '../engine/light';
import { MODEL_CLEARNESS, fetchClearness, historyRange, refreshSunlight, siteOf, sunlightKey } from './site';
import type { Sunlight } from '../store/plantStore';
import type { Climate } from '../types';

const days = (from: string, to: string, radiation: (d: Date) => number | null) => {
  const out: { date: string; radiation: number | null }[] = [];
  for (let d = new Date(`${from}T12:00:00`); d <= new Date(`${to}T12:00:00`); d = new Date(d.getTime() + 86400000)) {
    out.push({ date: d.toISOString().slice(0, 10), radiation: radiation(d) });
  }
  return out;
};

describe('how sunny each month is', () => {
  it('turns measured sunlight into clearness, and needs every month', () => {
    const year = clearnessFrom(days('2024-01-01', '2024-12-31', () => 10), 47.6);
    expect(year).toHaveLength(12);
    // The same 10 MJ/m² a day is a clear December in Seattle but a dull June.
    expect(year![11]).toBeGreaterThan(year![5]);
    expect(clearnessFrom(days('2024-01-01', '2024-06-30', () => 10), 47.6)).toBeNull();
    expect(clearnessFrom(days('2024-01-01', '2024-12-31', (d) => (d.getMonth() === 3 ? null : 10)), 47.6)).toBeNull();
  });

  it('gives Seattle the direct sun its weather records show', () => {
    // NOAA's share of possible sunshine at Sea-Tac: about 23% in December, 65% in July.
    const sea = siteOf('seattle');
    expect(typicalSky(sea, new Date(2026, 11, 15))).toBeCloseTo(0.22, 1);
    expect(typicalSky(sea, new Date(2026, 6, 15))).toBeGreaterThan(0.6);
  });

  it('uses the saved lookup for this city, else the model city’s lined up by month', () => {
    const sydney: Climate = { model: 'seattle', shift: 6, place: 'Sydney', lat: -33.9, lon: 151.2, frost: false };
    const saved: Sunlight = { key: sunlightKey(sydney), clearness: new Array(12).fill(0.6), at: '2026-10-01T00:00:00Z' };
    expect(siteOf(sydney, saved).clearness[0]).toBe(0.6);
    // A lookup for somewhere else (they've moved) doesn't count.
    expect(siteOf(sydney, { ...saved, key: '47.61,-122.33' }).clearness[0]).toBe(MODEL_CLEARNESS.seattle[6]);
    // Sydney's January lines up with Seattle's July.
    expect(siteOf(sydney).clearness[0]).toBe(MODEL_CLEARNESS.seattle[6]);
    expect(siteOf(sydney).lat).toBe(-33.9);
  });
});

describe('keeping the sunlight fresh', () => {
  const now = new Date(2026, 9, 21);
  const history = days('2023-10-01', '2026-09-30', () => 10);
  const archive = { daily: { time: history.map((d) => d.date), shortwave_radiation_sum: history.map((d) => d.radiation) } };
  const urls: string[] = [];
  const ok = (async (url: string) => (urls.push(url), { ok: true, json: async () => archive })) as unknown as typeof fetch;
  const down = (async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;

  it('uses the last 36 whole months, up to last month', () => {
    expect(historyRange(now)).toEqual({ start: '2023-10-01', end: '2026-09-30' });
    expect(historyRange(new Date(2026, 0, 5))).toEqual({ start: '2023-01-01', end: '2025-12-31' });
  });

  it('looks it up when missing, a year old, or for another city, and saves it', async () => {
    const saved: Sunlight[] = [];
    await refreshSunlight('seattle', undefined, (s) => saved.push(s), { fetchImpl: ok, now });
    expect(saved[0]).toMatchObject({ key: '47.61,-122.33', at: now.toISOString() });
    expect(saved[0].clearness).toHaveLength(12);
    expect(urls[0]).toContain('start_date=2023-10-01&end_date=2026-09-30');
    const old: Sunlight = { ...saved[0], at: new Date(2025, 9, 1).toISOString() };
    await refreshSunlight('seattle', old, (s) => saved.push(s), { fetchImpl: ok, now });
    await refreshSunlight('accra', saved[0], (s) => saved.push(s), { fetchImpl: ok, now });
    expect(saved).toHaveLength(3);
  });

  it('leaves a fresh lookup alone, and saves nothing when offline', async () => {
    const saved: Sunlight[] = [];
    const fresh: Sunlight = { key: '47.61,-122.33', clearness: new Array(12).fill(0.5), at: new Date(2026, 3, 1).toISOString() };
    await refreshSunlight('seattle', fresh, (s) => saved.push(s), { fetchImpl: ok, now });
    await refreshSunlight('seattle', undefined, (s) => saved.push(s), { fetchImpl: down, now });
    expect(saved).toEqual([]);
    expect(await fetchClearness(43.7, -79.4, down, now)).toBeNull();
  });
});
