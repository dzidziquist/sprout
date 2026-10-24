import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useColors } from '../theme/theme';
import { useReducedTransparency } from '../hooks/useReducedTransparency';

const liquidGlass = Platform.OS === 'ios' && isLiquidGlassAvailable();

/**
 * Round toolbar button. On iOS 26+ it is real Liquid Glass (which follows Reduce Transparency itself);
 * elsewhere a frosted translucent stand-in so the layout matches, solid with Reduce Transparency on.
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
  const c = useColors();
  const solid = useReducedTransparency();
  const frosted = solid
    ? { backgroundColor: c.card, borderColor: c.line, boxShadow: 'none' }
    : c.scheme === 'dark'
    ? { backgroundColor: 'rgba(40,38,62,0.8)', borderColor: 'rgba(255,255,255,0.14)', boxShadow: '0px 6px 18px rgba(0,0,0,0.4)' }
    : { backgroundColor: 'rgba(255,255,255,0.75)', borderColor: 'rgba(27,27,47,0.08)', boxShadow: '0px 6px 18px rgba(27,27,47,0.12)' };
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress} hitSlop={6} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
      {liquidGlass ? (
        <GlassView glassEffectStyle="regular" isInteractive style={[styles.base, style]}>
          {children}
        </GlassView>
      ) : (
        <View style={[styles.base, styles.fallback, frosted, style]}>{children}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { minWidth: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 12 },
  fallback: { borderWidth: 1 },
});

