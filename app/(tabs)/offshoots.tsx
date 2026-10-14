import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore } from '@/store/plantStore';
import { isReadyToPotUp, layoutForest, POT_UP_AFTER_DAYS, rootingDays } from '@/engine/treeLayout';
import { FamilyTree, TREE_LAYOUT } from '@/components/FamilyTree';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Label, Sticker, Title } from '@/components/ui';
import { useColors, type Palette } from '@/theme/theme';
import { fonts } from '@/theme/tokens';
import * as haptics from '@/lib/haptics';

const METHOD_WORD = { water: 'in water', moss: 'in moss', soil: 'in soil', leca: 'in LECA' } as const;

export default function OffshootsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const plants = usePlantStore((s) => s.plants);
  const faces = usePlantStore((s) => s.profile.faces);
  const now = new Date();

  // Oldest first, so the first cutting sits on the left of its siblings.
  const forest = useMemo(
    () => layoutForest([...plants].sort((a, b) => a.acquiredAt.localeCompare(b.acquiredAt)), TREE_LAYOUT),
    [plants],
  );
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
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 16, paddingBottom: 130 }]}>
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

          {forest.families.map((f) => {
            const archived = f.nodes.filter((n) => n.plant.archivedAt).length;
            return (
              <View key={f.root.id} style={styles.section}>
                <View>
                  <Text style={styles.familyTitle}>{f.root.name}'s family</Text>
                  <Label muted>
                    {f.nodes.length} plants · {f.generations} {f.generations === 1 ? 'generation' : 'generations'} · since {new Date(f.root.acquiredAt).getFullYear()}
                    {archived ? ` · ${archived} remembered` : ''}
                  </Label>
                </View>
                <FamilyTree family={f} now={now} bleed={20} />
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
    footnote: { fontFamily: fonts.body, fontSize: 12, lineHeight: 17, color: c.inkMuted, textAlign: 'center', paddingHorizontal: 12 },
    empty: { alignItems: 'center', gap: 10, padding: 20, marginTop: 12 },
    emptyArt: { width: 136, height: 136, borderRadius: 68, borderWidth: 2, borderColor: c.line, backgroundColor: c.ice, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    emptyTitle: { fontFamily: fonts.display, fontSize: 22, color: c.ink },
    emptyBody: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: c.ink, textAlign: 'center' },
  });
}
