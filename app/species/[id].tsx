import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { getSpecies, isOtherId, isSpeciesId } from '@/data/species';
import { LIGHT_FACT, WATER_STYLE } from '@/data/labels';
import { roomsInUse } from '@/engine/light';
import { findWish } from '@/store/plantStore';
import { addHref, homeFor } from '@/lib/plantLinks';
import { useSite } from '@/hooks/useSite';
import { usePhoto, useWiki } from '@/lib/wiki';
import { PhotoCredit, PhotoToggle } from '@/components/PhotoCredit';
import { localizeTemps } from '@/lib/units';
import { useUnits } from '@/hooks/useUnits';
import { wikiNames } from '@/components/AboutCard';
import { GlassButton } from '@/components/GlassButton';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Sticker } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { fonts } from '@/theme/tokens';
import { textOn, useColors } from '@/theme/theme';
import type { SpeciesId } from '@/types';

const ASPCA_URL = 'https://www.aspca.org/pet-care/animal-poison-control/toxic-and-non-toxic-plants';

/**
 * A plant to read about before (or without) adding it: its buddy art and Wikipedia intro, what it needs,
 * where it would suit this home, and Add to my fam or Save for later. Opened from the add list, photo ID
 * and the wishlist. Plants not in the catalogue come as /species/other?name=…&latin=….
 */
