import type { CareEvent, Plant } from '../types';

/*
 * The weekly iCloud backup, the decisions only (the files are in lib/cloudBackup). Layout in the app's
 * hidden iCloud folder:
 *
 *   backups/<chain>/<yyyy-mm-dd>.json   the same file as "Back up now", one per week, newest four kept
 *   photos/<name>                        every diary photo, uploaded once and shared by all backups
 *
 * A chain is one phone's line of backups. A phone that starts fresh gets a new chain, so it can never
 * overwrite the backup someone chose not to restore; a phone that restores carries on that chain.
 */

export const BACKUPS_DIR = 'backups';
export const PHOTOS_DIR = 'photos';
/** Weekly backups kept per chain. */
export const KEEP = 4;
const WEEK_MS = 7 * 86400000;

/** No backup yet, or the last one is a week old. */
export function backupDue(lastAt: string | undefined, now: Date): boolean {
  return !lastAt || now.getTime() - new Date(lastAt).getTime() >= WEEK_MS;
}

/** File name for a backup made on this local day: a second one the same day replaces the first. */
export function backupName(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.json`;
}

/** The backups to delete from a chain so only the newest KEEP stay. */
export function toPrune(names: string[]): string[] {
  const dated = names.filter((n) => /^\d{4}-\d{2}-\d{2}\.json$/.test(n)).sort();
  return dated.slice(0, Math.max(0, dated.length - KEEP));
}

/** A new chain id: random, so two phones never share one by accident. */
export function newChain(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** File names of the diary photos a backup points at (only photos kept in the diary folder travel). */
export function photoNames(plants: Plant[], events: CareEvent[]): string[] {
  const refs = [...plants.map((p) => p.photoUri), ...events.map((e) => e.photoUri)];
  const names = refs.filter((r): r is string => !!r && /^diary\/[^/]+$/.test(r)).map((r) => r.slice('diary/'.length));
  return [...new Set(names)];
}

/** One backup in the Restore list. */
export interface BackupEntry {
  chain: string;
  file: string;
  /** When it was saved (from inside the file, else its name). */
  at: string;
  plants: number;
  photos: number;
  /** Weeks of streak when it was saved (0: none going). */
  streak?: number;
}

/** Newest first, across chains. */
export function sortEntries(entries: BackupEntry[]): BackupEntry[] {
  return [...entries].sort((a, b) => b.at.localeCompare(a.at));
}

/** "Sunday, Oct 26" for the list and the welcome screen. */
export function backupDay(at: string): string {
  return new Date(at).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

/** "saved Sunday", "saved today", "saved Oct 2" for the switch's subtitle. */
export function savedWords(at: string, now: Date): string {
  const d = new Date(at);
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((day(now) - day(d)) / 86400000);
  if (days <= 0) return 'saved today';
  if (days === 1) return 'saved yesterday';
  if (days < 7) return `saved ${d.toLocaleDateString('en-US', { weekday: 'long' })}`;
  return `saved ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
}
