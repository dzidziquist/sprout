import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { usePlantStore } from '@/store/plantStore';
import { edibleGuide } from '@/data/edibles';
import { diaryPhotos, growDay, stageAtPhoto } from '@/engine/photoDiary';
import { deletePhoto, photoSrc } from '@/lib/photos';
import { GlassButton } from '@/components/GlassButton';
import * as haptics from '@/lib/haptics';
import { fonts } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import type { CareEvent } from '@/types';
import { useSheetTop } from '@/lib/sheetTop';
import { Glyph } from '@/components/Glyph';

const longDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** Full-screen photo diary: swipe through a plant's photos, and put any of them next to the first one. */
export default function PhotoDiary() {
  const { id, photo } = useLocalSearchParams<{ id: string; photo?: string }>();
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const sheetTop = useSheetTop();
  const { width } = useWindowDimensions();
  const plant = usePlantStore((s) => s.plants.find((p) => p.id === id));
  const events = usePlantStore((s) => s.events);
  const removePhoto = usePlantStore((s) => s.removePhoto);
  const photos = useMemo(() => diaryPhotos(events, id), [events, id]);
  const [index, setIndex] = useState(() => Math.max(0, photos.findIndex((e) => e.id === photo)));
  const [compare, setCompare] = useState(false);
  const list = useRef<FlatList<CareEvent>>(null);

  const page = Math.min(width, 520);
  const close = () => (router.canGoBack() ? router.back() : router.replace(`/plant/${id}`));

  useEffect(() => {
    if (photos.length === 0) close();
    else if (index > photos.length - 1) setIndex(photos.length - 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos.length]);

  if (!plant || photos.length === 0) return null;
  const guide = edibleGuide(plant.speciesId);
  const current = photos[Math.min(index, photos.length - 1)];
  const first = photos[0];

  /** "Day 34 · Flower" for edibles; otherwise just the date. */
  const headline = (e: CareEvent) => {
    if (!guide) return shortDate(e.at);
    const s = stageAtPhoto(plant, events, e);
    const label = s ? guide.info[s]?.label : undefined;
    return [`Day ${growDay(plant, e)}`, label].filter(Boolean).join(' · ');
  };

  const jump = (i: number) => {
    setIndex(i);
    list.current?.scrollToIndex({ index: i, animated: true });
    haptics.tap();
  };

  const confirmRemove = () => {
    const go = () => {
      removePhoto(current.id);
      if (current.photoUri) deletePhoto(current.photoUri);
      haptics.success();
    };
    if (Platform.OS === 'web') return go();
    Alert.alert('Remove this photo?', `It comes out of ${plant.name}'s diary and off this phone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: go },
    ]);
  };

  const canCompare = photos.length > 1;
  const gap = Math.round((new Date(new Date(current.at).toDateString()).getTime() - new Date(new Date(first.at).toDateString()).getTime()) / 86400000);

  return (
    <View style={{ flex: 1, backgroundColor: c.bg, paddingTop: sheetTop + 8, paddingBottom: insets.bottom + 16 }}>
      <View style={styles.toolbar}>
        <GlassButton accessibilityLabel="Close" onPress={close}>
          <Glyph name="close" size={16} color={c.ink} width={2.8} />
        </GlassButton>
        <Text style={[styles.toolbarTitle, { color: c.ink }]} numberOfLines={1}>
          {plant.name}'s diary
        </Text>
        <GlassButton accessibilityLabel="Remove this photo" onPress={confirmRemove}>
          <Glyph name="trash" size={18} color={c.ink} width={2.2} />
        </GlassButton>
      </View>

      <ScrollView contentContainerStyle={{ gap: 14, paddingTop: 12 }} showsVerticalScrollIndicator={false}>
        {compare && canCompare ? (
          <View style={[styles.compare, { width: page, alignSelf: 'center' }]}>
            {[first, current === first ? photos[photos.length - 1] : current].map((e, i) => (
              <View key={`${e.id}-${i}`} style={{ flex: 1, gap: 6 }}>
                <View style={[styles.frame, { aspectRatio: 1, borderColor: c.line }]}>
                  <Image source={{ uri: photoSrc(e.photoUri!) }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={`${plant.name} on ${shortDate(e.at)}`} />
                </View>
                <Text style={[styles.compareLabel, { color: c.ink }]}>{headline(e)}</Text>
                <Text style={[styles.meta, { color: c.inkMuted }]}>{i === 0 ? 'First photo' : shortDate(e.at)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <FlatList
            ref={list}
            data={photos}
            keyExtractor={(e) => e.id}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            initialScrollIndex={Math.min(index, photos.length - 1)}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            onMomentumScrollEnd={(ev) => setIndex(Math.round(ev.nativeEvent.contentOffset.x / width))}
            onScroll={Platform.OS === 'web' ? (ev) => setIndex(Math.round(ev.nativeEvent.contentOffset.x / width)) : undefined}
            scrollEventThrottle={100}
            renderItem={({ item }) => (
              <View style={{ width, alignItems: 'center' }}>
                <View style={[styles.frame, { width: page - 40, height: page - 40, borderColor: c.line }]}>
                  <Image source={{ uri: photoSrc(item.photoUri!) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} accessibilityLabel={`${plant.name} on ${shortDate(item.at)}`} />
                </View>
              </View>
            )}
          />
        )}

        <View style={styles.caption}>
          <Text style={[styles.headline, { color: c.ink }]}>
            {compare && canCompare ? (gap > 0 ? `${gap} ${gap === 1 ? 'day' : 'days'} of growing` : 'Same day') : headline(current)}
          </Text>
          {!(compare && canCompare) && (
            <>
              <Text style={[styles.meta, { color: c.inkMuted }]}>
                {longDate(current.at)} · {Math.min(index, photos.length - 1) + 1} of {photos.length}
              </Text>
              {current.note && <Text style={[styles.note, { color: c.ink }]}>{current.note}</Text>}
            </>
          )}
        </View>

        {canCompare && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setCompare((v) => !v);
              haptics.tap();
            }}
            style={[styles.compareBtn, { backgroundColor: compare ? c.ink : c.butter, borderColor: c.line }]}
          >
            <Text style={[styles.compareBtnText, { color: compare ? c.bg : c.ink }]}>{compare ? 'Back to one photo' : 'Compare with the first photo'}</Text>
          </Pressable>
        )}

        {photos.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
            {photos.map((e, i) => {
              const on = e.id === current.id;
              return (
                <Pressable key={e.id} accessibilityRole="button" accessibilityLabel={`Show ${headline(e)}`} onPress={() => jump(i)} style={{ alignItems: 'center', gap: 4 }}>
                  <View style={[styles.thumb, { borderColor: on ? c.ink : c.line, borderWidth: on ? 3 : 2, opacity: on ? 1 : 0.75 }]}>
                    <Image source={{ uri: photoSrc(e.photoUri!) }} style={StyleSheet.absoluteFill} contentFit="cover" />
                  </View>
                  <Text style={[styles.thumbLabel, { color: on ? c.ink : c.inkMuted }]}>{guide ? `Day ${growDay(plant, e)}` : shortDate(e.at)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: 20, gap: 12 },
  toolbarTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700' },
  frame: { borderRadius: 26, borderWidth: 2, overflow: 'hidden' },
  compare: { flexDirection: 'row', gap: 12, paddingHorizontal: 20 },
  compareLabel: { fontFamily: fonts.display, fontSize: 17, textAlign: 'center' },
  caption: { paddingHorizontal: 20, alignItems: 'center', gap: 4 },
  headline: { fontFamily: fonts.display, fontSize: 26, textAlign: 'center' },
  meta: { fontFamily: fonts.bodyHeavy, fontSize: 13, textAlign: 'center' },
  note: { fontFamily: fonts.body, fontSize: 16, lineHeight: 22, textAlign: 'center', marginTop: 4 },
  compareBtn: { alignSelf: 'center', borderWidth: 2, borderRadius: 999, paddingHorizontal: 20, paddingVertical: 12 },
  compareBtnText: { fontFamily: fonts.bodyHeavy, fontSize: 15 },
  strip: { gap: 10, paddingHorizontal: 20 },
  thumb: { width: 64, height: 64, borderRadius: 14, overflow: 'hidden' },
  thumbLabel: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
});
