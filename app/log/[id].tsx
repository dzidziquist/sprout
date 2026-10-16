import { ART } from '@/data/art';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore, type CareAction } from '@/store/plantStore';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Title } from '@/components/ui';
import { GlassButton } from '@/components/GlassButton';
import { choosePhoto, photoSrc } from '@/lib/photos';
import { isReservoir } from '@/engine/careEngine';
import * as haptics from '@/lib/haptics';
import { textOn, useColors, type Palette } from '@/theme/theme';
import { fonts } from '@/theme/tokens';

type Tint = 'ice' | 'lavender' | 'butter' | 'peach' | 'mint' | 'blush';

const TILES: { id: CareAction; label: string; tint: Tint; icon: string }[] = [
  { id: 'water', label: 'Watered', tint: 'ice', icon: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z' },
  { id: 'wet', label: 'Still wet', tint: 'lavender', icon: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11zM4 4l16 16' },
  { id: 'refresh', label: 'Fresh water', tint: 'mint', icon: 'M4 14a8 8 0 0 0 16 0M4 14h16M8 10c0-2 1.5-3 1.5-5M12 10c0-2 1.5-3 1.5-5M16 10c0-2 1.5-3 1.5-5' },
  { id: 'feed', label: 'Fed', tint: 'butter', icon: 'M9 3h6M10 3v5l-4.5 7.5A3 3 0 0 0 8 20h8a3 3 0 0 0 2.5-4.5L14 8V3M7.5 14h9' },
  { id: 'repot', label: 'Repotted', tint: 'peach', icon: 'M7 20h10l1-9H6zM12 11V5M9 7c1-2 5-2 6 0' },
  { id: 'prune', label: 'Trimmed', tint: 'mint', icon: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12' },
  { id: 'pest', label: 'Bugs!', tint: 'blush', icon: 'M12 6a4 4 0 0 1 4 4v6a4 4 0 0 1-8 0v-6a4 4 0 0 1 4-4zM12 20v-9M8 10H4M16 10h4M8 15H4M16 15h4' },
  { id: 'cutting', label: 'Cutting', tint: 'lavender', icon: 'M6 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 21.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 7.5v9M6 12h4a4 4 0 0 0 4-4V8M15.5 12H10' },
  { id: 'photo', label: 'Photo', tint: 'butter', icon: 'M3 9a3 3 0 0 1 3-3h1.5L9 4h6l1.5 2H18a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z' },
];

const BRIGHT: Record<Tint, keyof Palette> = { ice: 'sky', lavender: 'grape', butter: 'sun', peach: 'coral', mint: 'leaf', blush: 'bubblegum' };
/** Selected tile fill: the soft tint in light mode, its bright twin in dark mode (dark tints are too quiet). */
const tintOf = (c: Palette, t: Tint) => (c.scheme === 'dark' ? (c[BRIGHT[t]] as string) : c[t]);

export default function LogCareSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useColors();
  const plant = usePlantStore((s) => s.plants.find((p) => p.id === id));
  const logCare = usePlantStore((s) => s.logCare);
  const addPhoto = usePlantStore((s) => s.addPhoto);
  const faces = usePlantStore((s) => s.profile.faces);
  const [sel, setSel] = useState<Set<CareAction>>(new Set());
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(0);

  if (!plant) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  const hydro = isReservoir(plant.soil);
  const tiles = TILES.filter((t) => (t.id !== 'cutting' || (!plant.rooting && !plant.archivedAt)) && (t.id !== 'refresh' || hydro));

  const toggle = async (a: CareAction) => {
    haptics.tap();
    if (a === 'cutting') {
      // Cuttings get their own sheet: how many, what they root in, and their names.
      router.push(`/cuttings/${plant.id}`);
      return;
    }
    if (a === 'photo') {
      if (sel.has('photo')) {
        setPhotoUri(null);
        setSel((prev) => {
          const next = new Set(prev);
          next.delete('photo');
          return next;
        });
        return;
      }
      const uri = await choosePhoto();
      if (!uri) return;
      setPhotoUri(uri);
      setSel((prev) => new Set(prev).add('photo'));
      return;
    }
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else {
        next.add(a);
        // Watered and Still wet are opposite answers.
        if (a === 'water' || a === 'refresh') next.delete('wet');
        if (a === 'wet') {
          next.delete('water');
          next.delete('refresh');
        }
      }
      return next;
    });
  };

  const save = () => {
    if (sel.size === 0) return;
    const rest = [...sel].filter((a) => a !== 'photo');
    let count = 0;
    if (rest.length) count += logCare(plant.id, rest, note);
    if (photoUri) {
      // The note rides along with the photo when it's the only thing logged.
      addPhoto(plant.id, photoUri, rest.length ? undefined : note);
      count += 1;
    }
    setSaved(count);
    haptics.success();
  };

  if (saved) {
    return (
      <View style={[styles.page, styles.saved, { backgroundColor: c.leaf }]}>
        <View style={[styles.circle, { backgroundColor: c.card, borderColor: c.line }]}>
          {photoUri ? (
            <Image source={{ uri: photoSrc(photoUri) }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={`New photo of ${plant.name}`} />
          ) : (
            <Image source={ART.thanks} style={{ width: 150, height: 150 }} contentFit="contain" accessibilityElementsHidden />
          )}
        </View>
        <Title style={{ textAlign: 'center', color: textOn(c.leaf, c) }}>{plant.name} says thanks!</Title>
        <Text style={[styles.savedSub, { color: textOn(c.leaf, c) }]}>
          {saved} {saved === 1 ? 'thing' : 'things'} logged. {sel.has('water') || sel.has('wet') || sel.has('refresh') ? 'The rhythm just got smarter.' : photoUri ? 'Added to the photo diary.' : ''}
        </Text>
        <Button title={`Back to ${plant.name}`} raised bg={c.card} onPress={() => router.back()} style={{ alignSelf: 'stretch', minHeight: 56 }} />
      </View>
    );
  }

  return (
    <ScrollView automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" style={{ backgroundColor: c.bg }} contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled">
      <View style={styles.toolbar}>
        <GlassButton accessibilityLabel="Close" onPress={() => router.back()}>
          <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6 6 18" stroke={c.ink} strokeWidth={2.8} strokeLinecap="round" /></Svg>
        </GlassButton>
        <Text style={[styles.toolbarTitle, { color: c.ink }]}>Log care</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save"
          accessibilityState={{ disabled: sel.size === 0 }}
          onPress={save}
          style={[styles.save, { backgroundColor: c.leafDeep, borderColor: c.line }, sel.size === 0 && { opacity: 0.35 }]}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="m5 12 5 5 9-10" stroke={textOn(c.leafDeep, c)} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
        </Pressable>
      </View>
      <Title style={{ fontSize: 26 }}>What did {plant.name} get?</Title>

      <View style={styles.grid}>
        {tiles.map((t) => {
          const label = hydro && t.id === 'water' ? 'Topped up' : hydro && t.id === 'wet' ? 'Plenty left' : t.label;
          const on = sel.has(t.id);
          const showThumb = t.id === 'photo' && on && photoUri;
          return (
            <Pressable
              key={t.id}
              accessibilityRole={t.id === 'cutting' ? 'button' : 'checkbox'}
              accessibilityLabel={t.id === 'photo' ? (on ? 'Photo attached. Tap to remove' : 'Add a photo') : t.id === 'cutting' ? 'Take cuttings' : label}
              accessibilityState={t.id === 'cutting' ? undefined : { checked: on }}
              onPress={() => toggle(t.id)}
              style={[styles.tile, tiles.length === 9 && { width: '31%' }, { backgroundColor: on ? tintOf(c, t.tint) : c.card, borderColor: c.line }, on && { boxShadow: `0px 4px 0px ${c.drop}` }]}
            >
              {showThumb ? (
                <Image source={{ uri: photoSrc(photoUri) }} style={[styles.thumb, { borderColor: c.line }]} contentFit="cover" />
              ) : (
                <Svg width={24} height={24} viewBox="0 0 24 24">
                  <Path d={t.icon} stroke={on ? textOn(tintOf(c, t.tint), c) : c.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </Svg>
              )}
              <Text style={[styles.tileText, { color: on ? textOn(tintOf(c, t.tint), c) : c.ink }]} maxFontSizeMultiplier={1.3}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {photoUri && <Text style={[styles.hint, { color: c.ink, backgroundColor: c.butter, borderColor: c.line }]}>Photo ready for {plant.name}'s diary.</Text>}

      <TextInput
        value={note}
        onChangeText={setNote}
        placeholder="Add a note…"
        placeholderTextColor={c.inkMuted}
        style={[styles.note, { backgroundColor: c.cloud, color: c.ink }]}
        accessibilityLabel="Note"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingTop: 16, gap: 14 },
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toolbarTitle: { fontFamily: fonts.displaySemi, fontSize: 17 },
  save: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '23%', flexGrow: 1, height: 82, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 6 },
  thumb: { width: 30, height: 30, borderRadius: 8, borderWidth: 2 },
  tileText: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  hint: { fontFamily: fonts.bodyHeavy, fontSize: 14, borderWidth: 2, borderRadius: 14, padding: 10 },
  note: { minHeight: 48, borderRadius: 14, paddingHorizontal: 14, fontFamily: fonts.bodyHeavy, fontSize: 15 },
  saved: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  circle: { width: 180, height: 180, borderRadius: 90, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  savedSub: { fontFamily: fonts.bodyHeavy, fontSize: 16, textAlign: 'center' },
});
