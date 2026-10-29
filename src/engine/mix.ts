import { edibleGuide } from '../data/edibles';
import type { Plant } from '../types';

/*
 * Fresh potting mix with fertiliser in it feeds the plant for a while, so feed reminders wait. How long
 * depends on the kind of food (data/mixes):
 *   organic  worm castings, guano, fish meal and the like: strong at first, spent in about 4 weeks
 *   slow     slow-release granules: not as long as the bag says, since a pot is rinsed at every watering
 *            and fruiting crops want more potash than those mixes carry once fruit sets. About 8 weeks for
 *            them, about 3 months for the rest, or the bag's own figure when that's shorter.
 *   not sure 4 weeks: a reminder a little early does less harm than starving a hungry crop.
 */

const DAY = 86_400_000;
const FRUITING_WEEKS = 8;
const OTHER_WEEKS = 13;
const SHORT_WEEKS = 4;

/** How many weeks a mix feeds the plant. */
export function mixWeeks(speciesId: Plant['speciesId'], mix: Pick<NonNullable<Plant['mix']>, 'kind' | 'bagMonths'>): number {
  const cap = edibleGuide(speciesId)?.fruitingFeed ? FRUITING_WEEKS : OTHER_WEEKS;
  const bag = mix.bagMonths ? Math.round((mix.bagMonths * 30.4) / 7) : undefined;
  if (mix.kind === 'organic') return SHORT_WEEKS;
  if (mix.kind === 'slow') return bag ? Math.min(cap, bag) : cap;
  // Not sure (and mixes noted before the kind was asked): the bag's figure when given, else the short wait.
  return bag ? Math.min(cap, bag) : SHORT_WEEKS;
}

/** When the mix stops counting as food; undefined when there's nothing to wait for. */
export function mixFeedsUntil(plant: Pick<Plant, 'mix' | 'speciesId'>): Date | undefined {
  const mix = plant.mix;
  if (!mix || mix.fertiliser !== 'yes') return undefined;
  return new Date(new Date(mix.pottedAt).getTime() + mixWeeks(plant.speciesId, mix) * 7 * DAY);
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
  const fert = mix.fertiliser === 'yes' ? (mix.kind === 'organic' ? 'rich organic food' : mix.kind === 'slow' ? 'slow-release food' : 'has fertiliser') : mix.fertiliser === 'no' ? 'no fertiliser' : undefined;
  const line = [mix.name?.trim(), fert].filter(Boolean).join(' · ');
  return line || undefined;
}
