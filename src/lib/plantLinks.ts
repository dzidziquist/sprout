import { getSpecies, isOtherId } from '../data/species';
import { bestHome, lightNeed, type RoomLight, type Site } from '../engine/light';
import type { SpeciesId } from '../types';

/*
 * Links between "learn about a plant" and "add it", shared by photo ID, species pages and the wishlist.
 * Plants not in the catalogue travel by name: /species/other?name=…&latin=… and /add?other=1&name=…&latin=….
 */

type Custom = { commonName: string; latinName?: string } | undefined;

const names = (custom: Custom) => `name=${encodeURIComponent(custom?.commonName ?? '')}&latin=${encodeURIComponent(custom?.latinName ?? '')}`;

/** A plant's species page. */
export function speciesHref(speciesId: SpeciesId, custom?: Custom): string {
  return isOtherId(speciesId) ? `/species/other?${names(custom)}` : `/species/${speciesId}`;
}

/** The add screen with this plant picked; `wish` is the wishlist entry it came from, taken off once added. */
export function addHref(speciesId: SpeciesId, custom?: Custom, wish?: string): string {
  const base = isOtherId(speciesId) ? `/add?other=1&${names(custom)}` : `/add?species=${speciesId}`;
  return wish ? `${base}&wish=${wish}` : base;
}

/** Photo ID's common name, capitalised, or the Latin name when it has none. */
export const displayName = (commonNames: string[], latinName: string) => (commonNames[0] ? commonNames[0].replace(/^\w/, (ch) => ch.toUpperCase()) : latinName);

/**
 * "In your home" for a catalogue plant, from the room light setup: where it would suit, or why nowhere does.
 * Null for unlisted plants, edibles (mostly grown outside) and homes with no rooms set up.
 */
export function homeFor(speciesId: SpeciesId, rooms: Record<string, RoomLight>, site: Site, now: Date): { suits: string | null; line: string } | null {
  if (isOtherId(speciesId) || getSpecies(speciesId).edible) return null;
  const home = bestHome(lightNeed({ speciesId }), rooms, site, now);
  if (!home) return null;
  if ('words' in home) return { suits: home.room, line: `Your ${home.room.toLowerCase()} would suit it, ${home.words}.` };
  return { suits: null, line: home.dim ? 'Your rooms are a bit dark for it. A grow light would help.' : 'Your rooms get more direct sun than it likes. A sheer curtain would help.' };
}
