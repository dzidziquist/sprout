import { useMemo, useRef } from 'react';
import { Animated, Easing, Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useBadges } from '@/hooks/useBadges';
import { BADGE_ART } from '@/data/art';
import { BADGE_ICON, badgeFill } from '@/components/BadgeSticker';
import { GlassButton } from '@/components/GlassButton';
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
  const angle = useRef(new Animated.Value(0)).current;
  const base = useRef(0);
  const current = useRef(0);

  // Settle on the nearest face-forward turn so it always comes to rest showing the front.
  const settle = () => {
    const target = Math.round(current.current / 360) * 360;
    Animated.spring(angle, { toValue: target, useNativeDriver: true, friction: 6, tension: 40 }).start(() => {
      current.current = target;
    });
  };

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4,
        onPanResponderGrant: () => {
          angle.stopAnimation((v) => {
            base.current = v;
            current.current = v;
          });
        },
        onPanResponderMove: (_, g) => {
          current.current = base.current + g.dx * TURN;
          angle.setValue(current.current);
        },
        onPanResponderRelease: (_, g) => {
          if (Math.abs(g.dx) < 4 && Math.abs(g.vx) < 0.1) {
            // A tap: one full twirl.
            haptics.tap();
            const to = Math.round(current.current / 360) * 360 + 360;
            Animated.timing(angle, { toValue: to, duration: 700, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }).start(() => {
              current.current = to;
            });
            return;
          }
          if (Math.abs(g.vx) > 0.3) haptics.tap();
          Animated.decay(angle, { velocity: g.vx * TURN, deceleration: 0.996, useNativeDriver: true }).start(({ finished }) => {
            angle.stopAnimation((v) => {
              current.current = v;
              if (finished) settle();
            });
          });
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (!badge) return null;
  const earned = !!badge.earnedAt;
  const art = BADGE_ART[badge.art === undefined ? badge.id : (badge.art ?? '')];
  const fill = earned ? badgeFill(c)[badge.id] ?? c.sun : c.cloud;
  const date = earned ? new Date(badge.earnedAt!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '';
  const front = angle.interpolate({ inputRange: [-36000, 36000], outputRange: ['-36000deg', '36000deg'] });
  const back = angle.interpolate({ inputRange: [-36000, 36000], outputRange: ['-35820deg', '36180deg'] });
  const close = () => (router.canGoBack() ? router.back() : router.replace('/me'));

  return (
    <View style={[styles.page, { backgroundColor: c.bg, paddingTop: 16, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.toolbar}>
        <GlassButton accessibilityLabel="Close" onPress={close}>
          <Icon d="M6 6l12 12M18 6 6 18" color={c.ink} size={16} width={2.8} />
        </GlassButton>
      </View>

      <View style={styles.stage} {...pan.panHandlers} accessible accessibilityRole="adjustable" accessibilityLabel={`${badge.title}. Swipe to spin.`}>
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
            <Text style={[styles.backKicker, { color: earned ? textOn(fill, c) : c.inkMuted }]}>{earned ? 'Earned' : 'Still to earn'}</Text>
            <Text style={[styles.backText, { color: earned ? textOn(fill, c) : c.ink }]}>{earned ? date : badge.hint}</Text>
          </View>
        </Animated.View>
      </View>

      <View style={{ gap: 6, alignItems: 'center' }}>
        <Text style={[styles.title, { color: c.ink }]}>{badge.title}</Text>
        <Text style={[styles.sub, { color: c.inkMuted }]}>{earned ? `Earned ${date}` : badge.hint}</Text>
        <Text style={[styles.hint, { color: c.inkMuted }]}>Swipe to spin it · tap for a twirl</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 20, gap: 20 },
  toolbar: { flexDirection: 'row' },
  stage: { height: SIZE + 40, alignItems: 'center', justifyContent: 'center' },
  face: { position: 'absolute', width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center', backfaceVisibility: 'hidden' },
  backFace: {},
  disc: { width: SIZE - 30, height: SIZE - 30, borderRadius: (SIZE - 30) / 2, borderWidth: 3, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 6 },
  backKicker: { fontFamily: fonts.bodyHeavy, fontSize: 13, letterSpacing: 0.6, textTransform: 'uppercase' },
  backText: { fontFamily: fonts.display, fontSize: 20, textAlign: 'center' },
  title: { fontFamily: fonts.display, fontSize: 26, textAlign: 'center' },
  sub: { fontFamily: fonts.bodyHeavy, fontSize: 15, textAlign: 'center' },
  hint: { fontFamily: fonts.bodyHeavy, fontSize: 12, textAlign: 'center', marginTop: 6 },
});
