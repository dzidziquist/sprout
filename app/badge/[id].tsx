import { useEffect, useRef } from 'react';
import { Animated, Image, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useBadges } from '@/hooks/useBadges';
import { BADGE_ART } from '@/data/art';
import { BADGE_RIMS, COIN_FILL } from '@/data/badgeRims';
import { BadgeCoin } from '@/components/BadgeCoin';
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
  // One value, in pixels of drag, drives the spin. A drag sets it to where the badge was headed plus the
  // finger's travel; letting go and tapping spring it on to a whole turn. Springs run on the native driver.
  const x = useRef(new Animated.Value(0)).current;
  const angle = useRef(Animated.multiply(x, TURN)).current;
  const FULL = 360 / TURN;

  /** Spin to `to` (pixels), carrying the finger's speed in. */
  const spinTo = (to: number, velocity = 0) => {
    rest.current = to;
    Animated.spring(x, { toValue: to, velocity, stiffness: 160, damping: 25, mass: 1, useNativeDriver: true }).start();
  };
  // Where the badge is headed (pixels), kept here rather than read back from the animated value: on
  // iPhone a native-driven value can report a stale number after a spin, and a tap then "twirled" to
  // where the badge already was, so nothing moved.
  const rest = useRef(0);
  const dragFrom = useRef(0);
  // Where the badge is right now, kept live while it moves, so a drag that interrupts a spin starts from
  // what's on screen instead of jumping to where the spin was headed.
  const live = useRef(0);
  useEffect(() => {
    const id = x.addListener(({ value }) => {
      live.current = value;
    });
    return () => x.removeListener(id);
  }, [x]);

  // A tap and a drag race (react-native-gesture-handler's own pattern for this): the drag wins once the
  // finger moves sideways, the tap wins when it lifts without moving. Earlier versions nested a tap
  // gesture around the pan, or a press inside it, and on iPhone the tap never got through.
  const gesture = Gesture.Race(
    Gesture.Pan()
      .activeOffsetX([-6, 6])
      .failOffsetY([-40, 40])
      .runOnJS(true)
      // Only once it really is a drag: catch the badge where it is on screen and follow the finger.
      .onStart(() => {
        x.stopAnimation();
        dragFrom.current = live.current;
      })
      .onUpdate((e) => x.setValue(dragFrom.current + e.translationX))
      .onEnd((e) => release(dragFrom.current + e.translationX, e.velocityX ?? 0)),
    Gesture.Tap()
      .maxDuration(400)
      .runOnJS(true)
      .onEnd((_e, success) => {
        if (success) twirl();
      }),
  );

  /** A tap: one full twirl to the next face-forward turn (Reduce Motion: straight to the other side). */
  const twirl = (dir: 1 | -1 = 1) => {
    haptics.tap();
    if (reduced) {
      const half = FULL / 2;
      rest.current = (Math.round(rest.current / half) + dir) * half;
      x.setValue(rest.current);
      return;
    }
    // No momentum went in, so it settles without overshoot (only flicks bounce).
    spinTo((Math.round(rest.current / FULL) + dir) * FULL);
  };

  const release = (now: number, vx: number) => {
    // Reduce Motion: no coasting. A let-go settles on the nearest side without a spring.
    if (reduced) {
      const half = FULL / 2;
      rest.current = Math.round(now / half) * half;
      x.setValue(rest.current);
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
  const artKey = badge.art === undefined ? badge.id : (badge.art ?? '');
  const rim = BADGE_RIMS[artKey]?.[earned ? 'earned' : 'locked'];

  return (
    <View style={[styles.page, { backgroundColor: c.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.toolbar}>
        <GlassButton accessibilityLabel="Close" onPress={close}>
          <Glyph name="close" size={16} color={c.ink} width={2.8} />
        </GlassButton>
      </View>

      <GestureDetector gesture={gesture}>
        <Animated.View
          style={styles.stage}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`${badge.title}. Tap or swipe to spin.`}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate' }]}
          onAccessibilityAction={(ev) => twirl(ev.nativeEvent.actionName === 'decrement' ? -1 : 1)}
        >
          {art && rim ? (
            <BadgeCoin
              angle={angle}
              art={earned ? art.earned : art.locked}
              size={SIZE}
              coin={COIN}
              thickness={THICK}
              rim={rim}
              reduced={reduced}
              back={{ kicker: earned ? (lv && lv.tiers.length > 1 ? `Level ${lv.level}` : 'Earned') : 'Still to earn', text: earned ? date : badge.hint, locked: !earned }}
            />
          ) : (
            <>
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
                <View style={[styles.disc, { backgroundColor: earned ? fill : c.cloud, borderColor: c.line }]}>
                  <Text style={[styles.backKicker, { color: earned ? textOn(fill, c) : c.inkMuted }]}>{earned ? (lv && lv.tiers.length > 1 ? `Level ${lv.level}` : 'Earned') : 'Still to earn'}</Text>
                  <Text style={[styles.backText, { color: earned ? textOn(fill, c) : c.ink }]}>{earned ? date : badge.hint}</Text>
                </View>
              </Animated.View>
            </>
          )}
        </Animated.View>
      </GestureDetector>

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
