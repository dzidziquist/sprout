import { PlacePicker } from '@/components/PlacePicker';
import { resolveUnits } from '@/lib/units';
import { useEffect, useState } from 'react';
import { Alert, AppState, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore, type FaceStyle, type Profile } from '@/store/plantStore';
import { useShallow } from 'zustand/react/shallow';
import { GlassButton } from '@/components/GlassButton';
import { Segmented } from '@/components/Segmented';
import { useDataActions } from '@/hooks/useDataActions';
import { AppIconPicker } from '@/components/AppIconPicker';
import { Label, Title } from '@/components/ui';
import { useRewards } from '@/hooks/useRewards';
import { SPOTS } from '@/lib/spots';
import { ensureRoundPermission } from '@/lib/notifications';
import { activeTrip, upcomingTrip } from '@/engine/away';
import { deleteAllPhotos } from '@/lib/photos';
import { cloudReady, cloudSupported, runCloudBackup, useCloudStatus } from '@/lib/cloudBackup';
import { savedWords } from '@/engine/cloudBackup';
import { householdLine, householdSupported, leave, stopSharing } from '@/lib/household';
import * as haptics from '@/lib/haptics';
import { SUPPORT_EMAIL, SUPPORT_URL, TERMS_URL, VERSION_LABEL } from '@/config';
import { fonts, type, space } from '@/theme/tokens';
import { ACCENTS, textOn, useColors } from '@/theme/theme';
import type { Accent } from '@/types';
import { Dropdown } from '@/components/Dropdown';
import { Row, Section } from '@/components/SettingsList';
import { StickerSwitch } from '@/components/StickerSwitch';
import { Glyph } from '@/components/Glyph';

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
const PHOTO_NOTE = {
  weekly: 'Sundays: a nudge to snap anyone without a photo this week. It rides along with the plant round.',
  monthly: 'First Sunday of the month: a nudge to snap anyone without a recent photo, so the diary shows them growing.',
  off: 'No photo nudges. You can still add photos from any plant’s page.',
} as const;

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

/** An on/off setting with PlantFam's sticker switch, its label read with it. */
function SwitchField({ label, sub, value, onChange, note, last, children }: { label: string; sub?: string; value: boolean; onChange: (on: boolean) => void; note?: string; last?: boolean; children?: React.ReactNode }) {
  const c = useColors();
  return (
    <View style={[styles.field, !last && { borderBottomWidth: 1.5, borderColor: c.cloud }]}>
      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.rowLabel, { color: c.ink }]}>{label}</Text>
          {sub ? <Text style={[styles.sub, { color: c.inkMuted }]}>{sub}</Text> : null}
        </View>
        <StickerSwitch label={label} value={value} onChange={onChange} />
      </View>
      {children}
      {note ? <Text style={[styles.note, { color: c.inkMuted }]}>{note}</Text> : null}
    </View>
  );
}

