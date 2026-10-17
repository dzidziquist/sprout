import { ART } from '@/data/art';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { speciesOf } from '@/data/species';
import { SOIL_LABEL } from '@/data/labels';
import { POT_UP_AFTER_DAYS, rootingDays } from '@/engine/treeLayout';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Title } from '@/components/ui';
import { GlassButton } from '@/components/GlassButton';
import { METHOD_WORD } from '@/components/CuttingMethods';
import { textOn, useColors, type Palette } from '@/theme/theme';
import { fonts } from '@/theme/tokens';
import * as haptics from '@/lib/haptics';
import type { Soil } from '@/types';
import { useSheetTop } from '@/lib/sheetTop';

/** Mixes that make sense for a freshly rooted cutting; the species' own default is always offered first. */
const SOILS: Soil[] = ['potting_mix', 'chunky_aroid', 'perlite_mix', 'gritty', 'coir', 'leca', 'water'];

const SIZES = [
  { label: 'Tiny', cm: 8, scale: 0.62 },
  { label: 'Small', cm: 10, scale: 0.8 },
  { label: 'Medium', cm: 15, scale: 1 },
] as const;


function PotIcon({ scale, c }: { scale: number; c: Palette }) {
  const s = 34 * scale;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Path d="M4 8h16l-2 12a2 2 0 0 1-2 1.7H8A2 2 0 0 1 6 20zM3 5h18v3H3z" fill={c.coral} stroke={c.line} strokeWidth={1.8} strokeLinejoin="round" />
    </Svg>
  );
}

export default function PotUpScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sheetTop = useSheetTop();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const plant = usePlantStore((s) => s.plants.find((p) => p.id === id));
  const faces = usePlantStore((s) => s.profile.faces);
  const markRooted = usePlantStore((s) => s.markRooted);

  const defaultSoil = plant ? speciesOf(plant).defaultSoil : 'potting_mix';
  const soils = [defaultSoil, ...SOILS.filter((s) => s !== defaultSoil)];
  const [soil, setSoil] = useState<Soil>(defaultSoil);
  const [cm, setCm] = useState<number>(10);

  const close = (
    <GlassButton accessibilityLabel="Close" onPress={() => router.back()}>
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <Path d="M6 6l12 12M18 6 6 18" stroke={c.ink} strokeWidth={2.8} strokeLinecap="round" />
      </Svg>
    </GlassButton>
  );

  if (!plant?.rooting) {
    return (
      <View style={[styles.page, styles.center, { backgroundColor: c.bg, paddingTop: sheetTop + 12 }]}>
        <View style={styles.toolbar}>{close}</View>
        <Title style={{ textAlign: 'center' }}>{plant ? `${plant.name} is already potted` : 'Cutting not found'}</Title>
        <Button title="Back" raised bg={c.card} onPress={() => router.back()} style={{ alignSelf: 'stretch', minHeight: 52 }} />
      </View>
    );
  }

  const rooting = plant.rooting;
  const days = rootingDays(rooting.startedAt, new Date());
  const early = days < POT_UP_AFTER_DAYS[rooting.method];

  const confirm = () => {
    markRooted(plant.id, { soil, potDiameterCm: cm });
    haptics.success();
    router.back();
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: 12, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.toolbar}>{close}</View>

      <View style={styles.hero}>
        <View style={styles.heroArt}>
          <Image source={ART.roots} style={{ width: 140, height: 140 }} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        </View>
        <Title style={{ textAlign: 'center' }}>{plant.name} has roots! 🌱</Title>
        <Text style={styles.heroSub}>
          {days} {days === 1 ? 'day' : 'days'} {METHOD_WORD[rooting.method]}.{' '}
          {early ? 'A little early, but if the roots are 2–5 cm, go for it.' : 'Time for a real pot.'}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Soil</Text>
        <View style={styles.chips}>
          {soils.map((s) => {
            const on = s === soil;
            return (
              <Pressable
                key={s}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  haptics.tap();
                  setSoil(s);
                }}
                style={[styles.chip, { backgroundColor: on ? c.leaf : c.card }, on && { boxShadow: `0px 3px 0px ${c.drop}` }]}
              >
                <Text style={[styles.chipText, { color: on ? textOn(c.leaf, c) : c.ink }]}>
                  {SOIL_LABEL[s]}
                  {s === defaultSoil ? ' ★' : ''}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>★ what {speciesOf(plant).commonName} usually likes</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Pot size</Text>
        <View style={styles.sizes}>
          {SIZES.map((s) => {
            const on = s.cm === cm;
            return (
              <Pressable
                key={s.cm}
                accessibilityRole="radio"
                accessibilityLabel={`${s.label} ${s.cm} centimetres`}
                accessibilityState={{ checked: on }}
                onPress={() => {
                  haptics.tap();
                  setCm(s.cm);
                }}
                style={[styles.size, { backgroundColor: on ? c.butter : c.card }, on && { boxShadow: `0px 3px 0px ${c.drop}` }]}
              >
                <View style={styles.sizeArt}>
                  <PotIcon scale={s.scale} c={c} />
                </View>
                <Text style={styles.sizeLabel}>{s.label}</Text>
                <Text style={styles.sizeCm}>{s.cm} cm</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>Go small: a snug pot dries out faster and keeps new roots happy.</Text>
      </View>

      <Button title="Pot it up" accessibilityLabel={`Confirm pot up ${plant.name}`} raised onPress={confirm} style={{ minHeight: 56 }} textStyle={{ fontSize: 19, fontFamily: fonts.display }} />
    </ScrollView>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    page: { paddingHorizontal: 20, gap: 22 },
    center: { flex: 1, gap: 20 },
    toolbar: { flexDirection: 'row', alignSelf: 'stretch' },
    hero: { alignItems: 'center', gap: 8 },
    heroArt: { width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderColor: c.line, backgroundColor: c.ice, boxShadow: `0px 4px 0px ${c.drop}`, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    heroSub: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: c.inkMuted, textAlign: 'center', paddingHorizontal: 8 },
    section: { gap: 10 },
    heading: { fontFamily: fonts.display, fontSize: 19, color: c.ink },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { borderWidth: 2, borderColor: c.line, borderRadius: 16, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
    chipText: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
    hint: { fontFamily: fonts.body, fontSize: 12, color: c.inkMuted },
    sizes: { flexDirection: 'row', gap: 10 },
    size: { flex: 1, borderWidth: 2, borderColor: c.line, borderRadius: 18, paddingVertical: 10, alignItems: 'center' },
    sizeArt: { height: 38, justifyContent: 'flex-end' },
    sizeLabel: { fontFamily: fonts.displaySemi, fontSize: 15, color: c.ink, marginTop: 4 },
    sizeCm: { fontFamily: fonts.bodyHeavy, fontSize: 12, color: c.inkMuted },
  });
}
