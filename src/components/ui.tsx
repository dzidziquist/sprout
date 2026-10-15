import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { fonts, radius } from '../theme/tokens';
import { textOn, useColors } from '../theme/theme';

/** Card with the PlantFam "sticker" look: outline plus a hard drop shadow straight down. `bg` defaults to the theme's card colour. */
export function Sticker({ style, children, drop = 4, bg }: { style?: StyleProp<ViewStyle>; children: React.ReactNode; drop?: number; bg?: string }) {
  const c = useColors();
  return <View style={[styles.sticker, { borderColor: c.line, backgroundColor: bg ?? c.card, boxShadow: `0px ${drop}px 0px ${c.drop}` }, style]}>{children}</View>;
}

export function Title({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const c = useColors();
  return (
    <Text accessibilityRole="header" style={[styles.title, { color: c.ink }, style]}>
      {children}
    </Text>
  );
}

export function Label({ children, style, muted }: { children: React.ReactNode; style?: StyleProp<TextStyle>; muted?: boolean }) {
  const c = useColors();
  return <Text style={[styles.label, { color: muted ? c.inkMuted : c.ink }, style]}>{children}</Text>;
}

export function Chip({ children, bg, style }: { children: React.ReactNode; bg?: string; style?: StyleProp<ViewStyle> }) {
  const c = useColors();
  const fill = bg ?? c.card;
  return (
    <View style={[styles.chip, { borderColor: c.line, backgroundColor: fill }, style]}>
      <Text style={[styles.chipText, { color: textOn(fill, c) }]}>{children}</Text>
    </View>
  );
}

/** `bg` defaults to leaf green. Text colour adapts: dark on bright fills, theme ink on tints and cards. */
export function Button({
  title,
  bg,
  raised = false,
  style,
  textStyle,
  ...rest
}: PressableProps & { title: string; bg?: string; raised?: boolean; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  const c = useColors();
  const fill = bg ?? c.leaf;
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: fill, borderColor: c.line },
        raised && { boxShadow: `0px ${pressed ? 1 : 4}px 0px ${c.drop}` },
        pressed && { transform: [{ translateY: raised ? 3 : 1 }] },
        style,
      ]}
      {...rest}
    >
      <Text style={[styles.buttonText, { color: textOn(fill, c) }, textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sticker: { borderWidth: 2, borderRadius: radius.card },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34 },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  chip: { borderWidth: 2, height: 32, paddingHorizontal: 12, borderRadius: 16, justifyContent: 'center', alignSelf: 'flex-start' },
  chipText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  button: { borderWidth: 2, minHeight: 44, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  buttonText: { fontFamily: fonts.displaySemi, fontSize: 15 },
});
