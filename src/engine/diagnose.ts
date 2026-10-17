import { CAUSES, SHADE_LOVERS, SPECIES_NOTES, SYMPTOMS, TAP_SENSITIVE, type Cause, type Signal, type Symptom } from '../data/diagnosis';
import { speciesOf } from '../data/species';
import { isReservoir, seasonMultiplier } from './careEngine';
import type { CareEvent, ClimateProfile, Plant } from '../types';

/*
 * The plant doctor. Turns "what I can see" plus what the app knows about the plant into a short,
 * ranked list of possible causes, each with the reasons that apply to this plant. No network, no AI:
 * the knowledge lives in src/data/diagnosis.ts.
 */

const DAY = 86400000;

export type Likelihood = 'Likely' | 'Possible' | 'Less likely';

export interface Diagnosis {
  cause: Cause;
  /** Share of the total score across the causes shown, 0..1. */
  share: number;
  likelihood: Likelihood;
  /** Why this plant's story points this way (only the reasons that apply). */
  why: string[];
}

export interface DiagnoseInput {
  plant: Plant;
  /** This plant's diary, any order. */
  events: CareEvent[];
  climate: ClimateProfile;
  now: Date;
}

const months = (fromIso: string | undefined, to: Date) => (fromIso ? (to.getTime() - new Date(fromIso).getTime()) / (30.44 * DAY) : 0);

/** Facts about this plant that make some causes more or less likely. */
export function signalsFor({ plant, events, climate, now }: DiagnoseInput): Set<Signal> {
  const s = new Set<Signal>();
  const sp = speciesOf(plant);
  const mine = events.filter((e) => e.plantId === plant.id).sort((a, b) => b.at.localeCompare(a.at));
  const checks = mine.filter((e) => e.type === 'check').slice(0, 3);
  const wet = checks.filter((e) => e.result === 'damp' || e.result === 'soggy').length;
  if (checks.length >= 2 && wet >= 2) s.add('wetChecks');
  if (mine.some((e) => e.type === 'check' && e.result === 'soggy' && now.getTime() - new Date(e.at).getTime() < 14 * DAY)) s.add('soggy');
  if (checks.length >= 2 && checks.filter((e) => e.result === 'dry').length >= 2) s.add('dryChecks');
  // Late: a check is overdue by more than three days right now.
  if (now.getTime() - new Date(plant.nextCheckAt).getTime() > 3 * DAY) s.add('overdue');

  if (plant.light === 'low') s.add('lowLight');
  if (plant.light === 'direct') s.add('directSun');
  if (SHADE_LOVERS.has(plant.speciesId) || sp.art === 'calathea' || sp.art === 'peace-lily') s.add('shadeLover');
  if (TAP_SENSITIVE.has(plant.speciesId)) s.add('tapSensitive');
  if (sp.group === 'succulent') s.add('succulent');
  if (sp.group === 'moisture') s.add('moistureLover');
  if (sp.edible) s.add('edible');
  if (plant.stage === 'fruiting' || plant.stage === 'harvesting' || plant.stage === 'flowering') s.add('fruiting');
  if (plant.placement === 'indoor' || plant.placement === 'growlight') s.add('indoor');
  else s.add('outdoor');

  if (isReservoir(plant.soil)) s.add('reservoir');
  else if (plant.placement !== 'ground') {
    if (plant.potMaterial === 'plastic' || plant.potMaterial === 'glazed') s.add('plasticPot');
    if (plant.potMaterial === 'terracotta') s.add('terracotta');
    if (plant.potDiameterCm <= 12) s.add('smallPot');
    if (months(plant.lastRepottedAt ?? plant.acquiredAt, now) >= 12) s.add('oldMix');
  }
  if (plant.lastRepottedAt && now.getTime() - new Date(plant.lastRepottedAt).getTime() < 21 * DAY) s.add('recentRepot');
  if (now.getTime() - new Date(plant.acquiredAt ?? plant.createdAt).getTime() < 30 * DAY) s.add('newPlant');

  const season = seasonMultiplier(climate, plant.placement, now);
  if (season >= 1.25) s.add('slowSeason');
  if (season <= 0.85) s.add('hotSeason');

  const fed = mine.find((e) => e.type === 'feed');
  if (!fed || now.getTime() - new Date(fed.at).getTime() > 60 * DAY) s.add('unfed');
  if (mine.some((e) => e.type === 'pest' && now.getTime() - new Date(e.at).getTime() < 30 * DAY)) s.add('pestLogged');
  return s;
}

/**
 * Symptoms that make sense for this plant: fruit and bolting only for edibles, and for LECA or water
 * plants no soil-only symptoms, with water wording where it differs.
 */
export function symptomsFor(plant: Pick<Plant, 'speciesId' | 'custom' | 'soil'>): Symptom[] {
  const edible = speciesOf(plant).edible;
  const water = isReservoir(plant.soil);
  return SYMPTOMS.filter((x) => (edible || !x.edibleOnly) && !(water && x.soilOnly)).map((x) =>
    water && (x.waterLabel || x.waterHint) ? { ...x, label: x.waterLabel ?? x.label, hint: x.waterHint ?? x.hint } : x,
  );
}

export function symptomById(id: string): Symptom | undefined {
  return SYMPTOMS.find((x) => x.id === id);
}

/** A plant-specific note for this symptom, if we have one. */
export function speciesNote(plant: Pick<Plant, 'speciesId'>, symptomId: string): string | undefined {
  return SPECIES_NOTES[plant.speciesId]?.[symptomId];
}

/** Rank the possible causes of one symptom for this plant. Returns at most `limit` causes. */
export function diagnose(symptomId: string, input: DiagnoseInput, limit = 3): Diagnosis[] {
  const symptom = symptomById(symptomId);
  if (!symptom) return [];
  const signals = signalsFor(input);
  const water = signals.has('reservoir');
  const scored = symptom.causes
    .filter(({ cause: id }) => (water ? !CAUSES[id].soilOnly : !CAUSES[id].waterOnly))
    .map(({ cause: id, prior }) => {
      const cause = CAUSES[id];
      let score = prior;
      const why: string[] = [];
      for (const r of cause.signals ?? []) {
        if (!signals.has(r.signal)) continue;
        score *= r.weight;
        if (r.weight > 1 && r.why) why.push(r.why);
      }
      return { cause, score, why };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  const total = scored.reduce((n, x) => n + x.score, 0) || 1;
  return scored.map((x, i) => {
    const share = x.score / total;
    const likelihood: Likelihood = i === 0 && share >= 0.4 ? 'Likely' : share >= 0.2 ? 'Possible' : 'Less likely';
    return { cause: x.cause, share, likelihood, why: x.why };
  });
}
