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
    // Numeric entities (&#8217; and friends) first, so the named-quote rules below catch them too.
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&nbsp;|\u00a0/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;|&lsquo;|[‘’]/g, "'").replace(/&quot;|&ldquo;|&rdquo;|[“”]/g, '"').replace(/&ndash;|&mdash;|[–—]/g, '-')
    .replace(/\s+/g, ' ')
    // Some sites (RHS) leave a space before punctuation where a link ended: "gooseberries , grapes".
    .replace(/ ([,.;:!?)])/g, '$1')
    .toLowerCase();

/** A bot-protection page sent with HTTP 200 instead of the article (Clemson's Cloudflare). */
const isChallenge = (raw) => raw.length < 20000 && /challenge-platform|cf-chl|just a moment|enable javascript and cookies/i.test(raw);

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
    } else if ((res.headers.get('content-type') ?? '').includes('pdf')) {
      status = 'check by hand';
      detail = 'PDF: this script can’t read the text';
    } else {
      const raw = await res.text();
      if (isChallenge(raw)) {
        status = 'check by hand';
        detail = 'the site showed a bot check instead of the page';
        rows.push(`| 👀 ${status} | ${url} | ${[...new Set(list.map((c) => c.entry))].join(', ')} | ${detail} |`);
        continue;
      }
      const text = norm(raw);
      const missing = list.filter((c) => !text.includes(norm(c.quote)));
      if (missing.length) {
        status = 'changed';
        detail = `quote no longer on the page: ${missing.map((c) => c.id).join(', ')}`;
      }
    }
  } catch (e) {
    // A redirect loop is a site that wants cookies (UF/IFAS), not a dead page.
    // Only a domain that no longer exists counts as broken here; resets, timeouts, TLS hiccups and
    // bot walls (UC IPM and UF/IFAS from CI runners) are a person's job to check.
    const code = e?.cause?.code ?? '';
    const why = String(e?.cause?.message ?? e?.message ?? e);
    if (code === 'ENOTFOUND') {
      status = 'broken';
      detail = `the site doesn’t exist any more (${why})`;
    } else {
      status = 'check by hand';
      detail = /redirect/i.test(why) ? 'the site keeps redirecting (it wants cookies)' : `couldn’t load it from here (${code || why})`;
    }
  }
  if (status === 'broken' || status === 'changed') failed += 1;
  rows.push(`| ${status === 'ok' ? '✅' : status === 'check by hand' ? '👀' : '❌'} ${status} | ${url} | ${[...new Set(list.map((c) => c.entry))].join(", ")} | ${detail} |`);
}

const verified = rows.filter((r) => r.startsWith('| ✅')).length;
const unverified = rows.filter((r) => r.startsWith('| 👀')).length;
const report = [
  '## Knowledge sources',
  '',
  `${byUrl.size} pages behind ${claims.length} claims: ${verified} still say what we quote, ${unverified} could not be checked (check by hand), ${failed} need fixing.`,
  ...(unverified && !failed ? ['', 'Nothing here was found wrong, but the pages above were **not** verified.'] : []),
  '',
  '| Result | Page | Backs | Detail |',
  '|---|---|---|---|',
  ...rows,
  '',
].join('\n');
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
process.exit(failed ? 1 : 0);
