import { awayRanges, subtractRanges, type Trip } from './away';
import { checkIntervalDays, recheckDays } from './careEngine';
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

/** kept: checks done, nothing overdue · repaired: a week saver covered a slip · missed · quiet: nothing was due and nothing checked (neutral). */
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
  /** Away-mode trips: lapses during a trip (and the catch-up days after) don't count. */
  trips?: Trip[];
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
  // The same re-check gaps applyCheck books.
  return result === 'dry' ? full : recheckDays(plant.soil, result, full);
}

/** [archived, brought back) for each time the plant spent In memory or gifted and then came back. */
function archivedSpans(mine: CareEvent[]): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  let since: number | null = null;
  for (const e of mine.filter((x) => x.type === 'archived' || x.type === 'restored').sort((a, b) => a.at.localeCompare(b.at))) {
    const t = new Date(e.at).getTime();
    if (e.type === 'archived') since ??= t;
    else if (since !== null) {
      out.push([since, t]);
      since = null;
    }
  }
  return out;
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
  // Time away from the fam never counts: lapses stop when it was archived, and it's due again from its return.
  const spans = archivedSpans(mine).filter(([, back]) => back > start);
  let si = 0;
  const comeBack = (until: number) => {
    for (; si < spans.length && spans[si][1] <= until; si++) {
      push(due, spans[si][0]);
      // restorePlant makes it due the moment it's back, whatever was booked before.
      due = spans[si][1];
    }
  };
  for (const c of checks) {
    const t = new Date(c.at).getTime();
    comeBack(t);
    push(due, t);
    // What was actually booked; checks from before the app kept that fall back to working it out.
    due = c.nextAt ? new Date(c.nextAt).getTime() : t + gapDays(plant, climate, c.result!, new Date(c.at)) * DAY_MS;
  }
  comeBack(Infinity);
  // The open cycle: the stored schedule is the source of truth.
  push(new Date(plant.nextCheckAt).getTime(), end);
  // Even checks logged inside a span (an archive date set back in time) don't make that time count.
  return spans.length ? subtractRanges(out, spans) : out;
}

