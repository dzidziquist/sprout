import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as haptics from '@/lib/haptics';
import { fonts, type } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

/** Grouped rows in the Settings style: a small-caps title, a sticker card of rows, a footnote. */
export function Section({ title, children, footer }: { title: string; children: React.ReactNode; footer?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.sectionTitle, { color: c.inkMuted }]} accessibilityRole="header">
        {title.toUpperCase()}
      </Text>
      <View style={[styles.group, { backgroundColor: c.card, borderColor: c.line }]}>{children}</View>
      {footer ? <Text style={[styles.footer, { color: c.inkMuted }]}>{footer}</Text> : null}
    </View>
  );
}

export function Row({ label, sub, value, onPress, last, danger, chevron = true }: { label: string; sub?: string; value?: string; onPress?: () => void; last?: boolean; danger?: boolean; chevron?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      disabled={!onPress}
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      style={({ pressed }) => [styles.row, !last && { borderBottomWidth: 1.5, borderColor: c.cloud }, pressed && { backgroundColor: c.cloud }]}
    >
      {sub ? (
        <View style={{ flex: 1, paddingVertical: 9 }}>
          <Text style={[styles.rowLabel, { color: danger ? c.warn : c.ink }]}>{label}</Text>
          <Text style={[styles.sub, { color: c.inkMuted }]}>{sub}</Text>
        </View>
      ) : (
        <Text style={[styles.rowLabel, { color: danger ? c.warn : c.ink }]}>{label}</Text>
      )}
      {value ? <Text style={[styles.rowValue, { color: c.inkMuted }]}>{value}</Text> : null}
      {onPress && chevron ? (
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <Path d="m9 6 6 6-6 6" stroke={c.inkMuted} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontFamily: fonts.bodyHeavy, ...type.caption, letterSpacing: 0.6, paddingHorizontal: 4 },
  group: { borderWidth: 2, borderRadius: 20, overflow: 'hidden' },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  rowLabel: { flex: 1, fontFamily: fonts.displaySemi, ...type.body },
  rowValue: { fontFamily: fonts.bodyHeavy, ...type.callout },
  sub: { fontFamily: fonts.bodyHeavy, ...type.footnote },
  footer: { fontFamily: fonts.bodyHeavy, ...type.caption, paddingHorizontal: 4 },
});
