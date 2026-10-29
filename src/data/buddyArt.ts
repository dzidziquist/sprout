import type { ImageSourcePropType } from 'react-native';
import { BUDDY_IMAGES } from './buddyImages';
import { EXPANDED_BUDDY_IMAGES } from './expandedBuddyImages';
import { artFor } from './species';
import type { Mood, SpeciesId } from '../types';

/**
 * The cartoon a plant shows, as PlantBuddy picks it (its own if it has one, else its closest look-alike),
 * with a key naming it: the widget's copies are filed under the key.
 */
export function buddyArt(speciesId: SpeciesId): { key: string; images: Record<Mood, ImageSourcePropType> } {
  const own = Object.prototype.hasOwnProperty.call(EXPANDED_BUDDY_IMAGES, speciesId) ? EXPANDED_BUDDY_IMAGES[speciesId] : undefined;
  if (own) return { key: `s-${speciesId}`, images: own };
  const art = artFor(speciesId);
  return { key: `a-${art}`, images: BUDDY_IMAGES[art] };
}
