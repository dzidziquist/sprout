import { describe, expect, it } from 'vitest';
import { PHOTO_GRACE_MS, unusedPhotos, backupDue, backupName, newChain, photoNames, savedWords, sortEntries, toPrune } from './cloudBackup';
import type { CareEvent, Plant } from '../types';

describe('cloud backup schedule', () => {
  const now = new Date(2026, 9, 29, 9);
  it('is due with no backup yet, or a week after the last', () => {
    expect(backupDue(undefined, now)).toBe(true);
    expect(backupDue(new Date(2026, 9, 23, 9).toISOString(), now)).toBe(false);
    expect(backupDue(new Date(2026, 9, 22, 9).toISOString(), now)).toBe(true);
  });
  it('names a backup by its local day', () => {
    expect(backupName(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05.json');
  });
  it('keeps the newest four and ignores stray files', () => {
    expect(toPrune(['2026-10-26.json', '2026-10-05.json', '2026-09-28.json', '2026-10-19.json', '2026-10-12.json', '.DS_Store'])).toEqual(['2026-09-28.json']);
    expect(toPrune(['2026-10-26.json'])).toEqual([]);
  });
  it('gives each phone its own chain', () => {
    expect(newChain()).not.toBe(newChain());
  });
});

describe('what a backup carries', () => {
  it('lists each diary photo once, leaving out photos from outside the diary folder', () => {
    const plants = [{ photoUri: 'diary/a.jpg' }, { photoUri: undefined }] as Plant[];
    const events = [{ photoUri: 'diary/a.jpg' }, { photoUri: 'diary/b.jpg' }, { photoUri: 'file:///old/c.jpg' }, {}] as CareEvent[];
    expect(photoNames(plants, events)).toEqual(['a.jpg', 'b.jpg']);
  });
});

describe('words', () => {
  const now = new Date(2026, 9, 29, 12); // Thursday
  it('says when it was saved', () => {
    expect(savedWords(new Date(2026, 9, 29, 8).toISOString(), now)).toBe('saved today');
    expect(savedWords(new Date(2026, 9, 28, 8).toISOString(), now)).toBe('saved yesterday');
    expect(savedWords(new Date(2026, 9, 26, 8).toISOString(), now)).toBe('saved Monday');
    expect(savedWords(new Date(2026, 9, 2, 8).toISOString(), now)).toBe('saved Oct 2');
  });
  it('lists backups newest first across phones', () => {
    const e = (chain: string, at: string) => ({ chain, file: 'x', at, plants: 1, photos: 0 });
    expect(sortEntries([e('a', '2026-10-12T00:00:00Z'), e('b', '2026-10-26T00:00:00Z'), e('a', '2026-10-19T00:00:00Z')]).map((x) => x.at.slice(5, 10))).toEqual(['10-26', '10-19', '10-12']);
  });
});

describe('photo cleanup', () => {
  const now = Date.UTC(2026, 9, 29);
  it('deletes photos no kept backup uses, once they are a couple of days old', () => {
    const stored = [
      { name: 'kept.jpg', born: now - 10 * 86400000 },
      { name: 'gone.jpg', born: now - 10 * 86400000 },
      { name: 'just-sent.jpg', born: now - 3600000 },
    ];
    expect(unusedPhotos(stored, ['kept.jpg'], now)).toEqual(['gone.jpg']);
    expect(unusedPhotos([{ name: 'edge.jpg', born: now - PHOTO_GRACE_MS }], [], now)).toEqual([]);
  });
});
