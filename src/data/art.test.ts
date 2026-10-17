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

  it('registers every plant buddy file, named {plant}-{mood}.png', () => {
    const files = readdirSync(join(root, 'assets', 'buddies'));
    for (const f of files) expect(f).toMatch(/^[a-z0-9-]+-(happy|thirsty|snoozing)\.png$/);
    const registered = [...buddySource.matchAll(/assets\/buddies\/([^']+)\.png/g)].map((m) => `${m[1]}.png`);
    expect([...new Set(registered)].sort()).toEqual([...files].sort());
    // Every plant has its happy face; thirsty and snoozing fall back to it until their own art arrives.
    const plants = new Set(files.map((f) => f.replace(/-(happy|thirsty|snoozing)\.png$/, '')));
    for (const plant of plants) expect(files).toContain(`${plant}-happy.png`);
  });

  it('keeps every configured app icon and splash image resolvable', () => {
    const config = readFileSync(join(root, 'app.json'), 'utf8');
    const refs = [...config.matchAll(/"(\.\/assets\/[^\"]+\.png)"/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(8);
    for (const ref of refs) expect(existsSync(join(root, ref)), ref).toBe(true);
  });
});
