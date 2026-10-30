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
const INTERNAL_PROFILE_KEYS = ['plus', 'streakFreezes', 'lastBackupAt', 'cloudBackup', 'household'] as const;

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
const isStr = (v: unknown): v is string => typeof v === 'string';
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isDate = (v: unknown): v is string => isStr(v) && !Number.isNaN(new Date(v).getTime());
const oneOf = <T extends string>(list: readonly T[]) => (v: unknown): v is T => isStr(v) && (list as readonly string[]).includes(v);

const POT_COLORS = ['yellow', 'blue', 'coral', 'grape', 'bubblegum', 'gold'] as const;
const SOILS = ['potting_mix', 'chunky_aroid', 'gritty', 'perlite_mix', 'bagged_cactus', 'veg_mix', 'coir', 'moisture_control', 'moss', 'garden_soil', 'leca', 'water', 'unsure'] as const;
const POT_MATERIALS = ['plastic', 'glazed', 'terracotta', 'fabric'] as const;
const LIGHTS = ['low', 'medium', 'bright', 'direct'] as const;
const PLACEMENTS = ['indoor', 'growlight', 'outdoor', 'covered_outdoor', 'ground'] as const;
const ORIGINS = ['bought', 'cutting', 'swap', 'gift', 'seed', 'scraps'] as const;
const EVENT_TYPES = ['check', 'water', 'feed', 'repot', 'prune', 'pest', 'cutting', 'photo', 'note', 'harvest', 'rooted', 'stage', 'regrow', 'refresh', 'staked', 'diagnosis', 'archived', 'restored'] as const;

/**
 * A plant's fields that must be a valid value when present. A field an older backup never had is
 * filled with the same default a new plant starts from; one that is present but wrong makes the
 * whole backup unreadable, so a damaged file never replaces a working jungle.
 */
const PLANT_ENUMS: [string, (v: unknown) => boolean, unknown][] = [
  ['potColor', oneOf(POT_COLORS), 'yellow'],
  ['soil', oneOf(SOILS), 'potting_mix'],
  ['potMaterial', oneOf(POT_MATERIALS), 'plastic'],
  ['light', oneOf(LIGHTS), 'medium'],
  ['placement', oneOf(PLACEMENTS), 'indoor'],
  ['origin', oneOf(ORIGINS), 'bought'],
];
const PLANT_DATES = ['acquiredAt', 'createdAt', 'lastRepottedAt', 'lastCheckAt', 'archivedAt', 'stageAt', 'lastRefreshedAt'] as const;

function readPlant(p: unknown): Plant | null {
  if (!isObj(p) || !isStr(p.id) || !p.id || !isStr(p.name) || !isStr(p.speciesId) || !p.speciesId || !isDate(p.nextCheckAt) || !isNum(p.k) || p.k <= 0) return null;
  const out: Record<string, unknown> = { ...p };
  for (const [key, ok, fallback] of PLANT_ENUMS) {
    if (p[key] === undefined) out[key] = fallback;
    else if (!ok(p[key])) return null;
  }
  if (p.potDiameterCm === undefined) out.potDiameterCm = 15;
  else if (!isNum(p.potDiameterCm) || p.potDiameterCm <= 0) return null;
  for (const key of PLANT_DATES) if (p[key] !== undefined && !isDate(p[key])) return null;
  const created = isDate(p.createdAt) ? p.createdAt : isDate(p.acquiredAt) ? p.acquiredAt : p.nextCheckAt;
  out.createdAt = created;
  out.acquiredAt = isDate(p.acquiredAt) ? p.acquiredAt : created;
  if (p.mix !== undefined && !(isObj(p.mix) && isDate(p.mix.pottedAt) && oneOf(['yes', 'no', 'unsure'])(p.mix.fertiliser))) return null;
  if (p.rooting !== undefined && !(isObj(p.rooting) && isDate(p.rooting.startedAt))) return null;
  if (p.lightReadings !== undefined && !Array.isArray(p.lightReadings)) delete out.lightReadings;
  return out as unknown as Plant;
}

function readEvent(e: unknown, ids: Set<string>): CareEvent | null {
  if (!isObj(e) || !isStr(e.id) || !isStr(e.plantId) || !ids.has(e.plantId) || !oneOf(EVENT_TYPES)(e.type) || !isDate(e.at)) return null;
  return e as unknown as CareEvent;
}

/**
 * The settings in a backup that other code reads without checking. A setting with the wrong shape is
 * left out (the phone keeps its own); the rest come through.
 */
const PROFILE_CHECKS: Record<string, (v: unknown) => boolean> = {
  round: (v) => isObj(v) && typeof v.enabled === 'boolean' && isNum(v.hour) && isNum(v.minute),
  grows: (v) => isObj(v) && typeof v.houseplants === 'boolean' && typeof v.edibles === 'boolean' && typeof v.cuttings === 'boolean',
  photos: oneOf(['off', 'weekly', 'monthly']),
  theme: oneOf(['system', 'light', 'dark']),
  faces: oneOf(['full', 'gentle', 'off']),
  units: oneOf(['auto', 'imperial', 'metric']),
  accent: oneOf(['leaf', 'sky', 'grape', 'coral', 'bubblegum']),
  jungleView: oneOf(['grid', 'list', 'light']),
  climate: (v) => isStr(v) || (isObj(v) && isStr(v.model) && isNum(v.shift) && isNum(v.lat) && isNum(v.lon) && typeof v.frost === 'boolean'),
  city: isStr,
  spots: Array.isArray,
  wishlist: Array.isArray,
  trips: Array.isArray,
  rooms: isObj,
  growTicks: isObj,
  idUsage: (v) => isObj(v) && isStr(v.day) && isNum(v.count),
  streakFreezes: isNum,
  supporter: (v) => typeof v === 'boolean',
  coachDismissed: (v) => typeof v === 'boolean',
};

function readProfile(raw: unknown): Partial<Profile> {
  if (!isObj(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    const check = PROFILE_CHECKS[key];
    if (!check || check(value)) out[key] = value;
  }
  return out as Partial<Profile>;
}

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
  const plants = doc.plants.map(readPlant).filter((p): p is Plant => !!p);
  if (plants.length !== doc.plants.length) return { ok: false, message: 'This backup looks damaged (some plants are unreadable).' };
  const ids = new Set(plants.map((p) => p.id));
  if (ids.size !== plants.length) return { ok: false, message: 'This backup looks damaged (two plants share an id).' };
  const events = doc.events.map((e) => readEvent(e, ids)).filter((e): e is CareEvent => !!e);
  return { ok: true, data: { profile: readProfile(doc.profile), plants, events, exportedAt: typeof doc.exportedAt === 'string' ? doc.exportedAt : undefined } };
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
