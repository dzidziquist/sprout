import { checkIntervalDays } from './careEngine';
import { speciesOf } from '../data/species';
import { localizeClimateText, modelOf, shiftOf } from '../lib/climate';
import type { CareEvent, CheckResult, ClimateProfile, Plant } from '../types';

/*
 * Weekly streak and milestone badges.
 *
 * PlantFam never counts "days watered" (that would train overwatering). The streak counts WEEKS in
 * which nobody in the fam was left waiting, and it repairs itself for free.
 *
 * Definitions (all in the phone's local time):
 * - A week runs Monday 00:00 → Sunday 23:59.
 * - A plant's check CYCLE runs from the moment a soil check falls due to the moment it is next checked.
 *   Due dates are rebuilt from the plant's history: the first check falls due one full interval after
 *   the plant joined (or after its cutting rooted); after each check the next one falls due
 *   `interval` days later for "dry", min(2, interval) for "damp" and 4 for "soggy", mirroring
 *   `applyCheck`. The interval comes from `checkIntervalDays` with the plant's current pot, soil and k
 *   at the date of that check (so seasons are honoured; k is today's value, a small approximation).
 *   The open cycle uses the stored `plant.nextCheckAt`, which is authoritative.
 * - A LAPSE is the part of a cycle more than GRACE_DAYS (2) after the due date while still unchecked.
 *   Rooting cuttings have no checks, and archived plants stop counting at `archivedAt`.
 * - A completed week is KEPT when no lapse touches it, otherwise MISSED.
 * - FREEZES: every calendar month brings FREEZES_PER_MONTH (2) free repairs. A missed week is counted in the
 *   month that holds most of its days (its Thursday, as in ISO weeks); if that month still has a
 *   freeze, the week is REPAIRED automatically and counts as kept.
 * - The streak is the run of kept/repaired weeks ending with the current week. The current week is
 *   still in progress: it adds 1 while it is clean (or a freeze covers it) and never breaks the streak
 *   until it ends.
 * - Weeks before the first plant joined are ignored.
 */

export const GRACE_DAYS = 2;
export const FREEZES_PER_MONTH = 2;

const DAY_MS = 86400000;

/** kept: checks done, nothing overdue · repaired: a free pass covered a slip · missed · quiet: nothing was due and nothing checked (neutral). */
export type WeekStatus = 'kept' | 'repaired' | 'missed' | 'quiet';

export interface WeekRecord {
  /** Monday 00:00 local, ISO string. */
  start: string;
  status: WeekStatus;
}

export interface StreakResult {
  /** At least one soil check ever: streaks only start after that. */
  started: boolean;
  /** A soil check has been done this week (so this week already counts). */
  checkedThisWeek: boolean;
  /** Consecutive kept weeks, including the current one when it is on track. */
  current: number;
  best: number;
  /** clean: nothing lapsed this week · covered: something lapsed but a freeze will repair it · open: lapsed, no freezes left. */
  thisWeek: 'clean' | 'covered' | 'open';
  /** Freezes left in the current calendar month. */
  freezesLeft: number;
  /** Completed weeks, oldest first. */
  weeks: WeekRecord[];
  /** When the best streak first reached each length (index = length - 1), for badges. */
  reachedAt: string[];
}

export interface StreakInput {
  plants: Plant[];
  events: CareEvent[];
  climate: ClimateProfile;
  now: Date;
}

export function startOfWeek(d: Date): Date {
  const s = new Date(d);
  s.setHours(0, 0, 0, 0);
  const dow = (s.getDay() + 6) % 7; // Monday = 0
  s.setDate(s.getDate() - dow);
  return s;
}

function addWeeks(d: Date, n: number): Date {
  const s = new Date(d);
  s.setDate(s.getDate() + 7 * n);
  return s;
}

function gapDays(plant: Plant, climate: ClimateProfile, result: CheckResult, at: Date): number {
  const full = checkIntervalDays({ group: speciesOf(plant).group, plant, profile: climate, at });
  if (result === 'dry') return full;
  if (result === 'damp') return Math.min(2, full);
  return 4;
}

