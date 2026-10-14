import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { formatAmount, formatTotals, harvestStats, isFirstHarvest } from '@/engine/growPatch';
import { HARVEST_UNITS, edibleGuide, type HarvestUnit } from '@/data/edibles';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Title } from '@/components/ui';
import { GlassButton } from '@/components/GlassButton';
import { GROW_ICON, Icon } from '@/components/GrowTodayCard';
import * as haptics from '@/lib/haptics';
import { fonts } from '@/theme/tokens';
import { textOn, useColors, type Palette } from '@/theme/theme';

const UNIT_LABEL: Record<HarvestUnit, string> = { fruit: 'Fruit', handful: 'Handful', bunch: 'Bunch', grams: 'Grams' };
const STEP: Record<HarvestUnit, number> = { fruit: 1, handful: 1, bunch: 1, grams: 10 };
const START: Record<HarvestUnit, number> = { fruit: 1, handful: 1, bunch: 1, grams: 50 };

/** Little sticker confetti for the first-harvest party. */
function Confetti({ c }: { c: Palette }) {
  const bits: [number, number, string, 'dot' | 'bar' | 'star'][] = [
    [30, 40, c.coral, 'star'], [300, 60, c.sky, 'dot'], [70, 150, c.sun, 'bar'], [330, 170, c.grape, 'star'],
    [20, 300, c.bubblegum, 'dot'], [345, 320, c.coral, 'bar'], [60, 520, c.sky, 'star'], [310, 520, c.sun, 'dot'],
    [180, 30, c.grape, 'bar'], [150, 610, c.bubblegum, 'star'],
  ];
  return (
    <Svg width="100%" height="100%" viewBox="0 0 390 680" preserveAspectRatio="xMidYMid slice" style={StyleSheet.absoluteFill} pointerEvents="none">
      {bits.map(([x, y, fill, kind], i) =>
        kind === 'dot' ? (
          <Circle key={i} cx={x} cy={y} r={8} fill={fill} stroke={c.line} strokeWidth={2} />
        ) : kind === 'bar' ? (
          <Rect key={i} x={x} y={y} width={26} height={10} rx={5} fill={fill} stroke={c.line} strokeWidth={2} transform={`rotate(${i * 37} ${x + 13} ${y + 5})`} />
        ) : (
          <Path key={i} d={`M${x} ${y - 12}l3.5 8 8.5 1-6.5 5.5 2 8.5-7.5-4.5-7.5 4.5 2-8.5-6.5-5.5 8.5-1z`} fill={fill} stroke={c.line} strokeWidth={2} strokeLinejoin="round" />
        ),
      )}
    </Svg>
  );
}

