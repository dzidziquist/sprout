import { useRef } from 'react';
import { Animated, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRewards } from '@/hooks/useRewards';
import { REWARDS } from '@/engine/rewards';
import { PlantBuddy } from '@/components/PlantBuddy';
import * as haptics from '@/lib/haptics';
import { fonts } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

const PARTY = REWARDS.find((r) => r.id === 'party')!;

/**
 * The Me tab's buddy. It waits in plain clothes until the party reward unlocks, then wears its party
 * hat for good. Tap it for a little hop.
 */
export function MeBuddy() {
  const c = useColors();
  const rewards = useRewards();
  const party = rewards.party.unlocked;
  const hop = useRef(new Animated.Value(0)).current;
  const left = Math.max(0, PARTY.needs - rewards.earned);

  const bounce = () => {
    haptics.tap();
    hop.setValue(0);
    Animated.sequence([
      Animated.timing(hop, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.spring(hop, { toValue: 0, friction: 3, tension: 120, useNativeDriver: true }),
    ]).start();
  };
  const lift = hop.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  const tilt = hop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', party ? '-8deg' : '6deg'] });

  return (
    <View style={styles.row}>
      <Pressable onPress={bounce} accessibilityRole="button" accessibilityLabel={party ? 'Your party buddy. Tap to make it hop' : 'Your buddy. Tap to make it hop'}>
        <Animated.View style={{ transform: [{ translateY: lift }, { rotate: tilt }] }}>
          {party ? (
            <Image source={require('../../assets/art/reward-party-buddy.png')} style={styles.buddy} resizeMode="contain" />
          ) : (
            <PlantBuddy speciesId="pothos" size={86} />
          )}
        </Animated.View>
      </Pressable>
      <View style={[styles.bubble, { backgroundColor: party ? c.mint : c.card, borderColor: c.line }]}>
        <View style={[styles.tail, { backgroundColor: party ? c.mint : c.card, borderColor: c.line }]} />
        <Text style={[styles.text, { color: c.ink }]}>
          {party
            ? 'Party hat on! Thanks for looking after the fam.'
            : `${left} more ${left === 1 ? 'milestone' : 'milestones'} and I'll put on my party hat.`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  buddy: { width: 96, height: 96 },
  bubble: { flex: 1, borderWidth: 2, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  tail: { position: 'absolute', left: -8, top: '50%', marginTop: -7, width: 14, height: 14, borderLeftWidth: 2, borderBottomWidth: 2, transform: [{ rotate: '45deg' }] },
  text: { fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 19 },
});
