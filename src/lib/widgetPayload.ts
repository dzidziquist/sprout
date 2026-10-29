import { activeTrip, type Trip } from '../engine/away';
import type { Plant } from '../types';

/** Shared with the widget (targets/widget): app.json's App Group, and the key the widget reads. */
export const WIDGET_GROUP = 'group.com.dzidziquist.plantfam';
export const WIDGET_KEY = 'round';

/**
 * What the Home Screen widget needs: each plant on the round and when its next check falls due, plus
 * the end of a trip in progress. Dates, not a count, so the widget works out "who's due today" by
 * itself and rolls over at midnight without the app being opened.
 */
export function widgetPayload(plants: Plant[], trips: Trip[] | undefined, now: Date): string {
  const round = plants.filter((p) => !p.archivedAt && !p.rooting).map((p) => ({ n: p.name, d: p.nextCheckAt }));
  const away = activeTrip(trips, now)?.to ?? null;
  return JSON.stringify({ plants: round, away });
}
