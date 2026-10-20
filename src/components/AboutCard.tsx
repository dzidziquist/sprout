import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { isOtherId, speciesOf } from '@/data/species';
import { useWiki } from '@/lib/wiki';
import * as haptics from '@/lib/haptics';
import { Sticker } from '@/components/ui';
import { fonts } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import type { Plant } from '@/types';

/**
 * "About <species>" on a plant's page: Wikipedia's intro and photo, folded to one row until tapped.
 * Whether it starts open is remembered for every plant. Hidden when Wikipedia has nothing.
 */
export function AboutCard({ plant }: { plant: Plant }) {
  const c = useColors();
  const species = speciesOf(plant);
  // "Other" plants are only looked up by the names the person gave them, never the generic group name.
  const other = isOtherId(plant.speciesId);
  const latin = other ? plant.custom?.latinName ?? '' : species.latinName;
  const common = other ? plant.custom?.commonName ?? '' : species.commonName;
  const wiki = useWiki(latin, common);
  const open = usePlantStore((s) => !!s.profile.aboutOpen);
  const setProfile = usePlantStore((s) => s.setProfile);
  if (!wiki || (!latin && !common)) return null;

  const toggle = () => {
    haptics.tap();
    setProfile({ aboutOpen: !open });
  };
  const subtitle = [latin || wiki.title, wiki.description].filter(Boolean).join(' · ');

  return (
    <Sticker drop={3} style={{ padding: 0, overflow: 'hidden' }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`About ${common || wiki.title}`}
        onPress={toggle}
        style={({ pressed }) => [styles.head, pressed && { opacity: 0.75 }]}
      >
        {wiki.photo ? (
          <Image source={{ uri: wiki.photo }} style={[styles.thumb, { borderColor: c.line }]} contentFit="cover" accessibilityElementsHidden />
        ) : (
          <View style={[styles.thumb, { borderColor: c.line, backgroundColor: c.mint }]} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: c.ink }]} numberOfLines={1}>About {common || wiki.title}</Text>
          <Text style={[styles.sub, { color: c.inkMuted }]} numberOfLines={1}>{subtitle}</Text>
        </View>
        <Svg width={18} height={18} viewBox="0 0 24 24" style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <Path d="m6 9 6 6 6-6" stroke={c.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </Svg>
      </Pressable>
      {open && (
        <View style={[styles.body, { borderColor: c.cloud }]}>
          {wiki.photo && <Image source={{ uri: wiki.photo }} style={[styles.photo, { borderColor: c.line }]} contentFit="cover" accessibilityLabel={`Photo of ${wiki.title}`} />}
          <Text style={[styles.extract, { color: c.ink }]} numberOfLines={8}>{wiki.extract}</Text>
          <View style={styles.foot}>
            <Text style={[styles.sub, { color: c.inkMuted }]}>From Wikipedia</Text>
            <Text accessibilityRole="link" onPress={() => Linking.openURL(wiki.url)} style={[styles.more, { color: c.leafDeep }]}>
              Read more ›
            </Text>
          </View>
        </View>
      )}
    </Sticker>
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 10, minHeight: 60 },
  thumb: { width: 40, height: 40, borderRadius: 10, borderWidth: 2 },
  title: { fontFamily: fonts.display, fontSize: 17 },
  sub: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  body: { paddingHorizontal: 14, paddingBottom: 14, paddingTop: 12, gap: 10, borderTopWidth: 2 },
  photo: { width: '100%', height: 170, borderRadius: 14, borderWidth: 2 },
  extract: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21 },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  more: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
});
