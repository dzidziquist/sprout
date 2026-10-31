import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Trip } from '../engine/away';
import type { AnyRoomLight, RoomLight } from '../engine/light';
import { addDays, applyCheck, initialNextCheck, K_MAX, K_MIN, MAX_INTERVAL_DAYS, seasonMultiplier } from '../engine/careEngine';
import { GRACE_DAYS } from '../engine/streak';
import { speciesOf } from '../data/species';
import type { Spot } from '../lib/spots';
import { SHARED_PROFILE_KEYS, type Member, type SharedProfile, type Synced } from '../engine/household';
import type { CareEvent, CheckResult, ClimateProfile, EdibleStage, Light, Plant, Accent, WishItem } from '../types';

export type FaceStyle = 'full' | 'gentle' | 'off';

/** A place's measured sunlight (lib/site): `key` is the coordinates it was looked up for, `at` when. */
export interface Sunlight {
  key: string;
  clearness: number[];
  at: string;
}

export interface Profile {
  climate: ClimateProfile;
  /** Measured sunlight for the climate's city, refreshed about once a year. */
  sunlight?: Sunlight;
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
  /** Plants tab layout the person last picked. Unset: grid for a small fam, list from 16 plants. */
  jungleView?: 'grid' | 'list' | 'light';
  /** Each room's windows (each with what's in its way), by room name, for the light view. Older saves have one shade per room. */
  rooms?: Record<string, AnyRoomLight>;
  /** No longer used: plant pages always show their light card. Kept so old backups still load. */
  lightTips?: 'important' | 'daily';
  /** Whether the About card (Wikipedia intro) on plant pages starts open. Folded by default. */
  aboutOpen?: boolean;
  /** Plants to get one day. Not part of the jungle: no checks, no streak. */
  wishlist?: WishItem[];
  /** Has left a tip in the tip jar. Nothing is locked; it powers the thank-you gifts (badge, gold cards, party hat). */
  supporter: boolean;
  /** When the first tip was noticed on this phone: the supporter badge's date. */
  supporterSince?: string;
  /** Streak repairs left this month (free; refilled monthly). */
  streakFreezes: number;
  /** The "how to check soil" coach on Today was dismissed. */
  coachDismissed: boolean;
  /** Grow patch jobs ticked off: task id → when. Old ticks are dropped as new ones come in. */
  growTicks: Record<string, string>;
  /** Grow patch jobs skipped (not done, just not for now): task id → when. They last as long as a tick. */
  growSkips?: Record<string, string>;
  /** The grow card on Today, put away by the person: which item (`task:<id>`, `alert:<id>`), and until when (ISO). */
  growHidden?: { key: string; until: string };
  /** When the user last saved a backup file. */
  lastBackupAt?: string;
  /**
   * The weekly iCloud backup (iPhone): on unless turned off. `chain` is this phone's line of backups
   * (see engine/cloudBackup), `lastAt` the last one saved. Stays on the phone: never inside a backup.
   */
  cloudBackup?: { off?: boolean; chain?: string; lastAt?: string };
  /** Household sharing (see engine/household): this phone's place in it. Never inside a backup. */
  household?: Household;
  /** Temperatures and rain: 'auto' follows the climate (Seattle °F, Accra °C). */
  units: 'auto' | 'imperial' | 'metric';
  /** Photo IDs used today on this phone (free, with a small daily allowance). */
  idUsage: { day: string; count: number };
  /** Away-mode trips, past and planned. Past ones stay so the streak keeps forgiving them. */
  trips?: Trip[];
}

export interface Household {
  role: 'owner' | 'member';
  /** Members: the owner's id, which is where the shared jungle lives. */
  owner?: string;
  /** This person's household id. */
  me: string;
  /** What the household calls this person. */
  name: string;
  /** Change token for the next sync. */
  token?: string;
  /** Each record as it was when this phone and iCloud last agreed. */
  synced?: Synced;
  /** Everyone's names, by household id. */
  members?: Record<string, Member>;
  /** Diary photos already in iCloud (sent from here or fetched). */
  photos?: string[];
  /** Members: their own jungle from before joining, given back when they leave. */
  aside?: { plants: Plant[]; events: CareEvent[]; shared: Partial<SharedProfile> };
}