export default function HarvestSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const plant = usePlantStore((s) => s.plants.find((p) => p.id === id));
  const events = usePlantStore((s) => s.events);
  const faces = usePlantStore((s) => s.profile.faces);
  const logHarvest = usePlantStore((s) => s.logHarvest);
  const guide = plant ? edibleGuide(plant.speciesId) : undefined;
  const [unit, setUnit] = useState<HarvestUnit>(guide?.unit ?? 'fruit');
  const [amount, setAmount] = useState(START[guide?.unit ?? 'fruit']);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState<{ first: boolean } | null>(null);

  if (!plant) return null;
  const tint = c.potTint[plant.potColor];

  const pickUnit = (u: HarvestUnit) => {
    haptics.tap();
    if ((u === 'grams') !== (unit === 'grams')) setAmount(START[u]);
    setUnit(u);
  };
  const bump = (dir: 1 | -1) => {
    haptics.tap();
    setAmount((a) => Math.max(STEP[unit], a + dir * STEP[unit]));
  };
  const save = () => {
    const first = isFirstHarvest(events, plant.id);
    logHarvest(plant.id, amount, unit, note);
    haptics.success();
    setSaved({ first });
  };
  const close = () => (router.canGoBack() ? router.back() : router.replace('/grow'));

  if (saved) {
    const total = formatTotals(harvestStats(events, [plant]).byPlant[plant.id]?.totals);
    const bg = saved.first ? c.butter : c.mint;
    return (
      <View style={[styles.done, { backgroundColor: bg, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        {saved.first ? <Confetti c={c} /> : null}
        <View style={[styles.circle, { backgroundColor: c.card, borderColor: c.line, boxShadow: `0px 5px 0px ${c.drop}` }]}>
          <PlantBuddy speciesId={plant.speciesId} pot={plant.potColor} mood="happy" size={160} bg={c.card} faces={faces} />
        </View>
        {saved.first ? (
          <View style={[styles.ribbon, { backgroundColor: c.coral, borderColor: c.line }]}>
            <Text style={[styles.ribbonText, { color: textOn(c.coral, c) }]}>Milestone</Text>
          </View>
        ) : null}
        <Title style={{ textAlign: 'center', fontSize: saved.first ? 40 : 32, lineHeight: saved.first ? 44 : 36 }}>{saved.first ? 'First harvest!' : 'Into the basket!'}</Title>
        <Text style={[styles.doneSub, { color: c.ink }]}>
          {saved.first
            ? `${formatAmount(amount, unit)} from ${plant.name}. You grew that. Many more to come.`
            : `${formatAmount(amount, unit)} from ${plant.name}.${total ? ` That's ${total} so far.` : ''}`}
        </Text>
        <Button title="Back to the patch" raised bg={c.card} onPress={close} style={{ alignSelf: 'stretch', minHeight: 56 }} textStyle={{ fontSize: 18, fontFamily: fonts.display }} />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.toolbar}>
        <GlassButton accessibilityLabel="Close" onPress={close}>
          <Icon d="M6 6l12 12M18 6 6 18" color={c.ink} size={16} width={2.8} />
        </GlassButton>
        <Text style={[styles.toolbarTitle, { color: c.ink }]}>Log harvest</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.hero}>
        <View style={[styles.thumb, { backgroundColor: tint, borderColor: c.line }]}>
          <PlantBuddy speciesId={plant.speciesId} pot={plant.potColor} mood="happy" size={92} bg={tint} faces={faces} />
        </View>
        <Title style={{ flex: 1, fontSize: 26, lineHeight: 30 }}>What did {plant.name} give you?</Title>
      </View>

      <View style={[styles.stepper, { backgroundColor: c.card, borderColor: c.line, boxShadow: `0px 4px 0px ${c.drop}` }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Less" onPress={() => bump(-1)} style={[styles.stepBtn, { backgroundColor: c.peach, borderColor: c.line }]}>
          <Icon d="M5 12h14" color={c.ink} size={22} width={3} />
        </Pressable>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={[styles.amount, { color: c.ink }]} accessibilityLabel={`Amount ${amount}`}>{amount}</Text>
          <Text style={[styles.amountUnit, { color: c.inkMuted }]}>{formatAmount(amount, unit).replace(/^\d+\s*/, '')}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="More" onPress={() => bump(1)} style={[styles.stepBtn, { backgroundColor: c.mint, borderColor: c.line }]}>
          <Icon d="M12 5v14M5 12h14" color={c.ink} size={22} width={3} />
        </Pressable>
      </View>

      <View style={styles.units} accessibilityRole="radiogroup">
        {HARVEST_UNITS.map((u) => {
          const on = u === unit;
          const fill = on ? c.sun : c.card;
          return (
            <Pressable
              key={u}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              onPress={() => pickUnit(u)}
              style={[styles.unit, { backgroundColor: fill, borderColor: c.line }, on && { boxShadow: `0px 3px 0px ${c.drop}` }]}
            >
              <Text style={[styles.unitText, { color: textOn(fill, c) }]}>{UNIT_LABEL[u]}</Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Add a note… (first red one!)"
        placeholderTextColor={c.inkMuted}
        style={[styles.note, { backgroundColor: c.cloud, color: c.ink }]}
        accessibilityLabel="Note"
      />

      <Button title="Add to basket" raised bg={c.leaf} onPress={save} style={{ minHeight: 56, marginTop: 4 }} textStyle={{ fontSize: 19, fontFamily: fonts.display }} />
      <View style={styles.hintRow}>
        <Icon d={GROW_ICON.harvest} color={c.inkMuted} size={16} />
        <Text style={[styles.hint, { color: c.inkMuted }]}>{isFirstHarvest(events, plant.id) ? 'This will be the first harvest from ' + plant.name + '!' : 'Every pick adds to the season total.'}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 16 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  toolbarTitle: { fontSize: 17, fontWeight: '700' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  thumb: { width: 100, height: 100, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderRadius: 22, padding: 12, gap: 12 },
  stepBtn: { width: 56, height: 56, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  amount: { fontFamily: fonts.display, fontSize: 48, lineHeight: 54 },
  amountUnit: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  units: { flexDirection: 'row', gap: 8 },
  unit: { flex: 1, height: 44, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  unitText: { fontFamily: fonts.displaySemi, fontSize: 15 },
  note: { minHeight: 48, borderRadius: 14, paddingHorizontal: 14, fontSize: 15, fontFamily: fonts.body },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  hint: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 24, overflow: 'hidden' },
  circle: { width: 196, height: 196, borderRadius: 98, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  ribbon: { borderWidth: 2, borderRadius: 14, paddingHorizontal: 12, height: 28, justifyContent: 'center', marginTop: 4 },
  ribbonText: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  doneSub: { fontFamily: fonts.bodyHeavy, fontSize: 16, lineHeight: 22, textAlign: 'center' },
});
