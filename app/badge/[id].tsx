import { useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { PanGestureHandler, State, type PanGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useBadges } from '@/hooks/useBadges';
import { BADGE_ART } from '@/data/art';
import { BADGE_RIMS, COIN_FILL } from '@/data/badgeRims';
import { CoinBack, CoinEdge } from '@/components/BadgeCoin';
import { BADGE_ICON, badgeFill } from '@/components/BadgeSticker';
import { GlassButton } from '@/components/GlassButton';
import { Button } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { fonts, type, space } from '@/theme/tokens';
import { textOn, useColors } from '@/theme/theme';
import { Glyph } from '@/components/Glyph';

const SIZE = 220;
/** Degrees of turn per pixel dragged. */
const TURN = 0.9;
/** The coin's diameter on screen and its thickness, so a spin shows a solid edge rather than a paper-thin line. */
const COIN = Math.round(SIZE * COIN_FILL);
const THICK = 16;

/** One milestone up close. Drag or flick it sideways to spin it; the back shows when it was earned. */
export default function BadgeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { badges } = useBadges();
  const reduced = useReducedMotion();
  const badge = badges.find((b) => b.id === id);
  // One value, in pixels of drag, drives the spin. While a finger is down it follows translationX on the
  // native driver (the resting spin sits in the value's offset), so dragging never waits on JavaScript,
  // and letting go folds the two together natively in one step: no frame where the badge jumps.
  const x = useRef(new Animated.Value(0)).current;
  const angle = useRef(Animated.multiply(x, TURN)).current;
  const onDrag = useRef(Animated.event([{ nativeEvent: { translationX: x } }], { useNativeDriver: true })).current;
  const FULL = 360 / TURN;

  /** Spin to `to` (pixels), carrying the finger's speed in. */
  const spinTo = (to: number, velocity = 0) => {
    Animated.spring(x, { toValue: to, velocity, stiffness: 70, damping: 13, mass: 1, useNativeDriver: true }).start();
  };

  const onState = ({ nativeEvent: e }: PanGestureHandlerStateChangeEvent) => {
    if (e.state === State.BEGAN) {
      // Catch it mid-spin where it is, and make the live drag start from there.
      x.stopAnimation();
      x.extractOffset();
      return;
    }
    if (e.state !== State.END && e.state !== State.CANCELLED && e.state !== State.FAILED) return;
    // Fold the drag into the value natively, then read back exactly where it is (the native value
    // arrives asynchronously, so everything after waits for it).
    x.flattenOffset();
    const { translationX, velocityX } = e;
    x.stopAnimation((now) => release(now, translationX, velocityX));
  };

  const release = (now: number, dx: number, vx: number) => {
    // Reduce Motion: no twirls or coasting. A tap turns it straight to the other side; a let-go settles
    // on the nearest side without a spring. Dragging still follows the finger.
    if (reduced) {
      const half = FULL / 2;
      const side = Math.round(now / half);
      if (Math.abs(dx) < 4 && Math.abs(vx) < 100) haptics.tap();
      x.setValue((Math.abs(dx) < 4 && Math.abs(vx) < 100 ? side + 1 : side) * half);
      return;
    }
    if (Math.abs(dx) < 4 && Math.abs(vx) < 100) {
      // A tap: one full twirl. No momentum went in, so it settles without overshoot (only flicks bounce).
      haptics.tap();
      Animated.spring(x, { toValue: Math.round(now / FULL) * FULL + FULL, stiffness: 160, damping: 25, mass: 1, useNativeDriver: true }).start();
      return;
    }
    if (Math.abs(vx) > 300) haptics.tap();
    // A flick coasts on to the next face-forward turn in the direction it was spun (never swinging back
    // against it); a slow let-go settles on whichever front is nearest. Spring velocity is per second.
    const coast = now + vx * 0.35;
    const turns = Math.abs(vx) < 300 ? Math.round(now / FULL) : vx > 0 ? Math.ceil(coast / FULL) : Math.floor(coast / FULL);
    spinTo(turns * FULL, vx);
  };

  const close = () => (router.canGoBack() ? router.back() : router.replace('/me'));
  // An old or unknown link: this modal can't be swiped away, so always leave a way out.
  if (!badge)
    return (
      <View style={[styles.missing, { backgroundColor: c.bg }]}>
        <Text style={[styles.missingText, { color: c.ink }]}>This badge isn’t here.</Text>
        <Button title="Back" bg={c.leaf} onPress={close} />
      </View>
    );
  const earned = !!badge.earnedAt;
  const art = BADGE_ART[badge.art === undefined ? badge.id : (badge.art ?? '')];
  const fill = earned ? (badgeFill(c)[badge.id] ?? c.sun) : c.cloud;
  const lv = badge.levels;
  const date = earned ? new Date(badge.earnedAt!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
  const front = angle.interpolate({ inputRange: [-36000, 36000], outputRange: ['-36000deg', '36000deg'] });
  const back = angle.interpolate({ inputRange: [-36000, 36000], outputRange: ['-35820deg', '36180deg'] });
  const edge = angle.interpolate({ inputRange: [-36000, 36000], outputRange: ['-35910deg', '36090deg'] });
  const artKey = badge.art === undefined ? badge.id : (badge.art ?? '');
  const rim = BADGE_RIMS[artKey]?.[earned ? 'earned' : 'locked'];

  return (
    <View style={[styles.page, { backgroundColor: c.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.toolbar}>
        <GlassButton accessibilityLabel="Close" onPress={close}>
          <Glyph name="close" size={16} color={c.ink} width={2.8} />
        </GlassButton>
      </View>

      <PanGestureHandler minDist={0} onGestureEvent={onDrag} onHandlerStateChange={onState}>
        <Animated.View style={styles.stage} accessible accessibilityRole="adjustable" accessibilityLabel={`${badge.title}. Swipe to spin.`}>
          {art && rim && (
            // The rim, drawn first so the faces cover it except when the coin is side-on.
            <Animated.View style={{ position: 'absolute', transform: [{ perspective: 900 }, { rotateY: edge }] }}>
              <CoinEdge rim={rim} thickness={THICK} height={COIN - 6} />
            </Animated.View>
          )}
          <Animated.View style={[styles.face, { transform: [{ perspective: 900 }, { rotateY: front }] }]}>
            {art ? (
              <Image source={earned ? art.earned : art.locked} style={{ width: SIZE, height: SIZE }} resizeMode="contain" />
            ) : (
              <View style={[styles.disc, { backgroundColor: fill, borderColor: earned ? c.line : c.inkMuted }, !earned && { borderStyle: 'dashed', opacity: 0.6 }]}>
                <Svg width={96} height={96} viewBox="0 0 24 24">
                  <Path d={BADGE_ICON[badge.id] ?? ''} stroke={earned ? textOn(fill, c) : c.inkMuted} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </Svg>
              </View>
            )}
          </Animated.View>
          <Animated.View style={[styles.face, styles.backFace, { transform: [{ perspective: 900 }, { rotateY: back }] }]}>
            {art && rim ? (
              <CoinBack
                rim={rim}
                size={COIN}
                locked={!earned}
                kicker={earned ? (lv && lv.tiers.length > 1 ? `Level ${lv.level}` : 'Earned') : 'Still to earn'}
                text={earned ? date : badge.hint}
              />
            ) : (
              <View style={[styles.disc, { backgroundColor: earned ? fill : c.cloud, borderColor: c.line }]}>
                <Text style={[styles.backKicker, { color: earned ? textOn(fill, c) : c.inkMuted }]}>{earned ? (lv && lv.tiers.length > 1 ? `Level ${lv.level}` : 'Earned') : 'Still to earn'}</Text>
                <Text style={[styles.backText, { color: earned ? textOn(fill, c) : c.ink }]}>{earned ? date : badge.hint}</Text>
              </View>
            )}
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>

      <View style={{ gap: 6, alignItems: 'center' }}>
        <Text style={[styles.title, { color: c.ink }]}>{badge.title}</Text>
        <Text style={[styles.sub, { color: c.inkMuted }]}>{earned ? `Earned ${date}` : badge.hint}</Text>
        {lv && lv.tiers.length > 1 && earned && (
          <View style={{ alignSelf: 'stretch', gap: 6, marginTop: 10 }}>
            <View style={styles.levelRow}>
              {lv.tiers.map((t, i) => (
                <View key={t} style={[styles.pip, { borderColor: c.line, backgroundColor: i < lv.level ? c.sun : c.card }]}>
                  <Text style={[styles.pipText, { color: i < lv.level ? c.onBright : c.inkMuted }]}>{t}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.sub, { color: c.ink }]}>
              {lv.next ? `Level ${lv.level} of ${lv.tiers.length} · ${lv.next - lv.count} more ${lv.unit} to level ${lv.level + 1}` : `Every level done · ${lv.count} ${lv.unit}`}
            </Text>
            {lv.level > 1 && lv.levelAt && (
              <Text style={[styles.hint, { color: c.inkMuted, marginTop: 0 }]}>
                Level {lv.level} reached {new Date(lv.levelAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </Text>
            )}
          </View>
        )}
        <Text style={[styles.hint, { color: c.inkMuted }]}>Swipe to spin it · tap for a twirl</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 },
  missingText: { fontFamily: fonts.displaySemi, ...type.headline },
  page: { flex: 1, paddingHorizontal: space.xl, gap: space.xl },
  toolbar: { flexDirection: 'row' },
  stage: { height: SIZE + 40, alignItems: 'center', justifyContent: 'center' },
  face: { position: 'absolute', width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden' },
  backFace: {},
  disc: { width: SIZE - 30, height: SIZE - 30, borderRadius: (SIZE - 30) / 2, borderWidth: 3, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
  backKicker: { fontFamily: fonts.bodyHeavy, ...type.footnote, letterSpacing: 0.6, textTransform: 'uppercase' },
  backText: { fontFamily: fonts.display, ...type.title3, textAlign: 'center' },
  levelRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  pip: { minWidth: 44, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  pipText: { fontFamily: fonts.bodyHeavy, ...type.footnote },
  title: { fontFamily: fonts.display, ...type.title2, textAlign: 'center' },
  sub: { fontFamily: fonts.bodyHeavy, ...type.body, textAlign: 'center' },
  hint: { fontFamily: fonts.bodyHeavy, ...type.caption, textAlign: 'center', marginTop: 6 },
});
