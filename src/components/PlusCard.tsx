import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '../store/plantStore';
import { usePlus } from '../hooks/usePlus';
import { exportMyData } from '../lib/export';
import * as haptics from '../lib/haptics';
import { fonts } from '../theme/tokens';
import { textOn, useColors } from '../theme/theme';
import { PlantBuddy } from './PlantBuddy';
import { Button, Sticker } from './ui';

/** PlantFam Plus on the Me tab: an upsell sticker, or the Plus tools once unlocked. */
export function PlusCard() {
  const router = useRouter();
  const c = useColors();
  const { isPlus } = usePlus();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!isPlus) {
    const ink = textOn(c.sun, c);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Get PlantFam Plus"
        onPress={() => {
          haptics.tap();
          router.push('/plus');
        }}
        style={({ pressed }) => [styles.upsell, { backgroundColor: c.sun, borderColor: c.line, boxShadow: `0px ${pressed ? 1 : 5}px 0px ${c.drop}` }, pressed && { transform: [{ translateY: 4 }] }]}
      >
        <View style={[styles.buddyTile, { backgroundColor: c.card, borderColor: c.line }]}>
          <PlantBuddy speciesId="monstera" size={64} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.title, { color: ink }]}>Get PlantFam Plus</Text>
          <Text style={[styles.body, { color: ink }]}>Photo ID, export your data, and a high five for an indie dev.</Text>
        </View>
        <View style={[styles.arrow, { backgroundColor: c.card, borderColor: c.line }]}>
          <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="m9 6 6 6-6 6" stroke={c.ink} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
        </View>
      </Pressable>
    );
  }

  const doExport = async () => {
    haptics.tap();
    setBusy(true);
    setMsg(null);
    const { profile, plants, events } = usePlantStore.getState();
    const res = await exportMyData({ profile, plants, events });
    setBusy(false);
    if (res.ok) haptics.success();
    setMsg(res.ok ? 'Exported your plants and care diary.' : res.message);
  };

  return (
    <Sticker bg={c.mint} style={styles.plus}>
      <View style={styles.row}>
        <PlantBuddy speciesId="pothos" size={56} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.ink }]}>PlantFam Plus ✓</Text>
          <Text style={[styles.body, { color: c.inkMuted }]}>Thanks for backing PlantFam!</Text>
        </View>
      </View>
      <View style={styles.row}>
        <Button title={busy ? 'Exporting…' : 'Export my data'} raised disabled={busy} onPress={doExport} style={{ flex: 1 }} />
        <Button title="Identify a plant" raised bg={c.card} onPress={() => router.push('/identify')} style={{ flex: 1 }} />
      </View>
      {msg && <Text style={[styles.body, { color: c.ink }]}>{msg}</Text>}
    </Sticker>
  );
}

const styles = StyleSheet.create({
  upsell: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 22, borderWidth: 2 },
  buddyTile: { width: 68, height: 68, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  arrow: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: fonts.display, fontSize: 19 },
  body: { fontFamily: fonts.bodyHeavy, fontSize: 13, lineHeight: 18 },
  plus: { padding: 14, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
