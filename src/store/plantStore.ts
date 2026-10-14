import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { applyCheck, initialNextCheck } from '../engine/careEngine';
import { SPECIES } from '../data/species';
import type { CareEvent, CheckResult, ClimateProfile, EdibleStage, Plant } from '../types';

export type FaceStyle = 'full' | 'gentle' | 'off';

export interface Profile {
  climate: ClimateProfile;
  city: string;
  faces: FaceStyle;
  grows: { houseplants: boolean; edibles: boolean; cuttings: boolean };
  /** Daily plant round reminder. */
  round: { enabled: boolean; hour: number; minute: number };
  /** Appearance: follow the phone, or force light/dark. */
  theme: 'system' | 'light' | 'dark';
  /** Cached PlantFam Plus entitlement (RevenueCat is the source of truth on device). */
  plus: boolean;
  /** Streak repairs left this month (free; refilled monthly). */
  streakFreezes: number;
}

export const DEFAULT_PROFILE: Profile = {
  climate: 'seattle',
  city: 'Seattle',
  faces: 'full',
  grows: { houseplants: true, edibles: true, cuttings: true },
  round: { enabled: true, hour: 8, minute: 30 },
  theme: 'system',
  plus: false,
  streakFreezes: 2,
};

export type CareAction = 'water' | 'wet' | 'feed' | 'repot' | 'prune' | 'pest' | 'cutting' | 'photo';

export type NewPlant =Omit<Plant, 'id' | 'k' | 'nextCheckAt' | 'createdAt' | 'lastCheckAt' | 'lastResult'>;

interface PlantState {
  profile: Profile;
  plants: Plant[];
  events: CareEvent[];
  /** Set after the user has seen onboarding. */
  onboarded: boolean;
  /** Plant state before its last check, so the round can offer Undo. Not persisted. */
  undo: Record<string, Plant>;
  setProfile: (p: Partial<Profile>) => void;
  completeOnboarding: () => void;
  addPlant: (p: NewPlant, now?: Date) => Plant;
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
}

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

function schedule(plant: Omit<Plant, 'nextCheckAt'>, climate: ClimateProfile, at: Date): string {
  return initialNextCheck({ group: SPECIES[plant.speciesId].group, plant, profile: climate, at });
}