/**
 * A profile with its shared part (see engine/household) replaced by `shared`: anything the household
 * doesn't have is cleared (or back to its default), so this phone's own trips or rooms don't linger and
 * get sent to everyone. Per-phone settings stay as they are.
 */
export function withShared(profile: Profile, shared: Partial<SharedProfile>): Profile {
  const out: Profile = { ...profile };
  for (const k of SHARED_PROFILE_KEYS) {
    if (shared[k] !== undefined) (out as unknown as Record<string, unknown>)[k] = shared[k];
    else if (DEFAULT_PROFILE[k] !== undefined) (out as unknown as Record<string, unknown>)[k] = DEFAULT_PROFILE[k];
    else delete out[k];
  }
  return out;
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
  growTicks: {},
  units: 'auto',
  idUsage: { day: '', count: 0 },
};

export type CareAction = 'water' | 'wet' | 'refresh' | 'feed' | 'repot' | 'prune' | 'pest' | 'cutting' | 'photo' | 'stake';

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
  /**
   * Goes up whenever the whole jungle is swapped (restore, its Undo, erase), so a backup that was
   * already saving can tell its data is gone and not tie its chain to the new one. Not persisted.
   */
  dataEpoch: number;
  /** Changing the climate re-paces every upcoming check to the new seasons. */
  setProfile: (p: Partial<Profile>, now?: Date) => void;
  completeOnboarding: () => void;
  /** Saves the city's measured sunlight (lib/site). Only the light estimates use it, so checks aren't re-paced. */
  setSunlight: (sunlight: Sunlight) => void;
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
  /** Set a room's windows and shade for the light view. */
  setRoomLight: (room: string, light: RoomLight) => void;
  /** Saves a plant for later; saving the same plant again just returns the existing entry. */
  saveWish: (item: Omit<WishItem, 'id' | 'savedAt'>, now?: Date) => WishItem;
  updateWish: (id: string, patch: Pick<WishItem, 'note'>) => void;
  removeWish: (id: string) => void;
  /** Put back a wish that was just removed (Undo), as it was. */
  restoreWish: (wish: WishItem) => void;
  /** Plants are never hard-deleted from lineage: archived plants leave the round but stay in Offshoots. */
  archivePlant: (plantId: string, reason: NonNullable<Plant['archivedReason']>, now?: Date) => void;
  /** "Gifted it months ago": move the day a plant left (and its diary entry) to an earlier date. */
  setArchivedAt: (plantId: string, at: Date) => void;
  /**
   * Keep a camera light reading for where the plant sits, and set its light to what the readings say for
   * this time of year (which re-plans the next check when that changed). The last 12 readings are kept,
   * across the spots it has been in.
   */
  addLightReading: (plantId: string, reading: NonNullable<Plant['lightReadings']>[number], light?: Light, now?: Date) => void;
  /** Undo an archive just made: back as it was, schedule and all (unlike restorePlant, which is a return). */
  undoArchive: (plantId: string) => void;
  /** Back from In memory: due for a check now, and the time away doesn't count against the streak. */
  restorePlant: (plantId: string, now?: Date) => void;
  /** Hard delete (mistakes only). Children keep their lineage by pointing to the grandparent. */
  deletePlant: (plantId: string) => void;
  /** A rooting cutting is ready: pot it up and start normal checks. */
  markRooted: (plantId: string, pot: { soil: Plant['soil']; potDiameterCm: number }, now?: Date) => void;
  setStage: (plantId: string, stage: EdibleStage, now?: Date) => void;
  logHarvest: (plantId: string, amount: number, unit: string, note?: string, now?: Date) => void;
  /** Spring onions: cut and let it regrow. */
  logRegrow: (plantId: string, now?: Date) => void;
  addPhoto: (plantId: string, uri: string, note?: string, now?: Date) => void;
  /** A note on its own, like what you did about bugs. */
  addNote: (plantId: string, note: string, now?: Date) => void;
  /** Rewrite a note (or a photo's caption). Emptying a plain note removes it. */
  editNote: (eventId: string, note: string) => void;
  /** Removes a care entry logged by mistake (see canDeleteEvent). Waterings and checks stay: the rhythm learned from them. */
  deleteEvent: (eventId: string, now?: Date) => void;
  /** Plan a trip (replacing any that hasn't started), or end the current one now. */
  planTrip: (trip: Trip) => void;
  endTrip: (now?: Date) => void;
  /** Tick (or untick) a before-you-go item on the trip that starts at `from`. */
  setPrepDone: (from: string, itemId: string, done: boolean) => void;
  /**
   * Save a plant doctor result to the diary. A confirmed watering cause also nudges how fast this
   * plant is expected to dry out: 'slow-water' spaces checks out, 'more-water' brings them closer.
   */
  logDiagnosis: (plantId: string, note: string, tweak?: 'slow-water' | 'more-water', now?: Date) => void;
  /** Mark plants as staked (or trellised), or take the mark back off. */
  setStaked: (plantIds: string[], on: boolean, now?: Date) => void;
  /** Ticking a feed job in the grow patch logs a feed for its plants; unticking takes back the ones logged since `since`. */
  setFed: (plantIds: string[], on: boolean, now?: Date, since?: string) => void;
  /** Tick a grow patch job off, or untick it. */
  tickGrowTask: (taskId: string, on: boolean, now?: Date) => void;
  /** Skip a grow job for now (or bring it back): it leaves the list like a tick, but nothing is logged. */
  skipGrowTask: (taskId: string, on: boolean, now?: Date) => void;
  /** Take a photo out of the diary. The plant's cover falls back to the newest photo left. */
  removePhoto: (eventId: string) => void;
  /** Replace plants and history with a validated backup. Keeps purchase state and app plumbing. */
  restoreBackup: (data: { profile: Partial<Profile>; plants: Plant[]; events: CareEvent[] }) => void;
  /** Puts back exactly what was on the phone before a restore (its Undo). */
  restoreSnapshot: (snap: { profile: Profile; plants: Plant[]; events: CareEvent[] }) => void;
  /**
   * Household sharing: puts in the jungle as the household has it (plants, diary and the shared settings).
   * `swap` is for joining or leaving, when it's a different jungle altogether (see dataEpoch).
   */
  setJungle: (j: { plants: Plant[]; events: CareEvent[]; shared: Partial<SharedProfile> }, swap?: boolean) => void;
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

