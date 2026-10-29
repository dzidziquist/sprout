/*
 * "Roughly when" choices for dates people rarely know exactly: when a plant joined the fam and
 * when it was last watered. A short list instead of a date picker keeps it quick and needs no native module.
 */

export interface WhenOption<Id extends string> {
  id: Id;
  label: string;
  /** Days before now. null: unknown. */
  days: number | null;
}

export type JoinedId = 'today' | 'week' | 'month' | 'months' | 'year';
export const JOINED: WhenOption<JoinedId>[] = [
  { id: 'today', label: 'Today', days: 0 },
  { id: 'week', label: 'This week', days: 3 },
  { id: 'month', label: 'This month', days: 14 },
  { id: 'months', label: 'A few months ago', days: 90 },
  { id: 'year', label: 'Over a year ago', days: 400 },
];

export type WateredId = 'unsure' | 'today' | 'yesterday' | 'few' | 'week' | 'weeks';
export const WATERED: WhenOption<WateredId>[] = [
  { id: 'unsure', label: 'Not sure', days: null },
  { id: 'today', label: 'Today', days: 0 },
  { id: 'yesterday', label: 'Yesterday', days: 1 },
  { id: 'few', label: '2–3 days ago', days: 2 },
  { id: 'week', label: 'About a week ago', days: 7 },
  { id: 'weeks', label: '2+ weeks ago', days: 14 },
];

/** When cuttings were taken, so ones already rooting can be added with their real start. */
export type CutId = 'today' | 'yesterday' | 'few' | 'week' | 'weeks' | 'month' | 'months';
export const CUT: WhenOption<CutId>[] = [
  { id: 'today', label: 'Today', days: 0 },
  { id: 'yesterday', label: 'Yesterday', days: 1 },
  { id: 'few', label: 'A few days ago', days: 3 },
  { id: 'week', label: 'About a week ago', days: 7 },
  { id: 'weeks', label: '2 weeks ago', days: 14 },
  { id: 'month', label: 'About a month ago', days: 30 },
  { id: 'months', label: '2+ months ago', days: 60 },
];

/** When a plant was gifted away or lost, for ones that left before they were archived in the app. */
export type GoneId = 'today' | 'yesterday' | 'few' | 'week' | 'month' | 'months' | 'half' | 'year';
export const GONE: WhenOption<GoneId>[] = [
  { id: 'today', label: 'Today', days: 0 },
  { id: 'yesterday', label: 'Yesterday', days: 1 },
  { id: 'few', label: 'A few days ago', days: 3 },
  { id: 'week', label: 'Last week', days: 7 },
  { id: 'month', label: 'Last month', days: 30 },
  { id: 'months', label: 'A few months ago', days: 90 },
  { id: 'half', label: 'About 6 months ago', days: 180 },
  { id: 'year', label: 'Over a year ago', days: 400 },
];

/** The option nearest a date (for showing an existing value). */
export function closestOption<Id extends string>(options: WhenOption<Id>[], iso: string, now = new Date()): Id {
  const days = (now.getTime() - new Date(iso).getTime()) / 86_400_000;
  const dated = options.filter((o): o is WhenOption<Id> & { days: number } => o.days !== null);
  return dated.reduce((best, o) => (Math.abs(o.days - days) < Math.abs(best.days - days) ? o : best)).id;
}

export function daysAgo(days: number, now = new Date()): Date {
  const d = new Date(now);
  d.setDate(d.getDate() - days);
  return d;
}

/** The chip that best matches a date (for showing an existing plant's value). */
export function closestJoined(iso: string, now = new Date()): JoinedId {
  const days = (now.getTime() - new Date(iso).getTime()) / 86_400_000;
  if (days < 1) return 'today';
  if (days < 7) return 'week';
  if (days < 45) return 'month';
  if (days < 365) return 'months';
  return 'year';
}

/**
 * The choices that don't land before `sinceIso` (a plant can't leave before it joined). "Today" always
 * stays, so there's never an empty list.
 */
export function optionsSince<Id extends string>(options: WhenOption<Id>[], sinceIso: string, now = new Date()): WhenOption<Id>[] {
  // Calendar arithmetic, the same way the chosen date is made (daysAgo), so a daylight-saving change
  // in between doesn't hide a choice that would land on or after the join date.
  const since = new Date(sinceIso).getTime();
  return options.filter((o) => o.days === 0 || (o.days !== null && daysAgo(o.days, now).getTime() >= since));
}

/** Whole local calendar days from `from` to `to` (tomorrow is 1, whatever the hour). The one way the app counts "in N days". */
export function calendarDays(from: Date, to: Date): number {
  const a = new Date(from);
  a.setHours(0, 0, 0, 0);
  const b = new Date(to);
  b.setHours(0, 0, 0, 0);
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

export type PottedId = 'week' | 'weeks' | 'month' | 'months' | 'older';
/** When it went into its current mix. */
export const POTTED: WhenOption<PottedId>[] = [
  { id: 'week', label: 'This week', days: 3 },
  { id: 'weeks', label: '2–3 weeks ago', days: 17 },
  { id: 'month', label: 'About a month ago', days: 30 },
  { id: 'months', label: 'About 2 months ago', days: 60 },
  { id: 'older', label: '3+ months ago', days: 100 },
];
