import { useState } from 'react';
import { Alert, Image, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore } from '@/store/plantStore';
import { activeTrip, dayStart, prepList, sitterNote, tripDays, upcomingTrip, type Trip } from '@/engine/away';
import { Dropdown, DropdownGroup } from '@/components/Dropdown';
import { GlassButton } from '@/components/GlassButton';
import { Icon } from '@/components/GrowTodayCard';
import { ART } from '@/data/art';
import { Button, Label, Sticker, Title } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { fonts } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { useSheetTop } from '@/lib/sheetTop';
import { Glyph } from '@/components/Glyph';
import { useDiscardGuard } from '@/hooks/useDiscardGuard';

// Every day for the first week, then the usual longer trips.
const LEAVE = [0, 1, 2, 3, 4, 5, 6, 7].map((n) => ({ id: String(n), label: n === 0 ? 'Today' : n === 1 ? 'Tomorrow' : n === 7 ? 'In a week' : `In ${n} days` }));
/** Trip length: a day at a time for the first two weeks, then a week at a time, up to two months. */
const MAX_DAYS = 60;
const stepUp = (n: number) => Math.min(MAX_DAYS, n < 14 ? n + 1 : n + 7);
const stepDown = (n: number) => Math.max(1, n <= 14 ? n - 1 : n - 7);
const stayLabel = (n: number) => (n === 1 ? '1 day' : n % 7 === 0 && n >= 7 ? (n === 7 ? '1 week' : `${n / 7} weeks`) : `${n} days`);
type LeaveId = string;

const plusDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
const fmt = (iso: string) => new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

