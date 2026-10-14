import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { isDue, moodFor } from '@/engine/careEngine';
import { PlantBuddy } from '@/components/PlantBuddy';
import { PlantMenu } from '@/components/PlantMenu';
import { Button, Chip, Label, Sticker, Title } from '@/components/ui';
import { GlassButton } from '@/components/GlassButton';
import { seasonBanner } from '@/lib/season';
import * as haptics from '@/lib/haptics';
import { textOn, useColors, type Palette } from '@/theme/theme';
import { fonts } from '@/theme/tokens';
import type { CheckResult, Plant } from '@/types';

const outcomeChip = (c: Palette): Record<CheckResult, { text: string; bg: string }> => ({
  dry: { text: 'Watered', bg: c.leaf },
  damp: { text: 'Skipped', bg: c.ice },
  soggy: { text: 'Flagged', bg: c.lavender },
});

const DROP = 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z';
const DAY = 86400000;

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function reason(plant: Plant, now: Date): string {
  if (!plant.lastCheckAt) return 'First check: feel 2–3 cm down';
  const days = Math.round((now.getTime() - new Date(plant.lastCheckAt).getTime()) / DAY);
  if (plant.lastResult === 'damp') return `Was damp ${days} day${days === 1 ? '' : 's'} ago, peek again?`;
  return `Probably dry. Last checked ${days} day${days === 1 ? '' : 's'} ago`;
}

function inDays(iso: string, now: Date): string {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const d = Math.round((new Date(iso).setHours(0, 0, 0, 0) - start.getTime()) / DAY);
  return d <= 1 ? 'tomorrow' : `in ${d} days`;
}

