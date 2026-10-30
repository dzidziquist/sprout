/*
 * Builds the knowledge packs that phones download (docs/knowledge.md, "Knowledge packs"):
 *
 *   npx vite-node scripts/build-kb-pack.ts -- --out dist-kb [--version 2026-10-31T17:00:00Z]
 *
 * For every format in knowledge/formats/<n>.json it writes kb/v<n>/manifest.json and the pack it points
 * to, keeping only what that format's apps understand; symptom pictures that differ from the ones built
 * into those apps go in kb/img/<md5>.png. Anything left out is listed as "needs an app update". The
 * version is the commit time unless given. Run by .github/workflows/kb-publish.yml after a merge.
 */
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { builtInIds, snapshotPack, validatePack, type KbVocab } from '../src/engine/knowledgePack';

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};
const out = arg('out') ?? 'dist-kb';
const version = arg('version') ?? execSync('git log -1 --format=%cI').toString().trim();
const md5 = (data: Buffer | string) => createHash('md5').update(data).digest('hex');

const SYMPTOM_DIR = 'assets/symptoms';
const pictures = Object.fromEntries(
  readdirSync(SYMPTOM_DIR)
    .filter((f) => /^symptom-.+\.png$/.test(f))
    .map((f) => [f.slice('symptom-'.length, -'.png'.length), join(SYMPTOM_DIR, f)]),
);

interface Format extends KbVocab {
  format: number;
  /** MD5 of each symptom picture built into this format's first app. */
  bundledImages: Record<string, string>;
}
const formats: Format[] = readdirSync('knowledge/formats')
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(join('knowledge/formats', f), 'utf8')));

const snapshot = snapshotPack(version);
const summary: string[] = [`## Knowledge pack ${version}`, ''];
mkdirSync(join(out, 'kb', 'img'), { recursive: true });

for (const f of formats) {
  const images: Record<string, { file: string; md5: string }> = {};
  for (const [id, path] of Object.entries(pictures)) {
    const sum = md5(readFileSync(path));
    if (f.bundledImages[id] === sum) continue;
    images[id] = { file: `img/${sum}.png`, md5: sum };
    if (!existsSync(join(out, 'kb', images[id].file))) copyFileSync(path, join(out, 'kb', images[id].file));
  }
  // Check against the format's own vocabulary; the ids the format's apps already have don't count here,
  // so every reference must resolve inside the pack (it's a full snapshot).
  const { pack, dropped } = validatePack({ ...snapshot, format: f.format, images }, f, f.format, { causes: [], symptoms: [], species: builtInIds().species });
  const text = JSON.stringify(pack);
  const file = `pack-${md5(text)}.json`;
  mkdirSync(join(out, 'kb', `v${f.format}`), { recursive: true });
  writeFileSync(join(out, 'kb', `v${f.format}`, file), text);
  writeFileSync(join(out, 'kb', `v${f.format}`, 'manifest.json'), JSON.stringify({ format: f.format, version, pack: file, md5: md5(text), bytes: Buffer.byteLength(text) }));
  summary.push(
    `**Format ${f.format}:** ${pack.causes.length} causes, ${pack.symptoms.length} symptoms, ${pack.mixes.length} mixes, ${Object.keys(pack.species).length} plants, ${Object.keys(images).length} new pictures (${Math.round(Buffer.byteLength(text) / 1024)} KB).`,
    dropped.length ? `Needs an app update (left out): ${dropped.join(', ')}` : 'Nothing left out.',
    '',
  );
}

// The public repo's own files: a placeholder page, a README, no search engines, no Jekyll.
writeFileSync(join(out, 'index.html'), '<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>PlantFam knowledge</title><p>Plant knowledge for the PlantFam app. Nothing to see here.</p>\n');
writeFileSync(join(out, 'robots.txt'), 'User-agent: *\nDisallow: /\n');
writeFileSync(join(out, '.nojekyll'), '');
writeFileSync(
  join(out, 'README.md'),
  '# PlantFam knowledge\n\nKnowledge packs the PlantFam app downloads: the plant doctor, potting mixes and plant notes, as data. Published automatically after review; please don\'t edit by hand.\n',
);
console.log(summary.join('\n'));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join('\n') + '\n');
