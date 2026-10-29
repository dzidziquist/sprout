import type { Profile } from '../store/plantStore';
import type { CareEvent, Plant } from '../types';

/*
 * Household sharing, the deciding half (the CloudKit bridge is modules/household). The jungle travels as
 * records, one per thing, so two phones can change different plants at the same time without clashing:
 *
 *   pl-<plant id>    a plant
 *   ev-<event id>    a diary entry (checks, waterings, photos, notes): written once, so they never clash
 *   jungle           the settings everyone shares: climate, rooms and windows, trips, wishlist, grow patch
 *   mb-<person id>   a person's name in the household
 *
 * Each phone remembers what every record looked like when it last agreed with iCloud (`synced`). From
 * that it knows what it changed itself, what someone else changed, and when both did: then this phone's
 * change wins and goes up, so every phone ends up the same.
 */

/** Profile fields the household shares; everything else (reminder time, look, units…) stays per phone. */
export const SHARED_PROFILE_KEYS = ['climate', 'city', 'sunlight', 'rooms', 'trips', 'grows', 'spots', 'wishlist', 'growTicks'] as const;
export type SharedProfile = Pick<Profile, (typeof SHARED_PROFILE_KEYS)[number]>;

export interface Member {
  name: string;
}

/** What the household holds, as this phone sees it. */
export interface Jungle {
  plants: Plant[];
  events: CareEvent[];
  shared: Partial<SharedProfile>;
  members: Record<string, Member>;
}

export interface Item {
  id: string;
  kind: 'plant' | 'event' | 'jungle' | 'member';
  json: string;
}

/** Remote copy of an item, with when it was last changed (ms). */
export interface RemoteItem extends Item {
  at: number;
}

/** What a record looked like when this phone and iCloud last agreed: a fingerprint and the change time. */
export type Synced = Record<string, { h: string; at: number }>;

/** JSON with keys in a fixed order, so the same thing always gives the same text. */
export function stableJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? 'null' : stableJson(v))).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableJson(obj[k])}`).join(',')}}`;
}

/** A short fingerprint of a record's text (FNV-1a). */
export function fingerprint(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36) + text.length.toString(36);
}

export function pickShared(profile: Partial<Profile>): Partial<SharedProfile> {
  const out: Partial<SharedProfile> = {};
  for (const k of SHARED_PROFILE_KEYS) if (profile[k] !== undefined) (out as Record<string, unknown>)[k] = profile[k];
  return out;
}

/** The jungle as records. */
export function toItems(j: Jungle): Map<string, Item> {
  const out = new Map<string, Item>();
  for (const p of j.plants) out.set(`pl-${p.id}`, { id: `pl-${p.id}`, kind: 'plant', json: stableJson(p) });
  for (const e of j.events) out.set(`ev-${e.id}`, { id: `ev-${e.id}`, kind: 'event', json: stableJson(e) });
  out.set('jungle', { id: 'jungle', kind: 'jungle', json: stableJson(j.shared) });
  for (const [id, m] of Object.entries(j.members)) out.set(`mb-${id}`, { id: `mb-${id}`, kind: 'member', json: stableJson(m) });
  return out;
}

/** Records back into a jungle (unreadable ones are skipped). Plants and events keep a steady order. */
export function fromItems(items: Iterable<Item>): Jungle {
  const j: Jungle = { plants: [], events: [], shared: {}, members: {} };
  for (const it of items) {
    let v: unknown;
    try {
      v = JSON.parse(it.json);
    } catch {
      continue;
    }
    if (!v || typeof v !== 'object') continue;
    if (it.kind === 'plant') j.plants.push(v as Plant);
    else if (it.kind === 'event') j.events.push(v as CareEvent);
    else if (it.kind === 'jungle') j.shared = v as Partial<SharedProfile>;
    else if (it.kind === 'member') j.members[it.id.slice(3)] = v as Member;
  }
  j.plants.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  j.events.sort((a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id));
  return j;
}

export interface MergeResult {
  /** The jungle after taking in everyone's changes. */
  jungle: Jungle;
  /** Records to send up, stamped with `now`. */
  save: RemoteItem[];
  /** Records to delete in iCloud. */
  remove: string[];
  /** What iCloud will hold once `save` and `remove` are done. */
  synced: Synced;
  /** Something arrived from another phone (so the store needs updating). */
  changed: boolean;
}

/**
 * One round of syncing: takes in what other phones changed (`remote`, `deletedRemote`) and works out what
 * this phone sends up. `synced` is the agreed state from the last round.
 */
