import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { useColors } from '../theme/theme';

const FADE = 44;

/**
 * Edge cue for a sideways-scrolling family tree: a fade into the page background plus a round arrow button
 * that scrolls one screen towards the hidden nodes. Only shown while something is actually hidden on that side.
 */
export function TreeScrollCue({ side, visible, onPress }: { side: 'left' | 'right'; visible: boolean; onPress: () => void }) {
  const c = useColors();
  if (!visible) return null;
  const left = side === 'left';
  const id = `fade-${side}-${c.scheme}`;
  return (
    <View pointerEvents="box-none" style={[styles.edge, left ? { left: 0 } : { right: 0 }]}>
      <Svg width={FADE} height="100%" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <LinearGradient id={id} x1={left ? '0' : '1'} y1="0" x2={left ? '1' : '0'} y2="0">
            <Stop offset="0" stopColor={c.bg} stopOpacity={1} />
            <Stop offset="0.45" stopColor={c.bg} stopOpacity={0.85} />
            <Stop offset="1" stopColor={c.bg} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={FADE} height="100%" fill={`url(#${id})`} />
      </Svg>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={left ? 'Scroll the family tree left' : 'Scroll the family tree right'}
        hitSlop={8}
        onPress={onPress}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: c.card, borderColor: c.line, boxShadow: `0px ${pressed ? 1 : 3}px 0px ${c.drop}` },
          left ? { left: 6 } : { right: 6 },
          pressed && { transform: [{ translateY: 2 }] },
        ]}
      >
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <Path d={left ? 'm15 6-6 6 6 6' : 'm9 6 6 6-6 6'} stroke={c.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  edge: { position: 'absolute', top: 0, bottom: 0, width: FADE, justifyContent: 'center' },
  button: { position: 'absolute', top: 27, width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
