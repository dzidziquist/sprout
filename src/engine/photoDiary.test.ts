import { describe, expect, it } from 'vitest';
import type { CareEvent, Plant } from '@/types';
import { diaryPhotos, growDay, stageAtPhoto } from './photoDiary';

const plant = { id: 'p', acquiredAt: '2026-05-01T10:00:00', stage: 'flowering' } as Plant;
const photo = (id: string, at: string, extra: Partial<CareEvent> = {}): CareEvent => ({ id, plantId: 'p', type: 'photo', photoUri: `diary/${id}.jpg`, at, ...extra });
const stage = (at: string, s: CareEvent['stage']): CareEvent => ({ id: at, plantId: 'p', type: 'stage', stage: s, at });

describe('photo diary', () => {
  it('lists a plant’s photos oldest first', () => {
    const events = [photo('b', '2026-05-09T08:00:00'), photo('a', '2026-05-02T08:00:00'), { ...photo('x', '2026-05-03T08:00:00'), plantId: 'q' }];
    expect(diaryPhotos(events, 'p').map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('counts the joining day as day 1', () => {
    expect(growDay(plant, photo('a', '2026-05-01T22:00:00'))).toBe(1);
    expect(growDay(plant, photo('a', '2026-05-15T07:00:00'))).toBe(15);
  });

  it('names the stage a photo was taken in', () => {
    const events = [stage('2026-05-10T08:00:00', 'growing'), stage('2026-06-01T08:00:00', 'flowering')];
    expect(stageAtPhoto(plant, events, photo('a', '2026-05-20T08:00:00'))).toBe('growing');
    expect(stageAtPhoto(plant, events, photo('a', '2026-05-05T08:00:00'))).toBeUndefined();
    expect(stageAtPhoto(plant, [], photo('a', '2026-05-05T08:00:00'))).toBe('flowering');
    expect(stageAtPhoto(plant, events, photo('a', '2026-05-05T08:00:00', { stage: 'seedling' }))).toBe('seedling');
  });
});
