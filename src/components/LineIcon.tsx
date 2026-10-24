import Svg, { Circle, Path, Rect } from 'react-native-svg';

/** PlantFam's line icons (from the icon set in the design files), drawn at any size and colour. */
export type LineIconName = 'window' | 'no-window' | 'help' | 'compass' | 'info' | 'arrow-right' | 'chevron-right' | 'bulb' | 'drop';

export function LineIcon({ name, color, size = 20, width = 2 }: { name: LineIconName; color: string; size?: number; width?: number }) {
  const p = { stroke: color, strokeWidth: width, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'window' && (
        <>
          <Rect x={4} y={3} width={16} height={18} rx={2} {...p} />
          <Path d="M12 3v18M4 12h16" {...p} />
        </>
      )}
      {name === 'no-window' && (
        <>
          <Rect x={4} y={3} width={16} height={18} rx={2} {...p} />
          <Path d="M12 3v18M4 12h16M2 22 22 2" {...p} />
        </>
      )}
      {name === 'help' && (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M9 9a3 3 0 1 1 5 2.2c-1 .6-2 .9-2 2.3M12 17h.01" {...p} />
        </>
      )}
      {name === 'compass' && (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="m16 8-2 6-6 2 2-6Z" {...p} />
        </>
      )}
      {name === 'info' && (
        <>
          <Circle cx={12} cy={12} r={9} {...p} />
          <Path d="M12 11v6M12 7h.01" {...p} />
        </>
      )}
      {name === 'arrow-right' && <Path d="M4 12h16m-6-6 6 6-6 6" {...p} />}
      {name === 'bulb' && <Path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3Z" {...p} />}
      {name === 'drop' && <Path d="M12 3s6 6.4 6 11a6 6 0 0 1-12 0c0-4.6 6-11 6-11Z" {...p} />}
      {name === 'chevron-right' && <Path d="m9 5 7 7-7 7" {...p} />}
    </Svg>
  );
}

/** A small filled triangle pointing north, east, south or west (the direction buttons). */
export function DirectionArrow({ to, color, size = 14 }: { to: 'N' | 'E' | 'S' | 'W'; color: string; size?: number }) {
  const rotate = { N: 0, E: 90, S: 180, W: 270 }[to];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={{ transform: [{ rotate: `${rotate}deg` }] }}>
      <Path d="M12 3 22 21H2Z" fill={color} />
    </Svg>
  );
}
