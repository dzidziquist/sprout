import { Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { GlassButton } from '@/components/GlassButton';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Sticker, Title } from '@/components/ui';
import { PRIVACY_SECTIONS, PRIVACY_SUMMARY } from '@/data/privacy';
import { PRIVACY_UPDATED, SUPPORT_EMAIL, SUPPORT_URL } from '@/config';
import { fonts } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

const CREDITS: { name: string; what: string; url: string }[] = [
  { name: 'Pl@ntNet', what: 'Photo ID', url: 'https://plantnet.org' },
  { name: 'Open-Meteo', what: 'Weather forecasts, and past weather and sunlight (CC BY 4.0)', url: 'https://open-meteo.com' },
  { name: 'WSU, OSU, RHS & university extension services', what: 'Care, soil and Seattle growing guidance', url: 'https://extension.wsu.edu' },
  { name: 'ASPCA', what: 'Pet-safety lists we checked our flags against', url: 'https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants' },
];

export default function PrivacyScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}>
      <View style={{ flexDirection: 'row' }}>
        <GlassButton accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="m15 18-6-6 6-6" stroke={c.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
        </GlassButton>
      </View>
      <Title>Privacy</Title>

      <Sticker bg={c.mint} style={styles.hero}>
        <PlantBuddy speciesId="zz" size={72} />
        <Text style={[styles.heroText, { color: c.ink }]}>{PRIVACY_SUMMARY}</Text>
      </Sticker>

      {PRIVACY_SECTIONS.map((s) => (
        <View key={s.title} style={{ gap: 6 }}>
          <Text style={[styles.h, { color: c.ink }]} accessibilityRole="header">{s.title}</Text>
          {s.body.map((p) => (
            <View key={p} style={styles.bullet}>
              <Text style={[styles.dot, { color: c.link }]}>•</Text>
              <Text style={[styles.p, { color: c.ink }]}>{p}</Text>
            </View>
          ))}
        </View>
      ))}

      <View style={{ gap: 6 }}>
        <Text style={[styles.h, { color: c.ink }]} accessibilityRole="header">Questions</Text>
        <Text style={[styles.p, { color: c.ink }]}>
          {SUPPORT_EMAIL ? (
            <>
              Write to{' '}
              <Text style={{ color: c.link, textDecorationLine: 'underline' }} accessibilityRole="link" onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=PlantFam%20privacy`)}>
                {SUPPORT_EMAIL}
              </Text>
              . A real person answers.
            </>
          ) : (
            <>
              PlantFam is made by an independent developer. Get in touch at{' '}
              <Text style={{ color: c.link, textDecorationLine: 'underline' }} accessibilityRole="link" onPress={() => Linking.openURL(SUPPORT_URL)}>
                {SUPPORT_URL.replace(/^https?:\/\//, '')}
              </Text>
              .
            </>
          )}
        </Text>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={[styles.h, { color: c.ink }]} accessibilityRole="header">Credits</Text>
        {CREDITS.map((cr) => (
          <Text key={cr.name} style={[styles.p, { color: c.ink }]}>
            <Text style={{ color: c.link, textDecorationLine: 'underline', fontFamily: fonts.bodyHeavy }} accessibilityRole="link" onPress={() => Linking.openURL(cr.url)}>
              {cr.name}
            </Text>
            {` · ${cr.what}`}
          </Text>
        ))}
      </View>

      <Text style={[styles.updated, { color: c.inkMuted }]}>Last updated {PRIVACY_UPDATED}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 18 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  heroText: { flex: 1, fontFamily: fonts.displaySemi, fontSize: 17, lineHeight: 23 },
  h: { fontFamily: fonts.display, fontSize: 19 },
  bullet: { flexDirection: 'row', gap: 8 },
  dot: { fontFamily: fonts.display, fontSize: 16, lineHeight: 21 },
  p: { flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  updated: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
});
