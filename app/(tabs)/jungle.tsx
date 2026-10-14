import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { moodFor } from '@/engine/careEngine';
import { speciesOf } from '@/data/species';
import { PlantBuddy } from '@/components/PlantBuddy';
import { PlantMenu } from '@/components/PlantMenu';
import { Button, Label, Sticker, Title } from '@/components/ui';
import { GlassButton } from '@/components/GlassButton';
import * as haptics from '@/lib/haptics';
import { textOn, useColors, type Palette } from '@/theme/theme';
import { fonts } from '@/theme/tokens';
import type { Mood, Plant } from '@/types';

const moodBadge = (c: Palette): Record<Mood, { text: string; bg: string }> => ({
  thirsty: { text: 'Check me', bg: c.peach },
  happy: { text: 'Happy', bg: c.leaf },
  snoozing: { text: 'Resting', bg: c.lavender },
});

function PlantCard({ plant, faded }: { plant: Plant; faded?: boolean }) {
  const c = useColors();
  const faces = usePlantStore((s) => s.profile.faces);
  const mood = moodFor(plant, new Date());
  const tint = c.potTint[plant.potColor];
  const badge = plant.rooting
    ? { text: 'Rooting', bg: c.ice }
    : faded
      ? { text: plant.archivedReason === 'gifted' ? 'Gifted' : 'In memory', bg: c.cloud }
      : moodBadge(c)[mood];
  return (
    <PlantMenu plant={plant} style={styles.card}>
      <Sticker drop={faded ? 0 : 4} style={faded && { opacity: 0.55 }}>
        <View style={[styles.art, { backgroundColor: tint, borderColor: c.line }]}>
          <PlantBuddy speciesId={plant.rooting ? 'cutting' : plant.speciesId} mood={faded ? 'happy' : mood} pot={plant.potColor} size={96} bg={tint} faces={faded ? 'off' : faces} />
          <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: c.line }]}>
            <Text style={[styles.badgeText, { color: textOn(badge.bg, c) }]}>{badge.text}</Text>
          </View>
        </View>
        <View style={styles.meta}>
          <Text style={[styles.name, { color: c.ink }]} numberOfLines={1}>{plant.name}</Text>
          <Text style={[styles.kind, { color: c.inkMuted }]} numberOfLines={1}>
            {plant.room ? `${speciesOf(plant).commonName} · ${plant.room}` : speciesOf(plant).commonName}
          </Text>
        </View>
      </Sticker>
    </PlantMenu>
  );
}

export default function JungleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useColors();
  const plants = usePlantStore((s) => s.plants);
  const [showMemory, setShowMemory] = useState(false);
  const living = plants.filter((p) => !p.archivedAt);
  const potted = living.filter((p) => !p.rooting);
  const rooting = living.filter((p) => p.rooting);
  const memory = plants.filter((p) => p.archivedAt);
  const edibles = potted.filter((p) => speciesOf(p).edible);
  const rooms = new Set(potted.map((p) => p.room).filter(Boolean));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={[styles.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 120 }]}>
      <View style={styles.toolbar}>
        <View style={{ flex: 1 }}>
          <Title>My jungle</Title>
          <Label muted>
            {potted.length} {potted.length === 1 ? 'plant' : 'plants'} · {rooms.size} {rooms.size === 1 ? 'spot' : 'spots'}
            {rooting.length ? ` · ${rooting.length} rooting` : ''}
          </Label>
        </View>
        <GlassButton accessibilityLabel="Add a plant" onPress={() => router.push('/add')}>
          <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke={c.ink} strokeWidth={2.6} strokeLinecap="round" /></Svg>
        </GlassButton>
      </View>

      {edibles.length > 0 && (
        <Pressable accessibilityRole="button" accessibilityLabel="Open grow patch" onPress={() => router.push('/grow')}>
          <Sticker bg={c.peach} style={styles.growLink}>
            <PlantBuddy speciesId={edibles[0].speciesId} pot={edibles[0].potColor} mood="happy" size={52} bg={c.peach} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.growTitle, { color: c.ink }]}>Grow patch</Text>
              <Text style={[styles.growSub, { color: c.ink }]}>{edibles.length} {edibles.length === 1 ? 'crop' : 'crops'} · stages, weather and harvests</Text>
            </View>
            <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="m9 6 6 6-6 6" stroke={c.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
          </Sticker>
        </Pressable>
      )}

      {living.length === 0 ? (
        <Sticker bg={c.mint} style={styles.empty}>
          <PlantBuddy speciesId="pothos" pot="blue" mood="happy" size={130} bg={c.mint} />
          <Text style={[styles.emptyTitle, { color: c.ink }]}>A jungle starts with one leaf</Text>
          <Text style={[styles.emptySub, { color: c.ink }]}>Add a plant and it’ll live here, with its mood, rhythm and family tree.</Text>
          <Button title="Add your first plant" raised onPress={() => router.push('/add')} style={{ alignSelf: 'stretch' }} />
        </Sticker>
      ) : (
        <>
          <View style={styles.grid}>
            {potted.map((p) => (
              <PlantCard key={p.id} plant={p} />
            ))}
          </View>
          {rooting.length > 0 && (
            <View style={{ gap: 10 }}>
              <Label>Rooting babies</Label>
              <View style={styles.grid}>
                {rooting.map((p) => (
                  <PlantCard key={p.id} plant={p} />
                ))}
              </View>
            </View>
          )}
          <Label muted style={{ textAlign: 'center' }}>Tip: press and hold a plant for quick actions.</Label>
        </>
      )}

      {memory.length > 0 && (
        <View style={{ gap: 10 }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: showMemory }}
            accessibilityLabel={`In memory, ${memory.length} ${memory.length === 1 ? 'plant' : 'plants'}`}
            onPress={() => {
              haptics.tap();
              setShowMemory((v) => !v);
            }}
            style={[styles.memoryHead, { borderColor: c.line, backgroundColor: c.cloud }]}
          >
            <Text style={[styles.memoryText, { color: c.ink }]}>In memory ({memory.length})</Text>
            <Svg width={18} height={18} viewBox="0 0 24 24" style={{ transform: [{ rotate: showMemory ? '180deg' : '0deg' }] }}>
              <Path d="m6 9 6 6 6-6" stroke={c.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </Pressable>
          {showMemory && (
            <>
              <Label muted>Gifted cuttings and plants that taught you something. They stay in Offshoots too.</Label>
              <View style={styles.grid}>
                {memory.map((p) => (
                  <PlantCard key={p.id} plant={p} faded />
                ))}
              </View>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 16 },
  toolbar: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 44 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47.5%', flexGrow: 0 },
  art: { height: 104, alignItems: 'center', justifyContent: 'flex-end', borderBottomWidth: 2, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  badge: { position: 'absolute', top: 8, left: 8, borderWidth: 2, borderRadius: 13, paddingHorizontal: 8, height: 26, justifyContent: 'center' },
  badgeText: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
  meta: { paddingHorizontal: 12, paddingVertical: 8 },
  name: { fontFamily: fonts.displaySemi, fontSize: 17 },
  kind: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  empty: { alignItems: 'center', padding: 20, gap: 10 },
  growLink: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 20 },
  growTitle: { fontFamily: fonts.display, fontSize: 18 },
  growSub: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 22, textAlign: 'center' },
  emptySub: { fontFamily: fonts.bodyHeavy, fontSize: 14, textAlign: 'center' },
  memoryHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderRadius: 16, paddingHorizontal: 14, minHeight: 48 },
  memoryText: { fontFamily: fonts.displaySemi, fontSize: 16 },
});
