import ledger from '../../knowledge/claims.json';
import sources from '../../knowledge/sources.json';
import { CAUSES, type Cause } from './diagnosis';

/*
 * What backs a plant doctor cause, for its "Why this advice?" panel: the supported claims from the
 * ledger (knowledge/claims.json) with the publisher's name from the approved sites (knowledge/sources.json).
 * Only verified causes have any; older causes were written before source checks (docs/knowledge.md).
 */

export interface Evidence {
  publisher: string;
  url: string;
  quote: string;
}

const publisher = (url: string) => {
  const host = new URL(url).hostname.replace(/^www\./, '');
  // The most specific approved domain wins (ipm.ucanr.edu over ucanr.edu).
  const match = sources.domains.filter(({ domain }) => host === domain || host.endsWith(`.${domain}`)).sort((a, b) => b.domain.length - a.domain.length)[0];
  return match?.name ?? host;
};

/** The supported claims behind a cause, one per quote. Empty for causes not yet source-checked. */
export function evidenceFor(causeId: string): Evidence[] {
  if (CAUSES[causeId]?.status !== 'verified') return [];
  return ledger.claims.filter((c) => c.entry === `cause:${causeId}` && c.verdict === 'supported').map((c) => ({ publisher: publisher(c.url), url: c.url, quote: c.quote }));
}

/** "Oct 2026" for a cause checked against its sources, or undefined. */
export function checkedMonth(cause: Pick<Cause, 'status' | 'reviewed'>): string | undefined {
  if (cause.status !== 'verified' || !cause.reviewed) return undefined;
  const [y, m] = cause.reviewed.split('-').map(Number);
  return new Date(y, m - 1, 15).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}
