import type { CareEvent } from '../types';

/*
 * When the next feed is due, from the feeding advice the app gives (its "every …" cadence) and the
 * feeds logged, by hand or by ticking a feed job in the grow patch.
 */

const DAY = 86_400_000;

/** The cadence in a piece of feeding advice, in days: "every 10–14 days" → 10, "monthly" → 30. */
export function feedEveryDays(advice: string): number | undefined {
  const text = advice.toLowerCase();
  const days = text.match(/every (\d+)(?:\s*[–-]\s*\d+)? days/);
  if (days) return Number(days[1]);
  const weeks = text.match(/every (\d+)(?:\s*[–-]\s*\d+)? weeks/);
  if (weeks) return Number(weeks[1]) * 7;
  if (/\bweekly\b|every week/.test(text)) return 7;
  if (/\bmonthly\b|every month/.test(text)) return 30;
  return undefined;
}

/** The plant's last logged feed. */
export function lastFed(plantId: string, events: CareEvent[]): Date | undefined {
  let last: string | undefined;
  for (const e of events) if (e.plantId === plantId && e.type === 'feed' && (!last || e.at > last)) last = e.at;
  return last ? new Date(last) : undefined;
}

/**
 * Feeding advice with when the next one falls: "… · due now" or "… · next about Nov 12". Unchanged
 * when the advice has no cadence (paused, waiting on fresh mix, no feed) or nothing's been logged yet.
 */
export function withNextFeed(advice: string, plantId: string, events: CareEvent[], now: Date): string {
  const every = feedEveryDays(advice);
  const last = every ? lastFed(plantId, events) : undefined;
  if (!every || !last) return advice;
  const next = new Date(last.getTime() + every * DAY);
  if (next.getTime() <= now.getTime() + DAY / 2) return `${advice} · due now`;
  return `${advice} · next about ${next.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}

/** Fed within the last `days` (so a feed job can leave the plant out). */
export function fedWithin(plantId: string, events: CareEvent[], days: number, now: Date): boolean {
  const last = lastFed(plantId, events);
  return !!last && now.getTime() - last.getTime() < days * DAY - DAY / 2;
}
