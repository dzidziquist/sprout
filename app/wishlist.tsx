import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { getSpecies, isOtherId } from '@/data/species';
import { bestHome, lightNeed, roomsInUse } from '@/engine/light';
import { coordsFor } from '@/lib/weather';
import { useWiki } from '@/lib/wiki';
import { wikiNames } from '@/components/AboutCard';
import { GlassButton } from '@/components/GlassButton';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Title } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { fonts } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import type { WishItem } from '@/types';

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
          <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6 6 18" stroke={c.ink} strokeWidth={2.8} strokeLinecap="round" /></Svg>
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
  const profile = usePlantStore((s) => s.profile);
  const updateWish = usePlantStore((s) => s.updateWish);
  const removeWish = usePlantStore((s) => s.removeWish);
  const [note, setNote] = useState(wish.note ?? '');
  const other = isOtherId(wish.speciesId);
  const sp = getSpecies(wish.speciesId);
  const names = wikiNames(wish.speciesId, wish.custom);
  const wiki = useWiki(names.latin, names.common);
  const title = other ? names.common : sp.commonName;
  const home = other ? null : bestHome(lightNeed({ speciesId: wish.speciesId }), roomsInUse(profile.rooms, plants), coordsFor(profile.climate).lat, new Date());
  const homeLine = !home ? null : 'words' in home ? `Would suit your ${home.room.toLowerCase()}` : home.dim ? 'A bit dark for your rooms' : 'More sun than it likes in your rooms';
  const open = () =>
    router.push(other ? `/species/other?name=${encodeURIComponent(names.common)}&latin=${encodeURIComponent(names.latin)}` : `/species/${wish.speciesId}`);
  const add = () => {
    haptics.tap();
    const href = other ? `/add?other=1&name=${encodeURIComponent(names.common)}&latin=${encodeURIComponent(names.latin)}&wish=${wish.id}` : `/add?species=${wish.speciesId}&wish=${wish.id}`;
    router.replace(href as never);
  };

  return (
    <View style={[styles.card, { borderColor: c.line, backgroundColor: c.card, boxShadow: `0px 4px 0px ${c.drop}` }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Read about ${title}`} onPress={open} style={({ pressed }) => [styles.head, pressed && { opacity: 0.75 }]}>
        {wiki?.photo ? (
          <Image source={{ uri: wiki.photo }} style={[styles.thumb, { borderColor: c.line }]} contentFit="cover" accessibilityElementsHidden />
        ) : (
          <View style={[styles.thumb, { borderColor: c.line, backgroundColor: c.potTint[sp.artPot], alignItems: 'center', justifyContent: 'center' }]}>
            <PlantBuddy speciesId={wish.speciesId} size={50} bg={c.potTint[sp.artPot]} />
          </View>
        )}
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
          <Svg width={12} height={12} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6 6 18" stroke={c.ink} strokeWidth={3.2} strokeLinecap="round" /></Svg>
        </Pressable>
      </Pressable>
      <TextInput
        value={note}
        onChangeText={setNote}
        onEndEditing={() => updateWish(wish.id, { note })}
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
