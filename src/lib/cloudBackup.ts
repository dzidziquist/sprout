import { Platform } from 'react-native';
import { create } from 'zustand';
import { BACKUPS_DIR, PHOTOS_DIR, backupDue, backupName, newChain, photoNames, sortEntries, toPrune, type BackupEntry } from '../engine/cloudBackup';
import { computeStreak } from '../engine/streak';
import { DEFAULT_PROFILE, usePlantStore } from '../store/plantStore';
import { buildExportJson, parseBackup, type BackupData, type ExportSource } from './export';

/*
 * The weekly iCloud backup's files (decisions in engine/cloudBackup). iPhone only: everything here
 * loads the native module lazily, so web, tests and builds without it simply see "no iCloud".
 */

type Cloud = typeof import('react-native-cloud-storage').CloudStorage;

/** The app's hidden iCloud folder, or null where there is none (web, Android, an old build). */
function cloud(): Cloud | null {
  if (Platform.OS !== 'ios') return null;
  try {
    return (require('react-native-cloud-storage') as typeof import('react-native-cloud-storage')).CloudStorage;
  } catch {
    return null;
  }
}

/** Signed in to iCloud with iCloud Drive on. iOS can take a moment to say so after launch. */
export async function cloudReady(): Promise<boolean> {
  const c = cloud();
  if (!c) return false;
  try {
    return await c.isCloudAvailable();
  } catch {
    return false;
  }
}

/** Whether this phone can have the iCloud backup at all (for showing the switch). */
export const cloudSupported = Platform.OS === 'ios';

/** What the switch's subtitle shows while the app is open. Not saved. */
export const useCloudStatus = create<{ state: 'idle' | 'saving' | 'waiting' | 'failed'; set: (state: 'idle' | 'saving' | 'waiting' | 'failed') => void }>((set) => ({
  state: 'idle',
  set: (state) => set({ state }),
}));

const diaryFile = (name: string) => {
  const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  return new File(Paths.document, `diary/${name}`);
};

async function ensureDir(c: Cloud, path: string) {
  if (!(await c.exists(path))) await c.mkdir(path);
}

/**
 * Saves a backup to iCloud: new diary photos first (each photo is uploaded once), then this week's file
 * in the phone's chain, then the chain's oldest files beyond four. Throws when iCloud isn't there.
 */
export async function saveToCloud(src: ExportSource, chain: string, now = new Date()): Promise<void> {
  const c = cloud();
  if (!c || !(await cloudReady())) throw new Error('iCloud Drive is off');
  await ensureDir(c, PHOTOS_DIR);
  const there = new Set(await c.readdir(PHOTOS_DIR));
  for (const name of photoNames(src.plants, src.events)) {
    if (there.has(name)) continue;
    const file = diaryFile(name);
    if (!file.exists) continue;
    await c.uploadFile(`${PHOTOS_DIR}/${name}`, file.uri, { mimeType: name.endsWith('.png') ? 'image/png' : 'image/jpeg' });
  }
  await ensureDir(c, BACKUPS_DIR);
  const dir = `${BACKUPS_DIR}/${chain}`;
  await ensureDir(c, dir);
  await c.writeFile(`${dir}/${backupName(now)}`, buildExportJson(src, now));
  for (const old of toPrune(await c.readdir(dir))) await c.unlink(`${dir}/${old}`).catch(() => {});
}

