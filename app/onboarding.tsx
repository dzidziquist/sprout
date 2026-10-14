import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore, type FaceStyle } from '@/store/plantStore';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Label, Sticker, Title } from '@/components/ui';
import { requestPermission } from '@/lib/notifications';
import * as haptics from '@/lib/haptics';
import { colors, fonts } from '@/theme/tokens';
import type { ClimateProfile } from '@/types';

const CLIMATES: { id: ClimateProfile; city: string; blurb: string }[] = [
  { id: 'seattle', city: 'Seattle', blurb: 'Marine · dark wet winters, dry summers' },
  { id: 'accra', city: 'Accra', blurb: 'Tropical · harmattan and two rainy seasons' },
];

const TIMES = [
  { label: 'Morning', hour: 8, minute: 30 },
  { label: 'Lunch', hour: 12, minute: 30 },
  { label: 'Evening', hour: 18, minute: 30 },
];

function Choice({ on, onPress, children, bg = colors.mint, style }: { on: boolean; onPress: () => void; children: React.ReactNode; bg?: string; style?: object }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={[styles.choice, { backgroundColor: on ? bg : colors.white }, on && { boxShadow: `0px 4px 0px ${colors.ink}` }, style]}
    >
      {children}
    </Pressable>
  );
}

export default function Onboarding() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, setProfile, completeOnboarding, seedDemo } = usePlantStore();
  const [step, setStep] = useState(0);

  const finish = (demo: boolean) => {
    if (demo) seedDemo();
    completeOnboarding();
    haptics.success();
    router.replace('/');
    if (!demo) setTimeout(() => router.push('/add'), 50);
  };

  if (step === 0) {
    return (
      <View style={[styles.welcome, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.logoRow}>
          <View style={styles.logoBadge}>
            <PlantBuddy speciesId="monstera" size={34} />
          </View>
          <Text style={styles.logoText}>PlantFam</Text>
        </View>
        <View style={styles.cluster}>
          <View style={[styles.tile, { backgroundColor: colors.butter, left: 0, top: 40, transform: [{ rotate: '-6deg' }] }]}>
            <PlantBuddy speciesId="pothos" size={130} />
          </View>
          <View style={[styles.tile, { backgroundColor: colors.lavender, right: 0, top: 0, transform: [{ rotate: '5deg' }] }]}>
            <PlantBuddy speciesId="monstera" size={140} />
          </View>
          <View style={[styles.tile, { backgroundColor: colors.ice, left: 90, top: 170, transform: [{ rotate: '-2deg' }] }]}>
            <PlantBuddy speciesId="calathea" mood="thirsty" size={120} />
          </View>
        </View>
        <View style={{ gap: 10 }}>
          <Title style={{ fontSize: 42, lineHeight: 44 }}>Your plants, but happier.</Title>
          <Text style={styles.lede}>Every plant in the fam gets its own rhythm, a photo diary, and a family tree for every cutting.</Text>
        </View>
        <Button title="Let's grow!" raised bg={colors.white} onPress={() => setStep(1)} style={{ minHeight: 60 }} textStyle={{ fontSize: 20, fontFamily: fonts.display }} />
      </View>
    );
  }

  if (step === 1) {
    return (
      <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
        <Progress step={1} />
        <Title>Where does your jungle live?</Title>
        <View style={{ gap: 10 }}>
          {CLIMATES.map((c) => (
            <Choice key={c.id} on={profile.climate === c.id} onPress={() => setProfile({ climate: c.id, city: c.city })} style={{ padding: 14 }}>
              <Text style={styles.choiceTitle}>{c.city}</Text>
              <Text style={styles.choiceSub}>{c.blurb}</Text>
            </Choice>
          ))}
          <Label muted>More cities are coming. Seattle's profile suits most temperate homes for now.</Label>
        </View>

        <Label>What do you grow? Pick all</Label>
        <View style={styles.row3}>
          {(
            [
              ['houseplants', 'Houseplants', 'monstera', colors.mint],
              ['edibles', 'Edibles', 'tomato', colors.peach],
              ['cuttings', 'Cuttings', 'cutting', colors.ice],
            ] as const
          ).map(([key, label, sp, bg]) => (
            <Choice key={key} on={profile.grows[key]} bg={bg} onPress={() => setProfile({ grows: { ...profile.grows, [key]: !profile.grows[key] } })} style={styles.growTile}>
              <PlantBuddy speciesId={sp} size={70} />
              <Text style={styles.choiceTitle}>{label}</Text>
            </Choice>
          ))}
        </View>

        <Label>Plant faces</Label>
        <View style={styles.segment}>
          {(['full', 'gentle', 'off'] as FaceStyle[]).map((f) => (
            <Pressable key={f} accessibilityRole="button" accessibilityState={{ selected: profile.faces === f }} onPress={() => setProfile({ faces: f })} style={[styles.segBtn, profile.faces === f && { backgroundColor: colors.ink }]}>
              <Text style={[styles.segText, profile.faces === f && { color: colors.white }]}>{f[0].toUpperCase() + f.slice(1)}</Text>
            </Pressable>
          ))}
        </View>
        <Button title="Next" raised onPress={() => setStep(2)} style={{ minHeight: 56, marginTop: 8 }} textStyle={{ fontSize: 18, fontFamily: fonts.display }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
      <Progress step={2} />
      <Title>One plant round a day</Title>
      <Sticker bg={colors.butter} drop={0} style={{ padding: 14, gap: 4 }}>
        <Text style={styles.choiceTitle}>Plant round 🌱</Text>
        <Text style={styles.choiceSub}>Queenie and Cal would love a soil check. 2 mins, tops.</Text>
      </Sticker>
      <Label muted>Just one reminder, only on days something needs you. Never "you forgot me".</Label>
      <View style={styles.row3}>
        {TIMES.map((t) => {
          const on = profile.round.hour === t.hour && profile.round.minute === t.minute;
          return (
            <Choice key={t.label} on={on} bg={colors.sun} onPress={() => setProfile({ round: { ...profile.round, hour: t.hour, minute: t.minute } })} style={{ flex: 1, padding: 12, alignItems: 'center' }}>
              <Text style={styles.choiceTitle}>{t.label}</Text>
              <Text style={styles.choiceSub}>
                {((t.hour + 11) % 12) + 1}:{String(t.minute).padStart(2, '0')} {t.hour < 12 ? 'am' : 'pm'}
              </Text>
            </Choice>
          );
        })}
      </View>
      {Platform.OS !== 'web' && (
        <Button
          title="Turn on the plant round"
          raised
          bg={colors.sun}
          onPress={async () => {
            const ok = await requestPermission();
            setProfile({ round: { ...profile.round, enabled: ok } });
          }}
          style={{ minHeight: 52 }}
        />
      )}
      <View style={{ gap: 10, marginTop: 8 }}>
        <Button title="Add my first plant" raised onPress={() => finish(false)} style={{ minHeight: 56 }} textStyle={{ fontSize: 18, fontFamily: fonts.display }} />
        <Button title="Look around with a demo fam" bg={colors.white} onPress={() => finish(true)} style={{ minHeight: 48 }} />
      </View>
    </ScrollView>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Step ${step} of 2`}>
      {[1, 2].map((i) => (
        <View key={i} style={[styles.progress, i <= step && { backgroundColor: colors.ink }]} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  welcome: { flex: 1, backgroundColor: colors.leaf, paddingHorizontal: 24, justifyContent: 'space-between' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadge: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.white, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: fonts.display, fontSize: 26, color: colors.ink },
  cluster: { height: 320 },
  tile: { position: 'absolute', width: 160, height: 160, borderRadius: 36, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center', boxShadow: `0px 5px 0px ${colors.ink}` },
  lede: { fontFamily: fonts.bodyHeavy, fontSize: 17, lineHeight: 24, color: colors.ink },
  page: { paddingHorizontal: 20, gap: 14, backgroundColor: colors.white, flexGrow: 1 },
  progress: { flex: 1, height: 10, borderRadius: 5, borderWidth: 2, borderColor: colors.ink },
  choice: { borderWidth: 2, borderColor: colors.ink, borderRadius: 18 },
  choiceTitle: { fontFamily: fonts.displaySemi, fontSize: 17, color: colors.ink },
  choiceSub: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.inkMuted },
  row3: { flexDirection: 'row', gap: 8 },
  growTile: { flex: 1, height: 116, alignItems: 'center', justifyContent: 'center' },
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderWidth: 2, borderColor: colors.ink, borderRadius: 16 },
  segBtn: { flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segText: { fontFamily: fonts.displaySemi, fontSize: 15, color: colors.ink },
});
