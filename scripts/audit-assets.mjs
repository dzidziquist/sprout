// Run from the repository root: node scripts/audit-assets.mjs
// Read-only asset audit; writes the review gallery and inventory under docs/.
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]);
const records = walk(join(root, 'assets')).filter((p) => p.endsWith('.png')).sort().map((p) => {
  const bytes = readFileSync(p);
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error(`Invalid PNG: ${p}`);
  return { path: relative(root, p), width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20),
    bytes: bytes.length, alphaChannel: [4, 6].includes(bytes[25]),
    sourceArchive: p.includes('/incoming/'), sha256: createHash('sha256').update(bytes).digest('hex') };
});
const paths = new Set(records.map((r) => resolve(root, r.path)));
const refs = [];
for (const p of [...walk(join(root, 'src')), ...walk(join(root, 'app'))].filter((p) => /\.[jt]sx?$/.test(p))) {
  for (const m of readFileSync(p, 'utf8').matchAll(/require\(['"]([^'"]+\.png)['"]\)/g)) {
    refs.push({ source: relative(root, p), asset: resolve(dirname(p), m[1]) });
  }
}
for (const m of readFileSync(join(root, 'app.json'), 'utf8').matchAll(/"(\.\/assets\/[^\"]+\.png)"/g)) {
  refs.push({ source: 'app.json', asset: resolve(root, m[1]) });
}
const missing = refs.filter((r) => !paths.has(r.asset));
if (missing.length) throw new Error(`Missing referenced assets:\n${missing.map((r) => `${r.source}: ${r.asset}`).join('\n')}`);
const used = new Set(refs.map((r) => r.asset));
for (const record of records) record.referenced = used.has(resolve(root, record.path));
writeFileSync(join(root, 'docs/asset-inventory.json'), `${JSON.stringify(records, null, 2)}\n`);
const cards = records.map((r) => `<figure data-name="${r.path}" data-archive="${r.sourceArchive}"><div class="image"><img loading="lazy" src="../${r.path}" alt="${r.path.split('/').at(-1)}"></div><figcaption>${r.path}<small>${r.width} × ${r.height} · ${Math.round(r.bytes / 1024)} KB · ${r.alphaChannel ? 'alpha channel' : 'opaque format'} · ${r.sourceArchive ? 'source archive' : r.referenced ? 'registered' : 'available'}</small></figcaption></figure>`).join('\n');
writeFileSync(join(root, 'docs/asset-gallery.html'), `<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>PlantFam asset review</title>
<style>body{font:16px system-ui;background:#f5f3ed;color:#202126;margin:24px}header{position:sticky;top:0;background:#f5f3ed;padding:12px 0;z-index:1}h1{margin:0 0 8px}input[type=search]{padding:10px;width:min(420px,85%);font:inherit;margin-right:16px}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:16px}figure{margin:0;border:1px solid #c5c9bf;border-radius:12px;overflow:hidden;background:white}.image{height:210px;display:flex;align-items:center;justify-content:center;background:repeating-conic-gradient(#e5e7df 0 25%,#fff 0 50%) 0/20px 20px}img{max-width:100%;max-height:100%;object-fit:contain}figcaption{padding:12px;font-size:12px;overflow-wrap:anywhere}small{display:block;color:#555;margin-top:6px}[hidden]{display:none}</style>
<header><h1>PlantFam asset review</h1><p>Inspect species, mood, clipping, transparency and names. Source exports are preserved separately.</p><input id="search" type="search" placeholder="Filter by plant, mood or folder" aria-label="Filter assets"><label><input id="archive" type="checkbox"> Include incoming originals</label><p id="count" aria-live="polite"></p></header>
<main>${cards}</main><script>const search=document.querySelector('#search'),archive=document.querySelector('#archive'),cards=[...document.querySelectorAll('figure')];function filter(){let n=0;for(const c of cards){c.hidden=(!archive.checked&&c.dataset.archive==='true')||!c.dataset.name.toLowerCase().includes(search.value.toLowerCase());if(!c.hidden)n++}document.querySelector('#count').textContent=n+' assets shown'}search.addEventListener('input',filter);archive.addEventListener('change',filter);filter();</script></html>\n`);
console.log(`${records.length} valid PNG headers; ${refs.length} references resolved. Gallery and inventory saved to docs/.`);
