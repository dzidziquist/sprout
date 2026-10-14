/**
 * Offshoots family tree layout. Pure functions, no React.
 *
 * A "family" is a root plant plus everyone propagated from it (by `parentId`), drawn as a tidy tree:
 * one row per generation, leaves placed left to right in equal slots, and every parent centred over
 * its first and last child. Plants that have no parent and no babies are "singletons" and are
 * returned separately so the screen can decide what to do with them.
 *
 * Defensive rules (the data is user-edited and synced, so it can be messy):
 * - a `parentId` that points to a plant we don't have (hard-deleted, not synced yet) is ignored: the plant becomes a root;
 * - a plant that is its own parent is a root;
 * - a parent cycle (A → B → A) is broken at the member that comes first in the input, which becomes a root.
 */

export interface LineagePlant {
  id: string;
  parentId?: string;
}

export interface LayoutOptions {
  /** Width of one node box (circle + label). */
  nodeWidth: number;
  /** Height of one node box. Edges leave a parent from its bottom and enter a child at its top. */
  nodeHeight: number;
  /** Horizontal space between neighbouring node boxes. */
  gapX: number;
  /** Vertical space between generations (where the connectors are drawn). */
  gapY: number;
  /** Space around the whole family. */
  padding: number;
}

export const DEFAULT_LAYOUT: LayoutOptions = { nodeWidth: 104, nodeHeight: 120, gapX: 8, gapY: 36, padding: 8 };

export interface TreeNode<T extends LineagePlant> {
  id: string;
  plant: T;
  /** 0 for the root, 1 for its babies, … */
  depth: number;
  /** The parent used for drawing (undefined for the root, even if the raw `parentId` was dangling or cyclic). */
  parentId?: string;
  /** Top-left of the node box. */
  x: number;
  y: number;
  /** Horizontal centre of the node box. */
  cx: number;
  /**
   * Set on a "+N more" placeholder that stands in for a collapsed group of siblings. `more` is how many
   * siblings it hides, `hiddenTotal` how many plants that is including their own babies. A placeholder's
   * `plant` is the parent whose group was collapsed and its `id` is `<parentId>+more`.
   */
  more?: number;
  hiddenTotal?: number;
}

export interface CollapseOptions {
  /** Sibling groups larger than this are collapsed. */
  maxChildren: number;
  /** How many siblings stay visible in a collapsed group (the rest become one "+N more" node). */
  keep: number;
  /** Parents whose group the user expanded. */
  expanded?: ReadonlySet<string>;
}

export const moreNodeId = (parentId: string) => `${parentId}+more`;

export interface TreeEdge {
  from: string;
  to: string;
  /** Bottom-centre of the parent box. */
  x1: number;
  y1: number;
  /** Top-centre of the child box. */
  x2: number;
  y2: number;
}

export interface FamilyLayout<T extends LineagePlant> {
  root: T;
  /** Nodes in depth-first order (root first). */
  nodes: TreeNode<T>[];
  edges: TreeEdge[];
  width: number;
  height: number;
  /** Number of rows (root counts as generation 1). Counts hidden rows too. */
  generations: number;
  /** Every plant in the family, including ones hidden in a collapsed group. */
  members: number;
  /** Parents whose sibling group is big enough to collapse (whether or not it is collapsed right now). */
  collapsible: string[];
  /** Where this family starts if all families are drawn side by side on one canvas. */
  offsetX: number;
}

export interface ForestLayout<T extends LineagePlant> {
  families: FamilyLayout<T>[];
  /** Plants with no parent and no babies, in input order. */
  singletons: T[];
  /** Width of all families side by side (separated by one gapX). */
  totalWidth: number;
}

/** The parent each plant hangs from after dropping dangling links and breaking cycles. */
export function resolveParents<T extends LineagePlant>(plants: readonly T[]): Map<string, string | undefined> {
  const byId = new Map<string, T>();
  for (const p of plants) if (!byId.has(p.id)) byId.set(p.id, p);
  const order = new Map<string, number>();
  [...byId.keys()].forEach((id, i) => order.set(id, i));

  const parent = new Map<string, string | undefined>();
  for (const p of byId.values()) {
    parent.set(p.id, p.parentId && p.parentId !== p.id && byId.has(p.parentId) ? p.parentId : undefined);
  }

  // Walk up from every plant; a walk that meets itself is a cycle. Cut it at its earliest member.
  const settled = new Set<string>();
  for (const start of byId.keys()) {
    const path: string[] = [];
    const onPath = new Set<string>();
    let cur: string | undefined = start;
    while (cur !== undefined && !settled.has(cur)) {
      if (onPath.has(cur)) {
        const cycle = path.slice(path.indexOf(cur));
        const cut = cycle.reduce((a, b) => (order.get(a)! <= order.get(b)! ? a : b));
        parent.set(cut, undefined);
        break;
      }
      onPath.add(cur);
      path.push(cur);
      cur = parent.get(cur);
    }
    for (const id of path) settled.add(id);
  }
  return parent;
}

