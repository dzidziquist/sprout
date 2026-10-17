import { createContext, useContext, useState } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as haptics from '@/lib/haptics';
import { fonts } from '@/theme/tokens';
import { textOn, useColors } from '@/theme/theme';

export type DropdownOption<T> = { id: T; label: string };

/** Which dropdown in the group is open; opening one closes the others. */
const Open = createContext<{ open: string | null; setOpen: (k: string | null) => void } | null>(null);

/** A card of dropdown rows, laid out like a Settings group. Only one row is open at a time. */
export function DropdownGroup({ children }: { children: React.ReactNode }) {
  const c = useColors();
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Open.Provider value={{ open, setOpen }}>
      <View style={[styles.group, { backgroundColor: c.card, borderColor: c.line }]}>{children}</View>
    </Open.Provider>
  );
}

/**
 * One question that opens into its answers in place. Shows the current answer on the right, or
 * `placeholder` when there's none.
 */
export function Dropdown<T extends string | null>({
  label,
  value,
  options,
  onChange,
  tint,
  placeholder = 'Pick one',
  last,
}: {
  label: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (v: T) => void;
  tint?: string;
  placeholder?: string;
  last?: boolean;
}) {
  const c = useColors();
  const group = useContext(Open);
  const [solo, setSolo] = useState(false);
  const isOpen = group ? group.open === label : solo;
  const fill = tint ?? c.mint;
  const current = options.find((o) => o.id === value);

  const toggle = (next: boolean) => {
    if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.create(180, 'easeInEaseOut', 'opacity'));
    if (group) group.setOpen(next ? label : null);
    else setSolo(next);
  };

  return (
    <View style={!last && { borderBottomWidth: 1.5, borderColor: c.cloud }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        accessibilityLabel={`${label} ${current?.label ?? placeholder}`}
        onPress={() => {
          haptics.tap();
          toggle(!isOpen);
        }}
        style={({ pressed }) => [styles.row, pressed && { backgroundColor: c.cloud }]}
      >
        <Text style={[styles.label, { color: c.ink }]}>{label}</Text>
        <Text style={[styles.value, { color: current ? c.ink : c.inkMuted }]} numberOfLines={1}>
          {current?.label ?? placeholder}
        </Text>
        <Svg width={16} height={16} viewBox="0 0 24 24" style={{ transform: [{ rotate: isOpen ? '180deg' : '0deg' }] }}>
          <Path d="m6 9 6 6 6-6" stroke={c.inkMuted} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </Pressable>
      {isOpen && (
        <View style={styles.list}>
          {options.map((o) => {
            const on = o.id === value;
            return (
              <Pressable
                key={String(o.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                onPress={() => {
                  haptics.tap();
                  onChange(o.id);
                  toggle(false);
                }}
                style={({ pressed }) => [styles.option, { backgroundColor: on ? fill : pressed ? c.cloud : 'transparent' }]}
              >
                <Text style={[styles.optionText, { color: on ? textOn(fill, c) : c.ink }]}>{o.label}</Text>
                {on && (
                  <Svg width={18} height={18} viewBox="0 0 24 24">
                    <Path d="m5 12.5 4.5 4.5L19 7.5" stroke={textOn(fill, c)} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                  </Svg>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { borderWidth: 2, borderRadius: 20, overflow: 'hidden' },
  row: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  label: { flex: 1, fontFamily: fonts.displaySemi, fontSize: 16 },
  value: { flexShrink: 1, maxWidth: '50%', fontFamily: fonts.bodyHeavy, fontSize: 15, textAlign: 'right' },
  list: { paddingHorizontal: 8, paddingBottom: 8, gap: 2 },
  option: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, borderRadius: 12 },
  optionText: { fontFamily: fonts.bodyHeavy, fontSize: 15 },
});
