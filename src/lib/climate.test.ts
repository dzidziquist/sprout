import { describe, expect, it } from 'vitest';
import { classifyClimate, climateDate, climateMonth, localizeClimateText, monthlyNormals, type MonthNormal } from './climate';
import { guessClimate, parseArchive, parseGeocode } from './place';
import { isFeedingPaused, seasonMultiplier } from '../engine/careEngine';

/** Rough monthly normals (°C, mm) for a few real places. */
const n = (tMean: number[], tMin: number[], precip: number[]): MonthNormal[] => tMean.map((t, i) => ({ tMean: t, tMin: tMin[i], precip: precip[i] }));
const SEATTLE = n([5.6, 6.2, 8.2, 10.6, 14, 16.9, 19.8, 20.1, 17.1, 12.2, 7.9, 5.2], [2.4, 2.4, 3.8, 5.6, 8.6, 11.2, 13.3, 13.5, 11.2, 7.8, 4.7, 2.3], [141, 89, 95, 70, 49, 39, 15, 23, 41, 95, 160, 138]);
const SYDNEY = n([23.5, 23.4, 22.1, 19.5, 16.6, 14.2, 13.4, 14.5, 17, 19, 20.6, 22.4], [19.6, 19.7, 18.4, 15.3, 12.3, 10, 8.6, 9.6, 12, 14.4, 16.3, 18.3], [91, 131, 117, 115, 92, 132, 70, 77, 64, 70, 83, 77]);
const TORONTO = n([-5.5, -4.5, 0.1, 7.1, 13.1, 18.6, 21.5, 20.6, 16.2, 9.5, 3.7, -2.2], [-9.2, -8.6, -4.6, 1.5, 7.2, 12.4, 15.5, 14.8, 10.3, 4.1, -0.8, -5.5], [61, 51, 53, 69, 74, 72, 74, 80, 77, 65, 74, 60]);
const LAGOS = n([27.3, 28.4, 28.6, 28.2, 27.3, 26, 25.6, 25.4, 25.9, 26.6, 27.6, 27.4], [22.6, 24, 24.7, 24.4, 23.8, 23, 22.9, 22.6, 22.8, 23.1, 23.5, 22.8], [13, 43, 99, 130, 212, 334, 177, 56, 136, 179, 66, 21]);

const at = (lat: number, lon: number) => ({ place: 'X', lat, lon });

describe('classifying a climate', () => {
  it('maps Seattle onto itself', () => {
    expect(classifyClimate(SEATTLE, at(47.6, -122.3))).toMatchObject({ model: 'seattle', shift: 0, frost: false });
  });

  it('runs mild Sydney six months apart from Seattle', () => {
    const c = classifyClimate(SYDNEY, at(-33.9, 151.2));
    expect(c).toMatchObject({ model: 'seattle', shift: 6 });
    // Sydney's coolest month (July) lines up with Seattle's January.
    expect(climateMonth(c, new Date(2026, 6, 15))).toBe(0);
  });

  it('flags frost and lines up a cold continental winter', () => {
    const c = classifyClimate(TORONTO, at(43.7, -79.4));
    // Toronto warms past 12°C in May, like Seattle, so planting lines up with no shift.
    expect(c).toMatchObject({ model: 'seattle', frost: true, shift: 0 });
  });

  it('treats the tropics like Accra, aligned on the driest month', () => {
    const c = classifyClimate(LAGOS, at(6.5, 3.4));
    expect(c.model).toBe('accra');
    expect(climateMonth(c, new Date(2026, 0, 15))).toBe(0);
  });
});

describe('using a shifted climate', () => {
  const sydney = classifyClimate(SYDNEY, at(-33.9, 151.2));

  it('pauses feeding in the southern winter, not the northern one', () => {
    expect(isFeedingPaused(sydney, 'indoor', new Date(2026, 6, 10))).toBe(true);
    expect(isFeedingPaused(sydney, 'indoor', new Date(2026, 0, 10))).toBe(false);
  });

  it('spaces checks out in the southern winter', () => {
    expect(seasonMultiplier(sydney, 'indoor', new Date(2026, 6, 10))).toBeGreaterThan(seasonMultiplier(sydney, 'indoor', new Date(2026, 0, 10)));
  });

  it('moves month names in grow-patch copy and drops city-only words', () => {
    expect(localizeClimateText('Plant out about mid-May, before July.', sydney)).toBe('Plant out about mid-November, before January.');
    expect(localizeClimateText('Plant garlic late Oct–mid Nov.', sydney)).toBe('Plant garlic late Apr–mid May.');
    expect(localizeClimateText('Harmattan dries pots.', 'seattle')).toBe('Dry season dries pots.');
    expect(localizeClimateText('Harmattan dries pots.', 'accra')).toBe('Harmattan dries pots.');
  });

  it('keeps the day of month when shifting dates', () => {
    const d = climateDate(sydney, new Date(2026, 0, 31));
    expect(d.getDate()).toBeGreaterThanOrEqual(28);
  });
});

describe('weather history and geocoding', () => {
  it('averages daily rows into monthly normals', () => {
    const rows = [
      { date: '2024-01-01', tMean: 4, tMin: 0, precip: 10 },
      { date: '2024-01-02', tMean: 6, tMin: 2, precip: 20 },
      { date: '2025-01-01', tMean: 5, tMin: 1, precip: 30 },
    ];
    const jan = monthlyNormals(rows)[0];
    expect(jan.tMean).toBe(5);
    expect(jan.tMin).toBe(1);
    expect(jan.precip).toBe(30); // 60 mm over 2 Januaries
  });

  it('parses Open-Meteo responses defensively', () => {
    expect(parseGeocode({ results: [{ name: 'Toronto', latitude: 43.7, longitude: -79.4, country: 'Canada', admin1: 'Ontario', country_code: 'CA' }, { name: 1 }] })).toEqual([
      { name: 'Toronto', region: 'Ontario, Canada', country: 'CA', lat: 43.7, lon: -79.4 },
    ]);
    expect(parseGeocode({})).toEqual([]);
    expect(parseArchive({ daily: { time: ['2024-01-01'], temperature_2m_mean: [3], temperature_2m_min: [null], precipitation_sum: [1], shortwave_radiation_sum: [4.2] } })).toEqual([{ date: '2024-01-01', tMean: 3, tMin: null, precip: 1, radiation: 4.2 }]);
    expect(parseArchive({ daily: { time: ['2024-01-01'], temperature_2m_mean: [3], temperature_2m_min: [1], precipitation_sum: [1] } })[0].radiation).toBeNull();
  });

  it('guesses from latitude when history is unavailable', () => {
    expect(guessClimate({ name: 'Perth', region: 'Australia', lat: -31.9, lon: 115.9 })).toMatchObject({ model: 'seattle', shift: 6 });
    expect(guessClimate({ name: 'Kumasi', region: 'Ghana', lat: 6.7, lon: -1.6 })).toMatchObject({ model: 'accra', shift: 0 });
  });
});
