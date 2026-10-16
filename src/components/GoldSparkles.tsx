import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { PotColor } from '../types';

/** Deep gold for the outline of a gold card, so it reads as gold rather than yellow. */
export const GOLD_LINE = '#C8961E';

const STAR = 'M12 2l2.4 7.6L22 12l-7.6 2.4L12 22l-2.4-7.6L2 12l7.6-2.4z';

/** Style for a card tile: a gold outline when the plant has a gold card. */
export function goldFrame(pot: PotColor) {
  return pot === 'gold' ? { borderColor: GOLD_LINE, borderWidth: 3 } : null;
}

/** A few sparkles over a gold card's art tile (the milestone reward). Renders nothing for other colours. */
export function GoldSparkles({ pot, size = 1 }: { pot: PotColor; size?: number }) {
  if (pot !== 'gold') return null;
  const s = (n: number) => n * size;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {[
        { top: '7%', right: '7%', d: 22 },
        { top: '32%', right: '4%', d: 12 },
        { bottom: '10%', left: '6%', d: 16 },
      ].map(({ d, ...pos }, i) => (
        <Svg key={i} width={s(d)} height={s(d)} viewBox="0 0 24 24" style={[styles.star, pos as object]}>
          <Path d={STAR} fill="#FFF4C2" stroke={GOLD_LINE} strokeWidth={1.6} strokeLinejoin="round" />
        </Svg>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({ star: { position: 'absolute' } });
