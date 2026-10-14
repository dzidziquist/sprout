import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore } from '@/store/plantStore';
import { moodFor } from '@/engine/careEngine';
import { SPECIES } from '@/data/species';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Label, Sticker, Title } from '@/components/ui';
import { colors, fonts, potTint } from '@/theme/tokens';
import type { Mood } from '@/types';

const BADGE: Record<Mood, { text: string; bg: string }> = {
  thirsty: { text: 'Check me', bg: colors.peach },
  happy: { text: 'Happy', bg: colors.leaf },
  snoozing: { text: 'Resting', bg: colors.lavender },
};

export default function JungleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { plants, profile } = usePlantStore();
  const now = new Date();
  const potted = plants.filter((p) => !p.rooting);
  const rooms = new Set(potted.map((p) => p.room).filter(Boolean));

  return (
    <ScrollView contentContainerStyle={[styles.page, { paddingTop: insets.top + 16, paddingBottom: 130 }]}>
      <View>
        <Title>My jungle</Title>
        <Label muted>
          {potted.length} plants · {rooms.size} {rooms.size === 1 ? 'spot' : 'spots'}
        </Label>
      </View>
      <View style={styles.grid}>
        {potted.map((p) => {
          const mood = moodFor(p, now);
          return (
            <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`${p.name} details`} onPress={() => router.push(`/plant/${p.id}`)} style={styles.card}>
            <Sticker>
              <View style={[styles.art, { backgroundColor: potTint[p.potColor], borderTopLeftRadius: 20, borderTopRightRadius: 20 }]}>
                <PlantBuddy speciesId={p.speciesId} mood={mood} pot={p.potColor} size={96} bg={potTint[p.potColor]} faces={profile.faces} />
                <View style={[styles.badge, { backgroundColor: BADGE[mood].bg }]}>
                  <Text style={styles.badgeText}>{BADGE[mood].text}</Text>
                </View>
              </View>
              <View style={styles.meta}>
                <Text style={styles.name}>{p.name}</Text>
                <Text style={styles.kind}>{SPECIES[p.speciesId].commonName}</Text>
              </View>
            </Sticker>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 16, backgroundColor: colors.white },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47.5%' },
  art: { height: 104, alignItems: 'center', justifyContent: 'flex-end', borderBottomWidth: 2, borderColor: colors.ink },
  badge: { position: 'absolute', top: 8, left: 8, borderWidth: 2, borderColor: colors.ink, borderRadius: 13, paddingHorizontal: 8, height: 26, justifyContent: 'center' },
  badgeText: { fontFamily: fonts.bodyHeavy, fontSize: 11, color: colors.ink },
  meta: { paddingHorizontal: 12, paddingVertical: 8 },
  name: { fontFamily: fonts.displaySemi, fontSize: 17, color: colors.ink },
  kind: { fontFamily: fonts.bodyHeavy, fontSize: 12, color: colors.inkMuted },
});
