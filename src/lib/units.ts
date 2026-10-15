
export type Units = 'imperial' | 'metric';

/** 'auto' follows the climate: Seattle reads °F and inches, Accra reads °C and mm. */
/** Countries that use °F and inches day to day. */
const IMPERIAL = new Set(['US', 'LR', 'MM', 'BS', 'BZ', 'KY', 'PW', 'FM', 'MH']);

export function resolveUnits(profile: { units?: 'auto' | Units; climate: 'seattle' | 'accra' | { country?: string } }): Units {
  if (profile.units === 'imperial' || profile.units === 'metric') return profile.units;
  const c = profile.climate;
  if (typeof c === 'string') return c === 'seattle' ? 'imperial' : 'metric';
  return c.country && IMPERIAL.has(c.country.toUpperCase()) ? 'imperial' : 'metric';
}

export const toF = (c: number) => (c * 9) / 5 + 32;

export function fmtTemp(c: number, units: Units): string {
  return units === 'imperial' ? `${Math.round(toF(c))}°F` : `${Math.round(c)}°C`;
}

/** Bare degrees for compact displays (weather strip). */
export function degrees(c: number, units: Units): number {
  return Math.round(units === 'imperial' ? toF(c) : c);
}

export function fmtRain(mm: number, units: Units): string {
  return units === 'imperial' ? `${(mm / 25.4).toFixed(mm >= 25.4 ? 1 : 2).replace(/\.?0+$/, '')} in` : `${Math.round(mm)} mm`;
}

/**
 * Our guides are written in °C; show them in the reader's units. Handles "18°C", "13–21°C",
 * "10 °C", and ranges like "nights above 15.5°C".
 */
export function localizeTemps(text: string, units: Units): string {
  if (units === 'metric') return text;
  return text
    .replace(/(-?\d+(?:\.\d+)?)\s*[–-]\s*(-?\d+(?:\.\d+)?)\s*°C/g, (_, a, b) => `${Math.round(toF(Number(a)))}–${Math.round(toF(Number(b)))}°F`)
    .replace(/(-?\d+(?:\.\d+)?)\s*°C/g, (_, a) => `${Math.round(toF(Number(a)))}°F`);
}
