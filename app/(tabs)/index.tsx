import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { isDue, moodFor } from '@/engine/careEngine';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Chip, Label, Sticker, Title } from '@/components/ui';
import { GlassButton } from '@/components/GlassButton';
import { seasonBanner } from '@/lib/season';
import * as haptics from '@/lib/haptics';
import { colors, fonts, potTint } from '@/theme/tokens';
import type { CheckResult, Plant } from '@/types';

const OUTCOME_CHIP: Record<CheckResult, { text: string; bg: string }> = {
  dry: { text: 'Watered', bg: colors.leaf },
  damp: { text: 'Skipped', bg: colors.ice },
  soggy: { text: 'Flagged', bg: colors.lavender },
};

const DROP = 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z';

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function reason(plant: Plant, now: Date): string {
  if (!plant.lastCheckAt) return 'First check: feel 2–3 cm down';
  const days = Math.round((now.getTime() - new Date(plant.lastCheckAt).getTime()) / 86400000);
  if (plant.lastResult === 'damp') return `Was damp ${days} day${days === 1 ? '' : 's'} ago, peek again?`;
  return `Probably dry. Last checked ${days} day${days === 1 ? '' : 's'} ago`;
}

function SwipeAction({ label, bg, slash, onPress }: { label: string; bg: string; slash?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.swipeAction, { backgroundColor: bg }]}>
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d={slash ? `${DROP}M4 4l16 16` : DROP} stroke={colors.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
      <Text style={styles.swipeText}>{label}</Text>
    </Pressable>
  );
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { plants, profile, logCheck, undoLastCheck, undo } = usePlantStore();
  const [messages, setMessages] = useState<Record<string, string>>({});
  const swipeRefs = useRef<Record<string, Swipeable | null>>({});
  const now = new Date();

  // The round = plants due today, plus the ones already answered today so you can see what you did.
  const round = useMemo(
    () => plants.filter((p) => !p.rooting && (isDue(p, now) || (p.lastCheckAt && sameDay(new Date(p.lastCheckAt), now) && undo[p.id]))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plants, undo],
  );
  const left = round.filter((p) => isDue(p, now)).length;
  const done = round.length - left;
  const season = seasonBanner(profile.climate, now);
  const allDone = round.length > 0 && left === 0;
  const calm = allDone || round.length === 0;

  const answer = (id: string, r: CheckResult) => {
    swipeRefs.current[id]?.close();
    setMessages((m) => ({ ...m, [id]: logCheck(id, r) }));
    if (left === 1) haptics.success();
    else haptics.answer();
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.white }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 110 }]}
    >
      <View style={styles.toolbar}>
        <Label muted>
          {now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} · {profile.city}
        </Label>
        <GlassButton accessibilityLabel="Add a plant" onPress={() => router.push('/add')}>
          <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke={colors.ink} strokeWidth={2.6} strokeLinecap="round" /></Svg>
        </GlassButton>
      </View>
      <Title style={{ fontSize: 36, lineHeight: 40 }}>Plant round</Title>

      <Sticker bg={calm ? colors.mint : colors.peach} drop={5} style={styles.hero}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.heroTitle}>
            {round.length === 0 ? 'Nothing due today' : allDone ? 'Round done!' : `${left} soil ${left === 1 ? 'check' : 'checks'} today`}
          </Text>
          <Text style={styles.heroSub}>{calm ? 'Everyone in the fam is happy.' : 'Swipe a plant, or tap how the soil feels.'}</Text>
          {round.length > 0 && (
            <View style={styles.segs}>
              {round.map((p, i) => (
                <View key={p.id} style={[styles.seg, i < done && { backgroundColor: colors.ink }]} />
              ))}
            </View>
          )}
        </View>
        <PlantBuddy speciesId="monstera" mood={calm ? 'happy' : 'thirsty'} size={112} bg={calm ? colors.mint : colors.peach} faces={profile.faces} />
      </Sticker>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>
          <Text style={{ fontFamily: fonts.bodyHeavy }}>{season.title}: </Text>
          {season.body}
        </Text>
      </View>

      <View style={{ gap: 12 }}>
        {round.map((p) => {
          const due = isDue(p, now);
          const mood = moodFor(p, now);
          const outcome = !due && p.lastResult ? OUTCOME_CHIP[p.lastResult] : undefined;
          const card = (
            <Sticker style={styles.card}>
              <Pressable accessibilityRole="button" accessibilityLabel={`${p.name} details`} onPress={() => router.push(`/plant/${p.id}`)} style={[styles.thumb, { backgroundColor: potTint[p.potColor] }]}>
                <PlantBuddy speciesId={p.speciesId} mood={mood} pot={p.potColor} size={74} bg={potTint[p.potColor]} faces={profile.faces} />
              </Pressable>
              <View style={{ flex: 1, gap: 6 }}>
                <View>
                  <Text style={styles.name}>{p.name}</Text>
                  <Text style={[styles.reason, { color: due ? colors.warn : colors.good }]}>{due ? reason(p, now) : messages[p.id] ?? 'Logged'}</Text>
                </View>
                {due ? (
                  <View style={styles.answers} accessibilityLabel="How does the soil feel?">
                    <Button title="Dry" bg={colors.sun} style={styles.answer} onPress={() => answer(p.id, 'dry')} />
                    <Button title="Damp" bg={colors.ice} style={styles.answer} onPress={() => answer(p.id, 'damp')} />
                    <Button title="Soggy" bg={colors.lavender} style={styles.answer} onPress={() => answer(p.id, 'soggy')} />
                  </View>
                ) : (
                  <View style={styles.answers}>
                    {outcome && <Chip bg={outcome.bg}>{outcome.text}</Chip>}
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => {
                        haptics.tap();
                        undoLastCheck(p.id);
                      }}
                    >
                      <Chip>Undo</Chip>
                    </Pressable>
                  </View>
                )}
              </View>
            </Sticker>
          );
          if (!due) return <View key={p.id}>{card}</View>;
          return (
            <Swipeable
              key={p.id}
              ref={(r: Swipeable | null) => {
                swipeRefs.current[p.id] = r;
              }}
              friction={2}
              rightThreshold={40}
              overshootRight={false}
              renderRightActions={() => (
                <View style={styles.swipeActions}>
                  <SwipeAction label="Skip" bg={colors.sky} slash onPress={() => answer(p.id, 'damp')} />
                  <SwipeAction label="Water" bg={colors.leaf} onPress={() => answer(p.id, 'dry')} />
                </View>
              )}
            >
              {card}
            </Swipeable>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 14 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  hero: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingRight: 4, overflow: 'hidden', minHeight: 128 },
  heroTitle: { fontFamily: fonts.display, fontSize: 23, lineHeight: 26, color: colors.ink },
  heroSub: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.ink },
  segs: { flexDirection: 'row', gap: 6, marginTop: 8 },
  seg: { width: 40, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.white },
  banner: { backgroundColor: colors.butter, borderWidth: 2, borderColor: colors.ink, borderRadius: 16, padding: 10 },
  bannerText: { fontFamily: fonts.body, fontSize: 13, color: colors.ink },
  card: { flexDirection: 'row', gap: 12, padding: 10, alignItems: 'center' },
  thumb: { width: 80, height: 80, borderRadius: 16, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.displaySemi, fontSize: 18, color: colors.ink },
  reason: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  answers: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  answer: { flex: 1, minHeight: 40, paddingHorizontal: 0 },
  swipeActions: { flexDirection: 'row', gap: 6, paddingLeft: 8, paddingVertical: 4 },
  swipeAction: { width: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 4 },
  swipeText: { fontSize: 12, fontWeight: '700', color: colors.ink },
});
