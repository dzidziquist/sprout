import { Animated, Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { mixHex } from '@/data/badgeRims';
import { fonts, type } from '@/theme/tokens';

const GLINT = require('../../assets/art/coin-glint.png');

/** How many rim-coloured discs stand in for the coin's thickness. */
const SLICES = 11;

/**
 * cos and sin of the spin, sampled every 5° so native interpolation follows the curve closely. Inputs are
 * the angle wrapped to 0–360.
 */
const STEPS = Array.from({ length: 73 }, (_, i) => i * 5);
const COS = STEPS.map((d) => Math.cos((d * Math.PI) / 180));
const SIN = STEPS.map((d) => Math.sin((d * Math.PI) / 180));

/**
 * A badge as a solid coin you can spin, drawn with plain 2D layers so iOS keeps them in order and never
 * has to redraw anything while it turns (the earlier 3D version let the rim show through the face, and
 * redrew its vector layers every frame).
 *
 * Each face is squashed sideways by cos(angle). The thickness is a stack of thin rim-coloured discs,
 * slid apart by sin(angle), so side-on they read as a milled edge and at an angle as the rim's sliver.
 * The face that's towards you is drawn last, so nothing ever crosses it. A glint slides across the metal
 * and the face dims as it turns away, like the Apple Watch award medals; both are skipped with Reduce Motion.
 */
export function BadgeCoin({
  angle,
  art,
  size,
  coin,
  thickness,
  rim,
  back,
  reduced,
}: {
  /** The spin in degrees, any number. */
  angle: Animated.Animated;
  art: ImageSourcePropType;
  /** The art's box (the PNG has a little transparent margin around the coin). */
  size: number;
  /** The coin's diameter on screen. */
  coin: number;
  thickness: number;
  rim: string;
  back: { kicker: string; text: string; locked: boolean };
  reduced: boolean;
}) {
  const a = Animated.modulo(angle, 360);
  const sin = a.interpolate({ inputRange: STEPS, outputRange: SIN });
  // Never quite zero wide, so a side-on coin still shows its edge.
  const squash = a.interpolate({ inputRange: STEPS, outputRange: COS.map((v) => Math.max(Math.abs(v), 0.022)) });
  const frontOn = a.interpolate({ inputRange: [0, 89.99, 90, 270, 270.01, 360], outputRange: [1, 1, 0, 0, 1, 1] });
  const backOn = Animated.subtract(1, frontOn);
  const half = thickness / 2;

  // Glint and shade, per face: the glint rests at the upper left facing you and sweeps across as it turns.
  const light = (offset: number) => {
    const t = Animated.modulo(Animated.add(angle, offset), 360);
    return {
      slide: t.interpolate({ inputRange: [0, 90, 270, 360], outputRange: [-0.42 * coin, 1.1 * coin, -1.1 * coin, -0.42 * coin] }),
      dim: t.interpolate({ inputRange: [0, 30, 90, 270, 330, 360], outputRange: [0, 0.1, 0.5, 0.5, 0.1, 0] }),
    };
  };
  const lf = light(0);
  const lb = light(180);

  const shade = (i: number) => {
    // Darker at the two outer slices, brightest just past the middle, like polished metal.
    const t = i / (SLICES - 1);
    const lift = 1 - Math.abs(t - 0.45) * 2;
    return lift > 0.5 ? mixHex(rim, '#FFFFFF', (lift - 0.5) * 0.6) : mixHex(rim, '#000000', (0.5 - lift) * 0.8);
  };

  const field = back.locked ? '#ECEEF1' : mixHex(rim, '#FFFFFF', 0.82);
  const ink = back.locked ? '#55556B' : mixHex(rim, '#1B1B2F', 0.78);
  const glint = (l: { slide: Animated.AnimatedInterpolation<number>; dim: Animated.AnimatedInterpolation<number> }) =>
    reduced ? null : (
      <View pointerEvents="none" style={[styles.clip, { width: coin, height: coin, borderRadius: coin / 2 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: l.dim }]} />
        <Animated.Image source={GLINT} style={{ position: 'absolute', top: -coin * 0.25, width: coin, height: coin * 1.5, transform: [{ translateX: l.slide }, { rotate: '18deg' }] }} />
      </View>
    );

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: SLICES }, (_, i) => {
        const k = -half + (thickness * i) / (SLICES - 1);
        return (
          <Animated.View
            key={i}
            style={[
              styles.slice,
              { width: coin - 2, height: coin - 2, borderRadius: coin / 2, backgroundColor: shade(i) },
              { transform: [{ translateX: Animated.multiply(sin, k) }, { scaleX: squash }] },
            ]}
          />
        );
      })}

      {/* The back, at the far side of the stack (it faces you between 90° and 270°). */}
      <Animated.View style={[styles.face, { opacity: backOn, transform: [{ translateX: Animated.multiply(sin, -half) }, { scaleX: squash }] }]}>
        <View style={{ width: coin, height: coin, borderRadius: coin / 2, backgroundColor: rim, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: mixHex(rim, '#000000', 0.35) }}>
          <View style={{ position: 'absolute', top: 6, left: 10, width: coin * 0.55, height: coin * 0.3, borderRadius: coin, backgroundColor: '#FFFFFF', opacity: 0.18, transform: [{ rotate: '-30deg' }] }} />
          <View style={{ width: coin - 32, height: coin - 32, borderRadius: coin, backgroundColor: field, borderWidth: 2, borderColor: mixHex(rim, '#000000', 0.35), alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 18 }}>
            <Engraved style={{ fontFamily: fonts.bodyHeavy, ...type.footnote, letterSpacing: 0.6, textTransform: 'uppercase' }} ink={ink}>
              {back.kicker}
            </Engraved>
            <Engraved style={{ fontFamily: fonts.display, ...type.title3, textAlign: 'center' }} ink={ink}>
              {back.text}
            </Engraved>
          </View>
        </View>
        {glint(lb)}
      </Animated.View>

      {/* The front, at the near side of the stack. */}
      <Animated.View style={[styles.face, { opacity: frontOn, transform: [{ translateX: Animated.multiply(sin, half) }, { scaleX: squash }] }]}>
        <Image source={art} style={{ width: size, height: size }} resizeMode="contain" />
        {glint(lf)}
      </Animated.View>
    </View>
  );
}

/** Text pressed into the metal: a light edge below and a dark one above. */
function Engraved({ children, style, ink }: { children: string; style: object; ink: string }) {
  return <Text style={[style, { color: ink, textShadowColor: 'rgba(255,255,255,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0 }]}>{children}</Text>;
}

const styles = StyleSheet.create({
  slice: { position: 'absolute' },
  face: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  clip: { position: 'absolute', overflow: 'hidden' },
});