export const usePlantStore = create<PlantState>()(
  persist(
    (set, get) => ({
      profile: DEFAULT_PROFILE,
      plants: [],
      events: [],
      onboarded: false,
      undo: {},

      setProfile: (p) => set((s) => ({ profile: { ...s.profile, ...p } })),
      completeOnboarding: () => set({ onboarded: true }),

      addPlant: (input, now = new Date()) => {
        const base = { ...input, id: uid(), k: 1, createdAt: now.toISOString() };
        const plant: Plant = { ...base, nextCheckAt: schedule(base, get().profile.climate, now) };
        set((s) => ({ plants: [...s.plants, plant] }));
        return plant;
      },

      logCheck: (plantId, result, now = new Date()) => {
        const { plants, profile } = get();
        const plant = plants.find((p) => p.id === plantId);
        if (!plant) return '';
        const out = applyCheck({ group: SPECIES[plant.speciesId].group, plant, profile: profile.climate, at: now }, result);
        const events: CareEvent[] = [{ id: uid(), plantId, type: 'check', result, at: now.toISOString() }];
        if (out.watered) events.push({ id: uid(), plantId, type: 'water', at: now.toISOString() });
        set((s) => ({
          plants: s.plants.map((p) =>
            p.id === plantId
              ? { ...p, k: out.k, nextCheckAt: out.nextCheckAt, lastCheckAt: now.toISOString(), lastResult: result }
              : p,
          ),
          events: [...s.events, ...events],
          undo: { ...s.undo, [plantId]: plant },
        }));
        return out.message;
      },

      undoLastCheck: (plantId) => {
        const s = get();
        const before = s.undo[plantId];
        if (!before) return;
        const lastCheckAt = s.plants.find((p) => p.id === plantId)?.lastCheckAt;
        const { [plantId]: _used, ...rest } = s.undo;
        set({
          plants: s.plants.map((p) => (p.id === plantId ? before : p)),
          events: s.events.filter((e) => !(e.plantId === plantId && e.at === lastCheckAt)),
          undo: rest,
        });
      },

      logCare: (plantId, actions, note, now = new Date()) => {
        const plant = get().plants.find((p) => p.id === plantId);
        if (!plant || actions.length === 0) return 0;
        // Watering and "still wet" are soil answers, so they go through the care engine.
        if (actions.includes('water')) get().logCheck(plantId, 'dry', now);
        else if (actions.includes('wet')) get().logCheck(plantId, 'damp', now);
        const at = now.toISOString();
        const extra: CareEvent[] = [];
        for (const a of actions) {
          if (a === 'feed') extra.push({ id: uid(), plantId, type: 'feed', at });
          if (a === 'prune') extra.push({ id: uid(), plantId, type: 'prune', at });
          if (a === 'pest') extra.push({ id: uid(), plantId, type: 'pest', at });
          if (a === 'photo') extra.push({ id: uid(), plantId, type: 'photo', at });
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
          events: [...s.events, { id: uid(), plantId, type: 'regrow', at }],
        }));
      },

      addPhoto: (plantId, uri, note, now = new Date()) => {
        set((s) => ({
          plants: s.plants.map((p) => (p.id === plantId ? { ...p, photoUri: uri } : p)),
          events: [...s.events, { id: uid(), plantId, type: 'photo', photoUri: uri, note: note?.trim() || undefined, at: now.toISOString() }],
        }));
      },

      seedDemo: (now = new Date()) => {
        if (get().plants.length) return;
        const add = get().addPlant;
        const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
        const mother = add({ name: 'Kitchen Queen', speciesId: 'pothos', potColor: 'blue', soil: 'potting_mix', potMaterial: 'plastic', potDiameterCm: 18, light: 'medium', placement: 'indoor', room: 'Kitchen', origin: 'bought', acquiredAt: daysAgo(900) }, now);
        const queenie = add({ name: 'Queenie', speciesId: 'pothos', potColor: 'blue', soil: 'chunky_aroid', potMaterial: 'plastic', potDiameterCm: 15, light: 'bright', placement: 'indoor', room: 'Living room', origin: 'cutting', parentId: mother.id, acquiredAt: daysAgo(210) }, now);
        add({ name: 'Big Fig', speciesId: 'fig', potColor: 'coral', soil: 'potting_mix', potMaterial: 'glazed', potDiameterCm: 25, light: 'bright', placement: 'indoor', room: 'Bedroom', origin: 'bought', acquiredAt: daysAgo(300) }, now);
        add({ name: 'Cal', speciesId: 'calathea', potColor: 'grape', soil: 'potting_mix', potMaterial: 'plastic', potDiameterCm: 15, light: 'medium', placement: 'indoor', room: 'Bathroom', origin: 'gift', acquiredAt: daysAgo(120) }, now);
        add({ name: 'Monty', speciesId: 'monstera', potColor: 'yellow', soil: 'chunky_aroid', potMaterial: 'terracotta', potDiameterCm: 22, light: 'bright', placement: 'indoor', room: 'Living room', origin: 'bought', acquiredAt: daysAgo(400) }, now);
        add({ name: 'Snakey', speciesId: 'snake', potColor: 'coral', soil: 'gritty', potMaterial: 'terracotta', potDiameterCm: 15, light: 'medium', placement: 'indoor', room: 'Bedroom', origin: 'bought', acquiredAt: daysAgo(500) }, now);
        add({ name: 'Tommy', speciesId: 'tomato', potColor: 'yellow', soil: 'veg_mix', potMaterial: 'fabric', potDiameterCm: 38, light: 'direct', placement: 'covered_outdoor', room: 'Balcony', origin: 'bought', acquiredAt: daysAgo(200) }, now);
        add({ name: 'Chili', speciesId: 'pepper', potColor: 'coral', soil: 'veg_mix', potMaterial: 'fabric', potDiameterCm: 25, light: 'direct', placement: 'covered_outdoor', room: 'Balcony', origin: 'bought', acquiredAt: daysAgo(180) }, now);
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
            dueIds.has(p.id) || p.name === 'Big Fig' || p.name === 'Cal'
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
