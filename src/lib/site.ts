import type { Site } from '../engine/light';
import type { ClimateModel, ClimateProfile } from '../types';
import { coordsFor } from './weather';

/*
 * Each month's clearness (sunlight measured at the ground against the top of the atmosphere, January first)
 * for the two preset cities: Open-Meteo's ERA5 history, 2021–2025, worked out by clearnessFrom. A city
 * picked in Settings carries its own, from the same history lookup that learns its seasons.
 */
export const MODEL_CLEARNESS: Record<ClimateModel, readonly number[]> = {
  seattle: [0.367, 0.374, 0.45, 0.496, 0.489, 0.527, 0.6, 0.561, 0.52, 0.454, 0.371, 0.318],
  accra: [0.536, 0.549, 0.531, 0.545, 0.546, 0.488, 0.51, 0.489, 0.524, 0.555, 0.576, 0.562],
};

/** Where the home is, for the light estimates. A city picked before clearness was saved borrows its model city's, lined up by month. */
export function siteOf(climate: ClimateProfile): Site {
  const { lat } = coordsFor(climate);
  if (typeof climate === 'string') return { lat, clearness: MODEL_CLEARNESS[climate] };
  if (climate.clearness?.length === 12) return { lat, clearness: climate.clearness };
  const model = MODEL_CLEARNESS[climate.model];
  return { lat, clearness: model.map((_, m) => model[(((m + climate.shift) % 12) + 12) % 12]) };
}