export default function SpeciesPage() {
  const params = useLocalSearchParams<{ id: string; name?: string; latin?: string; from?: string }>();
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const units = useUnits();
  const known = isSpeciesId(params.id) && !isOtherId(params.id);
  const speciesId: SpeciesId = known ? (params.id as SpeciesId) : 'other-tropical';
  const given = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  const custom = known ? undefined : { commonName: given(params.name) ?? given(params.latin) ?? '', latinName: given(params.latin) };
  const sp = getSpecies(speciesId);
  const names = wikiNames(speciesId, custom);
  const wiki = useWiki(names.latin, names.common);
  // Our art by default; a credited Wikimedia photo only when asked for (that's when it's fetched).
  const [showPhoto, setShowPhoto] = useState(false);
  const real = usePhoto(wiki?.imageFile, showPhoto);
  const plants = usePlantStore((s) => s.plants);
  const profile = usePlantStore((s) => s.profile);
  const saveWish = usePlantStore((s) => s.saveWish);
  const removeWish = usePlantStore((s) => s.removeWish);
  const site = useSite();
  const saved = findWish(profile.wishlist, { speciesId, custom });
  const close = () => (router.canGoBack() ? router.back() : router.replace('/jungle'));

  const homeLine = homeFor(speciesId, roomsInUse(profile.rooms, plants), site, new Date())?.line;

  const add = () => {
    haptics.tap();
    const href = addHref(speciesId, custom, saved?.id);
    // From the add list, go back to it with this plant picked rather than stacking a second add screen.
    // `pick` changes every time, so picking the same plant twice still registers.
    if (params.from === 'add') return router.dismissTo(`${href}&pick=${Date.now()}` as never);
    // From photo ID or the wishlist: close those first so adding lands on one clean add screen.
    if (router.canDismiss()) router.dismissAll();
    router.push(href as never);
  };
  const toggleWish = () => {
    if (saved) {
      haptics.tap();
      removeWish(saved.id);
    } else {
      haptics.success();
      saveWish({ speciesId, custom });
    }
  };

  const title = known ? sp.commonName : names.common || 'This plant';
  const latinLine = [known ? sp.latinName : names.latin || wiki?.title, wiki?.description].filter(Boolean).join(' · ');
  const tint = c.potTint[sp.artPot];

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 150 }}>
        <View style={[styles.hero, { backgroundColor: tint, borderColor: c.line }]}>
          {real.photo ? (
            <Image source={{ uri: real.photo.src }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel={`Photo of ${title}`} />
          ) : (
            <PlantBuddy speciesId={speciesId} size={180} bg={tint} />
          )}
          {real.loading && <ActivityIndicator style={StyleSheet.absoluteFill} color={c.ink} />}
          {!!wiki?.imageFile && (
            <View style={styles.photoToggle}>
              <PhotoToggle on={showPhoto} onChange={setShowPhoto} />
            </View>
          )}
          <View style={[styles.toolbar, { top: 16 }]}>
            <GlassButton accessibilityLabel="Close" onPress={close}>
              <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6 6 18" stroke={c.ink} strokeWidth={2.8} strokeLinecap="round" /></Svg>
            </GlassButton>
          </View>
        </View>

        {real.photo && (
          <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
            <PhotoCredit photo={real.photo} />
          </View>
        )}
        {showPhoto && !real.loading && !real.photo && (
          <Text style={[styles.small, { color: c.inkMuted, paddingHorizontal: 20, paddingTop: 8 }]}>No photo we can credit for this plant, so here’s our art.</Text>
        )}
        <View style={styles.body}>
          <View style={{ gap: 2 }}>
            <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">{title}</Text>
            {!!latinLine && <Text style={[styles.latin, { color: c.inkMuted }]}>{latinLine}</Text>}
          </View>

          {known && (
            <View style={styles.facts}>
              <Fact top={LIGHT_FACT[sp.defaultLight].short} bottom={LIGHT_FACT[sp.defaultLight].long} bg={c.butter} />
              <Fact top={WATER_STYLE[sp.group].short} bottom={WATER_STYLE[sp.group].long} bg={c.ice} />
              <Fact top={sp.petToxic ? 'Not pet-safe' : 'Pet-safe'} bottom={sp.petToxic ? 'toxic to cats and dogs' : 'cats and dogs'} bg={sp.petToxic ? c.peach : c.mint} />
            </View>
          )}
          {known && (
            <Text style={[styles.small, { color: c.inkMuted }]}>
              Pet safety is our reading of the ASPCA list.{' '}
              <Text accessibilityRole="link" onPress={() => Linking.openURL(ASPCA_URL)} style={{ color: c.leafDeep, textDecorationLine: 'underline' }}>
                Check ASPCA ›
              </Text>
            </Text>
          )}
          {!known && (
            <Text style={[styles.text, { color: c.inkMuted }]}>Not in our plant list yet. When you add it, you’ll pick how it likes its water and it gets the same checks and reminders.</Text>
          )}

          {known && sp.tip && (
            <Sticker drop={0} bg={c.butter} style={{ padding: 12 }}>
              <Text style={[styles.text, { color: textOn(c.butter, c) }]}>{localizeTemps(sp.tip, units)}</Text>
            </Sticker>
          )}

          {wiki && (
            <View style={{ gap: 6 }}>
              <Text style={[styles.text, { color: c.ink }]}>{wiki.extract}</Text>
              <View style={styles.row}>
                <Text style={[styles.small, { color: c.inkMuted }]}>From Wikipedia</Text>
                <Text accessibilityRole="link" onPress={() => Linking.openURL(wiki.url)} style={[styles.link, { color: c.leafDeep }]}>Read more ›</Text>
              </View>
            </View>
          )}

          {homeLine && (
            <View style={[styles.home, { borderColor: c.line }]}>
              <Text style={[styles.small, { color: c.inkMuted }]}>In your home</Text>
              <Text style={[styles.text, { color: c.ink }]}>{homeLine}</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <View style={[styles.actions, { paddingBottom: insets.bottom + 12, backgroundColor: c.bg, borderColor: c.cloud }]}>
        <Button title="Add to my fam" raised bg={c.leaf} onPress={add} style={{ flex: 3, minHeight: 56 }} textStyle={{ fontFamily: fonts.display, fontSize: 18 }} />
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: !!saved }}
          accessibilityLabel={saved ? 'On your wishlist. Tap to remove' : 'Save for later'}
          onPress={toggleWish}
          style={({ pressed }) => [styles.wish, { borderColor: c.line, backgroundColor: saved ? c.bubblegum : c.card }, pressed && { opacity: 0.8 }]}
        >
          <Svg width={20} height={20} viewBox="0 0 24 24">
            <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" stroke={saved ? textOn(c.bubblegum, c) : c.ink} strokeWidth={2.2} strokeLinejoin="round" fill={saved ? textOn(c.bubblegum, c) : 'none'} />
          </Svg>
          <Text style={[styles.wishText, { color: saved ? textOn(c.bubblegum, c) : c.ink }]}>{saved ? 'Saved' : 'Save for later'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function Fact({ top, bottom, bg }: { top: string; bottom: string; bg: string }) {
  const c = useColors();
  const ink = textOn(bg, c);
  return (
    <View style={[styles.fact, { backgroundColor: bg, borderColor: c.line }]}>
      <Text style={[styles.factTop, { color: ink }]} numberOfLines={2}>{top}</Text>
      <Text style={[styles.factBottom, { color: ink }]} numberOfLines={2}>{bottom}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { height: 260, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2.5, overflow: 'hidden' },
  photoToggle: { position: 'absolute', right: 14, bottom: 12 },
  toolbar: { position: 'absolute', left: 16 },
  body: { padding: 20, gap: 14 },
  title: { fontFamily: fonts.display, fontSize: 30, lineHeight: 34 },
  latin: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  facts: { flexDirection: 'row', gap: 8 },
  fact: { flex: 1, borderWidth: 2, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 9, gap: 2 },
  factTop: { fontFamily: fonts.display, fontSize: 15 },
  factBottom: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
  text: { fontFamily: fonts.bodyHeavy, fontSize: 15, lineHeight: 21 },
  small: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  link: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  home: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 16, padding: 12, gap: 2 },
  actions: { position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1.5 },
  wish: { flex: 2, minHeight: 56, borderWidth: 2.5, borderRadius: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  wishText: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
});
