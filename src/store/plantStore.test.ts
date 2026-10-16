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
    const p = s.addPlant({ ...base, name: 'Queenie' }, now, { firstCheck: 'scheduled' });
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

  it('schedules "other" plants by their care type', () => {
    const s = usePlantStore.getState();
    const cactus = s.addPlant({ ...base, speciesId: 'other-succulent', custom: { commonName: 'Bunny ear' }, soil: 'gritty', name: 'Bun' }, now, { firstCheck: 'scheduled' });
    const fern = s.addPlant({ ...base, speciesId: 'other-moisture', custom: { commonName: 'Bird nest fern' }, soil: 'gritty', name: 'Nest' }, now, { firstCheck: 'scheduled' });
    expect(cactus.nextCheckAt > fern.nextCheckAt).toBe(true);
  });

  it('asks for a first soil check on the day a plant joins', () => {
    const p = usePlantStore.getState().addPlant({ ...base, name: 'New' }, now);
    expect(p.nextCheckAt).toBe(now.toISOString());
  });

  it('erases everything but remembers the tip', () => {
    usePlantStore.setState({ profile: { ...DEFAULT_PROFILE, supporter: true, theme: 'dark' } });
    usePlantStore.getState().addPlant({ ...base, name: 'Gone' }, now);
    usePlantStore.getState().eraseEverything();
    const st = usePlantStore.getState();
    expect(st.plants).toEqual([]);
    expect(st.onboarded).toBe(false);
    expect(st.profile).toMatchObject({ supporter: true, theme: 'system' });
  });
});

describe('supporter thank-you', () => {
  it('dates the first tip and keeps that date', () => {
    usePlantStore.getState().setProfile({ supporter: true }, now);
    usePlantStore.getState().setProfile({ supporter: true }, new Date('2026-12-01T09:00:00'));
    expect(usePlantStore.getState().profile.supporterSince).toBe(now.toISOString());
  });

  it('carries a tip in from a backup, and never drops one already on this phone', () => {
    const data = { plants: [], events: [] };
    usePlantStore.getState().restoreBackup({ ...data, profile: { supporter: true, supporterSince: '2026-01-02T00:00:00.000Z' } });
    expect(usePlantStore.getState().profile).toMatchObject({ supporter: true, supporterSince: '2026-01-02T00:00:00.000Z' });
    usePlantStore.getState().restoreBackup({ ...data, profile: { supporter: false } });
    expect(usePlantStore.getState().profile.supporter).toBe(true);
  });
});

describe('review fixes', () => {
  it('undoing a check keeps the other care logged alongside it', () => {
    const s = usePlantStore.getState();
    const p = s.addPlant({ ...base, name: 'Queenie' }, now);
    s.logCare(p.id, ['water', 'feed', 'repot'], 'New pot!', now);
    expect(usePlantStore.getState().events.map((e) => e.type).sort()).toEqual(['check', 'feed', 'note', 'repot', 'water']);
    usePlantStore.getState().undoLastCheck(p.id);
    const after = usePlantStore.getState();
    expect(after.events.map((e) => e.type).sort()).toEqual(['feed', 'note', 'repot']);
    const plant = after.plants[0];
    expect(plant.lastCheckAt).toBeUndefined();
    expect(plant.nextCheckAt).toBe(p.nextCheckAt);
    // The repot itself stays.
    expect(plant.lastRepottedAt).toBe(now.toISOString());
  });

  it('re-paces upcoming checks when the climate changes', () => {
    const winter = new Date('2026-12-15T09:00:00');
    const s = usePlantStore.getState();
    const p = s.addPlant({ ...base, name: 'Queenie' }, winter, { firstCheck: 'scheduled' });
    const before = new Date(p.nextCheckAt).getTime() - winter.getTime();
    // Seattle December (×1.55 indoors) → Accra December (×0.8): checks come much sooner.
    usePlantStore.getState().setProfile({ climate: 'accra', city: 'Accra' }, winter);
    const after = new Date(usePlantStore.getState().plants[0].nextCheckAt).getTime() - winter.getTime();
    expect(after / before).toBeCloseTo(0.8 / 1.55, 2);
    // Other profile changes leave schedules alone.
    const stamp = usePlantStore.getState().plants[0].nextCheckAt;
    usePlantStore.getState().setProfile({ faces: 'off' }, winter);
    expect(usePlantStore.getState().plants[0].nextCheckAt).toBe(stamp);
  });
});
