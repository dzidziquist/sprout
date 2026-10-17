import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { addDays, applyCheck, initialNextCheck, MAX_INTERVAL_DAYS, seasonMultiplier } from '../engine/careEngine';
import { speciesOf } from '../data/species';
import type { Spot } from '../lib/spots';
import type { CareEvent, CheckResult, ClimateProfile, EdibleStage, Plant, Accent } from '../types';

export type FaceStyle = 'full' | 'gentle' | 'off';

export interface Profile {
  climate: ClimateProfile;
  city: string;
  faces: FaceStyle;
  /** Where they grow (onboarding / Settings). Picks each new plant's default spot. Empty: species defaults. */
  spots: Spot[];
  /** hydro: grows in LECA or water too (shows the medium choice up front when adding). */
  grows: { houseplants: boolean; edibles: boolean; cuttings: boolean; hydro?: boolean };
  /** Daily plant round reminder. */
  round: { enabled: boolean; hour: number; minute: number };
  /** "Photo day" nudge for progress photos, riding along with the round. */
  photos: 'off' | 'weekly' | 'monthly';
  /** Appearance: follow the phone, or force light/dark. */
  theme: 'system' | 'light' | 'dark';
  /** Main colour; leaf green unless changed. */
  accent?: Accent;
  /** Has left a tip in the tip jar. Nothing is locked; it powers the thank-you gifts (badge, gold cards, party hat). */
  supporter: boolean;
  /** When the first tip was noticed on this phone: the supporter badge's date. */
  supporterSince?: string;
  /** Streak repairs left this month (free; refilled monthly). */
  streakFreezes: number;
  /** The "how to check soil" coach on Today was dismissed. */
  coachDismissed: boolean;
  /** When the user last saved a backup file. */
  lastBackupAt?: string;
  /** Temperatures and rain: 'auto' follows the climate (Seattle °F, Accra °C). */
  units: 'auto' | 'imperial' | 'metric';
  /** Photo IDs used today on this phone (free, with a small daily allowance). */
  idUsage: { day: string; count: number };
}

export const DEFAULT_PROFILE: Profile = {
  climate: 'seattle',
  city: 'Seattle',
  faces: 'full',
  spots: [],
  grows: { houseplants: true, edibles: true, cuttings: true, hydro: false },
  round: { enabled: true, hour: 8, minute: 30 },
  photos: 'monthly',
  theme: 'system',
  supporter: false,
  streakFreezes: 2,
  coachDismissed: false,
  units: 'auto',
  idUsage: { day: '', count: 0 },
};

export type CareAction = 'water' | 'wet' | 'refresh' | 'feed' | 'repot' | 'prune' | 'pest' | 'cutting' | 'photo';

export type NewPlant =Omit<Plant, 'id' | 'k' | 'nextCheckAt' | 'createdAt' | 'lastCheckAt' | 'lastResult'>;

