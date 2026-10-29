import type { Trip } from '../engine/away';
import type { Plant, SpeciesId } from '../types';

/** Shared with the widget (targets/widget): app.json's App Group, and the key the widget reads. */
export const WIDGET_GROUP = 'group.com.dzidziquist.plantfam';
export const WIDGET_KEY = 'round';
/** Folder in the App Group where the app leaves each plant's cartoon for the widget (bump to replace them all). */
export const WIDGET_ART_DIR = 'widget-art-1';

/**
 * What the Home Screen widget needs: each plant on the round with when its next check falls due, when it
 * was last checked and which cartoon it is, plus every trip that isn't over yet. Dates, not a count or an
 * "away" flag, so the widget works out who's due and whether you're away for each day by itself, and
 * rolls over at midnight (into a trip, too) without the app being opened. `g` asks for no worried faces
 * (the app's gentle or face-free look).
 */
export function widgetPayload(plants: Plant[], trips: Trip[] | undefined, now: Date, opts: { artKey?: (id: SpeciesId) => string; gentle?: boolean } = {}): string {
  const round = plants
    .filter((p) => !p.archivedAt && !p.rooting)
    .map((p) => ({ n: p.name, d: p.nextCheckAt, ...(p.lastCheckAt ? { l: p.lastCheckAt } : {}), ...(opts.artKey ? { a: opts.artKey(p.speciesId) } : {}) }));
  const ahead = (trips ?? []).filter((t) => new Date(t.to).getTime() > now.getTime()).map((t) => ({ f: t.from, t: t.to }));
  return JSON.stringify({ plants: round, trips: ahead, ...(opts.gentle ? { g: true } : {}) });
}
