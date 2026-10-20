import Svg, { Circle, Path } from 'react-native-svg';

/** The light feature's sun: the Jungle's light view toggle and the plant page's light line. */
export function SunIcon({ color, size = 20, width = 2.2 }: { color: string; size?: number; width?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={4} stroke={color} strokeWidth={width} fill="none" />
      <Path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" stroke={color} strokeWidth={width} strokeLinecap="round" />
    </Svg>
  );
}
