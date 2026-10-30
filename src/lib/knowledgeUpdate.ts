import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';
import { KB_BASE, KB_BUILT } from '@/config';
import { SYMPTOM_ART } from '@/data/symptomArt';
import { applyPack, builtInIds, KB_FORMAT, APP_VOCAB, PackError, validatePack, type KnowledgePack } from '@/engine/knowledgePack';

/*
 * Keeps the plant knowledge fresh without a new build (docs/knowledge.md, "Knowledge packs"). Once a day,
 * when the app opens, it fetches a small manifest from GitHub Pages; when there's a newer pack it
 * downloads it and any new pictures, checks every file against its MD5, checks every entry against what
 * this build understands, and only then lays it over the built-in knowledge and keeps it for next time.
 * Nothing about the person or their plants is sent: these are plain file downloads.
 *
 * On disk (Documents/kb): active.json names the pack in use; pack-<md5>.json; img/<md5>.png.
 */

const DAY = 86_400_000;
const ACTIVE = 'active.json';
const CHECKED = 'checked.json';

export interface KnowledgeStatus {
  /** The knowledge in use: built in, or a downloaded pack. */
  source: 'built-in' | 'pack';
  /** When that knowledge was merged (ISO), if known. */
  version?: string;
  checking: boolean;
}

let status: KnowledgeStatus = { source: 'built-in', version: KB_BUILT, checking: false };
const listeners = new Set<() => void>();
const setStatus = (next: Partial<KnowledgeStatus>) => {
  status = { ...status, ...next };
  listeners.forEach((l) => l());
};
export const useKnowledgeStatus = () =>
  useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => status,
  );

// What the app knows before any pack, captured once, so a newer pack is checked against the build and
// not against an older pack.
let known: ReturnType<typeof builtInIds> | null = null;
let knownArt: typeof SYMPTOM_ART = {};
const builtIn = () => {
  if (!known) {
    known = builtInIds();
    knownArt = { ...SYMPTOM_ART };
  }
  return known;
};

const fs = () => require('expo-file-system') as typeof import('expo-file-system'); // eslint-disable-line @typescript-eslint/no-require-imports
const kbDir = () => {
  const { Directory, Paths } = fs();
  const dir = new Directory(Paths.document, 'kb');
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
};
const readJson = (name: string): unknown => {
  const { File } = fs();
  const f = new File(kbDir(), name);
  return f.exists ? JSON.parse(f.textSync()) : null;
};
const writeText = (name: string, text: string) => {
  const { File } = fs();
  const f = new File(kbDir(), name);
  if (!f.exists) f.create();
  f.write(text);
  return f;
};
const newer = (a: string | undefined, than: string | undefined) => !!a && (!than || Date.parse(a) > Date.parse(than));

/** Points the symptom tiles at the pack's pictures on disk, and the rest back at the built-in ones. */
function showImages(pack: KnowledgePack) {
  const { File } = fs();
  for (const id of Object.keys(SYMPTOM_ART)) if (!(id in knownArt)) delete SYMPTOM_ART[id];
  Object.assign(SYMPTOM_ART, knownArt);
  for (const [id, img] of Object.entries(pack.images)) {
    const f = new File(kbDir(), img.file);
    if (f.exists) SYMPTOM_ART[id] = { uri: f.uri };
  }
}

function adopt(pack: KnowledgePack) {
  applyPack(pack);
  showImages(pack);
  setStatus({ source: 'pack', version: pack.version });
}

/**
 * Lays the saved pack over the built-in knowledge. Called once at startup, before the first screen draws;
 * synchronous and quick (a ~100 KB file). Anything wrong and the app just keeps its built-in knowledge.
 */
export function loadSavedKnowledge(): void {
  if (Platform.OS === 'web') return;
  builtIn();
  try {
    const active = readJson(ACTIVE) as { pack?: string } | null;
    if (!active?.pack) return;
    const raw = readJson(active.pack);
    const { pack } = validatePack(raw, APP_VOCAB, KB_FORMAT, builtIn());
    // A build made after this pack already has everything in it.
    if (newer(pack.version, KB_BUILT)) adopt(pack);
  } catch {
    // Keep the built-in knowledge.
  }
}

export type CheckResult = 'updated' | 'current' | 'offline' | 'skipped' | 'bad-pack';

/**
 * Looks for a newer pack and, when there is one, downloads, checks and applies it. Without `force` it
 * looks at most once a day.
 */
export async function checkForKnowledge(force = false): Promise<CheckResult> {
  if (Platform.OS === 'web' || status.checking) return 'skipped';
  builtIn();
  const { File } = fs();
  const dir = kbDir();
  try {
    const last = (readJson(CHECKED) as { at?: number } | null)?.at ?? 0;
    if (!force && Date.now() - last < DAY) return 'skipped';
  } catch {
    // Unreadable: check now.
  }
  setStatus({ checking: true });
  try {
    // The time on the end gets past any cache between here and GitHub Pages.
    const res = await fetch(`${KB_BASE}/v${KB_FORMAT}/manifest.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return res.status === 404 ? 'current' : 'offline';
    const m = (await res.json()) as { format?: number; version?: string; pack?: string; md5?: string };
    writeText(CHECKED, JSON.stringify({ at: Date.now() }));
    if (m.format !== KB_FORMAT || typeof m.pack !== 'string' || !/^pack-[a-f0-9]{32}\.json$/.test(m.pack) || m.pack !== `pack-${m.md5}.json`) return 'bad-pack';
    if (!newer(m.version, status.version)) return 'current';

    const packFile = new File(dir, m.pack);
    if (!packFile.exists || packFile.md5 !== m.md5) {
      const got = await fetch(`${KB_BASE}/v${KB_FORMAT}/${m.pack}`);
      if (!got.ok) return 'offline';
      writeText(m.pack, await got.text());
      if (packFile.md5 !== m.md5) {
        packFile.delete();
        return 'bad-pack';
      }
    }
    const { pack } = validatePack(JSON.parse(packFile.textSync()), APP_VOCAB, KB_FORMAT, builtIn());
    if (!newer(pack.version, status.version)) return 'current';

    const imgDir = new (fs().Directory)(dir, 'img');
    if (!imgDir.exists) imgDir.create({ idempotent: true });
    for (const img of Object.values(pack.images)) {
      const f = new File(dir, img.file);
      if (f.exists && f.md5 === img.md5) continue;
      if (f.exists) f.delete();
      await File.downloadFileAsync(`${KB_BASE}/${img.file}`, f);
      if (f.md5 !== img.md5) {
        f.delete();
        return 'bad-pack';
      }
    }

    writeText(ACTIVE, JSON.stringify({ pack: m.pack, version: pack.version }));
    adopt(pack);
    tidy(m.pack, pack);
    return 'updated';
  } catch (e) {
    return e instanceof PackError || e instanceof SyntaxError ? 'bad-pack' : 'offline';
  } finally {
    setStatus({ checking: false });
  }
}

/** Removes packs and pictures the active pack no longer uses. */
function tidy(keep: string, pack: KnowledgePack) {
  const { Directory, File } = fs();
  const dir = kbDir();
  try {
    for (const f of dir.list()) if (f instanceof File && /^pack-.+\.json$/.test(f.name) && f.name !== keep) f.delete();
    const used = new Set(Object.values(pack.images).map((i) => i.file.slice('img/'.length)));
    const img = new Directory(dir, 'img');
    if (img.exists) for (const f of img.list()) if (f instanceof File && !used.has(f.name)) f.delete();
  } catch {
    // Leftovers are harmless.
  }
}