/** Time ranges [from, to) during which a plant was overdue by more than GRACE_DAYS. */
export function lapsesFor(plant: Plant, events: CareEvent[], climate: ClimateProfile, now: Date): Array<[number, number]> {
  if (plant.rooting) return [];
  const mine = events.filter((e) => e.plantId === plant.id);
  const rooted = mine.filter((e) => e.type === 'rooted').map((e) => new Date(e.at).getTime());
  const start = rooted.length ? Math.max(...rooted) : new Date(plant.createdAt).getTime();
  const end = Math.min(now.getTime(), plant.archivedAt ? new Date(plant.archivedAt).getTime() : Infinity);
  const checks = mine
    .filter((e) => e.type === 'check' && e.result && new Date(e.at).getTime() >= start)
    .sort((a, b) => a.at.localeCompare(b.at));
  const grace = GRACE_DAYS * DAY_MS;
  const out: Array<[number, number]> = [];
  const push = (due: number, checkedAt: number) => {
    const from = due + grace;
    const to = Math.min(checkedAt, end);
    if (to > from) out.push([from, to]);
  };
  let due = start + checkIntervalDays({ group: speciesOf(plant).group, plant, profile: climate, at: new Date(start) }) * DAY_MS;
  for (const c of checks) {
    const t = new Date(c.at).getTime();
    push(due, t);
    due = t + gapDays(plant, climate, c.result!, new Date(c.at)) * DAY_MS;
  }
  // The open cycle: the stored schedule is the source of truth.
  push(new Date(plant.nextCheckAt).getTime(), end);
  return out;
}

export function computeStreak({ plants, events, climate, now }: StreakInput): StreakResult {
  const empty: StreakResult = { started: false, checkedThisWeek: false, current: 0, best: 0, thisWeek: 'clean', freezesLeft: FREEZES_PER_MONTH, weeks: [], reachedAt: [] };
  if (plants.length === 0) return empty;
  const first = Math.min(...plants.map((p) => new Date(p.createdAt).getTime()));
  const lapses = plants.flatMap((p) => lapsesFor(p, events, climate, now));
  const touches = (from: number, to: number) => lapses.some(([a, b]) => a < to && b > from);
  // Streaks are earned: a week only counts once you've actually done a soil check in it.
  const checkTimes = events.filter((e) => e.type === 'check').map((e) => new Date(e.at).getTime());
  const checkedIn = (from: number, to: number) => checkTimes.some((t) => t >= from && t < to);
  if (checkTimes.length === 0) return { ...empty, weeks: [] };

  const thisMonday = startOfWeek(now);
  const used = new Map<string, number>();
  const monthKey = (monday: Date) => {
    const thu = new Date(monday);
    thu.setDate(thu.getDate() + 3);
    return `${thu.getFullYear()}-${thu.getMonth()}`;
  };
  const weeks: WeekRecord[] = [];
  const reachedAt: string[] = [];
  let run = 0;
  let best = 0;
  const bump = (at: Date) => {
    run += 1;
    if (run > best) {
      best = run;
      reachedAt.push(at.toISOString());
    }
  };

  for (let w = startOfWeek(new Date(first)); w < thisMonday; w = addWeeks(w, 1)) {
    const next = addWeeks(w, 1);
    let status: WeekStatus = checkedIn(w.getTime(), next.getTime()) ? 'kept' : 'quiet';
    if (touches(w.getTime(), next.getTime())) {
      const k = monthKey(w);
      const n = used.get(k) ?? 0;
      if (n < FREEZES_PER_MONTH) {
        used.set(k, n + 1);
        status = 'repaired';
      } else status = 'missed';
    }
    weeks.push({ start: w.toISOString(), status });
    if (status === 'missed') run = 0;
    else if (status !== 'quiet') bump(new Date(next.getTime() - 1));
  }

  const k = monthKey(thisMonday);
  let left = FREEZES_PER_MONTH - (used.get(k) ?? 0);
  let thisWeek: StreakResult['thisWeek'] = 'clean';
  if (touches(thisMonday.getTime(), now.getTime() + 1)) {
    if (left > 0) {
      thisWeek = 'covered';
      left -= 1;
    } else thisWeek = 'open';
  }
  const checkedThisWeek = checkedIn(thisMonday.getTime(), now.getTime() + 1);
  if (thisWeek !== 'open' && checkedThisWeek) bump(now);
  // An open current week doesn't break the run yet; it just isn't counted.
  return { started: true, checkedThisWeek, current: run, best, thisWeek, freezesLeft: left, weeks, reachedAt };
}

