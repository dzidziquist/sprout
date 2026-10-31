import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GlassButton } from '@/components/GlassButton';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Sticker, Title } from '@/components/ui';
import { fonts, type, space } from '@/theme/tokens';
import { useColors, type Palette } from '@/theme/theme';
import type { SpeciesId } from '@/types';
import { Glyph } from '@/components/Glyph';

type Tint = keyof Pick<Palette, 'mint' | 'butter' | 'peach' | 'ice' | 'lavender' | 'blush' | 'cloud'>;

const SECTIONS: { title: string; body: string; buddy: SpeciesId | 'cutting'; mood?: 'happy' | 'thirsty' | 'snoozing'; tint: Tint }[] = [
  {
    title: 'Soil checks, not schedules',
    body: 'Most plants die from too much water, not too little. So PlantFam never says “water every 7 days”. It asks you to feel the soil, and you water only when it’s dry.',
    buddy: 'pothos',
    tint: 'mint',
  },
  {
    title: 'Hydro and LECA too',
    body: 'Plants in water, LECA or a countertop hydro garden get water-line checks instead: Low means top up, Plenty means skip. We also remind you to swap in fresh water and nutrients (every 2 weeks in water, a monthly flush for LECA). Turn on “Soil + hydro” in Settings to pick it up front.',
    buddy: 'spider',
    tint: 'ice',
  },
  {
    title: 'It learns each plant',
    body: 'Every answer tunes that plant’s rhythm. Damp or soggy? We wait longer next time. Bone dry? We check a bit sooner. When unsure, we err on the side of waiting.',
    buddy: 'calathea',
    tint: 'ice',
  },
  {
    title: 'One plant round a day',
    body: 'At most one gentle reminder, only on days a plant is ready for a check. Nothing due means no notification. Once a month (or weekly, in Settings) it also asks for a progress photo of anyone the diary hasn’t seen lately. Skipping a day is fine; nobody gets nagged.',
    buddy: 'fig',
    mood: 'thirsty',
    tint: 'peach',
  },
  {
    title: 'What the faces mean',
    body: 'Thirsty: ready for a check (not “dying”). Snoozing: recently damp, resting. Happy: all good. Prefer calmer faces? Settings → Plant faces.',
    buddy: 'monstera',
    mood: 'snoozing',
    tint: 'lavender',
  },
  {
    title: 'Seasons change the rhythm',
    body: 'Your city sets the seasons. In cool, dark months plants drink less, so checks space out and feeding eases off; summer heat or a dry season brings checks closer. Pick your city in Settings.',
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
    title: 'Mix and feeding',
    body: 'Tell it which mix a plant went into (well-known bags like FoxFarm Ocean Forest fill themselves in). Feed reminders wait while a fresh mix is still feeding the plant, then say when the next feed is due. Tick a feed and it’s logged.',
    buddy: 'pepper',
    tint: 'butter',
  },
  {
    title: 'Plant doctor',
    body: 'Something wrong? Tap what you see on a plant’s page. You get possible causes in the order to check them, worked out from that plant’s own story: checks, light, pot, mix, feeds and season. “Why this advice?” shows which facts were checked against a named source.',
    buddy: 'peace-lily',
    mood: 'thirsty',
    tint: 'lavender',
  },
  {
    title: 'Light, room by room',
    body: 'Add a room’s windows and where each plant sits, and it estimates the light through the seasons. The light meter checks a spot with your phone’s back camera.',
    buddy: 'aloe',
    tint: 'ice',
  },
  {
    title: 'Share the jungle',
    body: 'Care for the same plants with someone at home. A household shares plants, checks and diary photos over your own iCloud. Settings → Your data → Household.',
    buddy: 'hoya',
    tint: 'blush',
  },
  {
    title: 'Your data stays yours',
    body: 'Everything lives on your phone, with no account and no tracking. Turn on iCloud backup in Settings → Your data, or save a backup file; either restores on any phone.',
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
          <Glyph name="back" size={18} color={c.ink} width={2.6} />
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
  page: { paddingHorizontal: space.xl, gap: space.md },
  header: { flexDirection: 'row' },
  card: { flexDirection: 'row', gap: 12, padding: 12, alignItems: 'flex-start' },
  h: { fontFamily: fonts.display, ...type.headline },
  p: { fontFamily: fonts.body, ...type.callout },
});
