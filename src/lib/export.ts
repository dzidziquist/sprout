import { speciesOf } from '../data/species';
import type { Profile } from '../store/plantStore';
import type { CareEvent, Plant } from '../types';

/*
 * Backups (free for everyone): a full JSON file you can restore on any phone.
 * Spreadsheet export (free): the care diary as CSV.
 * The builders are pure so they can be tested; file writing and sharing load lazily so this
 * module stays importable from tests and from the web build.
 */

export const JSON_FILE = 'plantfam-backup.json';
export const CSV_FILE = 'plantfam-care-diary.csv';

export interface ExportSource {
  profile: Profile;
  plants: Plant[];
  events: CareEvent[];
}

/** Profile fields that are app plumbing rather than the user's data. `supporter` stays so a tip's thank-you moves phones. */
const INTERNAL_PROFILE_KEYS = ['plus', 'streakFreezes', 'lastBackupAt'] as const;

export function buildExportJson(src: ExportSource, now = new Date()): string {
  // `plus` is the old (pre tip jar) name of `supporter`, still dropped from older profiles.
  const profile: Partial<Profile> & { plus?: boolean } = { ...src.profile };
  for (const k of INTERNAL_PROFILE_KEYS) delete profile[k];
  const doc = {
    app: 'PlantFam',
    format: 1,
    exportedAt: now.toISOString(),
    profile,
    plants: src.plants,
    events: src.events,
  };
  return JSON.stringify(doc, null, 2);
}

/** RFC 4180 cell: quote when needed, double inner quotes, and defuse spreadsheet formulas. */
export function csvCell(value: unknown): string {
  if (value === undefined || value === null) return '';
  let s = String(value);
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const CSV_HEADER = ['date', 'plant', 'species', 'event', 'result', 'amount', 'unit', 'note'] as const;

export function buildCareDiaryCsv(plants: Plant[], events: CareEvent[]): string {
  const byId = new Map(plants.map((p) => [p.id, p]));
  const rows = [...events]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((e) => {
      const plant = byId.get(e.plantId);
      const species = plant ? speciesOf(plant)?.commonName ?? plant.speciesId : '';
      let note = e.note;
      // Cutting events store the new plant's id in `note`; show its name instead.
      if (e.type === 'cutting' && note) note = `Cutting: ${byId.get(note)?.name ?? 'new plant'}`;
      return [e.at, plant?.name ?? '(deleted plant)', species, e.type, e.result ?? e.stage ?? '', e.amount ?? '', e.unit ?? '', note ?? ''];
    });
  return [CSV_HEADER as readonly unknown[], ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export type ExportOutcome = { ok: true } | { ok: false; message: string };

export interface BackupData {
  profile: Partial<Profile>;
  plants: Plant[];
  events: CareEvent[];
  exportedAt?: string;
}

export type BackupParse = { ok: true; data: BackupData } | { ok: false; message: string };

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

/** Validate a backup file before it's allowed anywhere near the store. */
export function parseBackup(text: string): BackupParse {
  let doc: unknown;
  try {
    doc = JSON.parse(text.replace(/^\uFEFF/, ''));
  } catch {
    return { ok: false, message: "That file isn't a PlantFam backup (it isn't valid JSON)." };
  }
  if (!isObj(doc) || doc.app !== 'PlantFam') return { ok: false, message: "That file isn't a PlantFam backup." };
  if (typeof doc.format !== 'number' || doc.format > 1) return { ok: false, message: 'This backup is from a newer PlantFam. Update the app, then try again.' };
  if (!Array.isArray(doc.plants) || !Array.isArray(doc.events)) return { ok: false, message: 'This backup looks damaged (no plants list).' };
  const plants = doc.plants.filter(
    (p): p is Plant => isObj(p) && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.speciesId === 'string' && typeof p.nextCheckAt === 'string' && typeof p.k === 'number',
  );
  if (plants.length !== doc.plants.length) return { ok: false, message: 'This backup looks damaged (some plants are unreadable).' };
  const ids = new Set(plants.map((p) => p.id));
  const events = doc.events.filter((e): e is CareEvent => isObj(e) && typeof e.id === 'string' && typeof e.plantId === 'string' && typeof e.type === 'string' && typeof e.at === 'string' && ids.has(e.plantId));
  return { ok: true, data: { profile: isObj(doc.profile) ? (doc.profile as Partial<Profile>) : {}, plants, events, exportedAt: typeof doc.exportedAt === 'string' ? doc.exportedAt : undefined } };
}

/** Let the user pick a backup file and read it as text. Null if they cancelled. */
export async function pickBackupText(): Promise<string | null> {
  const DocumentPicker = require('expo-document-picker') as typeof import('expo-document-picker');
  const res = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true, multiple: false });
  if (res.canceled || !res.assets?.[0]) return null;
  const asset = res.assets[0];
  const { Platform } = require('react-native') as typeof import('react-native');
  if (Platform.OS === 'web') {
    if (asset.file) return await asset.file.text();
    return await (await fetch(asset.uri)).text();
  }
  const { File } = require('expo-file-system') as typeof import('expo-file-system');
  return await new File(asset.uri).text();
}

/** Free backup: just the JSON file. */
export function backupMyData(src: ExportSource): Promise<ExportOutcome> {
  return shareFiles([{ name: JSON_FILE, mime: 'application/json', uti: 'public.json', body: buildExportJson(src) }]);
}

/** Free for everyone: the care diary as a spreadsheet for Numbers, Excel or Sheets. */
export function exportSpreadsheet(src: ExportSource): Promise<ExportOutcome> {
  return shareFiles([
    // A BOM helps Excel read names with accents and emoji as UTF-8.
    { name: CSV_FILE, mime: 'text/csv', uti: 'public.comma-separated-values-text', body: '\uFEFF' + buildCareDiaryCsv(src.plants, src.events) },
  ]);
}

/** Write files and hand them to the share sheet (device) or download them (web). */
async function shareFiles(files: { name: string; mime: string; uti: string; body: string }[]): Promise<ExportOutcome> {
  const { Platform } = require('react-native') as typeof import('react-native');
  try {
    if (Platform.OS === 'web') {
      for (const f of files) {
        const url = URL.createObjectURL(new Blob([f.body], { type: `${f.mime};charset=utf-8` }));
        const a = document.createElement('a');
        a.href = url;
        a.download = f.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
      return { ok: true };
    }
    const { File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
    const Sharing = require('expo-sharing') as typeof import('expo-sharing');
    if (!(await Sharing.isAvailableAsync())) return { ok: false, message: "Sharing isn't available on this device." };
    for (const f of files) {
      const file = new File(Paths.cache, f.name);
      if (file.exists) file.delete();
      file.create();
      file.write(f.body);
      // One share sheet per file; each waits until the previous one is closed.
      await Sharing.shareAsync(file.uri, { mimeType: f.mime, UTI: f.uti, dialogTitle: f.name });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, message: (e as Error)?.message || 'Something went wrong while exporting.' };
  }
}
