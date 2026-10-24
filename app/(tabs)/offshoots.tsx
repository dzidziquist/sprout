import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useTabPadding } from '@/hooks/useTabPadding';
import { usePlantStore } from '@/store/plantStore';
import { isReadyToPotUp, layoutForest, POT_UP_AFTER_DAYS, rootingDays } from '@/engine/treeLayout';
import { FamilyTree, TREE_LAYOUT } from '@/components/FamilyTree';
import { TreeList } from '@/components/TreeList';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Label, Sticker, Title } from '@/components/ui';
import { textOn, useColors, type Palette } from '@/theme/theme';
import { fonts, type, space } from '@/theme/tokens';
import * as haptics from '@/lib/haptics';

const METHOD_WORD = { water: 'in water', moss: 'in moss', soil: 'in soil', leca: 'in LECA' } as const;
const PAGE_PAD = 20;
/** Sibling groups bigger than this fold into "+N more"; two siblings plus the fold fit a phone screen. */
const COLLAPSE = { maxChildren: 4, keep: 2 };

type View_ = 'tree' | 'list';

export default function OffshootsScreen() {
  const pad = useTabPadding(16);
  const router = useRouter();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const plants = usePlantStore((s) => s.plants);
  const faces = usePlantStore((s) => s.profile.faces);
  const now = new Date();
  const { width: screenW } = useWindowDimensions();
  const available = screenW - PAGE_PAD * 2;
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [chosen, setChosen] = useState<Record<string, View_>>({});
  // One family at a time (the one with the newest baby, unless picked), so the page doesn't grow with every family.
  const [pick, setPick] = useState<string | null>(null);

  // Oldest first, so the first cutting sits on the left of its siblings.
  const sorted = useMemo(() => [...plants].sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt)), [plants]);
  const forest = useMemo(() => layoutForest(sorted, TREE_LAYOUT, { ...COLLAPSE, expanded }), [sorted, expanded]);
  // Everyone visible, for the list view (it grows downwards, so nothing needs folding).
  const full = useMemo(() => layoutForest(sorted, TREE_LAYOUT), [sorted]);
  const fullById = useMemo(() => new Map(full.families.map((f) => [f.root.id, f])), [full]);
  // Width with every big group folded: decides tree vs list, so opening a "+N more" keeps the tree you tapped.
  const foldedWidth = useMemo(() => new Map(layoutForest(sorted, TREE_LAYOUT, COLLAPSE).families.map((f) => [f.root.id, f.width])), [sorted]);
  const toggleGroup = (id: string) =>
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const newest = useMemo(() => {
    let best: { id: string; at: string } | undefined;
    for (const f of full.families) {
      const at = f.nodes.reduce((m, n) => (n.plant.acquiredAt > m ? n.plant.acquiredAt : m), '');
      if (!best || at > best.at) best = { id: f.root.id, at };
    }
    return best?.id;
  }, [full]);
  const shownId = pick === 'all' ? 'all' : pick && forest.families.some((f) => f.root.id === pick) ? pick : newest;
  const shown = shownId === 'all' ? forest.families : forest.families.filter((f) => f.root.id === shownId);
  const babies = plants.filter((p) => p.parentId);
  const stats = [
    { n: babies.length, label: babies.length === 1 ? 'baby plant' : 'baby plants', bg: c.lavender },
    // Rooted: made it out of the jar, whether they stayed or went to a new home.
    { n: babies.filter((p) => !p.rooting).length, label: 'rooted', bg: c.mint },
    { n: plants.filter((p) => p.archivedReason === 'gifted').length, label: 'gifted', bg: c.blush },
  ];
  const ready = plants
    .filter((p) => isReadyToPotUp(p, now))
    .sort((a, b) => a.rooting!.startedAt.localeCompare(b.rooting!.startedAt));

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentInsetAdjustmentBehavior={pad.contentInsetAdjustmentBehavior} contentContainerStyle={[styles.page, { paddingTop: pad.paddingTop, paddingBottom: pad.paddingBottom }]}>
      <View>
        <Title size="largeTitle">Offshoots</Title>
        <Label muted>Every cutting keeps its family tree</Label>
      </View>

      {forest.families.length === 0 && ready.length === 0 ? (
        <Sticker style={styles.empty} bg={c.lavender}>
          <View style={styles.emptyArt}>
            <PlantBuddy speciesId="cutting" mood="happy" size={120} bg={c.ice} faces={faces} />
          </View>
          <Text style={styles.emptyTitle}>No babies yet</Text>
          <Text style={styles.emptyBody}>Take your first cutting from any plant's page. It'll show up here with its parent, rooting day by day.</Text>
          <Button title="Pick a plant" raised bg={c.grape} onPress={() => router.push('/jungle')} style={{ alignSelf: 'stretch' }} />
        </Sticker>
      ) : (
        <>
          <View style={styles.stats}>
            {stats.map((s) => (
              <Sticker key={s.label} drop={0} bg={s.bg} style={styles.stat}>
                <Text style={styles.statNum}>{s.n}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </Sticker>
            ))}
          </View>

          {ready.length > 0 && (
            <View style={styles.section}>
              <Label>Ready to pot up</Label>
              {ready.map((p) => {
                const days = rootingDays(p.rooting!.startedAt, now);
                return (
                  <Sticker key={p.id} style={styles.readyCard}>
                    <View style={styles.readyArt}>
                      <PlantBuddy speciesId="cutting" mood="happy" size={56} bg={c.ice} faces={faces} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.readyName} numberOfLines={1}>
                        {p.name}
                      </Text>
                      <Text style={styles.readySub}>
                        {days} days {METHOD_WORD[p.rooting!.method]} · roots should be 2–5 cm
                      </Text>
                    </View>
                    <Button
                      title="Pot it up"
                      raised
                      accessibilityLabel={`Pot up ${p.name}`}
                      onPress={() => {
                        router.push(`/pot-up/${p.id}`);
                      }}
                      style={styles.readyBtn}
                    />
                  </Sticker>
                );
              })}
            </View>
          )}

          {forest.families.length >= 2 && (
            <View style={styles.section}>
              <Label>{forest.families.length} families</Label>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -PAGE_PAD }} contentContainerStyle={styles.jumpRow} accessibilityRole="radiogroup">
                {forest.families.map((f) => {
                  const on = shownId === f.root.id;
                  return (
                    <Pressable
                      key={f.root.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={`${f.root.name}'s family, ${f.members} plants`}
                      onPress={() => {
                        haptics.tap();
                        setPick(f.root.id);
                      }}
                      style={({ pressed }) => [styles.jump, on && { backgroundColor: c.lavender }, pressed && { transform: [{ translateY: 1 }] }]}
                    >
                      <PlantBuddy speciesId={f.root.speciesId} pot={f.root.potColor} mood="happy" size={26} bg={on ? c.lavender : c.potTint[f.root.potColor]} faces="off" />
                      <Text style={[styles.jumpText, on && { color: textOn(c.lavender, c) }]} numberOfLines={1}>
                        {f.root.name} · {f.members}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: shownId === 'all' }}
                  accessibilityLabel="All families"
                  onPress={() => {
                    haptics.tap();
                    setPick('all');
                  }}
                  style={({ pressed }) => [styles.jump, shownId === 'all' && { backgroundColor: c.lavender }, pressed && { transform: [{ translateY: 1 }] }]}
                >
                  <View style={[styles.allDots, { backgroundColor: shownId === 'all' ? c.card : c.cloud }]}>
                    <Svg width={16} height={16} viewBox="0 0 24 24">
                      <Path d="M12 4v5M7 14l5-5 5 5M6 15v5M18 15v5" stroke={c.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                    </Svg>
                  </View>
                  <Text style={[styles.jumpText, shownId === 'all' && { color: textOn(c.lavender, c) }]}>All · {forest.families.reduce((n, f) => n + f.members, 0)}</Text>
                </Pressable>
              </ScrollView>
            </View>
          )}

          {shown.map((f) => {
            const all = fullById.get(f.root.id) ?? f;
            const gifted = all.nodes.filter((n) => n.plant.archivedAt && n.plant.archivedReason === 'gifted').length;
            const lost = all.nodes.filter((n) => n.plant.archivedAt && n.plant.archivedReason !== 'gifted').length;
            // Wide even after folding big sibling groups (lots of grandchildren): read it as a list instead.
            const auto: View_ = (foldedWidth.get(f.root.id) ?? f.width) > available * 2 ? 'list' : 'tree';
            const mode = chosen[f.root.id] ?? auto;
            const canToggle = all.width > available;
            const openGroups = f.collapsible.filter((id) => expanded.has(id));
            return (
              <View key={f.root.id} style={styles.section}>
                <View style={styles.familyHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.familyTitle}>{f.root.name}'s family</Text>
                    <Label muted>
                      {f.members} plants · {f.generations} {f.generations === 1 ? 'generation' : 'generations'} · since {new Date(f.root.acquiredAt).getFullYear()}
                      {gifted ? ` · ${gifted} gifted` : ''}
                      {lost ? ` · ${lost} in memory` : ''}
                    </Label>
                  </View>
                  {canToggle && (
                    <View style={styles.segment} accessibilityRole="radiogroup" accessibilityLabel={`${f.root.name}'s family view`}>
                      {(['tree', 'list'] as const).map((m) => {
                        const on = mode === m;
                        return (
                          <Pressable
                            key={m}
                            accessibilityRole="radio"
                            accessibilityState={{ selected: on }}
                            accessibilityLabel={m === 'tree' ? 'Tree view' : 'List view'}
                            onPress={() => {
                              haptics.tap();
                              setChosen((s) => ({ ...s, [f.root.id]: m }));
                            }}
                            hitSlop={4}
                            style={[styles.segBtn, on && { backgroundColor: c.lavender }]}
                          >
                            <Text style={[styles.segText, { color: on ? textOn(c.lavender, c) : c.inkMuted }]}>{m === 'tree' ? 'Tree' : 'List'}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>
                {mode === 'list' ? (
                  <TreeList family={all} now={now} />
                ) : (
                  <>
                    <FamilyTree family={f} now={now} bleed={PAGE_PAD} onExpand={toggleGroup} />
                    {openGroups.length > 0 && (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          haptics.tap();
                          setExpanded((s) => new Set([...s].filter((id) => !openGroups.includes(id))));
                        }}
                        style={styles.fewer}
                        hitSlop={6}
                      >
                        <Text style={styles.fewerText}>Fold big groups back up</Text>
                      </Pressable>
                    )}
                  </>
                )}
              </View>
            );
          })}

          <Text style={styles.footnote}>
            Pot-up nudges come after ~{POT_UP_AFTER_DAYS.water} days in water or LECA and ~{POT_UP_AFTER_DAYS.moss} in moss or soil. Tap any buddy to see its page or take a cutting.
          </Text>
        </>
      )}
    </ScrollView>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    page: { paddingHorizontal: space.xl, gap: space.xl },
    stats: { flexDirection: 'row', gap: 8 },
    stat: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 16 },
    statNum: { fontFamily: fonts.display, ...type.title2, color: c.ink },
    statLabel: { fontFamily: fonts.bodyHeavy, ...type.caption, color: c.ink },
    section: { gap: 10 },
    readyCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 20 },
    readyArt: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: c.line, backgroundColor: c.ice, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    readyName: { fontFamily: fonts.displaySemi, ...type.headline, color: c.ink },
    readySub: { fontFamily: fonts.bodyHeavy, ...type.caption, color: c.inkMuted },
    readyBtn: { paddingHorizontal: 12, minHeight: 40 },
    familyTitle: { fontFamily: fonts.display, ...type.title2, color: c.ink },
    familyHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    segment: { flexDirection: 'row', borderWidth: 2, borderColor: c.line, borderRadius: 14, padding: 2, backgroundColor: c.card },
    segBtn: { minHeight: 32, paddingHorizontal: 10, borderRadius: 10, justifyContent: 'center' },
    segText: { fontFamily: fonts.bodyHeavy, ...type.caption },
    fewer: { alignSelf: 'center', minHeight: 36, justifyContent: 'center', paddingHorizontal: 12 },
    fewerText: { fontFamily: fonts.bodyHeavy, ...type.footnote, color: c.ink, textDecorationLine: 'underline' },
    jumpRow: { paddingHorizontal: PAGE_PAD, gap: 8 },
    jump: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderColor: c.line, borderRadius: 18, height: 40, paddingLeft: 4, paddingRight: 12, backgroundColor: c.card },
    allDots: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    jumpText: { fontFamily: fonts.bodyHeavy, ...type.footnote, color: c.ink, maxWidth: 160 },
    footnote: { fontFamily: fonts.body, ...type.caption, color: c.inkMuted, textAlign: 'center', paddingHorizontal: 12 },
    empty: { alignItems: 'center', gap: 10, padding: 20, marginTop: 12 },
    emptyArt: { width: 136, height: 136, borderRadius: 68, borderWidth: 2, borderColor: c.line, backgroundColor: c.ice, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    emptyTitle: { fontFamily: fonts.display, ...type.title2, color: c.ink },
    emptyBody: { fontFamily: fonts.body, ...type.body, color: c.ink, textAlign: 'center' },
  });
}
