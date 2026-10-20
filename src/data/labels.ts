import type { Light, Soil, SpeciesGroup } from '../types';

export const SOIL_LABEL: Record<Soil, string> = {
  potting_mix: 'Potting mix',
  chunky_aroid: 'Chunky aroid mix',
  gritty: 'Gritty mix',
  perlite_mix: 'Mix + perlite',
  bagged_cactus: 'Cactus mix',
  veg_mix: 'Veg container mix',
  coir: 'Coco coir',
  moisture_control: 'Moisture-control mix',
  moss: 'Sphagnum moss',
  garden_soil: 'Garden soil (not ideal in pots)',
  leca: 'LECA · semi-hydro',
  water: 'Water · hydroponic',
  unsure: 'Not sure yet',
};

export const LIGHT_LABEL: Record<Light, string> = {
  low: 'Shady spot',
  medium: 'Some light',
  bright: 'Bright, no harsh sun',
  direct: 'Direct sun',
};

/** How a care group likes its water, in a few words (species pages and photo ID). */
export const WATER_STYLE: Record<SpeciesGroup, { short: string; long: string }> = {
  tropical: { short: 'Top dries', long: 'water when the top dries' },
  moisture: { short: 'Damp', long: 'keep lightly damp' },
  succulent: { short: 'Dry out', long: 'let it dry right out' },
  edible: { short: 'Thirsty', long: 'more in warm weather' },
};

/** A species' light needs as two short lines (species pages). */
export const LIGHT_FACT: Record<Light, { short: string; long: string }> = {
  low: { short: 'Low light', long: 'shade is fine' },
  medium: { short: 'Medium', long: 'no direct sun' },
  bright: { short: 'Bright', long: 'near a window' },
  direct: { short: 'Sunny', long: 'full sun' },
};