/** Every backup in iCloud, newest first. Empty when there's no iCloud or nothing saved yet. */
export async function listCloudBackups(): Promise<BackupEntry[]> {
  const c = cloud();
  if (!c || !(await cloudReady()) || !(await c.exists(BACKUPS_DIR))) return [];
  const out: BackupEntry[] = [];
  for (const chain of await c.readdir(BACKUPS_DIR)) {
    const files = await c.readdir(`${BACKUPS_DIR}/${chain}`).catch(() => [] as string[]);
    for (const file of files.filter((f) => f.endsWith('.json'))) {
      try {
        const parsed = parseBackup(await c.readFile(`${BACKUPS_DIR}/${chain}/${file}`));
        if (!parsed.ok) continue;
        const { plants, events, exportedAt, profile } = parsed.data;
        const at = exportedAt ?? `${file.slice(0, 10)}T12:00:00.000Z`;
        let streak: number | undefined;
        try {
          streak = computeStreak({ plants, events, climate: profile.climate ?? DEFAULT_PROFILE.climate, now: new Date(at), trips: profile.trips }).current;
        } catch {
          // A streak is a nice extra on the welcome screen, never a reason to hide a backup.
        }
        out.push({ chain, file, at, plants: plants.length, photos: photoNames(plants, events).length, streak });
      } catch {
        // Still downloading, or damaged: leave it out of the list.
      }
    }
  }
  return sortEntries(out);
}

/**
 * Reads one backup and brings its diary photos back onto the phone (skipping any already here).
 * `onPhoto` reports progress for the "Bringing back photos" line. Photos that can't be fetched are
 * skipped: the plants and diary still come back.
 */
export async function fetchCloudBackup(entry: BackupEntry, onPhoto?: (done: number, total: number) => void): Promise<BackupData> {
  const c = cloud();
  if (!c) throw new Error('iCloud isn’t available on this phone.');
  const parsed = parseBackup(await c.readFile(`${BACKUPS_DIR}/${entry.chain}/${entry.file}`));
  if (!parsed.ok) throw new Error(parsed.message);
  const { Directory, Paths } = require('expo-file-system') as typeof import('expo-file-system');
  const dir = new Directory(Paths.document, 'diary');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  const names = photoNames(parsed.data.plants, parsed.data.events);
  let done = 0;
  for (const name of names) {
    const file = diaryFile(name);
    if (!file.exists) await c.downloadFile(`${PHOTOS_DIR}/${name}`, file.uri).catch(() => {});
    onPhoto?.(++done, names.length);
  }
  return parsed.data;
}

let running = false;

/**
 * The weekly backup: saves when one is due (or now, when asked), into this phone's chain. Skips when
 * it's turned off, before setup, and for an empty jungle, which never replaces a backup with plants in it.
 */
export async function runCloudBackup({ force = false } = {}): Promise<'saved' | 'waiting' | 'skipped' | 'failed'> {
  if (!cloudSupported || running) return 'skipped';
  const { plants, events, profile, onboarded } = usePlantStore.getState();
  const cb = profile.cloudBackup ?? {};
  if (cb.off || !onboarded || !plants.length) return 'skipped';
  if (!force && !backupDue(cb.lastAt, new Date())) return 'skipped';
  const status = useCloudStatus.getState();
  running = true;
  status.set('saving');
  try {
    if (!(await cloudReady())) {
      status.set('waiting');
      return 'waiting';
    }
    const chain = cb.chain ?? newChain();
    await saveToCloud({ profile, plants, events }, chain);
    const st = usePlantStore.getState();
    st.setProfile({ cloudBackup: { ...st.profile.cloudBackup, chain, lastAt: new Date().toISOString() } });
    status.set('idle');
    return 'saved';
  } catch {
    status.set('failed');
    return 'failed';
  } finally {
    running = false;
  }
}

/**
 * Brings an iCloud backup back onto this phone, photos and all, and carries on its chain (so this phone's
 * weekly backups continue that line instead of starting a new one). Gives back what was on the phone
 * before, for Undo.
 */
export async function restoreFromCloud(entry: BackupEntry, onPhoto?: (done: number, total: number) => void) {
  const data = await fetchCloudBackup(entry, onPhoto);
  const before = usePlantStore.getState();
  const snap = { profile: before.profile, plants: before.plants, events: before.events };
  before.restoreBackup(data);
  const after = usePlantStore.getState();
  after.setProfile({ cloudBackup: { ...after.profile.cloudBackup, chain: entry.chain, lastAt: entry.at } });
  return { data, snap };
}
