import type { CareEvent, EdibleStage, Plant } from '@/types';

const DAY_MS = 86400000;

/** Diary photos for one plant, oldest first. */
export function diaryPhotos(events: CareEvent[], plantId: string): CareEvent[] {
  return events.filter((e) => e.plantId === plantId && e.type === 'photo' && !!e.photoUri).sort((a, b) => a.at.localeCompare(b.at));
}

/**
 * The stage an edible was in when a photo was taken. New photos carry it; older ones fall back to the
 * last stage change before the photo, or the plant's starting stage when it hasn't changed since.
 */
export function stageAtPhoto(plant: Plant, events: CareEvent[], photo: CareEvent): EdibleStage | undefined {
  if (photo.stage) return photo.stage;
  if (!plant.stage) return undefined;
  const changes = events.filter((e) => e.plantId === plant.id && e.type === 'stage' && e.stage).sort((a, b) => a.at.localeCompare(b.at));
  const before = changes.filter((e) => e.at <= photo.at).pop();
  if (before) return before.stage;
  // No change logged before the photo: only safe to name a stage if none came after it either.
  return changes.length === 0 ? plant.stage : undefined;
}

/** Day of the grow a photo was taken on, counting the day it joined (or was sown) as day 1. */
export function growDay(plant: Plant, photo: CareEvent): number {
  const start = new Date(new Date(plant.acquiredAt).toDateString()).getTime();
  const day = new Date(new Date(photo.at).toDateString()).getTime();
  return Math.max(1, Math.round((day - start) / DAY_MS) + 1);
}
