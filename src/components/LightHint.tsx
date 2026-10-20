import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { forecastToday, lightTip, placeOf, roomToday, roomsInUse, spotLight } from '@/engine/light';
import { coordsFor, useForecast } from '@/lib/weather';
import { fonts } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import type { Plant } from '@/types';

/**
 * One slim line on a plant's page about its light: a tip when there's a reason (too dim, harsh sun, a
 * hot day, a grey week), or, with "Every day" tips on, today's light. Nothing otherwise.
 */
export function LightHint({ plant }: { plant: Plant }) {
  const c = useColors();
  const router = useRouter();
  const climate = usePlantStore((s) => s.profile.climate);
  const plants = usePlantStore((s) => s.plants);
  const rooms = roomsInUse(usePlantStore((s) => s.profile.rooms), plants);
  const daily = usePlantStore((s) => s.profile.lightTips === 'daily');
  const place = placeOf(plant, rooms);
  const forecast = useForecast(climate, !!place);
  if (!place) return null;
  const lat = coordsFor(climate).lat;
  const now = new Date();
  const tip = lightTip(plant, { lat, now, rooms, forecast });
  if (!tip && !daily) return null;
  const today = roomToday(place.room, lat, now, forecastToday(forecast, now));
  const text = tip
    ? tip.text
    : !place.room.windows.length
      ? 'No window here, so low light all year.'
      : `${spotLight(place.room, place.spot, lat, now).level === 'low' ? 'Low light here today' : 'Good light here today'}: ${today.replace(/ today/, '').replace(/^./, (ch) => ch.toLowerCase())}`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${text} Opens ${place.name} light.`}
      onPress={() => router.push({ pathname: '/room-light', params: { room: place.name } })}
      style={({ pressed }) => [styles.line, { borderColor: c.line, backgroundColor: tip ? c.butter : c.card }, pressed && { opacity: 0.8 }]}
    >
      <Svg width={20} height={20} viewBox="0 0 24 24">
        <Circle cx={12} cy={12} r={4} stroke={c.ink} strokeWidth={2.2} fill="none" />
        <Path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" stroke={c.ink} strokeWidth={2.2} strokeLinecap="round" />
      </Svg>
      <Text style={[styles.text, { color: c.ink }]}>{text}</Text>
      <Svg width={14} height={14} viewBox="0 0 24 24">
        <Path d="m9 6 6 6-6 6" stroke={c.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 9 },
  text: { flex: 1, fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 19 },
});
