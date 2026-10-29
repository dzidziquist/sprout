import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore } from '@/store/plantStore';
import { Button, Title } from '@/components/ui';
import { initial } from '@/engine/household';
import { dismissInvite, join, pendingInvite } from '@/lib/household';
import type { Invite } from '../modules/household';
import * as haptics from '@/lib/haptics';
import { fonts, type, space } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

/** "Join Ama's jungle?": opened when someone taps a household invite. */
export default function JoinScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const household = usePlantStore((s) => s.profile.household);
  const ownPlants = usePlantStore((s) => s.plants.length);
  const [invite, setInvite] = useState<Invite | null | undefined>(undefined);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    pendingInvite().then(setInvite);
  }, []);

  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const who = invite?.ownerName || 'Someone';
  const title = invite?.title || `${who}’s jungle`;

  const accept = async () => {
    if (!invite || busy) return;
    if (!name.trim()) return setError('Add the name your household should call you.');
    setBusy(true);
    setError(null);
    try {
      await join(invite, name);
      haptics.success();
      router.replace('/');
    } catch (e) {
      setError((e as Error)?.message || 'Couldn’t join just now. Try again in a moment.');
      setBusy(false);
    }
  };

  if (invite === undefined) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg }]}>
        <ActivityIndicator color={c.ink} />
      </View>
    );
  }

  if (!invite || household) {
    return (
      <View style={[styles.center, { backgroundColor: c.bg, padding: space.xl, gap: space.lg }]}>
        <Title style={{ textAlign: 'center' }}>{household ? 'Already in a household' : 'No invite here'}</Title>
        <Text style={[styles.body, { color: c.ink, textAlign: 'center' }]}>
          {household ? 'Leave your household (Me → Household) before joining another one.' : 'That invite has been used or cancelled. Ask for a new one.'}
        </Text>
        <Button
          title="OK"
          bg={c.card}
          onPress={() => {
            dismissInvite();
            close();
          }}
          style={{ minHeight: 50, alignSelf: 'stretch' }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={[styles.avatar, { borderColor: c.line, backgroundColor: c.butter }]}>
        <Text style={[styles.avatarText, { color: c.ink }]}>{initial(who)}</Text>
      </View>
      <Title style={{ textAlign: 'center' }}>Join {title}?</Title>
      <Text style={[styles.body, { color: c.ink, textAlign: 'center' }]}>You’ll share the plants, the round and the streak. When one of you checks a plant, it’s done for everyone.</Text>
      <View style={{ gap: 6, alignSelf: 'stretch' }}>
        <Text style={[styles.caps, { color: c.inkMuted }]}>WHAT SHOULD THEY CALL YOU?</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={c.inkMuted}
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={30}
          autoFocus
          returnKeyType="join"
          onSubmitEditing={accept}
          accessibilityLabel="Your name in the household"
          style={[styles.input, { borderColor: c.line, backgroundColor: c.card, color: c.ink }]}
        />
      </View>
      <Button title={busy ? 'Joining…' : 'Join'} raised bg={c.leaf} onPress={accept} style={{ minHeight: 56, alignSelf: 'stretch' }} />
      <Button
        title="Not now"
        bg={c.card}
        onPress={() => {
          dismissInvite();
          close();
        }}
        style={{ minHeight: 48, alignSelf: 'stretch' }}
      />
      <Text style={[styles.foot, { color: error ? c.warn : c.inkMuted }]} accessibilityLiveRegion="polite">
        {error ??
          (ownPlants
            ? `Your own ${ownPlants} ${ownPlants === 1 ? 'plant stays' : 'plants stay'} on this phone, put aside. Leave any time to get ${ownPlants === 1 ? 'it' : 'them'} back.`
            : 'You can leave any time from Me → Household.')}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.xl, gap: space.lg, alignItems: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.display, ...type.title1 },
  body: { fontFamily: fonts.bodyHeavy, ...type.body },
  caps: { fontFamily: fonts.bodyHeavy, ...type.caption, letterSpacing: 0.6, paddingHorizontal: 4 },
  input: { borderWidth: 2, borderRadius: 16, minHeight: 50, paddingHorizontal: 14, fontFamily: fonts.bodyHeavy, ...type.body },
  foot: { fontFamily: fonts.bodyHeavy, ...type.caption, textAlign: 'center' },
});
