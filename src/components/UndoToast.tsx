import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { fonts, type } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { useIsFocused } from '@react-navigation/native';
import { useUndoBar } from '@/lib/undo';
import * as haptics from '@/lib/haptics';

const SHOW_MS = 6000;
// VoiceOver users need time to hear the message and find Undo.
const SHOW_MS_SCREEN_READER = 12000;

/**
 * A short-lived bar along the bottom with what just happened and an Undo button, like Mail's after a
 * delete. Rises on a critically damped spring (fades only with Reduce Motion), reads itself out to
 * VoiceOver, and calls `onDone` when its time is up. Give it a new `id` for each new message.
 */
export function UndoToast({ id, text, bottom, onUndo, onDone }: { id: string; text: string; bottom: number; onUndo: () => void; onDone: () => void }) {
  const c = useColors();
  const reduced = useReducedMotion();
  const shown = useRef(new Animated.Value(0)).current;
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    shown.setValue(0);
    if (reduced) Animated.timing(shown, { toValue: 1, duration: 150, useNativeDriver: true }).start();
    else Animated.spring(shown, { toValue: 1, stiffness: 440, damping: 42, mass: 1, useNativeDriver: true }).start();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let live = true;
    const start = (ms: number) => live && (timer = setTimeout(() => done.current(), ms));
    if (Platform.OS === 'web') start(SHOW_MS);
    else {
      AccessibilityInfo.announceForAccessibility(`${text} Undo available.`);
      AccessibilityInfo.isScreenReaderEnabled()
        .then((on) => start(on ? SHOW_MS_SCREEN_READER : SHOW_MS))
        .catch(() => start(SHOW_MS));
    }
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [id, text, reduced, shown]);

  const lift = shown.interpolate({ inputRange: [0, 1], outputRange: [reduced ? 0 : 24, 0] });
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[styles.wrap, { bottom, opacity: shown, transform: [{ translateY: lift }] }]}
    >
      <Animated.View style={[styles.bar, { backgroundColor: c.ink, borderColor: c.line, boxShadow: `0px 4px 0px ${c.drop}` }]}>
        <Text style={[styles.text, { color: c.bg }]} numberOfLines={3}>
          {text}
        </Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Undo" hitSlop={8} onPress={onUndo} style={({ pressed }) => [styles.undo, { borderColor: c.bg }, pressed && { opacity: 0.6 }]}>
          <Text style={[styles.undoText, { color: c.bg }]}>Undo</Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderRadius: 18, paddingVertical: 10, paddingLeft: 16, paddingRight: 10 },
  text: { flex: 1, fontFamily: fonts.bodyHeavy, ...type.footnote },
  undo: { minHeight: 40, minWidth: 64, borderWidth: 2, borderRadius: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  undoText: { fontFamily: fonts.display, ...type.body },
});

/** Shows the current Undo bar (see `showUndo`) on this screen, `bottom` points up from the screen's foot. */
export function UndoHost({ bottom }: { bottom: number }) {
  const current = useUndoBar((s) => s.current);
  const clear = useUndoBar((s) => s.clear);
  // Today and Jungle stay mounted behind each other and behind sheets: only the screen in front shows it.
  const focused = useIsFocused();
  if (!current || !focused) return null;
  return (
    <UndoToast
      id={current.key}
      text={current.text}
      bottom={bottom}
      onUndo={() => {
        haptics.tap();
        current.undo();
        clear(current.key);
      }}
      onDone={() => clear(current.key)}
    />
  );
}