interface PlantState {
  profile: Profile;
  plants: Plant[];
  events: CareEvent[];
  /** Set after the user has seen onboarding. */
  onboarded: boolean;
  /**
   * What the last check changed, so the round can offer Undo: the plant's schedule before it, and the
   * events the check itself created (care logged alongside it stays). Not persisted.
   */
  undo: Record<string, CheckUndo>;
  /** Changing the climate re-paces every upcoming check to the new seasons. */
  setProfile: (p: Partial<Profile>, now?: Date) => void;
  completeOnboarding: () => void;
  /**
   * New plants get their first soil check today by default: we don't know when it was last watered,
   * and one real answer calibrates far better than a guess. Demo plants use the modelled schedule.
   */
  addPlant: (p: NewPlant, now?: Date, opts?: { firstCheck?: 'today' | 'scheduled'; lastWateredAt?: Date }) => Plant;
  /** "It was last watered on…": logs that watering and plans the next check from it. */
  setLastWatered: (plantId: string, at: Date, now?: Date) => void;
  /** Records a soil check and reschedules. Returns the kind message to show. */
  logCheck: (plantId: string, result: CheckResult, now?: Date) => string;
  undoLastCheck: (plantId: string) => void;
  /** Multi-select care log from the Log care sheet. Returns how many things were logged. */
  logCare: (plantId: string, actions: CareAction[], note?: string, now?: Date) => number;
  takeCutting: (parentId: string, name: string, method: NonNullable<Plant['rooting']>['method'], now?: Date) => Plant | undefined;
  seedDemo: (now?: Date) => void;
  /** Edit a plant's details. Changing soil, pot or light reschedules the next check. */
  updatePlant: (plantId: string, patch: Partial<NewPlant>, now?: Date) => void;
  /** Plants are never hard-deleted from lineage: archived plants leave the round but stay in Offshoots. */
  archivePlant: (plantId: string, reason: NonNullable<Plant['archivedReason']>, now?: Date) => void;
  /** Hard delete (mistakes only). Children keep their lineage by pointing to the grandparent. */
  deletePlant: (plantId: string) => void;
  /** A rooting cutting is ready: pot it up and start normal checks. */
  markRooted: (plantId: string, pot: { soil: Plant['soil']; potDiameterCm: number }, now?: Date) => void;
  setStage: (plantId: string, stage: EdibleStage, now?: Date) => void;
  logHarvest: (plantId: string, amount: number, unit: string, note?: string, now?: Date) => void;
  /** Spring onions: cut and let it regrow. */
  logRegrow: (plantId: string, now?: Date) => void;
  addPhoto: (plantId: string, uri: string, note?: string, now?: Date) => void;
  /** Take a photo out of the diary. The plant's cover falls back to the newest photo left. */
  removePhoto: (eventId: string) => void;
  /** Replace plants and history with a validated backup. Keeps purchase state and app plumbing. */
  restoreBackup: (data: { profile: Partial<Profile>; plants: Plant[]; events: CareEvent[] }) => void;
  /** Erase every plant, diary entry and setting on this phone and start onboarding again. Purchases stay with the Apple ID. */
  eraseEverything: () => void;
}

type CheckUndo = { before: Pick<Plant, 'k' | 'nextCheckAt' | 'lastCheckAt' | 'lastResult'>; eventIds: string[] };

/**
 * Scale the time left until each upcoming check by how the season multiplier changes between the old
 * and new climate today. Overdue plants stay due; rooting cuttings and archived plants have no checks.
 */
