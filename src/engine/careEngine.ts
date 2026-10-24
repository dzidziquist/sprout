import { climateDate, climateMonth, modelOf } from '../lib/climate';
import type { CheckResult, ClimateModel, ClimateProfile, Light, Placement, Plant, PotMaterial, Soil, SpeciesGroup } from '../types';
import { calendarDays } from '../lib/when';

/*
 * PlantFam schedules soil CHECKS, not waterings.
 *
 *   interval = base(group) × light × pot material × pot size × soil × season(location, month) × k_plant
 *
 * Directions come from extension guidance (Illinois, RHS, UConn) and container-substrate physics.
 * Magnitudes are starting estimates (see docs/product-brief.md) and are meant to be calibrated
 * from users' Dry / Damp / Soggy answers. The model errs long: overwatering kills more houseplants
 * than underwatering, so a "damp" answer stretches the interval more than a "dry" one shrinks it.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const BASE_INTERVAL_DAYS: Record<SpeciesGroup, number> = {
  succulent: 14,
  tropical: 7,
  moisture: 4,
  edible: 3,
};

export const LIGHT_MULTIPLIER: Record<Light, number> = {
  low: 1.3,
  medium: 1.1,
  bright: 1.0,
  direct: 0.85,
};

export const POT_MATERIAL_MULTIPLIER: Record<PotMaterial, number> = {
  plastic: 1.0,
  glazed: 1.0,
  terracotta: 0.8,
  fabric: 0.75,
};

/** Below 1 the mix dries faster than standard potting mix, so checks come sooner. */
export const SOIL_MULTIPLIER: Record<Exclude<Soil, ReservoirMedium>, number> = {
  gritty: 0.6,
  chunky_aroid: 0.7,
  perlite_mix: 0.85,
  bagged_cactus: 0.9,
  potting_mix: 1.0,
  veg_mix: 1.0,
  unsure: 1.0,
  coir: 1.1,
  moisture_control: 1.15,
  moss: 1.2,
  garden_soil: 1.35,
};

/**
 * Hydro and semi-hydro: no soil to dry out. LECA / pon sits over a reservoir; water culture, Kratky
 * jars and countertop hydro gardens have roots straight in water. We check the water line on its
 * own cadence, and remind about fresh water + nutrients (a full change for water, a flush for LECA).
 */
export type ReservoirMedium = 'leca' | 'water';
export const isReservoir = (soil: Soil): soil is ReservoirMedium => soil === 'leca' || soil === 'water';

export const RESERVOIR_BASE_DAYS = 7;

/** A self-watering pot kept topped up wicks water to the roots, so the soil stays even far longer. */
export const SELF_WATERING_MULTIPLIER = 2;

/** Checks for this plant mean peeking at a water line (LECA, water, or a self-watering pot kept filled). */
export function checksWaterLine(plant: Pick<Plant, 'soil' | 'selfWatering'>): boolean {
  return isReservoir(plant.soil) || plant.selfWatering === 'always';
}

/** Days between full water changes (water culture) or flushes (LECA). Nutrient salts build up otherwise. */
export const REFRESH_DAYS: Record<ReservoirMedium, number> = { water: 14, leca: 28 };

/** Organic mixes break down and hold more water as they age. */
export const OLD_MIX_MONTHS = 24;
export const OLD_MIX_MULTIPLIER = 1.1;

export function potSizeMultiplier(diameterCm: number): number {
  if (diameterCm < 10) return 0.8;
  if (diameterCm < 15) return 0.9;
  if (diameterCm < 20) return 1.0;
  if (diameterCm < 30) return 1.15;
  return 1.3;
}

type SeasonRow = [indoor: number, growlight: number, outdoor: number];

/** Month (Jan..Dec) → multiplier per placement. Seattle values from WSU/NOAA-derived defaults. */
export const SEASON_TABLE: Record<ClimateModel, SeasonRow[]> = {
  seattle: [
    [1.5, 1.1, 2.5],
    [1.4, 1.1, 2.2],
    [1.25, 1.0, 1.8],
    [1.1, 1.0, 1.4],
    [1.0, 1.0, 1.1],
    [0.95, 1.0, 0.85],
    [0.85, 0.95, 0.6],
    [0.85, 0.95, 0.6],
    [0.95, 1.0, 0.85],
    [1.15, 1.0, 1.4],
    [1.4, 1.1, 2.2],
    [1.55, 1.1, 2.5],
  ],
  // Accra: harmattan (Dec–Feb) dries pots fast; the rains (Apr–Jun, Sep–Oct) slow them.
  accra: [
    [0.8, 0.9, 0.7],
    [0.8, 0.9, 0.7],
    [0.9, 0.95, 0.85],
    [1.05, 1.0, 1.4],
    [1.1, 1.0, 1.6],
    [1.15, 1.0, 1.7],
    [1.0, 1.0, 1.1],
    [1.0, 1.0, 1.0],
    [1.05, 1.0, 1.3],
    [1.05, 1.0, 1.3],
    [0.95, 0.95, 0.9],
    [0.8, 0.9, 0.7],
  ],
};

