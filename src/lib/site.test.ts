import { describe, expect, it } from 'vitest';
import { clearnessFrom, typicalSky } from '../engine/light';
import { MODEL_CLEARNESS, siteOf } from './site';
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