export function merge(local: Jungle, synced: Synced, remote: RemoteItem[], deletedRemote: string[], now: number): MergeResult {
  const mine = toItems(local);
  const next: Synced = { ...synced };
  const result = new Map(mine);
  let changed = false;
  const changedHere = (id: string) => {
    const it = mine.get(id);
    const base = synced[id];
    if (!it) return !!base; // deleted here since the last round
    return !base || fingerprint(it.json) !== base.h;
  };

  for (const r of remote) {
    const h = fingerprint(r.json);
    // Exactly what both sides last agreed on (often this phone's own upload coming back): nothing new
    // from there, so whatever this phone did since (an edit, a delete) stands.
    if (synced[r.id]?.h === h) continue;
    if (changedHere(r.id) && synced[r.id]) {
      // Both phones changed it: this phone's version wins and goes up below.
      if (mine.has(r.id)) {
        next[r.id] = { h: '', at: r.at };
        continue;
      }
      // Deleted here, changed there: the change is newer than what was deleted, so it comes back.
    } else if (mine.has(r.id) && fingerprint(mine.get(r.id)!.json) === h) {
      next[r.id] = { h, at: r.at };
      continue;
    }
    result.set(r.id, { id: r.id, kind: r.kind, json: r.json });
    next[r.id] = { h, at: r.at };
    changed = true;
  }
  for (const id of deletedRemote) {
    if (mine.has(id) && changedHere(id) && synced[id]) {
      // Changed here, deleted there: keep it, and it goes back up below.
      next[id] = { h: '', at: 0 };
      continue;
    }
    if (result.delete(id)) changed = true;
    delete next[id];
  }

  const save: RemoteItem[] = [];
  const remove: string[] = [];
  for (const [id, it] of result) {
    const h = fingerprint(it.json);
    if (next[id]?.h === h) continue;
    save.push({ ...it, at: now });
    next[id] = { h, at: now };
  }
  const remoteDeleted = new Set(deletedRemote);
  for (const id of Object.keys(synced)) {
    if (!result.has(id) && !remoteDeleted.has(id)) {
      remove.push(id);
      delete next[id];
    }
  }
  return { jungle: changed ? fromItems(result.values()) : local, save, remove, synced: next, changed };
}

/** Diary entries without a name on them were made on this phone: sign them with this person's id. */
export function signEvents(events: CareEvent[], me: string): { events: CareEvent[]; signed: boolean } {
  let signed = false;
  const out = events.map((e) => {
    if (e.by) return e;
    signed = true;
    return { ...e, by: me };
  });
  return { events: signed ? out : events, signed };
}

/** Photo file names a jungle's diary points at (only photos in the diary folder travel). */
export function diaryPhotos(j: Pick<Jungle, 'plants' | 'events'>): string[] {
  const refs = [...j.plants.map((p) => p.photoUri), ...j.events.map((e) => e.photoUri)];
  return [...new Set(refs.filter((r): r is string => !!r && /^diary\/[^/]+$/.test(r)).map((r) => r.slice(6)))];
}

/** "Ama", or "Someone" for a person whose name hasn't arrived yet. */
export function nameOf(members: Record<string, Member>, id: string | undefined): string {
  return (id && members[id]?.name?.trim()) || 'Someone';
}

/** First letter for the round avatars. */
export const initial = (name: string) => (name.trim()[0] ?? '?').toUpperCase();

const VERB: Partial<Record<CareEvent['type'], string>> = {
  check: 'checked',
  water: 'watered',
  feed: 'fed',
  photo: 'added a photo of',
  repot: 'repotted',
  harvest: 'harvested',
  note: 'wrote about',
  pest: 'treated',
  refresh: 'gave fresh water to',
  prune: 'pruned',
};

/**
 * The line under Today's round: what the others did lately, newest first, one person at a time.
 * "Ama watered Monty and added a photo of Queenie." Null when nobody else did anything in the last day.
 */
export function othersLately(j: Pick<Jungle, 'plants' | 'events' | 'members'>, me: string, now: Date): string | null {
  const since = now.getTime() - 86400000;
  const recent = j.events.filter((e) => e.by && e.by !== me && VERB[e.type] && new Date(e.at).getTime() >= since).sort((a, b) => b.at.localeCompare(a.at));
  if (!recent.length) return null;
  const who = recent[0].by!;
  const names = new Map(j.plants.map((p) => [p.id, p.name]));
  const bits: string[] = [];
  for (const e of recent.filter((x) => x.by === who)) {
    const plant = names.get(e.plantId);
    if (!plant) continue;
    const bit = `${VERB[e.type]} ${plant}`;
    if (!bits.includes(bit)) bits.push(bit);
    if (bits.length === 2) break;
  }
  if (!bits.length) return null;
  return `${nameOf(j.members, who)} ${bits.join(' and ')}.`;
}
