import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { checkIntervalDays, isFeedingPaused, moodFor } from '@/engine/careEngine';
import { SPECIES } from '@/data/species';
import { SOIL_LABEL, LIGHT_LABEL } from '@/data/labels';
import { PlantBuddy } from '@/components/PlantBuddy';
import { usePlantActions } from '@/components/PlantMenu';
import { Button, Label, Sticker, Title } from '@/components/ui';
import { GlassButton } from '@/components/GlassButton';
import { choosePhoto, photoSrc } from '@/lib/photos';
import * as haptics from '@/lib/haptics';
import { useColors } from '@/theme/theme';
import { fonts } from '@/theme/tokens';
import type { CareEvent } from '@/types';

const CAMERA = 'M3 9a3 3 0 0 1 3-3h1.5L9 4h6l1.5 2H18a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z';

function daysAgo(iso: string | undefined, now: Date) {
  if (!iso) return '—';
  const d = Math.round((now.getTime() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`;
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

function describe(e: CareEvent): string {
  switch (e.type) {
    case 'check':
      return e.result === 'damp' ? 'Soil check: damp, smart skip' : e.result === 'soggy' ? 'Soil check: soggy' : 'Soil check: dry, watered';
    case 'water':
      return 'Watered';
    case 'feed':
      return 'Fed';
    case 'repot':
      return 'Repotted';
    case 'prune':
      return 'Trimmed';
    case 'pest':
      return 'Bug patrol';
    case 'cutting':
      return 'Took a cutting';
    case 'photo':
      return e.note ? `Photo: ${e.note}` : 'Photo added';
    case 'note':
      return `Note: ${e.note}`;
    case 'harvest':
      return `Harvest${e.amount ? `: ${e.amount} ${e.unit ?? ''}` : ''}`.trim();
    case 'rooted':
      return 'Rooted and potted up!';
    case 'stage':
      return `New stage: ${e.stage}`;
    case 'regrow':
      return 'Cut and regrowing';
    case 'archived':
      return e.note === 'gifted' ? 'Gifted away' : 'Moved to In memory';
  }
}

export default function PlantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { plants, events, profile, addPhoto } = usePlantStore();
  const plant = plants.find((p) => p.id === id);
  const actions = usePlantActions(plant);
  const [showPhoto, setShowPhoto] = useState(true);
  if (!plant || !actions) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  const now = new Date();
  const species = SPECIES[plant.speciesId];
  const tint = c.potTint[plant.potColor];
  const archived = !!plant.archivedAt;
  const rhythm = Math.round(checkIntervalDays({ group: species.group, plant, profile: profile.climate, at: now }));
  const mine = events.filter((e) => e.plantId === plant.id);
  const lastWater = [...mine].reverse().find((e) => e.type === 'water');
  const parent = plants.find((p) => p.id === plant.parentId);
  const babies = plants.filter((p) => p.parentId === plant.id);
  const feedPaused = isFeedingPaused(profile.climate, plant.placement, now);
  const nextCheck = new Date(plant.nextCheckAt).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
  const history = mine.slice(-6).reverse();
  const photos = mine.filter((e) => e.type === 'photo' && e.photoUri).reverse();
  const heroPhoto = showPhoto && plant.photoUri;

  const addNewPhoto = async () => {
    const uri = await choosePhoto();
    if (!uri) return;
    addPhoto(plant.id, uri);
    setShowPhoto(true);
    haptics.success();
  };

  const toolbarIcon = (d: string, size = 18) => (
    <Svg width={size} height={size} viewBox="0 0 24 24"><Path d={d} stroke={c.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
      <View style={[styles.hero, { backgroundColor: tint, paddingTop: insets.top + 8, borderColor: c.line }]}>
        <View style={styles.heroBar}>
          <GlassButton accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
            {toolbarIcon('m15 18-6-6 6-6')}
          </GlassButton>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {plant.photoUri && (
              <GlassButton accessibilityLabel={heroPhoto ? 'Show illustration' : 'Show photo'} onPress={() => { haptics.tap(); setShowPhoto((v) => !v); }}>
                {heroPhoto ? toolbarIcon('M12 21v-8M12 13C12 8.5 8.5 5 3.5 5c0 4.5 3.5 8 8.5 8zM12 15.5c0-3.5 3.5-7 8.5-7 0 4.5-3.5 7-8.5 7z') : toolbarIcon(CAMERA)}
              </GlassButton>
            )}
            <GlassButton accessibilityLabel={`Edit ${plant.name}`} onPress={actions.edit}>
              {toolbarIcon('M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4')}
            </GlassButton>
          </View>
        </View>
        {heroPhoto ? (
          <View style={[styles.heroPhoto, { borderColor: c.line, boxShadow: `0px 4px 0px ${c.drop}` }]}>
            <Image source={{ uri: photoSrc(plant.photoUri!) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessibilityLabel={`Photo of ${plant.name}`} />
          </View>
        ) : (
          <View style={archived && { opacity: 0.6 }}>
            <PlantBuddy speciesId={plant.rooting ? 'cutting' : plant.speciesId} pot={plant.potColor} mood={archived ? 'happy' : moodFor(plant, now)} size={220} bg={tint} faces={archived ? 'off' : profile.faces} />
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View>
          <Title>{plant.name}</Title>
          <Label muted>
            {species.commonName}
            {plant.room ? ` · ${plant.room}` : ''}
            {plant.rooting ? ` · rooting in ${plant.rooting.method}` : ''}
          </Label>
        </View>

        {archived && (
          <Sticker drop={0} bg={plant.archivedReason === 'gifted' ? c.blush : c.cloud} style={styles.archived}>
            <Text style={[styles.archivedTitle, { color: c.ink }]}>
              {plant.archivedReason === 'gifted' ? `Gifted away on ${shortDate(plant.archivedAt!)}` : `In memory since ${shortDate(plant.archivedAt!)}`}
            </Text>
            <Text style={[styles.archivedBody, { color: c.ink }]}>
              {plant.archivedReason === 'gifted'
                ? `${plant.name} is growing somewhere new. Their story stays in your Offshoots.`
                : `Thanks for the leaves, ${plant.name}. Every plant teaches us something, and their diary stays here.`}
            </Text>
            <Button title="Bring back to the jungle" bg={c.card} onPress={actions.restore} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
          </Sticker>
        )}

        {!archived && (
          <View style={styles.stats}>
            <Sticker drop={0} bg={c.ice} style={styles.stat}>
              <Text style={[styles.statNum, { color: c.ink }]}>{plant.rooting ? `Day ${Math.max(1, Math.round((now.getTime() - new Date(plant.rooting.startedAt).getTime()) / 86400000))}` : `~${rhythm} days`}</Text>
              <Text style={[styles.statLabel, { color: c.ink }]}>{plant.rooting ? 'of rooting' : 'check rhythm'}</Text>
            </Sticker>
            <Sticker drop={0} bg={c.butter} style={styles.stat}>
              <Text style={[styles.statNum, { color: c.ink }]}>{daysAgo(lastWater?.at, now)}</Text>
              <Text style={[styles.statLabel, { color: c.ink }]}>last watered</Text>
            </Sticker>
            <Sticker drop={0} bg={c.mint} style={styles.stat}>
              <Text style={[styles.statNum, { color: c.ink }]}>{plant.rooting ? 'Rooting' : nextCheck}</Text>
              <Text style={[styles.statLabel, { color: c.ink }]}>next check</Text>
            </Sticker>
          </View>
        )}

        {!archived && (
          <Button title="Log care" raised onPress={actions.log} style={{ minHeight: 56 }} textStyle={{ fontSize: 19, fontFamily: fonts.display }} />
        )}
        {!archived && plant.rooting && (
          <Button title="Roots showing? Pot it up" bg={c.ice} onPress={() => router.push(`/pot-up/${plant.id}`)} style={{ minHeight: 48 }} />
        )}
        {!archived && species.edible && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Log harvest" bg={c.peach} onPress={() => router.push(`/harvest/${plant.id}`)} style={{ flex: 1, minHeight: 48 }} />
            <Button title="Grow patch" bg={c.butter} onPress={() => router.push('/grow')} style={{ flex: 1, minHeight: 48 }} />
          </View>
        )}

        {(photos.length > 0 || !archived) && (
          <View style={{ gap: 8 }}>
            <View style={styles.rowBetween}>
              <Label>Photo diary</Label>
              {photos.length > 0 && <Label muted>{photos.length} {photos.length === 1 ? 'photo' : 'photos'}</Label>}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip} style={styles.stripWrap}>
              {!archived && (
                <Pressable accessibilityRole="button" accessibilityLabel="Add photo" onPress={addNewPhoto} style={[styles.addPhoto, { borderColor: c.line, backgroundColor: c.butter }]}>
                  <Svg width={26} height={26} viewBox="0 0 24 24"><Path d={CAMERA} stroke={c.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
                  <Text style={[styles.addPhotoText, { color: c.ink }]}>Add photo</Text>
                </Pressable>
              )}
              {photos.map((e) => (
                <View key={e.id} style={styles.photoItem}>
                  <View style={[styles.photo, { borderColor: c.line }]}>
                    <Image source={{ uri: photoSrc(e.photoUri!) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} accessibilityLabel={`${plant.name} on ${shortDate(e.at)}`} />
                  </View>
                  <Text style={[styles.photoDate, { color: c.inkMuted }]}>{shortDate(e.at)}</Text>
                </View>
              ))}
              {photos.length === 0 && !archived && (
                <Text style={[styles.stripHint, { color: c.inkMuted }]}>Snap {plant.name} now and then to watch them grow.</Text>
              )}
            </ScrollView>
          </View>
        )}

        <Sticker drop={0} style={{ overflow: 'hidden' }}>
          {[
            ['Water', 'When the top 2–3 cm feels dry'],
            ['Light', LIGHT_LABEL[plant.light]],
            ['Soil', SOIL_LABEL[plant.soil]],
            ['Feed', feedPaused ? 'Paused till March (grey season)' : 'Monthly while growing'],
            ['Pets', species.petToxic ? 'Toxic to cats and dogs' : 'Pet-friendly'],
          ].map(([k, v], i, all) => (
            <View key={k} style={[styles.row, i < all.length - 1 && { borderBottomWidth: 2, borderColor: c.cloud }]}>
              <Text style={[styles.rowKey, { color: c.inkMuted }]}>{k}</Text>
              <Text style={[styles.rowVal, { color: k === 'Pets' && species.petToxic ? c.warn : c.ink }]}>{v}</Text>
            </View>
          ))}
        </Sticker>

        {(parent || babies.length > 0) && (
          <View style={{ gap: 6 }}>
            <Label>Offshoots</Label>
            {parent && <Label muted>Cutting from {parent.name}</Label>}
            {babies.length > 0 && (
              <Label muted>
                {babies.length} {babies.length === 1 ? 'baby' : 'babies'}: {babies.map((b) => b.name).join(', ')}
              </Label>
            )}
          </View>
        )}

        {history.length > 0 && (
          <View style={{ gap: 8 }}>
            <Label>Recent care</Label>
            {history.map((e) => (
              <View key={e.id} style={styles.diaryRow}>
                <Text style={[styles.diaryText, { color: c.ink }]} numberOfLines={1}>{describe(e)}</Text>
                <Text style={[styles.diaryDate, { color: c.inkMuted }]}>{daysAgo(e.at, now)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', borderBottomWidth: 2, paddingBottom: 4 },
  heroBar: { alignSelf: 'stretch', paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between' },
  heroPhoto: { width: 210, height: 210, borderRadius: 28, borderWidth: 2, overflow: 'hidden', marginVertical: 10 },
  body: { padding: 20, gap: 16 },
  archived: { padding: 14, gap: 4 },
  archivedTitle: { fontFamily: fonts.display, fontSize: 18 },
  archivedBody: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, padding: 10, borderRadius: 16 },
  statNum: { fontFamily: fonts.display, fontSize: 16 },
  statLabel: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  stripWrap: { marginHorizontal: -20 },
  strip: { gap: 10, paddingHorizontal: 20, alignItems: 'flex-start' },
  addPhoto: { width: 96, height: 96, borderRadius: 18, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addPhotoText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  stripHint: { fontFamily: fonts.bodyHeavy, fontSize: 13, width: 200, alignSelf: 'center' },
  photoItem: { alignItems: 'center', gap: 4 },
  photo: { width: 96, height: 96, borderRadius: 18, borderWidth: 2, overflow: 'hidden' },
  photoDate: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  rowKey: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  rowVal: { fontFamily: fonts.bodyHeavy, fontSize: 14, flexShrink: 1, textAlign: 'right' },
  diaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  diaryText: { fontFamily: fonts.bodyHeavy, fontSize: 14, flexShrink: 1 },
  diaryDate: { fontFamily: fonts.body, fontSize: 13 },
});
