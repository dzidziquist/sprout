// Run from the repository root: node scripts/plant-art.mjs <species-id> [--dry-run]
// Makes a new plant buddy's three moods with OpenAI's image model (docs/intake.md, "Missing plants").
// Reads docs/intake/art/<id>.json { id, pot, happy, thirsty, snoozing } and the style block in
// docs/asset-prompts-v3-new-plants.md, and writes assets/buddies/<id>-{happy,thirsty,snoozing}.png at the
// app's size (640×640, transparent, pot near the bottom), all three framed the same way.
// Needs OPENAI_API_KEY (a GitHub Actions secret; never commit or print it).
import { readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';

const { PNG } = createRequire(import.meta.url)('pngjs');
const root = resolve(import.meta.dirname, '..');
const id = process.argv[2];
const dry = process.argv.includes('--dry-run');
if (!id || !/^[a-z0-9-]+$/.test(id)) throw new Error('Usage: node scripts/plant-art.mjs <species-id>');

const spec = JSON.parse(readFileSync(join(root, 'docs/intake/art', `${id}.json`), 'utf8'));
for (const k of ['happy', 'thirsty', 'snoozing']) if (typeof spec[k] !== 'string' || spec[k].length < 40) throw new Error(`${id}.json: "${k}" prompt missing`);
const doc = readFileSync(join(root, 'docs/asset-prompts-v3-new-plants.md'), 'utf8');
const style = doc.split('## 2. STYLE BLOCK')[1]?.split('```')[1]?.trim();
if (!style) throw new Error('Style block not found in docs/asset-prompts-v3-new-plants.md');

const SIZE = 640;
const MARGIN = 14;
const BASELINE = 624; // bottom of the pot, like the existing buddies

const refs = ['design/asset-concepts/plant-buddies-sheet.png', 'assets/buddies/pothos-happy.png', 'assets/buddies/monstera-happy.png'];
const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1';

async function edit(images, prompt) {
  const form = new FormData();
  form.append('model', model);
  form.append('prompt', prompt);
  form.append('size', '1024x1024');
  form.append('background', 'transparent');
  form.append('quality', 'high');
  form.append('output_format', 'png');
  images.forEach((buf, i) => form.append('image[]', new Blob([buf], { type: 'image/png' }), `ref-${i}.png`));
  for (let attempt = 1; ; attempt++) {
    const r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: form });
    if (r.ok) {
      const j = await r.json();
      return Buffer.from(j.data[0].b64_json, 'base64');
    }
    const msg = (await r.text()).slice(0, 300);
    if (attempt >= 3 || r.status < 500) throw new Error(`OpenAI ${r.status}: ${msg}`);
    await new Promise((res) => setTimeout(res, 4000 * attempt));
  }
}

/** Bounding box of the visible pixels. */
function bbox(png) {
  let x0 = png.width, y0 = png.height, x1 = -1, y1 = -1;
  for (let y = 0; y < png.height; y++) for (let x = 0; x < png.width; x++) {
    if (png.data[(y * png.width + x) * 4 + 3] > 16) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  if (x1 < 0) throw new Error('Image is empty');
  return { x0, y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

/** One framing for all moods, from the happy image: fit inside the margins, pot bottom on the baseline. */
function framing(png) {
  const b = bbox(png);
  const scale = Math.min((SIZE - 2 * MARGIN) / b.w, (BASELINE - MARGIN) / b.h);
  return { b, scale, dx: (SIZE - b.w * scale) / 2, dy: BASELINE - b.h * scale };
}

/** Area-average resample (premultiplied alpha) into the 640 canvas. */
function place(src, f) {
  const out = new PNG({ width: SIZE, height: SIZE });
  const inv = 1 / f.scale;
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const sx0 = f.b.x0 + (x - f.dx) * inv, sy0 = f.b.y0 + (y - f.dy) * inv;
    let r = 0, g = 0, bl = 0, a = 0, n = 0;
    for (let sy = Math.floor(sy0); sy < Math.ceil(sy0 + inv); sy++) for (let sx = Math.floor(sx0); sx < Math.ceil(sx0 + inv); sx++) {
      n++;
      if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
      const i = (sy * src.width + sx) * 4, al = src.data[i + 3] / 255;
      r += src.data[i] * al; g += src.data[i + 1] * al; bl += src.data[i + 2] * al; a += al;
    }
    const o = (y * SIZE + x) * 4;
    if (a > 0) { out.data[o] = r / a; out.data[o + 1] = g / a; out.data[o + 2] = bl / a; }
    out.data[o + 3] = n ? Math.round((a / n) * 255) : 0;
  }
  return out;
}

function check(png, mood) {
  if (png.width !== 1024 || png.height !== 1024) throw new Error(`${mood}: model returned ${png.width}×${png.height}`);
  const corner = (x, y) => png.data[(y * png.width + x) * 4 + 3];
  if ([corner(0, 0), corner(1023, 0), corner(0, 1023), corner(1023, 1023)].some((a) => a > 16)) throw new Error(`${mood}: background isn't transparent`);
}

// --reframe=<in.png>,<out.png>: run only the framing on an existing image (to test it without the API).
const reframe = process.argv.find((a) => a.startsWith('--reframe='));
if (reframe) {
  const [inp, out] = reframe.slice(10).split(',');
  const png = PNG.sync.read(readFileSync(inp));
  writeFileSync(out, PNG.sync.write(place(png, framing(png))));
  console.log(`reframed ${inp} -> ${out}`);
  process.exit(0);
}

if (dry) {
  console.log(`OK: ${id}.json has three prompts; pot ${spec.pot ?? '(unset)'}; model ${model}. Dry run, nothing generated.`);
  process.exit(0);
}
if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');

const refBufs = refs.map((p) => readFileSync(join(root, p)));
const happyRaw = await edit(refBufs, `${style}\n\n${spec.happy}`);
const happy = PNG.sync.read(happyRaw);
check(happy, 'happy');
const f = framing(happy);
const moods = { happy };
for (const mood of ['thirsty', 'snoozing']) {
  const png = PNG.sync.read(await edit([happyRaw, refBufs[0]], `${style}\n\n${spec[mood]}`));
  check(png, mood);
  moods[mood] = png;
}
for (const [mood, png] of Object.entries(moods)) {
  const out = join(root, 'assets/buddies', `${id}-${mood}.png`);
  writeFileSync(out, PNG.sync.write(place(png, f)));
  console.log(`wrote ${out}`);
}
