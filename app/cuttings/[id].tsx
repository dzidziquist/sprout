import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Title } from '@/components/ui';
import { GlassButton } from '@/components/GlassButton';
import { METHOD_WORD, ROOTING_METHODS, firstBabyNumber, type RootingMethod } from '@/components/CuttingMethods';
import * as haptics from '@/lib/haptics';
import { textOn, useColors, type Palette } from '@/theme/theme';
import { fonts } from '@/theme/tokens';
import type { CareEvent } from '@/types';

const MAX = 12;

export default function TakeCuttingsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  const plants = usePlantStore((s) => s.plants);
  const faces = usePlantStore((s) => s.profile.faces);
  const takeCutting = usePlantStore((s) => s.takeCutting);
  const plant = plants.find((p) => p.id === id);

  const [count, setCount] = useState(1);
  const [method, setMethod] = useState<RootingMethod>('water');
  const [prefix, setPrefix] = useState(plant ? `${plant.name} baby` : '');
  const [note, setNote] = useState('');
  const [made, setMade] = useState<{ n: number; method: RootingMethod } | null>(null);

  const close = (
    <GlassButton accessibilityLabel="Close" onPress={() => router.back()}>
      <Svg width={16} height={16} viewBox="0 0 24 24">
        <Path d="M6 6l12 12M18 6 6 18" stroke={c.ink} strokeWidth={2.8} strokeLinecap="round" />
      </Svg>
    </GlassButton>
  );

  if (!plant || plant.archivedAt || plant.rooting) {
    return (
      <View style={[styles.page, styles.center, { paddingTop: 16 }]}>
        <View style={styles.toolbar}>{close}</View>
        <Title style={{ textAlign: 'center' }}>
          {!plant ? 'Plant not found' : plant.rooting ? `${plant.name} is still rooting` : `${plant.name} is resting in memory`}
        </Title>
        {plant?.rooting && <Text style={styles.sub}>Let {plant.name} grow roots and settle into a pot before taking cuttings from it.</Text>}
        <Button title="Back" raised bg={c.card} onPress={() => router.back()} style={{ alignSelf: 'stretch', minHeight: 52 }} />
      </View>
    );
  }

  const babies = plants.filter((p) => p.parentId === plant.id).length;
  const base = prefix.trim() || `${plant.name} baby`;
  const isDefault = base === `${plant.name} baby`;
  const start = firstBabyNumber(base, plants, isDefault ? babies : 0);
  const names = Array.from({ length: count }, (_, i) => `${base} ${start + i}`);
  const preview = count === 1 ? names[0] : `${names[0]} … ${names[names.length - 1]}`;

  const step = (d: number) => {
    const next = Math.min(MAX, Math.max(1, count + d));
    if (next !== count) haptics.tap();
    setCount(next);
  };

  const save = () => {
    const now = new Date();
    const at = now.toISOString();
    const born = names.map((n) => takeCutting(plant.id, n, method, now)).filter(Boolean);
    const text = note.trim();
    if (text && born.length) {
      // takeCutting has no note yet, so the note goes into each baby's diary as a note event.
      const notes: CareEvent[] = born.map((b) => ({ id: `${b!.id}-note`, plantId: b!.id, type: 'note', note: text, at }));
      usePlantStore.setState((s) => ({ events: [...s.events, ...notes] }));
    }
    haptics.success();
    setMade({ n: born.length, method });
  };

  if (made) {
    const word = METHOD_WORD[made.method].replace('in ', '');
    return (
      <View style={[styles.page, styles.center, { backgroundColor: c.leaf, paddingBottom: insets.bottom + 24 }]}>
        <View style={[styles.circle, { backgroundColor: c.card, borderColor: c.line }]}>
          <PlantBuddy speciesId="cutting" mood="happy" size={150} bg={c.card} faces={faces} />
        </View>
        <Title style={{ textAlign: 'center', color: textOn(c.leaf, c) }}>
          {made.n === 1 ? 'A new baby' : `${made.n} new babies`} rooting {METHOD_WORD[made.method]} 🌱
        </Title>
        <Text style={[styles.sub, { color: textOn(c.leaf, c) }]}>
          {made.n === 1 ? 'It lives' : 'They live'} in {plant.name}'s Offshoots now. We'll nudge you when it's time to pot up. Keep the {word} {made.method === 'water' ? 'fresh' : 'just damp'} meanwhile.
        </Text>
        <View style={{ alignSelf: 'stretch', gap: 10 }}>
          <Button
            title="See Offshoots"
            raised
            bg={c.card}
            onPress={() => {
              router.back();
              router.push('/offshoots');
            }}
            style={{ minHeight: 56 }}
            textStyle={{ fontSize: 18, fontFamily: fonts.display }}
          />
          <Button title="Done" bg={c.leafLight} onPress={() => router.back()} style={{ minHeight: 48 }} />
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: 16, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.toolbar}>{close}</View>
      <Title style={{ fontSize: 26, lineHeight: 30 }}>Take cuttings from {plant.name}</Title>

      <View style={styles.section}>
        <Text style={styles.heading}>How many?</Text>
        <View style={styles.stepper}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="One fewer"
            accessibilityState={{ disabled: count <= 1 }}
            onPress={() => step(-1)}
            style={[styles.stepBtn, count <= 1 && { opacity: 0.35 }]}
          >
            <Text style={styles.stepSign}>−</Text>
          </Pressable>
          <View style={styles.countBox} accessibilityLiveRegion="polite" accessibilityLabel={`${count} ${count === 1 ? 'cutting' : 'cuttings'}`}>
            <Text style={styles.count}>{count}</Text>
            <Text style={styles.countLabel}>{count === 1 ? 'cutting' : 'cuttings'}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="One more"
            accessibilityState={{ disabled: count >= MAX }}
            onPress={() => step(1)}
            style={[styles.stepBtn, count >= MAX && { opacity: 0.35 }]}
          >
            <Text style={styles.stepSign}>+</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Rooting in</Text>
        <View style={{ gap: 8 }}>
          {ROOTING_METHODS.map((m) => {
            const on = m.id === method;
            return (
              <Pressable
                key={m.id}
                accessibilityRole="radio"
                accessibilityLabel={m.label}
                accessibilityHint={m.tip}
                accessibilityState={{ checked: on }}
                onPress={() => {
                  haptics.tap();
                  setMethod(m.id);
                }}
                style={[styles.method, { backgroundColor: on ? c.lavender : c.card }, on && { boxShadow: `0px 3px 0px ${c.drop}` }]}
              >
                <View style={[styles.radio, on && { backgroundColor: c.grape }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodLabel}>{m.label}</Text>
                  <Text style={styles.methodTip}>{m.tip}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.heading}>Names</Text>
        <TextInput
          value={prefix}
          onChangeText={setPrefix}
          placeholder={`${plant.name} baby`}
          placeholderTextColor={c.inkMuted}
          style={styles.input}
          accessibilityLabel="Name prefix"
          autoCorrect={false}
        />
        <Text style={styles.hint}>Becomes {preview}. Rename any of them later.</Text>
      </View>

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Add a note (optional)…"
        placeholderTextColor={c.inkMuted}
        style={styles.input}
        accessibilityLabel="Note"
      />

      <Button
        title={count === 1 ? 'Start rooting' : `Start rooting ${count}`}
        accessibilityLabel={`Save ${count} ${count === 1 ? 'cutting' : 'cuttings'}`}
        raised
        onPress={save}
        style={{ minHeight: 56 }}
        textStyle={{ fontSize: 19, fontFamily: fonts.display }}
      />
    </ScrollView>
  );
}

function makeStyles(c: Palette) {
  return StyleSheet.create({
    page: { flexGrow: 1, paddingHorizontal: 20, gap: 20, backgroundColor: c.bg },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
    toolbar: { flexDirection: 'row', alignSelf: 'stretch' },
    sub: { fontFamily: fonts.bodyHeavy, fontSize: 15, lineHeight: 21, textAlign: 'center', color: c.inkMuted, paddingHorizontal: 8 },
    section: { gap: 10 },
    heading: { fontFamily: fonts.display, fontSize: 19, color: c.ink },
    stepper: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    stepBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: c.line, backgroundColor: c.butter, alignItems: 'center', justifyContent: 'center', boxShadow: `0px 3px 0px ${c.drop}` },
    stepSign: { fontFamily: fonts.display, fontSize: 26, lineHeight: 30, color: c.ink },
    countBox: { flex: 1, alignItems: 'center' },
    count: { fontFamily: fonts.display, fontSize: 34, lineHeight: 38, color: c.ink },
    countLabel: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: c.inkMuted },
    method: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderColor: c.line, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 10 },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: c.line, backgroundColor: c.card },
    methodLabel: { fontFamily: fonts.displaySemi, fontSize: 16, color: c.ink },
    methodTip: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: c.inkMuted },
    input: { minHeight: 48, borderRadius: 14, paddingHorizontal: 14, fontFamily: fonts.bodyHeavy, fontSize: 15, backgroundColor: c.cloud, color: c.ink },
    hint: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: c.inkMuted },
    circle: { width: 180, height: 180, borderRadius: 90, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  });
}
