import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { FACING_LABEL, SHADE_LABEL, SPOT_LABEL, lightNeed, lightTip, placeOf, roomToday, spotLight, suits, type RoomLight } from '@/engine/light';
import { coordsFor, useForecast } from '@/lib/weather';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Sticker } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { fonts } from '@/theme/tokens';
import { useColors, type Palette } from '@/theme/theme';
import type { Light, Plant } from '@/types';

const LEVEL_WORD: Record<Light, string> = { low: 'Low', medium: 'Medium', bright: 'Bright', direct: 'Sunny' };
const levelFill = (l: Light, c: Palette) => (l === 'direct' ? c.sun : l === 'bright' ? c.butter : l === 'medium' ? c.mint : c.cloud);

/** "West window · sheer curtain", or the nudge to set it up. */
function windowsLine(room: RoomLight | undefined): string {
  if (!room) return 'Tap Set up to add its windows';
  if (!room.windows.length) return 'No window';
  const dirs = room.windows.map((w) => FACING_LABEL[w]);
  const what = `${dirs.join(' and ').replace(/^./, (ch) => ch.toUpperCase())} ${room.windows.length === 1 ? 'window' : 'windows'}`;
  return room.shade === 'none' ? what : `${what} · ${SHADE_LABEL[room.shade].toLowerCase()}`;
}

/** The Jungle's light view: indoor plants grouped by room, each with where it sits and its light today. */
export function LightRooms({ plants }: { plants: Plant[] }) {
  const c = useColors();
  const router = useRouter();
  const climate = usePlantStore((s) => s.profile.climate);
  const rooms = usePlantStore((s) => s.profile.rooms) ?? {};
  const forecast = useForecast(climate, true);
  const lat = coordsFor(climate).lat;
  const now = new Date();
  const today = forecast?.[0];

  const indoor = plants.filter((p) => p.placement === 'indoor');
  const elsewhere = plants.filter((p) => p.placement !== 'indoor');
  const names = [...new Set(indoor.map((p) => p.room?.trim()).filter((r): r is string => !!r))].sort((a, b) => a.localeCompare(b));
  const roomless = indoor.filter((p) => !p.room?.trim());

  const open = (room: string) => {
    haptics.tap();
    router.push({ pathname: '/room-light', params: { room } });
  };

  const row = (p: Plant, last: boolean) => {
    const place = placeOf(p, rooms);
    const here = place ? spotLight(place.room, place.spot, lat, now) : null;
    const tip = place ? lightTip(p, { lat, now, rooms, forecast }) : null;
    const fit = here ? suits(here.level, lightNeed(p)) : 'ok';
    const sub = tip ? tip.text : p.windowSpot ? SPOT_LABEL[p.windowSpot] : 'Where does it sit?';
    return (
      <Pressable
        key={p.id}
        accessibilityRole="button"
        accessibilityLabel={`${p.name}. ${sub}${here ? `. ${LEVEL_WORD[here.level]} light` : ''}`}
        onPress={() => router.push(`/plant/${p.id}`)}
        style={({ pressed }) => [styles.row, !last && { borderBottomWidth: 1.5, borderColor: c.cloud }, pressed && { backgroundColor: c.cloud }]}
      >
        <PlantBuddy speciesId={p.speciesId} pot={p.potColor} mood="happy" size={40} bg={c.card} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: c.ink }]} numberOfLines={1}>{p.name}</Text>
          <Text style={[styles.sub, { color: tip && fit !== 'ok' ? c.warn : c.inkMuted }]} numberOfLines={2}>{sub}</Text>
        </View>
        {here && (
          <View style={[styles.tag, { backgroundColor: levelFill(here.level, c), borderColor: c.line }]}>
            <Text style={[styles.tagText, { color: c.onBright }]}>{LEVEL_WORD[here.level]}</Text>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={{ gap: 14 }}>
      {names.map((name) => {
        const room = rooms[name];
        const inRoom = indoor.filter((p) => p.room?.trim() === name);
        return (
          <Sticker key={name} drop={4} style={{ overflow: 'hidden', padding: 0 }}>
            <View style={[styles.head, { backgroundColor: room?.windows.length ? c.butter : c.cloud, borderColor: c.line }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={[styles.roomName, { color: c.ink }]} accessibilityRole="header">{name}</Text>
                <Text style={[styles.headSub, { color: c.ink }]}>{windowsLine(room)}</Text>
                {room && <Text style={[styles.today, { color: c.ink }]}>{roomToday(room, lat, now, today)}</Text>}
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`${room ? 'Edit' : 'Set up'} light for ${name}`} hitSlop={10} onPress={() => open(name)} style={[styles.edit, { borderColor: c.line, backgroundColor: c.card }]}>
                <Text style={[styles.editText, { color: c.ink }]}>{room ? 'Edit' : 'Set up'}</Text>
              </Pressable>
            </View>
            {inRoom.map((p, i) => row(p, i === inRoom.length - 1))}
          </Sticker>
        );
      })}

      {roomless.length > 0 && (
        <Sticker drop={0} bg={c.cloud} style={{ overflow: 'hidden', padding: 0 }}>
          <View style={[styles.head, { borderColor: c.line }]}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.roomName, { color: c.ink }]}>No room yet</Text>
              <Text style={[styles.headSub, { color: c.ink }]}>Give these a room in Edit to see their light.</Text>
            </View>
          </View>
          {roomless.map((p, i) => row(p, i === roomless.length - 1))}
        </Sticker>
      )}

      {elsewhere.length > 0 && (
        <View style={[styles.outside, { borderColor: c.inkMuted }]}>
          <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M12 3v3M12 18v3M3 12h3M18 12h3" stroke={c.inkMuted} strokeWidth={2.4} strokeLinecap="round" /></Svg>
          <Text style={[styles.headSub, { color: c.inkMuted, flex: 1 }]}>
            {elsewhere.length} outside or under a grow light: their light is set on their own page.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2 },
  roomName: { fontFamily: fonts.display, fontSize: 19 },
  headSub: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  today: { fontFamily: fonts.bodyHeavy, fontSize: 12, opacity: 0.8 },
  edit: { borderWidth: 2, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  editText: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 6, minHeight: 56 },
  name: { fontFamily: fonts.displaySemi, fontSize: 16 },
  sub: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  tag: { borderWidth: 2, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  outside: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 2, borderStyle: 'dashed', borderRadius: 16, padding: 12 },
});
