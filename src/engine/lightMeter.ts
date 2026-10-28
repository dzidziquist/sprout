import type { Light } from '../types';
import { typicalSky, type Site } from './light';

/*
 * The camera light meter. A phone camera exposes for the scene; its shutter, ISO and aperture say how
 * bright that was. Held where the plant sits with the screen (selfie camera) facing the window, it sees
 * roughly what the leaves see.
 *
 * One reading is only that moment: a grey October afternoon reads far lower than a June noon in the same
 * spot. What stays put is the SHARE of the outdoor light that reaches the spot (architects call it the
 * daylight factor). So a reading is turned into that share, using the sun's height at that minute and the
 * day's cloud, and the share is then carried through each month's typical midday light for the city.
 * Rough by nature (a phone is not a light meter), but good enough to tell the four bands apart.
 */

const RAD = Math.PI / 180;
const DAY = 86400000;

export interface Exposure {
  /** Seconds, e.g. 1/120 → 0.0083. */
  exposureTime: number;
  iso: number;
  fNumber: number;
}

export interface LightReading {
  at: string;
  lux: number;
  /** Share of the outdoor light reaching the spot (0–1). */
  share: number;
  /** Sun was shining right on the spot: kept as a note, not used for the level. */
  sunny: boolean;
  /** Taken early or late in the day (over 3 hours from solar noon): rougher, so it counts for less. */
  offPeak?: 'early' | 'late';
}

/** Readings further than this from solar noon are rougher: a low sun's light depends a lot on the window's direction. */
export const PEAK_HOURS = 3;
/** Below this, the sun is too low (or down) to measure fairly: dawn, dusk and night. */
export const MIN_SUN_DEG = 8;
/** Indoors away from a sunbeam, a spot rarely gets more than this share of the light outside. */
const SUNNY_SHARE = 0.25;

/** Illuminance in lux from a camera exposure (exposure value at ISO 100, incident-light constant 2.5). */
export function luxFromExposure({ exposureTime, iso, fNumber }: Exposure): number {
  if (!(exposureTime > 0 && iso > 0 && fNumber > 0)) return NaN;
  const ev100 = Math.log2((fNumber * fNumber) / exposureTime) - Math.log2(iso / 100);
  return 2.5 * 2 ** ev100;
}

/** Where the sun is for a place and moment (NOAA's simplified equations): declination and solar time. */
function solar(lon: number, at: Date) {
  const start = Date.UTC(at.getUTCFullYear(), 0, 1);
  const doy = Math.floor((at.getTime() - start) / DAY);
  const hours = at.getUTCHours() + at.getUTCMinutes() / 60 + at.getUTCSeconds() / 3600;
  const g = ((2 * Math.PI) / 365) * (doy + (hours - 12) / 24);
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const eqTime = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  // Solar time in hours: 12 is when the sun is highest, whatever the clock or daylight saving says.
  const solarHour = ((((hours * 60 + eqTime + 4 * lon) / 60) % 24) + 24) % 24;
  return { decl, solarHour };
}

/** Hours from solar noon (negative in the morning). */
export function hoursFromNoon(lon: number, at: Date): number {
  return solar(lon, at).solarHour - 12;
}

/** The sun's height above the horizon in degrees, for a place and moment. */
export function sunElevation(lat: number, lon: number, at: Date): number {
  const { decl, solarHour } = solar(lon, at);
  const hourAngle = (solarHour - 12) * 15 * RAD;
  const phi = lat * RAD;
  const sinEl = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(hourAngle);
  return Math.asin(Math.max(-1, Math.min(1, sinEl))) / RAD;
}

/**
 * Light falling on open ground outside, in lux, for a sun height and how clear the sky is (1 cloudless,
 * 0.3 overcast, as skyFactor and typicalSky give it). About 110,000 lux under a high summer sun; heavy
 * cloud lets through a fifth to a third of that.
 */
export function outdoorLux(elevationDeg: number, sky: number): number {
  if (elevationDeg <= 0) return 0;
  const clear = 130000 * Math.sin(elevationDeg * RAD) ** 1.15;
  return clear * (0.15 + 0.85 * Math.max(0, Math.min(1, sky)));
}

/** A reading, read against the light outside at that moment. Null when the sun is too low to measure. */
export function readingFrom(lux: number, at: Date, place: { lat: number; lon: number }, sky: number): LightReading | null {
  const el = sunElevation(place.lat, place.lon, at);
  if (!Number.isFinite(lux) || lux <= 0 || el < MIN_SUN_DEG) return null;
  const share = lux / outdoorLux(el, sky);
  const fromNoon = hoursFromNoon(place.lon, at);
  const offPeak = Math.abs(fromNoon) > PEAK_HOURS ? (fromNoon < 0 ? 'early' : 'late') : undefined;
  return { at: at.toISOString(), lux: Math.round(lux), share: Math.min(1, share), sunny: share > SUNNY_SHARE, ...(offPeak ? { offPeak } : {}) };
}

