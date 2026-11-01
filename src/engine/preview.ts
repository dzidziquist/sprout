import type { Plant } from '@/types';

/* What the press-and-hold plant card says (components/PlantPreview). */

const dayGap = (from: Date, to: Date) => Math.round((new Date(to.toDateString()).getTime() - new Date(from.toDateString()).getTime()) / 86400000);

const GONE: Record<NonNullable<Plant['archivedReason']>, string> = { gifted: 'Gifted away', died: 'In memory', composted: 'Composted' };

/**
 * The two chips under the name. Only plants on the care rhythm have a next check: cuttings still
 * rooting show how long they've been at it, and archived plants show where they went.
 */
export function previewChips(
  plant: Pick<Plant, 'nextCheckAt' | 'rooting' | 'archivedAt' | 'archivedReason'>,
  lastWaterAt: string | undefined,
  now: Date,
): { num: string; label: string; tone: 'mint' | 'butter' | 'cloud' }[] {
  if (plant.archivedAt) {
    const on = new Date(plant.archivedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
    return [{ num: GONE[plant.archivedReason ?? 'gifted'], label: `since ${on}`, tone: 'cloud' }];
  }
  if (plant.rooting) {
    const day = dayGap(new Date(plant.rooting.startedAt), now) + 1;
    return [{ num: `Day ${day}`, label: `rooting in ${plant.rooting.method === 'leca' ? 'LECA' : plant.rooting.method}`, tone: 'mint' }];
  }
  const { next, watered } = previewLines(plant, lastWaterAt, now);
  return [
    { num: next, label: 'next check', tone: 'mint' },
    ...(watered ? [{ num: watered, label: 'last watered', tone: 'butter' as const }] : []),
  ];
}

/** "Today", "Tomorrow", "In 3 days" for the next check; "Today", "Yesterday", "6 days ago" for the last watering. */
export function previewLines(plant: Pick<Plant, 'nextCheckAt'>, lastWaterAt: string | undefined, now: Date) {
  const next = dayGap(now, new Date(plant.nextCheckAt));
  const nextText = next <= 0 ? 'Today' : next === 1 ? 'Tomorrow' : `In ${next} days`;
  let watered: string | undefined;
  if (lastWaterAt) {
    const ago = dayGap(new Date(lastWaterAt), now);
    watered = ago <= 0 ? 'Today' : ago === 1 ? 'Yesterday' : `${ago} days ago`;
  }
  return { next: nextText, watered };
}
