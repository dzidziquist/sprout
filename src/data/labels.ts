import type { Light, Soil } from '../types';

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
  unsure: 'Not sure yet',
};

export const LIGHT_LABEL: Record<Light, string> = {
  low: 'Shady spot',
  medium: 'Some light',
  bright: 'Bright, no harsh sun',
  direct: 'Direct sun',
};