/* ---------------------------------------------------------------- badges */

export type BadgeId =
  | 'first-check'
  | 'first-skip'
  | 'ten-skips'
  | 'first-photo'
  | 'first-cutting'
  | 'first-roots'
  | 'first-harvest'
  | 'propagator'
  | 'fam-5'
  | 'generous'
  | 'grandma-plant'
  | 'streak-4'
  | 'season'
  | 'supporter';

export interface Badge {
  id: BadgeId;
  title: string;
  /** Shown on a locked badge: how to earn it, in a curious tone. */
  hint: string;
  earnedAt?: string;
  /** Which illustration to show, when it isn't the one named after the badge id. null: the line icon. */
  art?: string | null;
}

function nth(events: CareEvent[], pred: (e: CareEvent) => boolean, n = 1): string | undefined {
  const list = events.filter(pred).sort((a, b) => a.at.localeCompare(b.at));
  return list[n - 1]?.at;
}

/**
 * A plant that was in the fam before the season started (`modelStart`, a 0-based month in the model city)
 * and got a soil check after Mar 1 the following year, without being archived in between.
 */
function survivedFrom(plants: Plant[], events: CareEvent[], climate: ClimateProfile, modelStart: number): string | undefined {
  // In the user's own calendar (Sydney's "grey season" starts in May).
  const startMonth = (modelStart - shiftOf(climate) + 12) % 12;
  const toSpring = (2 - modelStart + 12) % 12; // months from season start to the model's March
  let earliest: string | undefined;
  for (const p of plants) {
    const joined = new Date(p.createdAt < p.acquiredAt ? p.createdAt : p.acquiredAt);
    // The first season that starts after the plant joined.
    let year = joined.getFullYear();
    if (joined.getTime() >= new Date(year, startMonth, 1).getTime()) year += 1;
    const seasonStart = new Date(year, startMonth, 1);
    const springAfter = new Date(seasonStart.getFullYear(), seasonStart.getMonth() + toSpring, 1).getTime();
    const check = events
      .filter((e) => e.plantId === p.id && e.type === 'check' && new Date(e.at).getTime() >= springAfter)
      .filter((e) => !p.archivedAt || e.at <= p.archivedAt)
      .sort((a, b) => a.at.localeCompare(b.at))[0];
    if (check && (!earliest || check.at < earliest)) earliest = check.at;
  }
  return earliest;
}

/** "Survived the grey season" (Seattle) or harmattan (Accra): in the fam before Nov 1 (Dec 1 in Accra). */
function seasonSurvivor(plants: Plant[], events: CareEvent[], climate: ClimateProfile): string | undefined {
  return survivedFrom(plants, events, climate, modelOf(climate) === 'seattle' ? 10 : 11);
}

/**
 * The hard season the season badge celebrates, and its art. Seattle has its grey season; other
 * cities on the Seattle model get "winter" (with the snowflake art) when they freeze, or a milder
 * "cool season". Tropical climates get harmattan / dry season, with the dry-season art.
 */
function hardSeason(climate: ClimateProfile): { name: string; art: string | null } {
  if (modelOf(climate) === 'accra') return { name: localizeClimateText('harmattan', climate), art: 'survived-dry-season' };
  if (typeof climate !== 'string' && climate.frost) return { name: 'winter', art: 'survived-winter' };
  return { name: localizeClimateText('grey season', climate), art: 'season' };
}

