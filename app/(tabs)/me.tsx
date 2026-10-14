import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore, type FaceStyle } from '@/store/plantStore';
import { Label, Sticker, Title } from '@/components/ui';
import { colors, fonts } from '@/theme/tokens';

const FACE_NOTE: Record<FaceStyle, string> = {
  full: 'Moods and little speech bubbles. Never guilt-trips.',
  gentle: 'Soft smiles only, no worried faces.',
  off: 'Plain plants and simple text.',
};

export default function MeScreen() {
  const insets = useSafeAreaInsets();
  const { profile, setProfile, events } = usePlantStore();
  const checks = events.filter((e) => e.type === 'check');
  const skips = checks.filter((e) => e.result === 'damp').length;

  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + 16, paddingBottom: 130 }]}>
      <Title>Your green thumb</Title>

      <View style={styles.stats}>
        <Sticker drop={0} bg={colors.ice} style={styles.stat}>
          <Text style={styles.statNum}>{checks.length}</Text>
          <Text style={styles.statLabel}>soil checks</Text>
        </Sticker>
        <Sticker drop={0} bg={colors.mint} style={styles.stat}>
          <Text style={styles.statNum}>{skips}</Text>
          <Text style={styles.statLabel}>smart skips</Text>
        </Sticker>
      </View>

      <View style={{ gap: 8 }}>
        <Label>Plant faces</Label>
        <View style={styles.segment} accessibilityRole="radiogroup">
          {(['full', 'gentle', 'off'] as FaceStyle[]).map((f) => {
            const on = profile.faces === f;
            return (
              <Pressable
                key={f}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => setProfile({ faces: f })}
                style={[styles.segBtn, on && { backgroundColor: colors.ink }]}
              >
                <Text style={[styles.segText, on && { color: colors.white }]}>{f[0].toUpperCase() + f.slice(1)}</Text>
              </Pressable>
            );
          })}
        </View>
        <Label muted>{FACE_NOTE[profile.faces]}</Label>
      </View>

      <View style={{ gap: 8 }}>
        <Label>Climate</Label>
        <Sticker drop={0} bg={colors.mint} style={{ padding: 12 }}>
          <Text style={styles.statLabel}>{profile.city} · {profile.climate === 'seattle' ? 'Marine: dark wet winters, dry summers' : 'Tropical: harmattan and two rainy seasons'}</Text>
        </Sticker>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 18, backgroundColor: colors.white },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, padding: 12, borderRadius: 18 },
  statNum: { fontFamily: fonts.display, fontSize: 28, color: colors.ink },
  statLabel: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.ink },
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderWidth: 2, borderColor: colors.ink, borderRadius: 16 },
  segBtn: { flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segText: { fontFamily: fonts.displaySemi, fontSize: 15, color: colors.ink },
});