function repace(plants: Plant[], from: ClimateProfile, to: ClimateProfile, now: Date): Plant[] {
  return plants.map((p) => {
    if (p.rooting || p.archivedAt) return p;
    const left = new Date(p.nextCheckAt).getTime() - now.getTime();
    if (left <= 0) return p;
    const ratio = seasonMultiplier(to, p.placement, now) / seasonMultiplier(from, p.placement, now);
    const days = Math.min(MAX_INTERVAL_DAYS, (left * ratio) / 86400000);
    return { ...p, nextCheckAt: addDays(now, days).toISOString() };
  });
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function schedule(plant: Omit<Plant, 'nextCheckAt'>, climate: ClimateProfile, at: Date): string {
  return initialNextCheck({ group: speciesOf(plant).group, plant, profile: climate, at });
}

export const usePlantStore = create<PlantState>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      plants: [],
      events: [],
      onboarded: false,
      undo: {},

      setProfile: (p, now = new Date()) =>
        set((s) => {
          const profile = { ...s.profile, ...p };
          if (profile.supporter && !profile.supporterSince) profile.supporterSince = now.toISOString();
          const moved = p.climate !== undefined && JSON.stringify(p.climate) !== JSON.stringify(s.profile.climate);
          return moved ? { profile, plants: repace(s.plants, s.profile.climate, profile.climate, now) } : { profile };
        }),
      completeOnboarding: () => set({ onboarded: true }),

      addPlant: (input, now = new Date(), opts) => {
        const base = { ...input, id: uid(), k: 1, createdAt: now.toISOString() };
        const climate = get().profile.climate;
        // Knowing when it was last watered beats a same-day check: plan from that watering instead.
        const watered = opts?.lastWateredAt && !input.rooting ? opts.lastWateredAt : undefined;
        const today = !watered && (opts?.firstCheck ?? 'today') === 'today' && !input.rooting;
        const nextCheckAt = watered ? schedule(base, climate, watered) : today ? now.toISOString() : schedule(base, climate, now);
        const plant: Plant = { ...base, nextCheckAt };
        set((s) => ({
          plants: [...s.plants, plant],
          events: watered ? [...s.events, { id: uid(), plantId: plant.id, type: 'water', at: watered.toISOString() }] : s.events,
        }));
        return plant;
      },

      setLastWatered: (plantId, at, now = new Date()) => {
        const plant = get().plants.find((p) => p.id === plantId);
        if (!plant || plant.rooting) return;
        const when = at.getTime() > now.getTime() ? now : at;
        set((s) => ({
          plants: s.plants.map((p) => (p.id === plantId ? { ...p, nextCheckAt: schedule(p, s.profile.climate, when) } : p)),
          events: [...s.events, { id: uid(), plantId, type: 'water', at: when.toISOString() }],
        }));
      },

      logCheck: (plantId, result, now = new Date()) => {
        const { plants, profile } = get();
        const plant = plants.find((p) => p.id === plantId);
        if (!plant) return '';
        const out = applyCheck({ group: speciesOf(plant).group, plant, profile: profile.climate, at: now }, result);
        const events: CareEvent[] = [{ id: uid(), plantId, type: 'check', result, at: now.toISOString() }];
        if (out.watered) events.push({ id: uid(), plantId, type: 'water', at: now.toISOString() });
        set((s) => ({
          plants: s.plants.map((p) =>
            p.id === plantId
              ? { ...p, k: out.k, nextCheckAt: out.nextCheckAt, lastCheckAt: now.toISOString(), lastResult: result }
              : p,
          ),
          events: [...s.events, ...events],
          undo: {
            ...s.undo,
            [plantId]: { before: { k: plant.k, nextCheckAt: plant.nextCheckAt, lastCheckAt: plant.lastCheckAt, lastResult: plant.lastResult }, eventIds: events.map((e) => e.id) },
          },
        }));
        return out.message;
      },

      undoLastCheck: (plantId) => {
        const s = get();
        const entry = s.undo[plantId];
        if (!entry) return;
        const { [plantId]: _used, ...rest } = s.undo;
        const ids = new Set(entry.eventIds);
        set({
          plants: s.plants.map((p) => (p.id === plantId ? { ...p, ...entry.before } : p)),
          events: s.events.filter((e) => !ids.has(e.id)),
          undo: rest,
        });
      },

      logCare: (plantId, actions, note, now = new Date()) => {
        const plant = get().plants.find((p) => p.id === plantId);
        if (!plant || actions.length === 0) return 0;
        // Watering and "still wet" are soil answers, so they go through the care engine.
        // A full water change (hydro) refills the reservoir too.
        if (actions.includes('water') || actions.includes('refresh')) get().logCheck(plantId, 'dry', now);
        else if (actions.includes('wet')) get().logCheck(plantId, 'damp', now);
        const at = now.toISOString();
        const extra: CareEvent[] = [];
        for (const a of actions) {
          if (a === 'feed') extra.push({ id: uid(), plantId, type: 'feed', at });
          if (a === 'prune') extra.push({ id: uid(), plantId, type: 'prune', at });
          if (a === 'pest') extra.push({ id: uid(), plantId, type: 'pest', at });
          if (a === 'photo') extra.push({ id: uid(), plantId, type: 'photo', at });
          if (a === 'refresh') extra.push({ id: uid(), plantId, type: 'refresh', at });
        }
        if (actions.includes('refresh')) {
          set((s) => ({ plants: s.plants.map((p) => (p.id === plantId ? { ...p, lastRefreshedAt: at } : p)) }));
        }
        if (note?.trim()) extra.push({ id: uid(), plantId, type: 'note', note: note.trim(), at });
        if (actions.includes('repot')) {
          extra.push({ id: uid(), plantId, type: 'repot', at });
          // Fresh mix: forget most of what we learned about the old pot.
          set((s) => ({ plants: s.plants.map((p) => (p.id === plantId ? { ...p, lastRepottedAt: at, k: Math.round(((p.k + 1) / 2) * 100) / 100 } : p)) }));
        }
        if (extra.length) set((s) => ({ events: [...s.events, ...extra] }));
        if (actions.includes('cutting')) {
          const babies = get().plants.filter((p) => p.parentId === plantId).length;
          get().takeCutting(plantId, `${plant.name} baby ${babies + 1}`, 'water', now);
        }
        return actions.length;
      },

      takeCutting: (parentId, name, method, now = new Date()) => {
        const parent = get().plants.find((p) => p.id === parentId);
        if (!parent) return undefined;
        const child = get().addPlant(
          {
            name,
            speciesId: parent.speciesId,
            potColor: parent.potColor,
            soil: method === 'leca' ? 'leca' : method === 'moss' ? 'moss' : 'potting_mix',
            potMaterial: 'plastic',
            potDiameterCm: 8,
            light: parent.light,
            placement: parent.placement,
            room: parent.room,
            origin: 'cutting',
            parentId,
            rooting: { method, startedAt: now.toISOString() },
            acquiredAt: now.toISOString(),
          },
          now,
        );
        set((s) => ({ events: [...s.events, { id: uid(), plantId: parentId, type: 'cutting', at: now.toISOString(), note: child.id }] }));
        return child;
      },

      updatePlant: (plantId, patch, now = new Date()) => {
        const climate = get().profile.climate;
        set((s) => ({
          plants: s.plants.map((p) => {
            if (p.id !== plantId) return p;
            const next = { ...p, ...patch };
            const careChanged = (['soil', 'potMaterial', 'potDiameterCm', 'light', 'placement', 'speciesId'] as const).some((k) => k in patch && patch[k] !== p[k]);
            return careChanged && !next.rooting ? { ...next, nextCheckAt: schedule(next, climate, now) } : next;
          }),
        }));
      },

      archivePlant: (plantId, reason, now = new Date()) => {
        const at = now.toISOString();
        set((s) => ({
          plants: s.plants.map((p) => (p.id === plantId ? { ...p, archivedAt: at, archivedReason: reason } : p)),
          events: [...s.events, { id: uid(), plantId, type: 'archived', note: reason, at }],
        }));
      },

      deletePlant: (plantId) => {
        const gone = get().plants.find((p) => p.id === plantId);
        if (!gone) return;
        set((s) => ({
          plants: s.plants.filter((p) => p.id !== plantId).map((p) => (p.parentId === plantId ? { ...p, parentId: gone.parentId } : p)),
          events: s.events.filter((e) => e.plantId !== plantId),
        }));
      },

      markRooted: (plantId, pot, now = new Date()) => {
        const climate = get().profile.climate;
        const at = now.toISOString();
        set((s) => ({
          plants: s.plants.map((p) => {
            if (p.id !== plantId) return p;
            const { rooting: _done, ...rest } = p;
            const next = { ...rest, soil: pot.soil, potDiameterCm: pot.potDiameterCm, lastRepottedAt: at };
            return { ...next, nextCheckAt: schedule(next, climate, now) };
          }),
          events: [...s.events, { id: uid(), plantId, type: 'rooted', at }],
        }));
      },

      setStage: (plantId, stage, now = new Date()) => {
        const at = now.toISOString();
        set((s) => ({
          plants: s.plants.map((p) => (p.id === plantId ? { ...p, stage, stageAt: at } : p)),
          events: [...s.events, { id: uid(), plantId, type: 'stage', stage, at }],
        }));
      },

      logHarvest: (plantId, amount, unit, note, now = new Date()) => {
        set((s) => ({ events: [...s.events, { id: uid(), plantId, type: 'harvest', amount, unit, note: note?.trim() || undefined, at: now.toISOString() }] }));
      },

      logRegrow: (plantId, now = new Date()) => {
        const at = now.toISOString();
        set((s) => ({
          plants: s.plants.map((p) => (p.id === plantId ? { ...p, regrowCount: (p.regrowCount ?? 0) + 1 } : p)),
          // A cut is a harvest too: it shows up in the basket and earns the first-harvest party.
          events: [...s.events, { id: uid(), plantId, type: 'regrow', at }, { id: uid(), plantId, type: 'harvest', amount: 1, unit: 'bunch', at }],
        }));
      },

      addPhoto: (plantId, uri, note, now = new Date()) => {
        set((s) => ({
          plants: s.plants.map((p) => (p.id === plantId ? { ...p, photoUri: uri } : p)),
          // Edibles remember their stage so the diary can show the grow, stage by stage.
          events: [...s.events, { id: uid(), plantId, type: 'photo', photoUri: uri, stage: s.plants.find((p) => p.id === plantId)?.stage, note: note?.trim() || undefined, at: now.toISOString() }],
        }));
      },

      removePhoto: (eventId) => {
        set((s) => {
          const gone = s.events.find((e) => e.id === eventId && e.type === 'photo');
          if (!gone) return s;
          const events = s.events.filter((e) => e.id !== eventId);
          const latest = events.filter((e) => e.plantId === gone.plantId && e.type === 'photo' && e.photoUri).sort((a, b) => a.at.localeCompare(b.at)).pop();
          return {
            events,
            plants: s.plants.map((p) => (p.id === gone.plantId && p.photoUri === gone.photoUri ? { ...p, photoUri: latest?.photoUri } : p)),
          };
        });
      },

      restoreBackup: (data) => {
        // A tip travels with the backup (consumable tips can't be restored from the App Store), so the
        // thank-you gifts follow someone to a new phone. A tip on this phone is never undone by a restore.
        const { supporter: tipped, supporterSince: since, streakFreezes: _f, lastBackupAt: _b, plus: _p, ...profile } = data.profile as Partial<Profile> & { plus?: boolean };
        const supporter = get().profile.supporter || tipped === true;
        const supporterSince = [get().profile.supporterSince, tipped === true ? since : undefined].filter((d): d is string => !!d).sort()[0];
        set((s) => ({
          plants: data.plants,
          events: data.events,
          undo: {},
          onboarded: true,
          profile: { ...DEFAULT_PROFILE, ...s.profile, ...profile, supporter, supporterSince: supporter ? supporterSince ?? new Date().toISOString() : undefined, streakFreezes: s.profile.streakFreezes, coachDismissed: true },
        }));
      },

      eraseEverything: () => {
        set({ plants: [], events: [], undo: {}, onboarded: false, profile: { ...DEFAULT_PROFILE, supporter: get().profile.supporter, supporterSince: get().profile.supporterSince } });
      },

      seedDemo: (now = new Date()) => {
        if (get().plants.length) return;
        const add = (p: NewPlant, at: Date) => get().addPlant(p, at, { firstCheck: 'scheduled' });
        const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
        const mother = add({ name: 'Kitchen Queen', speciesId: 'pothos', potColor: 'blue', soil: 'potting_mix', potMaterial: 'plastic', potDiameterCm: 18, light: 'medium', placement: 'indoor', room: 'Kitchen', origin: 'bought', acquiredAt: daysAgo(900) }, now);
        const queenie = add({ name: 'Queenie', speciesId: 'pothos', potColor: 'blue', soil: 'chunky_aroid', potMaterial: 'plastic', potDiameterCm: 15, light: 'bright', placement: 'indoor', room: 'Living room', origin: 'cutting', parentId: mother.id, acquiredAt: daysAgo(210) }, now);
        add({ name: 'Big Fig', speciesId: 'fig', potColor: 'coral', soil: 'potting_mix', potMaterial: 'glazed', potDiameterCm: 25, light: 'bright', placement: 'indoor', room: 'Bedroom', origin: 'bought', acquiredAt: daysAgo(300) }, now);
        add({ name: 'Cal', speciesId: 'calathea', potColor: 'grape', soil: 'potting_mix', potMaterial: 'plastic', potDiameterCm: 15, light: 'medium', placement: 'indoor', room: 'Bathroom', origin: 'gift', acquiredAt: daysAgo(120) }, now);
        add({ name: 'Monty', speciesId: 'monstera', potColor: 'yellow', soil: 'chunky_aroid', potMaterial: 'terracotta', potDiameterCm: 22, light: 'bright', placement: 'indoor', room: 'Living room', origin: 'bought', acquiredAt: daysAgo(400) }, now);
        add({ name: 'Snakey', speciesId: 'snake', potColor: 'coral', soil: 'gritty', potMaterial: 'terracotta', potDiameterCm: 15, light: 'medium', placement: 'indoor', room: 'Bedroom', origin: 'bought', acquiredAt: daysAgo(500) }, now);
        add({ name: 'Tommy', speciesId: 'tomato', potColor: 'yellow', soil: 'veg_mix', potMaterial: 'fabric', potDiameterCm: 38, light: 'direct', placement: 'covered_outdoor', room: 'Balcony', origin: 'bought', acquiredAt: daysAgo(200) }, now);
        add({ name: 'Chili', speciesId: 'pepper', potColor: 'coral', soil: 'veg_mix', potMaterial: 'fabric', potDiameterCm: 25, light: 'direct', placement: 'covered_outdoor', room: 'Balcony', origin: 'bought', acquiredAt: daysAgo(180) }, now);
        add({ name: 'Bamboo', speciesId: 'lucky-bamboo', potColor: 'blue', soil: 'water', potMaterial: 'glazed', potDiameterCm: 10, light: 'medium', placement: 'indoor', room: 'Kitchen', origin: 'gift', acquiredAt: daysAgo(90) }, now);
        add({ name: 'Scallie', speciesId: 'spring-onion', potColor: 'blue', soil: 'veg_mix', potMaterial: 'plastic', potDiameterCm: 15, light: 'bright', placement: 'indoor', room: 'Kitchen', origin: 'cutting', acquiredAt: daysAgo(60) }, now);
        set((s) => ({
          plants: s.plants.map((p) =>
            p.name === 'Tommy' ? { ...p, stage: 'fruiting', stageAt: daysAgo(40) } : p.name === 'Chili' ? { ...p, stage: 'fruiting', stageAt: daysAgo(30) } : p.name === 'Scallie' ? { ...p, stage: 'harvesting', stageAt: daysAgo(20), regrowCount: 2 } : p,
          ),
        }));
        get().takeCutting(queenie.id, 'Rootie', 'water', new Date(now.getTime() - 18 * 86400000));
        get().takeCutting(mother.id, 'Sprig', 'moss', new Date(now.getTime() - 40 * 86400000));
        // Make a few plants due today so the first plant round has something to do.
        const dueIds = new Set([queenie.id]);
        set((s) => ({
          plants: s.plants.map((p) =>
            dueIds.has(p.id) || p.name === 'Big Fig' || p.name === 'Cal' || p.name === 'Bamboo'
              ? { ...p, nextCheckAt: daysAgo(0) }
              : p,
          ),
        }));
      },
    }),
    {
      name: 'plantfam-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ profile: s.profile, plants: s.plants, events: s.events, onboarded: s.onboarded }),
      // Keep new profile fields when loading an older saved profile.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<PlantState>;
        return { ...current, ...p, profile: { ...DEFAULT_PROFILE, ...current.profile, ...p.profile } };
      },
    },
  ),
);
