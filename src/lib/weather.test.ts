import { afterEach, describe, expect, it, vi } from 'vitest';
import { CACHE_MS, CITY_COORDS, clearForecastCache, fetchForecast, forecastUrl, parseForecast } from './weather';

// Trimmed real Open-Meteo response shape (Seattle, mid-October).
const FIXTURE = {
  latitude: 47.6,
  longitude: -122.33,
  timezone: 'America/Los_Angeles',
  daily_units: { time: 'iso8601', temperature_2m_max: '°C', temperature_2m_min: '°C', precipitation_sum: 'mm' },
  daily: {
    time: ['2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20'],
    temperature_2m_max: [16.2, 15.1, 13.8, 14.4, 12.9, 13.5, 15.0],
    temperature_2m_min: [9.1, 8.4, 7.2, 6.8, 5.9, 1.6, 8.0],
    precipitation_sum: [0, 2.3, 12.8, 24.1, 6.0, 0, null],
  },
};

const ok = (body: unknown) => ({ ok: true, json: async () => body }) as unknown as Response;

afterEach(() => clearForecastCache());

describe('parseForecast', () => {
  it('maps the daily arrays into seven forecast days', () => {
    const days = parseForecast(FIXTURE)!;
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ date: '2026-10-14', minC: 9.1, maxC: 16.2, precipMm: 0 });
    expect(days[5].minC).toBe(1.6);
  });

  it('treats missing rain as zero and skips days with missing temperatures', () => {
    const days = parseForecast({ daily: { ...FIXTURE.daily, temperature_2m_min: [9.1, null, 7.2] } })!;
    expect(days.map((d) => d.date)).toEqual(['2026-10-14', '2026-10-16']);
    expect(parseForecast(FIXTURE)![6].precipMm).toBe(0);
  });

  it('returns null for junk', () => {
    expect(parseForecast(null)).toBeNull();
    expect(parseForecast({})).toBeNull();
    expect(parseForecast({ error: true, reason: 'bad' })).toBeNull();
    expect(parseForecast({ daily: { time: [] } })).toBeNull();
  });
});

describe('fetchForecast', () => {
  it('asks Open-Meteo for the city coordinates', async () => {
    const f = vi.fn(async (_url: string) => ok(FIXTURE));
    await fetchForecast('accra', { fetchImpl: f as unknown as typeof fetch });
    expect(f.mock.calls[0][0]).toBe(forecastUrl(CITY_COORDS.accra.lat, CITY_COORDS.accra.lon));
    expect(String(f.mock.calls[0][0])).toContain('latitude=5.6&longitude=-0.19');
  });

  it('caches for three hours', async () => {
    const f = vi.fn(async () => ok(FIXTURE));
    const fetchImpl = f as unknown as typeof fetch;
    await fetchForecast('seattle', { now: 0, fetchImpl });
    await fetchForecast('seattle', { now: CACHE_MS - 1, fetchImpl });
    expect(f).toHaveBeenCalledTimes(1);
    await fetchForecast('seattle', { now: CACHE_MS + 1, fetchImpl });
    expect(f).toHaveBeenCalledTimes(2);
  });

  it('fails silently when offline or the server errors', async () => {
    const offline = vi.fn(async () => {
      throw new TypeError('Network request failed');
    });
    expect(await fetchForecast('seattle', { fetchImpl: offline as unknown as typeof fetch })).toBeNull();
    const err = vi.fn(async () => ({ ok: false, json: async () => ({}) }) as unknown as Response);
    expect(await fetchForecast('seattle', { fetchImpl: err as unknown as typeof fetch })).toBeNull();
  });
});
