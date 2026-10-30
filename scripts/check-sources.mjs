// The weekly source check (docs/knowledge.md): opens every page in knowledge/claims.json and confirms
// it still loads and still contains the exact words quoted. Run: node scripts/check-sources.mjs
// Exit code 1 when a page is gone or no longer says what we quoted; pages that refuse robots (401/403/429)
// are listed for a person to check by hand, without failing the run.
import { appendFileSync, readFileSync } from 'node:fs';

const { claims } = JSON.parse(readFileSync(new URL('../knowledge/claims.json', import.meta.url), 'utf8'));
const norm = (t) =>
  t
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|&lsquo;|[‘’]/g, "'").replace(/&quot;|&ldquo;|&rdquo;|[“”]/g, '"').replace(/&ndash;|&mdash;|[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .toLowerCase();

const byUrl = new Map();
for (const c of claims) byUrl.set(c.url, [...(byUrl.get(c.url) ?? []), c]);

const rows = [];
let failed = 0;
for (const [url, list] of byUrl) {
  let status = 'ok';
  let detail = '';
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'user-agent': 'Mozilla/5.0 (PlantFam knowledge check; +https://github.com/dzidziquist/sprout)' }, signal: AbortSignal.timeout(20000) });
    if ([401, 403, 429].includes(res.status)) {
      status = 'check by hand';
      detail = `the site refuses automated visits (${res.status})`;
    } else if (!res.ok) {
      status = 'broken';
      detail = `HTTP ${res.status}`;
    } else {
      const text = norm(await res.text());
      const missing = list.filter((c) => !text.includes(norm(c.quote)));
      if (missing.length) {
        status = 'changed';
        detail = `quote no longer on the page: ${missing.map((c) => c.id).join(', ')}`;
      }
    }
  } catch (e) {
    status = 'broken';
    detail = String(e?.message ?? e);
  }
  if (status === 'broken' || status === 'changed') failed += 1;
  rows.push(`| ${status === 'ok' ? '✅' : status === 'check by hand' ? '👀' : '❌'} ${status} | ${url} | ${[...new Set(list.map((c) => c.entry))].join(", ")} | ${detail} |`);
}

const report = [
  '## Knowledge sources',
  '',
  `${byUrl.size} pages behind ${claims.length} claims. ${failed ? `**${failed} need fixing**` : 'All still say what we quote.'}`,
  '',
  '| Result | Page | Backs | Detail |',
  '|---|---|---|---|',
  ...rows,
  '',
].join('\n');
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
process.exit(failed ? 1 : 0);
