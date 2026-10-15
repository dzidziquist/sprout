import type { Climate, ClimateModel, ClimateProfile } from '../types';

/*
 * PlantFam's care and grow-patch knowledge is calibrated on two real climates. Anywhere else maps onto
 * the closer one and shifts the calendar so the seasons line up. The soil checks then fine-tune each
 * plant's rhythm, so small differences in climate wash out within a few rounds.
 */

export const MODEL_LABEL: Record<ClimateModel, string> = { seattle: 'Seattle', accra: 'Accra' };

export const modelOf = (c: ClimateProfile): ClimateModel => (typeof c === 'string' ? c : c.model);
export const shiftOf = (c: ClimateProfile): number => (typeof c === 'string' ? 0 : c.shift);
/** True when the profile is exactly the model city (so its local wording, like "harmattan", applies). */
export const isPreset = (c: ClimateProfile, model: ClimateModel) => c === model || (typeof c !== 'string' && c.shift === 0 && c.place.toLowerCase().startsWith(model));
export const placeName = (c: ClimateProfile): string => (typeof c === 'string' ? MODEL_LABEL[c] : c.place);

/** The model's month (0–11) for a real date in the user's place. */
export function climateMonth(c: ClimateProfile, date: Date): number {
  return (((date.getMonth() + shiftOf(c)) % 12) + 12) % 12;
}

/** The same day-of-month in the model's calendar (for windows like "Oct 15 → Feb 28"). */
export function climateDate(c: ClimateProfile, date: Date): Date {
  const s = shiftOf(c);
  if (!s) return date;
  const d = new Date(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + s);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return d;
}

export interface MonthNormal {
  /** Mean daily temperature, °C. */
  tMean: number;
  /** Mean daily minimum, °C. */
  tMin: number;
  /** Mean monthly precipitation, mm. */
  precip: number;
}

/*
 * How places line up with the models:
 * - Cold-winter places: the month spring warms past 12°C (planting-out time) matches Seattle's May.
 * - Mild winters (coldest month 12–18°C, e.g. Sydney, LA): the coolest month matches Seattle's January.
 * - Tropical (coldest month ≥ 18°C): the driest month matches Accra's January (harmattan).
 */
const SEATTLE_SPRING = 4;
const SEATTLE_COOLEST = 0;
const ACCRA_DRIEST = 0;
const SPRING_C = 12;
const TROPICAL_C = 18;

/** Pick the model and shift from 12 monthly normals (index 0 = January). */
export function classifyClimate(normals: MonthNormal[], place: { place: string; country?: string; lat: number; lon: number }): Climate {
  if (normals.length !== 12) throw new Error('need 12 monthly normals');
  const coldest = normals.reduce((best, m, i) => (m.tMean < normals[best].tMean ? i : best), 0);
  const frost = normals.some((m) => m.tMin <= 0);
  if (normals[coldest].tMean >= TROPICAL_C) {
    const driest = normals.reduce((best, m, i) => (m.precip < normals[best].precip ? i : best), 0);
    return { ...place, model: 'accra', shift: (ACCRA_DRIEST - driest + 12) % 12, frost };
  }
  if (normals[coldest].tMean >= SPRING_C) return { ...place, model: 'seattle', shift: (SEATTLE_COOLEST - coldest + 12) % 12, frost };
  // First month after the coldest one that averages 12°C or more.
  let spring = coldest;
  for (let k = 1; k <= 12; k++) {
    const m = (coldest + k) % 12;
    if (normals[m].tMean >= SPRING_C) {
      spring = m;
      break;
    }
  }
  return { ...place, model: 'seattle', shift: (SEATTLE_SPRING - spring + 12) % 12, frost };
}

/** Average daily rows into monthly normals (mean temps, mean monthly precipitation across years). */
export function monthlyNormals(daily: { date: string; tMean: number | null; tMin: number | null; precip: number | null }[]): MonthNormal[] {
  const acc = Array.from({ length: 12 }, () => ({ t: 0, tn: 0, mn: 0, mnn: 0, p: 0, years: new Set<string>() }));
  for (const d of daily) {
    const m = Number(d.date.slice(5, 7)) - 1;
    if (!(m >= 0 && m < 12)) continue;
    const a = acc[m];
    if (d.tMean != null) {
      a.t += d.tMean;
      a.tn++;
    }
    if (d.tMin != null) {
      a.mn += d.tMin;
      a.mnn++;
    }
    if (d.precip != null) a.p += d.precip;
    a.years.add(d.date.slice(0, 4));
  }
  return acc.map((a) => ({
    tMean: a.tn ? a.t / a.tn : NaN,
    tMin: a.mnn ? a.mn / a.mnn : NaN,
    precip: a.years.size ? a.p / a.years.size : 0,
  }));
}

const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTH_RE = new RegExp(`\\b(${[...MONTHS_LONG, ...MONTHS_SHORT.filter((m) => m !== 'May')].join('|')})\\b`, 'g');

/**
 * Grow-patch copy is written for the model city. For a shifted climate, month names move with the
 * calendar (Seattle's "mid-May" is Sydney's mid-November) and city-specific words become general.
 */
export function localizeClimateText(text: string, c: ClimateProfile): string {
  const shift = shiftOf(c);
  let out = text;
  if (shift) {
    out = out.replace(MONTH_RE, (m) => {
      const long = MONTHS_LONG.indexOf(m);
      const i = long >= 0 ? long : MONTHS_SHORT.indexOf(m);
      const j = (((i - shift) % 12) + 12) % 12;
      return long >= 0 ? MONTHS_LONG[j] : MONTHS_SHORT[j];
    });
  }
  if (!isPreset(c, 'accra')) out = out.replace(/\bharmattan\b/gi, (w) => (w[0] === 'H' ? 'Dry season' : 'dry season'));
  if (!isPreset(c, 'seattle')) out = out.replace(/\bgrey season\b/gi, (w) => (w[0] === 'G' ? 'Cool season' : 'cool season'));
  return out;
}

/** A short, friendly description of a climate for the city picker. */
export function describeClimate(c: ClimateProfile): string {
  if (c === 'seattle') return 'Marine: dark wet winters, dry summers';
  if (c === 'accra') return 'Tropical: harmattan and two rainy seasons';
  if (c.model === 'accra') return 'Tropical: warm all year, with wet and dry seasons';
  if (c.frost) return 'Cold winters with frost, warm summers';
  return 'Mild winters, warm summers';
}
