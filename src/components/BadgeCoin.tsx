import { useId } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { mixHex } from '@/data/badgeRims';
import { fonts, type } from '@/theme/tokens';

/**
 * The coin's rim seen side-on: a band in the badge's rim colour, lit from the middle like polished metal,
 * with fine milled ridges. The badge screen turns it with the faces so a spin shows the coin's thickness.
 */
export function CoinEdge({ rim, thickness, height }: { rim: string; thickness: number; height: number }) {
  const ridges = Math.floor(height / 7);
  // Gradient ids are document-wide on web, so each coin gets its own.
  const id = `edge${useId().replace(/:/g, '')}`;
  return (
    <Svg width={thickness} height={height}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={mixHex(rim, '#000000', 0.45)} />
          <Stop offset="0.45" stopColor={mixHex(rim, '#FFFFFF', 0.35)} />
          <Stop offset="0.6" stopColor={rim} />
          <Stop offset="1" stopColor={mixHex(rim, '#000000', 0.5)} />
        </LinearGradient>
      </Defs>
      <Rect x={0} y={0} width={thickness} height={height} rx={thickness / 2} fill={`url(#${id})`} />
      {Array.from({ length: ridges }, (_, i) => (
        <Rect key={i} x={1} y={4 + i * 7} width={thickness - 2} height={1.4} fill={mixHex(rim, '#000000', 0.3)} opacity={0.35} />
      ))}
    </Svg>
  );
}

/** The back of the coin: an enamel rim around a soft field, with what the badge says on its back. */
export function CoinBack({ rim, size, kicker, text, locked }: { rim: string; size: number; kicker: string; text: string; locked: boolean }) {
  const r = size / 2;
  const field = locked ? '#ECEEF1' : mixHex(rim, '#FFFFFF', 0.82);
  const ink = locked ? '#55556B' : mixHex(rim, '#1B1B2F', 0.78);
  const uid = useId().replace(/:/g, '');
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Defs>
          <LinearGradient id={`ring${uid}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={mixHex(rim, '#FFFFFF', 0.45)} />
            <Stop offset="0.5" stopColor={rim} />
            <Stop offset="1" stopColor={mixHex(rim, '#000000', 0.4)} />
          </LinearGradient>
          <LinearGradient id={`field${uid}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={mixHex(field, '#FFFFFF', 0.5)} />
            <Stop offset="1" stopColor={field} />
          </LinearGradient>
        </Defs>
        <Circle cx={r} cy={r} r={r - 1} fill={`url(#ring${uid})`} />
        <Circle cx={r} cy={r} r={r - 15} fill={mixHex(rim, '#000000', 0.35)} />
        <Circle cx={r} cy={r} r={r - 17} fill={`url(#field${uid})`} />
      </Svg>
      <View style={{ width: size - 70, alignItems: 'center', gap: 6 }}>
        <Text style={{ fontFamily: fonts.bodyHeavy, ...type.footnote, letterSpacing: 0.6, textTransform: 'uppercase', color: ink }}>{kicker}</Text>
        <Text style={{ fontFamily: fonts.display, ...type.title3, textAlign: 'center', color: ink }}>{text}</Text>
      </View>
    </View>
  );
}
