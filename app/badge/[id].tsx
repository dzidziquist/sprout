import { useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import { PanGestureHandler, State, type PanGestureHandlerStateChangeEvent } from 'react-native-gesture-handler';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useBadges } from '@/hooks/useBadges';
import { BADGE_ART } from '@/data/art';
import { BADGE_ICON, badgeFill } from '@/components/BadgeSticker';
import { GlassButton } from '@/components/GlassButton';
import { Button } from '@/components/ui';
import { Icon } from '@/components/GrowTodayCard';
import * as haptics from '@/lib/haptics';
import { fonts } from '@/theme/tokens';
import { textOn, useColors } from '@/theme/theme';

const SIZE = 220;
/** Degrees of turn per pixel dragged. */
const TURN = 0.9;

/** One milestone up close. Drag or flick it sideways to spin it; the back shows when it was earned. */
export default function BadgeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const { badges } = useBadges();
  const badge = badges.find((b) => b.id === id);
  // The spin is `base` (where it rests) plus the live drag. The drag is wired straight to the native
  // driver, so following the finger never waits on JavaScript and doesn't stutter.
  const base = useRef(new Animated.Value(0)).current;
  const dragX = useRef(new Animated.Value(0)).current;
  const angle = useRef(Animated.add(base, Animated.multiply(dragX, TURN))).current;
  const rest = useRef(0);
  const onDrag = useRef(Animated.event([{ nativeEvent: { translationX: dragX } }], { useNativeDriver: true })).current;

  // Settle on the nearest face-forward turn so it always comes to rest showing the front.
  const settle = () => {
    const target = Math.round(rest.current / 360) * 360;
    Animated.spring(base, { toValue: target, useNativeDriver: true, friction: 6, tension: 40 }).start(() => {
      rest.current = target;
    });
  };

  const onState = ({ nativeEvent: e }: PanGestureHandlerStateChangeEvent) => {
    if (e.state === State.BEGAN) {
      base.stopAnimation((v) => (rest.current = v));
      return;
    }
    if (e.state !== State.END && e.state !== State.CANCELLED && e.state !== State.FAILED) return;
    // Fold the drag into the resting angle in one go, then let go of the finger's value.
    rest.current += e.translationX * TURN;
    base.setValue(rest.current);
    dragX.setValue(0);
    if (Math.abs(e.translationX) < 4 && Math.abs(e.velocityX) < 100) {
      // A tap: one full twirl.
      haptics.tap();
      const to = Math.round(rest.current / 360) * 360 + 360;
      Animated.timing(base, { toValue: to, duration: 700, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }).start(() => {
        rest.current = to;
      });
      return;
    }
    if (Math.abs(e.velocityX) > 300) haptics.tap();
    Animated.decay(base, { velocity: (e.velocityX / 1000) * TURN, deceleration: 0.996, useNativeDriver: true }).start(({ finished }) => {
      base.stopAnimation((v) => {
        rest.current = v;
        if (finished) settle();
      });
    });
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

  return (
    <View style={[styles.page, { backgroundColor: c.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.toolbar}>
        <GlassButton accessibilityLabel="Close" onPress={close}>
          <Icon d="M6 6l12 12M18 6 6 18" color={c.ink} size={16} width={2.8} />
        </GlassButton>
      </View>

      <PanGestureHandler minDist={0} onGestureEvent={onDrag} onHandlerStateChange={onState}>
        <Animated.View style={styles.stage} accessible accessibilityRole="adjustable" accessibilityLabel={`${badge.title}. Swipe to spin.`}>
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
  missingText: { fontFamily: fonts.displaySemi, fontSize: 18 },
  page: { flex: 1, paddingHorizontal: 20, gap: 20 },
  toolbar: { flexDirection: 'row' },
  stage: { height: SIZE + 40, alignItems: 'center', justifyContent: 'center' },
  face: { position: 'absolute', width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden' },
  backFace: {},
  disc: { width: SIZE - 30, height: SIZE - 30, borderRadius: (SIZE - 30) / 2, borderWidth: 3, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
  backKicker: { fontFamily: fonts.bodyHeavy, fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase' },
  backText: { fontFamily: fonts.display, fontSize: 20, textAlign: 'center' },
  levelRow: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  pip: { minWidth: 44, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  pipText: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  title: { fontFamily: fonts.display, fontSize: 26, textAlign: 'center' },
  sub: { fontFamily: fonts.bodyHeavy, fontSize: 15, textAlign: 'center' },
  hint: { fontFamily: fonts.bodyHeavy, fontSize: 12, textAlign: 'center', marginTop: 6 },
});
