import { edibleGuide } from '../data/edibles';
import type { Plant } from '../types';

/*
 * Fresh potting mix with fertiliser in it feeds the plant for a while, so feed reminders wait. Not as
 * long as the bag says: in a pot, watering rinses it out sooner, and fruiting crops (tomatoes, peppers…)
 * want more potash than those mixes carry once fruit sets. So about 8 weeks for them, about 3 months for
 * everything else, or the bag's own figure when that's shorter.
 */

const DAY = 86_400_000;
const FRUITING_WEEKS = 8;
const OTHER_WEEKS = 13;

/** When the mix stops counting as food; undefined when there's nothing to wait for. */
export function mixFeedsUntil(plant: Pick<Plant, 'mix' | 'speciesId'>): Date | undefined {
  const mix = plant.mix;
  if (!mix || mix.fertiliser !== 'yes') return undefined;
  const cap = edibleGuide(plant.speciesId)?.fruitingFeed ? FRUITING_WEEKS : OTHER_WEEKS;
  const weeks = mix.bagMonths ? Math.min(cap, Math.round((mix.bagMonths * 30.4) / 7)) : cap;
  return new Date(new Date(mix.pottedAt).getTime() + weeks * 7 * DAY);
}

/** The mix is still feeding it, so feeding waits. */
export function mixStillFeeds(plant: Pick<Plant, 'mix' | 'speciesId'>, now: Date): boolean {
  const until = mixFeedsUntil(plant);
  return !!until && until.getTime() > now.getTime();
}

export const shortDay = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** The Feed row while the mix still feeds it: "Not yet: the fresh mix feeds it till about Dec 10". */
export function mixWaitText(plant: Pick<Plant, 'mix' | 'speciesId'>, now: Date): string | undefined {
  const until = mixFeedsUntil(plant);
  if (!until || until.getTime() <= now.getTime()) return undefined;
  return `Not yet: the fresh mix feeds it till about ${shortDay(until)}`;
}

/** Under the Soil row: "Miracle-Gro Potting Mix · has fertiliser". */
export function mixLine(plant: Pick<Plant, 'mix'>): string | undefined {
  const mix = plant.mix;
  if (!mix) return undefined;
  const fert = mix.fertiliser === 'yes' ? 'has fertiliser' : mix.fertiliser === 'no' ? 'no fertiliser' : undefined;
  const line = [mix.name?.trim(), fert].filter(Boolean).join(' · ');
  return line || undefined;
}