export default function SettingsScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { profile, setProfile, plants, eraseEverything } = usePlantStore(useShallow((s) => ({ profile: s.profile, setProfile: s.setProfile, plants: s.plants, eraseEverything: s.eraseEverything })));
  const rewards = useRewards();
  const data = useDataActions();
  const cloudOn = cloudSupported && !profile.cloudBackup?.off;
  const cloudState = useCloudStatus((s) => s.state);
  // Whether iCloud Drive is on for this phone: asked when Settings opens and when the backup is turned on.
  const [icloud, setIcloud] = useState<boolean | null>(null);
  useEffect(() => {
    if (!cloudOn) return;
    const check = () => cloudReady().then(setIcloud);
    check();
    // Back from turning iCloud Drive on in the iPhone's Settings: the note goes and the backup runs.
    const sub = AppState.addEventListener('change', (s) => s === 'active' && check());
    return () => sub.remove();
  }, [cloudOn]);
  const cloudWaiting = cloudOn && (icloud === false || cloudState === 'waiting');
  const [cloudMsg, setCloudMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const cloudSub = !cloudOn
    ? 'Off'
    : cloudWaiting
      ? 'Waiting for iCloud Drive'
      : cloudState === 'saving'
        ? 'Saving…'
        : profile.cloudBackup?.lastAt
          ? `Weekly · ${savedWords(profile.cloudBackup.lastAt, new Date())}`
          : 'Weekly · first one soon';
  // With iCloud on and ready, "Back up now" saves there; otherwise it hands over a file as before.
  const backUpNow = async () => {
    if (!cloudOn || cloudWaiting) return data.backup();
    setCloudMsg(null);
    const res = await runCloudBackup({ force: true });
    if (res === 'saved') {
      haptics.success();
      setCloudMsg({ text: 'Saved to iCloud.' });
    } else if (res === 'failed') setCloudMsg({ text: 'Couldn’t reach iCloud just now. It tries again next time you open PlantFam.', bad: true });
    else if (res === 'waiting') setIcloud(false);
    else if (!plants.length) setCloudMsg({ text: 'Add a plant first: there’s nothing to save yet.' });
  };
  const idle = (fn: () => void) => () => {
    if (!data.busy) fn();
  };

  const awayNow = activeTrip(profile.trips, new Date());
  const awaySoon = upcomingTrip(profile.trips, new Date());
  const awayValue = awayNow
    ? `Until ${new Date(awayNow.to).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
    : awaySoon
      ? `From ${new Date(awaySoon.from).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : 'Off';
  const roundTime = TIMES.find((t) => t.hour === profile.round.hour && t.minute === profile.round.minute)?.label ?? null;
  // Turning the round on asks for notification permission, and stays off if it's refused.
  const setRound = async (on: boolean, time?: (typeof TIMES)[number]) => {
    if (!on) return setProfile({ round: { ...profile.round, enabled: false } });
    const ok = await ensureRoundPermission();
    setProfile({ round: { enabled: ok, hour: time?.hour ?? profile.round.hour, minute: time?.minute ?? profile.round.minute } });
    if (!ok) Alert.alert('Notifications are off', 'Turn on notifications for PlantFam in your iPhone Settings to get the plant round.', [{ text: 'Not now' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]);
  };

  const eraseAll = async () => {
    const n = plants.length;
    const ok = await confirm(
      'Delete all your data?',
      `This erases ${n} ${n === 1 ? 'plant' : 'plants'}, the whole care diary, diary photos and your settings from this phone. It can’t be undone unless you have a backup.`,
      'Delete everything',
    );
    if (!ok) return;
    // In a household: end it (owner) or leave it (member) first, so this phone doesn't stay half in it.
    const h = usePlantStore.getState().profile.household;
    if (h) {
      try {
        await (h.role === 'owner' ? stopSharing() : leave());
      } catch {
        // Erasing without ending it would leave the household running in iCloud with this phone forgotten.
        Alert.alert('Couldn’t reach iCloud', `Your phone needs to ${h.role === 'owner' ? 'stop sharing' : 'leave the household'} before everything is erased. Try again when you’re online.`);
        return;
      }
    }
    deleteAllPhotos();
    eraseEverything();
    haptics.success();
    router.replace('/onboarding');
  };

  return (
    <ScrollView automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <GlassButton accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/me'))}>
          <Glyph name="back" size={18} color={c.ink} width={2.6} />
        </GlassButton>
      </View>
      <Title>Settings</Title>

      <Section title="Reminders" footer="At most one reminder a day: when a plant is ready for a check, or on photo day. Nothing due means no notification.">
        <SwitchField label="Daily plant round" value={profile.round.enabled} onChange={(on) => setRound(on)}>
          {profile.round.enabled && (
            <Segmented
              label="Plant round time"
              value={roundTime}
              options={TIMES.map((t) => ({ id: t.label, label: t.label }))}
              onChange={(v) => setRound(true, TIMES.find((x) => x.label === v))}
            />
          )}
        </SwitchField>
        <Field label="Progress photos" note={PHOTO_NOTE[profile.photos ?? 'monthly']}>
          <Segmented
            label="Progress photos"
            value={profile.photos ?? 'monthly'}
            options={[
              { id: 'weekly' as const, label: 'Weekly' },
              { id: 'monthly' as const, label: 'Monthly' },
              { id: 'off' as const, label: 'Off' },
            ]}
            onChange={(v) => setProfile({ photos: v })}
          />
        </Field>
        <Row label="Away mode" value={awayValue} onPress={() => router.push('/away')} last />
      </Section>

      <Section title="Look and feel">
        <Field label="Appearance">
          <Segmented label="Appearance" value={profile.theme} options={THEMES} onChange={(t) => setProfile({ theme: t })} />
        </Field>
        {/* A row in the section, like the others: tap to open the colours in place. */}
        <Dropdown
          label="Main colour"
          value={profile.accent ?? 'leaf'}
          tint={c.mint}
          options={(Object.keys(ACCENTS) as Accent[]).map((a) => ({ id: a, label: ACCENTS[a].label, swatch: ACCENTS[a].leaf }))}
          onChange={(a) => setProfile({ accent: a })}
        />
        <Field label="Plant faces" note={FACE_NOTE[profile.faces]}>
          <Segmented
            label="Plant faces"
            value={profile.faces}
            options={(['full', 'gentle', 'off'] as FaceStyle[]).map((f) => ({ id: f, label: f[0].toUpperCase() + f.slice(1) }))}
            onChange={(f) => setProfile({ faces: f })}
          />
        </Field>
        <Field label="Units" last note={profile.units === 'auto' ? `Auto follows your city: ${resolveUnits(profile) === 'imperial' ? '°F and inches' : '°C and millimetres'}.` : 'Used for weather, alerts and growing tips.'}>
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
        <Field label="Your city">
          <PlacePicker value={profile.climate} onPick={(climate, city) => setProfile({ climate, city })} />
        </Field>
        <Field label="Your spots" note="New plants start in your most likely spot: edibles in the garden bed or on the balcony, houseplants indoors or on the windowsill. You can change any plant later.">
          <View style={styles.chips}>
            {SPOTS.map((sp) => {
              const on = (profile.spots ?? []).includes(sp.id);
              return (
                <Pressable
                  key={sp.id}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  onPress={() => {
                    haptics.tap();
                    const cur = profile.spots ?? [];
                    setProfile({ spots: on ? cur.filter((x) => x !== sp.id) : [...cur, sp.id] });
                  }}
                  style={[styles.chip, { borderColor: c.line, backgroundColor: on ? c.ink : c.card }]}
                >
                  <Text style={[styles.chipText, { color: on ? c.bg : c.ink }]}>{sp.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Field>
        <SwitchField
          label="Hydro or LECA too"
          value={!!profile.grows.hydro}
          onChange={(on) => setProfile({ grows: { ...profile.grows, hydro: on } })}
          last
          note={profile.grows.hydro ? 'Adding a plant asks soil, LECA or water up front. Hydro plants get water-line checks and fresh-water reminders.' : 'Growing in LECA or water too? Turn this on to pick it up front when adding plants.'}
        />
      </Section>

      <Section
        title="Your data"
        footer={
          cloudOn
            ? 'Once a week PlantFam saves your plants, care diary and photos to your iCloud, keeping the last four weeks. A new or lost phone gets your fam back. Only you can see it.'
            : data.stale
              ? 'No recent backup. A quick one keeps your fam safe if you lose or switch phones.'
              : 'Your plants live only on this phone: no account, no tracking.'
        }
      >
        {householdSupported && <Row label="Household" sub={householdLine(profile.household)} onPress={() => router.push('/household')} />}
        {cloudSupported && (
          <SwitchField
            label="iCloud backup"
            sub={cloudSub}
            value={cloudOn}
            onChange={(on) => {
              setCloudMsg(null);
              setProfile({ cloudBackup: { ...profile.cloudBackup, off: !on } });
              if (on) runCloudBackup().catch(() => {});
            }}
          >
            {cloudWaiting && (
              <Text style={[styles.warning, { backgroundColor: c.butter, borderColor: c.line, color: textOn(c.butter, c) }]}>
                iCloud Drive is off on this iPhone. Turn it on in Settings → your name → iCloud, and backups start by themselves.
              </Text>
            )}
          </SwitchField>
        )}
        <Row
          label="Back up now"
          value={data.busy === 'backup' || cloudState === 'saving' ? 'Saving…' : cloudOn && !cloudWaiting ? undefined : cloudOn ? 'Save a file' : data.last ? `Last: ${data.last}` : 'Never'}
          onPress={cloudState === 'saving' ? undefined : idle(backUpNow)}
        />
        <Row label="Restore from a backup" value={data.busy === 'restore' ? 'Opening…' : undefined} onPress={cloudSupported ? () => router.push('/restore') : idle(data.restore)} />
        <Row label="Export care diary" value={data.busy === 'csv' ? 'Exporting…' : 'Spreadsheet'} onPress={data.hasPlants ? idle(data.spreadsheet) : undefined} last />
      </Section>
      {(cloudMsg ?? data.msg) && <Text style={[styles.footer, { color: (cloudMsg ?? data.msg)!.bad ? c.warn : c.good, marginTop: -12 }]}>{(cloudMsg ?? data.msg)!.text}</Text>}

      <Section title="Support PlantFam" footer="PlantFam is free for everyone. Rate it, share it, or send an idea, and see the gifts your fam grows into.">
        <Row label="Support PlantFam" value={`${rewards.earned} milestones`} onPress={() => router.push('/support')} last />
      </Section>

      {rewards.icons.unlocked && <AppIconPicker />}

      <Section title="About">
        <Row label="How PlantFam works" onPress={() => router.push('/help')} />
        <Row label="Privacy and credits" onPress={() => router.push('/privacy')} />
        <Row label="Terms of use" onPress={() => Linking.openURL(TERMS_URL)} />
        {SUPPORT_EMAIL ? (
          <Row label="Contact support" value={SUPPORT_EMAIL} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`PlantFam ${VERSION_LABEL}`)}`)} />
        ) : (
          <Row label="Contact and support" value={SUPPORT_URL.replace(/^https?:\/\//, '')} onPress={() => Linking.openURL(SUPPORT_URL)} />
        )}
        <Row label="Version" value={VERSION_LABEL} last />
      </Section>

      <Section title="Erase data" footer="Erases everything on this phone and starts fresh. Make a backup first if you might want your plants back.">
        <Row label="Delete all my data" danger onPress={eraseAll} chevron={false} last />
      </Section>

      <Label muted style={{ textAlign: 'center' }}>Made with 🌱 in Seattle</Label>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.xl, gap: space.xl },
  header: { flexDirection: 'row' },
  rowLabel: { flex: 1, fontFamily: fonts.displaySemi, ...type.body },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  field: { padding: 14, gap: 10 },
  note: { fontFamily: fonts.bodyHeavy, ...type.caption },
  sub: { fontFamily: fonts.bodyHeavy, ...type.footnote },
  warning: { fontFamily: fonts.bodyHeavy, ...type.footnote, borderWidth: 2, borderRadius: 12, padding: 10, overflow: 'hidden' },
  footer: { fontFamily: fonts.bodyHeavy, ...type.caption, paddingHorizontal: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { borderWidth: 2, borderRadius: 16, paddingHorizontal: 12, minHeight: 36, justifyContent: 'center' },
  chipText: { fontFamily: fonts.displaySemi, ...type.callout },
});
