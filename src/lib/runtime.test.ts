import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { nativeHash } from '../../scripts/native-hash.mjs';

const root = join(__dirname, '../..');
const read = (f: string) => JSON.parse(readFileSync(join(root, f), 'utf8'));

describe('over-the-air updates', () => {
  it('bumps runtimeVersion whenever native code changes', () => {
    // An update built for one runtime can crash a build with different native code, so a native change
    // needs a new runtimeVersion (and a new build). After bumping it: node scripts/native-hash.mjs --write
    const { runtimeVersion, nativeHash: recorded } = read('runtime.json');
    const app = read('app.json').expo;
    expect(app.runtimeVersion, 'runtime.json is for a different runtimeVersion: run node scripts/native-hash.mjs --write').toBe(runtimeVersion);
    expect(nativeHash(), 'Native code changed (dependencies, app.json, targets, plugins or modules). Bump expo.runtimeVersion in app.json, then run node scripts/native-hash.mjs --write. Over-the-air updates won’t reach older builds after that; ship a new build.').toBe(recorded);
  });
});
