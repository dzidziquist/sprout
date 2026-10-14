import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { GlassButton } from '@/components/GlassButton';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Sticker, Title } from '@/components/ui';
import { fonts } from '@/theme/tokens';
import { useColors, type Palette } from '@/theme/theme';
import type { SpeciesId } from '@/types';

type Tint = keyof Pick<Palette, 'mint' | 'butter' | 'peach' | 'ice' | 'lavender' | 'blush' | 'cloud'>;

const SECTIONS: { title: string; body: string; buddy: SpeciesId | 'cutting'; mood?: 'happy' | 'thirsty' | 'snoozing'; tint: Tint }[] = [
  {
    title: 'Soil checks, not schedules',
    body: 'Most plants die from too much water, not too little. So PlantFam never says “water every 7 days”. It asks you to feel the soil, and you water only when it’s dry.',
    buddy: 'pothos',
    tint: 'mint',
  },
  {
    title: 'It learns each plant',
    body: 'Every answer tunes that plant’s rhythm. Damp or soggy? We wait longer next time. Bone dry? We check a bit sooner. When unsure, we err on the side of waiting.',
    buddy: 'calathea',
    tint: 'ice',
  },
  {
    title: 'One plant round a day',
    body: 'At most one gentle reminder, only on days a plant is ready for a check. Nothing due means no notification. Skipping a day is fine; nobody gets nagged.',
    buddy: 'fig',
    mood: 'thirsty',
    tint: 'peach',
  },
  {
    title: 'What the faces mean',
    body: 'Thirsty: ready for a soil check (not “dying”). Snoozing: recently damp, resting. Happy: all good. Prefer calmer faces? Me → Plant faces.',
    buddy: 'monstera',
    mood: 'snoozing',
    tint: 'lavender',
  },
  {
    title: 'Seasons change the rhythm',
    body: 'In Seattle’s grey season (roughly October to April) plants drink less, so checks space out, and feeding pauses mid-October to March. Summer heat brings checks closer together.',
    buddy: 'snake',
    tint: 'butter',
  },
  {
    title: 'Offshoots: every cutting’s family',
    body: 'Take a cutting from any plant’s page. It roots in water or moss, you get a nudge when it’s ready to pot, and it joins the family tree forever.',
    buddy: 'cutting',
    tint: 'blush',
  },
  {
    title: 'Grow patch for edibles',
    body: 'Tomatoes, peppers, herbs and greens get stages, month-by-month tasks, weather alerts and a harvest log. First harvest gets a party.',
    buddy: 'tomato',
    tint: 'peach',
  },
  {
    title: 'Your data stays yours',
    body: 'Everything lives on your phone, with no account and no tracking. Make a backup in Me now and then; it restores on any phone.',
    buddy: 'zz',
    tint: 'cloud',
  },
];

export default function HelpScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.header}>
        <GlassButton accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="m15 18-6-6 6-6" stroke={c.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
        </GlassButton>
      </View>
      <Title>How PlantFam works</Title>
      {SECTIONS.map((s) => (
        <Sticker key={s.title} bg={c[s.tint]} drop={0} style={styles.card}>
          <PlantBuddy speciesId={s.buddy} mood={s.mood ?? 'happy'} size={64} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[styles.h, { color: c.ink }]}>{s.title}</Text>
            <Text style={[styles.p, { color: c.ink }]}>{s.body}</Text>
          </View>
        </Sticker>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 12 },
  header: { flexDirection: 'row' },
  card: { flexDirection: 'row', gap: 12, padding: 12, alignItems: 'flex-start' },
  h: { fontFamily: fonts.display, fontSize: 18 },
  p: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20 },
});
