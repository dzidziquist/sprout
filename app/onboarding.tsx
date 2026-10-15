import { PlacePicker } from '@/components/PlacePicker';
import { useMemo, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore, type FaceStyle } from '@/store/plantStore';
import { ART } from '@/data/art';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Label, Sticker, Title } from '@/components/ui';
import { requestPermission } from '@/lib/notifications';
import * as haptics from '@/lib/haptics';
import { fonts } from '@/theme/tokens';
import { light, textOn, useColors, type Palette } from '@/theme/theme';


const TIMES = [
  { label: 'Morning', hour: 8, minute: 30 },
  { label: 'Lunch', hour: 12, minute: 30 },
  { label: 'Evening', hour: 18, minute: 30 },
];

function Choice({ on, onPress, children, bg, style }: { on: boolean; onPress: () => void; children: React.ReactNode; bg?: string; style?: object }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={[styles.choice, { backgroundColor: on ? (bg ?? c.mint) : c.card }, on && { boxShadow: `0px 4px 0px ${c.drop}` }, style]}
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
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  // The welcome screen is a bright brand moment in both themes.
  const w = useMemo(() => makeStyles(light), []);

  const finish = (demo: boolean) => {
    if (demo) seedDemo();
    completeOnboarding();
    haptics.success();
    router.replace('/');
    if (!demo) setTimeout(() => router.push('/add'), 50);
  };

  if (step === 0) {
    return (
      <View style={[w.welcome, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <Image source={ART.logo} style={{ width: 200, height: 130 }} resizeMode="contain" accessibilityLabel="PlantFam" />
        <View style={w.cluster}>
          <Image source={ART.welcome} style={{ width: '100%', height: 300 }} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        </View>
        <View style={{ gap: 10 }}>
          <Title style={{ fontSize: 42, lineHeight: 44, color: light.ink }}>Your plants, but happier.</Title>
          <Text style={w.lede}>Every plant in the fam gets its own rhythm, a photo diary, and a family tree for every cutting.</Text>
        </View>
        <Button title="Let's grow!" raised bg={light.white} onPress={() => setStep(1)} style={{ minHeight: 60, borderColor: light.line, boxShadow: `0px 4px 0px ${light.drop}` }} textStyle={{ fontSize: 20, fontFamily: fonts.display, color: light.ink }} />
      </View>
    );
  }

  if (step === 1) {
    return (
      <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
        <Progress step={1} />
        <Title>Where does your jungle live?</Title>
        <PlacePicker value={profile.climate} onPick={(climate, city) => setProfile({ climate, city })} />

        <Label>What do you grow? Pick all</Label>
        <View style={styles.row3}>
          {(
            [
              ['houseplants', 'Houseplants', 'monstera', c.mint],
              ['edibles', 'Edibles', 'tomato', c.peach],
              ['cuttings', 'Cuttings', 'cutting', c.ice],
            ] as const
          ).map(([key, label, sp, bg]) => (
            <Choice key={key} on={profile.grows[key]} bg={bg} onPress={() => setProfile({ grows: { ...profile.grows, [key]: !profile.grows[key] } })} style={styles.growTile}>
              <PlantBuddy speciesId={sp} size={70} />
              <Text style={styles.choiceTitle}>{label}</Text>
            </Choice>
          ))}
        </View>
        <Choice on={!!profile.grows.hydro} bg={c.ice} onPress={() => setProfile({ grows: { ...profile.grows, hydro: !profile.grows.hydro } })} style={styles.hydroRow}>
          <Text style={styles.choiceTitle}>💧 Hydro or LECA</Text>
          <Text style={styles.choiceSub}>Plants in water, clay balls or a countertop hydro garden</Text>
        </Choice>

        <Label>Plant faces</Label>
        <View style={styles.segment}>
          {(['full', 'gentle', 'off'] as FaceStyle[]).map((f) => (
            <Pressable key={f} accessibilityRole="button" accessibilityState={{ selected: profile.faces === f }} onPress={() => setProfile({ faces: f })} style={[styles.segBtn, profile.faces === f && { backgroundColor: c.ink }]}>
              <Text style={[styles.segText, profile.faces === f && { color: c.bg }]}>{f[0].toUpperCase() + f.slice(1)}</Text>
            </Pressable>
          ))}
        </View>
        <Button title="Next" raised onPress={() => setStep(2)} style={{ minHeight: 56, marginTop: 8 }} textStyle={{ fontSize: 18, fontFamily: fonts.display }} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 24 }]}>
      <Progress step={2} />
      <Title>One plant round a day</Title>
      <Sticker bg={c.butter} drop={0} style={{ padding: 14, gap: 4 }}>
        <Text style={styles.choiceTitle}>Plant round 🌱</Text>
        <Text style={styles.choiceSub}>Your plants would love a soil check. 2 mins, tops.</Text>
      </Sticker>
      <Label muted>Just one reminder, only on days something needs you. Never "you forgot me".</Label>
      <View style={styles.row3}>
        {TIMES.map((t) => {
          const on = profile.round.hour === t.hour && profile.round.minute === t.minute;
          return (
            <Choice key={t.label} on={on} bg={c.butter} onPress={() => setProfile({ round: { ...profile.round, hour: t.hour, minute: t.minute } })} style={{ flex: 1, padding: 12, alignItems: 'center' }}>
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
          bg={c.sun}
          onPress={async () => {
            const ok = await requestPermission();
            setProfile({ round: { ...profile.round, enabled: ok } });
          }}
          style={{ minHeight: 52 }}
        />
      )}
      <View style={{ gap: 10, marginTop: 8 }}>
        <Button title="Add my first plant" raised onPress={() => finish(false)} style={{ minHeight: 56 }} textStyle={{ fontSize: 18, fontFamily: fonts.display }} />
        <Button title="Look around with a demo fam" bg={c.white} onPress={() => finish(true)} style={{ minHeight: 48 }} />
      </View>
    </ScrollView>
  );
}

function Progress({ step }: { step: number }) {
  const c = useColors();
  const styles = useMemo(() => makeStyles(c), [c]);
  return (
    <View style={{ flexDirection: 'row', gap: 6 }} accessibilityLabel={`Step ${step} of 2`}>
      {[1, 2].map((i) => (
        <View key={i} style={[styles.progress, i <= step && { backgroundColor: c.ink }]} />
      ))}
    </View>
  );
}

const makeStyles = (c: Palette) =>
  StyleSheet.create({
  welcome: { flex: 1, backgroundColor: c.leaf, paddingHorizontal: 24, justifyContent: 'space-between' },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  logoBadge: { width: 44, height: 44, borderRadius: 14, backgroundColor: c.white, borderWidth: 2, borderColor: c.line, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontFamily: fonts.display, fontSize: 26, color: c.ink },
  cluster: { height: 320 },
  tile: { position: 'absolute', width: 160, height: 160, borderRadius: 36, borderWidth: 2, borderColor: c.line, alignItems: 'center', justifyContent: 'center', boxShadow: `0px 5px 0px ${c.drop}` },
  lede: { fontFamily: fonts.bodyHeavy, fontSize: 17, lineHeight: 24, color: c.ink },
  page: { paddingHorizontal: 20, gap: 14, backgroundColor: c.bg, flexGrow: 1 },
  progress: { flex: 1, height: 10, borderRadius: 5, borderWidth: 2, borderColor: c.line },
  choice: { borderWidth: 2, borderColor: c.line, borderRadius: 18 },
  choiceTitle: { fontFamily: fonts.displaySemi, fontSize: 17, color: c.ink },
  choiceSub: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: c.inkMuted },
  row3: { flexDirection: 'row', gap: 8 },
  growTile: { flex: 1, height: 116, alignItems: 'center', justifyContent: 'center' },
  hydroRow: { paddingVertical: 12, paddingHorizontal: 14, gap: 2 },
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderWidth: 2, borderColor: c.line, borderRadius: 16 },
  segBtn: { flex: 1, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segText: { fontFamily: fonts.displaySemi, fontSize: 15, color: c.ink },
});
