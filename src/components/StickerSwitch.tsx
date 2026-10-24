import { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import * as haptics from '@/lib/haptics';
import { fonts, type } from '@/theme/tokens';
import { textOn, useColors } from '@/theme/theme';

const W = 62;
const H = 34;
const KNOB = 24;
const TRAVEL = W - KNOB - 10;

/**
 * PlantFam's on/off switch: an outlined sticker track with the app's drop shadow, leaf green and "ON"
 * when on. Reads as a switch to VoiceOver. The knob slides, or jumps with Reduce Motion on.
 */
export function StickerSwitch({ value, onChange, label }: { value: boolean; onChange: (on: boolean) => void; label: string }) {
  const c = useColors();
  const reduced = useReducedMotion();
  const x = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    if (reduced) x.setValue(value ? 1 : 0);
    else Animated.timing(x, { toValue: value ? 1 : 0, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [value, reduced, x]);
  const fill = value ? c.leaf : c.cloud;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
      hitSlop={6}
      onPress={() => {
        haptics.tap();
        onChange(!value);
      }}
      style={({ pressed }) => [styles.track, { backgroundColor: fill, borderColor: c.line, boxShadow: `0px ${pressed ? 1 : 3}px 0px ${c.drop}` }, pressed && { transform: [{ translateY: 2 }] }]}
    >
      <Text style={[styles.word, value ? { left: 9, color: textOn(c.leaf, c) } : { right: 7, color: c.inkMuted }]} importantForAccessibility="no">
        {value ? 'ON' : 'OFF'}
      </Text>
      <Animated.View style={[styles.knob, { borderColor: c.line, transform: [{ translateX: x.interpolate({ inputRange: [0, 1], outputRange: [0, TRAVEL] }) }] }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: W, height: H, borderRadius: H / 2, borderWidth: 2, justifyContent: 'center' },
  word: { position: 'absolute', fontFamily: fonts.bodyHeavy, ...type.caption2 },
  knob: { position: 'absolute', left: 3, width: KNOB, height: KNOB, borderRadius: KNOB / 2, borderWidth: 2, backgroundColor: '#FFFFFF' },
});
