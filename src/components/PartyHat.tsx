import Svg, { Circle, Path } from 'react-native-svg';
import { useColors } from '../theme/theme';

/** The supporter's party hat, perched on a buddy tile like a sticker. */
export function PartyHat({ size = 30 }: { size?: number }) {
  const c = useColors();
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M16 3 26 27H6z" fill={c.grape} stroke={c.line} strokeWidth={2} strokeLinejoin="round" />
      <Path d="M11.2 15.5 20.6 14M8.6 21.6 23.3 20.4" stroke={c.sun} strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M5 27.5c3.5 1.6 18.5 1.6 22 0" stroke={c.line} strokeWidth={2} strokeLinecap="round" fill="none" />
      <Circle cx={16} cy={3.5} r={3} fill={c.bubblegum} stroke={c.line} strokeWidth={1.8} />
    </Svg>
  );
}
