/**
 * What's new, shown once on Today after an update lands (src/lib/whatsNew.ts). The ideas pipeline adds
 * an item with each fix or plant it merges (docs/intake.md); `ideas` are the Notion row ids of the
 * notes that asked for it, so the phone that sent one can say "Your idea is in!". Newest last.
 */
export interface WhatsNewItem {
  /** Unique and stable, e.g. "2026-11-06-dragon-fruit". */
  id: string;
  /** When it merged (YYYY-MM-DD). Items older than 60 days are never shown. */
  date: string;
  kind: 'plant' | 'fix' | 'new';
  /** Short, in PlantFam's voice: "Dragon fruit has joined the catalogue". */
  text: string;
  ideas?: string[];
}

export const WHATS_NEW: WhatsNewItem[] = [
  { id: '2026-11-07-heart-fern-art', date: '2026-11-07', kind: 'new', text: 'Heart fern has its own plant buddy now' },
  { id: '2026-11-07-string-of-hearts-art', date: '2026-11-07', kind: 'new', text: 'String of hearts has its own plant buddy now' },
];
