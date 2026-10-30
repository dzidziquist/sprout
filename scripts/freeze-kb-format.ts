/*
 * Writes knowledge/formats/<n>.json for the app's current pack format (KB_FORMAT): the vocabulary this
 * build understands and the symptom pictures built into it. Run once when KB_FORMAT is raised:
 *
 *   npx vite-node scripts/freeze-kb-format.ts
 */
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { APP_VOCAB, KB_FORMAT } from '../src/engine/knowledgePack';

const bundledImages = Object.fromEntries(
  readdirSync('assets/symptoms')
    .filter((f) => /^symptom-.+\.png$/.test(f))
    .sort()
    .map((f) => [f.slice('symptom-'.length, -'.png'.length), createHash('md5').update(readFileSync(`assets/symptoms/${f}`)).digest('hex')]),
);
writeFileSync(`knowledge/formats/${KB_FORMAT}.json`, JSON.stringify({ format: KB_FORMAT, ...APP_VOCAB, bundledImages }, null, 2) + '\n');
console.log(`Wrote knowledge/formats/${KB_FORMAT}.json`);
