import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlantStore } from '../store/plantStore';
import { useShallow } from 'zustand/react/shallow';
import { Button } from './ui';
import { fonts, type } from '../theme/tokens';
import { useColors } from '../theme/theme';
import { checksWaterLine } from '../engine/careEngine';

type Step = { word: string; feel: string; doThis: string };

const STEPS: Step[] = [
  { word: 'Dry', feel: 'Crumbly, finger comes out clean', doThis: 'Water slowly until it drips out the bottom.' },
  { word: 'Damp', feel: 'Cool, a few crumbs stick', doThis: 'Skip it. That’s a smart skip! We’ll ask again sooner.' },
  { word: 'Soggy', feel: 'Wet or muddy', doThis: 'Definitely skip. Let it breathe; check the pot drains.' },
];

const WATER_STEPS: Step[] = [
  { word: 'Low', feel: 'Below the bottom third, or the jar is half empty', doThis: 'Top up with water and a weak dose of nutrients.' },
  { word: 'Plenty', feel: 'Roots can still reach the water', doThis: 'Skip it. In LECA, letting it drop a little lets roots breathe.' },
];

/**
 * Teaching the one thing PlantFam asks of you: "check the soil" is new to people used to schedules.
 * Offered until the first few checks are done (or it's dismissed). Returns the question to ask
 * ("How do I check soil?") and which kinds of check the jungle has, or null once it's done its job.
 */
export function useCoach(): { question: string; soil: number; water: number } | null {
  const { events, plants, dismissed } = usePlantStore(useShallow((s) => ({ events: s.events, plants: s.plants, dismissed: s.profile.coachDismissed })));
  const checks = events.filter((e) => e.type === 'check').length;
  const living = plants.filter((p) => !p.archivedAt);
  if (dismissed || checks >= 3 || living.length === 0) return null;
  const water = living.filter((p) => checksWaterLine(p)).length;
  const soil = living.length - water;
  return { question: soil === 0 ? 'How do I check the water?' : water === 0 ? 'How do I check soil?' : 'How do I check?', soil, water };
}

/** The guide itself, opened inside the round's hero card: soil steps, water-line steps, or both. */
export function CoachGuide({ soil, water }: { soil: number; water: number }) {
  const c = useColors();
  const router = useRouter();
  const setProfile = usePlantStore((s) => s.setProfile);
  return (
    <View style={styles.guide}>
      {soil > 0 && (
        <Steps
          lead="Push a finger into the soil up to your second knuckle (2–3 cm). For succulents, go all the way down or lift the pot: light means dry."
          steps={STEPS}
        />
      )}
      {water > 0 && <Steps lead="In LECA or water? No finger needed: look at the water line through the pot, jar or level window." steps={WATER_STEPS} />}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Got it" bg={c.card} onPress={() => setProfile({ coachDismissed: true })} style={{ flex: 1 }} />
        <Button title="How PlantFam works" bg={c.card} onPress={() => router.push('/help')} style={{ flex: 1.4 }} />
      </View>
    </View>
  );
}

function Steps({ lead, steps }: { lead: string; steps: Step[] }) {
  const c = useColors();
  return (
    <>
      <Text style={[styles.lead, { color: c.ink }]}>{lead}</Text>
      <View style={{ gap: 6 }}>
        {steps.map((s) => (
          <View key={s.word} style={[styles.row, { backgroundColor: c.card, borderColor: c.line }]}>
            <Text style={[styles.word, { color: c.ink }]}>{s.word}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[styles.feel, { color: c.ink }]}>{s.feel}</Text>
              <Text style={[styles.do, { color: c.inkMuted }]}>{s.doThis}</Text>
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  guide: { gap: 10 },
  lead: { fontFamily: fonts.body, ...type.callout },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: 14, padding: 8 },
  word: { fontFamily: fonts.display, ...type.headline, width: 56 },
  feel: { fontFamily: fonts.bodyHeavy, ...type.footnote },
  do: { fontFamily: fonts.body, ...type.caption },
});
