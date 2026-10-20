import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { textOn, useColors } from '../theme/theme';
import { fonts } from '../theme/tokens';
import * as haptics from '../lib/haptics';
import { SunIcon } from './SunIcon';

export type JungleView = 'grid' | 'list' | 'light';

/** Search box for the jungle: matches name, species and room. */
export function JungleSearch({ value, onChange }: { value: string; onChange: (q: string) => void }) {
  const c = useColors();
  return (
    <View style={[styles.search, { borderColor: c.line, backgroundColor: c.card }]}>
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Circle cx={11} cy={11} r={6.5} stroke={c.inkMuted} strokeWidth={2.6} fill="none" />
        <Path d="m16 16 4.5 4.5" stroke={c.inkMuted} strokeWidth={2.6} strokeLinecap="round" />
      </Svg>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder="Search plants or rooms"
        placeholderTextColor={c.inkMuted}
        accessibilityLabel="Search your jungle"
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
        style={[styles.input, { color: c.ink }]}
      />
      {value.length > 0 && (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear search" hitSlop={10} onPress={() => onChange('')} style={[styles.clear, { backgroundColor: c.cloud }]}>
          <Svg width={12} height={12} viewBox="0 0 24 24">
            <Path d="M6 6l12 12M18 6 6 18" stroke={c.ink} strokeWidth={3.4} strokeLinecap="round" />
          </Svg>
        </Pressable>
      )}
    </View>
  );
}

const VIEW_LABEL: Record<JungleView, string> = { grid: 'Grid', list: 'List', light: 'Light' };

/** Grid / list / light switch, full width with words so "Light" says what it is. */
export function JungleViewToggle({ value, onChange }: { value: JungleView; onChange: (v: JungleView) => void }) {
  const c = useColors();
  const icon = (v: JungleView, on: boolean) => {
    const stroke = on ? textOn(c.lavender, c) : c.inkMuted;
    return v === 'grid' ? (
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Rect x={4} y={4} width={7} height={7} rx={2} stroke={stroke} strokeWidth={2.4} fill="none" />
        <Rect x={13} y={4} width={7} height={7} rx={2} stroke={stroke} strokeWidth={2.4} fill="none" />
        <Rect x={4} y={13} width={7} height={7} rx={2} stroke={stroke} strokeWidth={2.4} fill="none" />
        <Rect x={13} y={13} width={7} height={7} rx={2} stroke={stroke} strokeWidth={2.4} fill="none" />
      </Svg>
    ) : v === 'light' ? (
      <SunIcon color={stroke} size={19} width={2.4} />
    ) : (
      <Svg width={18} height={18} viewBox="0 0 24 24">
        <Path d="M9 6h11M9 12h11M9 18h11" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" />
        <Circle cx={4.5} cy={6} r={1.6} fill={stroke} />
        <Circle cx={4.5} cy={12} r={1.6} fill={stroke} />
        <Circle cx={4.5} cy={18} r={1.6} fill={stroke} />
      </Svg>
    );
  };
  return (
    <View style={[styles.segment, { borderColor: c.line, backgroundColor: c.card }]} accessibilityRole="radiogroup" accessibilityLabel="Layout">
      {(['grid', 'list', 'light'] as const).map((v) => {
        const on = value === v;
        return (
          <Pressable
            key={v}
            accessibilityRole="radio"
            accessibilityLabel={v === 'light' ? 'Light by room' : `${VIEW_LABEL[v]} view`}
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (on) return;
              haptics.tap();
              onChange(v);
            }}
            style={[styles.segBtn, on && { backgroundColor: c.lavender }]}
          >
            {icon(v, on)}
            <Text style={[styles.segText, { color: on ? textOn(c.lavender, c) : c.inkMuted }]}>{VIEW_LABEL[v]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export interface JungleChip {
  key: string;
  label: string;
  count: number;
}

/** One-line, sideways-scrolling filter chips. `bleed` lets the row run edge to edge past the page padding. */
export function JungleChips({ chips, value, onChange, bleed = 0 }: { chips: JungleChip[]; value: string; onChange: (key: string) => void; bleed?: number }) {
  const c = useColors();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -bleed, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: bleed, gap: 8 }}>
      {chips.map((chip) => {
        const on = chip.key === value;
        const fill = on ? c.ink : c.card;
        const ink = on ? c.bg : c.ink;
        return (
          <Pressable
            key={chip.key}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`${chip.label}, ${chip.count} ${chip.count === 1 ? 'plant' : 'plants'}`}
            onPress={() => {
              haptics.tap();
              onChange(on && chip.key !== 'all' ? 'all' : chip.key);
            }}
            style={({ pressed }) => [styles.chip, { backgroundColor: fill, borderColor: c.line }, pressed && { transform: [{ translateY: 1 }] }]}
          >
            <Text style={[styles.chipText, { color: ink }]} numberOfLines={1}>
              {chip.label}
            </Text>
            <Text style={[styles.chipCount, { color: ink, opacity: on ? 0.8 : 0.6 }]}>{chip.count}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 2, borderRadius: 16, paddingLeft: 12, paddingRight: 8, height: 44 },
  input: { flex: 1, minWidth: 0, fontFamily: fonts.bodyHeavy, fontSize: 15, height: 40, paddingVertical: 0, outlineWidth: 0 },
  clear: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', borderWidth: 2, borderRadius: 16, padding: 2, height: 44, gap: 2 },
  segBtn: { flex: 1, flexDirection: 'row', gap: 6, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segText: { fontFamily: fonts.bodyHeavy, fontSize: 15 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderRadius: 17, height: 36, paddingHorizontal: 12 },
  chipText: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  chipCount: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
});
