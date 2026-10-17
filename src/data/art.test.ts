import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '..', '..');
const artSource = readFileSync(join(__dirname, 'art.ts'), 'utf8');

describe('illustration assets', () => {
  it('every image referenced by the art map exists', () => {
    const refs = [...artSource.matchAll(/require\('\.\.\/\.\.\/(assets\/[^']+)'\)/g)].map((m) => m[1]);
    expect(refs.length).toBeGreaterThan(30);
    for (const r of refs) expect(existsSync(join(root, r)), r).toBe(true);
  });

  it('has the 151 plant buddies in the names the app loads: {plant}-{mood}.png', () => {
    const files = readdirSync(join(root, 'assets', 'buddies'));
    expect(files.length).toBe(151);
    for (const f of files) expect(f).toMatch(/^[a-z0-9-]+-(happy|thirsty|snoozing)\.png$/);
  });
});
