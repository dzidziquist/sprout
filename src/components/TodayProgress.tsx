import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../theme/tokens';
import { useColors } from '../theme/theme';

/** One progress bar for the round, however many plants are in it. */
export function TodayProgress({ done, total }: { done: number; total: number }) {
  const c = useColors();
  const pct = total > 0 ? Math.min(1, done / total) : 0;
  return (
    <View style={styles.wrap}>
      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`${done} of ${total} checked`}
        accessibilityValue={{ min: 0, max: total, now: done }}
        style={[styles.track, { backgroundColor: c.card, borderColor: c.line }]}
      >
        {pct > 0 && <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: c.leaf, borderColor: c.line, borderRightWidth: pct < 1 ? 2 : 0 }]} />}
      </View>
      <Text style={[styles.text, { color: c.ink }]}>
        {done} of {total} checked
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4, marginTop: 6 },
  track: { height: 14, borderRadius: 7, borderWidth: 2, overflow: 'hidden' },
  fill: { height: '100%' },
  text: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
});
