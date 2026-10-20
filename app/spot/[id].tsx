import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore } from '@/store/plantStore';
import { FIT_LABEL, hasWindow, spotFits, windowsLine } from '@/engine/light';
import { coordsFor } from '@/lib/weather';
import { LIGHT_ART } from '@/data/art';
import { fitFill } from '@/components/LightRooms';
import { GlassButton } from '@/components/GlassButton';
import { Icon } from '@/components/GrowTodayCard';
import { LineIcon } from '@/components/LineIcon';
import { Button, Title } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { useSheetTop } from '@/lib/sheetTop';
import { fonts } from '@/theme/tokens';
import { textOn, useColors } from '@/theme/theme';
import type { WindowSpot } from '@/types';

const SPOTS: { id: WindowSpot; title: string; sub: string }[] = [
  { id: 'sill', title: 'On the sill', sub: 'Right next to the glass.' },
  { id: 'below', title: 'Below the window', sub: 'On the floor or a stool under it.' },
  { id: 'near', title: 'About 1 m away', sub: 'An arm’s length from the window.' },
  { id: 'far', title: 'Across the room', sub: 'Far from the window.' },
];

/** Where a plant sits by its room's window, with how each spot would suit it right now. */
export default function SpotSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const sheetTop = useSheetTop();
  const plant = usePlantStore((s) => s.plants.find((p) => p.id === id));
  const climate = usePlantStore((s) => s.profile.climate);
  const updatePlant = usePlantStore((s) => s.updatePlant);
  const roomName = plant?.room?.trim() ?? '';
  const room = usePlantStore((s) => (roomName ? s.profile.rooms?.[roomName] : undefined));
  const [picked, setPicked] = useState<WindowSpot | undefined>(plant?.windowSpot);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/jungle'));

  if (!plant) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  const editRoom = () => router.push({ pathname: '/room-light', params: { room: roomName } });

  const body = () => {
    if (!roomName) {
      return (
        <>
          <Text style={[styles.note, { color: c.ink }]}>Give {plant.name} a room first, so we know which windows it’s near.</Text>
          <Button title="Choose a room" raised bg={c.leaf} onPress={() => router.push(`/edit/${plant.id}`)} style={{ minHeight: 56 }} />
        </>
      );
    }
    if (!room) {
      return (
        <>
          <Text style={[styles.note, { color: c.ink }]}>First, tell us about the {roomName.toLowerCase()}’s windows.</Text>
          <Button title={`Set up ${roomName}`} raised bg={c.leaf} onPress={editRoom} style={{ minHeight: 56 }} />
        </>
      );
    }
    if (!hasWindow(room)) {
      return (
        <>
          <Text style={[styles.note, { color: c.ink }]}>No window in the {roomName.toLowerCase()}, so every spot gets low light. A brighter room or a grow light would help a plant that wants more.</Text>
          <Button title="Edit room" bg={c.card} onPress={editRoom} style={{ minHeight: 52 }} />
        </>
      );
    }
    const fits = spotFits(plant, room, coordsFor(climate).lat, new Date());
    return (
      <>
        <View style={[styles.list, { borderColor: c.line }]}>
          <View style={[styles.band, { backgroundColor: c.ice, borderColor: c.line }]}>
            <LineIcon name="window" color={textOn(c.ice, c)} size={22} width={2.2} />
            <Text style={[styles.bandText, { color: textOn(c.ice, c) }]}>{windowsLine(room)}</Text>
          </View>
          {SPOTS.map((s, i) => {
            const on = picked === s.id;
            return (
              <Pressable
                key={s.id}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${s.title}. ${s.sub} ${FIT_LABEL[fits[s.id]]}`}
                onPress={() => {
                  haptics.tap();
                  setPicked(s.id);
                }}
                style={[styles.spot, i < SPOTS.length - 1 && { borderBottomWidth: 1.5, borderColor: c.line }, { backgroundColor: on ? c.lavender : c.card }]}
              >
                <View style={[styles.radio, { borderColor: c.line, backgroundColor: c.card }]}>{on && <View style={[styles.dot, { backgroundColor: c.grape }]} />}</View>
                <Image source={LIGHT_ART[s.id]} style={styles.art} contentFit="contain" accessibilityElementsHidden />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.spotTitle, { color: on ? textOn(c.lavender, c) : c.ink }]}>{s.title}</Text>
                  <Text style={[styles.spotSub, { color: on ? textOn(c.lavender, c) : c.inkMuted }]}>{s.sub}</Text>
                  <View style={[styles.pill, { backgroundColor: fitFill(fits[s.id], c), borderColor: c.line }]}>
                    <Text style={[styles.pillText, { color: textOn(fitFill(fits[s.id], c), c) }]}>{FIT_LABEL[fits[s.id]]}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.footnote}>
          <LineIcon name="info" color={c.inkMuted} size={16} width={2.2} />
          <Text style={[styles.footText, { color: c.inkMuted }]}>Estimates for today. They change with the seasons, weather and shade.</Text>
        </View>
        <Button
          title="Save position"
          raised
          bg={c.leaf}
          disabled={!picked}
          onPress={() => {
            if (!picked) return;
            updatePlant(plant.id, { windowSpot: picked });
            haptics.success();
            close();
          }}
          style={[{ minHeight: 56 }, !picked && { opacity: 0.45 }]}
        />
      </>
    );
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: sheetTop + 8, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.toolbar}>
        <GlassButton accessibilityLabel="Close" onPress={close}>
          <Icon d="M6 6l12 12M18 6 6 18" color={c.ink} size={16} width={2.8} />
        </GlassButton>
      </View>
      <Title>Where does {plant.name} sit?</Title>
      {room && (
        <Text style={[styles.sub, { color: c.inkMuted }]}>
          {roomName} · {windowsLine(room)} ·{' '}
          <Text accessibilityRole="link" onPress={editRoom} style={{ color: c.ink, textDecorationLine: 'underline' }}>
            Edit room
          </Text>
        </Text>
      )}
      {body()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 14 },
  toolbar: { flexDirection: 'row' },
  sub: { fontFamily: fonts.bodyHeavy, fontSize: 15, marginTop: -6 },
  note: { fontFamily: fonts.bodyHeavy, fontSize: 16, lineHeight: 22 },
  list: { borderWidth: 2, borderRadius: 22, overflow: 'hidden' },
  band: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderBottomWidth: 2 },
  bandText: { fontFamily: fonts.bodyHeavy, fontSize: 15 },
  spot: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 10 },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6 },
  art: { width: 72, height: 72 },
  spotTitle: { fontFamily: fonts.display, fontSize: 17 },
  spotSub: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  pill: { alignSelf: 'flex-start', borderWidth: 2, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2, marginTop: 4 },
  pillText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  footnote: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footText: { flex: 1, fontFamily: fonts.bodyHeavy, fontSize: 13 },
});
