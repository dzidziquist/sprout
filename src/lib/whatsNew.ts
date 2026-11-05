import type { WhatsNewItem } from '../data/whatsNew';

export interface SentIdea {
  /** The Notion row id the server returned. */
  id: string;
  kind: string;
  /** What the person suggested, for the thank-you ("Dragon fruit"). */
  label: string;
  at: string;
}

const DAYS_SHOWN = 60;
const norm = (id: string) => id.replace(/-/g, '').toLowerCase();

/**
 * What to show on Today: items not seen on this phone yet, from the last 60 days. A phone that has never
 * seen the list (a new install) starts with everything marked seen, so it isn't greeted with old news.
 */
export function whatsNewFor(items: WhatsNewItem[], seen: string[] | undefined, sent: SentIdea[] | undefined, now: Date) {
  if (!seen) return { items: [], yours: [], firstRun: true };
  const cutoff = now.getTime() - DAYS_SHOWN * 86400000;
  const fresh = items.filter((i) => !seen.includes(i.id) && Date.parse(i.date) >= cutoff);
  const mine = new Set((sent ?? []).map((s) => norm(s.id)));
  const yours = fresh.filter((i) => i.ideas?.some((id) => mine.has(norm(id))));
  return { items: fresh, yours, firstRun: false };
}

/** Ids to remember as seen, capped so the list doesn't grow forever. */
export function markSeen(seen: string[] | undefined, items: WhatsNewItem[]) {
  return [...new Set([...(seen ?? []), ...items.map((i) => i.id)])].slice(-200);
}
