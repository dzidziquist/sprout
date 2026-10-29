import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { GlassButton } from '@/components/GlassButton';
import { AVATAR } from '@/components/HouseholdCard';
import { initial } from '@/engine/household';
import { householdSupported } from '@/lib/household';
import { usePlantStore } from '@/store/plantStore';
import { useColors } from '@/theme/theme';
import { fonts, type } from '@/theme/tokens';

/**
 * Jungle header, in a household only: who shares this jungle, opening the household screen. Two faces
 * at most (the others as "+1"), so the header's plant count keeps its one line.
 */
export function HouseholdButton() {
  const router = useRouter();
  const c = useColors();
  const h = usePlantStore((s) => s.profile.household);
  if (!householdSupported || !h) return null;
  const members = { ...(h.members ?? {}), [h.me]: { name: h.name } };
  const ids = Object.keys(members).sort((a, b) => (a === h.me ? 1 : b === h.me ? -1 : a.localeCompare(b)));
  const more = ids.length - 2;
  return (
    <GlassButton accessibilityLabel={`Household, ${ids.length} ${ids.length === 1 ? 'person' : 'people'}`} onPress={() => router.push('/household')} style={styles.pill}>
      <View style={styles.row}>
        {ids.slice(0, 2).map((id, i) => (
          <View key={id} style={[styles.avatar, { borderColor: c.card, backgroundColor: c[AVATAR[i % AVATAR.length]], marginLeft: i ? -7 : 0 }]}>
            <Text style={[styles.text, { color: c.ink }]}>{initial(members[id]?.name ?? '?')}</Text>
          </View>
        ))}
        {more > 0 && <Text style={[styles.more, { color: c.ink }]}>+{more}</Text>}
      </View>
    </GlassButton>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 6 },
  row: { flexDirection: 'row', alignItems: 'center' },
  avatar: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.display, ...type.footnote },
  more: { fontFamily: fonts.display, ...type.footnote, marginLeft: 4, marginRight: 4 },
});
