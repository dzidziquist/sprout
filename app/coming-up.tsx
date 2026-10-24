import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { checksWaterLine, isDue } from '@/engine/careEngine';
import { useDay } from '@/hooks/useDay';
import { GlassButton } from '@/components/GlassButton';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Title } from '@/components/ui';
import { fonts, type, space } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { calendarDays } from '@/lib/when';
import type { Plant } from '@/types';
import { Glyph } from '@/components/Glyph';

/** Whole calendar days from today to `iso` (local time). */
const daysUntil = (iso: string, now: Date) => calendarDays(now, new Date(iso));

/** Tomorrow, then each day of the coming week by name, then next week and later. */
function groupLabel(days: number, iso: string): string {
  if (days <= 1) return 'Tomorrow';
  if (days <= 6) return new Date(iso).toLocaleDateString('en-US', { weekday: 'long' });
  if (days <= 13) return 'Next week';
  return 'Later';
}

/** Everyone who isn't due today, grouped by when their next check falls. */
export default function ComingUpScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plants = usePlantStore((s) => s.plants);
  const faces = usePlantStore((s) => s.profile.faces);
  useDay();
  const now = new Date();
  const upcoming = plants.filter((p) => !p.archivedAt && !p.rooting && !isDue(p, now)).sort((a, b) => a.nextCheckAt.localeCompare(b.nextCheckAt));
  const groups: { label: string; data: Plant[] }[] = [];
  for (const p of upcoming) {
    const label = groupLabel(daysUntil(p.nextCheckAt, now), p.nextCheckAt);
    const last = groups[groups.length - 1];
    if (last?.label === label) last.data.push(p);
    else groups.push({ label, data: [p] });
  }

  // A section list, so a big collection only draws the rows on screen.
  return (
    <SectionList
      sections={groups}
      keyExtractor={(p) => p.id}
      stickySectionHeadersEnabled={false}
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={{ flexDirection: 'row' }}>
            <GlassButton accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
              <Glyph name="back" size={18} color={c.ink} width={2.6} />
            </GlassButton>
          </View>
          <Title>Coming up</Title>
          {groups.length === 0 && <Text style={[styles.empty, { color: c.inkMuted }]}>Nobody else is booked in yet.</Text>}
        </View>
      }
      renderSectionHeader={({ section }) => (
        <Text style={[styles.group, { color: c.ink }]} accessibilityRole="header">
          {section.label} <Text style={{ color: c.inkMuted }}>· {section.data.length}</Text>
        </Text>
      )}
      renderItem={({ item: p, section }) => {
        const days = daysUntil(p.nextCheckAt, now);
        const what = checksWaterLine(p) ? 'Water check' : 'Soil check';
        const when = days <= 1 ? '' : days <= 6 ? ` · in ${days} days` : ` · ${new Date(p.nextCheckAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}`;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${p.name}, ${what.toLowerCase()} ${section.label.toLowerCase()}${when}${p.room ? `, ${p.room}` : ''}`}
            onPress={() => router.push(`/plant/${p.id}`)}
            style={({ pressed }) => [styles.row, { backgroundColor: pressed ? c.cloud : c.card, borderColor: c.line }]}
          >
            <View style={[styles.buddy, { backgroundColor: c.potTint[p.potColor], borderColor: c.line }]}>
              <PlantBuddy speciesId={p.speciesId} pot={p.potColor} mood="happy" size={44} bg={c.potTint[p.potColor]} faces={faces} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: c.ink }]} numberOfLines={1}>{p.name}</Text>
              <Text style={[styles.sub, { color: c.inkMuted }]}>
                {what}
                {when}
                {p.room ? ` · ${p.room}` : ''}
              </Text>
            </View>
            <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="m9 6 6 6-6 6" stroke={c.inkMuted} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
          </Pressable>
        );
      }}
      ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
      SectionSeparatorComponent={() => <View style={{ height: 9 }} />}
    />
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.xl },
  header: { gap: 18, marginBottom: 9 },
  group: { fontFamily: fonts.display, ...type.title3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderRadius: 18, padding: 10 },
  buddy: { width: 56, height: 56, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  name: { fontFamily: fonts.displaySemi, ...type.headline },
  sub: { fontFamily: fonts.bodyHeavy, ...type.footnote, marginTop: 2 },
  empty: { fontFamily: fonts.bodyHeavy, ...type.body },
});
