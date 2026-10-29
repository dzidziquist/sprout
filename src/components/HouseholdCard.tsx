import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlantStore } from '@/store/plantStore';
import { initial, othersLately } from '@/engine/household';
import { Sticker } from '@/components/ui';
import { fonts, type } from '@/theme/tokens';
import { textOn, useColors } from '@/theme/theme';

const AVATAR = ['butter', 'ice', 'peach', 'lavender', 'mint'] as const;

/**
 * On Today, in a household: who's in, and what the others did lately ("Ama watered Monty and added a
 * photo of Queenie."), so nobody waters twice. Taps through to the household.
 */
export function HouseholdCard({ now }: { now: Date }) {
  const c = useColors();
  const router = useRouter();
  const household = usePlantStore((s) => s.profile.household);
  const plants = usePlantStore((s) => s.plants);
  const events = usePlantStore((s) => s.events);
  if (!household) return null;
  const members = { ...(household.members ?? {}), [household.me]: { name: household.name } };
  const ids = Object.keys(members).sort((a, b) => (a === household.me ? 1 : b === household.me ? -1 : a.localeCompare(b)));
  const line = othersLately({ plants, events, members }, household.me, now);
  const owner = household.role === 'owner' ? household.name : (household.owner && members[household.owner]?.name) || 'The household';
  const bg = line ? c.butter : c.card;
  const ink = textOn(bg, c);

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${owner}’s jungle. ${line ?? 'Nothing from the others today yet.'}`} onPress={() => router.push('/household')}>
      <Sticker drop={3} bg={bg} style={styles.card}>
        <View style={styles.avatars}>
          {ids.slice(0, 4).map((id, i) => (
            <View key={id} style={[styles.avatar, { borderColor: c.line, backgroundColor: c[AVATAR[i % AVATAR.length]], marginLeft: i ? -8 : 0 }]}>
              <Text style={[styles.avatarText, { color: c.ink }]}>{initial(members[id]?.name ?? '?')}</Text>
            </View>
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: ink }]}>{owner}’s jungle</Text>
          <Text style={[styles.line, { color: ink }]}>{line ?? 'Nothing from the others today yet.'}</Text>
        </View>
      </Sticker>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  avatars: { flexDirection: 'row' },
  avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.display, ...type.footnote },
  title: { fontFamily: fonts.display, ...type.headline },
  line: { fontFamily: fonts.bodyHeavy, ...type.footnote },
});
