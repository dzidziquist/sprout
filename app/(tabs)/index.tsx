import { CoachGuide, useCoach } from '@/components/SoilCheckCoach';
import { GrowTodayCard } from '@/components/GrowTodayCard';
import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useDay } from '@/hooks/useDay';
import { calendarDays } from '@/lib/when';
import { useTabPadding } from '@/hooks/useTabPadding';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { useShallow } from 'zustand/react/shallow';
import { checksWaterLine, isDue, isRefreshDue, isReservoir, moodFor } from '@/engine/careEngine';
import { activeTrip, upcomingTrip } from '@/engine/away';
import { PlantBuddy } from '@/components/PlantBuddy';
import { GoldSparkles, goldFrame } from '@/components/GoldSparkles';
import { ART, SEASON_ART } from '@/data/art';
import { PlantMenu } from '@/components/PlantMenu';
import { Button, Label, Sticker, Title } from '@/components/ui';
import { UndoToast } from '@/components/UndoToast';
import { GlassButton } from '@/components/GlassButton';
import { TodayAnswerButtons } from '@/components/TodayAnswerButtons';
import { TodayProgress } from '@/components/TodayProgress';
import { seasonBanner } from '@/lib/season';
import * as haptics from '@/lib/haptics';
import { textOn, useColors } from '@/theme/theme';
import { fonts, type, space } from '@/theme/tokens';
import type { CheckResult, Plant } from '@/types';
import { Glyph } from '@/components/Glyph';

const DROP = 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z';
const DAY = 86400000;

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function reason(plant: Plant, now: Date): string {
  const water = checksWaterLine(plant);
  if (!plant.lastCheckAt) return water ? 'Say hi: first water check' : 'Say hi: first soil check';
  const days = Math.round((now.getTime() - new Date(plant.lastCheckAt).getTime()) / DAY);
  const ago = days <= 0 ? 'earlier today' : days === 1 ? 'yesterday' : `${days} days ago`;
  if (water) {
    const fresh = isReservoir(plant.soil) && isRefreshDue(plant, now) ? ' Fresh water due too.' : '';
    if (plant.lastResult === 'dry') return `Last checked ${ago}. How’s the water?${fresh}`;
    return `Had plenty ${ago}, peek again?${fresh}`;
  }
  if (plant.lastResult === 'damp' || plant.lastResult === 'soggy') return `Was ${plant.lastResult} ${ago}, peek again?`;
  return `Last checked ${ago}. How’s the soil?`;
}

/** "soil checks", "water checks", or just "checks" when the round has both. */
function checkWord(plants: Plant[]): '' | 'soil ' | 'water ' {
  const water = plants.filter((p) => checksWaterLine(p)).length;
  return water === 0 ? 'soil ' : water === plants.length ? 'water ' : '';
}

