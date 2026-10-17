import { checkIntervalDays, isReservoir } from './careEngine';
import { speciesOf } from '../data/species';
import type { ClimateProfile, Plant } from '../types';

/*
 * Away mode: a trip is a span of days when nobody's home. Reminders pause, nothing counts as overdue,
 * and the streak doesn't hold it against you. Pure functions, so they're easy to test.
 */

export interface Trip {
  /** Start of the leaving day (local midnight). */
  from: string;
  /** Start of the day you're back (local midnight). */
  to: string;
  /** Ids of the before-you-go items already ticked off. */
  done?: string[];
}

export interface PrepItem {
  /** Stable per kind of task, so a tick survives the list being rebuilt. */
  id: string;
  text: string;
}

const DAY = 86400000;
/** After a trip, two days to get round everyone before anything counts against the streak. */
export const BACK_GRACE_DAYS = 2;

export const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

export function tripDays(t: Trip): number {
  return Math.round((new Date(t.to).getTime() - new Date(t.from).getTime()) / DAY);
}

/** The trip happening right now, if any. */
export function activeTrip(trips: Trip[] | undefined, now: Date): Trip | undefined {
  const t = now.getTime();
  return trips?.find((x) => new Date(x.from).getTime() <= t && t < new Date(x.to).getTime());
}

/** The next trip that hasn't started yet. */
export function upcomingTrip(trips: Trip[] | undefined, now: Date): Trip | undefined {
  return trips?.filter((x) => new Date(x.from).getTime() > now.getTime()).sort((a, b) => a.from.localeCompare(b.from))[0];
}

/** Time ranges the streak ignores: each trip plus the catch-up days after it. */
export function awayRanges(trips: Trip[] | undefined): Array<[number, number]> {
  return (trips ?? []).map((x) => [new Date(x.from).getTime(), new Date(x.to).getTime() + BACK_GRACE_DAYS * DAY]);
}

/** Cut `ranges` out of each [from, to) span. */
export function subtractRanges(spans: Array<[number, number]>, ranges: Array<[number, number]>): Array<[number, number]> {
  let out = spans;
  for (const [a, b] of ranges) {
    out = out.flatMap(([s, e]): Array<[number, number]> => {
      if (b <= s || a >= e) return [[s, e]];
      const parts: Array<[number, number]> = [];
      if (a > s) parts.push([s, a]);
      if (b < e) parts.push([b, e]);
      return parts;
    });
  }
  return out;
}

const living = (plants: Plant[]) => plants.filter((p) => !p.archivedAt);

/** Before you go: a short list that fits these plants and this trip. */
export function prepList(plants: Plant[], trip: Trip): PrepItem[] {
  const mine = living(plants);
  const days = tripDays(trip);
  const potted = mine.filter((p) => !p.rooting && !isReservoir(p.soil));
  const selfWater = potted.filter((p) => p.selfWatering && p.placement !== 'ground');
  const topWater = potted.filter((p) => !selfWater.includes(p));
  const reservoir = mine.filter((p) => !p.rooting && isReservoir(p.soil));
  const thirsty = topWater.filter((p) => speciesOf(p).group === 'moisture' || speciesOf(p).group === 'edible');
  const dry = topWater.filter((p) => speciesOf(p).group === 'succulent');
  const outside = potted.filter((p) => p.placement === 'outdoor' || p.placement === 'covered_outdoor' || p.placement === 'ground');
  const jars = mine.filter((p) => p.rooting);
  const names = (ps: Plant[]) => (ps.length <= 3 ? ps.map((p) => p.name).join(', ') : `${ps.slice(0, 3).map((p) => p.name).join(', ')} and ${ps.length - 3} more`);
  const out: PrepItem[] = [];
  const add = (id: string, text: string) => out.push({ id, text });
  if (topWater.length) add('water', `The day before you go, water ${selfWater.length ? 'the other pots' : 'everyone'} deeply until it runs out of the bottom, then let them drain.`);
  if (selfWater.length) add('self-water', `Fill the self-watering reservoirs to the max line: ${names(selfWater)}.`);
  if (reservoir.length) add('reservoir', `Fill the reservoirs to the top line: ${names(reservoir)}.`);
  if (jars.length) add('jars', `Top up the cutting jars with fresh water: ${names(jars)}.`);
  if (days >= 7 && thirsty.length) add('huddle', `Huddle the thirsty ones (${names(thirsty)}) together, out of direct sun, on a tray of wet pebbles.`);
  if (outside.length) add('shade', `Pull outdoor pots (${names(outside)}) into afternoon shade, and mulch the top of the soil if you can.`);
  if (dry.length) add('dry', `${names(dry)} will be fine. Skip any extra water for them.`);
  if (days >= 14) add('sitter', 'Two weeks or more: think about a plant sitter. Share the note below with them.');
  return out;
}

/** What a plant sitter needs to know, in plain words, ready to send. */
export function sitterNote(plants: Plant[], climate: ClimateProfile, trip: Trip, now: Date): string {
  const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const lines = living(plants)
    .sort((a, b) => (a.room ?? '').localeCompare(b.room ?? '') || a.name.localeCompare(b.name))
    .map((p) => {
      const sp = speciesOf(p);
      const where = [sp.commonName, p.room].filter(Boolean).join(', ');
      if (p.rooting) return `• ${p.name} (${where}): a cutting in ${p.rooting.method}. Keep it topped up; swap the water once a week.`;
      if (isReservoir(p.soil)) return `• ${p.name} (${where}): top up when the water line gets low. Don't fill above the line.`;
      if (p.selfWatering && p.placement !== 'ground') return `• ${p.name} (${where}): self-watering pot. Keep the reservoir topped up; no need to water from the top.`;
      const days = Math.round(checkIntervalDays({ group: sp.group, plant: p, profile: climate, at: now }));
      const when = sp.group === 'succulent' ? 'only when the soil is dry all the way down' : sp.group === 'moisture' ? 'when the surface just starts to dry' : 'when the top 2–3 cm (an inch) feels dry';
      return `• ${p.name} (${where}): water ${when}. Usually about every ${days} days. Feel the soil first; skip it if it's still damp.`;
    });
  return [`Plant care while I'm away, ${fmt(trip.from)} to ${fmt(trip.to)}`, '', ...lines, '', 'Thank you! 🌱'].join('\n');
}
