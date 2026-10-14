import type { Plant } from '../types';

export interface RoundDigest {
  title: string;
  body: string;
  plantIds: string[];
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
  const due = plants.filter((p) => !p.rooting && new Date(p.nextCheckAt).getTime() <= endOfDay.getTime());
  if (due.length === 0) return null;
  const n = due.map((p) => p.name);
  const body =
    due.length === 1
      ? `${n[0]} would love a soil check. 1 min, tops.`
      : `${names(n)} would love a soil check. ${due.length <= 3 ? '2 mins' : '5 mins'}, tops.`;
  return { title: 'Plant round 🌱', body, plantIds: due.map((p) => p.id) };
}

/**
 * Plan the next `days` rounds starting today. A plant only appears on the first day it becomes due,
 * so a skipped round doesn't snowball into repeated nags.
 */
export function planRounds(plants: Plant[], now: Date, hour: number, minute: number, days = 7): Array<{ fireAt: Date; digest: RoundDigest }> {
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
    const digest = roundDigestFor(fresh, day);
    if (!digest) continue;
    digest.plantIds.forEach((id) => announced.add(id));
    out.push({ fireAt, digest });
  }
  return out;
}
