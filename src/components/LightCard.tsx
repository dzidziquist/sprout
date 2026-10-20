import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlantStore } from '@/store/plantStore';
import { FACING_LABEL, hasWindow, lightNeed, lightTip, roomsInUse, spotLight, suits, yearLight } from '@/engine/light';
import { coordsFor, useForecast } from '@/lib/weather';
import { LineIcon } from '@/components/LineIcon';
import { SunIcon } from '@/components/SunIcon';
import { Button, Sticker } from '@/components/ui';
import { fonts } from '@/theme/tokens';
import { textOn, useColors } from '@/theme/theme';
import type { Plant, WindowSpot } from '@/types';

const SITS: Record<WindowSpot, string> = { sill: 'On the sill', below: 'Below the window', near: 'About 1 m from the window', far: 'Across the room' };

/**
 * "Light at this spot" on a plant's page: how its spot suits it (with what to do when it doesn't),
 * where it sits, and a way to compare spots. Indoor plants only; outdoor and grow-light plants keep
 * their light setting in the care rows.
 */
export function LightCard({ plant }: { plant: Plant }) {
  const c = useColors();
  const router = useRouter();
  const climate = usePlantStore((s) => s.profile.climate);
  const plants = usePlantStore((s) => s.plants);
  const rooms = roomsInUse(usePlantStore((s) => s.profile.rooms), plants);
  const roomName = plant.room?.trim();
  const room = roomName ? rooms[roomName] : undefined;
  const placed = !!room && !!plant.windowSpot;
  const forecast = useForecast(climate, placed);
  if (plant.placement !== 'indoor' || plant.rooting || plant.archivedAt) return null;

  const spot = () => router.push(`/spot/${plant.id}`);
  const head = (
    <View style={styles.headRow}>
      <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">Light at this spot</Text>
      <View style={[styles.badge, { borderColor: c.line, backgroundColor: c.cloud }]}>
        <Text style={[styles.badgeText, { color: c.ink }]}>Estimated</Text>
        <SunIcon color={c.ink} size={14} width={2.4} />
      </View>
    </View>
  );

  // Not set up yet: one clear next step.
  if (!placed) {
    const [text, action, go] = !roomName
      ? [`Give ${plant.name} a room to see how its light suits it.`, 'Choose a room', () => router.push(`/edit/${plant.id}`)]
      : !room
        ? [`Tell us about the ${roomName.toLowerCase()}’s windows to see how ${plant.name}’s light suits it.`, `Set up ${roomName}`, () => router.push({ pathname: '/room-light', params: { room: roomName } })]
        : [`Where does ${plant.name} sit in the ${roomName.toLowerCase()}?`, 'Set position', spot];
    return (
      <Sticker drop={3} style={styles.card}>
        {head}
        <Text style={[styles.body, { color: c.ink }]}>{text}</Text>
        <Button title={action} raised bg={c.leaf} onPress={go} style={{ minHeight: 50 }} />
      </Sticker>
    );
  }

  const lat = coordsFor(climate).lat;
  const now = new Date();
  const here = spotLight(room, plant.windowSpot!, lat, now);
  const fit = suits(here.level, lightNeed(plant));
  const tip = lightTip(plant, { lat, now, rooms, forecast });
  const headline =
    tip?.kind === 'heat' ? 'Hot day ahead' : tip?.kind === 'grey' ? 'Grey days ahead' : fit === 'dim' ? 'May need a brighter spot' : fit === 'harsh' ? 'May get too much sun' : 'Good spot';
  const detail = tip?.text ?? (hasWindow(room) ? yearLight(room, plant.windowSpot!, lat, now.getFullYear()) : 'No window here, so low light all year.');
  const fill = fit === 'ok' && !tip ? c.mint : c.butter;
  const ink = textOn(fill, c);
  const window = room.windows.length === 1 ? `${FACING_LABEL[room.windows[0]][0].toUpperCase()}${FACING_LABEL[room.windows[0]].slice(1)} window` : roomName;

  return (
    <Sticker drop={3} style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
      <View style={{ padding: 14, paddingBottom: 0 }}>{head}</View>
      <View style={[styles.verdict, { backgroundColor: fill, borderColor: c.line }]}>
        <SunIcon color={ink} size={26} width={2.2} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.headline, { color: ink }]}>{headline}</Text>
          <Text style={[styles.detail, { color: ink }]}>{detail}</Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Sits ${SITS[plant.windowSpot!].toLowerCase()}, ${window}. Change`}
        onPress={spot}
        style={({ pressed }) => [styles.sits, { borderColor: c.cloud }, pressed && { opacity: 0.7 }]}
      >
        <LineIcon name="window" color={c.ink} size={24} width={2} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.small, { color: c.inkMuted }]}>Sits at</Text>
          <Text style={[styles.body, { color: c.ink }]}>
            {SITS[plant.windowSpot!]} · {window}
          </Text>
        </View>
        <View style={[styles.change, { borderColor: c.line }]}>
          <Text style={[styles.changeText, { color: c.ink }]}>Change</Text>
        </View>
      </Pressable>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
        <Button title="Compare spots" raised bg={c.leaf} onPress={spot} style={{ minHeight: 50 }} />
        <Text style={[styles.small, { color: c.inkMuted, textAlign: 'center' }]}>Based on your windows and where {plant.name} sits.</Text>
      </View>
    </Sticker>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { fontFamily: fonts.display, fontSize: 19 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  verdict: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderTopWidth: 2, borderBottomWidth: 2 },
  headline: { fontFamily: fonts.display, fontSize: 18 },
  detail: { fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 19 },
  sits: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 4 },
  small: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  body: { fontFamily: fonts.bodyHeavy, fontSize: 15, lineHeight: 20 },
  change: { borderWidth: 2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  changeText: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
});