function SwipeAction({ label, bg, slash, onPress }: { label: string; bg: string; slash?: boolean; onPress: () => void }) {
  const c = useColors();
  const fg = textOn(bg, c);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.swipeAction, { backgroundColor: bg, borderColor: c.line }]}>
      <Svg width={22} height={22} viewBox="0 0 24 24">
        <Path d={slash ? `${DROP}M4 4l16 16` : DROP} stroke={fg} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </Svg>
      <Text style={[styles.swipeText, { color: fg }]}>{label}</Text>
    </Pressable>
  );
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const c = useColors();
  const { plants, profile, logCheck, undoLastCheck, undo } = usePlantStore();
  const [messages, setMessages] = useState<Record<string, string>>({});
  const swipeRefs = useRef<Record<string, Swipeable | null>>({});
  const now = new Date();
  const OUTCOME = outcomeChip(c);

  const living = useMemo(() => plants.filter((p) => !p.archivedAt), [plants]);
  // The round = plants due today, plus the ones already answered today so you can see what you did.
  const round = useMemo(
    () => living.filter((p) => !p.rooting && (isDue(p, now) || (p.lastCheckAt && sameDay(new Date(p.lastCheckAt), now) && undo[p.id]))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [living, undo],
  );
  const upNext = useMemo(
    () => living.filter((p) => !p.rooting && !isDue(p, now)).sort((a, b) => a.nextCheckAt.localeCompare(b.nextCheckAt)).slice(0, 3),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [living],
  );
  const left = round.filter((p) => isDue(p, now)).length;
  const done = round.length - left;
  const season = seasonBanner(profile.climate, now);
  const allDone = round.length > 0 && left === 0;
  const calm = allDone || round.length === 0;
  const heroBg = calm ? c.mint : c.peach;

  const answer = (id: string, r: CheckResult) => {
    swipeRefs.current[id]?.close();
    setMessages((m) => ({ ...m, [id]: logCheck(id, r) }));
    if (left === 1) haptics.success();
    else haptics.answer();
  };

  const heroTitle = living.length === 0 ? 'Your jungle is waiting' : round.length === 0 ? 'All caught up!' : allDone ? 'Round done!' : `${left} soil ${left === 1 ? 'check' : 'checks'} today`;
  const heroSub =
    living.length === 0
      ? 'Add your first plant and we’ll learn its rhythm together.'
      : round.length === 0
        ? 'Nobody needs a soil check today. Enjoy the green.'
        : allDone
          ? 'Everyone in the fam is happy. Nice judgement!'
          : 'Swipe a plant, or tap how the soil feels.';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 110 }]}
    >
      <View style={styles.toolbar}>
        <Label muted>
          {now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} · {profile.city}
        </Label>
        <GlassButton accessibilityLabel="Add a plant" onPress={() => router.push('/add')}>
          <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke={c.ink} strokeWidth={2.6} strokeLinecap="round" /></Svg>
        </GlassButton>
      </View>
      <Title style={{ fontSize: 36, lineHeight: 40 }}>Plant round</Title>

      <Sticker bg={heroBg} drop={5} style={styles.hero}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.heroTitle, { color: c.ink }]}>{heroTitle}</Text>
          <Text style={[styles.heroSub, { color: c.ink }]}>{heroSub}</Text>
          {round.length > 0 && (
            <View style={styles.segs} accessibilityLabel={`${done} of ${round.length} done`}>
              {round.map((p, i) => (
                <View key={p.id} style={[styles.seg, { borderColor: c.line, backgroundColor: i < done ? c.ink : c.card }]} />
              ))}
            </View>
          )}
          {living.length === 0 && <Button title="Add a plant" raised bg={c.leaf} onPress={() => router.push('/add')} style={{ alignSelf: 'flex-start', marginTop: 8 }} />}
        </View>
        <PlantBuddy speciesId="monstera" mood={calm ? 'happy' : 'thirsty'} size={112} bg={heroBg} faces={profile.faces} />
      </Sticker>

      <View style={[styles.banner, { backgroundColor: c.butter, borderColor: c.line }]}>
        <Text style={[styles.bannerText, { color: c.ink }]}>
          <Text style={{ fontFamily: fonts.bodyHeavy }}>{season.title}: </Text>
          {season.body}
        </Text>
      </View>

      {/* GROW_CARD */}

      <View style={{ gap: 12 }}>
        {round.map((p) => {
          const due = isDue(p, now);
          const mood = moodFor(p, now);
          const tint = c.potTint[p.potColor];
          const outcome = !due && p.lastResult ? OUTCOME[p.lastResult] : undefined;
          const card = (
            <PlantMenu plant={p}>
              <Sticker style={styles.card}>
                <View style={[styles.thumb, { backgroundColor: tint, borderColor: c.line }]}>
                  <PlantBuddy speciesId={p.speciesId} mood={mood} pot={p.potColor} size={74} bg={tint} faces={profile.faces} />
                </View>
                <View style={{ flex: 1, gap: 6 }}>
                  <View>
                    <Text style={[styles.name, { color: c.ink }]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[styles.reason, { color: due ? c.warn : c.good }]}>{due ? reason(p, now) : messages[p.id] ?? 'Logged'}</Text>
                  </View>
                  {due ? (
                    <View style={styles.answers} accessibilityLabel="How does the soil feel?">
                      <Button title="Dry" bg={c.sun} style={styles.answer} accessibilityLabel={`${p.name}: dry`} onPress={() => answer(p.id, 'dry')} />
                      <Button title="Damp" bg={c.ice} style={styles.answer} accessibilityLabel={`${p.name}: damp`} onPress={() => answer(p.id, 'damp')} />
                      <Button title="Soggy" bg={c.lavender} style={styles.answer} accessibilityLabel={`${p.name}: soggy`} onPress={() => answer(p.id, 'soggy')} />
                    </View>
                  ) : (
                    <View style={styles.answers}>
                      {outcome && <Chip bg={outcome.bg}>{outcome.text}</Chip>}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Undo ${p.name}'s check`}
                        hitSlop={6}
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
            </PlantMenu>
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
                  <SwipeAction label="Skip" bg={c.sky} slash onPress={() => answer(p.id, 'damp')} />
                  <SwipeAction label="Water" bg={c.leaf} onPress={() => answer(p.id, 'dry')} />
                </View>
              )}
            >
              {card}
            </Swipeable>
          );
        })}
      </View>

      {calm && upNext.length > 0 && (
        <View style={{ gap: 8 }}>
          <Label>Coming up</Label>
          <View style={styles.upNext}>
            {upNext.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`${p.name}, next check ${inDays(p.nextCheckAt, now)}`}
                onPress={() => router.push(`/plant/${p.id}`)}
                style={[styles.upItem, { backgroundColor: c.potTint[p.potColor], borderColor: c.line }]}
              >
                <PlantBuddy speciesId={p.speciesId} pot={p.potColor} mood="happy" size={56} bg={c.potTint[p.potColor]} faces={profile.faces} />
                <Text style={[styles.upName, { color: c.ink }]} numberOfLines={1}>{p.name}</Text>
                <Text style={[styles.upWhen, { color: c.inkMuted }]}>{inDays(p.nextCheckAt, now)}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 14 },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  hero: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingRight: 4, overflow: 'hidden', minHeight: 128 },
  heroTitle: { fontFamily: fonts.display, fontSize: 23, lineHeight: 26 },
  heroSub: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  segs: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  seg: { width: 40, height: 12, borderRadius: 6, borderWidth: 2 },
  banner: { borderWidth: 2, borderRadius: 16, padding: 10 },
  bannerText: { fontFamily: fonts.body, fontSize: 13 },
  card: { flexDirection: 'row', gap: 12, padding: 10, alignItems: 'center' },
  thumb: { width: 80, height: 80, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.displaySemi, fontSize: 18 },
  reason: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  answers: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  answer: { flex: 1, minHeight: 40, paddingHorizontal: 0 },
  swipeActions: { flexDirection: 'row', gap: 6, paddingLeft: 8, paddingVertical: 4 },
  swipeAction: { width: 64, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 4 },
  swipeText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  upNext: { flexDirection: 'row', gap: 8 },
  upItem: { flex: 1, borderWidth: 2, borderRadius: 18, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  upName: { fontFamily: fonts.displaySemi, fontSize: 14, marginTop: 2 },
  upWhen: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
});
