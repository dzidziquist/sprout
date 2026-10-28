import { describe, expect, it } from 'vitest';
import { bandOf, exposureFromExif, hoursFromNoon, luxFromExposure, middayLux, outdoorLux, readingFrom, spotShare, sunElevation, yearBands, yearWords, type LightReading } from './lightMeter';
import { MODEL_CLEARNESS } from '../lib/site';

const seattle = { lat: 47.61, lon: -122.33 };
const site = { lat: seattle.lat, clearness: MODEL_CLEARNESS.seattle };

describe('luxFromExposure', () => {
  it('reads the classic sunny-16 exposure as full sun', () => {
    // f/16, 1/100 s at ISO 100: bright sunlight, about 100,000 lux.
    expect(luxFromExposure({ fNumber: 16, exposureTime: 1 / 100, iso: 100 })).toBeGreaterThan(50000);
  });
  it('reads a dim room as a few hundred lux', () => {
    const lux = luxFromExposure({ fNumber: 2.2, exposureTime: 1 / 30, iso: 400 });
    expect(lux).toBeGreaterThan(50);
    expect(lux).toBeLessThan(400);
  });
  it('gives NaN for missing exposure data', () => {
    expect(luxFromExposure({ fNumber: 0, exposureTime: 0.01, iso: 100 })).toBeNaN();
  });
});

describe('sun and outdoor light', () => {
  it('puts Seattle’s midsummer noon sun about 65° up and below the horizon at midnight', () => {
    // 13:10 local daylight time on June 21 is about solar noon in Seattle.
    expect(sunElevation(seattle.lat, seattle.lon, new Date('2026-06-21T20:10:00Z'))).toBeGreaterThan(63);
    expect(sunElevation(seattle.lat, seattle.lon, new Date('2026-06-21T08:00:00Z'))).toBeLessThan(0);
  });
  it('has much less light outside under cloud and a low sun', () => {
    expect(outdoorLux(65, 1)).toBeGreaterThan(90000);
    expect(outdoorLux(65, 0.3)).toBeLessThan(outdoorLux(65, 1) / 2);
    expect(outdoorLux(15, 1)).toBeLessThan(outdoorLux(65, 1) / 3);
    expect(outdoorLux(-5, 1)).toBe(0);
  });
});

describe('readings', () => {
  const afternoon = new Date('2026-10-28T21:10:00Z'); // 2:10 pm in Seattle, sun about 25° up
  it('turns a reading into the share of outdoor light', () => {
    const r = readingFrom(1200, afternoon, seattle, 0.3)!;
    expect(r.share).toBeGreaterThan(0.02);
    expect(r.share).toBeLessThan(0.15);
    expect(r.sunny).toBe(false);
  });
  it('the same spot reads lower on a cloudy day but keeps about the same share', () => {
    const clear = readingFrom(3000, afternoon, seattle, 1)!;
    const cloudy = readingFrom(1300, afternoon, seattle, 0.3)!;
    expect(Math.abs(Math.log(clear.share / cloudy.share))).toBeLessThan(0.35);
  });
  it('marks a reading in a sunbeam as sunny, and refuses one after dark', () => {
    expect(readingFrom(30000, afternoon, seattle, 1)!.sunny).toBe(true);
    expect(readingFrom(200, new Date('2026-10-29T06:00:00Z'), seattle, 1)).toBeNull();
  });
  it('averages shade readings, newer ones counting more, and ignores sunbeams', () => {
    const rs: LightReading[] = [
      { at: '2026-10-01T20:00:00Z', lux: 1, share: 0.01, sunny: false },
      { at: '2026-10-20T20:00:00Z', lux: 1, share: 0.04, sunny: false },
      { at: '2026-10-21T20:00:00Z', lux: 1, share: 0.6, sunny: true },
    ];
    const s = spotShare(rs)!;
    expect(s).toBeGreaterThan(0.02);
    expect(s).toBeLessThan(0.04);
    expect(spotShare([rs[2]])).toBeNull();
    expect(spotShare(undefined)).toBeNull();
  });
});

