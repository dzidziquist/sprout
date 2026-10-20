import type { ArtId, Plant, Species, SpeciesGroup, SpeciesId } from '../types';
import { HOUSEPLANTS } from './catalog/houseplants';
import { EDIBLE_PLANTS } from './catalog/edibles';

/*
 * The catalogue: every plant PlantFam knows by name. Anything else can still be added as an
 * "Other plant" with a care type ('other-<group>'): the care engine runs on the group plus the
 * user's soil checks, so unlisted plants get the same rhythm, reminders, diary and family tree.
 */

/** Generic entries for plants not in the catalogue. The user's own name lives on `plant.custom`. */
export const OTHER: Record<SpeciesGroup, Species> = {
  tropical: { id: 'other-tropical', commonName: 'Leafy tropical', latinName: '', group: 'tropical', defaultSoil: 'potting_mix', defaultLight: 'medium', petToxic: false, edible: false, artPot: 'blue', art: 'pothos', category: 'houseplant', tip: 'Most leafy houseplants like the top few cm to dry before a drink.' },
  succulent: { id: 'other-succulent', commonName: 'Succulent or cactus', latinName: '', group: 'succulent', defaultSoil: 'gritty', defaultLight: 'bright', petToxic: false, edible: false, artPot: 'coral', art: 'aloe', category: 'succulent', tip: 'Let it dry right out between drinks, and give it all the light you can.' },
  moisture: { id: 'other-moisture', commonName: 'Moisture lover', latinName: '', group: 'moisture', defaultSoil: 'potting_mix', defaultLight: 'medium', petToxic: false, edible: false, artPot: 'grape', art: 'calathea', category: 'houseplant', tip: 'Likes to stay lightly damp, never soggy. Ferns, calatheas and friends.' },
  edible: { id: 'other-edible', commonName: 'Something tasty', latinName: '', group: 'edible', defaultSoil: 'veg_mix', defaultLight: 'direct', petToxic: false, edible: true, artPot: 'yellow', art: 'basil', category: 'vegetable', tip: 'Edibles drink more as they grow: check often in warm weather.' },
};

const LIST: Species[] = [...HOUSEPLANTS, ...EDIBLE_PLANTS];

export const SPECIES: Record<SpeciesId, Species> = Object.fromEntries([...LIST, ...Object.values(OTHER)].map((s) => [s.id, s]));
/** Catalogue species for the picker (popular first, then A–Z). Excludes the generic "other" entries. */
export const SPECIES_LIST: Species[] = [...LIST].sort((a, b) => Number(!!b.popular) - Number(!!a.popular) || a.commonName.localeCompare(b.commonName));

export const isOtherId = (id: SpeciesId) => id.startsWith('other-');
/** Whether a value (a route param, say) names a species we know, catalogue or "other". */
export const isSpeciesId = (v: unknown): v is SpeciesId => typeof v === 'string' && v in SPECIES;

/** Catalogue entry for an id; unknown ids fall back to the generic tropical so nothing ever crashes. */
export function getSpecies(id: SpeciesId): Species {
  return SPECIES[id] ?? OTHER.tropical;
}

/** The species as this plant should show it: catalogue data, with the user's own names for "other" plants. */
export function speciesOf(plant: Pick<Plant, 'speciesId' | 'custom'>): Species {
  const base = getSpecies(plant.speciesId);
  if (!plant.custom) return base;
  return {
    ...base,
    commonName: plant.custom.commonName || base.commonName,
    latinName: plant.custom.latinName ?? base.latinName,
    petToxic: plant.custom.petToxic ?? base.petToxic,
  };
}

/** Pet safety we actually know: undefined for "other" plants the user hasn't told us about. */
export function petToxicKnown(plant: Pick<Plant, 'speciesId' | 'custom'>): boolean | undefined {
  if (isOtherId(plant.speciesId)) return plant.custom?.petToxic;
  return getSpecies(plant.speciesId).petToxic;
}

export function artFor(id: SpeciesId | 'cutting'): ArtId | 'cutting' {
  if (id === 'cutting') return 'cutting';
  return getSpecies(id).art;
}

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Search by common name, alias or Latin name. Prefix matches rank above substring matches. */
export function searchSpecies(query: string, list: Species[] = SPECIES_LIST): Species[] {
  const q = norm(query);
  if (!q) return list;
  const scored: Array<[number, Species]> = [];
  for (const s of list) {
    const names = [s.commonName, ...(s.aliases ?? []), s.latinName].map(norm);
    let best = 0;
    for (const n of names) {
      if (n === q) best = Math.max(best, 3);
      else if (n.startsWith(q) || n.split(' ').some((w) => w.startsWith(q))) best = Math.max(best, 2);
      else if (n.includes(q)) best = Math.max(best, 1);
    }
    if (best) scored.push([best, s]);
  }
  return scored.sort((a, b) => b[0] - a[0] || Number(!!b[1].popular) - Number(!!a[1].popular)).map(([, s]) => s);
}
