import { StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Sticker } from '@/components/ui';
import { useColors } from '@/theme/theme';
import { fonts } from '@/theme/tokens';
import { FREEZES_PER_MONTH, type StreakResult } from '@/engine/streak';

const SPROUT = 'M12 21v-8M12 13C12 8.5 8.5 5 3.5 5c0 4.5 3.5 8 8.5 8zM12 15.5c0-3.5 3.5-7 8.5-7 0 4.5-3.5 7-8.5 7z';
/** Week boxes in the row, including "now". */
const SLOTS = 7;
const FREEZE = 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5';

function copyFor(s: StreakResult): string {
  if (s.thisWeek === 'covered') return 'A week saver has this week covered. No stress.';
  if (s.thisWeek === 'open') return 'New week, fresh sprout. Check in whenever you can.';
  return s.checkedThisWeek ? 'Everyone got checked in time this week.' : 'Nothing overdue. Your next check adds this week.';
}

/** Weekly streak, drawn as a growing sprout. No flames, no guilt. */
export function StreakCard({ streak }: { streak: StreakResult }) {
  const c = useColors();
  // The row fills left to right: weeks since care began, then "now", then empty boxes for the weeks ahead.
  // Quiet weeks from before the first real week are left out, so a new streak starts at the left.
  const begun = streak.weeks.findIndex((w) => w.status !== 'quiet');
  const recent = (begun === -1 ? [] : streak.weeks.slice(begun)).slice(-(SLOTS - 1));
  const ahead = SLOTS - 1 - recent.length;
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

      <View style={styles.weeks} accessibilityLabel={recent.length ? `Last ${recent.length + 1} weeks` : 'This week'}>
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
        {Array.from({ length: ahead }, (_, i) => (
          <View key={`ahead-${i}`} style={[styles.week, styles.ahead, { borderColor: c.inkMuted }]} />
        ))}
      </View>

      <Text style={[styles.how, { color: c.ink }]}>
        Each box is a week: green when every plant got its check on time. Miss one and a week saver turns it blue, so your streak keeps going. You get 2 a month.
      </Text>

      <View style={styles.footer}>
        <Text style={[styles.meta, { color: c.ink }]}>Best: {streak.best} {streak.best === 1 ? 'week' : 'weeks'}</Text>
        <View
          style={styles.freezes}
          accessible
          accessibilityLabel={`Week savers: ${streak.freezesLeft} of ${FREEZES_PER_MONTH} left this month. Each one covers a missed week. They refill on the 1st.`}
        >
          <Text style={[styles.meta, { color: c.ink }]}>Week savers</Text>
          {Array.from({ length: FREEZES_PER_MONTH }, (_, i) => {
            const left = i < streak.freezesLeft;
            return (
              <View key={i} style={[styles.saver, { borderColor: left ? c.line : c.inkMuted, backgroundColor: left ? c.sky : 'transparent' }, !left && { borderStyle: 'dashed', opacity: 0.6 }]}>
                <Svg width={14} height={14} viewBox="0 0 24 24"><Path d={FREEZE} stroke={left ? c.onBright : c.inkMuted} strokeWidth={2.4} strokeLinecap="round" fill="none" /></Svg>
              </View>
            );
          })}
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
  ahead: { borderStyle: 'dashed', opacity: 0.45 },
  nowText: { fontFamily: fonts.bodyHeavy, fontSize: 10 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 },
  freezes: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  saver: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  meta: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  how: { fontFamily: fonts.body, fontSize: 12, lineHeight: 16, opacity: 0.85 },
});