/**
 * The plant's latest check remembers when the next one was booked for, so the streak reads the real
 * schedule rather than re-working it out. Anything that moves the schedule before that next check
 * (a new watering date, a pot change, a new climate, the plant doctor) updates it here, but only while
 * the old booking is still within its grace days: time already spent overdue stays overdue, so editing
 * a plant can never wipe a slip out of the streak.
 */
function rebook(events: CareEvent[], moved: Map<string, string>, now: Date): CareEvent[] {
  if (moved.size === 0) return events;
  const latest = new Map<string, number>();
  events.forEach((e, i) => {
    if (e.type !== 'check' || !moved.has(e.plantId)) return;
    const j = latest.get(e.plantId);
    if (j === undefined || e.at >= events[j].at) latest.set(e.plantId, i);
  });
  const graceEnds = (e: CareEvent) => new Date(e.nextAt!).getTime() + GRACE_DAYS * 86400000;
  const at = new Set([...latest.values()].filter((i) => events[i].nextAt && graceEnds(events[i]) > now.getTime()));
  if (at.size === 0) return events;
  return events.map((e, i) => (at.has(i) ? { ...e, nextAt: moved.get(e.plantId) } : e));
}

/** `undo` without the given plants' entries: an undone check would bring back a schedule that has since moved. */
function withoutUndo(undo: Record<string, CheckUndo>, ids: Iterable<string>): Record<string, CheckUndo> {
  const drop = new Set(ids);
  return drop.size ? Object.fromEntries(Object.entries(undo).filter(([id]) => !drop.has(id))) : undo;
}

