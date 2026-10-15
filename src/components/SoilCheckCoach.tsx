import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '../store/plantStore';
import { Button, Sticker } from './ui';
import { fonts } from '../theme/tokens';
import { useColors } from '../theme/theme';
import * as haptics from '../lib/haptics';
import { isReservoir } from '../engine/careEngine';

const STEPS: { word: string; feel: string; doThis: string; key: 'butter' | 'ice' | 'lavender' }[] = [
  { word: 'Dry', feel: 'Crumbly, finger comes out clean', doThis: 'Water slowly until it drips out the bottom.', key: 'butter' },
  { word: 'Damp', feel: 'Cool, a few crumbs stick', doThis: 'Skip it. That’s a smart skip! We’ll ask again sooner.', key: 'ice' },
  { word: 'Soggy', feel: 'Wet or muddy', doThis: 'Definitely skip. Let it breathe; check the pot drains.', key: 'lavender' },
];

const WATER_STEPS: typeof STEPS = [
  { word: 'Low', feel: 'Below the bottom third, or the jar is half empty', doThis: 'Top up with water and a weak dose of nutrients.', key: 'butter' },
  { word: 'Plenty', feel: 'Roots can still reach the water', doThis: 'Skip it. In LECA, letting it drop a little lets roots breathe.', key: 'ice' },
];

/**
 * Teaches the one thing PlantFam asks of you. A one-line "How do I check soil?" link at the top of
 * the round that expands inline, so it never pushes the plants down. Shown until the first few
 * checks are done (or it's dismissed), because "check the soil" is new to people used to schedules.
 */
export function SoilCheckCoach() {
  const c = useColors();
  const router = useRouter();
  const { events, plants, profile, setProfile } = usePlantStore();
  const [open, setOpen] = useState(false);
  const checks = events.filter((e) => e.type === 'check').length;
  const living = plants.filter((p) => !p.archivedAt);
  if (profile.coachDismissed || checks >= 3 || living.length === 0) return null;
  const water = living.filter((p) => isReservoir(p.soil)).length;
  const soil = living.length - water;
  const question = soil === 0 ? 'How do I check the water?' : water === 0 ? 'How do I check soil?' : 'How do I check?';

  return (
    <View style={{ gap: 8 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={question}
        accessibilityState={{ expanded: open }}
        onPress={() => {
          haptics.tap();
          setOpen((o) => !o);
        }}
        style={({ pressed }) => [styles.link, { backgroundColor: open ? c.cloud : c.card, borderColor: c.line }, pressed && { opacity: 0.7 }]}
      >
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5v.7M12 17h.01" stroke={c.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
        <Text style={[styles.linkText, { color: c.ink }]}>{question}</Text>
        <Svg width={16} height={16} viewBox="0 0 24 24" style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <Path d="m6 9 6 6 6-6" stroke={c.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </Pressable>

      {open && (
        <Sticker bg={c.card} style={styles.card}>
          {soil > 0 && (
          <>
          <Text style={[styles.lead, { color: c.ink }]}>
            Push a finger into the soil up to your second knuckle (2–3 cm). For succulents, go all the way down or lift the pot: light means dry.
          </Text>
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
          </>
          )}
          {water > 0 && (
            <>
              <Text style={[styles.lead, { color: c.ink }]}>
                In LECA or water? No finger needed: look at the water line through the pot, jar or level window.
              </Text>
              <View style={{ gap: 6 }}>
                {WATER_STEPS.map((s) => (
                  <View key={s.word} style={[styles.row, { backgroundColor: c[s.key], borderColor: c.line }]}>
                    <Text style={[styles.word, { color: c.ink }]}>{s.word}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.feel, { color: c.ink }]}>{s.feel}</Text>
                      <Text style={[styles.do, { color: c.inkMuted }]}>{s.doThis}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button title="Got it" onPress={() => setProfile({ coachDismissed: true })} style={{ flex: 1 }} />
            <Button title="How PlantFam works" bg={c.cloud} onPress={() => router.push('/help')} style={{ flex: 1.4 }} />
          </View>
        </Sticker>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  link: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', minHeight: 44, paddingHorizontal: 14, borderWidth: 2, borderRadius: 22 },
  linkText: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  card: { padding: 14, gap: 10 },
  lead: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: 14, padding: 8 },
  word: { fontFamily: fonts.display, fontSize: 17, width: 56 },
  feel: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  do: { fontFamily: fonts.body, fontSize: 12 },
});
