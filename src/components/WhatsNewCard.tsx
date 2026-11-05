import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Sticker } from '@/components/ui';
import { WHATS_NEW } from '@/data/whatsNew';
import { markSeen, whatsNewFor } from '@/lib/whatsNew';
import * as haptics from '@/lib/haptics';
import { usePlantStore } from '@/store/plantStore';
import { textOn, useColors } from '@/theme/theme';
import { fonts, type } from '@/theme/tokens';

/**
 * Shown once on Today after an update brings something new: "New in PlantFam", or "Your idea is in!"
 * when this phone suggested one of the things in it. Everything comes with the app; nothing is fetched.
 */
export function WhatsNewCard({ now }: { now: Date }) {
  const c = useColors();
  const seen = usePlantStore((s) => s.profile.whatsNewSeen);
  const sent = usePlantStore((s) => s.profile.sentIdeas);
  const setProfile = usePlantStore((s) => s.setProfile);
  const { items, yours, firstRun } = whatsNewFor(WHATS_NEW, seen, sent, now);

  // A new install starts with everything seen, so it isn't greeted with old news.
  useEffect(() => {
    if (firstRun) setProfile({ whatsNewSeen: markSeen([], WHATS_NEW) });
  }, [firstRun, setProfile]);

  if (!items.length) return null;
  const mine = yours.length > 0;
  const bg = mine ? c.mint : c.lavender;
  const ink = textOn(bg, c);
  const dismiss = () => {
    haptics.tap();
    setProfile({ whatsNewSeen: markSeen(seen, items) });
  };
  const shown = [...yours, ...items.filter((i) => !yours.includes(i))].slice(0, 4);
  const more = items.length - shown.length;

  return (
    <Sticker drop={3} bg={bg} style={styles.card}>
      <View style={styles.row}>
        <PlantBuddy speciesId="monstera" size={64} bg={bg} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.title, { color: ink }]}>{mine ? 'Your idea is in!' : 'New in PlantFam'}</Text>
          {mine && <Text style={[styles.body, { color: ink }]}>Thanks for suggesting it. It’s in this update.</Text>}
        </View>
      </View>
      <View style={{ gap: 6 }}>
        {shown.map((i) => (
          <View key={i.id} style={styles.item}>
            <View style={[styles.tag, { backgroundColor: c.card, borderColor: c.line }]}>
              <Text style={[styles.tagText, { color: c.ink }]}>{yours.includes(i) ? 'Yours' : i.kind === 'plant' ? 'New plant' : i.kind === 'fix' ? 'Fixed' : 'New'}</Text>
            </View>
            <Text style={[styles.body, { color: ink, flex: 1 }]}>{i.text}</Text>
          </View>
        ))}
        {more > 0 && <Text style={[styles.body, { color: ink }]}>…and {more} more.</Text>}
      </View>
      <Pressable accessibilityRole="button" onPress={dismiss} style={({ pressed }) => [styles.ok, { borderColor: c.line, backgroundColor: c.card }, pressed && { opacity: 0.7 }]}>
        <Text style={[styles.okText, { color: c.ink }]}>Nice!</Text>
      </Pressable>
    </Sticker>
  );
}

const styles = StyleSheet.create({
  card: { padding: 14, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontFamily: fonts.display, ...type.title3 },
  body: { fontFamily: fonts.bodyHeavy, ...type.callout },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tag: { borderWidth: 2, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  tagText: { fontFamily: fonts.bodyHeavy, ...type.caption2 },
  ok: { alignSelf: 'flex-end', borderWidth: 2, borderRadius: 14, paddingHorizontal: 18, minHeight: 40, justifyContent: 'center' },
  okText: { fontFamily: fonts.display, ...type.headline },
});
