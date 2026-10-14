import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore } from '@/store/plantStore';
import { isReadyToPotUp, layoutForest, POT_UP_AFTER_DAYS, rootingDays } from '@/engine/treeLayout';
import { FamilyTree, TREE_LAYOUT } from '@/components/FamilyTree';
import { TreeList } from '@/components/TreeList';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Label, Sticker, Title } from '@/components/ui';
import { textOn, useColors, type Palette } from '@/theme/theme';
import { fonts } from '@/theme/tokens';
import * as haptics from '@/lib/haptics';

const METHOD_WORD = { water: 'in water', moss: 'in moss', soil: 'in soil', leca: 'in LECA' } as const;
const PAGE_PAD = 20;
/** Sibling groups bigger than this fold into "+N more"; two siblings plus the fold fit a phone screen. */
const COLLAPSE = { maxChildren: 4, keep: 2 };

type View_ = 'tree' | 'list';

export default function OffshootsScreen() {
  const insets = useSafeAreaInsets();
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
  const page = useRef<ScrollView>(null);
  const familyY = useRef<Record<string, number>>({});

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
  const babies = plants.filter((p) => p.parentId);
  const stats = [
    { n: babies.length, label: 'cuttings taken', bg: c.lavender },
    { n: babies.filter((p) => !p.rooting).length, label: 'rooted', bg: c.mint },
    { n: plants.filter((p) => p.archivedReason === 'gifted').length, label: 'gifted', bg: c.blush },
  ];
  const ready = plants
    .filter((p) => isReadyToPotUp(p, now))
    .sort((a, b) => a.rooting!.startedAt.localeCompare(b.rooting!.startedAt));

  return (
    <ScrollView ref={page} style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 16, paddingBottom: 130 }]}>
      <View>
        <Title>Offshoots</Title>
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
                        haptics.tap();
                        router.push(`/pot-up/${p.id}`);
                      }}
                      style={styles.readyBtn}
                    />
                  </Sticker>
                );
              })}
            </View>
          )}

          {forest.families.length >= 4 && (
            <View style={styles.section}>
              <Label>{forest.families.length} families</Label>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -PAGE_PAD }} contentContainerStyle={styles.jumpRow}>
                {forest.families.map((f) => (
                  <Pressable
                    key={f.root.id}
                    accessibilityRole="button"
                    accessibilityLabel={`Jump to ${f.root.name}'s family`}
                    onPress={() => {
                      haptics.tap();
                      page.current?.scrollTo({ y: Math.max(0, (familyY.current[f.root.id] ?? 0) - insets.top - 8), animated: true });
                    }}
                    style={({ pressed }) => [styles.jump, pressed && { transform: [{ translateY: 1 }] }]}
                  >
                    <PlantBuddy speciesId={f.root.speciesId} pot={f.root.potColor} mood="happy" size={26} bg={c.potTint[f.root.potColor]} faces="off" />
                    <Text style={styles.jumpText} numberOfLines={1}>
                      {f.root.name} · {f.members}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {forest.families.map((f) => {
            const all = fullById.get(f.root.id) ?? f;
            const archived = all.nodes.filter((n) => n.plant.archivedAt).length;
            // Wide even after folding big sibling groups (lots of grandchildren): read it as a list instead.
            const auto: View_ = (foldedWidth.get(f.root.id) ?? f.width) > available * 2 ? 'list' : 'tree';
            const mode = chosen[f.root.id] ?? auto;
            const canToggle = all.width > available;
            const openGroups = f.collapsible.filter((id) => expanded.has(id));
            return (
              <View key={f.root.id} style={styles.section} onLayout={(e) => (familyY.current[f.root.id] = e.nativeEvent.layout.y)}>
                <View style={styles.familyHead}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.familyTitle}>{f.root.name}'s family</Text>
                    <Label muted>
                      {f.members} plants · {f.generations} {f.generations === 1 ? 'generation' : 'generations'} · since {new Date(f.root.acquiredAt).getFullYear()}
                      {archived ? ` · ${archived} remembered` : ''}
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
    page: { paddingHorizontal: 20, gap: 20 },
    stats: { flexDirection: 'row', gap: 8 },
    stat: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 16 },
    statNum: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28, color: c.ink },
    statLabel: { fontFamily: fonts.bodyHeavy, fontSize: 12, color: c.ink },
    section: { gap: 10 },
    readyCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 20 },
    readyArt: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: c.line, backgroundColor: c.ice, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    readyName: { fontFamily: fonts.displaySemi, fontSize: 17, color: c.ink },
    readySub: { fontFamily: fonts.bodyHeavy, fontSize: 12, color: c.inkMuted },
    readyBtn: { paddingHorizontal: 12, minHeight: 40 },
    familyTitle: { fontFamily: fonts.display, fontSize: 22, lineHeight: 26, color: c.ink },
    familyHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    segment: { flexDirection: 'row', borderWidth: 2, borderColor: c.line, borderRadius: 14, padding: 2, backgroundColor: c.card },
    segBtn: { minHeight: 32, paddingHorizontal: 10, borderRadius: 10, justifyContent: 'center' },
    segText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
    fewer: { alignSelf: 'center', minHeight: 36, justifyContent: 'center', paddingHorizontal: 12 },
    fewerText: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: c.ink, textDecorationLine: 'underline' },
    jumpRow: { paddingHorizontal: PAGE_PAD, gap: 8 },
    jump: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderColor: c.line, borderRadius: 18, height: 40, paddingLeft: 4, paddingRight: 12, backgroundColor: c.card },
    jumpText: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: c.ink, maxWidth: 160 },
    footnote: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: c.inkMuted, textAlign: 'center', paddingHorizontal: 12 },
    empty: { alignItems: 'center', gap: 10, padding: 20, marginTop: 12 },
    emptyArt: { width: 136, height: 136, borderRadius: 68, borderWidth: 2, borderColor: c.line, backgroundColor: c.ice, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    emptyTitle: { fontFamily: fonts.display, fontSize: 22, color: c.ink },
    emptyBody: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: c.ink, textAlign: 'center' },
  });
}
