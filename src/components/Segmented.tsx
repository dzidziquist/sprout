import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as haptics from '../lib/haptics';
import { fonts } from '../theme/tokens';
import { useColors } from '../theme/theme';

/** Pill-style segmented control (radio group). */
export function Segmented<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T | null; onChange: (v: T) => void; label: string }) {
  const c = useColors();
  return (
    <View style={[styles.segment, { borderColor: c.line, backgroundColor: c.card }]} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = value === o.id;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            onPress={() => {
              haptics.tap();
              onChange(o.id);
            }}
            style={[styles.segBtn, on && { backgroundColor: c.ink }]}
          >
            <Text style={[styles.segText, { color: on ? c.bg : c.ink }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderWidth: 2, borderRadius: 16 },
  segBtn: { flex: 1, minHeight: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  segText: { fontFamily: fonts.displaySemi, fontSize: 15 },
});