/**
 * Garden beds: deep, wide soil and roots that reach down, so they dry far slower than any pot. Pot
 * size, material and mix age don't apply; the outdoor season (rain included) does.
 */
export const GROUND_MULTIPLIER = 1.6;

/** Pots under an eave miss the rain, so they sit closer to indoor behaviour in wet months. */
const COVERED_OUTDOOR_DAMPING = 0.7;

export function seasonMultiplier(profile: ClimateProfile, placement: Placement, date: Date): number {
  const [indoor, growlight, outdoor] = SEASON_TABLE[modelOf(profile)][climateMonth(profile, date)];
  switch (placement) {
    case 'indoor':
      return indoor;
    case 'growlight':
      return growlight;
    case 'outdoor':
    case 'ground':
      return outdoor;
    case 'covered_outdoor':
      return outdoor > 1 ? 1 + (outdoor - 1) * COVERED_OUTDOOR_DAMPING : outdoor;
  }
}

/** Feeding pauses through the dark months unless the plant is under a grow light. */
export function isFeedingPaused(profile: ClimateProfile, placement: Placement, date: Date): boolean {
  if (placement === 'growlight' || modelOf(profile) !== 'seattle') return false;
  const local = climateDate(profile, date);
  const m = local.getMonth();
  const d = local.getDate();
  // Oct 15 → Feb 28
  return m > 9 || m < 2 || (m === 9 && d >= 15);
}

export const K_MIN = 0.5;
export const K_MAX = 2.5;
export const MIN_INTERVAL_DAYS = 1;
export const MAX_INTERVAL_DAYS = 45;

export interface IntervalInput {
  group: SpeciesGroup;
  plant: Pick<Plant, 'soil' | 'light' | 'potMaterial' | 'potDiameterCm' | 'placement' | 'k' | 'lastRepottedAt' | 'acquiredAt'> & Partial<Pick<Plant, 'selfWatering'>>;
  profile: ClimateProfile;
  at: Date;
}

function monthsBetween(fromIso: string, to: Date): number {
  const from = new Date(fromIso);
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
}

export function isMixOld(plant: IntervalInput['plant'], at: Date): boolean {
  if (plant.soil === 'gritty' || isReservoir(plant.soil) || plant.placement === 'ground') return false;
  return monthsBetween(plant.lastRepottedAt ?? plant.acquiredAt, at) >= OLD_MIX_MONTHS;
}

/** Full check interval in days for a plant whose soil was just found dry (and watered). */
export function checkIntervalDays({ group, plant, profile, at }: IntervalInput): number {
  const season = seasonMultiplier(profile, plant.placement, at);
  const light = LIGHT_MULTIPLIER[plant.light];
  let days: number;
  if (isReservoir(plant.soil)) {
    days = RESERVOIR_BASE_DAYS * light * season * plant.k;
  } else if (plant.placement === 'ground') {
    days = BASE_INTERVAL_DAYS[group] * light * GROUND_MULTIPLIER * season * plant.k;
  } else {
    days =
      BASE_INTERVAL_DAYS[group] *
      light *
      POT_MATERIAL_MULTIPLIER[plant.potMaterial] *
      potSizeMultiplier(plant.potDiameterCm) *
      SOIL_MULTIPLIER[plant.soil] *
      season *
      plant.k *
      (isMixOld(plant, at) ? OLD_MIX_MULTIPLIER : 1) *
      (plant.selfWatering === 'always' ? SELF_WATERING_MULTIPLIER : 1);
  }
  return clamp(round1(days), MIN_INTERVAL_DAYS, MAX_INTERVAL_DAYS);
}

/** How much each answer nudges k. Asymmetric on purpose: the model errs long. */
const K_FACTOR: Record<CheckResult, number> = { dry: 0.92, damp: 1.2, soggy: 1.4 };
const K_SMOOTHING = 0.6;

export function updateK(k: number, result: CheckResult): number {
  const target = k * K_FACTOR[result];
  return clamp(round2(k + K_SMOOTHING * (target - k)), K_MIN, K_MAX);
}

/** After a damp or soggy answer we peek again soon rather than waiting a full interval. */
const RECHECK_DAYS: Record<Exclude<CheckResult, 'dry'>, number> = { damp: 2, soggy: 4 };

export interface CheckOutcome {
  k: number;
  nextCheckAt: string;
  watered: boolean;
  /** Short, kind guidance shown right after the answer. */
  message: string;
  flags: Array<'possible_overwatering' | 'garden_soil' | 'old_mix'>;
}

