import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore, type CareAction } from '@/store/plantStore';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Title } from '@/components/ui';
import { GlassButton } from '@/components/GlassButton';
import * as haptics from '@/lib/haptics';
import { colors, fonts } from '@/theme/tokens';

const TILES: { id: CareAction; label: string; bg: string; icon: string }[] = [
  { id: 'water', label: 'Watered', bg: colors.ice, icon: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z' },
  { id: 'wet', label: 'Still wet', bg: colors.lavender, icon: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11zM4 4l16 16' },
  { id: 'feed', label: 'Fed', bg: colors.butter, icon: 'M9 3h6M10 3v5l-4.5 7.5A3 3 0 0 0 8 20h8a3 3 0 0 0 2.5-4.5L14 8V3M7.5 14h9' },
  { id: 'repot', label: 'Repotted', bg: colors.peach, icon: 'M7 20h10l1-9H6zM12 11V5M9 7c1-2 5-2 6 0' },
  { id: 'prune', label: 'Trimmed', bg: colors.mint, icon: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12' },
  { id: 'pest', label: 'Bugs!', bg: colors.blush, icon: 'M12 6a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0v-6a4 4 0 0 1 4-4zM12 20v-9M8 10H4M16 10h4M8 15H4M16 15h4' },
  { id: 'cutting', label: 'Cutting', bg: colors.lavender, icon: 'M6 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 21.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 7.5v9M6 12h4a4 4 0 0 0 4-4V8M15.5 12H10' },
  { id: 'photo', label: 'Photo', bg: colors.butter, icon: 'M3 9a3 3 0 0 1 3-3h1.5L9 4h6l1.5 2H18a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z' },
];

export default function LogCareSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const plant = usePlantStore((s) => s.plants.find((p) => p.id === id));
  const logCare = usePlantStore((s) => s.logCare);
  const faces = usePlantStore((s) => s.profile.faces);
  const [sel, setSel] = useState<Set<CareAction>>(new Set());
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(0);

  if (!plant) return null;

  const toggle = (a: CareAction) => {
    haptics.tap();
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else {
        next.add(a);
        // Watered and Still wet are opposite answers.
        if (a === 'water') next.delete('wet');
        if (a === 'wet') next.delete('water');
      }
      return next;
    });
  };

  const save = () => {
    if (sel.size === 0) return;
    setSaved(logCare(plant.id, [...sel], note));
    haptics.success();
  };

  if (saved) {
    return (
      <View style={[styles.page, styles.saved]}>
        <View style={styles.circle}>
          <PlantBuddy speciesId={plant.speciesId} pot={plant.potColor} mood="happy" size={150} faces={faces} />
        </View>
        <Title style={{ textAlign: 'center' }}>{plant.name} says thanks!</Title>
        <Text style={styles.savedSub}>
          {saved} {saved === 1 ? 'thing' : 'things'} logged. {sel.has('water') || sel.has('wet') ? 'The rhythm just got smarter.' : ''}
        </Text>
        <Button title={`Back to ${plant.name}`} raised bg={colors.white} onPress={() => router.back()} style={{ alignSelf: 'stretch', minHeight: 56 }} />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: colors.white }} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.toolbar}>
        <GlassButton accessibilityLabel="Close" onPress={() => router.back()}>
          <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6 6 18" stroke={colors.ink} strokeWidth={2.8} strokeLinecap="round" /></Svg>
        </GlassButton>
        <Text style={styles.toolbarTitle}>Log care</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save"
          accessibilityState={{ disabled: sel.size === 0 }}
          onPress={save}
          style={[styles.save, sel.size === 0 && { opacity: 0.35 }]}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="m5 12 5 5 9-10" stroke={colors.white} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
        </Pressable>
      </View>
      <Title style={{ fontSize: 26 }}>What did {plant.name} get?</Title>

      <View style={styles.grid}>
        {TILES.map((t) => {
          const on = sel.has(t.id);
          return (
            <Pressable
              key={t.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              onPress={() => toggle(t.id)}
              style={[styles.tile, { backgroundColor: on ? t.bg : colors.white }, on && { boxShadow: `0px 4px 0px ${colors.ink}` }]}
            >
              <Svg width={24} height={24} viewBox="0 0 24 24">
                <Path d={t.icon} stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
              </Svg>
              <Text style={styles.tileText} maxFontSizeMultiplier={1.3}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {sel.has('cutting') && <Text style={styles.hint}>A baby! It'll appear in {plant.name}'s Offshoots, rooting in water.</Text>}

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Add a note…"
        placeholderTextColor="#8A8A99"
        style={styles.note}
        accessibilityLabel="Note"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingTop: 16, gap: 14, backgroundColor: colors.white },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toolbarTitle: { fontSize: 17, fontWeight: '700', color: colors.ink },
  save: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.leafDeep, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '23%', flexGrow: 1, height: 82, borderRadius: 18, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', gap: 6 },
  tileText: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.ink },
  hint: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.ink, backgroundColor: colors.lavender, borderWidth: 2, borderColor: colors.ink, borderRadius: 14, padding: 10 },
  note: { minHeight: 48, borderRadius: 14, backgroundColor: colors.cloud, paddingHorizontal: 14, fontSize: 15, color: colors.ink },
  saved: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.leaf, gap: 12 },
  circle: { width: 180, height: 180, borderRadius: 90, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  savedSub: { fontFamily: fonts.bodyHeavy, fontSize: 16, color: colors.ink, textAlign: 'center' },
});
