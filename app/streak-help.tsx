import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { GlassButton } from '@/components/GlassButton';
import { ART } from '@/data/art';
import { FREEZES_PER_MONTH, GRACE_DAYS } from '@/engine/streak';
import { BACK_GRACE_DAYS } from '@/engine/away';
import { Title } from '@/components/ui';
import { useSheetTop } from '@/lib/sheetTop';
import { fonts, type, space } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { Glyph } from '@/components/Glyph';

/** Plain-words explainer for the streak card on Me. */
export default function StreakHelp() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const sheetTop = useSheetTop();
  const router = useRouter();
  const Pill = ({ bg, dashed, label }: { bg?: string; dashed?: boolean; label?: string }) => (
    <View style={[styles.pill, { backgroundColor: bg ?? 'transparent', borderColor: dashed ? c.inkMuted : c.line }, dashed && styles.dashed]}>
      {label && <Text style={[styles.pillText, { color: c.ink }]}>{label}</Text>}
    </View>
  );
  const Row = ({ pill, children }: { pill: React.ReactNode; children: React.ReactNode }) => (
    <View style={styles.row}>
      <View style={styles.pillCol}>{pill}</View>
      <Text style={[styles.p, { color: c.ink }]}>{children}</Text>
    </View>
  );

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: sheetTop + 8, paddingBottom: insets.bottom + 32 }]}>
      <View style={{ flexDirection: 'row' }}>
        <GlassButton accessibilityLabel="Close" onPress={() => (router.canGoBack() ? router.back() : router.replace('/me'))}>
          <Glyph name="close" size={16} color={c.ink} width={2.8} />
        </GlassButton>
      </View>
      <Title>How your streak works</Title>
      <Text style={[styles.lead, { color: c.ink }]}>
        Your streak counts weeks in a row where nobody in the fam was left waiting. It never counts waterings, so it never nudges you to overwater.
      </Text>

      <View style={{ gap: 10 }}>
        <Text style={[styles.h, { color: c.ink }]} accessibilityRole="header">Each box is one week</Text>
        <Row pill={<Pill bg={c.leaf} />}>Everyone got checked in time. The week counts.</Row>
        <Row pill={<Pill bg={c.sky} />}>A plant slipped, but a week saver covered it. The week still counts.</Row>
        <Row pill={<Pill bg={c.leafLight} label="now" />}>This week, still in progress. A slip only matters once the week ends.</Row>
        <Row pill={<Pill dashed />}>Weeks still to come. They fill in as you go.</Row>
        <Text style={[styles.note, { color: c.inkMuted }]}>Weeks run Monday to Sunday. The date under each box is its Monday.</Text>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={[styles.h, { color: c.ink }]} accessibilityRole="header">What counts as on time</Text>
        <Text style={[styles.p, { color: c.ink }]}>
          A plant is only late once it's more than {GRACE_DAYS} days past its check date. A week also needs at least one soil check in it to count.
        </Text>
      </View>

      <View style={[styles.saverBox, { backgroundColor: c.ice, borderColor: c.line }]}>
        <Image source={ART.weekSaver} style={{ width: 52, height: 52 }} resizeMode="contain" />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.h, { color: c.ink }]} accessibilityRole="header">Week savers</Text>
          <Text style={[styles.p, { color: c.ink }]}>
            You get {FREEZES_PER_MONTH} free every month. If a week slips, one is used for you automatically and your streak lives on. They refill on the 1st.
          </Text>
        </View>
      </View>

      <View style={{ gap: 6 }}>
        <Text style={[styles.h, { color: c.ink }]} accessibilityRole="header">Going away?</Text>
        <Text style={[styles.p, { color: c.ink }]}>Turn on away mode before you leave. Days away, and the {BACK_GRACE_DAYS} days after you're back, never count against you.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.xl, gap: space.xl },
  lead: { fontFamily: fonts.bodyHeavy, ...type.body },
  h: { fontFamily: fonts.display, ...type.headline },
  p: { flex: 1, fontFamily: fonts.body, ...type.body },
  note: { fontFamily: fonts.bodyHeavy, ...type.footnote },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  pillCol: { width: 48, alignItems: 'center' },
  pill: { width: 44, height: 22, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dashed: { borderStyle: 'dashed', opacity: 0.6 },
  pillText: { fontFamily: fonts.bodyHeavy, ...type.caption2 },
  saverBox: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderRadius: 18, padding: 12 },
});
