import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Label } from '@/components/ui';
import { useColors } from '@/theme/theme';
import { fonts } from '@/theme/tokens';
import type { Plant } from '@/types';

/** Offshoots on the plant page: tappable chips for the parent and every baby. */
export function PlantPageOffshoots({ parent, babies }: { parent?: Plant; babies: Plant[] }) {
  const c = useColors();
  const router = useRouter();
  if (!parent && babies.length === 0) return null;

  const chip = (p: Plant, bg: string, prefix = '') => (
    <Pressable
      key={p.id}
      accessibilityRole="link"
      accessibilityLabel={`Open ${p.name}`}
      onPress={() => {
        router.push(`/plant/${p.id}`);
      }}
      style={({ pressed }) => [styles.chip, { backgroundColor: bg, borderColor: c.line }, p.archivedAt && { opacity: 0.55 }, pressed && { transform: [{ translateY: 1 }] }]}
    >
      <Text style={[styles.chipText, { color: c.ink }]} numberOfLines={1}>
        {prefix}
        {p.name}
        {p.rooting ? ' 🌱' : ''}
      </Text>
    </Pressable>
  );

  return (
    <View style={{ gap: 8 }}>
      <Label>Offshoots</Label>
      {parent && (
        <View style={styles.line}>
          <Text style={[styles.lead, { color: c.inkMuted }]}>Cutting from</Text>
          {chip(parent, c.butter, '↑ ')}
        </View>
      )}
      {babies.length > 0 && (
        <View style={{ gap: 6 }}>
          <Text style={[styles.lead, { color: c.inkMuted }]}>
            {babies.length} {babies.length === 1 ? 'baby' : 'babies'}
          </Text>
          <View style={styles.chips}>{babies.map((b) => chip(b, b.rooting ? c.ice : c.mint))}</View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  lead: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 2, borderRadius: 16, minHeight: 36, paddingHorizontal: 12, justifyContent: 'center', maxWidth: '100%' },
  chipText: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
});