/**
 * "Grandma plant": the first plant to turn one in the fam (a year after it was added, so a demo or
 * a long-owned plant added today doesn't earn it on day one), while still in it or archived after.
 */
function grandmaPlant(plants: Plant[], now: Date): string | undefined {
  let earliest: number | undefined;
  for (const p of plants) {
    const birthday = new Date(p.createdAt);
    birthday.setFullYear(birthday.getFullYear() + 1);
    const t = birthday.getTime();
    if (t > now.getTime()) continue;
    if (p.archivedAt && new Date(p.archivedAt).getTime() < t) continue;
    if (earliest === undefined || t < earliest) earliest = t;
  }
  return earliest === undefined ? undefined : new Date(earliest).toISOString();
}

/** "Generous": the first plant given to a new home. */
function firstGift(plants: Plant[]): string | undefined {
  return plants
    .filter((p) => p.archivedReason === 'gifted' && p.archivedAt)
    .map((p) => p.archivedAt!)
    .sort()[0];
}

export function badgesFor({ plants, events, climate, now }: StreakInput, streak?: StreakResult): Badge[] {
  const s = streak ?? computeStreak({ plants, events, climate, now });
  const isCheck = (e: CareEvent) => e.type === 'check';
  const isSkip = (e: CareEvent) => e.type === 'check' && e.result === 'damp';
  const fifth = [...plants].sort((a, b) => a.createdAt.localeCompare(b.createdAt))[4]?.createdAt;
  const season = hardSeason(climate);
  return [
    { id: 'first-check', title: 'First check', hint: 'Check any plant’s soil or water', earnedAt: nth(events, isCheck) },
    { id: 'first-skip', title: 'Smart skip', hint: 'Skip when it’s "Damp" or "Plenty"', earnedAt: nth(events, isSkip) },
    { id: 'ten-skips', title: '10 smart skips', hint: 'Skip a watering it didn’t need, 10 times', earnedAt: nth(events, isSkip, 10) },
    { id: 'first-photo', title: 'First diary photo', hint: 'Add a photo to a plant', earnedAt: nth(events, (e) => e.type === 'photo' && !!e.photoUri) },
    { id: 'first-cutting', title: 'First cutting', hint: 'Take a cutting from a plant', earnedAt: nth(events, (e) => e.type === 'cutting') },
    { id: 'first-roots', title: 'First roots', hint: 'Pot up a rooted cutting', earnedAt: nth(events, (e) => e.type === 'rooted') },
    { id: 'propagator', title: 'Propagator', hint: 'Root 3 cuttings', earnedAt: nth(events, (e) => e.type === 'rooted', 3) },
    { id: 'first-harvest', title: 'First harvest', hint: 'Log a harvest from an edible', earnedAt: nth(events, (e) => e.type === 'harvest') },
    { id: 'fam-5', title: '5-plant fam', hint: 'Welcome 5 plants home', earnedAt: fifth },
    { id: 'generous', title: 'Generous', hint: 'Give a plant a new home', earnedAt: firstGift(plants) },
    { id: 'grandma-plant', title: 'Grandma plant', hint: 'Keep a plant in the fam for a year', earnedAt: grandmaPlant(plants, now) },
    { id: 'streak-4', title: '4-week streak', hint: 'Keep everyone checked for 4 weeks', earnedAt: s.reachedAt[3] },
    { id: 'season', title: `Survived ${season.name}`, hint: `Keep a plant going through ${season.name}`, earnedAt: seasonSurvivor(plants, events, climate), art: season.art },
  ];
}

/**
 * The tip jar's thank-you badge. It's only shown to people who tipped (never as a locked badge
 * someone could feel pushed to buy), so it sits outside `badgesFor` and its "13 for everyone".
 */
export function supporterBadge(since: string | undefined): Badge | undefined {
  if (!since) return undefined;
  return { id: 'supporter', title: 'PlantFam supporter', hint: 'Left a tip in the tip jar', earnedAt: since };
}