/** Away mode: pick the trip, get a before-you-go list and a note for whoever's watering. */
export default function AwayScreen() {
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const sheetTop = useSheetTop();
  const plants = usePlantStore((s) => s.plants);
  const climate = usePlantStore((s) => s.profile.climate);
  const trips = usePlantStore((s) => s.profile.trips);
  const planTrip = usePlantStore((s) => s.planTrip);
  const endTrip = usePlantStore((s) => s.endTrip);
  const setPrepDone = usePlantStore((s) => s.setPrepDone);
  // Ticks made before the trip is saved; they go along with it when it's planned.
  const [draftDone, setDraftDone] = useState<string[]>([]);
  const now = new Date();
  const current = activeTrip(trips, now) ?? upcomingTrip(trips, now);
  const away = !!activeTrip(trips, now);
  const [leave, setLeave] = useState<LeaveId>('1');
  const [stay, setStay] = useState(7);
  const leaveScreen = useDiscardGuard(!current && (leave !== '1' || stay !== 7 || draftDone.length > 0));

  const draft: Trip = (() => {
    const from = dayStart(plusDays(now, Number(leave)));
    return { from: from.toISOString(), to: plusDays(from, stay).toISOString() };
  })();
  const trip = current ?? draft;
  const list = prepList(plants, trip);
  const done = new Set(current ? current.done ?? [] : draftDone);
  const ticked = list.filter((x) => done.has(x.id)).length;
  const toggle = (id: string) => {
    const on = !done.has(id);
    haptics.tap();
    if (current) setPrepDone(current.from, id, on);
    else setDraftDone((d) => (on ? [...d, id] : d.filter((x) => x !== id)));
  };
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  // Ending a trip early turns reminders back on, so it asks first. Coming home doesn't need to.
  const finish = () => {
    const end = () => {
      haptics.tap();
      endTrip();
      close();
    };
    if (away || Platform.OS === 'web') return end();
    Alert.alert('End this trip?', 'Reminders go back to normal straight away.', [
      { text: 'Keep trip', style: 'cancel' },
      { text: 'End trip', style: 'destructive', onPress: end },
    ]);
  };

  const share = () => {
    haptics.tap();
    Share.share({ message: sitterNote(plants, climate, trip, now) }).catch(() => {});
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: sheetTop + 8, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.toolbar}>
        <GlassButton accessibilityLabel="Close" onPress={close}>
          <Glyph name="close" size={16} color={c.ink} width={2.8} />
        </GlassButton>
      </View>

      <Image source={ART.awayTrip} style={styles.art} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
      <View style={styles.hero}>
        <View style={{ flex: 1, gap: 4 }}>
          <Title style={{ fontSize: 28, lineHeight: 32 }}>{away ? 'You’re away' : current ? 'Trip planned' : 'Going away?'}</Title>
          <Text style={[styles.sub, { color: c.inkMuted }]}>
            {current
              ? `${fmt(trip.from)} to ${fmt(trip.to)} · ${tripDays(trip)} days`
              : 'Reminders pause, nobody looks overdue, and your streak stays safe while you’re gone.'}
          </Text>
        </View>
      </View>

      {!current && (
        <>
          <DropdownGroup>
            <Dropdown label="Leaving" value={leave} tint={c.ice} options={LEAVE} onChange={setLeave} />
            <View style={styles.stepRow}>
              <Text style={[styles.stepLabel, { color: c.ink }]}>Away for</Text>
              <StepButton d="M5 12h14" label="One day less" disabled={stay <= 1} onPress={() => setStay(stepDown)} />
              <Text style={[styles.stepValue, { color: c.ink }]} accessibilityLiveRegion="polite">{stayLabel(stay)}</Text>
              <StepButton d="M12 5v14M5 12h14" label="One day more" disabled={stay >= MAX_DAYS} onPress={() => setStay(stepUp)} />
            </View>
          </DropdownGroup>
          <Text style={[styles.note, { color: c.inkMuted }]}>Back on {fmt(draft.to)}. You'll get one catch-up round that morning.</Text>
        </>
      )}

      {list.length > 0 && (
        <View style={{ gap: 8 }}>
          <View style={styles.listHead}>
            <Label>{away ? 'Hope you did these' : 'Before you go'}</Label>
            <Text style={[styles.count, { color: ticked === list.length ? c.link : c.inkMuted }]}>
              {ticked === list.length ? 'All set ✓' : `${ticked} of ${list.length} done`}
            </Text>
          </View>
          <Sticker drop={0} style={{ padding: 6 }}>
            {list.map((item) => {
              const on = done.has(item.id);
              return (
                <Pressable
                  key={item.id}
                  onPress={() => toggle(item.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: on }}
                  style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}
                >
                  <View style={[styles.box, { borderColor: c.line, backgroundColor: on ? c.leaf : c.card }]}>
                    {on && <Icon d="M5 12.5l4.5 4.5L19 7.5" color={c.onBright} size={14} width={3} />}
                  </View>
                  <Text style={[styles.itemText, { color: on ? c.inkMuted : c.ink }, on && styles.struck]}>{item.text}</Text>
                </Pressable>
              );
            })}
          </Sticker>
        </View>
      )}

      <Pressable accessibilityRole="button" onPress={share} style={[styles.share, { backgroundColor: c.butter, borderColor: c.line, boxShadow: `0px 3px 0px ${c.drop}` }]}>
        <Text style={[styles.shareTitle, { color: c.ink }]}>Share a plant-sitter note</Text>
        <Text style={[styles.shareSub, { color: c.ink }]}>Who needs water and roughly how often, ready to text.</Text>
      </Pressable>

      {current ? (
        <Button
          title={away ? 'I’m back' : 'End trip'}
          raised
          bg={away ? c.leaf : c.card}
          onPress={finish}
          style={{ minHeight: 54 }}
          textStyle={{ fontSize: 18, fontFamily: fonts.display }}
        />
      ) : (
        <Button
          title={leave === '0' ? 'Start away mode' : 'Plan the trip'}
          raised
          onPress={() => {
            haptics.success();
            planTrip({ ...draft, done: draftDone.filter((id) => list.some((x) => x.id === id)) });
            leaveScreen(close);
          }}
          style={{ minHeight: 56 }}
          textStyle={{ fontSize: 19, fontFamily: fonts.display }}
        />
      )}
    </ScrollView>
  );
}

function StepButton({ d, label, disabled, onPress }: { d: string; label: string; disabled: boolean; onPress: () => void }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={() => (haptics.tap(), onPress())}
      style={({ pressed }) => [styles.stepBtn, { borderColor: c.line, backgroundColor: pressed ? c.cloud : c.ice, opacity: disabled ? 0.35 : 1 }]}
    >
      <Icon d={d} color={c.ink} size={16} width={2.8} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 16 },
  toolbar: { flexDirection: 'row' },
  art: { width: '100%', height: undefined, aspectRatio: 960 / 603, maxHeight: 230, marginTop: -8 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  sub: { fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 19 },
  note: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  listHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  count: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  item: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', padding: 8, minHeight: 44 },
  box: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 0 },
  struck: { textDecorationLine: 'line-through' },
  itemText: { flex: 1, fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 20 },
  stepRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  stepLabel: { flex: 1, fontFamily: fonts.displaySemi, fontSize: 16 },
  stepValue: { minWidth: 76, textAlign: 'center', fontFamily: fonts.bodyHeavy, fontSize: 15 },
  stepBtn: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  share: { borderWidth: 2, borderRadius: 18, padding: 14, gap: 2 },
  shareTitle: { fontFamily: fonts.display, fontSize: 17 },
  shareSub: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
});
