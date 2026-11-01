import { Animated, Image, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { mixHex } from '@/data/badgeRims';
import { fonts, type } from '@/theme/tokens';

const GLINT = require('../../assets/art/coin-glint.png');

/** Same camera distance as the test page (CSS perspective 900px). */
const PERSPECTIVE = 900;

/**
 * A badge as a solid coin you can spin, built to match the badge-spin test page (claude.ai artifact
 * "PlantFam Badge Spin"): the faces turn in 3D with perspective, a milled rim shows when the coin is
 * side-on, a glint slides across the metal and the face dims as it turns away, and the back is an
 * enamel coin with engraved text.
 *
 * Two iPhone-specific choices keep it right and fast:
 * - iOS doesn't keep 3D layers in drawing order, so the rim band is only shown around side-on (the only
 *   time the test page shows it anyway) instead of being hidden behind the faces. Otherwise it drew
 *   across the face.
 * - Everything that moves is native views, gradients and a small PNG: no SVG, so nothing is redrawn
 *   while it turns.
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
  const deg = (offset: number) =>
    Animated.add(angle, offset).interpolate({ inputRange: [-36000, 36000], outputRange: ['-36000deg', '36000deg'] });
  const a = Animated.modulo(angle, 360);
  // The rim only shows around side-on, where the face is narrower than the rim is thick.
  const edgeOn = a.interpolate({ inputRange: [0, 80, 86, 94, 100, 260, 266, 274, 280, 360], outputRange: [0, 0, 1, 1, 0, 0, 1, 1, 0, 0] });

  // Glint and shade, per face (same numbers as the test page): the glint rests at the upper left
  // when the face is towards you and sweeps across as it turns.
  const glint = (offset: number) => {
    if (reduced) return null;
    const t = Animated.modulo(Animated.add(angle, offset), 360);
    const slide = t.interpolate({ inputRange: [0, 90, 270, 360], outputRange: [-0.42 * coin, 1.1 * coin, -1.1 * coin, -0.42 * coin] });
    const dim = t.interpolate({ inputRange: [0, 30, 90, 270, 330, 360], outputRange: [0, 0.1, 0.5, 0.5, 0.1, 0] });
    return (
      <View pointerEvents="none" style={[styles.clip, { width: coin, height: coin, borderRadius: coin / 2 }]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: dim }]} />
        <Animated.Image
          source={GLINT}
          style={{ position: 'absolute', top: -coin * 0.25, width: coin, height: coin * 1.5, transform: [{ translateX: slide }, { rotate: '18deg' }] }}
        />
      </View>
    );
  };

  const field = back.locked ? '#ECEEF1' : mixHex(rim, '#FFFFFF', 0.82);
  const ink = back.locked ? '#55556B' : mixHex(rim, '#1B1B2F', 0.78);
  const bevel = mixHex(rim, '#000000', 0.35);
  const edgeHeight = coin - 6;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {/* Front */}
      <Animated.View style={[styles.face, { width: size, height: size, transform: [{ perspective: PERSPECTIVE }, { rotateY: deg(0) }] }]}>
        <Image source={art} style={{ width: size, height: size }} resizeMode="contain" />
        {glint(0)}
      </Animated.View>

      {/* Back: an enamel ring with a soft field and the engraved date or hint. */}
      <Animated.View style={[styles.face, { width: size, height: size, transform: [{ perspective: PERSPECTIVE }, { rotateY: deg(180) }] }]}>
        <LinearGradient
          colors={[mixHex(rim, '#FFFFFF', 0.45), rim, mixHex(rim, '#000000', 0.4)]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: coin, height: coin, borderRadius: coin / 2, alignItems: 'center', justifyContent: 'center' }}
        >
          <View style={{ width: coin - 30, height: coin - 30, borderRadius: coin, backgroundColor: bevel, alignItems: 'center', justifyContent: 'center' }}>
            <LinearGradient
              colors={[mixHex(field, '#FFFFFF', 0.5), field]}
              style={{ width: coin - 34, height: coin - 34, borderRadius: coin, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 18 }}
            >
              <Engraved style={{ fontFamily: fonts.bodyHeavy, ...type.footnote, letterSpacing: 0.6, textTransform: 'uppercase' }} ink={ink}>
                {back.kicker}
              </Engraved>
              <Engraved style={{ fontFamily: fonts.display, ...type.title3, textAlign: 'center' }} ink={ink}>
                {back.text}
              </Engraved>
            </LinearGradient>
          </View>
        </LinearGradient>
        {glint(180)}
      </Animated.View>

      {/* The milled rim, drawn last and shown only side-on. */}
      <Animated.View style={{ position: 'absolute', opacity: edgeOn, transform: [{ perspective: PERSPECTIVE }, { rotateY: deg(90) }] }}>
        <LinearGradient
          colors={[mixHex(rim, '#000000', 0.45), mixHex(rim, '#FFFFFF', 0.35), rim, mixHex(rim, '#000000', 0.5)]}
          locations={[0, 0.45, 0.6, 1]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ width: thickness, height: edgeHeight, borderRadius: thickness / 2, overflow: 'hidden' }}
        >
          {Array.from({ length: Math.floor(edgeHeight / 7) }, (_, i) => (
            <View key={i} style={{ position: 'absolute', top: 5.6 + i * 7, left: 0, right: 0, height: 1.4, backgroundColor: mixHex(rim, '#000000', 0.3), opacity: 0.35 }} />
          ))}
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

/** Text pressed into the metal, as on the test page: a light edge below and a dark one above. */
function Engraved({ children, style, ink }: { children: string; style: object; ink: string }) {
  return (
    <View>
      <Text style={[style, { color: 'rgba(0,0,0,0.25)', position: 'absolute', top: -1, left: 0, right: 0 }]} accessibilityElementsHidden importantForAccessibility="no">
        {children}
      </Text>
      <Text style={[style, { color: ink, textShadowColor: 'rgba(255,255,255,0.85)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 0 }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  face: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden' },
  clip: { position: 'absolute', overflow: 'hidden' },
});
