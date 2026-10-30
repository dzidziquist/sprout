import type { KnowledgeStatus } from './diagnosis';
import type { Plant } from '../types';

/*
 * Well-known bagged mixes, so typing a name fills in what kind of food it carries. Kept short and only
 * where the maker's own label is clear; the weekly knowledge task (docs/knowledge.md) grows it, each
 * entry with a source.
 *
 *   organic  rich organic ingredients (worm castings, guano, fish or kelp meal, compost): strong at first,
 *            spent in about a month
 *   slow     slow-release granules ("feeds for up to 3/6 months"), which a pot rinses out sooner
 *   none     no added fertiliser
 */

export type MixKind = NonNullable<NonNullable<Plant['mix']>['kind']>;

export interface MixBrand {
  /** Matched against what the person typed, case and spacing ignored. */
  match: RegExp;
  name: string;
  kind: MixKind | 'none';
  source: string;
  /** When it was last checked against the maker's label, as YYYY-MM (docs/knowledge.md). */
  reviewed?: string;
  status?: KnowledgeStatus;
}

export const MIX_BRANDS: MixBrand[] = [
  { match: /ocean\s*forest/, name: 'FoxFarm Ocean Forest', kind: 'organic', source: 'FoxFarm Ocean Forest label: earthworm castings, bat guano, fish and crab meal' },
  { match: /happy\s*frog/, name: 'FoxFarm Happy Frog', kind: 'organic', source: 'FoxFarm Happy Frog label: earthworm castings, bat guano, mycorrhizal fungi' },
  { match: /coast\s*of\s*maine/, name: 'Coast of Maine', kind: 'organic', source: 'Coast of Maine potting soil labels: compost, kelp, lobster and crab shell' },
  { match: /espoma/, name: 'Espoma Organic Potting Mix', kind: 'organic', source: 'Espoma Organic Potting Mix label: earthworm castings, alfalfa meal, kelp meal' },
  { match: /dr\.?\s*earth/, name: 'Dr. Earth', kind: 'organic', source: 'Dr. Earth potting soil labels: organic fertilisers and compost' },
  { match: /kellogg/, name: 'Kellogg Garden Organics', kind: 'organic', source: 'Kellogg Garden Organics potting mix labels: organic plant food' },
  { match: /miracle\s*-?\s*gro/, name: 'Miracle-Gro', kind: 'slow', source: 'Miracle-Gro Potting Mix label: "feeds up to 6 months"' },
  { match: /osmocote/, name: 'Osmocote', kind: 'slow', source: 'Osmocote potting mix label: slow-release plant food' },
  { match: /scotts/, name: 'Scotts', kind: 'slow', source: 'Scotts potting soil labels: continuous-release plant food' },
];

/** The well-known mix this name refers to, if any. */
export function mixBrand(name: string): MixBrand | undefined {
  const text = name.toLowerCase().replace(/\s+/g, ' ').trim();
  return text ? MIX_BRANDS.find((b) => b.status !== 'draft' && b.match.test(text)) : undefined;
}
