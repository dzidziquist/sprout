import { useState } from 'react';
import { Alert, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore, type FaceStyle, type Profile } from '@/store/plantStore';
import { GlassButton } from '@/components/GlassButton';
import { Segmented } from '@/components/Segmented';
import { DataCard } from '@/components/DataCard';
import { Label, Title } from '@/components/ui';
import { usePlus } from '@/hooks/usePlus';
import { requestPermission } from '@/lib/notifications';
import { deleteAllPhotos } from '@/lib/photos';
import * as haptics from '@/lib/haptics';
import { APP_VERSION, MANAGE_SUBSCRIPTIONS_URL, SUPPORT_EMAIL, SUPPORT_URL, TERMS_URL } from '@/config';
import { fonts } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

const TIMES = [
  { label: '8:30 am', hour: 8, minute: 30 },
  { label: '12:30 pm', hour: 12, minute: 30 },
  { label: '6:30 pm', hour: 18, minute: 30 },
];

const FACE_NOTE: Record<FaceStyle, string> = {
  full: 'Moods and little speech bubbles. Never guilt-trips.',
  gentle: 'Soft smiles only, no worried faces.',
  off: 'Plain plants and simple text.',
};

const THEMES: { id: Profile['theme']; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

function confirm(title: string, body: string, action: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${body}`));
  return new Promise((resolve) =>
    Alert.alert(title, body, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: action, style: 'destructive', onPress: () => resolve(true) },
    ]),
  );
}

/** A group of settings with a heading, iOS-style. */
function Section({ title, children, footer }: { title: string; children: React.ReactNode; footer?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.sectionTitle, { color: c.inkMuted }]} accessibilityRole="header">
        {title.toUpperCase()}
      </Text>
      <View style={[styles.group, { backgroundColor: c.card, borderColor: c.line }]}>{children}</View>
      {footer ? <Text style={[styles.footer, { color: c.inkMuted }]}>{footer}</Text> : null}
    </View>
  );
}

function Row({ label, value, onPress, last, danger, chevron = true }: { label: string; value?: string; onPress?: () => void; last?: boolean; danger?: boolean; chevron?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      disabled={!onPress}
      onPress={() => {
        haptics.tap();
        onPress?.();
      }}
      style={({ pressed }) => [styles.row, !last && { borderBottomWidth: 1.5, borderColor: c.cloud }, pressed && { backgroundColor: c.cloud }]}
    >
      <Text style={[styles.rowLabel, { color: danger ? c.warn : c.ink }]}>{label}</Text>
      {value ? <Text style={[styles.rowValue, { color: c.inkMuted }]}>{value}</Text> : null}
      {onPress && chevron ? (
        <Svg width={16} height={16} viewBox="0 0 24 24">
          <Path d="m9 6 6 6-6 6" stroke={c.inkMuted} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      ) : null}
    </Pressable>
  );
}

/** A setting whose control sits under its label (segmented pickers). */
function Field({ label, note, children, last }: { label: string; note?: string; children: React.ReactNode; last?: boolean }) {
  const c = useColors();
  return (
    <View style={[styles.field, !last && { borderBottomWidth: 1.5, borderColor: c.cloud }]}>
      <Text style={[styles.rowLabel, { color: c.ink }]}>{label}</Text>
      {children}
      {note ? <Text style={[styles.note, { color: c.inkMuted }]}>{note}</Text> : null}
    </View>
  );
}

export default function SettingsScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, setProfile, plants, eraseEverything } = usePlantStore();
  const { isPlus, available, restore } = usePlus();
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);

  const roundValue = profile.round.enabled ? (TIMES.find((t) => t.hour === profile.round.hour && t.minute === profile.round.minute)?.label ?? null) : 'Off';

  const restorePurchases = async () => {
    setRestoreMsg('Checking with Apple…');
    const res = await restore();
    setRestoreMsg(res.ok ? (res.isPlus ? 'PlantFam Plus is active. Thank you!' : 'No PlantFam Plus purchase found for this Apple ID.') : res.message);
  };

  const eraseAll = async () => {
    const n = plants.length;
    const first = await confirm(
      'Delete all your data?',
      `This erases ${n} ${n === 1 ? 'plant' : 'plants'}, the whole care diary, diary photos and your settings from this phone. It can’t be undone unless you have a backup.`,
      'Delete everything',
    );
    if (!first) return;
    const second = await confirm('Really delete?', 'Last check: your fam will be gone from this phone.', 'Yes, delete');
    if (!second) return;
    deleteAllPhotos();
    eraseEverything();
    haptics.success();
    router.replace('/onboarding');
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}>
      <View style={styles.header}>
        <GlassButton accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/me'))}>
          <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="m15 18-6-6 6-6" stroke={c.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
        </GlassButton>
      </View>
      <Title>Settings</Title>

      <Section title="Reminders" footer="One reminder a day, and only when a plant is ready for a soil check. Nothing due means no notification.">
        <Field label="Daily plant round" last>
          <Segmented
            label="Daily plant round"
            value={roundValue}
            options={[...TIMES.map((t) => ({ id: t.label, label: t.label })), { id: 'Off', label: 'Off' }]}
            onChange={async (v) => {
              if (v === 'Off') return setProfile({ round: { ...profile.round, enabled: false } });
              const t = TIMES.find((x) => x.label === v)!;
              const ok = Platform.OS === 'web' ? true : await requestPermission();
              setProfile({ round: { enabled: ok, hour: t.hour, minute: t.minute } });
              if (!ok) Alert.alert('Notifications are off', 'Turn on notifications for PlantFam in your iPhone Settings to get the plant round.', [{ text: 'Not now' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]);
            }}
          />
        </Field>
      </Section>

      <Section title="Look and feel">
        <Field label="Appearance">
          <Segmented label="Appearance" value={profile.theme} options={THEMES} onChange={(t) => setProfile({ theme: t })} />
        </Field>
        <Field label="Plant faces" note={FACE_NOTE[profile.faces]}>
          <Segmented
            label="Plant faces"
            value={profile.faces}
            options={(['full', 'gentle', 'off'] as FaceStyle[]).map((f) => ({ id: f, label: f[0].toUpperCase() + f.slice(1) }))}
            onChange={(f) => setProfile({ faces: f })}
          />
        </Field>
        <Field label="Units" last note={profile.units === 'auto' ? `Auto follows your climate: ${profile.climate === 'seattle' ? '°F and inches' : '°C and millimetres'}.` : 'Used for weather, alerts and growing tips.'}>
          <Segmented
            label="Units"
            value={profile.units}
            options={[
              { id: 'auto' as const, label: 'Auto' },
              { id: 'imperial' as const, label: '°F · in' },
              { id: 'metric' as const, label: '°C · mm' },
            ]}
            onChange={(u) => setProfile({ units: u })}
          />
        </Field>
      </Section>

      <Section title="Where you grow" footer="Seasons, feeding pauses and grow-patch tasks follow your climate. We never use your location.">
        <Field label="Climate" last>
          <Segmented
            label="Climate"
            value={profile.climate}
            options={[
              { id: 'seattle' as const, label: 'Seattle' },
              { id: 'accra' as const, label: 'Accra' },
            ]}
            onChange={(v) => setProfile({ climate: v, city: v === 'seattle' ? 'Seattle' : 'Accra' })}
          />
        </Field>
      </Section>

      <DataCard />

      <Section title="PlantFam Plus" footer={restoreMsg ?? undefined}>
        <Row label="PlantFam Plus" value={isPlus ? 'Active ✓' : 'Not active'} onPress={() => router.push('/plus')} />
        <Row label="Restore purchases" onPress={available ? restorePurchases : () => setRestoreMsg('Purchases work in the PlantFam iPhone app.')} chevron={false} last={!isPlus} />
        {isPlus && <Row label="Manage subscription" onPress={() => Linking.openURL(MANAGE_SUBSCRIPTIONS_URL)} last />}
      </Section>

      <Section title="About">
        <Row label="How PlantFam works" onPress={() => router.push('/help')} />
        <Row label="Privacy" onPress={() => router.push('/privacy')} />
        <Row label="Terms of use" onPress={() => Linking.openURL(TERMS_URL)} />
        {SUPPORT_EMAIL ? (
          <Row label="Contact support" value={SUPPORT_EMAIL} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=PlantFam%20${APP_VERSION}`)} />
        ) : (
          <Row label="Contact & support" value={SUPPORT_URL.replace(/^https?:\/\//, '')} onPress={() => Linking.openURL(SUPPORT_URL)} />
        )}
        <Row label="Credits" onPress={() => router.push('/privacy')} />
        <Row label="Version" value={APP_VERSION} last />
      </Section>

      <Section title="Danger zone" footer="Erases everything on this phone and starts fresh. Make a backup first if you might want your fam back. Purchases stay with your Apple ID.">
        <Row label="Delete all my data" danger onPress={eraseAll} chevron={false} last />
      </Section>

      <Label muted style={{ textAlign: 'center' }}>Made with 🌱 in Seattle</Label>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 20 },
  header: { flexDirection: 'row' },
  sectionTitle: { fontFamily: fonts.bodyHeavy, fontSize: 12, letterSpacing: 0.6, paddingHorizontal: 4 },
  group: { borderWidth: 2, borderRadius: 20, overflow: 'hidden' },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14 },
  rowLabel: { flex: 1, fontFamily: fonts.displaySemi, fontSize: 16 },
  rowValue: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  field: { padding: 14, gap: 10 },
  note: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  footer: { fontFamily: fonts.bodyHeavy, fontSize: 12, lineHeight: 17, paddingHorizontal: 4 },
});
