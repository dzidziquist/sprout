import { useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_VERSION, IDEAS_ENDPOINT } from '@/config';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Label, Sticker, Title } from '@/components/ui';
import { buildIdea, IDEA_KINDS, type IdeaKind } from '@/lib/idea';
import * as haptics from '@/lib/haptics';
import { useSheetTop } from '@/lib/sheetTop';
import { usePlantStore } from '@/store/plantStore';
import { fonts, type, space } from '@/theme/tokens';
import { textOn, useColors } from '@/theme/theme';

/**
 * "Suggest a plant or idea": a short form that lands in the maker's Notion, through a small server that
 * holds the Notion key (see server/ideas). Only what's typed here is sent, plus the app and iOS version.
 */
export default function IdeaScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sheetTop = useSheetTop();
  const [kind, setKind] = useState<IdeaKind>('Missing plant');
  const [plant, setPlant] = useState('');
  const [details, setDetails] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const setProfile = usePlantStore((s) => s.setProfile);
  const app = `PlantFam ${APP_VERSION} · ${Platform.OS === 'ios' ? 'iOS' : Platform.OS} ${Platform.Version}`;
  const idea = buildIdea({ kind, plant, details, email, app });
  const tint = { 'Missing plant': c.mint, 'Feature idea': c.butter, 'Something confusing': c.lavender, Bug: c.blush } as const;

  const send = async () => {
    if (!idea.ok || state === 'sending') return;
    haptics.tap();
    setState('sending');
    try {
      const r = await fetch(IDEAS_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(idea.body) });
      if (!r.ok) throw new Error(String(r.status));
      // Remember it on this phone only, so an update that adds it can say thanks.
      const { id } = ((await r.json().catch(() => ({}))) ?? {}) as { id?: unknown };
      if (typeof id === 'string' && /^[0-9a-f-]{32,36}$/i.test(id)) {
        const label = (kind === 'Missing plant' && plant.trim()) || details.trim().split('\n')[0].slice(0, 60);
        const sent = usePlantStore.getState().profile.sentIdeas ?? [];
        setProfile({ sentIdeas: [...sent, { id, kind, label, at: new Date().toISOString() }].slice(-50) });
      }
      haptics.success();
      setState('sent');
    } catch {
      setState('error');
    }
  };

  if (state === 'sent') {
    return (
      <View style={[styles.done, { backgroundColor: c.mint, paddingTop: sheetTop + 40, paddingBottom: insets.bottom + 24 }]}>
        <PlantBuddy speciesId="monstera" size={160} bg={c.mint} />
        <Title size="title1" style={{ textAlign: 'center' }}>Thank you!</Title>
        <Text style={[styles.doneBody, { color: c.ink }]}>
          {email.trim() ? 'Got it. I read every note, and I’ll reply to your email if I have a question.' : 'Got it. I read every note.'}
        </Text>
        <Button title="Done" raised bg={c.card} onPress={() => router.back()} style={{ alignSelf: 'stretch', minHeight: 54 }} textStyle={{ ...type.headline }} />
      </View>
    );
  }

  const field = [styles.field, { borderColor: c.line, backgroundColor: c.card, color: c.ink }];
  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[styles.page, { paddingTop: sheetTop + space.lg, paddingBottom: insets.bottom + 32 }]}
    >
      <View style={{ alignItems: 'center', gap: 4 }}>
        <PlantBuddy speciesId="monstera" size={110} />
        <Title size="title1" style={{ textAlign: 'center' }}>Suggest a plant or idea</Title>
        <Label muted style={{ textAlign: 'center' }}>I read every note. No account needed.</Label>
      </View>

      <View style={styles.group}>
        <Text style={[styles.h, { color: c.ink }]}>What’s it about?</Text>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {IDEA_KINDS.map((k) => {
            const on = k === kind;
            const fill = on ? tint[k] : c.card;
            return (
              <Pressable
                key={k}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => {
                  haptics.tap();
                  setKind(k);
                }}
                style={[styles.chip, { borderColor: c.line, backgroundColor: fill }, on && { boxShadow: `0px 3px 0px ${c.drop}` }]}
              >
                <Text style={[styles.chipText, { color: textOn(fill, c) }]}>{k}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {kind === 'Missing plant' && (
        <View style={styles.group}>
          <Text style={[styles.h, { color: c.ink }]}>Which plant?</Text>
          <TextInput value={plant} onChangeText={setPlant} placeholder="e.g. Dragon fruit" placeholderTextColor={c.inkMuted} style={field} maxLength={80} accessibilityLabel="Which plant" returnKeyType="next" />
        </View>
      )}

      <View style={styles.group}>
        <Text style={[styles.h, { color: c.ink }]}>Tell me more</Text>
        <TextInput
          value={details}
          onChangeText={setDetails}
          placeholder={kind === 'Bug' ? 'What happened, and what did you expect?' : kind === 'Missing plant' ? 'Where you grow it, anything you’d want to know' : 'What would help?'}
          placeholderTextColor={c.inkMuted}
          multiline
          maxLength={2000}
          style={[field, { minHeight: 120, textAlignVertical: 'top' }]}
          accessibilityLabel="Tell me more"
        />
      </View>

      <View style={styles.group}>
        <Text style={[styles.h, { color: c.ink }]}>
          Email <Text style={{ color: c.inkMuted, fontFamily: fonts.bodyHeavy }}>(optional)</Text>
        </Text>
        <TextInput value={email} onChangeText={setEmail} placeholder="Only if you want a reply" placeholderTextColor={c.inkMuted} style={field} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} textContentType="emailAddress" maxLength={120} accessibilityLabel="Email, optional" />
        {idea.emailBad ? <Text style={[styles.note, { color: c.coral }]}>That email doesn’t look quite right.</Text> : null}
      </View>

      <Sticker drop={0} bg={c.cloud} style={styles.sent}>
        <Text style={[styles.note, { color: c.inkMuted }]}>Sent with it: {app}. No plant names, photos or location.</Text>
      </Sticker>

      {state === 'error' && (
        <Sticker drop={0} bg={c.blush} style={styles.sent}>
          <Text style={[styles.note, { color: c.ink }]}>Couldn’t send just now. Check your connection and try again. Your note is still here.</Text>
        </Sticker>
      )}

      <Pressable disabled={!idea.ok || state === 'sending'} onPress={send} accessibilityRole="button" accessibilityState={{ disabled: !idea.ok }} style={({ pressed }) => [styles.send, { backgroundColor: idea.ok ? c.leaf : c.cloud, borderColor: c.line }, idea.ok && { boxShadow: `0px ${pressed ? 1 : 4}px 0px ${c.drop}` }, pressed && { transform: [{ translateY: 3 }] }]}>
        {state === 'sending' ? <ActivityIndicator color={c.ink} /> : <Text style={[styles.sendText, { color: idea.ok ? textOn(c.leaf, c) : c.inkMuted }]}>{state === 'error' ? 'Try again' : 'Send idea'}</Text>}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.xl, gap: 18 },
  group: { gap: 8 },
  h: { fontFamily: fonts.display, ...type.headline },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 14, minHeight: 40, justifyContent: 'center' },
  chipText: { fontFamily: fonts.bodyHeavy, ...type.callout },
  field: { borderWidth: 2, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.body, ...type.body },
  note: { fontFamily: fonts.bodyHeavy, ...type.footnote },
  sent: { padding: 12, borderRadius: 16 },
  send: { borderWidth: 2, borderRadius: 16, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  sendText: { fontFamily: fonts.display, ...type.headline },
  done: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: space.xl },
  doneBody: { fontFamily: fonts.bodyHeavy, ...type.body, textAlign: 'center' },
});
