import type { Trip } from '../engine/away';
import type { Plant } from '../types';

/** Shared with the widget (targets/widget): app.json's App Group, and the key the widget reads. */
export const WIDGET_GROUP = 'group.com.dzidziquist.plantfam';
export const WIDGET_KEY = 'round';

/**
 * What the Home Screen widget needs: each plant on the round and when its next check falls due, plus
 * every trip that isn't over yet. Dates, not a count or an "away" flag, so the widget works out who's due
 * and whether you're away for each day by itself, and rolls over at midnight (into a trip, too) without
 * the app being opened.
 */
export function widgetPayload(plants: Plant[], trips: Trip[] | undefined, now: Date): string {
  const round = plants.filter((p) => !p.archivedAt && !p.rooting).map((p) => ({ n: p.name, d: p.nextCheckAt }));
  const ahead = (trips ?? []).filter((t) => new Date(t.to).getTime() > now.getTime()).map((t) => ({ f: t.from, t: t.to }));
  return JSON.stringify({ plants: round, trips: ahead });
}
