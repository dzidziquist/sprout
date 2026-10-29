import { Alert, Platform } from 'react-native';
import { create } from 'zustand';
import { Household as Native, type Invite, type Person } from '../../modules/household';
import { diaryPhotos, merge, orphanPhotos, pickShared, signEvents, type Jungle, type RemoteItem } from '../engine/household';
import { usePlantStore, type Household } from '../store/plantStore';
import { deletePhoto } from './photos';

/*
 * Household sharing, the running half: one sync round at a time (fetch what others changed, merge, send
 * what changed here, photos last), plus starting, joining, leaving and ending a household. The decisions
 * are in engine/household; the CloudKit calls in modules/household.
 */

/** Household sharing works on this phone (iPhone, a build with the native module). */
export const householdSupported = Platform.OS === 'ios' && !!Native;

/** Sync's state for the screens while the app is open. Not saved. */
export const useHouseholdStatus = create<{ syncing: boolean; error: string | null; set: (p: Partial<{ syncing: boolean; error: string | null }>) => void }>((set) => ({
  syncing: false,
  error: null,
  set: (p) => set(p),
}));

const diaryDir = () => {
  const { Directory, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  return decodeURIComponent(new Directory(Paths.document, 'diary').uri.replace(/^file:\/\//, '').replace(/\/$/, ''));
};
const diaryUri = (name: string) => {
  const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  const f = new File(Paths.document, `diary/${name}`);
  return f.exists ? f.uri : null;
};

const ownerOf = (h: Household) => (h.role === 'member' ? h.owner ?? null : null);

let running: Promise<void> | null = null;
let again = false;

/** One sync round now (or right after the one in progress). Safe to call often. */
export function syncHousehold(): Promise<void> {
  if (!householdSupported || !usePlantStore.getState().profile.household) return Promise.resolve();
  if (running) {
    again = true;
    return running;
  }
  running = round()
    .catch((e) => useHouseholdStatus.getState().set({ error: (e as Error)?.message ?? 'Couldn’t reach iCloud.' }))
    .finally(() => {
      running = null;
      useHouseholdStatus.getState().set({ syncing: false });
      // Tells iOS a push that woke the app has been dealt with.
      Native?.changeHandled();
      if (again) {
        again = false;
        void syncHousehold();
      }
    });
  return running;
}

async function round() {
  const status = useHouseholdStatus.getState();
  const start = usePlantStore.getState();
  const h = start.profile.household;
  if (!Native || !h) return;
  status.set({ syncing: true });
  const owner = ownerOf(h);
  let changes = await Native.fetchChanges(owner, h.token ?? null, diaryDir());
  const synced = h.synced ?? {};
  if (changes.reset) {
    // Too long since the last sync: fetch everything. What was agreed still stands (so edits made here
    // meanwhile win as usual), and anything agreed that iCloud no longer has was deleted elsewhere.
    changes = await Native.fetchChanges(owner, null, diaryDir());
    if (!changes.gone && !changes.reset) {
      const there = new Set((changes.items ?? []).map((i) => i.id));
      changes = { ...changes, deleted: Object.keys(synced).filter((id) => !there.has(id)) };
    }
  }
  if (changes.gone) return ended(h);

  // Read the jungle after the wait, then merge and put it back without waiting, so nothing done meanwhile is lost.
  const st = usePlantStore.getState();
  const hh = st.profile.household;
  if (!hh || st.dataEpoch !== start.dataEpoch || hh.me !== h.me) return;
  // Only the kinds this version knows (a newer app's records are left alone).
  const items = (changes.items ?? []).filter((i): i is RemoteItem => ['plant', 'event', 'jungle', 'member'].includes(i.kind));
  // A new member's first round: wait until the household's jungle arrives rather than send an empty one.
  if (hh.role === 'member' && !hh.synced && !items.length) return;
  const { events } = signEvents(st.events, hh.me);
  const local: Jungle = { plants: st.plants, events, shared: pickShared(st.profile), members: { ...(hh.members ?? {}), [hh.me]: { name: hh.name } } };
  const r = merge(local, synced, items, changes.deleted ?? [], Date.now());
  if (r.changed || events !== st.events) st.setJungle(r.jungle);

  const failed = await Native.save(owner, r.save, r.remove);
  const removing = new Set(r.remove);
  for (const id of failed) {
    // A failed save: forget it, so it goes up again. A failed delete: keep the old agreement, so the
    // next round still sees it as deleted here and tries again.
    if (removing.has(id) && synced[id]) r.synced[id] = synced[id];
    else delete r.synced[id];
  }

  // Photos: what arrived is already on the phone; send the ones iCloud doesn't have yet.
  const have = new Set([...(hh.photos ?? []), ...(changes.photos ?? [])]);
  for (const name of diaryPhotos(r.jungle)) {
    if (have.has(name)) continue;
    const uri = diaryUri(name);
    if (!uri) continue;
    try {
      await Native.savePhoto(owner, name, uri);
      have.add(name);
    } catch {
      // Tried again next round.
    }
  }

  // Photos nothing points at any more (their diary entry or plant deleted on some phone): out of
  // iCloud, and off this phone. Not in a round where a save or delete failed: iCloud may still hold
  // the entry that points at them, so they wait for a round where everything went through.
  const orphans = failed.length ? [] : orphanPhotos(have, r.jungle);
  if (orphans.length) {
    const failed = new Set(await Native.save(owner, [], orphans.map((n) => `p-${n}`)).catch(() => orphans.map((n) => `p-${n}`)));
    for (const name of orphans) {
      if (failed.has(`p-${name}`)) continue;
      have.delete(name);
      deletePhoto(`diary/${name}`);
    }
  }

  const now = usePlantStore.getState();
  const cur = now.profile.household;
  if (!cur || now.dataEpoch !== start.dataEpoch || cur.me !== h.me) return;
  now.setProfile({ household: { ...cur, token: changes.token ?? cur.token, synced: r.synced, members: r.jungle.members, photos: [...have] } });
  status.set({ error: null });
}

/** The household is gone (stopped by the owner, or this person was removed): keep a copy, give back their own plants. */
function ended(h: Household) {
  const st = usePlantStore.getState();
  // Already left or stopped on this phone while this round was waiting: that already put things right.
  if (st.profile.household?.me !== h.me || st.profile.household.owner !== h.owner) return;
  const aside = h.aside;
  const ownerName = (h.owner && h.members?.[h.owner]?.name) || 'The owner';
  // Their own settings come back too (city, climate, trips…), keeping the household's rooms next to
  // their own so the copied plants still have a room to stand in.
  const now = pickShared(st.profile);
  const shared = aside ? { ...now, ...aside.shared, rooms: { ...(now.rooms ?? {}), ...(aside.shared.rooms ?? {}) } } : now;
  st.setJungle({ plants: [...st.plants, ...(aside?.plants ?? [])], events: [...st.events, ...(aside?.events ?? [])], shared }, true);
  usePlantStore.getState().setProfile({ household: undefined });
  useHouseholdStatus.getState().set({ error: null });
  if (h.role === 'member') Alert.alert('The household has ended', `${ownerName} stopped sharing, or took you out. You keep a copy of the plants as they were${aside?.plants.length ? ', and your own plants are back' : ''}.`);
}

/** Starts a household with this phone's jungle and opens the sharing sheet. Only the owner invites. */
export async function startAndInvite(name: string): Promise<void> {
  if (!Native) throw new Error('Household sharing needs the latest PlantFam.');
  const st = usePlantStore.getState();
  if (!st.profile.household) {
    if ((await Native.accountStatus()) !== 'available') throw new Error('Sign in to iCloud in Settings first: sharing goes through it.');
    await Native.ensureZone();
    const me = await Native.myId();
    usePlantStore.getState().setProfile({ household: { role: 'owner', me, name: name.trim() } });
    await Native.subscribe(null).catch(() => {});
    await syncHousehold();
  } else if (st.profile.household.name !== name.trim() && name.trim()) {
    usePlantStore.getState().setProfile({ household: { ...st.profile.household, name: name.trim() } });
    void syncHousehold();
  }
  await Native.invite(name.trim() ? `${name.trim()}’s jungle` : 'Our jungle');
}

/** The invite waiting to be answered (someone tapped a link), if any. */
export async function pendingInvite(): Promise<Invite | null> {
  if (!Native) return null;
  try {
    return await Native.pendingInvite();
  } catch {
    return null;
  }
}

/** Joins a household: this phone's own jungle is put aside until they leave. */
export async function join(invite: Invite, name: string): Promise<void> {
  if (!Native) throw new Error('Household sharing needs the latest PlantFam.');
  if ((await Native.accountStatus()) !== 'available') throw new Error('Sign in to iCloud in Settings first: the household is shared through it.');
  const owner = await Native.acceptInvite(invite.url);
  const me = await Native.myId();
  const st = usePlantStore.getState();
  const aside = { plants: st.plants, events: st.events, shared: pickShared(st.profile) };
  st.setJungle({ plants: [], events: [], shared: {} }, true);
  const after = usePlantStore.getState();
  // Everyone's names, the owner's included, arrive with the household's records on the first sync.
  after.setProfile({ household: { role: 'member', owner, me, name: name.trim() || 'Me', aside } });
  if (!after.onboarded) after.completeOnboarding();
  await Native.subscribe(owner).catch(() => {});
  await syncHousehold();
}

export function dismissInvite() {
  Native?.dismissInvite();
}

/** A member leaves: the household's plants go, their own come back. */
export async function leave(): Promise<void> {
  const h = usePlantStore.getState().profile.household;
  if (!Native || !h || h.role !== 'member' || !h.owner) return;
  // Take this person's name out of the household first, so the others stop showing them.
  await Native.save(h.owner, [], [`mb-${h.me}`]).catch(() => {});
  await Native.unsubscribe(h.owner).catch(() => {});
  await Native.leave(h.owner);
  const st = usePlantStore.getState();
  st.setJungle({ plants: h.aside?.plants ?? [], events: h.aside?.events ?? [], shared: h.aside?.shared ?? {} }, true);
  usePlantStore.getState().setProfile({ household: undefined });
  useHouseholdStatus.getState().set({ error: null });
}

/** The owner ends the household: every plant stays here; members keep a copy. */
export async function stopSharing(): Promise<void> {
  const h = usePlantStore.getState().profile.household;
  if (!Native || !h || h.role !== 'owner') return;
  await Native.unsubscribe(null).catch(() => {});
  await Native.stopSharing();
  usePlantStore.getState().setProfile({ household: undefined });
  useHouseholdStatus.getState().set({ error: null });
}

/** Everyone in the household, with names from the household where people chose one. */
export async function people(): Promise<Person[]> {
  const h = usePlantStore.getState().profile.household;
  if (!Native || !h) return [];
  const list = await Native.people(ownerOf(h));
  return list
    .filter((p) => p.status !== 'removed')
    .map((p) => ({ ...p, name: h.members?.[p.id]?.name || p.name || (p.status === 'pending' ? 'Invite pending' : 'Someone') }));
}

export async function removePerson(id: string): Promise<void> {
  if (!Native) return;
  await Native.remove(id);
  // Their name goes too: dropped here, the next round deletes it from the household.
  const h = usePlantStore.getState().profile.household;
  if (h?.members?.[id]) {
    const { [id]: _gone, ...members } = h.members;
    usePlantStore.getState().setProfile({ household: { ...h, members } });
    void syncHousehold();
  }
}

/** Calls `onInvite` when someone taps a household invite (now, or one that opened the app). */
export function watchInvites(onInvite: () => void): () => void {
  if (!Native) return () => {};
  const sub = Native.addListener('onInvite', onInvite);
  pendingInvite().then((i) => i && onInvite());
  return () => sub.remove();
}

/**
 * Live updates: makes sure CloudKit pushes to this phone when the jungle changes (once per launch, as the
 * subscription can lapse), and syncs as soon as one arrives.
 */
export function watchChanges(): () => void {
  const h = usePlantStore.getState().profile.household;
  if (!Native) return () => {};
  if (h) Native.subscribe(ownerOf(h)).catch(() => {});
  const sub = Native.addListener('onChange', () => void syncHousehold());
  return () => sub.remove();
}
