import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Sticker } from '@/components/ui';
import { ART } from '@/data/art';
import { useColors } from '@/theme/theme';
import { fonts } from '@/theme/tokens';
import { FREEZES_PER_MONTH, startOfWeek, type StreakResult } from '@/engine/streak';

const SPROUT = 'M12 21v-8M12 13C12 8.5 8.5 5 3.5 5c0 4.5 3.5 8 8.5 8zM12 15.5c0-3.5 3.5-7 8.5-7 0 4.5-3.5 7-8.5 7z';
/** Week boxes in the row, including "now". */
const SLOTS = 7;
const FREEZE = 'M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5';

function copyFor(s: StreakResult): string {
  if (s.thisWeek === 'covered') return 'A week saver has this week covered. No stress.';
  if (s.thisWeek === 'open') return 'Someone’s overdue and this month’s savers are used. Check them to grow a new streak.';
  return s.checkedThisWeek ? 'Everyone got checked in time this week.' : 'Nothing overdue. Your next check adds this week.';
}

/** "Oct 13": the Monday a week box stands for, so nobody reads the boxes as days. */
const weekOf = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** Weekly streak, drawn as a growing sprout. No flames, no guilt. `onHelp` opens the explainer. */
export function StreakCard({ streak, onHelp }: { streak: StreakResult; onHelp?: () => void }) {
  const c = useColors();
  // The row fills left to right: weeks since care began, then "now", then empty boxes for the weeks ahead.
  // Quiet weeks from before the first real week are left out, so a new streak starts at the left.
  const begun = streak.weeks.findIndex((w) => w.status !== 'quiet');
  const recent = (begun === -1 ? [] : streak.weeks.slice(begun)).slice(-(SLOTS - 1));
  const ahead = SLOTS - 1 - recent.length;
  const next = new Date();
  const refill = new Date(next.getFullYear(), next.getMonth() + 1, 1).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const weeks = streak.current === 1 ? 'week' : 'weeks';
  const thisMonday = startOfWeek(next);
  // This week so far: blue once a saver has it, peach when it has slipped with none left, light green once checked.
  const nowFill = streak.thisWeek === 'covered' ? c.sky : streak.thisWeek === 'open' ? c.peach : streak.checkedThisWeek ? c.leafLight : undefined;
  const aheadOf = (i: number) => {
    const d = new Date(thisMonday);
    d.setDate(d.getDate() + 7 * (i + 1));
    return d;
  };
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
            <View key={w.start} style={styles.col}>
              <View style={[styles.week, { backgroundColor: bg, borderColor: c.line }]}>
                {w.status === 'repaired' && (
                  <Svg width={14} height={14} viewBox="0 0 24 24"><Path d={FREEZE} stroke={c.onBright} strokeWidth={2.4} strokeLinecap="round" fill="none" /></Svg>
                )}
              </View>
              <Text style={[styles.date, { color: c.ink }]} numberOfLines={1}>{weekOf(new Date(w.start))}</Text>
            </View>
          );
        })}
        <View style={[styles.col, styles.nowCol]}>
          <View style={[styles.week, { borderColor: c.line, backgroundColor: nowFill ?? c.card }]}>
            <Text style={[styles.nowText, { color: nowFill === c.peach || !nowFill ? c.ink : c.onBright }]}>now</Text>
          </View>
          <Text style={[styles.date, { color: c.ink, opacity: 1 }]} numberOfLines={1}>This week</Text>
        </View>
        {Array.from({ length: ahead }, (_, i) => (
          <View key={`ahead-${i}`} style={styles.col}>
            <View style={[styles.week, styles.ahead, { borderColor: c.inkMuted }]} />
            <Text style={[styles.date, { color: c.inkMuted }]} numberOfLines={1}>{weekOf(aheadOf(i))}</Text>
          </View>
        ))}
      </View>

      <View style={styles.legend}>
        <View style={styles.key} accessible accessibilityLabel="Each box is a week. Green: everyone checked on time. Blue: a week saver covered it.">
          <View style={[styles.dot, { backgroundColor: c.leaf, borderColor: c.line }]} />
          <Text style={[styles.how, { color: c.ink }]}>All checked</Text>
          <View style={[styles.dot, { backgroundColor: c.sky, borderColor: c.line, marginLeft: 8 }]} />
          <Text style={[styles.how, { color: c.ink }]}>Saved</Text>
        </View>
        {onHelp && (
          <Pressable accessibilityRole="button" accessibilityLabel="How your streak works" hitSlop={10} onPress={onHelp} style={styles.help}>
            <Text style={[styles.helpText, { color: c.link }]}>How it works</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={[styles.meta, { color: c.ink }]}>Best: {streak.best} {streak.best === 1 ? 'week' : 'weeks'}</Text>
        <View
          style={[styles.savers, { backgroundColor: c.ice, borderColor: c.line, boxShadow: `0px 2px 0px ${c.drop}` }]}
          accessible
          accessibilityLabel={`Week savers: ${streak.freezesLeft} of ${FREEZES_PER_MONTH} left this month. Each one covers a missed week. They refill on ${refill}.`}
        >
          <View style={styles.tokens}>
            {Array.from({ length: FREEZES_PER_MONTH }, (_, i) => {
              const left = i < streak.freezesLeft;
              return (
                <Image
                  key={i}
                  source={ART.weekSaver}
                  resizeMode="contain"
                  style={[styles.saver, { transform: [{ rotate: i % 2 ? '8deg' : '-8deg' }], marginLeft: i ? -8 : 0 }, !left && { opacity: 0.25 }]}
                />
              );
            })}
          </View>
          <View>
            <Text style={[styles.saverTitle, { color: c.ink }]}>
              {streak.freezesLeft} week {streak.freezesLeft === 1 ? 'saver' : 'savers'}
            </Text>
            <Text style={[styles.saverSub, { color: c.inkMuted }]}>refill {refill}</Text>
          </View>
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
  col: { flex: 1, maxWidth: 44, alignItems: 'center', gap: 3 },
  nowCol: { maxWidth: 56, flexGrow: 1.3 },
  week: { alignSelf: 'stretch', minHeight: 22, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  date: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
  help: { marginLeft: 'auto' },
  helpText: { fontFamily: fonts.bodyHeavy, fontSize: 12, textDecorationLine: 'underline' },
  ahead: { borderStyle: 'dashed', opacity: 0.45 },
  nowText: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  savers: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5, paddingLeft: 6, paddingRight: 10, borderRadius: 16, borderWidth: 2 },
  tokens: { flexDirection: 'row', alignItems: 'center' },
  saver: { width: 34, height: 34 },
  saverTitle: { fontFamily: fonts.bodyHeavy, fontSize: 12, lineHeight: 15 },
  saverSub: { fontFamily: fonts.bodyHeavy, fontSize: 11, lineHeight: 14 },
  meta: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  how: { fontFamily: fonts.bodyHeavy, fontSize: 11, opacity: 0.8 },
  legend: { flexDirection: 'row', alignItems: 'center', marginTop: -2 },
  key: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 10, height: 10, borderRadius: 3, borderWidth: 1.5 },
});
