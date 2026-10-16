import { Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { textOn, useColors, type Palette } from '@/theme/theme';
import { fonts } from '@/theme/tokens';
import type { Badge, BadgeId } from '@/engine/streak';
import { BADGE_ART } from '@/data/art';

const ICON: Record<BadgeId, string> = {
  'first-check': 'M3 17c3-1.5 6-1.5 9 0s6 1.5 9 0M12 3v9M8.5 8.5 12 12l3.5-3.5',
  'first-skip': 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11zM4 4l16 16',
  'ten-skips': 'M8 4s4 4.5 4 7.5a4 4 0 0 1-8 0C4 8.5 8 4 8 4zM16 9s4 4.5 4 7.5a4 4 0 0 1-8 0c0-3 4-7.5 4-7.5z',
  'first-photo': 'M3 9a3 3 0 0 1 3-3h1.5L9 4h6l1.5 2H18a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z',
  'first-cutting': 'M6 7.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6 21.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM8 6l12 12M8 18 20 6',
  'first-roots': 'M12 3v9M12 12c-2 2-5 3-7 8M12 12c2 2 5 3 7 8M12 12v9M7 7c2-3 8-3 10 0',
  'first-harvest': 'M12 8.5a6.5 6.5 0 1 0 .01 0zM8.5 5.5 12 8.5l3.5-3M12 8.5V3.5',
  propagator: 'M12 21v-8M12 13c-4 0-6-3-6-6 4 0 6 2 6 6zM12 13c4 0 6-3 6-6-4 0-6 2-6 6z',
  'fam-5': 'M4 11 12 4l8 7v9H4zM10 20v-5h4v5',
  generous: 'M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7C10 3 6 4 7.5 7M12 7c2-4 6-3 4.5 0',
  'grandma-plant': 'M5 5h14v15H5zM5 10h14M9 3v4M15 3v4M9 15l2 2 4-4',
  'streak-4': 'M12 21v-9M12 12C12 8 9 5 4 5c0 4 3 7 8 7zM12 15c0-3 3-6 8-6 0 4-3 6-8 6z',
  supporter: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  season: 'M7 19h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 12.5 3.5 3.5 0 0 0 7 19zM17 3v2M21 7h-2M20 4l-1.5 1.5',
};

const fill = (c: Palette): Record<BadgeId, string> => ({
  'first-check': c.leaf,
  'first-skip': c.sky,
  'ten-skips': c.sky,
  'first-photo': c.sun,
  'first-cutting': c.grape,
  'first-roots': c.orange,
  'first-harvest': c.coral,
  propagator: c.mint,
  'fam-5': c.bubblegum,
  generous: c.blush,
  'grandma-plant': c.peach,
  'streak-4': c.leaf,
  season: c.grape,
  supporter: c.leaf,
});

/** Milestone sticker. Earned: colourful with the date. Locked: faded, with a hint on how to earn it. */
export function BadgeSticker({ badge }: { badge: Badge }) {
  const c = useColors();
  const earned = !!badge.earnedAt;
  const bg = earned ? fill(c)[badge.id] : c.cloud;
  const fg = earned ? textOn(bg, c) : c.inkMuted;
  const art = BADGE_ART[badge.art === undefined ? badge.id : (badge.art ?? '')];
  const date = earned ? new Date(badge.earnedAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={earned ? `${badge.title}, earned ${date}` : `${badge.title}, locked. ${badge.hint}`}
    >
      {art ? (
        <Image source={earned ? art.earned : art.locked} style={styles.art} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      ) : (
        <View style={[styles.circle, { backgroundColor: bg, borderColor: earned ? c.line : c.inkMuted }, earned ? { boxShadow: `0px 3px 0px ${c.drop}` } : { opacity: 0.6, borderStyle: 'dashed' }]}>
          <Svg width={30} height={30} viewBox="0 0 24 24">
            <Path d={ICON[badge.id]} stroke={fg} strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </View>
      )}
      <Text style={[styles.title, { color: earned ? c.ink : c.inkMuted }]} numberOfLines={2}>{badge.title}</Text>
      <Text style={[styles.sub, { color: c.inkMuted }]} numberOfLines={2}>{earned ? date : badge.hint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '31%', alignItems: 'center', gap: 4, paddingVertical: 4 },
  art: { width: 72, height: 72 },
  circle: { width: 62, height: 62, borderRadius: 31, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.bodyHeavy, fontSize: 13, textAlign: 'center', lineHeight: 16 },
  sub: { fontFamily: fonts.body, fontSize: 11, textAlign: 'center', lineHeight: 14 },
});