function inDays(iso: string, now: Date): string {
  const d = calendarDays(now, new Date(iso));
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
  const pad = useTabPadding(8);
  const router = useRouter();
  const c = useColors();
  const { plants, profile, events, logCheck, undoLastCheck } = usePlantStore(useShallow((s) => ({ plants: s.plants, profile: s.profile, events: s.events, logCheck: s.logCheck, undoLastCheck: s.undoLastCheck })));
  // The last check, with its Undo, until the bar times out. A checked plant leaves the list straight away.
  const [toast, setToast] = useState<{ key: string; plantId: string; text: string } | null>(null);
  const insets = useSafeAreaInsets();
  const coaching = useCoach();
  const [howOpen, setHowOpen] = useState(false);
  const swipeRefs = useRef<Record<string, Swipeable | null>>({});
  // Re-renders at midnight so plants that just came due join the round.
  const day = useDay();
  const now = new Date();

  const living = useMemo(() => plants.filter((p) => !p.archivedAt), [plants]);
  const trip = activeTrip(profile.trips, now);
  const nextTrip = upcomingTrip(profile.trips, now);
  const shortDay = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  // The round = plants due now. Checked ones leave it; today's checks still count towards the progress bar.
  const round = useMemo(
    () => (trip ? [] : living.filter((p) => !p.rooting && isDue(p, now))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [living, trip?.to, day],
  );
  const checkedToday = useMemo(
    () => (trip ? [] : living.filter((p) => !p.rooting && !isDue(p, now) && !!p.lastCheckAt && sameDay(new Date(p.lastCheckAt), now))),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [living, trip?.to, day],
  );
  const upNext = useMemo(
    () => living.filter((p) => !p.rooting && !isDue(p, now)).sort((a, b) => a.nextCheckAt.localeCompare(b.nextCheckAt)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [living, day],
  );
  const left = round.length;
  const done = checkedToday.length;
  const total = left + done;
  const season = seasonBanner(profile.climate, now);
  const allDone = left === 0 && done > 0;
  const calm = left === 0;
  const heroBg = trip ? c.ice : calm ? c.mint : c.peach;

  const answer = (id: string, r: CheckResult) => {
    swipeRefs.current[id]?.close();
    const p = plants.find((x) => x.id === id);
    const fresh = p && r === 'dry' && isRefreshDue(p, now) ? ' Fresh water + nutrients are due too: use Log care.' : '';
    const text = `${p?.name ?? 'Logged'}: ${logCheck(id, r)}${fresh}`;
    setToast({ key: `${id}-${Date.now()}`, plantId: id, text });
    if (left === 1) haptics.success();
    else haptics.answer();
  };

  const firstEver = !events.some((e) => e.type === 'check');
  // How to check, folded into the hero while there's a round to do (it goes after the first few checks).
  const coach = left > 0 && !trip ? coaching : null;
  const word = checkWord(round);
  const how = word === 'water ' ? 'Peek at the water line' : word === '' ? 'Feel the soil or peek at the water' : 'Feel the soil';
  const heroTitle = trip ? `Away until ${shortDay(trip.to)}` : living.length === 0 ? 'Your jungle is waiting' : allDone ? 'Round done!' : left === 0 ? 'All caught up!' : `${left} ${word}${left === 1 ? 'check' : 'checks'} left`;
  const heroSub = trip
    ? 'Reminders are paused and your streak is safe. Enjoy the trip!'
    : living.length === 0
      ? 'Add your first plant and we’ll learn its rhythm together.'
      : allDone
        ? checkedToday.some((p) => p.lastResult === 'soggy')
          ? 'All checked. Anyone too wet just needs time to dry out.'
          : 'Everyone in the fam is happy. Nice judgement!'
        : left === 0
          ? 'Nobody needs a check today. Enjoy the green.'
          : firstEver
            ? `Say hi to the fam: ${how.toLowerCase()}, then tap what you found.`
            : `${how}, then tap what you found.`;

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView
        style={{ flex: 1, backgroundColor: c.bg }}
        contentInsetAdjustmentBehavior={pad.contentInsetAdjustmentBehavior}
        contentContainerStyle={[styles.page, { paddingTop: pad.paddingTop, paddingBottom: pad.paddingBottom }]}
      >
        <View style={styles.toolbar}>
          <Label muted>
            {now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} · {profile.city}
          </Label>
          {/* iOS native tabs have no + tab, so the header keeps the add button there only. */}
          {Platform.OS === 'ios' && (
            <GlassButton accessibilityLabel="Add a plant" onPress={() => router.push('/add')}>
              <Glyph name="add" size={18} color={c.ink} width={2.6} />
            </GlassButton>
          )}
        </View>
        <Title size="largeTitle">Plant round</Title>

        <Sticker bg={heroBg} drop={5}>
          <View style={styles.hero}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[styles.heroTitle, { color: c.ink }]}>{heroTitle}</Text>
              <Text style={[styles.heroSub, { color: c.ink }]}>{heroSub}</Text>
              {coach && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={coach.question}
                  accessibilityState={{ expanded: howOpen }}
                  hitSlop={12}
                  onPress={() => setHowOpen((o) => !o)}
                  style={({ pressed }) => [styles.howBtn, pressed && { opacity: 0.6 }]}
                >
                  <Text style={[styles.how, { color: c.ink }]}>{howOpen ? 'Hide' : 'How?'}</Text>
                </Pressable>
              )}
              {total > 0 && <TodayProgress done={done} total={total} />}
              {living.length === 0 && <Button title="Add a plant" raised bg={c.leaf} onPress={() => router.push('/add')} style={{ alignSelf: 'flex-start', marginTop: 8 }} />}
              {trip && <Button title="View trip" raised bg={c.card} onPress={() => router.push('/away')} style={{ alignSelf: 'flex-start', marginTop: 8 }} />}
            </View>
            {trip ? (
              <PlantBuddy speciesId="monstera" mood="snoozing" size={84} bg={heroBg} faces={profile.faces} />
            ) : living.length === 0 ? (
              <Image source={ART.emptyJungle} style={{ width: 84, height: 84 }} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            ) : round.length === 0 || allDone ? (
              <Image source={ART.caughtUp} style={{ width: 84, height: 84 }} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            ) : (
              <PlantBuddy speciesId="monstera" mood="thirsty" size={84} bg={heroBg} faces={profile.faces} />
            )}
          </View>
          {coach && howOpen && (
            <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>
              <CoachGuide soil={coach.soil} water={coach.water} />
            </View>
          )}
        </Sticker>

        {round.length > 0 && (
          <View style={{ gap: 12 }}>
            {round.map((p) => {
              const mood = moodFor(p, now);
              const tint = c.potTint[p.potColor];
              const water = checksWaterLine(p);
              const card = (
                <PlantMenu plant={p} hasControls>
                  <Sticker style={styles.card}>
                    <View style={[styles.thumb, { backgroundColor: tint, borderColor: c.line }, goldFrame(p.potColor)]}>
                      <PlantBuddy speciesId={p.speciesId} mood={mood} pot={p.potColor} size={74} bg={tint} faces={profile.faces} />
                      <GoldSparkles pot={p.potColor} size={0.8} />
                    </View>
                    <View style={{ flex: 1, gap: 6 }}>
                      {/* VoiceOver's way in to the details, since the card itself isn't one element (its buttons are). */}
                      <View
                        accessible
                        accessibilityRole="button"
                        accessibilityLabel={`${p.name}, ${reason(p, now)}`}
                        accessibilityHint="Opens details"
                        onAccessibilityTap={() => router.push(`/plant/${p.id}`)}
                      >
                        <Text style={[styles.name, { color: c.ink }]} numberOfLines={1}>{p.name}</Text>
                        <Text style={[styles.reason, { color: c.inkMuted }]}>{reason(p, now)}</Text>
                      </View>
                      <TodayAnswerButtons name={p.name} reservoir={water} onAnswer={(r) => answer(p.id, r)} />
                    </View>
                  </Sticker>
                </PlantMenu>
              );
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
                      <SwipeAction label={checksWaterLine(p) ? 'Top up' : 'Water'} bg={c.leaf} onPress={() => answer(p.id, 'dry')} />
                    </View>
                  )}
                >
                  {card}
                </Swipeable>
              );
            })}
          </View>
        )}

        {!trip && nextTrip && (
          <Pressable accessibilityRole="button" onPress={() => router.push('/away')} style={[styles.banner, { backgroundColor: c.ice, borderColor: c.line, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
            <Image source={ART.awayTrip} style={{ width: 72, height: 46 }} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            <Text style={[styles.bannerText, { color: c.ink, flex: 1 }]}>
              <Text style={{ fontFamily: fonts.bodyHeavy }}>Away from {shortDay(nextTrip.from)}. </Text>
              Tap for your before-you-go list and a plant-sitter note.
            </Text>
          </Pressable>
        )}

        <View style={[styles.banner, { backgroundColor: c.butter, borderColor: c.line, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
          <Image source={SEASON_ART[season.art]} style={{ width: 52, height: 52 }} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          <Text style={[styles.bannerText, { color: c.ink, flex: 1 }]}>
            <Text style={{ fontFamily: fonts.bodyHeavy }}>{season.title}: </Text>
            {season.body}
          </Text>
        </View>

        <GrowTodayCard />

        {calm && upNext.length > 0 && (
          <View style={{ gap: 8 }}>
            <View style={styles.upHeader}>
              <Label>Coming up</Label>
              {upNext.length > 3 && (
                <Pressable accessibilityRole="button" hitSlop={10} onPress={() => router.push('/coming-up')}>
                  <Text style={[styles.upToggle, { color: c.link }]}>See all {upNext.length}</Text>
                </Pressable>
              )}
            </View>
            <View style={styles.upNext}>
              {upNext.slice(0, 3).map((p) => (
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

        {!trip && !nextTrip && living.length > 0 && (
          <Pressable accessibilityRole="button" onPress={() => router.push('/away')} style={styles.awayLink}>
            <Text style={[styles.awayLinkText, { color: c.inkMuted }]}>Going away? Set up away mode 🧳</Text>
          </Pressable>
        )}
      </ScrollView>
      {toast && (
        <UndoToast
          id={toast.key}
          text={toast.text}
          // Just above the tab bar: iOS's system bar, or the floating sticker bar elsewhere.
          bottom={insets.bottom + (Platform.OS === 'ios' ? 64 : 96)}
          onUndo={() => {
            haptics.tap();
            undoLastCheck(toast.plantId);
            setToast(null);
          }}
          onDone={() => setToast((t) => (t?.key === toast.key ? null : t))}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.xl, gap: space.xl },
  toolbar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 44 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 12, paddingLeft: 14, paddingRight: 4, overflow: 'hidden', borderRadius: 20 },
  howBtn: { alignSelf: 'flex-start' },
  how: { fontFamily: fonts.display, ...type.footnote, textDecorationLine: 'underline' },
  heroTitle: { fontFamily: fonts.display, ...type.title2 },
  heroSub: { fontFamily: fonts.bodyHeavy, ...type.footnote },
  banner: { borderWidth: 2, borderRadius: 16, padding: 10 },
  awayLink: { alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  awayLinkText: { fontFamily: fonts.bodyHeavy, ...type.footnote, textDecorationLine: 'underline' },
  bannerText: { fontFamily: fonts.body, ...type.footnote },
  card: { flexDirection: 'row', gap: 12, padding: 10, alignItems: 'center' },
  thumb: { width: 80, height: 80, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  name: { fontFamily: fonts.displaySemi, ...type.headline },
  reason: { fontFamily: fonts.bodyHeavy, ...type.footnote },
  swipeActions: { flexDirection: 'row', gap: 6, paddingLeft: 8, paddingVertical: 4 },
  swipeAction: { width: 64, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 4 },
  swipeText: { fontFamily: fonts.bodyHeavy, ...type.caption },
  upNext: { flexDirection: 'row', gap: 8 },
  upHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  upToggle: { fontFamily: fonts.bodyHeavy, ...type.callout },
  upItem: { flex: 1, borderWidth: 2, borderRadius: 18, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4 },
  upName: { fontFamily: fonts.displaySemi, ...type.callout, marginTop: 2 },
  upWhen: { fontFamily: fonts.bodyHeavy, ...type.caption2 },
});
