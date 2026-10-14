import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-native-async-storage/async-storage', () => {
  const mem = new Map<string, string>();
  return {
    default: {
      getItem: async (k: string) => mem.get(k) ?? null,
      setItem: async (k: string, v: string) => void mem.set(k, v),
      removeItem: async (k: string) => void mem.delete(k),
    },
  };
});

const { usePlantStore, DEFAULT_PROFILE } = await import('./plantStore');

const now = new Date('2026-10-14T09:00:00');
const base = {
  speciesId: 'pothos' as const,
  potColor: 'blue' as const,
  soil: 'potting_mix' as const,
  potMaterial: 'plastic' as const,
  potDiameterCm: 15,
  light: 'bright' as const,
  placement: 'indoor' as const,
  origin: 'bought' as const,
  acquiredAt: now.toISOString(),
};

beforeEach(() => {
  usePlantStore.setState({ profile: DEFAULT_PROFILE, plants: [], events: [], onboarded: true, undo: {} });
});

describe('plant store', () => {
  it('reschedules when care-relevant details change, not when renamed', () => {
    const s = usePlantStore.getState();
    const p = s.addPlant({ ...base, name: 'Queenie' }, now);
    s.updatePlant(p.id, { name: 'Queen' }, now);
    expect(usePlantStore.getState().plants[0].nextCheckAt).toBe(p.nextCheckAt);
    s.updatePlant(p.id, { soil: 'gritty' }, now);
    expect(usePlantStore.getState().plants[0].nextCheckAt < p.nextCheckAt).toBe(true);
  });

  it('graduates a rooted cutting into normal checks', () => {
    const s = usePlantStore.getState();
    const mum = s.addPlant({ ...base, name: 'Mum' }, now);
    const kid = s.takeCutting(mum.id, 'Rootie', 'water', now)!;
    expect(kid.rooting).toBeDefined();
    s.markRooted(kid.id, { soil: 'chunky_aroid', potDiameterCm: 10 }, new Date('2026-11-04T09:00:00'));
    const after = usePlantStore.getState().plants.find((p) => p.id === kid.id)!;
    expect(after.rooting).toBeUndefined();
    expect(after.soil).toBe('chunky_aroid');
    expect(usePlantStore.getState().events.some((e) => e.type === 'rooted' && e.plantId === kid.id)).toBe(true);
  });

  it('keeps lineage when a middle generation is deleted', () => {
    const s = usePlantStore.getState();
    const gran = s.addPlant({ ...base, name: 'Gran' }, now);
    const mum = s.takeCutting(gran.id, 'Mum', 'water', now)!;
    const kid = s.takeCutting(mum.id, 'Kid', 'water', now)!;
    s.deletePlant(mum.id);
    expect(usePlantStore.getState().plants.find((p) => p.id === kid.id)?.parentId).toBe(gran.id);
  });

  it('archives without losing the plant', () => {
    const s = usePlantStore.getState();
    const p = s.addPlant({ ...base, name: 'Cal' }, now);
    s.archivePlant(p.id, 'gifted', now);
    const after = usePlantStore.getState().plants[0];
    expect(after.archivedReason).toBe('gifted');
    expect(after.archivedAt).toBe(now.toISOString());
  });

  it('logs stages, harvests, regrowth and photos', () => {
    const s = usePlantStore.getState();
    const p = s.addPlant({ ...base, speciesId: 'spring-onion', name: 'Scallie' }, now);
    s.setStage(p.id, 'harvesting', now);
    s.logHarvest(p.id, 2, 'bunch', ' first! ', now);
    s.logRegrow(p.id, now);
    s.logRegrow(p.id, now);
    s.addPhoto(p.id, 'file:///photo.jpg', undefined, now);
    const st = usePlantStore.getState();
    expect(st.plants[0]).toMatchObject({ stage: 'harvesting', regrowCount: 2, photoUri: 'file:///photo.jpg' });
    expect(st.events.find((e) => e.type === 'harvest')).toMatchObject({ amount: 2, unit: 'bunch', note: 'first!' });
  });
});
