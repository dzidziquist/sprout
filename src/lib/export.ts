import { speciesOf } from '../data/species';
import type { Profile } from '../store/plantStore';
import type { CareEvent, Plant } from '../types';

/*
 * "Export my data" (PlantFam Plus): a full JSON backup plus a spreadsheet-friendly care diary.
 * The builders are pure so they can be tested; file writing and sharing load lazily so this
 * module stays importable from tests and from the web build.
 */

export const JSON_FILE = 'plantfam-export.json';
export const CSV_FILE = 'plantfam-care-diary.csv';

export interface ExportSource {
  profile: Profile;
  plants: Plant[];
  events: CareEvent[];
}

/** Profile fields that are app plumbing rather than the user's data. */
const INTERNAL_PROFILE_KEYS = ['plus', 'streakFreezes'] as const;

export function buildExportJson(src: ExportSource, now = new Date()): string {
  const profile: Partial<Profile> = { ...src.profile };
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

/** Write both files and hand them to the share sheet (device) or download them (web). */
export async function exportMyData(src: ExportSource): Promise<ExportOutcome> {
  const files = [
    { name: JSON_FILE, mime: 'application/json', uti: 'public.json', body: buildExportJson(src) },
    // A BOM helps Excel read names with accents and emoji as UTF-8.
    { name: CSV_FILE, mime: 'text/csv', uti: 'public.comma-separated-values-text', body: '﻿' + buildCareDiaryCsv(src.plants, src.events) },
  ];
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
