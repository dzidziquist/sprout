/*
 * "Roughly when" choices for dates people rarely know exactly: when a plant joined the fam and
 * when it was last watered. Chips instead of a date picker keep it quick and need no native module.
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
