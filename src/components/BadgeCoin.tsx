import { useId } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
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

/** Text pressed into the metal: a light edge below and a dark one above, like an engraving. */
function Engraved({ children, style, ink }: { children: string; style: object; ink: string }) {
  return (
    <View>
      <Text style={[style, { color: 'rgba(255,255,255,0.85)', position: 'absolute', top: 1, left: 0, right: 0 }]} accessibilityElementsHidden importantForAccessibility="no">
        {children}
      </Text>
      <Text style={[style, { color: ink, textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: -1 }, textShadowRadius: 0 }]}>{children}</Text>
    </View>
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
        <Engraved style={{ fontFamily: fonts.bodyHeavy, ...type.footnote, letterSpacing: 0.6, textTransform: 'uppercase' }} ink={ink}>{kicker}</Engraved>
        <Engraved style={{ fontFamily: fonts.display, ...type.title3, textAlign: 'center' }} ink={ink}>{text}</Engraved>
      </View>
    </View>
  );
}

/**
 * Light on the coin as it turns, in the spirit of the Apple Watch award medals: a glint that slides
 * across the metal, and the face dimming as it turns away. `turn` is this face's angle in degrees,
 * 0 when it faces you (any number; it's wrapped to a full turn). Purely visual, so it's hidden from
 * VoiceOver and never takes touches.
 */
export function CoinLight({ turn, size }: { turn: Animated.AnimatedInterpolation<number> | Animated.Animated; size: number }) {
  const id = `glint${useId().replace(/:/g, '')}`;
  const a = Animated.modulo(turn as Animated.Animated, 360);
  // Facing you the glint rests at the upper left; turning right sweeps it across, turning left back.
  const slide = a.interpolate({ inputRange: [0, 90, 270, 360], outputRange: [-0.42 * size, 1.1 * size, -1.1 * size, -0.42 * size] });
  const dim = a.interpolate({ inputRange: [0, 30, 90, 270, 330, 360], outputRange: [0, 0.1, 0.5, 0.5, 0.1, 0] });
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, overflow: 'hidden' }}>
      <Animated.View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#000', opacity: dim }} />
      <Animated.View style={{ position: 'absolute', top: -size * 0.25, left: 0, width: size, height: size * 1.5, transform: [{ translateX: slide }, { rotate: '18deg' }] }}>
        <Svg width={size} height={size * 1.5}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0.25" stopColor="#FFFFFF" stopOpacity={0} />
              <Stop offset="0.46" stopColor="#FFFFFF" stopOpacity={0.5} />
              <Stop offset="0.5" stopColor="#FFFFFF" stopOpacity={0.85} />
              <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity={0.35} />
              <Stop offset="0.75" stopColor="#FFFFFF" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={size} height={size * 1.5} fill={`url(#${id})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}