/** Days until the next check after a "damp"/"soggy" answer (or "Plenty" for LECA/water), given the full interval. */
export function recheckDays(soil: Soil, result: Exclude<CheckResult, 'dry'>, full: number): number {
  if (isReservoir(soil)) return Math.min(full, Math.max(RECHECK_DAYS.damp, Math.round(full / 2)));
  return result === 'damp' ? Math.min(RECHECK_DAYS.damp, full) : RECHECK_DAYS.soggy;
}

export function applyCheck(
  input: Omit<IntervalInput, 'plant'> & { plant: IntervalInput['plant'] & Pick<Plant, 'soil'> },
  result: CheckResult,
): CheckOutcome {
  const k = updateK(input.plant.k, result);
  const updated = { ...input.plant, k };
  const flags: CheckOutcome['flags'] = [];
  // Garden soil is only a problem in pots; it's what garden beds are made of.
  if (input.plant.soil === 'garden_soil' && input.plant.placement !== 'ground') flags.push('garden_soil');
  if (isMixOld(input.plant, input.at)) flags.push('old_mix');

  let days: number;
  let message: string;
  if (isReservoir(input.plant.soil)) {
    // Two answers only: "Low" (topped up) or "Plenty" (skip). Nothing to rot, so no soggy flag.
    const full = checkIntervalDays({ ...input, plant: updated });
    if (result === 'dry') {
      days = full;
      message = `Topped up. Next check in ~${calendarDays(input.at, addDays(input.at, days))} days`;
    } else {
      days = recheckDays(input.plant.soil, 'damp', full);
      message = 'Plenty left, skipping. +1 smart skip';
    }
    return { k, nextCheckAt: addDays(input.at, days).toISOString(), watered: result === 'dry', message, flags };
  }
  if (result === 'dry') {
    days = checkIntervalDays({ ...input, plant: updated });
    message = `Watered. Next check in ~${calendarDays(input.at, addDays(input.at, days))} days`;
  } else if (result === 'damp') {
    days = recheckDays(input.plant.soil, 'damp', checkIntervalDays({ ...input, plant: updated }));
    message = 'Good call, skipping. +1 smart skip';
  } else {
    days = recheckDays(input.plant.soil, 'soggy', 0);
    flags.push('possible_overwatering');
    message = 'Too wet. Letting it dry; watch for gnats';
  }
  return { k, nextCheckAt: addDays(input.at, days).toISOString(), watered: result === 'dry', message, flags };
}

/**
 * When a hydro or semi-hydro plant next needs fresh water and nutrients, counted from the last
 * refresh, repot or (failing both) when it joined the fam. Undefined for soil plants.
 */
export function refreshDueAt(plant: Pick<Plant, 'soil' | 'lastRefreshedAt' | 'lastRepottedAt' | 'createdAt'>): Date | undefined {
  if (!isReservoir(plant.soil)) return undefined;
  const from = [plant.lastRefreshedAt, plant.lastRepottedAt, plant.createdAt].filter(Boolean).sort().pop()!;
  return addDays(new Date(from), REFRESH_DAYS[plant.soil]);
}

export function isRefreshDue(plant: Parameters<typeof refreshDueAt>[0], now: Date): boolean {
  const due = refreshDueAt(plant);
  return !!due && due.getTime() <= now.getTime();
}

/** Start-of-life schedule: first check after one full interval, with k = 1. */
export function initialNextCheck(input: IntervalInput): string {
  return addDays(input.at, checkIntervalDays(input)).toISOString();
}

export function isDue(plant: Pick<Plant, 'nextCheckAt'>, now: Date): boolean {
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);
  return new Date(plant.nextCheckAt).getTime() <= endOfToday.getTime();
}

/** Mood is an honest read of state, never a guilt trip. */
export function moodFor(plant: Pick<Plant, 'nextCheckAt' | 'lastResult' | 'lastCheckAt'> & Partial<Pick<Plant, 'rooting'>>, now: Date, away = false): 'happy' | 'thirsty' | 'snoozing' {
  // Rooting cuttings have no soil checks, so they're never "due".
  if (plant.rooting) return 'happy';
  // Away mode: everyone's having a nap until you're back.
  if (away) return isDue(plant, now) ? 'snoozing' : 'happy';
  if (isDue(plant, now)) return 'thirsty';
  if (plant.lastResult && plant.lastResult !== 'dry' && plant.lastCheckAt) {
    const since = (now.getTime() - new Date(plant.lastCheckAt).getTime()) / DAY_MS;
    if (since < 3) return 'snoozing';
  }
  return 'happy';
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n));
}
function round1(n: number) {
  return Math.round(n * 10) / 10;
}
function round2(n: number) {
  return Math.round(n * 100) / 100;
}