/**
 * The spot's share of outdoor light from its readings: shade readings only (a sunbeam isn't the spot),
 * newer ones counting double the one before, and early or late ones half as much as midday ones.
 * Null with no shade reading yet.
 */
export function spotShare(readings: LightReading[] | undefined): number | null {
  const shade = (readings ?? []).filter((r) => !r.sunny).sort((a, b) => a.at.localeCompare(b.at));
  if (!shade.length) return null;
  let sum = 0;
  let weight = 0;
  shade.forEach((r, i) => {
    const w = 2 ** i * (r.offPeak ? 0.5 : 1);
    sum += Math.log(r.share) * w;
    weight += w;
  });
  // Averaged on a log scale: light shares multiply, so 1% and 4% average to 2%, not 2.5%.
  return Math.exp(sum / weight);
}

/** Midday light at the spot on a typical day in a month, in lux. */
export function middayLux(share: number, site: Site, year: number, month: number): number {
  const mid = new Date(year, month, 15, 12);
  const doy = Math.round((mid.getTime() - new Date(year, 0, 1).getTime()) / DAY) + 1;
  const decl = 23.44 * Math.sin(((2 * Math.PI) / 365) * (284 + doy));
  const noon = 90 - Math.abs(site.lat - decl);
  return share * outdoorLux(noon, typicalSky(site, mid));
}

/**
 * The band for midday light on a typical day. Set to agree with the window model: about 1 m from an
 * east or west window (a few percent of outdoor light) still counts as some light in a Seattle December,
 * and a west sill is bright in October. Shade is under ~600 lux, the low end of houseplant guides. "Direct" needs the sun actually reaching the spot, which the share of
 * diffuse light can't show, so it's only given when a reading caught the sun there.
 */
export function bandOf(lux: number, sunReaches: boolean): Light {
  if (sunReaches && lux >= 15000) return 'direct';
  if (lux >= 5000) return 'bright';
  if (lux >= 600) return 'medium';
  return 'low';
}

/** The spot's band for each month of the year (January first). */
export function yearBands(share: number, site: Site, year: number, sunReaches: boolean): Light[] {
  return Array.from({ length: 12 }, (_, m) => bandOf(middayLux(share, site, year, m), sunReaches));
}

const MONTH = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WORD: Record<Light, string> = { low: 'Shady', medium: 'Some light', bright: 'Bright', direct: 'Direct sun' };

/** "Bright from March to October and Some light the rest of the year." from the year's bands. */
export function yearWords(bands: Light[]): string {
  const levels = [...new Set(bands)];
  if (levels.length === 1) return `${WORD[levels[0]]} all year.`;
  // The best band and the run of months it covers (the year wraps, so a winter run can cross January).
  const rank: Record<Light, number> = { low: 0, medium: 1, bright: 2, direct: 3 };
  const top = levels.reduce((a, b) => (rank[b] > rank[a] ? b : a));
  const on = bands.map((b) => rank[b] >= rank[top]);
  const start = on.findIndex((v, i) => v && !on[(i + 11) % 12]);
  let end = start;
  while (on[(end + 1) % 12] && (end + 1) % 12 !== start) end = (end + 1) % 12;
  const rest = bands.filter((_, i) => !on[i]);
  const restLevel = rest.reduce((a, b) => (rank[b] < rank[a] ? b : a), rest[0]);
  const span = start === end ? `in ${MONTH[start]}` : `from ${MONTH[start]} to ${MONTH[end]}`;
  // The other months are one run too (the top run is), so name them when they're few.
  const restStart = (end + 1) % 12;
  const restEnd = (start + 11) % 12;
  const restSpan = rest.length === 1 ? `in ${MONTH[restStart]}` : rest.length === 2 ? `in ${MONTH[restStart]} and ${MONTH[restEnd]}` : 'the rest of the year';
  return `${WORD[top]} ${span} and ${WORD[restLevel].toLowerCase()} ${restSpan}.`;
}

/**
 * Shutter, ISO and aperture from a photo's EXIF, as the camera module hands it over: flat on iOS, or
 * nested under "{Exif}". Null when anything is missing (web, or a camera that doesn't report it).
 */
export function exposureFromExif(exif: unknown): Exposure | null {
  if (!exif || typeof exif !== 'object') return null;
  const e = exif as Record<string, unknown>;
  const src = (e['{Exif}'] && typeof e['{Exif}'] === 'object' ? e['{Exif}'] : e) as Record<string, unknown>;
  const num = (v: unknown) => (Array.isArray(v) ? Number(v[0]) : Number(v));
  const exposureTime = num(src.ExposureTime ?? e.ExposureTime);
  const iso = num(src.ISOSpeedRatings ?? src.PhotographicSensitivity ?? e.ISOSpeedRatings ?? e.ISO);
  const fNumber = num(src.FNumber ?? e.FNumber);
  return exposureTime > 0 && iso > 0 && fNumber > 0 ? { exposureTime, iso, fNumber } : null;
}
