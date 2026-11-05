// The native side of the app, hashed. Over-the-air updates only reach builds with the same
// runtimeVersion (app.json), so anything that changes native code must bump it and ship a new build.
// Covers dependencies, app.json, targets/, plugins/, patches/ and local native modules (modules/).
// runtime.json records the hash for the current runtimeVersion; src/lib/runtime.test.ts compares them.
// Run from the repository root: node scripts/native-hash.mjs [--write]
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const walk = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)])) : []);

export function nativeHash() {
  const h = createHash('sha256');
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  h.update(JSON.stringify(pkg.dependencies ?? {}));
  const app = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8'));
  // The marketing version and the runtime version itself don't change native code.
  delete app.expo.version;
  delete app.expo.runtimeVersion;
  h.update(JSON.stringify(app));
  // Local native modules (modules/*): their Swift/Kotlin code, podspecs and config, not their JS bridge.
  const isNative = (f) => !/[\\/]node_modules[\\/]/.test(f) && (!f.includes(`${join(root, 'modules')}`) || !/\.(m?[jt]sx?)$/.test(f));
  for (const f of ['targets', 'plugins', 'patches', 'modules'].flatMap((d) => walk(join(root, d))).filter(isNative).sort()) {
    h.update(relative(root, f).replaceAll('\\', '/'));
    h.update(readFileSync(f, 'utf8').replace(/\r\n/g, '\n'));
  }
  return h.digest('hex');
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const runtimeVersion = JSON.parse(readFileSync(join(root, 'app.json'), 'utf8')).expo.runtimeVersion;
  const hash = nativeHash();
  if (process.argv.includes('--write')) writeFileSync(join(root, 'runtime.json'), `${JSON.stringify({ runtimeVersion, nativeHash: hash }, null, 2)}\n`);
  console.log(runtimeVersion, hash);
}
