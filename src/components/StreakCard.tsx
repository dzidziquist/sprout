import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Sticker } from '@/components/ui';
import { useColors } from '@/theme/theme';
import { fonts } from '@/theme/tokens';
import type { StreakResult } from '@/engine/streak';

const SPROUT = 'M12 21v-8M12 13C12 8.5 8.5 5 3.5 5c0 4.5 3.5 8 8.5 8zM12 15.5c0-3.5 3.5-7 8.5-7 0 4.5-3.5 7-8.5 7z';
const FREEZE = 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5';

function copyFor(s: StreakResult): string {
  if (s.thisWeek === 'covered') return 'A free pass has this week covered. No stress.';
  if (s.thisWeek === 'open') return 'New week, fresh sprout. Check in whenever you can.';
  return s.checkedThisWeek ? 'Everyone got checked in time this week.' : 'Nothing overdue. Your next check adds this week.';
}

/** Weekly streak, drawn as a growing sprout. No flames, no guilt. */
export function StreakCard({ streak }: { streak: StreakResult }) {
  const c = useColors();
  const recent = streak.weeks.slice(-7);
  const weeks = streak.current === 1 ? 'week' : 'weeks';
  return (
    <Sticker bg={c.mint} drop={5} style={styles.card}>
      <View style={styles.top}>
        <View style={[styles.badge, { backgroundColor: c.leaf, borderColor: c.line }]}>
          <Svg width={34} height={34} viewBox="0 0 24 24">
            <Path d={SPROUT} stroke={c.onBright} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.big, { color: c.ink }]} accessibilityRole="header">
            {streak.started ? `${streak.current} ${weeks} growing` : 'Your streak starts here'}
          </Text>
          <Text style={[styles.sub, { color: c.ink }]}>{streak.started ? copyFor(streak) : 'Do your first check and the first sprout appears.'}</Text>
        </View>
      </View>

      <View style={styles.weeks} accessibilityLabel={`Last ${recent.length + 1} weeks`}>
        {recent.map((w) => {
          const bg = w.status === 'kept' ? c.leaf : w.status === 'repaired' ? c.sky : w.status === 'quiet' ? c.cloud : c.card;
          return (
            <View key={w.start} style={[styles.week, { backgroundColor: bg, borderColor: c.line }]}>
              {w.status === 'repaired' && (
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d={FREEZE} stroke={c.onBright} strokeWidth={2.4} strokeLinecap="round" fill="none" /></Svg>
              )}
            </View>
          );
        })}
        <View style={[styles.week, styles.now, { borderColor: c.line, backgroundColor: streak.thisWeek === 'open' || !streak.checkedThisWeek ? c.card : streak.thisWeek === 'covered' ? c.sky : c.leafLight }]}>
          <Text style={[styles.nowText, { color: streak.thisWeek === 'open' || !streak.checkedThisWeek ? c.ink : c.onBright }]}>now</Text>
        </View>
      </View>

      <Text style={[styles.how, { color: c.ink }]}>
        Each box is a week. It turns green when every plant gets its check on time. Missed one? A free pass saves the week.
      </Text>

      <View style={styles.footer}>
        <Text style={[styles.meta, { color: c.ink }]}>Best: {streak.best} {streak.best === 1 ? 'week' : 'weeks'}</Text>
        <View style={styles.freezes} accessibilityLabel={`${streak.freezesLeft} free passes left this month`}>
          <Svg width={16} height={16} viewBox="0 0 24 24"><Path d={FREEZE} stroke={c.ink} strokeWidth={2.2} strokeLinecap="round" fill="none" /></Svg>
          <Text style={[styles.meta, { color: c.ink }]}>
            {streak.freezesLeft} free {streak.freezesLeft === 1 ? 'pass' : 'passes'} left this month
          </Text>
        </View>
      </View>
    </Sticker>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 12 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  badge: { width: 58, height: 58, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  big: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28 },
  sub: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  weeks: { flexDirection: 'row', gap: 6 },
  week: { flex: 1, height: 22, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center', maxWidth: 44 },
  now: { maxWidth: 56, flexGrow: 1.3 },
  nowText: { fontFamily: fonts.bodyHeavy, fontSize: 10 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 },
  freezes: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  how: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, opacity: 0.85 },
});
