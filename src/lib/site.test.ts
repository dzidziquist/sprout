import { describe, expect, it } from 'vitest';
import { clearnessFrom, typicalSky } from '../engine/light';
import { MODEL_CLEARNESS, backfillClearness, fetchClearness, siteOf } from './site';
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

  it('uses a picked city’s own history, or its model city’s lined up by month', () => {
    const base: Climate = { model: 'seattle', shift: 6, place: 'Sydney', lat: -33.9, lon: 151.2, frost: false };
    expect(siteOf({ ...base, clearness: new Array(12).fill(0.6) }).clearness[0]).toBe(0.6);
    // Sydney's January lines up with Seattle's July.
    expect(siteOf(base).clearness[0]).toBe(MODEL_CLEARNESS.seattle[6]);
    expect(siteOf(base).lat).toBe(-33.9);
  });
});

describe('cities picked before sunlight was saved', () => {
  const history = days('2023-01-01', '2025-12-31', () => 10);
  const archive = { daily: { time: history.map((d) => d.date), shortwave_radiation_sum: history.map((d) => d.radiation) } };
  const ok = (async () => ({ ok: true, json: async () => archive })) as unknown as typeof fetch;
  const down = (async () => ({ ok: false, json: async () => ({}) })) as unknown as typeof fetch;
  const toronto: Climate = { model: 'seattle', shift: 0, place: 'Toronto', lat: 43.7, lon: -79.4, frost: true };

  it('looks up their own sunlight once and saves it', async () => {
    const saved: number[][] = [];
    await backfillClearness(toronto, (c) => saved.push(c), ok);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toHaveLength(12);
  });

  it('leaves presets and cities that already have it alone, and saves nothing when offline', async () => {
    const saved: number[][] = [];
    let calls = 0;
    const counting = (async (...a: Parameters<typeof fetch>) => (calls++, ok(...a))) as typeof fetch;
    await backfillClearness('seattle', (c) => saved.push(c), counting);
    await backfillClearness({ ...toronto, clearness: new Array(12).fill(0.5) }, (c) => saved.push(c), counting);
    await backfillClearness(toronto, (c) => saved.push(c), down);
    expect(calls).toBe(0);
    expect(saved).toEqual([]);
    expect(await fetchClearness(43.7, -79.4, down)).toBeNull();
  });
});
