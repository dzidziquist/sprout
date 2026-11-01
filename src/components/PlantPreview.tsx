import { StyleSheet, Text, View } from 'react-native';
import { PlantBuddy } from '@/components/PlantBuddy';
import { speciesOf } from '@/data/species';
import { activeTrip } from '@/engine/away';
import { moodFor } from '@/engine/careEngine';
import { usePlantStore } from '@/store/plantStore';
import { useColors } from '@/theme/theme';
import { fonts, type } from '@/theme/tokens';
import type { Plant } from '@/types';
import { previewChips } from '@/engine/preview';

/** Size iOS is asked to show the press-and-hold preview at. */
export const PREVIEW_SIZE = { width: 320, height: 380 };

/**
 * The card iOS shows while you press and hold a plant: the plant, its name and the two things you'd
 * check before acting. The full page made a cramped, cut-off preview with buttons that did nothing.
 */
export function PlantPreview({ plant }: { plant: Plant }) {
  const c = useColors();
  const profile = usePlantStore((s) => s.profile);
  const lastWaterAt = usePlantStore((s) => {
    let at: string | undefined;
    for (const e of s.events) if (e.plantId === plant.id && e.type === 'water' && (!at || e.at > at)) at = e.at;
    return at;
  });
  const now = new Date();
  const species = speciesOf(plant);
  const chips = previewChips(plant, lastWaterAt, now);
  const where = [species.commonName, plant.room].filter(Boolean).join(' · ');
  return (
    <View style={[styles.card, { backgroundColor: c.card }]}>
      <View style={[styles.hero, { backgroundColor: c.potTint[plant.potColor] }]}>
        <PlantBuddy
          speciesId={plant.rooting ? 'cutting' : plant.speciesId}
          pot={plant.potColor}
          mood={plant.archivedAt ? 'happy' : moodFor(plant, now, !!activeTrip(profile.trips, now))}
          size={170}
          bg={c.potTint[plant.potColor]}
          faces={profile.faces}
        />
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, { color: c.ink }]} numberOfLines={1}>
          {plant.name}
        </Text>
        {!!where && (
          <Text style={[styles.sub, { color: c.inkMuted }]} numberOfLines={1}>
            {where}
          </Text>
        )}
        <View style={styles.row}>
          {chips.map((chip) => (
            <View key={chip.label} style={[styles.chip, { backgroundColor: c[chip.tone], borderColor: c.line }]}>
              <Text style={[styles.chipNum, { color: c.ink }]}>{chip.num}</Text>
              <Text style={[styles.chipLabel, { color: c.ink }]}>{chip.label}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: PREVIEW_SIZE.width, height: PREVIEW_SIZE.height, overflow: 'hidden' },
  hero: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 16, gap: 4 },
  name: { fontFamily: fonts.display, ...type.title2 },
  sub: { fontFamily: fonts.bodyHeavy, ...type.callout },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 },
  chip: { flex: 1, borderWidth: 2, borderRadius: 14, paddingVertical: 8, paddingHorizontal: 10 },
  chipNum: { fontFamily: fonts.display, ...type.headline },
  chipLabel: { fontFamily: fonts.bodyHeavy, ...type.caption },
});
