import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { colors } from '../theme/tokens';

const liquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

/**
 * Round toolbar button. On iOS 26+ it is real Liquid Glass; elsewhere a frosted
 * translucent stand-in so the layout matches.
 */
export function GlassButton({
  onPress,
  accessibilityLabel,
  children,
  style,
}: {
  onPress: () => void;
  accessibilityLabel: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} hitSlop={6} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
      {liquidGlass ? (
        <GlassView glassEffectStyle="regular" isInteractive style={[styles.base, style]}>
          {children}
        </GlassView>
      ) : (
        <View style={[styles.base, styles.fallback, style]}>{children}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minWidth: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 12 },
  fallback: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: 'rgba(27,27,47,0.08)',
    boxShadow: `0px 6px 18px rgba(27,27,47,0.12)`,
  },
});

export const glassInk = colors.ink;
