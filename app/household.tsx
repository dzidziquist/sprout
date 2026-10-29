import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore } from '@/store/plantStore';
import { GlassButton } from '@/components/GlassButton';
import { Glyph } from '@/components/Glyph';
import { Row, Section } from '@/components/SettingsList';
import { Button, Sticker, Title } from '@/components/ui';
import { initial } from '@/engine/household';
import { leave, people as fetchPeople, removePerson, startAndInvite, stopSharing, syncHousehold, useHouseholdStatus } from '@/lib/household';
import type { Person } from '../modules/household';
import * as haptics from '@/lib/haptics';
import { fonts, type, space } from '@/theme/tokens';
import { textOn, useColors } from '@/theme/theme';

const AVATAR = ['butter', 'ice', 'peach', 'lavender', 'mint'] as const;

/** Household sharing: start one and invite (owner), see who's in, remove someone, leave or stop. */
export default function HouseholdScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const household = usePlantStore((s) => s.profile.household);
  const plantCount = usePlantStore((s) => s.plants.length);
  const status = useHouseholdStatus();
  const [name, setName] = useState(household?.name ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<Person[] | null>(null);

  const refresh = useCallback(() => {
    if (!usePlantStore.getState().profile.household) return setList(null);
    void syncHousehold();
    fetchPeople()
      .then(setList)
      .catch(() => setList([]));
  }, []);
  useFocusEffect(refresh);

  const run = async (fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      // Native errors arrive wrapped ("Calling the 'invite' function has failed → Caused by: …"): just the reason.
      const message = ((e as Error)?.message ?? '').split('Caused by:').pop()?.trim();
      setError(message || 'Couldn’t reach iCloud. Try again in a moment.');
    } finally {
      setBusy(false);
      // Even after a failure: starting the household may have worked before the sharing sheet didn't.
      refresh();
    }
  };

  const invite = () => {
    if (!name.trim()) return setError('Add the name your household should call you first.');
    haptics.tap();
    void run(() => startAndInvite(name));
  };

  const confirmStop = () =>
    Alert.alert('Stop sharing?', 'Every plant stays on your phone. The others keep a copy of the jungle as it is now, but it stops updating.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Stop sharing', style: 'destructive', onPress: () => run(stopSharing) },
    ]);

  const confirmLeave = () => {
    const back = household?.aside?.plants.length ?? 0;
    Alert.alert('Leave the household?', `The household’s plants leave this phone${back ? `, and your own ${back} ${back === 1 ? 'plant comes' : 'plants come'} back` : ''}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: () => run(leave) },
    ]);
  };

  const confirmRemove = (p: Person) =>
    Alert.alert(`Take ${p.name} out?`, `${p.name} keeps a copy of the jungle as it is now, but stops seeing your changes.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => run(() => removePerson(p.id)) },
    ]);

  const header = (
    <View style={{ flexDirection: 'row' }}>
      <GlassButton accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/me'))}>
        <Glyph name="back" size={18} color={c.ink} width={2.6} />
      </GlassButton>
    </View>
  );
  const nameField = (
    <View style={{ gap: 6 }}>
      <Text style={[styles.caps, { color: c.inkMuted }]}>WHAT SHOULD YOUR HOUSEHOLD CALL YOU?</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        placeholderTextColor={c.inkMuted}
        autoCapitalize="words"
        autoCorrect={false}
        maxLength={30}
        returnKeyType="done"
        accessibilityLabel="Your name in the household"
        style={[styles.input, { borderColor: c.line, backgroundColor: c.card, color: c.ink }]}
      />
    </View>
  );
  const footnote = error ?? status.error;

  // Not shared yet: what it is, and the invite.
  if (!household) {
    return (
      <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        {header}
        <Title>Share your jungle</Title>
        <Sticker drop={3} bg={c.mint} style={{ padding: 16, gap: 8 }}>
          <Text style={[styles.h3, { color: textOn(c.mint, c) }]}>Look after your plants together</Text>
          <Text style={[styles.body, { color: textOn(c.mint, c) }]}>
            Everyone sees the same plants and the same round. When one of you checks a plant, it’s done for all of you: no plant gets watered twice. The streak is the household’s.
          </Text>
        </Sticker>
        <Section title="How it works" footer="They need PlantFam and iCloud. Only you can invite people.">
          <Row label="Photos and the care diary are shared" chevron={false} />
          <Row label="Each phone keeps its own reminder time" chevron={false} />
          <Row label="Shared through iCloud, not our servers" chevron={false} last />
        </Section>
        {nameField}
        <Button title={busy ? 'Setting up…' : 'Invite someone'} raised bg={c.leaf} onPress={invite} style={{ minHeight: 56 }} />
        <Text style={[styles.foot, { color: footnote ? c.warn : c.inkMuted }]} accessibilityLiveRegion="polite">
          {footnote ?? `Sends a link by Messages, Mail or anything you like. Your ${plantCount} ${plantCount === 1 ? 'plant goes' : 'plants go'} up to iCloud first.`}
        </Text>
      </ScrollView>
    );
  }

  const owner = household.role === 'owner';
  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      {header}
      <Title>Household</Title>
      <Section title="People" footer={status.syncing ? 'Syncing…' : footnote ?? undefined}>
        {list === null ? (
          <Row label="Looking in iCloud…" chevron={false} last />
        ) : list.length === 0 ? (
          <Row label={owner ? 'Nobody yet: invite someone below' : 'Couldn’t load who’s in'} chevron={false} last />
        ) : (
          list.map((p, i) => (
            <View key={p.id || `pending-${i}`} style={[styles.person, i < list.length - 1 && { borderBottomWidth: 1.5, borderColor: c.cloud }]}>
              <View style={[styles.avatar, { borderColor: c.line, backgroundColor: p.status === 'pending' ? c.cloud : c[AVATAR[i % AVATAR.length]], borderStyle: p.status === 'pending' ? 'dashed' : 'solid' }]}>
                <Text style={[styles.avatarText, { color: c.ink }]}>{p.status === 'pending' ? '?' : initial(p.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.personName, { color: c.ink }]}>{p.name}</Text>
                <Text style={[styles.foot, { color: c.inkMuted, paddingHorizontal: 0 }]}>{p.owner ? (p.me ? 'Owner · that’s you' : 'Owner') : p.status === 'pending' ? 'Hasn’t joined yet' : p.me ? 'That’s you' : 'Looks after the jungle'}</Text>
              </View>
              {/* Pending invites are cancelled in Apple's sharing sheet ("Invite someone"): they have no id here yet. */}
              {owner && !p.owner && p.status !== 'pending' && !!p.id && (
                <Text accessibilityRole="button" onPress={() => confirmRemove(p)} style={[styles.action, { color: c.inkMuted }]}>
                  Remove
                </Text>
              )}
            </View>
          ))
        )}
      </Section>
      {owner && <Button title={busy ? 'Opening…' : 'Invite or manage invites'} bg={c.card} onPress={invite} style={{ minHeight: 50 }} />}
      {nameField}
      {name.trim() !== household.name && !!name.trim() && (
        <Button
          title="Save name"
          bg={c.butter}
          onPress={() => {
            usePlantStore.getState().setProfile({ household: { ...household, name: name.trim() } });
            void syncHousehold();
          }}
          style={{ minHeight: 48 }}
        />
      )}
      <Section title="This phone" footer={owner ? 'Stop sharing keeps every plant on your phone. The others keep a copy of the jungle as it is now.' : 'Leaving gives back the plants you had before joining.'}>
        <Row label={owner ? 'Stop sharing' : 'Leave the household'} danger chevron={false} onPress={owner ? confirmStop : confirmLeave} last />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.xl, gap: space.xl },
  h3: { fontFamily: fonts.display, ...type.title3 },
  body: { fontFamily: fonts.bodyHeavy, ...type.body },
  caps: { fontFamily: fonts.bodyHeavy, ...type.caption, letterSpacing: 0.6, paddingHorizontal: 4 },
  input: { borderWidth: 2, borderRadius: 16, minHeight: 50, paddingHorizontal: 14, fontFamily: fonts.bodyHeavy, ...type.body },
  foot: { fontFamily: fonts.bodyHeavy, ...type.caption, paddingHorizontal: 4 },
  person: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.display, ...type.headline },
  personName: { fontFamily: fonts.displaySemi, ...type.body },
  action: { fontFamily: fonts.bodyHeavy, ...type.callout, padding: 8 },
});
