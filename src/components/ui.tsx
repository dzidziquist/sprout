import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { colors, fonts, radius, sticker } from '../theme/tokens';

/** Card with the PlantFam "sticker" look: ink outline and a hard drop shadow straight down. */
export function Sticker({ style, children, drop = 4, bg = colors.white }: { style?: StyleProp<ViewStyle>; children: React.ReactNode; drop?: number; bg?: string }) {
  return <View style={[styles.sticker, { backgroundColor: bg, boxShadow: `0px ${drop}px 0px ${colors.ink}` }, style]}>{children}</View>;
}

export function Title({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Label({ children, style, muted }: { children: React.ReactNode; style?: StyleProp<TextStyle>; muted?: boolean }) {
  return <Text style={[styles.label, muted && { color: colors.inkMuted }, style]}>{children}</Text>;
}

export function Chip({ children, bg = colors.white, style }: { children: React.ReactNode; bg?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.chip, { backgroundColor: bg }, style]}>
      <Text style={styles.chipText}>{children}</Text>
    </View>
  );
}

export function Button({
  title,
  bg = colors.leaf,
  raised = false,
  style,
  textStyle,
  ...rest
}: PressableProps & { title: string; bg?: string; raised?: boolean; style?: StyleProp<ViewStyle>; textStyle?: StyleProp<TextStyle> }) {
  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg },
        raised && { boxShadow: `0px ${pressed ? 1 : 4}px 0px ${colors.ink}` },
        pressed && { transform: [{ translateY: raised ? 3 : 1 }] },
        style,
      ]}
      {...rest}
    >
      <Text style={[styles.buttonText, textStyle]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sticker: { ...sticker, borderRadius: radius.card },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34, color: colors.ink },
  label: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.ink },
  chip: { ...sticker, height: 32, paddingHorizontal: 12, borderRadius: 16, justifyContent: 'center', alignSelf: 'flex-start' },
  chipText: { fontFamily: fonts.bodyHeavy, fontSize: 12, color: colors.ink },
  button: { ...sticker, minHeight: 44, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  buttonText: { fontFamily: fonts.displaySemi, fontSize: 15, color: colors.ink },
});
