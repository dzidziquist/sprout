import type { Plant } from '../types';
import { isReservoir } from './careEngine';

export interface RoundDigest {
  title: string;
  body: string;
  plantIds: string[];
  /** Where tapping the notification goes (defaults to Today). */
  route?: string;
}

/** How often "photo day" comes round: every Sunday, the first Sunday of the month, or never. */
export type PhotoCadence = 'off' | 'weekly' | 'monthly';

const PHOTO_EVERY_DAYS: Record<Exclude<PhotoCadence, 'off'>, number> = { weekly: 7, monthly: 28 };
const DAY_MS = 86400000;

export function isPhotoDay(cadence: PhotoCadence, day: Date): boolean {
  if (cadence === 'off' || day.getDay() !== 0) return false;
  return cadence === 'weekly' || day.getDate() <= 7;
}

/**
 * Plants that would make a nice progress photo on `day`: in the fam for a few days, and without a
 * diary photo for a while. Never-photographed plants first, then the longest gap.
 */
export function photoCandidates(plants: Plant[], lastPhotoAt: Record<string, string>, cadence: PhotoCadence, day: Date): Plant[] {
  if (cadence === 'off') return [];
  const gap = PHOTO_EVERY_DAYS[cadence] * DAY_MS;
  const end = at(day, 23, 59).getTime();
  return plants
    .filter((p) => !p.archivedAt && end - new Date(p.createdAt).getTime() >= 3 * DAY_MS)
    .filter((p) => !lastPhotoAt[p.id] || end - new Date(lastPhotoAt[p.id]).getTime() >= gap)
    .sort((a, b) => (lastPhotoAt[a.id] ?? '').localeCompare(lastPhotoAt[b.id] ?? ''));
}

/** Fold a photo-day nudge into the day's round, or make it the day's only notification. */
function withPhotoDay(digest: RoundDigest | null, subjects: Plant[]): RoundDigest | null {
  if (subjects.length === 0) return digest;
  const n = names(subjects.map((p) => p.name));
  if (digest) return { ...digest, body: `${digest.body} Photo day too: snap ${n} for the diary.` };
  return {
    title: 'Photo day 📸',
    body: `${n} would love a progress photo. Future you will want to see how far they've come.`,
    plantIds: [],
    route: subjects.length === 1 ? `/plant/${subjects[0].id}` : '/jungle',
  };
}

function at(day: Date, hour: number, minute: number) {
  const d = new Date(day);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function names(list: string[]): string {
  if (list.length === 1) return list[0];
  if (list.length === 2) return `${list[0]} and ${list[1]}`;
  return `${list.slice(0, 2).join(', ')} and ${list.length - 2} more`;
}

/**
 * The one daily notification: which plants will want a soil check by the end of `day`.
 * Returns null when nothing is due, so the round stays silent.
 * Written in the plants' voice, curious and never guilt-tripping.
 */
export function roundDigestFor(plants: Plant[], day: Date): RoundDigest | null {
  const endOfDay = at(day, 23, 59);
  const due = plants.filter((p) => !p.rooting && !p.archivedAt && new Date(p.nextCheckAt).getTime() <= endOfDay.getTime());
  if (due.length === 0) return null;
  const n = due.map((p) => p.name);
  const water = due.filter((p) => isReservoir(p.soil)).length;
  const check = water === 0 ? 'a soil check' : water === due.length ? 'a water check' : 'a check';
  const body =
    due.length === 1
      ? `${n[0]} would love ${check}. 1 min, tops.`
      : `${names(n)} would love ${check}. ${due.length <= 3 ? '2 mins' : '5 mins'}, tops.`;
  return { title: 'Plant round 🌱', body, plantIds: due.map((p) => p.id) };
}

/**
 * Plan the next `days` rounds starting today. On photo days, plants due a progress photo ride along
 * in that day's round (or get the day's one notification if nothing needs a check). A plant only appears on the first day it becomes due,
 * so a skipped round doesn't snowball into repeated nags.
 */
export function planRounds(
  plants: Plant[],
  now: Date,
  hour: number,
  minute: number,
  days = 7,
  photos: { cadence: PhotoCadence; lastPhotoAt: Record<string, string> } = { cadence: 'off', lastPhotoAt: {} },
): Array<{ fireAt: Date; digest: RoundDigest }> {
  const out: Array<{ fireAt: Date; digest: RoundDigest }> = [];
  const announced = new Set<string>();
  for (let i = 0; i < days; i++) {
    const day = new Date(now);
    day.setDate(now.getDate() + i);
    const fireAt = at(day, hour, minute);
    if (fireAt.getTime() <= now.getTime()) {
      // Today's round time has passed: mark today's plants as already seen.
      roundDigestFor(plants, day)?.plantIds.forEach((id) => announced.add(id));
      continue;
    }
    const fresh = plants.filter((p) => !announced.has(p.id));
    const round = roundDigestFor(fresh, day);
    round?.plantIds.forEach((id) => announced.add(id));
    const digest = isPhotoDay(photos.cadence, day) ? withPhotoDay(round, photoCandidates(plants, photos.lastPhotoAt, photos.cadence, day)) : round;
    if (!digest) continue;
    out.push({ fireAt, digest });
  }
  return out;
}