describe('through the year', () => {
  it('agrees with the window model: 1 m from a window is some light even in a Seattle December', () => {
    expect(bandOf(middayLux(0.06, site, 2026, 11), false)).toBe('medium');
    expect(bandOf(middayLux(0.15, site, 2026, 9), false)).toBe('bright');
  });
  it('a spot with a few percent of outdoor light is brighter in summer than winter', () => {
    expect(middayLux(0.05, site, 2026, 6)).toBeGreaterThan(middayLux(0.05, site, 2026, 11) * 3);
    const bands = yearBands(0.05, site, 2026, false);
    expect(bands[6]).not.toBe(bands[11]);
    expect(bands).not.toContain('direct');
  });
  it('bands follow the houseplant guide, with direct sun only where the sun reaches', () => {
    expect(bandOf(400, false)).toBe('low');
    expect(bandOf(3000, false)).toBe('medium');
    expect(bandOf(20000, false)).toBe('bright');
    expect(bandOf(20000, true)).toBe('direct');
  });
  it('says the year in words, including a run across January', () => {
    expect(yearWords(Array(12).fill('bright'))).toBe('Bright all year.');
    expect(yearWords([...Array(11).fill('medium'), 'low'])).toBe('Some light from January to November and shady in December.');
    const summer = ['medium', 'medium', 'bright', 'bright', 'bright', 'bright', 'bright', 'bright', 'bright', 'bright', 'medium', 'medium'] as const;
    expect(yearWords([...summer])).toBe('Bright from March to October and some light the rest of the year.');
    const winter = ['bright', 'bright', 'medium', 'medium', 'medium', 'medium', 'medium', 'medium', 'medium', 'medium', 'medium', 'bright'] as const;
    expect(yearWords([...winter])).toBe('Bright from December to February and some light the rest of the year.');
  });
});

describe('exposureFromExif', () => {
  it('reads flat and nested EXIF, with ISO as an array', () => {
    expect(exposureFromExif({ ExposureTime: 0.01, ISOSpeedRatings: [64], FNumber: 2.2 })).toEqual({ exposureTime: 0.01, iso: 64, fNumber: 2.2 });
    expect(exposureFromExif({ '{Exif}': { ExposureTime: 0.02, ISOSpeedRatings: [100], FNumber: 1.9 } })).toEqual({ exposureTime: 0.02, iso: 100, fNumber: 1.9 });
  });
  it('gives null when something is missing', () => {
    expect(exposureFromExif({ ExposureTime: 0.01 })).toBeNull();
    expect(exposureFromExif(undefined)).toBeNull();
  });
});

describe('time of day', () => {
  it('knows solar noon from the clock, daylight saving and all', () => {
    // Seattle in late October (PDT): the sun is highest around 12:58 pm local.
    expect(Math.abs(hoursFromNoon(seattle.lon, new Date('2026-10-28T19:58:00Z')))).toBeLessThan(0.25);
  });
  it('flags early and late readings, which count half as much', () => {
    const morning = readingFrom(800, new Date('2026-10-28T16:30:00Z'), seattle, 1)!; // 9:30 am
    const noon = readingFrom(2500, new Date('2026-10-28T20:00:00Z'), seattle, 1)!;
    const evening = readingFrom(500, new Date('2026-10-28T23:30:00Z'), seattle, 1)!; // 4:30 pm
    expect(morning.offPeak).toBe('early');
    expect(noon.offPeak).toBeUndefined();
    expect(evening.offPeak).toBe('late');
    // Same time of entry order: an off-peak reading after a midday one pulls the average less than the reverse.
    const a = { at: '2026-10-01T20:00:00Z', lux: 1, share: 0.02, sunny: false };
    const b = { at: '2026-10-02T20:00:00Z', lux: 1, share: 0.08, sunny: false };
    expect(spotShare([a, { ...b, offPeak: 'early' as const }])!).toBeLessThan(spotShare([a, b])!);
  });
  it('a morning and a midday reading of the same spot land close together', () => {
    const at9 = new Date('2026-06-21T16:00:00Z');
    const at1 = new Date('2026-06-21T20:00:00Z');
    const share = 0.05;
    const r9 = readingFrom(share * outdoorLux(sunElevation(seattle.lat, seattle.lon, at9), 1), at9, seattle, 1)!;
    const r1 = readingFrom(share * outdoorLux(sunElevation(seattle.lat, seattle.lon, at1), 1), at1, seattle, 1)!;
    expect(r9.share).toBeCloseTo(r1.share, 3);
  });
});

