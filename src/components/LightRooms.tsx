import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { FIT_LABEL, SPOT_LABEL, forecastToday, hasWindow, lightNeed, lightTip, placeOf, roomToday, roomsInUse, SPOT_SHORT, spotLight, suits, windowDir, windowsLine } from '@/engine/light';
import { useForecast } from '@/lib/weather';
import { useSite } from '@/hooks/useSite';
import { PlantBuddy } from '@/components/PlantBuddy';
import { LineIcon } from '@/components/LineIcon';
import { Sticker } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { fonts } from '@/theme/tokens';
import { textOn, useColors, type Palette } from '@/theme/theme';
import type { Plant, WindowSpot } from '@/types';

/** Where a plant sits, as a row says it. */
export const fitFill = (fit: 'ok' | 'dim' | 'harsh', c: Palette) => (fit === 'ok' ? c.mint : fit === 'dim' ? c.butter : c.peach);

/** The Jungle's light view: rooms with their windows, and how each plant's spot suits it. */
export function LightRooms({ plants }: { plants: Plant[] }) {
  const c = useColors();
  const router = useRouter();
  const climate = usePlantStore((s) => s.profile.climate);
  const faces = usePlantStore((s) => s.profile.faces);
  const allPlants = usePlantStore((s) => s.plants);
  const rooms = roomsInUse(usePlantStore((s) => s.profile.rooms), allPlants);
  const forecast = useForecast(climate, true);
  const site = useSite();
  const lat = site.lat;
  const now = new Date();
  const today = forecastToday(forecast, now);

  const indoor = plants.filter((p) => p.placement === 'indoor');
  const elsewhere = plants.filter((p) => p.placement !== 'indoor');
  const names = [...new Set(indoor.map((p) => p.room?.trim()).filter((r): r is string => !!r))].sort((a, b) => a.localeCompare(b));
  const roomless = indoor.filter((p) => !p.room?.trim());
  const left = names.filter((n) => !rooms[n]).length;

  const go = (pathname: '/room-light' | '/spot/[id]', params: Record<string, string>) => {
    haptics.tap();
    router.push({ pathname, params });
  };

  const row = (p: Plant, last: boolean) => {
    const place = placeOf(p, rooms);
    const here = place ? spotLight(place.room, place.spot, site, now, { windowId: place.windowId }) : null;
    const fit = here ? suits(here.level, lightNeed(p)) : null;
    const tip = place ? lightTip(p, { site, now, rooms, forecast }) : null;
    // Weather tips (a hot day, a grey week) say what to do; the fit says the rest.
    const weather = tip && (tip.kind === 'heat' || tip.kind === 'grey') ? tip.text : null;
    const windowless = !!place && !hasWindow(place.room);
    // In a room with several windows, say which one it's by: "West · 1 m".
    const by = place && place.room.windows.length > 1 ? place.room.windows.find((w) => w.id === here?.windowId) : undefined;
    const spotText = p.windowSpot ? (by ? `${windowDir(by)} · ${SPOT_SHORT[p.windowSpot]}` : SPOT_LABEL[p.windowSpot]) : '';
    const sub = !p.room?.trim() ? 'No room yet' : windowless ? weather ?? 'No window in this room' : !p.windowSpot ? 'Location not added' : weather ?? spotText;
    // In a room with no window, moving within it won't help, so there's no spot to find or set.
    const action = !p.room?.trim() || windowless ? null : !p.windowSpot ? 'Set position' : fit === 'dim' ? (tip?.growLight ? null : 'Find a brighter spot') : fit === 'harsh' ? 'Find a shadier spot' : null;
    return (
      <View key={p.id} style={[styles.row, !last && { borderBottomWidth: 1.5, borderColor: c.cloud }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${p.name}. ${sub}${fit ? `. ${FIT_LABEL[fit]}` : ''}`}
          onPress={() => router.push(`/plant/${p.id}`)}
          style={({ pressed }) => [styles.rowMain, pressed && { opacity: 0.7 }]}
        >
          <PlantBuddy speciesId={p.speciesId} pot={p.potColor} mood="happy" size={52} bg={c.card} faces={faces} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={[styles.name, { color: c.ink }]} numberOfLines={1}>{p.name}</Text>
            <Text style={[styles.sub, { color: weather ? c.warn : c.inkMuted }]} numberOfLines={2}>{sub}</Text>
            {fit && (
              <View style={[styles.pill, { backgroundColor: fitFill(fit, c), borderColor: c.line }]}>
                <Text style={[styles.pillText, { color: textOn(fitFill(fit, c), c) }]}>{FIT_LABEL[fit]}</Text>
              </View>
            )}
          </View>
          <LineIcon name="chevron-right" color={c.ink} size={18} width={2.4} />
        </Pressable>
        {action && (
          <Pressable accessibilityRole="button" accessibilityLabel={`${action} for ${p.name}`} hitSlop={8} onPress={() => go('/spot/[id]', { id: p.id })} style={styles.action}>
            <Text style={[styles.actionText, { color: c.leafDeep }]}>{action}</Text>
            <LineIcon name="arrow-right" color={c.leafDeep} size={14} width={2.4} />
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <View style={{ gap: 14 }}>
      {left > 0 && (
        <Sticker drop={4} bg={c.butter} style={styles.progress}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Svg width={26} height={26} viewBox="0 0 24 24">
              <Path d="M12 21v-8M12 13c0-4 3-7 8-7 0 4-3 7-8 7ZM12 15c0-3-2.5-5.5-7-5.5 0 3 2.5 5.5 7 5.5Z" stroke={c.ink} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.progressTitle, { color: c.ink }]}>{left === 1 ? 'One room left to set up' : `${left} rooms left to set up`}</Text>
              <Text style={[styles.headSub, { color: c.ink }]}>Tell us about {left === 1 && names.length > 1 ? 'your other room' : 'your rooms'} for better light guidance.</Text>
            </View>
          </View>
          <View style={styles.barRow}>
            <View style={[styles.bar, { borderColor: c.line, backgroundColor: c.card }]}>
              <View style={{ width: `${((names.length - left) / names.length) * 100}%`, height: '100%', backgroundColor: c.leaf }} />
            </View>
            <Text style={[styles.headSub, { color: c.ink }]}>{names.length - left} of {names.length} rooms</Text>
          </View>
        </Sticker>
      )}

      {names.map((name) => {
        const room = rooms[name];
        const inRoom = indoor.filter((p) => p.room?.trim() === name);
        if (!room) {
          const first = inRoom[0];
          return (
            <Pressable key={name} accessibilityRole="button" accessibilityLabel={`Set up light for ${name}`} onPress={() => go('/room-light', { room: name })}>
              <View style={[styles.unset, { borderColor: c.line, backgroundColor: c.card }]}>
                <PlantBuddy speciesId={first.speciesId} pot={first.potColor} mood="happy" size={56} bg={c.card} faces={faces} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.roomName, { color: c.ink }]}>{name}</Text>
                  <Text style={[styles.headSub, { color: c.inkMuted }]}>
                    Add windows for light guidance to see where your {inRoom.length === 1 ? 'plant' : `${inRoom.length} plants`} will be happiest.
                  </Text>
                </View>
                <View style={[styles.setUp, { borderColor: c.line, backgroundColor: c.lavender }]}>
                  <Text style={[styles.editText, { color: textOn(c.lavender, c) }]}>Set up</Text>
                </View>
              </View>
            </Pressable>
          );
        }
        return (
          <Sticker key={name} drop={4} style={{ overflow: 'hidden', padding: 0 }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${name}, ${windowsLine(room)}. Edit windows`}
              onPress={() => go('/room-light', { room: name })}
              style={({ pressed }) => [styles.head, { backgroundColor: hasWindow(room) ? c.butter : c.cloud, borderColor: c.line }, pressed && { opacity: 0.85 }]}
            >
              <LineIcon name={hasWindow(room) ? 'window' : 'no-window'} color={c.ink} size={28} width={2} />
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={[styles.roomName, { color: c.ink }]} accessibilityRole="header">{name}</Text>
                <Text style={[styles.headSub, { color: c.ink }]}>{hasWindow(room) ? windowsLine(room) : 'No window · low light all year'}</Text>
                {hasWindow(room) && <Text style={[styles.today, { color: c.ink }]}>{roomToday(room, lat, now, today)}</Text>}
              </View>
              <View style={[styles.edit, { borderColor: c.line, backgroundColor: c.card }]}>
                <Text style={[styles.editText, { color: c.ink }]}>Edit</Text>
              </View>
            </Pressable>
            {inRoom.map((p, i) => row(p, i === inRoom.length - 1))}
          </Sticker>
        );
      })}

      {roomless.length > 0 && (
        <Sticker drop={0} bg={c.cloud} style={{ overflow: 'hidden', padding: 0 }}>
          <View style={[styles.head, { borderColor: c.line }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.roomName, { color: c.ink }]}>No room yet</Text>
              <Text style={[styles.headSub, { color: c.ink }]}>Give these a room on their page to see their light.</Text>
            </View>
          </View>
          {roomless.map((p, i) => row(p, i === roomless.length - 1))}
        </Sticker>
      )}

      {elsewhere.length > 0 && (
        <View style={[styles.outside, { borderColor: c.inkMuted }]}>
          <LineIcon name="info" color={c.inkMuted} size={18} width={2.2} />
          <Text style={[styles.headSub, { color: c.inkMuted, flex: 1 }]}>
            {elsewhere.length} outside or under a grow light: their light is set on their own page.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  progress: { gap: 10, padding: 14 },
  progressTitle: { fontFamily: fonts.display, fontSize: 18 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bar: { flex: 1, height: 12, borderRadius: 6, borderWidth: 2, overflow: 'hidden' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2 },
  roomName: { fontFamily: fonts.display, fontSize: 19 },
  headSub: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  today: { fontFamily: fonts.bodyHeavy, fontSize: 12, opacity: 0.8 },
  edit: { borderWidth: 2, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  editText: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  row: { paddingHorizontal: 12, paddingVertical: 8, gap: 2 },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60 },
  name: { fontFamily: fonts.displaySemi, fontSize: 17 },
  sub: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  pill: { alignSelf: 'flex-start', borderWidth: 2, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 2, marginTop: 2 },
  pillText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginLeft: 64, paddingVertical: 4 },
  actionText: { fontFamily: fonts.bodyHeavy, fontSize: 14, textDecorationLine: 'underline' },
  unset: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderStyle: 'dashed', borderRadius: 22, padding: 14 },
  setUp: { borderWidth: 2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  outside: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 2, borderStyle: 'dashed', borderRadius: 16, padding: 12 },
});