/** The next check after a watering at `at`, but never before `now`: watered long ago means due now, not overdue. */
function scheduleNotBefore(plant: Omit<Plant, 'nextCheckAt'>, climate: ClimateProfile, at: Date, now: Date): string {
  return new Date(Math.max(new Date(schedule(plant, climate, at)).getTime(), now.getTime())).toISOString();
}

/**
 * Deleting a check or a watering. A check where the soil was dry goes with the watering it logged (one action,
 * two entries), and the other way round.
 * - The latest check: the schedule and learned rhythm go back to just before it (checks saved before this
 *   was kept only get their last-check date back).
 * - An older check: it leaves the list; the small nudge it gave the rhythm stays, and later checks correct it.
 * - The latest watering: the next check is planned from the watering before it (due now if that was long ago,
 *   or today if there's none).
 */
function forgetWatering(s: PlantState, gone: CareEvent, now: Date): Partial<PlantState> {
  const plant = s.plants.find((p) => p.id === gone.plantId);
  if (!plant) return {};
  const mine = (type: CareEvent['type']) => s.events.filter((e) => e.plantId === gone.plantId && e.type === type);
  const pair = gone.type === 'check' ? mine('water').find((e) => e.at === gone.at) : mine('check').find((e) => e.at === gone.at);
  const check = gone.type === 'check' ? gone : pair;
  const water = gone.type === 'water' ? gone : pair;
  const ids = new Set([gone.id, pair?.id].filter(Boolean) as string[]);
  const events = s.events.filter((e) => !ids.has(e.id));
  const newest = (list: CareEvent[]) => list.reduce<CareEvent | undefined>((m, e) => (!m || e.at > m.at ? e : m), undefined);
  const latestCheck = newest(mine('check'));
  const latestWater = newest(mine('water'));
  const left = (type: CareEvent['type']) => newest(events.filter((e) => e.plantId === gone.plantId && e.type === type));

  let next: Partial<Plant> = {};
  let restored = false;
  if (check && check.id === latestCheck?.id) {
    const prev = left('check');
    // A watering logged after this check has moved the schedule on since: keep that, only the last-check date goes back.
    const since = s.events.some((e) => e.plantId === plant.id && !ids.has(e.id) && (e.type === 'water' || e.type === 'check') && e.at > check.at);
    restored = !!check.before && !since;
    next = restored ? { ...check.before } : { lastCheckAt: prev?.at, lastResult: prev?.result };
  }
  // A watering with a check logged after it: that check planned the schedule since, so it stays.
  const checkedSince = !!water && s.events.some((e) => e.plantId === plant.id && !ids.has(e.id) && e.type === 'check' && e.at > water.at);
  if (water && water.id === latestWater?.id && !restored && !checkedSince) {
    const prev = left('water');
    next.nextCheckAt = prev ? scheduleNotBefore(plant, s.profile.climate, new Date(prev.at), now) : now.toISOString();
  }
  const updated = { ...plant, ...next };
  const moved = updated.nextCheckAt !== plant.nextCheckAt ? new Map([[plant.id, updated.nextCheckAt]]) : new Map<string, string>();
  return {
    plants: s.plants.map((p) => (p.id === plant.id ? updated : p)),
    events: rebook(events, moved, now),
    undo: withoutUndo(s.undo, [plant.id]),
  };
}

/** Plants whose booked check changed between two lists, by id → new date. */
function movedChecks(before: Plant[], after: Plant[]): Map<string, string> {
  const old = new Map(before.map((p) => [p.id, p.nextCheckAt]));
  return new Map(after.filter((p) => old.has(p.id) && old.get(p.id) !== p.nextCheckAt).map((p) => [p.id, p.nextCheckAt]));
}

/** The earliest an In memory / gifted date can be: when it joined the fam, or when it last came back. */
/**
 * Entries a person can delete later. Cuttings, stages and memories aren't: they're the plant's story. Deleting a
 * watering or a check re-plans the next check (see deleteEvent).
 */