export function computeStreak({ plants, events, climate, now, trips }: StreakInput): StreakResult {
  const empty: StreakResult = { started: false, checkedThisWeek: false, current: 0, best: 0, thisWeek: 'clean', freezesLeft: FREEZES_PER_MONTH, weeks: [], reachedAt: [] };
  if (plants.length === 0) return empty;
  const first = Math.min(...plants.map((p) => new Date(p.createdAt).getTime()));
  const lapses = subtractRanges(plants.flatMap((p) => lapsesFor(p, events, climate, now)), awayRanges(trips));
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
  | 'medal';

export interface Badge {
  id: BadgeId;
  title: string;
  /** Shown on a locked badge: how to earn it, in a curious tone. */
  hint: string;
  earnedAt?: string;
  /** Which illustration to show, when it isn't the one named after the badge id. null: the line icon. */
  art?: string | null;
  /** Levelled badges keep going after the first one: how far you've got, and the next target. */
  levels?: BadgeLevels;
}

export interface BadgeLevels {
  /** Targets, in order; reaching the first is earning the badge. */
  tiers: number[];
  /** 1-based level reached (0 while still locked). */
  level: number;
  /** The count so far (checks, skips, years…). */
  count: number;
  /** The next target, or undefined once every level is done. */
  next?: number;
  /** When the first level (earning the badge) and the current level were reached. */
  firstAt?: string;
  levelAt?: string;
  /** Word for the count: "checks", "years". */
  unit: string;
}

/** Levels from a sorted list of when each unit was reached (the 1st check, the 2nd…). */
function levelsFrom(dates: string[], tiers: number[], unit: string): BadgeLevels {
  const count = dates.length;
  const level = tiers.filter((t) => count >= t).length;
  return { tiers, level, count, next: tiers[level], firstAt: level ? dates[tiers[0] - 1] : undefined, levelAt: level ? dates[tiers[level - 1] - 1] : undefined, unit };
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

/** When some plant first reached each year in the fam (1st birthday, 2nd…), up to `max` years. */
function birthdays(plants: Plant[], now: Date, max: number): string[] {
  const out: string[] = [];
  for (let y = 1; y <= max; y++) {
    let earliest: number | undefined;
    for (const p of plants) {
      const d = new Date(p.createdAt);
      d.setFullYear(d.getFullYear() + y);
      const t = d.getTime();
      if (t > now.getTime() || (p.archivedAt && new Date(p.archivedAt).getTime() < t)) continue;
      if (earliest === undefined || t < earliest) earliest = t;
    }
    if (earliest === undefined) break;
    out.push(new Date(earliest).toISOString());
  }
  return out;
}

export function badgesFor({ plants, events, climate, now, trips }: StreakInput, streak?: StreakResult): Badge[] {
  const s = streak ?? computeStreak({ plants, events, climate, now, trips });
  const ats = (pred: (e: CareEvent) => boolean) => events.filter(pred).map((e) => e.at).sort();
  const checks = ats((e) => e.type === 'check');
  const skips = ats((e) => e.type === 'check' && e.result === 'damp');
  const season = hardSeason(climate);
  // Each levelled badge is earned at its first tier; that date is what rewards count, so levels never change the pace of gifts.
  const levelled = (id: BadgeId, title: string, hint: string, l: BadgeLevels): Badge => ({ id, title, hint, earnedAt: l.firstAt, levels: l });
  const make = levelsFrom;
  const famDates = [...plants].map((p) => p.createdAt).sort();
  const gifts = plants.filter((p) => p.archivedReason === 'gifted' && p.archivedAt).map((p) => p.archivedAt!).sort();
  return [
    levelled('first-check', 'First check', 'Check any plant’s soil or water', make(checks, [1, 25, 100, 250, 500], 'checks')),
    { id: 'first-skip', title: 'Smart skip', hint: 'Skip when it’s "Damp" or "Plenty"', earnedAt: skips[0] },
    levelled('ten-skips', '10 smart skips', 'Skip a watering it didn’t need, 10 times', make(skips, [10, 50, 100, 250], 'smart skips')),
    levelled('first-photo', 'First diary photo', 'Add a photo to a plant', make(ats((e) => e.type === 'photo' && !!e.photoUri), [1, 10, 50, 100], 'photos')),
    levelled('first-cutting', 'First cutting', 'Take a cutting from a plant', make(ats((e) => e.type === 'cutting'), [1, 10, 25, 50], 'cuttings')),
    { id: 'first-roots', title: 'First roots', hint: 'Pot up a rooted cutting', earnedAt: nth(events, (e) => e.type === 'rooted') },
    levelled('propagator', 'Propagator', 'Root 3 cuttings', make(ats((e) => e.type === 'rooted'), [3, 10, 25, 50], 'rooted')),
    levelled('first-harvest', 'First harvest', 'Log a harvest from an edible', make(ats((e) => e.type === 'harvest'), [1, 10, 50, 100], 'harvests')),
    levelled('fam-5', '5-plant fam', 'Welcome 5 plants home', make(famDates, [5, 10, 25, 50], 'plants')),
    levelled('generous', 'Generous', 'Give a plant a new home', make(gifts, [1, 5, 10, 25], 'gifted')),
    levelled('grandma-plant', 'Grandma plant', 'Keep a plant in the fam for a year', make(birthdays(plants, now, 5), [1, 2, 3, 5], 'years')),
    levelled('streak-4', '4-week streak', 'Keep everyone checked for 4 weeks', make(s.reachedAt, [4, 12, 26, 52], 'weeks')),
    { id: 'season', title: `Survived ${season.name}`, hint: `Keep a plant going through ${season.name}`, earnedAt: seasonSurvivor(plants, events, climate), art: season.art },
  ];
}

/**
 * The PlantFam gold medal, a reward for 10 milestones (see rewards.ts). It's only shown once
 * earned, so it sits outside `badgesFor` and its "13 for everyone".
 */
export function medalBadge(at: string | undefined): Badge | undefined {
  if (!at) return undefined;
  return { id: 'medal', title: 'PlantFam gold medal', hint: 'Earn 10 milestones', earnedAt: at };
}
