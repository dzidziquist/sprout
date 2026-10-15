import type { Plant } from '@/types';

export type RootingMethod = NonNullable<Plant['rooting']>['method'];

/**
 * Rooting media for cuttings, in the order the cuttings sheet offers them.
 * One place for the words so the sheet, the plant page and pot-up never disagree.
 */
export const ROOTING_METHODS: { id: RootingMethod; label: string; tip: string; care: string }[] = [
  { id: 'water', label: 'Water', tip: 'Easiest: you can watch the roots grow.', care: 'Top up the water; change it weekly' },
  { id: 'moss', label: 'Sphagnum moss', tip: 'Sturdy roots that settle into soil fast.', care: 'Keep the moss damp, never dripping' },
  { id: 'soil', label: 'Soil', tip: 'No transplant shock later. Keep it lightly moist.', care: 'Keep the mix lightly moist, not soggy' },
  { id: 'leca', label: 'LECA', tip: 'Clay balls over a little water. Clean and airy.', care: 'Keep water at the bottom third of the balls' },
];

export const METHOD_LABEL: Record<RootingMethod, string> = { water: 'Water', moss: 'Sphagnum moss', soil: 'Soil', leca: 'LECA' };
/** "in water", "in moss"... for chips and sentences. */
export const METHOD_WORD: Record<RootingMethod, string> = { water: 'in water', moss: 'in moss', soil: 'in soil', leca: 'in LECA' };
export const METHOD_CARE: Record<RootingMethod, string> = Object.fromEntries(ROOTING_METHODS.map((m) => [m.id, m.care])) as Record<RootingMethod, string>;

export const CUTTING_ICON =
  'M6 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 21.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 7.5v9M6 12h4a4 4 0 0 0 4-4V8M15.5 12H10';

/** The first free number for "<prefix> N" names, after any plant already called that (and after the parent's existing babies). */
export function firstBabyNumber(prefix: string, plants: Pick<Plant, 'name'>[], babies = 0): number {
  const p = prefix.trim().toLowerCase();
  let max = babies;
  for (const pl of plants) {
    const n = pl.name.trim().toLowerCase();
    if (n.startsWith(p + ' ')) {
      const num = Number(n.slice(p.length + 1));
      if (Number.isInteger(num) && num > max) max = num;
    }
  }
  return max + 1;
}
