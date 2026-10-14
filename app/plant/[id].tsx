import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { checkIntervalDays, isFeedingPaused, moodFor } from '@/engine/careEngine';
import { SPECIES } from '@/data/species';
import { SOIL_LABEL, LIGHT_LABEL } from '@/data/labels';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Label, Sticker, Title } from '@/components/ui';
import { GlassButton } from '@/components/GlassButton';
import { colors, fonts, potTint } from '@/theme/tokens';

function daysAgo(iso: string | undefined, now: Date) {
  if (!iso) return '—';
  const d = Math.round((now.getTime() - new Date(iso).getTime()) / 86400000);
  return d === 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`;
}

export default function PlantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { plants, events, profile } = usePlantStore();
  const plant = plants.find((p) => p.id === id);
  if (!plant) return null;

  const now = new Date();
  const species = SPECIES[plant.speciesId];
  const tint = potTint[plant.potColor];
  const rhythm = Math.round(checkIntervalDays({ group: species.group, plant, profile: profile.climate, at: now }));
  const lastWater = [...events].reverse().find((e) => e.plantId === plant.id && e.type === 'water');
  const parent = plants.find((p) => p.id === plant.parentId);
  const babies = plants.filter((p) => p.parentId === plant.id);
  const feedPaused = isFeedingPaused(profile.climate, plant.placement, now);
  const nextCheck = new Date(plant.nextCheckAt).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  const history = events.filter((e) => e.plantId === plant.id).slice(-6).reverse();

  return (
    <ScrollView style={{ backgroundColor: colors.white }} contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
      <View style={[styles.hero, { backgroundColor: tint, paddingTop: insets.top + 8 }]}>
        <View style={styles.heroBar}>
          <GlassButton accessibilityLabel="Back" onPress={() => router.back()}>
            <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="m15 18-6-6 6-6" stroke={colors.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
          </GlassButton>
        </View>
        <PlantBuddy speciesId={plant.rooting ? 'cutting' : plant.speciesId} pot={plant.potColor} mood={moodFor(plant, now)} size={220} bg={tint} faces={profile.faces} />
      </View>

      <View style={styles.body}>
        <View>
          <Title>{plant.name}</Title>
          <Label muted>
            {species.commonName}
            {plant.room ? ` · ${plant.room}` : ''}
          </Label>
        </View>

        <View style={styles.stats}>
          <Sticker drop={0} bg={colors.ice} style={styles.stat}>
            <Text style={styles.statNum}>~{rhythm} days</Text>
            <Text style={styles.statLabel}>check rhythm</Text>
          </Sticker>
          <Sticker drop={0} bg={colors.butter} style={styles.stat}>
            <Text style={styles.statNum}>{daysAgo(lastWater?.at, now)}</Text>
            <Text style={styles.statLabel}>last watered</Text>
          </Sticker>
          <Sticker drop={0} bg={colors.mint} style={styles.stat}>
            <Text style={styles.statNum}>{nextCheck}</Text>
            <Text style={styles.statLabel}>next check</Text>
          </Sticker>
        </View>

        <Sticker drop={0} style={{ overflow: 'hidden' }}>
          {[
            ['Water', 'When the top 2–3 cm feels dry'],
            ['Light', LIGHT_LABEL[plant.light]],
            ['Soil', SOIL_LABEL[plant.soil]],
            ['Feed', feedPaused ? 'Paused till March (grey season)' : 'Monthly while growing'],
            ['Pets', species.petToxic ? 'Toxic to cats and dogs' : 'Pet-friendly'],
          ].map(([k, v], i, all) => (
            <View key={k} style={[styles.row, i < all.length - 1 && styles.rowDivider]}>
              <Text style={styles.rowKey}>{k}</Text>
              <Text style={[styles.rowVal, k === 'Pets' && species.petToxic && { color: colors.warn }]}>{v}</Text>
            </View>
          ))}
        </Sticker>

        {(parent || babies.length > 0) && (
          <View style={{ gap: 8 }}>
            <Label>Offshoots</Label>
            {parent && <Label muted>Cutting from {parent.name}</Label>}
            {babies.length > 0 && <Label muted>{babies.length} {babies.length === 1 ? 'baby' : 'babies'}: {babies.map((b) => b.name).join(', ')}</Label>}
          </View>
        )}

        {history.length > 0 && (
          <View style={{ gap: 6 }}>
            <Label>Diary</Label>
            {history.map((e) => (
              <View key={e.id} style={styles.diaryRow}>
                <Text style={styles.diaryText}>
                  {e.type === 'check' ? `Soil check: ${e.result}` : e.type === 'note' ? `Note: ${e.note}` : e.type[0].toUpperCase() + e.type.slice(1)}
                </Text>
                <Text style={styles.diaryDate}>{daysAgo(e.at, now)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={{ paddingHorizontal: 20 }}>
        <Button title="Log care" raised onPress={() => router.push(`/log/${plant.id}`)} style={{ minHeight: 56 }} textStyle={{ fontSize: 19, fontFamily: fonts.display }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', borderBottomWidth: 2, borderColor: colors.ink },
  heroBar: { alignSelf: 'stretch', paddingHorizontal: 16, flexDirection: 'row' },
  body: { padding: 20, gap: 16 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, padding: 10, borderRadius: 16 },
  statNum: { fontFamily: fonts.display, fontSize: 16, color: colors.ink },
  statLabel: { fontFamily: fonts.bodyHeavy, fontSize: 12, color: colors.ink },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  rowDivider: { borderBottomWidth: 2, borderColor: '#EDEDF3' },
  rowKey: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.inkMuted },
  rowVal: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.ink, flexShrink: 1, textAlign: 'right' },
  diaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  diaryText: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.ink },
  diaryDate: { fontFamily: fonts.body, fontSize: 13, color: colors.inkMuted },
});
