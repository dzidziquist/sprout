import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { useTips } from '../hooks/useTips';
import * as haptics from '../lib/haptics';
import { fonts } from '../theme/tokens';
import { textOn, useColors } from '../theme/theme';
import { PartyHat } from './PartyHat';
import { PlantBuddy } from './PlantBuddy';

/** Tip jar on the Me tab: a friendly invite, or a thank-you once someone has tipped. Nothing is locked either way. */
export function TipJarCard() {
  const router = useRouter();
  const c = useColors();
  const { supporter } = useTips();
  const bg = supporter ? c.mint : c.sun;
  const ink = textOn(bg, c);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={supporter ? 'PlantFam supporter. Open the tip jar' : 'Open the tip jar'}
      onPress={() => {
        haptics.tap();
        router.push('/tips');
      }}
      style={({ pressed }) => [styles.card, { backgroundColor: bg, borderColor: c.line, boxShadow: `0px ${pressed ? 1 : 5}px 0px ${c.drop}` }, pressed && { transform: [{ translateY: 4 }] }]}
    >
      <View style={[styles.buddyTile, { backgroundColor: c.card, borderColor: c.line }]}>
        <PlantBuddy speciesId={supporter ? 'pothos' : 'monstera'} size={64} />
        {supporter && (
          <View style={styles.hat}>
            <PartyHat size={30} />
          </View>
        )}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.title, { color: ink }]}>{supporter ? 'PlantFam supporter 💚' : 'Tip jar'}</Text>
        <Text style={[styles.body, { color: ink }]}>
          {supporter ? 'Thanks for keeping PlantFam free, indie and ad-free.' : 'Everything in PlantFam is free. Enjoying it? A tip helps it keep growing.'}
        </Text>
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
  hat: { position: 'absolute', top: -16, right: -8, transform: [{ rotate: '22deg' }] },
  arrow: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 19 },
  body: { fontFamily: fonts.bodyHeavy, fontSize: 13, lineHeight: 18 },
});
