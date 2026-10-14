import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlantStore } from '../store/plantStore';
import { Button, Sticker } from './ui';
import { fonts } from '../theme/tokens';
import { useColors } from '../theme/theme';

const STEPS: { word: string; feel: string; doThis: string; key: 'butter' | 'ice' | 'lavender' }[] = [
  { word: 'Dry', feel: 'Crumbly, finger comes out clean', doThis: 'Water slowly until it drips out the bottom.', key: 'butter' },
  { word: 'Damp', feel: 'Cool, a few crumbs stick', doThis: 'Skip it. That’s a smart skip! We’ll ask again sooner.', key: 'ice' },
  { word: 'Soggy', feel: 'Wet or muddy', doThis: 'Definitely skip. Let it breathe; check the pot drains.', key: 'lavender' },
];

/**
 * Teaches the one thing PlantFam asks of you. Shown on Today until the first few checks are done
 * (or it's dismissed), because "check the soil" is new to most people used to watering schedules.
 */
export function SoilCheckCoach() {
  const c = useColors();
  const router = useRouter();
  const { events, plants, profile, setProfile } = usePlantStore();
  const checks = events.filter((e) => e.type === 'check').length;
  if (profile.coachDismissed || checks >= 3 || plants.filter((p) => !p.archivedAt).length === 0) return null;

  return (
    <Sticker bg={c.card} style={styles.card}>
      <Text style={[styles.title, { color: c.ink }]}>How to do a soil check 👆</Text>
      <Text style={[styles.lead, { color: c.ink }]}>Push a finger into the soil up to your second knuckle (2–3 cm). For succulents, go all the way down or lift the pot: light means dry.</Text>
      <View style={{ gap: 6 }}>
        {STEPS.map((s) => (
          <View key={s.word} style={[styles.row, { backgroundColor: c[s.key], borderColor: c.line }]}>
            <Text style={[styles.word, { color: c.ink }]}>{s.word}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.feel, { color: c.ink }]}>{s.feel}</Text>
              <Text style={[styles.do, { color: c.inkMuted }]}>{s.doThis}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Got it" onPress={() => setProfile({ coachDismissed: true })} style={{ flex: 1 }} />
        <Button title="How PlantFam works" bg={c.cloud} onPress={() => router.push('/help')} style={{ flex: 1.4 }} />
      </View>
    </Sticker>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 20 },
  lead: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: 14, padding: 8 },
  word: { fontFamily: fonts.display, fontSize: 17, width: 56 },
  feel: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  do: { fontFamily: fonts.body, fontSize: 12 },
});