/** Lay out every family in the fam. Children keep input order, so sort the input (e.g. by acquiredAt) first. */
export function layoutForest<T extends LineagePlant>(
  plants: readonly T[],
  options: Partial<LayoutOptions> = {},
  collapse?: CollapseOptions,
): ForestLayout<T> {
  const o = { ...DEFAULT_LAYOUT, ...options };
  const parent = resolveParents(plants);
  const byId = new Map<string, T>();
  for (const p of plants) if (!byId.has(p.id)) byId.set(p.id, p);

  const children = new Map<string, string[]>();
  for (const id of byId.keys()) {
    const pid = parent.get(id);
    if (pid !== undefined) children.set(pid, [...(children.get(pid) ?? []), id]);
  }

  const slot = o.nodeWidth + o.gapX;
  const row = o.nodeHeight + o.gapY;
  const families: FamilyLayout<T>[] = [];
  const singletons: T[] = [];
  let offsetX = 0;

  for (const [id, plant] of byId) {
    if (parent.get(id) !== undefined) continue;
    if (!children.get(id)?.length) {
      singletons.push(plant);
      continue;
    }

    const nodes: TreeNode<T>[] = [];
    const edges: TreeEdge[] = [];
    const collapsible: string[] = [];
    let nextLeaf = 0;
    let maxDepth = 0;
    let members = 0;
    const count = (nid: string): number => 1 + (children.get(nid) ?? []).reduce((n, k) => n + count(k), 0);

    // Post-order: leaves take the next free slot, parents sit midway over their first and last child.
    const place = (nid: string, depth: number, pid: string | undefined): TreeNode<T> => {
      const node: TreeNode<T> = { id: nid, plant: byId.get(nid)!, depth, parentId: pid, x: 0, y: o.padding + depth * row, cx: 0 };
      nodes.push(node);
      members++;
      maxDepth = Math.max(maxDepth, depth);
      let ids = children.get(nid) ?? [];
      let hidden: string[] = [];
      if (collapse && ids.length > collapse.maxChildren) {
        collapsible.push(nid);
        if (!collapse.expanded?.has(nid)) {
          const keep = Math.max(1, Math.min(collapse.keep, collapse.maxChildren));
          hidden = ids.slice(keep);
          ids = ids.slice(0, keep);
        }
      }
      const kids = ids.map((k) => place(k, depth + 1, nid));
      if (hidden.length) {
        const hiddenTotal = hidden.reduce((n, k) => n + count(k), 0);
        members += hiddenTotal;
        const cx = o.padding + nextLeaf++ * slot + o.nodeWidth / 2;
        const more: TreeNode<T> = { id: moreNodeId(nid), plant: node.plant, depth: depth + 1, parentId: nid, x: cx - o.nodeWidth / 2, y: o.padding + (depth + 1) * row, cx, more: hidden.length, hiddenTotal };
        nodes.push(more);
        kids.push(more);
        const deepest = (k: string, d: number): number => Math.max(d, ...(children.get(k) ?? []).map((g) => deepest(g, d + 1)));
        maxDepth = Math.max(maxDepth, ...hidden.map((k) => deepest(k, depth + 1)));
      }
      const center = kids.length
        ? (kids[0].cx + kids[kids.length - 1].cx) / 2
        : o.padding + nextLeaf++ * slot + o.nodeWidth / 2;
      node.cx = center;
      node.x = center - o.nodeWidth / 2;
      for (const k of kids) edges.push({ from: nid, to: k.id, x1: center, y1: node.y + o.nodeHeight, x2: k.cx, y2: k.y });
      return node;
    };
    place(id, 0, undefined);

    const width = o.padding * 2 + nextLeaf * o.nodeWidth + (nextLeaf - 1) * o.gapX;
    const drawnDepth = Math.max(...nodes.map((n) => n.depth));
    const height = o.padding * 2 + (drawnDepth + 1) * o.nodeHeight + drawnDepth * o.gapY;
    families.push({ root: plant, nodes, edges, width, height, generations: maxDepth + 1, members, collapsible, offsetX });
    offsetX += width + o.gapX;
  }

  return { families, singletons, totalWidth: Math.max(0, offsetX - o.gapX) };
}

/** A soft S-curve from parent to child, as an SVG path. */
export function edgePath(e: Pick<TreeEdge, 'x1' | 'y1' | 'x2' | 'y2'>): string {
  const mid = (e.y1 + e.y2) / 2;
  return `M${e.x1} ${e.y1}C${e.x1} ${mid} ${e.x2} ${mid} ${e.x2} ${e.y2}`;
}

/* ---------------- Rooting ---------------- */

export type RootingMethod = 'water' | 'moss' | 'soil' | 'leca';

/**
 * Days before we suggest potting a cutting up. Deliberately simple, one number per method:
 * water and LECA show roots through the glass and most common houseplant cuttings (pothos,
 * philodendron, tradescantia) have 2–5 cm roots by about three weeks; moss and soil hide the
 * roots and are slower to judge, so we wait four weeks and let the user do a gentle tug test.
 */
export const POT_UP_AFTER_DAYS: Record<RootingMethod, number> = { water: 21, leca: 21, moss: 28, soil: 28 };

export function rootingDays(startedAt: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(startedAt).getTime()) / 86400000));
}

export function isReadyToPotUp(p: { rooting?: { method: RootingMethod; startedAt: string }; archivedAt?: string }, now: Date): boolean {
  return !!p.rooting && !p.archivedAt && rootingDays(p.rooting.startedAt, now) >= POT_UP_AFTER_DAYS[p.rooting.method];
}

/** 0–1 progress towards the pot-up threshold (for the ring around a rooting cutting). */
export function rootingProgress(rooting: { method: RootingMethod; startedAt: string }, now: Date): number {
  return Math.min(1, rootingDays(rooting.startedAt, now) / POT_UP_AFTER_DAYS[rooting.method]);
}
