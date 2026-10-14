import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUT, edgePath, isReadyToPotUp, layoutForest, resolveParents, rootingDays, rootingProgress } from './treeLayout';

const p = (id: string, parentId?: string) => ({ id, parentId });
const O = { nodeWidth: 100, nodeHeight: 100, gapX: 10, gapY: 40, padding: 0 };

describe('resolveParents', () => {
  it('keeps valid links and drops dangling and self links', () => {
    const m = resolveParents([p('a'), p('b', 'a'), p('c', 'ghost'), p('d', 'd')]);
    expect(m.get('a')).toBeUndefined();
    expect(m.get('b')).toBe('a');
    expect(m.get('c')).toBeUndefined();
    expect(m.get('d')).toBeUndefined();
  });

  it('breaks a cycle at its earliest member', () => {
    const m = resolveParents([p('x', 'z'), p('y', 'x'), p('z', 'y'), p('tail', 'y')]);
    expect(m.get('x')).toBeUndefined();
    expect(m.get('y')).toBe('x');
    expect(m.get('z')).toBe('y');
    expect(m.get('tail')).toBe('y');
  });

  it('breaks a two-plant cycle reached from outside', () => {
    const m = resolveParents([p('c', 'a'), p('a', 'b'), p('b', 'a')]);
    expect(m.get('a')).toBeUndefined();
    expect(m.get('b')).toBe('a');
    expect(m.get('c')).toBe('a');
  });
});

describe('layoutForest', () => {
  it('returns no families for an empty or link-free fam', () => {
    expect(layoutForest([]).families).toEqual([]);
    const f = layoutForest([p('a'), p('b')]);
    expect(f.families).toEqual([]);
    expect(f.singletons.map((s) => s.id)).toEqual(['a', 'b']);
    expect(f.totalWidth).toBe(0);
  });

  it('centres a parent over its children, one row per generation', () => {
    const { families } = layoutForest([p('mom'), p('k1', 'mom'), p('k2', 'mom'), p('k3', 'mom')], O);
    expect(families).toHaveLength(1);
    const f = families[0];
    const at = (id: string) => f.nodes.find((n) => n.id === id)!;
    expect([at('k1').cx, at('k2').cx, at('k3').cx]).toEqual([50, 160, 270]);
    expect(at('mom').cx).toBe(160);
    expect(at('mom').y).toBe(0);
    expect(at('k1').y).toBe(140);
    expect(f.generations).toBe(2);
    expect(f.width).toBe(320);
    expect(f.height).toBe(240);
  });

  it('lays out the demo fam: grandchildren under the right parent, no overlaps', () => {
    const { families, singletons } = layoutForest(
      [p('queen'), p('queenie', 'queen'), p('fig'), p('rootie', 'queenie'), p('sprig', 'queen')],
      O,
    );
    expect(singletons.map((s) => s.id)).toEqual(['fig']);
    const f = families[0];
    expect(f.root.id).toBe('queen');
    expect(f.generations).toBe(3);
    const at = (id: string) => f.nodes.find((n) => n.id === id)!;
    expect(at('rootie').depth).toBe(2);
    expect(at('queenie').cx).toBe(at('rootie').cx);
    expect(at('queen').cx).toBe((at('queenie').cx + at('sprig').cx) / 2);
    // No two nodes in a row overlap.
    for (const a of f.nodes) for (const b of f.nodes) if (a !== b && a.depth === b.depth) expect(Math.abs(a.cx - b.cx)).toBeGreaterThanOrEqual(O.nodeWidth);
    expect(f.edges.map((e) => `${e.from}>${e.to}`).sort()).toEqual(['queen>queenie', 'queen>sprig', 'queenie>rootie']);
    const e = f.edges.find((x) => x.to === 'rootie')!;
    expect(e.y1).toBe(at('queenie').y + O.nodeHeight);
    expect(e.y2).toBe(at('rootie').y);
  });

  it('puts multiple families side by side and treats dangling parents as roots', () => {
    const { families, totalWidth } = layoutForest([p('a'), p('a1', 'a'), p('orphan', 'deleted'), p('o1', 'orphan'), p('o2', 'orphan')], O);
    expect(families.map((f) => f.root.id)).toEqual(['a', 'orphan']);
    expect(families[0].offsetX).toBe(0);
    expect(families[1].offsetX).toBe(families[0].width + O.gapX);
    expect(totalWidth).toBe(families[0].width + O.gapX + families[1].width);
  });

  it('survives a cycle and still includes every plant once', () => {
    const { families, singletons } = layoutForest([p('x', 'y'), p('y', 'x'), p('solo')], O);
    expect(singletons.map((s) => s.id)).toEqual(['solo']);
    expect(families).toHaveLength(1);
    expect(families[0].nodes.map((n) => n.id).sort()).toEqual(['x', 'y']);
    expect(families[0].root.id).toBe('x');
  });

  it('ignores duplicate ids and uses default options', () => {
    const { families } = layoutForest([p('a'), p('b', 'a'), p('b', 'a')]);
    expect(families[0].nodes).toHaveLength(2);
    expect(families[0].width).toBe(DEFAULT_LAYOUT.padding * 2 + DEFAULT_LAYOUT.nodeWidth);
  });
});

describe('edgePath', () => {
  it('draws a vertical S-curve between the anchors', () => {
    expect(edgePath({ x1: 10, y1: 0, x2: 50, y2: 40 })).toBe('M10 0C10 20 50 20 50 40');
  });
});

describe('rooting helpers', () => {
  const now = new Date('2026-10-14T12:00:00Z');
  const ago = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

  it('counts whole days', () => {
    expect(rootingDays(ago(18), now)).toBe(18);
    expect(rootingDays(ago(-2), now)).toBe(0);
  });

  it('is ready at 21 days in water and 28 in moss or soil', () => {
    expect(isReadyToPotUp({ rooting: { method: 'water', startedAt: ago(18) } }, now)).toBe(false);
    expect(isReadyToPotUp({ rooting: { method: 'water', startedAt: ago(21) } }, now)).toBe(true);
    expect(isReadyToPotUp({ rooting: { method: 'moss', startedAt: ago(27) } }, now)).toBe(false);
    expect(isReadyToPotUp({ rooting: { method: 'soil', startedAt: ago(40) } }, now)).toBe(true);
    expect(isReadyToPotUp({}, now)).toBe(false);
    expect(isReadyToPotUp({ rooting: { method: 'moss', startedAt: ago(40) }, archivedAt: ago(1) }, now)).toBe(false);
  });

  it('caps progress at 1', () => {
    expect(rootingProgress({ method: 'moss', startedAt: ago(14) }, now)).toBe(0.5);
    expect(rootingProgress({ method: 'moss', startedAt: ago(90) }, now)).toBe(1);
  });
});
