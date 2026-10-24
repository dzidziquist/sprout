import { useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore } from '@/store/plantStore';
import { getSpecies, isOtherId } from '@/data/species';
import { roomsInUse } from '@/engine/light';
import { addHref, homeFor, speciesHref } from '@/lib/plantLinks';
import { useSite } from '@/hooks/useSite';
import { wikiNames } from '@/components/AboutCard';
import { GlassButton } from '@/components/GlassButton';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Title } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { fonts } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import type { WishItem } from '@/types';
import { Glyph } from '@/components/Glyph';

/** One shared empty list, so the store selector doesn't hand back a new array every render. */
const NO_WISHES: WishItem[] = [];

/** Plants to get one day: not in the jungle, so no checks or streak. Each one can be read about, noted, added or dropped. */
export default function WishlistScreen() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const wishlist = usePlantStore((s) => s.profile.wishlist ?? NO_WISHES);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/jungle'));

  return (
    <ScrollView
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
      style={{ backgroundColor: c.bg }}
      contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40 }]}
    >
      <View style={styles.toolbar}>
        <GlassButton accessibilityLabel="Close" onPress={close}>
          <Glyph name="close" size={16} color={c.ink} width={2.8} />
        </GlassButton>
      </View>
      <View style={{ gap: 4 }}>
        <Title>Wishlist</Title>
        <Text style={[styles.sub, { color: c.inkMuted }]}>Plants to get one day. They join your jungle when you add them.</Text>
      </View>
      {wishlist.length === 0 ? (
        <View style={[styles.empty, { borderColor: c.line }]}>
          <Text style={[styles.sub, { color: c.ink }]}>Nothing saved yet. Tap ⓘ on any plant when adding, or Read about it after a photo ID, then Save for later.</Text>
          <Button title="Find a plant" bg={c.leaf} raised onPress={() => router.replace('/add')} style={{ minHeight: 50 }} />
        </View>
      ) : (
        [...wishlist].reverse().map((w) => <WishCard key={w.id} wish={w} />)
      )}
    </ScrollView>
  );
}

function WishCard({ wish }: { wish: WishItem }) {
  const c = useColors();
  const router = useRouter();
  const plants = usePlantStore((s) => s.plants);
  const rooms = usePlantStore((s) => s.profile.rooms);
  const site = useSite();
  const updateWish = usePlantStore((s) => s.updateWish);
  const removeWish = usePlantStore((s) => s.removeWish);
  const [note, setNote] = useState(wish.note ?? '');
  // Closing the list (or tapping Add) mid-edit unmounts the card without a blur: save what was typed then too.
  const typed = useRef(note);
  typed.current = note;
  useEffect(
    () => () => {
      if (typed.current !== (wish.note ?? '')) updateWish(wish.id, { note: typed.current });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const other = isOtherId(wish.speciesId);
  const sp = getSpecies(wish.speciesId);
  const names = wikiNames(wish.speciesId, wish.custom);
  const title = other ? names.common : sp.commonName;
  const home = homeFor(wish.speciesId, roomsInUse(rooms, plants), site, new Date());
  const homeLine = !home ? null : home.suits ? `Would suit your ${home.suits.toLowerCase()}` : 'No great spot in your rooms yet';
  const open = () => router.push(speciesHref(wish.speciesId, wish.custom) as never);
  const add = () => {
    haptics.tap();
    router.replace(addHref(wish.speciesId, wish.custom, wish.id) as never);
  };

  return (
    <View style={[styles.card, { borderColor: c.line, backgroundColor: c.card, boxShadow: `0px 4px 0px ${c.drop}` }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Read about ${title}`}
        // One VoiceOver element: removing is offered as an action on it.
        accessibilityActions={[{ name: 'remove', label: `Remove ${title} from wishlist` }]}
        onAccessibilityAction={(e) => {
          if (e.nativeEvent.actionName !== 'remove') return;
          haptics.tap();
          removeWish(wish.id);
        }}
        onPress={open}
        style={({ pressed }) => [styles.head, pressed && { opacity: 0.75 }]}
      >
        <View style={[styles.thumb, { borderColor: c.line, backgroundColor: c.potTint[sp.artPot], alignItems: 'center', justifyContent: 'center' }]}>
          <PlantBuddy speciesId={wish.speciesId} size={50} bg={c.potTint[sp.artPot]} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.name, { color: c.ink }]} numberOfLines={1}>{title}</Text>
          {!!(other ? names.latin : sp.latinName) && <Text style={[styles.small, { color: c.inkMuted }]} numberOfLines={1}>{other ? names.latin : sp.latinName}</Text>}
          {homeLine && <Text style={[styles.small, { color: c.ink }]}>{homeLine}</Text>}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Remove ${title} from wishlist`}
          hitSlop={10}
          onPress={() => {
            haptics.tap();
            removeWish(wish.id);
          }}
          style={[styles.remove, { borderColor: c.line }]}
        >
          <Glyph name="close" size={12} color={c.ink} width={3.2} />
        </Pressable>
      </Pressable>
      <TextInput
        value={note}
        onChangeText={setNote}
        onBlur={() => updateWish(wish.id, { note })}
        placeholder="Add a note: where, price…"
        placeholderTextColor={c.inkMuted}
        maxLength={200}
        accessibilityLabel={`Note for ${title}`}
        style={[styles.note, { backgroundColor: c.cloud, color: c.ink }]}
      />
      <Button title="Got it! Add to my fam" bg={c.leaf} onPress={add} style={{ minHeight: 46 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 14 },
  toolbar: { flexDirection: 'row' },
  sub: { fontFamily: fonts.bodyHeavy, fontSize: 15, lineHeight: 21 },
  empty: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 20, padding: 16, gap: 12 },
  card: { borderWidth: 2.5, borderRadius: 22, padding: 12, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 60, height: 60, borderRadius: 14, borderWidth: 2, overflow: 'hidden' },
  name: { fontFamily: fonts.display, fontSize: 18 },
  small: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  remove: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  note: { minHeight: 42, borderRadius: 12, paddingHorizontal: 12, fontFamily: fonts.bodyHeavy, fontSize: 14 },
});
