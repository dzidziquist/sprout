import type { Light, Placement } from '../types';

/** Where someone grows, asked once in onboarding. It picks sensible defaults for each new plant. */
export type Spot = 'indoors' | 'window' | 'balcony' | 'garden' | 'growlights';

export const SPOTS: { id: Spot; label: string; sub: string }[] = [
  { id: 'indoors', label: 'Indoors', sub: 'Shelves, tables, corners' },
  { id: 'window', label: 'Sunny windowsill', sub: 'Right by a bright window' },
  { id: 'balcony', label: 'Balcony or patio', sub: 'Pots outside, often sheltered' },
  { id: 'garden', label: 'Garden bed', sub: 'Planted in the ground' },
  { id: 'growlights', label: 'Grow lights', sub: 'Shelves or a hydro garden' },
];

/** What each spot means for a new plant: its placement, and light when the spot says it. */
const SPOT_CARE: Record<Spot, { placement: Placement; light?: Light }> = {
  indoors: { placement: 'indoor' },
  window: { placement: 'indoor', light: 'bright' },
  balcony: { placement: 'covered_outdoor' },
  garden: { placement: 'ground', light: 'direct' },
  growlights: { placement: 'growlight', light: 'bright' },
};

/** Edibles want the sunniest real growing spot first; houseplants the indoor ones. */
const ORDER: Record<'edible' | 'houseplant', Spot[]> = {
  edible: ['garden', 'balcony', 'window', 'growlights', 'indoors'],
  houseplant: ['window', 'indoors', 'growlights', 'balcony', 'garden'],
};

/** The most likely spot for a new plant, given where this person grows. Undefined: keep the species default. */
export function defaultSpot(spots: Spot[] | undefined, edible: boolean): { placement: Placement; light?: Light } | undefined {
  if (!spots?.length) return undefined;
  const first = ORDER[edible ? 'edible' : 'houseplant'].find((s) => spots.includes(s));
  return first ? SPOT_CARE[first] : undefined;
}
