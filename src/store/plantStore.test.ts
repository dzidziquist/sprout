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

  it('tags edible photos with their stage and falls back to the newest photo on removal', () => {
    const s = usePlantStore.getState();
    const p = s.addPlant({ ...base, speciesId: 'spring-onion', name: 'Scallie' }, now);
    s.setStage(p.id, 'growing', now);
    s.addPhoto(p.id, 'diary/a.jpg', undefined, new Date('2026-05-01T09:00:00Z'));
    s.addPhoto(p.id, 'diary/b.jpg', undefined, new Date('2026-05-08T09:00:00Z'));
    const photos = usePlantStore.getState().events.filter((e) => e.type === 'photo');
    expect(photos[0].stage).toBe('growing');
    usePlantStore.getState().removePhoto(photos[1].id);
    expect(usePlantStore.getState().plants[0].photoUri).toBe('diary/a.jpg');
    usePlantStore.getState().removePhoto(photos[0].id);
    expect(usePlantStore.getState().plants[0].photoUri).toBeUndefined();
    expect(usePlantStore.getState().events.some((e) => e.type === 'photo')).toBe(false);
  });

  it('backdates a cutting that was already rooting', () => {
    const s = usePlantStore.getState();
    const mum = s.addPlant({ ...base, name: 'Mum' }, now);
    const taken = new Date(now.getTime() - 14 * 86400000);
    const kid = s.takeCutting(mum.id, 'Kid', 'water', taken)!;
    expect(kid.rooting?.startedAt).toBe(taken.toISOString());
    expect(kid.acquiredAt).toBe(taken.toISOString());
    expect(usePlantStore.getState().events.find((e) => e.type === 'cutting')?.at).toBe(taken.toISOString());
  });

  it('moves the day a plant was gifted, never before it joined', () => {
    const s = usePlantStore.getState();
    const p = s.addPlant({ ...base, name: 'Gift', acquiredAt: new Date(now.getTime() - 200 * 86400000).toISOString() }, now);
    s.logCheck(p.id, 'damp', new Date(now.getTime() - 120 * 86400000));
    s.archivePlant(p.id, 'gifted', now);
    usePlantStore.getState().setArchivedAt(p.id, new Date(now.getTime() - 90 * 86400000));
    const st = usePlantStore.getState();
    expect(st.plants[0].archivedAt).toBe(new Date(now.getTime() - 90 * 86400000).toISOString());
    const mine = st.events.filter((e) => e.plantId === p.id);
    expect(mine[mine.length - 1].type).toBe('archived');
    usePlantStore.getState().setArchivedAt(p.id, new Date(now.getTime() - 900 * 86400000));
    expect(usePlantStore.getState().plants[0].archivedAt).toBe(new Date(now.getTime() - 200 * 86400000).toISOString());
    const order = usePlantStore.getState().events.filter((e) => e.plantId === p.id).map((e) => e.type);
    expect(order.indexOf('archived')).toBeLessThan(order.indexOf('check'));
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

describe('past waterings', () => {
  it('plans the first check from when it was last watered, and logs that watering', () => {
    const s = usePlantStore.getState();
    const watered = new Date('2026-10-12T09:00:00');
    const p = s.addPlant({ ...base, name: 'Wet' }, now, { lastWateredAt: watered });
    const scheduled = s.addPlant({ ...base, name: 'Ref' }, watered, { firstCheck: 'scheduled' });
    expect(p.nextCheckAt).toBe(scheduled.nextCheckAt);
    expect(usePlantStore.getState().events.filter((e) => e.plantId === p.id && e.type === 'water').map((e) => e.at)).toEqual([watered.toISOString()]);
  });

  it('lets an existing plant say when it was last watered', () => {
    const s = usePlantStore.getState();
    const p = s.addPlant({ ...base, name: 'Late' }, now);
    expect(p.nextCheckAt).toBe(now.toISOString());
    const yesterday = new Date('2026-10-13T09:00:00');
    usePlantStore.getState().setLastWatered(p.id, yesterday, now);
    const after = usePlantStore.getState().plants.find((x) => x.id === p.id)!;
    expect(after.nextCheckAt > now.toISOString()).toBe(true);
    expect(usePlantStore.getState().events.some((e) => e.plantId === p.id && e.type === 'water' && e.at === yesterday.toISOString())).toBe(true);
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

describe('plant doctor', () => {
  it('saves a diagnosis and moves the booked check along with the new rhythm', () => {
    const s = usePlantStore.getState();
    const p = s.addPlant({ ...base, name: 'Queenie' }, now, { firstCheck: 'scheduled' });
    const wait = new Date(p.nextCheckAt).getTime() - now.getTime();
    s.logDiagnosis(p.id, 'Drooping: thirsty', 'more-water', now);
    const after = usePlantStore.getState().plants[0];
    expect(after.k).toBeLessThan(p.k);
    expect(new Date(after.nextCheckAt).getTime() - now.getTime()).toBeCloseTo(wait * 0.85, -3);
    expect(usePlantStore.getState().events.at(-1)).toMatchObject({ type: 'diagnosis', note: 'Drooping: thirsty' });
    s.logDiagnosis(p.id, 'Brown tips: dry air', undefined, now);
    expect(usePlantStore.getState().plants[0].nextCheckAt).toBe(after.nextCheckAt);
  });
});

describe('review fixes', () => {
  it('brings a plant back from In memory due now, with a diary entry', () => {
    const s = usePlantStore.getState();
    const p = s.addPlant({ ...base, name: 'Lazarus' }, now, { firstCheck: 'scheduled' });
    s.archivePlant(p.id, 'died', now);
    const back = new Date('2026-12-01T10:00:00');
    s.restorePlant(p.id, back);
    const plant = usePlantStore.getState().plants[0];
    expect(plant.archivedAt).toBeUndefined();
    expect(plant.nextCheckAt).toBe(back.toISOString());
    expect(usePlantStore.getState().events.at(-1)).toMatchObject({ type: 'restored', plantId: p.id });
  });

  it('keeps a trip that just ended when the next one starts today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-18T15:00:00'));
    try {
      const s = usePlantStore.getState();
      s.planTrip({ from: '2026-10-10T00:00:00', to: '2026-10-20T00:00:00' });
      s.endTrip(new Date());
      s.planTrip({ from: '2026-10-18T00:00:00', to: '2026-10-25T00:00:00' });
      expect(usePlantStore.getState().profile.trips?.map((t) => t.from)).toEqual(['2026-10-10T00:00:00', '2026-10-18T00:00:00']);
      // A trip still under way is replaced, not doubled.
      s.planTrip({ from: '2026-10-18T00:00:00', to: '2026-10-30T00:00:00' });
      expect(usePlantStore.getState().profile.trips?.map((t) => t.to)).toEqual([expect.any(String), '2026-10-30T00:00:00']);
      expect(usePlantStore.getState().profile.trips).toHaveLength(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it('only restores archived plants, and drops a stale undo when it does', () => {
    const s = usePlantStore.getState();
    const p = s.addPlant({ ...base, name: 'Steady' }, now, { firstCheck: 'scheduled' });
    s.restorePlant(p.id, new Date('2026-12-01T10:00:00'));
    expect(usePlantStore.getState().plants[0].nextCheckAt).toBe(p.nextCheckAt);
    expect(usePlantStore.getState().events.some((e) => e.type === 'restored')).toBe(false);
    s.logCheck(p.id, 'dry', now);
    s.archivePlant(p.id, 'gifted', now);
    expect(usePlantStore.getState().undo[p.id]).toBeUndefined();
  });

  it('remembers on each check when the next one was booked, and keeps it up to date', () => {
    const s = usePlantStore.getState();
    const p = s.addPlant({ ...base, name: 'Booked' }, now);
    s.logCheck(p.id, 'dry', now);
    const check = () => usePlantStore.getState().events.find((e) => e.type === 'check')!;
    expect(check().nextAt).toBe(usePlantStore.getState().plants[0].nextCheckAt);
    s.logDiagnosis(p.id, 'Drooping: thirsty', 'more-water', now);
    expect(check().nextAt).toBe(usePlantStore.getState().plants[0].nextCheckAt);
    s.updatePlant(p.id, { soil: 'gritty' }, now);
    expect(check().nextAt).toBe(usePlantStore.getState().plants[0].nextCheckAt);
  });

  it('never lets an edit wipe time already spent overdue out of the streak', () => {
    const s = usePlantStore.getState();
    const p = s.addPlant({ ...base, name: 'Late' }, now);
    s.logCheck(p.id, 'dry', now);
    const booked = usePlantStore.getState().events.find((e) => e.type === 'check')!.nextAt!;
    // A month later, long overdue: a pot change books a new date but the old one stays on the check.
    const later = new Date(new Date(booked).getTime() + 30 * 86400000);
    s.updatePlant(p.id, { soil: 'gritty' }, later);
    expect(usePlantStore.getState().events.find((e) => e.type === 'check')!.nextAt).toBe(booked);
  });

  it('drops the undo once the schedule moves after a check', () => {
    const s = usePlantStore.getState();
    const p = s.addPlant({ ...base, name: 'Moved' }, now);
    s.logCheck(p.id, 'damp', now);
    s.updatePlant(p.id, { potDiameterCm: 25 }, now);
    expect(usePlantStore.getState().undo[p.id]).toBeUndefined();
  });

  it('treats a watering from long ago as due now, not overdue', () => {
    const s = usePlantStore.getState();
    const p = s.addPlant({ ...base, name: 'Parched' }, now, { lastWateredAt: new Date('2026-08-01T09:00:00') });
    expect(p.nextCheckAt).toBe(now.toISOString());
    s.setLastWatered(p.id, new Date('2026-08-01T09:00:00'), now);
    expect(usePlantStore.getState().plants[0].nextCheckAt).toBe(now.toISOString());
  });

  it('forgets undo for a deleted plant', () => {
    const s = usePlantStore.getState();
    const p = s.addPlant({ ...base, name: 'Gone' }, now);
    s.logCheck(p.id, 'dry', now);
    expect(usePlantStore.getState().undo[p.id]).toBeDefined();
    s.deletePlant(p.id);
    expect(usePlantStore.getState().undo[p.id]).toBeUndefined();
  });
});

describe('second review fixes', () => {
  it('keeps an overdue slip in the streak when the schedule moves before the next check', async () => {
    const { lapsesFor } = await import('../engine/streak');
    const s = usePlantStore.getState();
    const start = new Date('2026-09-01T09:00:00');
    const p = s.addPlant({ ...base, name: 'Late', acquiredAt: start.toISOString() }, start);
    s.logCheck(p.id, 'dry', start);
    const later = new Date('2026-10-14T09:00:00');
    const before = lapsesFor(usePlantStore.getState().plants[0], usePlantStore.getState().events, 'seattle', later);
    expect(before.length).toBeGreaterThan(0);
    s.updatePlant(p.id, { potDiameterCm: 20 }, later);
    expect(lapsesFor(usePlantStore.getState().plants[0], usePlantStore.getState().events, 'seattle', later)).toEqual(before);
  });
});

describe('archive dates after a return', () => {
  it('never moves a second goodbye before the plant came back', () => {
    const s = usePlantStore.getState();
    const day = (n: number) => new Date(new Date('2026-09-01T09:00:00').getTime() + n * 86400000);
    const p = s.addPlant({ ...base, name: 'Boomerang', acquiredAt: day(0).toISOString() }, day(0));
    s.archivePlant(p.id, 'gifted', day(3));
    s.restorePlant(p.id, day(30));
    s.archivePlant(p.id, 'gifted', day(31));
    s.setArchivedAt(p.id, day(10));
    expect(usePlantStore.getState().plants[0].archivedAt).toBe(day(30).toISOString());
  });
});
