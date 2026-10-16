import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useRewards } from '../hooks/useRewards';
import { REWARDS } from '../engine/rewards';
import * as haptics from '../lib/haptics';
import { fonts } from '../theme/tokens';
import { textOn, useColors } from '../theme/theme';
import { PlantBuddy } from './PlantBuddy';

/** Support PlantFam on the Me tab: the next gift to grow into, and the party buddy once it's earned. */
export function SupportCard() {
  const router = useRouter();
  const c = useColors();
  const rewards = useRewards();
  const party = rewards.party.unlocked;
  const next = REWARDS.find((r) => !rewards[r.id].unlocked);
  const bg = party ? c.mint : c.sun;
  const ink = textOn(bg, c);
  const body = next
    ? `Free for everyone. ${next.needs - rewards.earned} more milestone${next.needs - rewards.earned === 1 ? '' : 's'} to ${next.short}.`
    : 'Every gift is yours. Thanks for growing with PlantFam!';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Support PlantFam. ${body}`}
      onPress={() => {
        haptics.tap();
        router.push('/support');
      }}
      style={({ pressed }) => [styles.card, { backgroundColor: bg, borderColor: c.line, boxShadow: `0px ${pressed ? 1 : 5}px 0px ${c.drop}` }, pressed && { transform: [{ translateY: 4 }] }]}
    >
      <View style={[styles.buddyTile, { backgroundColor: c.card, borderColor: c.line }]}>
        {party ? (
          <Image source={require('../../assets/art/buddy-party.png')} style={{ width: 66, height: 66 }} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        ) : (
          <PlantBuddy speciesId="monstera" size={64} />
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.title, { color: ink }]}>Support PlantFam</Text>
        <Text style={[styles.body, { color: ink }]}>{body}</Text>
      </View>
      <View style={[styles.arrow, { backgroundColor: c.card, borderColor: c.line }]}>
        <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="m9 6 6 6-6 6" stroke={c.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 22, borderWidth: 2 },
  buddyTile: { width: 68, height: 68, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  arrow: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 19 },
  body: { fontFamily: fonts.bodyHeavy, fontSize: 13, lineHeight: 18 },
});