const DELETABLE = new Set<CareEvent['type']>(['feed', 'prune', 'pest', 'repot', 'staked', 'refresh', 'harvest', 'note', 'water', 'check']);
export const canDeleteEvent = (e: Pick<CareEvent, 'type'>) => DELETABLE.has(e.type);

/** Which plant a wish is for: the species, plus the name for plants not in the catalogue. */
export const wishKey = (w: Pick<WishItem, 'speciesId' | 'custom'>) => `${w.speciesId}|${(w.custom?.latinName || w.custom?.commonName || '').trim().toLowerCase()}`;
/** The saved wish for this plant, if there is one. */
export const findWish = (list: WishItem[] | undefined, w: Pick<WishItem, 'speciesId' | 'custom'>) => list?.find((x) => wishKey(x) === wishKey(w));

export function archiveFloor(plant: Pick<Plant, 'id' | 'acquiredAt'>, events: CareEvent[]): string {
  let floor = plant.acquiredAt;
  for (const e of events) if (e.plantId === plant.id && e.type === 'restored' && e.at > floor) floor = e.at;
  return floor;
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
      dataEpoch: 0,

      setProfile: (p, now = new Date()) =>
        set((s) => {
          const profile = { ...s.profile, ...p };
          if (profile.supporter && !profile.supporterSince) profile.supporterSince = now.toISOString();
          const moved = p.climate !== undefined && JSON.stringify(p.climate) !== JSON.stringify(s.profile.climate);
          if (!moved) return { profile };
          const plants = repace(s.plants, s.profile.climate, profile.climate, now);
          const shifted = movedChecks(s.plants, plants);
          return { profile, plants, events: rebook(s.events, shifted, now), undo: withoutUndo(s.undo, shifted.keys()) };
        }),
      completeOnboarding: () => set({ onboarded: true }),
      setSunlight: (sunlight) => set((s) => ({ profile: { ...s.profile, sunlight } })),

      addPlant: (input, now = new Date(), opts) => {
        const base = { ...input, id: uid(), k: 1, createdAt: now.toISOString() };
        const climate = get().profile.climate;
        // Knowing when it was last watered beats a same-day check: plan from that watering instead.
        const watered = opts?.lastWateredAt && !input.rooting ? opts.lastWateredAt : undefined;
        const today = !watered && (opts?.firstCheck ?? 'today') === 'today' && !input.rooting;
        const nextCheckAt = watered ? scheduleNotBefore(base, climate, watered, now) : today ? now.toISOString() : schedule(base, climate, now);
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
        set((s) => {
          const nextCheckAt = scheduleNotBefore(plant, s.profile.climate, when, now);
          return {
            plants: s.plants.map((p) => (p.id === plantId ? { ...p, nextCheckAt } : p)),
            events: [...rebook(s.events, new Map([[plantId, nextCheckAt]]), now), { id: uid(), plantId, type: 'water', at: when.toISOString() }],
            undo: withoutUndo(s.undo, [plantId]),
          };
        });
      },

      logCheck: (plantId, result, now = new Date()) => {
        const { plants, profile } = get();
        const plant = plants.find((p) => p.id === plantId);
        if (!plant) return '';
        const out = applyCheck({ group: speciesOf(plant).group, plant, profile: profile.climate, at: now }, result);
        const before = { k: plant.k, nextCheckAt: plant.nextCheckAt, lastCheckAt: plant.lastCheckAt, lastResult: plant.lastResult };
        const events: CareEvent[] = [{ id: uid(), plantId, type: 'check', result, at: now.toISOString(), nextAt: out.nextCheckAt, before }];
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
          if (a === 'stake') extra.push({ id: uid(), plantId, type: 'staked', at });
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

      setRoomLight: (room, light) => set((s) => ({ profile: { ...s.profile, rooms: { ...s.profile.rooms, [room]: light } } })),

      saveWish: (item, now = new Date()) => {
        const same = findWish(get().profile.wishlist, item);
        if (same) return same;
        const wish: WishItem = { ...item, note: item.note?.trim() || undefined, id: uid(), savedAt: now.toISOString() };
        set((s) => ({ profile: { ...s.profile, wishlist: [...(s.profile.wishlist ?? []), wish] } }));
        return wish;
      },

      updateWish: (id, patch) =>
        set((s) => ({ profile: { ...s.profile, wishlist: (s.profile.wishlist ?? []).map((w) => (w.id === id ? { ...w, note: patch.note?.trim() || undefined } : w)) } })),

      removeWish: (id) => set((s) => ({ profile: { ...s.profile, wishlist: (s.profile.wishlist ?? []).filter((w) => w.id !== id) } })),

      restoreWish: (wish) =>
        set((s) => {
          const list = s.profile.wishlist ?? [];
          if (list.some((w) => w.id === wish.id || wishKey(w) === wishKey(wish))) return s;
          // Back in its place: the list is in the order things were saved.
          return { profile: { ...s.profile, wishlist: [...list, wish].sort((a, b) => a.savedAt.localeCompare(b.savedAt)) } };
        }),

      updatePlant: (plantId, patch, now = new Date()) => {
        const climate = get().profile.climate;
        set((s) => {
          const plants = s.plants.map((p) => {
            if (p.id !== plantId) return p;
            const next = { ...p, ...patch };
            const careChanged = (['soil', 'potMaterial', 'potDiameterCm', 'light', 'placement', 'speciesId', 'selfWatering'] as const).some((k) => k in patch && patch[k] !== p[k]);
            return careChanged && !next.rooting ? { ...next, nextCheckAt: schedule(next, climate, now) } : next;
          });
          const moved = movedChecks(s.plants, plants);
          return { plants, events: rebook(s.events, moved, now), undo: withoutUndo(s.undo, moved.keys()) };
        });
      },

      archivePlant: (plantId, reason, now = new Date()) => {
        const at = now.toISOString();
        set((s) => ({
          plants: s.plants.map((p) => (p.id === plantId ? { ...p, archivedAt: at, archivedReason: reason } : p)),
          undo: withoutUndo(s.undo, [plantId]),
          events: [...s.events, { id: uid(), plantId, type: 'archived', note: reason, at }],
        }));
      },

      addLightReading: (plantId, reading, light, now = new Date()) => {
        set((s) => ({ plants: s.plants.map((p) => (p.id === plantId ? { ...p, lightReadings: [...(p.lightReadings ?? []), reading].slice(-12) } : p)) }));
        const plant = get().plants.find((p) => p.id === plantId);
        if (light && plant && plant.light !== light) get().updatePlant(plantId, { light }, now);
      },

      undoArchive: (plantId) => {
        set((s) => {
          const plant = s.plants.find((p) => p.id === plantId);
          if (!plant?.archivedAt) return s;
          const entry = [...s.events].reverse().find((e) => e.plantId === plantId && e.type === 'archived');
          return {
            plants: s.plants.map((p) => (p.id === plantId ? { ...p, archivedAt: undefined, archivedReason: undefined } : p)),
            events: entry ? s.events.filter((e) => e !== entry) : s.events,
          };
        });
      },

      restorePlant: (plantId, now = new Date()) => {
        if (!get().plants.find((p) => p.id === plantId)?.archivedAt) return;
        const at = now.toISOString();
        set((s) => ({
          // A check undone after the plant came back would bring back its old schedule.
          undo: withoutUndo(s.undo, [plantId]),
          plants: s.plants.map((p) => (p.id === plantId ? { ...p, archivedAt: undefined, archivedReason: undefined, ...(p.rooting ? {} : { nextCheckAt: at }) } : p)),
          events: [...s.events, { id: uid(), plantId, type: 'restored', at }],
        }));
      },

      setArchivedAt: (plantId, at) => {
        set((s) => {
          const plant = s.plants.find((p) => p.id === plantId);
          if (!plant?.archivedAt) return s;
          // Never before it joined the fam, or before it last came back.
          const iso = new Date(Math.max(at.getTime(), new Date(archiveFloor(plant, s.events)).getTime())).toISOString();
          const entry = [...s.events].reverse().find((e) => e.plantId === plantId && e.type === 'archived');
          let events = s.events;
          if (entry) {
            // Re-insert in date order so the diary still reads oldest to newest.
            const rest = s.events.filter((e) => e !== entry);
            const i = rest.findIndex((e) => e.at > iso);
            events = i < 0 ? [...rest, { ...entry, at: iso }] : [...rest.slice(0, i), { ...entry, at: iso }, ...rest.slice(i)];
          }
          return { events, plants: s.plants.map((p) => (p.id === plantId ? { ...p, archivedAt: iso } : p)) };
        });
      },

      deletePlant: (plantId) => {
        const gone = get().plants.find((p) => p.id === plantId);
        if (!gone) return;
        set((s) => ({
          plants: s.plants.filter((p) => p.id !== plantId).map((p) => (p.parentId === plantId ? { ...p, parentId: gone.parentId } : p)),
          events: s.events.filter((e) => e.plantId !== plantId),
          undo: withoutUndo(s.undo, [plantId]),
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

      addNote: (plantId, note, now = new Date()) => {
        const text = note.trim();
        if (!text) return;
        set((s) => ({ events: [...s.events, { id: uid(), plantId, type: 'note', note: text, at: now.toISOString() }] }));
      },

      editNote: (eventId, note) => {
        const text = note.trim();
        set((s) => ({
          events: s.events.flatMap((e) => {
            if (e.id !== eventId || (e.type !== 'note' && e.type !== 'photo')) return [e];
            if (e.type === 'note' && !text) return [];
            return [{ ...e, note: text || undefined }];
          }),
        }));
      },

      deleteEvent: (eventId, now = new Date()) => {
        set((s) => {
          const gone = s.events.find((e) => e.id === eventId);
          if (!gone || !canDeleteEvent(gone)) return {};
          if (gone.type === 'check' || gone.type === 'water') return forgetWatering(s, gone, now);
          const events = s.events.filter((e) => e.id !== eventId);
          // Repot and fresh-water dates come from these entries, so they fall back to the one before.
          const latest = (type: CareEvent['type']) =>
            events.filter((e) => e.plantId === gone.plantId && e.type === type).reduce<string | undefined>((m, e) => (!m || e.at > m ? e.at : m), undefined);
          const plants =
            gone.type === 'repot' || gone.type === 'refresh'
              ? s.plants.map((p) => (p.id !== gone.plantId ? p : gone.type === 'repot' ? { ...p, lastRepottedAt: latest('repot') } : { ...p, lastRefreshedAt: latest('refresh') }))
              : s.plants;
          return { events, plants };
        });
      },

      planTrip: (trip) => {
        set((s) => {
          const now = Date.now();
          // Trips already under way or over stay on record (they excuse those days); only future plans are replaced.
          const kept = (s.profile.trips ?? []).filter((t) => new Date(t.from).getTime() <= now && new Date(t.to).getTime() <= Math.max(now, new Date(trip.from).getTime()));
          return { profile: { ...s.profile, trips: [...kept, trip].slice(-20) } };
        });
      },

      endTrip: (now = new Date()) => {
        set((s) => {
          const t = now.getTime();
          const trips = (s.profile.trips ?? [])
            .filter((x) => new Date(x.from).getTime() <= t)
            .map((x) => (new Date(x.to).getTime() > t ? { ...x, to: now.toISOString() } : x));
          return { profile: { ...s.profile, trips } };
        });
      },

      setPrepDone: (from, itemId, done) => {
        set((s) => ({
          profile: {
            ...s.profile,
            trips: (s.profile.trips ?? []).map((t) => {
              if (t.from !== from) return t;
              const rest = (t.done ?? []).filter((x) => x !== itemId);
              return { ...t, done: done ? [...rest, itemId] : rest };
            }),
          },
        }));
      },

      logDiagnosis: (plantId, note, tweak, now = new Date()) => {
        const factor = tweak === 'slow-water' ? 1.2 : tweak === 'more-water' ? 0.85 : 1;
        set((s) => {
          const plants =
            factor === 1
              ? s.plants
              : s.plants.map((p) => {
                  if (p.id !== plantId) return p;
                  // Stretch or shrink the wait for the check that's already booked, not just future ones.
                  const left = Math.max(0, new Date(p.nextCheckAt).getTime() - now.getTime());
                  return {
                    ...p,
                    k: Math.round(Math.min(K_MAX, Math.max(K_MIN, p.k * factor)) * 100) / 100,
                    nextCheckAt: new Date(now.getTime() + left * factor).toISOString(),
                  };
                });
          const moved = movedChecks(s.plants, plants);
          return { plants, undo: withoutUndo(s.undo, moved.keys()), events: [...rebook(s.events, moved, now), { id: uid(), plantId, type: 'diagnosis', note, at: now.toISOString() }] };
        });
      },

      tickGrowTask: (taskId, on, now = new Date()) => {
        set((s) => {
          // Nothing lasts longer than a month, so ticks older than two are dead weight.
          const cutoff = now.getTime() - 62 * 86400000;
          const kept = Object.fromEntries(Object.entries(s.profile.growTicks ?? {}).filter(([id, at]) => id !== taskId && new Date(at).getTime() > cutoff));
          return { profile: { ...s.profile, growTicks: on ? { ...kept, [taskId]: now.toISOString() } : kept } };
        });
      },
      skipGrowTask: (taskId, on, now = new Date()) => {
        set((s) => {
          const cutoff = now.getTime() - 62 * 86400000;
          const kept = Object.fromEntries(Object.entries(s.profile.growSkips ?? {}).filter(([id, at]) => id !== taskId && new Date(at).getTime() > cutoff));
          return { profile: { ...s.profile, growSkips: on ? { ...kept, [taskId]: now.toISOString() } : kept } };
        });
      },
      setFed: (plantIds, on, now = new Date(), since) => {
        const ids = new Set(plantIds);
        set((s) => ({
          events: on
            ? [...s.events, ...plantIds.map((plantId) => ({ id: uid(), plantId, type: 'feed' as const, at: now.toISOString() }))]
            : s.events.filter((e) => !(e.type === 'feed' && ids.has(e.plantId) && (!since || e.at >= since))),
        }));
      },
      setStaked: (plantIds, on, now = new Date()) => {
        const ids = new Set(plantIds);
        set((s) => ({
          events: on
            ? [...s.events, ...plantIds.map((plantId) => ({ id: uid(), plantId, type: 'staked' as const, at: now.toISOString() }))]
            : s.events.filter((e) => !(e.type === 'staked' && ids.has(e.plantId))),
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
        const { supporter: tipped, supporterSince: since, streakFreezes: _f, lastBackupAt: _b, cloudBackup: _c, household: _h, plus: _p, ...profile } = data.profile as Partial<Profile> & { plus?: boolean };
        const supporter = get().profile.supporter || tipped === true;
        const supporterSince = [get().profile.supporterSince, tipped === true ? since : undefined].filter((d): d is string => !!d).sort()[0];
        set((s) => ({
          plants: data.plants,
          events: data.events,
          undo: {},
          dataEpoch: s.dataEpoch + 1,
          onboarded: true,
          profile: { ...DEFAULT_PROFILE, ...s.profile, ...profile, supporter, supporterSince: supporter ? supporterSince ?? new Date().toISOString() : undefined, streakFreezes: s.profile.streakFreezes, coachDismissed: true },
        }));
      },

      setJungle: (j, swap = false) => {
        set((s) => ({
          plants: j.plants,
          events: j.events,
          profile: withShared(s.profile, j.shared),
          ...(swap ? { undo: {}, dataEpoch: s.dataEpoch + 1 } : {}),
        }));
      },

      restoreSnapshot: (snap) => {
        set((s) => ({ plants: snap.plants, events: snap.events, profile: snap.profile, undo: {}, dataEpoch: s.dataEpoch + 1 }));
      },

      eraseEverything: () => {
        set((s) => ({ plants: [], events: [], undo: {}, dataEpoch: s.dataEpoch + 1, onboarded: false, profile: { ...DEFAULT_PROFILE, supporter: get().profile.supporter, supporterSince: get().profile.supporterSince } }));
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
