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

const POT_COLORS = ['yellow', 'blue', 'coral', 'grape', 'bubblegum', 'green', 'gold'] as const;
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

const RESULTS = ['dry', 'damp', 'soggy'] as const;
const STAGES = ['seed', 'seedling', 'growing', 'flowering', 'fruiting', 'harvesting', 'resting'] as const;
const opt = (ok: (v: unknown) => boolean) => (v: unknown) => v === undefined || ok(v);
const isBool = (v: unknown): v is boolean => typeof v === 'boolean';
const every = (ok: (v: unknown) => boolean) => (v: unknown) => Array.isArray(v) && v.every(ok);
/** An object whose listed fields all pass (fields not listed are kept as they are). */
const shape = (fields: Record<string, (v: unknown) => boolean>) => (v: unknown) => isObj(v) && Object.entries(fields).every(([k, ok]) => ok(v[k]));

/** The optional plant fields, each checked all the way down when present: other code reads them without checking. */
const PLANT_OPTIONAL: Record<string, (v: unknown) => boolean> = {
  custom: shape({ commonName: isStr, latinName: opt(isStr), petToxic: opt(isBool) }),
  selfWatering: oneOf(['always', 'away']),
  room: isStr,
  windowSpot: oneOf(['sill', 'below', 'near', 'far']),
  windowId: isStr,
  parentId: isStr,
  rooting: shape({ method: oneOf(['water', 'moss', 'soil', 'leca']), startedAt: isDate }),
  mix: shape({ name: opt(isStr), fertiliser: oneOf(['yes', 'no', 'unsure']), kind: opt(oneOf(['organic', 'slow'])), bagMonths: opt((v) => isNum(v) && v > 0), pottedAt: isDate }),
  lastResult: oneOf(RESULTS),
  stage: oneOf(STAGES),
  regrowCount: (v) => isNum(v) && v >= 0,
  photoUri: isStr,
  archivedReason: oneOf(['died', 'gifted', 'composted']),
};
const isReading = shape({ at: isDate, lux: isNum, share: isNum, sunny: isBool, offPeak: opt(oneOf(['early', 'late'])), place: opt(isStr) });

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
  for (const [key, ok] of Object.entries(PLANT_OPTIONAL)) if (p[key] !== undefined && !ok(p[key])) return null;
  const created = isDate(p.createdAt) ? p.createdAt : isDate(p.acquiredAt) ? p.acquiredAt : p.nextCheckAt;
  out.createdAt = created;
  out.acquiredAt = isDate(p.acquiredAt) ? p.acquiredAt : created;
  // Light readings are only history: keep the good ones.
  if (p.lightReadings !== undefined) {
    const good = Array.isArray(p.lightReadings) ? p.lightReadings.filter(isReading) : [];
    if (good.length) out.lightReadings = good;
    else delete out.lightReadings;
  }
  return out as unknown as Plant;
}

const EVENT_OPTIONAL: Record<string, (v: unknown) => boolean> = {
  result: oneOf(RESULTS),
  amount: isNum,
  unit: isStr,
  stage: oneOf(STAGES),
  photoUri: isStr,
  note: isStr,
  nextAt: isDate,
  before: shape({ k: (v) => isNum(v) && v > 0, nextCheckAt: isDate, lastCheckAt: opt(isDate), lastResult: opt(oneOf(RESULTS)) }),
  by: isStr,
};

/** A damaged diary entry is dropped (the plant and the rest of its diary stay). */
function readEvent(e: unknown, ids: Set<string>): CareEvent | null {
  if (!isObj(e) || !isStr(e.id) || !isStr(e.plantId) || !ids.has(e.plantId) || !oneOf(EVENT_TYPES)(e.type) || !isDate(e.at)) return null;
  for (const [key, ok] of Object.entries(EVENT_OPTIONAL)) if (e[key] !== undefined && !ok(e[key])) return null;
  return e as unknown as CareEvent;
}

const isWindow = shape({ id: isStr, facing: opt(oneOf(['N', 'E', 'S', 'W'])), shade: oneOf(['none', 'sheer', 'outside']) });
const isLegacyRoom = shape({ windows: every(oneOf(['N', 'E', 'S', 'W'])), shade: oneOf(['none', 'sheer', 'outside']), unsure: opt(isBool) });
const isRoom = (v: unknown) => shape({ windows: every(isWindow) })(v) || isLegacyRoom(v);
const isClimate = (v: unknown) =>
  oneOf(['seattle', 'accra'])(v) ||
  shape({
    model: oneOf(['seattle', 'accra']),
    shift: (x) => Number.isInteger(x) && Math.abs(x as number) <= 11,
    place: isStr,
    country: opt(isStr),
    lat: (x) => isNum(x) && Math.abs(x) <= 90,
    lon: (x) => isNum(x) && Math.abs(x) <= 180,
    frost: isBool,
  })(v);

/**
 * The settings a backup may bring back, each checked all the way down. A setting with the wrong shape,
 * or one a backup never carries (the household, iCloud backup state), is left out and the phone keeps
 * its own.
 */
const PROFILE_CHECKS: Record<string, (v: unknown) => boolean> = {
  climate: isClimate,
  sunlight: shape({ key: isStr, clearness: (v) => Array.isArray(v) && v.length === 12 && v.every((x) => isNum(x) && x >= 0 && x <= 1), at: isDate }),
  city: isStr,
  faces: oneOf(['full', 'gentle', 'off']),
  spots: every(oneOf(['indoors', 'window', 'balcony', 'garden', 'growlights'])),
  grows: shape({ houseplants: isBool, edibles: isBool, cuttings: isBool, hydro: opt(isBool) }),
  round: shape({ enabled: isBool, hour: (v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 23, minute: (v) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 59 }),
  photos: oneOf(['off', 'weekly', 'monthly']),
  theme: oneOf(['system', 'light', 'dark']),
  accent: oneOf(['leaf', 'sky', 'grape', 'coral', 'bubblegum']),
  jungleView: oneOf(['grid', 'list', 'light']),
  rooms: (v) => isObj(v) && Object.values(v).every(isRoom),
  lightTips: oneOf(['important', 'daily']),
  aboutOpen: isBool,
  wishlist: every(shape({ id: isStr, speciesId: isStr, custom: opt(shape({ commonName: isStr, latinName: opt(isStr) })), note: opt(isStr), savedAt: isDate })),
  supporter: isBool,
  supporterSince: isDate,
  coachDismissed: isBool,
  growTicks: (v) => isObj(v) && Object.values(v).every(isStr),
  units: oneOf(['auto', 'imperial', 'metric']),
  idUsage: shape({ day: isStr, count: isNum }),
  trips: every(shape({ from: isDate, to: isDate, done: opt(every(isStr)) })),
};

function readProfile(raw: unknown): Partial<Profile> {
  if (!isObj(raw)) return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) if (PROFILE_CHECKS[key]?.(value)) out[key] = value;
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
