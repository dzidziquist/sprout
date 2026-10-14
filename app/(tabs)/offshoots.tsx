import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore } from '@/store/plantStore';
import { moodFor } from '@/engine/careEngine';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Label, Sticker, Title } from '@/components/ui';
import { colors, fonts, potTint } from '@/theme/tokens';
import type { Plant } from '@/types';

function rootingLabel(p: Plant, now: Date) {
  if (!p.rooting) return null;
  const day = Math.floor((now.getTime() - new Date(p.rooting.startedAt).getTime()) / 86400000);
  return `Rooting in ${p.rooting.method} · day ${day}`;
}

/** Phase 1: an indented family list. Phase 3 replaces this with the drawn tree from the mockup. */
export default function OffshootsScreen() {
  const insets = useSafeAreaInsets();
  const { plants, profile } = usePlantStore();
  const now = new Date();
  const childrenOf = (id: string) => plants.filter((p) => p.parentId === id);
  const roots = plants.filter((p) => !p.parentId && childrenOf(p.id).length > 0);

  const node = (p: Plant, depth: number): React.ReactNode => (
    <View key={p.id} style={{ marginLeft: depth * 22, gap: 8 }}>
      <Sticker drop={depth === 0 ? 4 : 3} style={styles.node} bg={p.rooting ? colors.ice : colors.white}>
        <View style={[styles.thumb, { backgroundColor: potTint[p.potColor] }]}>
          <PlantBuddy speciesId={p.rooting ? 'cutting' : p.speciesId} mood={moodFor(p, now)} pot={p.potColor} size={48} bg={potTint[p.potColor]} faces={profile.faces} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{p.name}</Text>
          <Text style={styles.sub}>{rootingLabel(p, now) ?? (depth === 0 ? 'The OG' : `Generation ${depth + 1}`)}</Text>
        </View>
      </Sticker>
      {childrenOf(p.id).map((c) => node(c, depth + 1))}
    </View>
  );

  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + 16, paddingBottom: 130 }]}>
      <View>
        <Label muted>Offshoots</Label>
        <Title>Family trees</Title>
      </View>
      {roots.length === 0 ? <Label muted>Take a cutting from any plant to start a family tree.</Label> : roots.map((r) => node(r, 0))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 16, backgroundColor: colors.white },
  node: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 8 },
  thumb: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.displaySemi, fontSize: 16, color: colors.ink },
  sub: { fontFamily: fonts.bodyHeavy, fontSize: 12, color: colors.inkMuted },
});
