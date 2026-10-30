import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CAUSES, SPECIES_NOTES, SPECIES_NOTES_DRAFT, SYMPTOMS } from './diagnosis';
import { MIX_BRANDS } from './mixes';

/*
 * The knowledge rules (docs/knowledge.md), checked on every change: every fact behind a verified entry
 * is in the claims ledger with a page from an approved site and the exact words that support it.
 */

interface Claim { id: string; entry: string; claim: string; url: string; quote: string; verdict: 'supported' | 'partly' | 'unsupported' | 'pending'; checked?: string; checkedBy?: string }
const read = <T,>(file: string): T => JSON.parse(readFileSync(join(__dirname, '../../knowledge', file), 'utf8')) as T;
const { claims } = read<{ claims: Claim[] }>('claims.json');
const { domains } = read<{ domains: { domain: string }[] }>('sources.json');

const allowed = (url: string) => {
  const host = new URL(url).hostname.replace(/^www\./, '');
  return domains.some(({ domain }) => host === domain || host.endsWith(`.${domain}`));
};
/** Every entry a claim can be about, as "kind:id". */
const ENTRIES = new Set([
  ...Object.keys(CAUSES).map((id) => `cause:${id}`),
  ...SYMPTOMS.map((s) => `symptom:${s.id}`),
  ...MIX_BRANDS.map((b) => `mix:${b.name}`),
  ...Object.entries({ ...SPECIES_NOTES_DRAFT, ...SPECIES_NOTES }).flatMap(([sp, notes]) => Object.keys(notes).map((sym) => `note:${sp}/${sym}`)),
]);
const supported = (entry: string) => claims.some((c) => c.entry === entry && c.verdict === 'supported');

describe('knowledge ledger', () => {
  it('has well-formed claims: unique ids, an approved site over https, a real quote, a known entry', () => {
    expect(new Set(claims.map((c) => c.id)).size).toBe(claims.length);
    for (const c of claims) {
      expect(c.url, c.id).toMatch(/^https:\/\//);
      expect(allowed(c.url), `${c.id}: ${c.url} is not on knowledge/sources.json`).toBe(true);
      expect(c.quote.trim().length, c.id).toBeGreaterThanOrEqual(20);
      expect(c.quote.length, `${c.id}: quote the supporting words, not the page`).toBeLessThanOrEqual(400);
      expect(c.claim.trim().length, c.id).toBeGreaterThan(10);
      expect(['supported', 'partly', 'unsupported', 'pending'], c.id).toContain(c.verdict);
      expect(ENTRIES.has(c.entry), `${c.id}: no entry ${c.entry}`).toBe(true);
      if (c.verdict !== 'pending') expect(c.checked, c.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('only lets verified entries out with at least one supported claim', () => {
    for (const c of Object.values(CAUSES)) if (c.status === 'verified') expect(supported(`cause:${c.id}`), `cause ${c.id} is verified without a supported claim`).toBe(true);
    for (const s of SYMPTOMS) if (s.status === 'verified') expect(s.causes.length).toBeGreaterThan(0);
    for (const b of MIX_BRANDS) if (b.status === 'verified') expect(supported(`mix:${b.name}`), `mix ${b.name} is verified without a supported claim`).toBe(true);
  });

  it('never keeps an unsupported claim on a verified entry', () => {
    for (const c of claims.filter((x) => x.verdict === 'unsupported')) {
      const [kind, id] = c.entry.split(':');
      const status = kind === 'cause' ? CAUSES[id]?.status : kind === 'mix' ? MIX_BRANDS.find((b) => b.name === id)?.status : undefined;
      expect(status, `${c.id}: ${c.entry} is verified but this claim was found unsupported`).not.toBe('verified');
    }
  });

  it('cites approved sites wherever an entry lists sources', () => {
    for (const c of Object.values(CAUSES)) for (const url of c.sources ?? []) if (/^https?:/.test(url)) expect(allowed(url), `${c.id}: ${url}`).toBe(true);
  });

  it('keeps draft species notes apart from the shown ones', () => {
    for (const [sp, notes] of Object.entries(SPECIES_NOTES_DRAFT)) for (const sym of Object.keys(notes)) expect(SPECIES_NOTES[sp]?.[sym], `${sp}/${sym} is both draft and shown`).toBeUndefined();
  });
});
