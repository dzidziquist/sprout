import { useUnits } from '../hooks/useUnits';
import { localizeTemps } from '../lib/units';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '../store/plantStore';
import { ediblePlants, pickGrowCard, putAway, tasksFor, weatherAlerts, type AlertKind } from '../engine/growPatch';
import { useForecast } from '../lib/weather';
import { fonts, type } from '../theme/tokens';
import { useColors, type Palette } from '../theme/theme';
import type { TaskKind } from '../data/edibles';

/** Icons shared by the Grow patch screens (24×24 stroke paths). */
export const GROW_ICON = {
  back: 'm15 18-6-6 6-6',
  chevron: 'm9 6 6 6-6 6',
  thermo: 'M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z',
  snow: 'M12 2v20M4.9 7l14.2 10M19.1 7 4.9 17M9.5 3.5 12 5.5l2.5-2M9.5 20.5l2.5-2 2.5 2',
  rain: 'M7 14a4 4 0 0 1-.6-8A5.5 5.5 0 0 1 17 4.5a4.5 4.5 0 0 1 0 9.5zM8 17l-1 3M12 17l-1 3M16 17l-1 3',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  sow: 'M12 21v-7M12 14c0-4 3-7 7-7 0 4-3 7-7 7zM12 16c0-3-2.5-5.5-6-5.5 0 3 2.5 5.5 6 5.5z',
  plant: 'M7 20h10l1-9H6zM12 11V5M9 7c1-2 5-2 6 0',
  care: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  feed: 'M9 3h6M10 3v5l-4.5 7.5A3 3 0 0 0 8 20h8a3 3 0 0 0 2.5-4.5L14 8V3M7.5 14h9',
  harvest: 'M3.5 10h17l-2 10h-13zM8 10l4-6 4 6',
  protect: 'M12 3a9 9 0 0 1 9 9H3a9 9 0 0 1 9-9zM12 12v6a2 2 0 0 0 4 0',
  scissors: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 4 8.1 15.9M14.5 14.5 20 20M8.1 8.1 12 12',
  check: 'm5 12 5 5 9-10',
  close: 'M6 6l12 12M18 6 6 18',
} as const;

export const ALERT_ICON: Record<AlertKind, string> = {
  frost: GROW_ICON.snow,
  'cold-set': GROW_ICON.thermo,
  'heat-set': GROW_ICON.thermo,
  'warm-nights': GROW_ICON.moon,
  'heavy-rain': GROW_ICON.rain,
};

export function alertTint(kind: AlertKind, c: Palette): string {
  return kind === 'frost' || kind === 'cold-set' ? c.ice : kind === 'heavy-rain' ? c.lavender : c.peach;
}

export function taskTint(kind: TaskKind, c: Palette): string {
  return { sow: c.butter, plant: c.mint, care: c.ice, feed: c.blush, harvest: c.peach, protect: c.lavender }[kind];
}

export function Icon({ d, color, size = 22, width = 2.2 }: { d: string; color: string; size?: number; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={d} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/**
 * Today-screen card with the single most important grow item: an active weather alert,
 * else this week's top task. Tapping opens the Grow patch. Renders nothing without edibles.
 */
export function GrowTodayCard() {
  const c = useColors();
  const router = useRouter();
  const plants = usePlantStore((s) => s.plants);
  const climate = usePlantStore((s) => s.profile.climate);
  const events = usePlantStore((s) => s.events);
  const ticks = usePlantStore((s) => s.profile.growTicks);
  const hidden = usePlantStore((s) => s.profile.growHidden);
  const skips = usePlantStore((s) => s.profile.growSkips);
  const offSeason = usePlantStore((s) => s.profile.growOffSeason);
  const setProfile = usePlantStore((s) => s.setProfile);
  const edibles = useMemo(() => ediblePlants(plants), [plants]);
  const forecast = useForecast(climate, edibles.length > 0);
  const units = useUnits();

  // The day, so a card put away comes back on its own once its time is up (not only after some other change).
  const today = new Date().toDateString();
  const item = useMemo(() => {
    if (!edibles.length) return null;
    const now = new Date();
    const pick = pickGrowCard(weatherAlerts(edibles, forecast, units), tasksFor(edibles, climate, now, events), { ticks, skips, offSeason, hidden }, now);
    if (!pick) return null;
    if (pick.kind === 'alert') {
      const a = pick.alert;
      return { key: `alert:${a.id}`, days: 1, title: a.title, body: a.body, icon: ALERT_ICON[a.kind], tint: alertTint(a.kind, c), eyebrow: 'Grow patch · weather' };
    }
    if (pick.kind === 'task') {
      const t = pick.task;
      return { key: `task:${t.id}`, days: 7, title: t.title, body: localizeTemps(t.body, units), icon: GROW_ICON[t.kind], tint: taskTint(t.kind, c), eyebrow: t.thisWeek ? 'Grow patch · this week' : 'Grow patch · this month' };
    }
    return { key: 'quiet', days: 7, title: `${edibles.length} ${edibles.length === 1 ? 'crop' : 'crops'} growing`, body: 'All quiet in the patch. Peek at stages and harvests.', icon: GROW_ICON.sow, tint: c.mint, eyebrow: 'Grow patch' };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edibles, forecast, climate, c, units, events, ticks, skips, offSeason, hidden, today]);

  if (!item) return null;
  // Put away from Today: gone until it's due again (a week for jobs, a day for weather); the next job
  // shows instead, and it's still in the Grow patch.
  const hide = () => {
    const now = new Date();
    setProfile({ growHidden: putAway(hidden, item.key, new Date(now.getTime() + item.days * 86_400_000), now) });
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Grow patch: ${item.title}`}
      onPress={() => router.push('/grow')}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: item.tint, borderColor: c.line, boxShadow: `0px ${pressed ? 1 : 4}px 0px ${c.drop}` },
        pressed && { transform: [{ translateY: 3 }] },
      ]}
    >
      <View style={[styles.badge, { backgroundColor: c.card, borderColor: c.line }]}>
        <Icon d={item.icon} color={c.ink} />
      </View>
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[styles.eyebrow, { color: c.inkMuted }]}>{item.eyebrow}</Text>
        <Text style={[styles.title, { color: c.ink }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[styles.body, { color: c.ink }]} numberOfLines={2}>
          {item.body}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={item.days === 1 ? 'Hide for today' : 'Hide for this week'}
        hitSlop={8}
        onPress={hide}
        style={({ pressed }) => [styles.close, { borderColor: c.line, backgroundColor: c.card }, pressed && { opacity: 0.6 }]}
      >
        <Icon d={GROW_ICON.close} color={c.ink} size={14} width={2.8} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderRadius: 20, padding: 12, paddingRight: 10 },
  close: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  badge: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  eyebrow: { fontFamily: fonts.bodyHeavy, ...type.caption },
  title: { fontFamily: fonts.displaySemi, ...type.headline },
  body: { fontFamily: fonts.body, ...type.footnote },
});
