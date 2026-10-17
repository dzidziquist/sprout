import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..', '..');
const artSource = readFileSync(join(__dirname, 'art.ts'), 'utf8');
const buddySource = ['buddyImages.ts', 'expandedBuddyImages.ts']
  .map((file) => readFileSync(join(__dirname, file), 'utf8')).join('\n');

describe('illustration assets', () => {
  it('every image referenced by the art map exists', () => {
    const refs = [...(artSource + buddySource).matchAll(/require\('\.\.\/\.\.\/(assets\/[^']+)'\)/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(30);
    for (const r of refs) expect(existsSync(join(root, r)), r).toBe(true);
  });

  it('has all 56 illustrated plants in all three moods, with no unregistered files', () => {
    const files = readdirSync(join(root, 'assets', 'buddies'));
    expect(files.length).toBe(168);
    for (const f of files) expect(f).toMatch(/^[a-z0-9-]+-(happy|thirsty|snoozing)\.png$/);
    const registered = [...buddySource.matchAll(/assets\/buddies\/([^']+)\.png/g)].map((m) => `${m[1]}.png`);
    expect([...registered].sort()).toEqual([...files].sort());
    const plants = new Set(files.map((f) => f.replace(/-(happy|thirsty|snoozing)\.png$/, '')));
    expect(plants.size).toBe(56);
    for (const plant of plants) {
      for (const mood of ['happy', 'thirsty', 'snoozing']) expect(files).toContain(`${plant}-${mood}.png`);
    }
  });

  it('keeps every configured app icon and splash image resolvable', () => {
    const config = readFileSync(join(root, 'app.json'), 'utf8');
    const refs = [...config.matchAll(/"(\.\/assets\/[^\"]+\.png)"/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(8);
    for (const ref of refs) expect(existsSync(join(root, ref)), ref).toBe(true);
  });
});
