import { ART } from '@/data/art';
import { placeName } from '@/lib/climate';
import { useUnits } from '@/hooks/useUnits';
import { degrees, localizeTemps } from '@/lib/units';
import { useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore } from '@/store/plantStore';
import { cropChip, sortByNeed, ediblePlants, FEED_TASKS, formatTotals, harvestStats, isTicked, seasonEnd, skyOf, withTickedSupport, tasksFor, weatherAlerts, type DailyForecast, type GrowAlert, type GrowTask, type Sky } from '@/engine/growPatch';
import { edibleGuide } from '@/data/edibles';
import { useForecast } from '@/lib/weather';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Label, Sticker, Title } from '@/components/ui';
import { GlassButton } from '@/components/GlassButton';
import { CropCard, CropTile } from '@/components/CropCard';
import { JungleViewToggle } from '@/components/JungleControls';
import { ALERT_ICON, GROW_ICON, Icon, alertTint, taskTint } from '@/components/GrowTodayCard';
import * as haptics from '@/lib/haptics';
import { shortDay } from '@/engine/mix';
import { fonts, type, space } from '@/theme/tokens';
import { textOn, useColors, type Palette } from '@/theme/theme';
import type { Plant } from '@/types';


function weekday(iso: string, i: number) {
  if (i === 0) return 'Today';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' });
}

const CLOUD_TOP = 'M7 14h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 8.5 3 3 0 0 0 7 14z';
/** Line icons for the forecast tiles, in the app's sticker style. */
const SKY: Record<Sky, { d: string; word: string; tone: (c: Palette) => string }> = {
  sun: { d: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4', word: 'sunny', tone: (c) => c.orange },
  partly: { d: 'M8 2.5v1.5M2.5 8H4M4.1 4.1l1 1M11.9 4.1l-1 1M5.3 10.6A3 3 0 0 1 10.6 6M9 20h8a3.5 3.5 0 0 0 .4-6.98A5 5 0 0 0 8 13.5 3.25 3.25 0 0 0 9 20z', word: 'partly cloudy', tone: (c) => c.orange },
  cloud: { d: 'M7 18h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 12.5 3 3 0 0 0 7 18z', word: 'cloudy', tone: (c) => c.inkMuted },
  fog: { d: `${CLOUD_TOP}M4 17.5h16M6 21h12`, word: 'foggy', tone: (c) => c.inkMuted },
  rain: { d: `${CLOUD_TOP}M8.5 17l-1 3M12.5 17l-1 3M16.5 17l-1 3`, word: 'rain', tone: (c) => c.sky },
  storm: { d: `${CLOUD_TOP}M12.5 15.5l-2 3.5h3l-2 3.5`, word: 'thunderstorms', tone: (c) => c.grape },
  snow: { d: `${CLOUD_TOP}M8 18h.01M12 18h.01M16 18h.01M10 21h.01M14 21h.01`, word: 'snow', tone: (c) => c.sky },
};

function WeatherStrip({ forecast, alerts, c }: { forecast: DailyForecast[] | null; alerts: GrowAlert[]; c: Palette }) {
  const units = useUnits();
  if (!forecast) {
    return (
      <Sticker drop={0} bg={c.cloud} style={styles.offline}>
        <Image source={ART.offline} style={{ width: 56, height: 56 }} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
        <Text style={[styles.offlineText, { color: c.inkMuted }]}>No forecast right now. Weather alerts pop up here once we can see it.</Text>
      </Sticker>
    );
  }
  const tintFor = (date: string) => {
    const a = alerts.find((x) => x.dates.includes(date));
    return a ? alertTint(a.kind, c) : undefined;
  };
  return (
    <View style={styles.strip} accessibilityLabel="7-day forecast">
      {forecast.map((d, i) => {
        const tint = tintFor(d.date);
        const sky = skyOf(d);
        return (
          <View
            key={d.date}
            accessibilityLabel={`${weekday(d.date, i)}: ${sky ? `${SKY[sky].word}, ` : ''}high ${degrees(d.maxC, units)}, low ${degrees(d.minC, units)} degrees${tint ? ', alert' : ''}`}
            style={[styles.day, { borderColor: c.line, backgroundColor: tint ?? c.card }, tint && { boxShadow: `0px 3px 0px ${c.drop}` }]}
          >
            <Text style={[styles.dayName, { color: c.ink }]} numberOfLines={1}>{weekday(d.date, i)}</Text>
            <View style={{ height: 24, justifyContent: 'center' }}>
              {sky ? <Icon d={SKY[sky].d} color={tint ? c.ink : SKY[sky].tone(c)} size={22} width={2.2} /> : null}
            </View>
            <Text style={[styles.dayMax, { color: c.ink }]}>{degrees(d.maxC, units)}°</Text>
            <Text style={[styles.dayMin, { color: c.inkMuted }]}>{degrees(d.minC, units)}°</Text>
          </View>
        );
      })}
    </View>
  );
}

function AlertCard({ alert, c }: { alert: GrowAlert; c: Palette }) {
  return (
    <Sticker bg={alertTint(alert.kind, c)} style={styles.alert}>
      <View style={[styles.badge, { backgroundColor: c.card, borderColor: c.line }]}>
        <Icon d={ALERT_ICON[alert.kind]} color={c.ink} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[styles.alertTitle, { color: c.ink }]}>{alert.title}</Text>
        <Text style={[styles.alertBody, { color: c.ink }]}>{alert.body}</Text>
      </View>
    </Sticker>
  );
}

/** "2 done", "1 done, 1 skipped", "All 3 done for now". */
const doneLine = (done: number, skipped: number, all: boolean) => {
  const parts = [done ? `${done} done` : '', skipped ? `${skipped} skipped` : ''].filter(Boolean).join(', ');
  return all && !skipped ? `All ${done} done for now` : parts;
};

/**
 * One grow job. Tapping ticks it (a feed tick logs a feed). "Skip" puts it away for now without
 * logging anything, till it's next due; "Not this season" turns it off till its season ends (a job that
 * doesn't suit someone's setup). Either way it folds away and comes back with a tap.
 */
function TaskRow({ task, done, skipped, offUntil, onToggle, onSkip, onOffSeason, plants, c, last }: { task: GrowTask; done: boolean; skipped?: boolean; offUntil?: string; onToggle: () => void; onSkip?: () => void; onOffSeason?: () => void; plants: Plant[]; c: Palette; last: boolean }) {
  const units = useUnits();
  const who = task.plantIds.map((id) => plants.find((p) => p.id === id)?.name).filter(Boolean).join(', ');
  const waiting = task.waiting ? task.waiting.plantIds.map((id) => plants.find((p) => p.id === id)?.name).filter(Boolean) : [];
  return (
    <Pressable
      accessibilityRole={skipped ? 'button' : 'checkbox'}
      accessibilityState={skipped ? undefined : { checked: done }}
      accessibilityLabel={skipped ? `${task.title}, ${offUntil ? 'off this season' : 'skipped'}. Bring it back` : task.title}
      onPress={onToggle}
      style={[styles.task, !last && { borderBottomWidth: 2, borderColor: c.cloud }]}
    >
      <View style={[styles.taskIcon, { backgroundColor: taskTint(task.kind, c), borderColor: c.line }]}>
        <Icon d={GROW_ICON[task.kind]} color={c.ink} size={20} />
      </View>
      <View style={{ flex: 1, gap: 2, opacity: done || skipped ? 0.45 : 1 }}>
        <Text style={[styles.taskTitle, { color: c.ink }, done && styles.strike]}>{task.title}</Text>
        <Text style={[styles.taskBody, { color: c.ink }]}>{localizeTemps(task.body, units)}</Text>
        <View style={styles.taskHead}>
          {task.thisWeek && !done && !skipped ? (
            <View style={[styles.weekPill, { backgroundColor: c.sun, borderColor: c.line }]}>
              <Text style={[styles.weekText, { color: textOn(c.sun, c) }]}>This week</Text>
            </View>
          ) : null}
          <Text style={[styles.taskWho, { color: c.inkMuted, flexShrink: 1 }]}>For {who}</Text>
        </View>
        {onSkip && (
          <View style={styles.skipRow}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Skip ${task.title} for now`} hitSlop={8} onPress={onSkip} style={{ paddingVertical: 4 }}>
              <Text style={[styles.skipLink, { color: c.inkMuted }]}>Skip for now</Text>
            </Pressable>
            {onOffSeason && (
              <Pressable accessibilityRole="button" accessibilityLabel={`Turn ${task.title} off for this season`} hitSlop={8} onPress={onOffSeason} style={{ paddingVertical: 4 }}>
                <Text style={[styles.skipLink, { color: c.inkMuted }]}>Not this season</Text>
              </Pressable>
            )}
          </View>
        )}
        {skipped && (
          <Text style={[styles.skipLink, { color: c.inkMuted }]}>
            {offUntil ? `Off till ${new Date(offUntil).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Skipped'} · tap to bring back
          </Text>
        )}
        {task.waiting && waiting.length > 0 && (
          <Text style={[styles.waiting, { backgroundColor: c.mint, color: textOn(c.mint, c) }]}>
            Not yet for {andList(waiting)}: {waiting.length === 1 ? 'its fresh mix feeds it' : 'their fresh mix feeds them'} till about {shortDay(new Date(task.waiting.until))}.
          </Text>
        )}
      </View>
      <View style={[styles.check, { borderColor: c.line, backgroundColor: done ? c.leaf : c.card }, skipped && { opacity: 0.35 }]}>
        {done ? <Icon d={GROW_ICON.check} color={textOn(c.leaf, c)} size={16} width={3} /> : null}
      </View>
    </Pressable>
  );
}

export default function GrowPatch() {
  const c = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const plants = usePlantStore((s) => s.plants);
  const events = usePlantStore((s) => s.events);
  const climate = usePlantStore((s) => s.profile.climate);
  const faces = usePlantStore((s) => s.profile.faces);
  const ticks = usePlantStore((s) => s.profile.growTicks);
  const tickGrowTask = usePlantStore((s) => s.tickGrowTask);
  const skipGrowTask = usePlantStore((s) => s.skipGrowTask);
  const skips = usePlantStore((s) => s.profile.growSkips);
  const offSeason = usePlantStore((s) => s.profile.growOffSeason);
  const offSeasonGrowTask = usePlantStore((s) => s.offSeasonGrowTask);
  const setStaked = usePlantStore((s) => s.setStaked);
  const setFed = usePlantStore((s) => s.setFed);
  const setProfile = usePlantStore((s) => s.setProfile);
  const logRegrow = usePlantStore((s) => s.logRegrow);
  const savedView = usePlantStore((s) => s.profile.growView);
  const now = new Date();

  const edibles = useMemo(() => ediblePlants(plants), [plants]);
  const forecast = useForecast(climate, edibles.length > 0);
  const units = useUnits();
  const alerts = useMemo(() => weatherAlerts(edibles, forecast, units), [edibles, forecast, units]);
  // A ticked "Give it a stake" stays on the list (ticked) while its tick lasts, so a mis-tap can be unticked.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tasks = useMemo(() => tasksFor(edibles, climate, new Date(), withTickedSupport(events, edibles, ticks ?? {}, new Date())), [edibles, climate, events, ticks]);
  const stats = useMemo(() => harvestStats(events, edibles), [events, edibles]);
  const basket = formatTotals(stats.totals);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  // Ticks are saved: a repeating job ("every 2–3 days") comes back unticked after that, others next month.
  const done = (t: GrowTask) => isTicked(t, ticks ?? {}, now);
  const offUntil = (t: GrowTask) => {
    const at = offSeason?.[t.id];
    return at && Date.parse(at) > now.getTime() ? at : undefined;
  };
  const skipped = (t: GrowTask) => !done(t) && (isTicked(t, skips ?? {}, now) || !!offUntil(t));
  const open = tasks.filter((t) => !done(t) && !skipped(t));
  const finished = tasks.filter((t) => done(t) || skipped(t));
  const skipCount = finished.filter(skipped).length;
  const skip = (t: GrowTask, on: boolean) => {
    haptics.tap();
    skipGrowTask(t.id, on);
    if (!on) offSeasonGrowTask(t.id, undefined);
  };
  const [showDone, setShowDone] = useState(false);
  // Grid by default once the patch is big enough to scroll past; the choice is remembered.
  const view = savedView ?? (edibles.length >= 5 ? 'grid' : 'list');
  const chipFor = (id: string) => cropChip(id, alerts, open);
  const crops = view === 'grid' ? sortByNeed(edibles, (id) => !!chipFor(id)) : edibles;
  const quick = (p: Plant) => {
    const guide = edibleGuide(p.speciesId);
    const acts: { title: string; run: () => void }[] = [
      { title: 'Log harvest', run: () => router.push(`/harvest/${p.id}`) },
      ...(guide?.regrows ? [{ title: 'Cut and regrow', run: () => { logRegrow(p.id); haptics.success(); } }] : []),
      { title: 'Open crop card', run: () => router.push(`/crop/${p.id}`) },
      { title: 'Plant page', run: () => router.push(`/plant/${p.id}`) },
    ];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions({ title: p.name, options: [...acts.map((a) => a.title), 'Cancel'], cancelButtonIndex: acts.length }, (i) => acts[i]?.run());
    } else {
      Alert.alert(p.name, undefined, [...acts.map((a) => ({ text: a.title, onPress: a.run })), { text: 'Cancel', style: 'cancel' as const }]);
    }
  };
  const toggle = (t: GrowTask) => {
    haptics.tap();
    const on = !done(t);
    // One timestamp for both, so the staked events count as logged by this tick.
    const at = new Date();
    if (t.id === 'stage-stake' || t.id === 'stage-trellis') setStaked(t.plantIds, on, at);
    // A feed job ticked is a feed logged for each plant (so the plant page knows when the next is due).
    if (FEED_TASKS.has(t.id)) setFed(t.plantIds, on, at, ticks?.[t.id]);
    tickGrowTask(t.id, on, at);
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.bg }}
      contentContainerStyle={[styles.page, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 48 }]}
    >
      <View style={styles.toolbar}>
        <GlassButton accessibilityLabel="Back" onPress={back}>
          <Icon d={GROW_ICON.back} color={c.ink} size={18} width={2.6} />
        </GlassButton>
      </View>
      <View>
        <Title size="largeTitle">Grow patch</Title>
        <Label muted>
          {placeName(climate)}
          {edibles.length ? ` · ${edibles.length} ${edibles.length === 1 ? 'crop' : 'crops'} growing` : ''}
        </Label>
      </View>

      {edibles.length === 0 ? (
        <Sticker drop={5} bg={c.mint} style={styles.empty}>
          <PlantBuddy speciesId="tomato" size={150} bg={c.mint} faces={faces} />
          <Text style={[styles.emptyTitle, { color: c.ink }]}>Nothing growing yet</Text>
          <Text style={[styles.emptyBody, { color: c.ink }]}>
            Add a tomato, a pepper or a pot of spring onions and we’ll track stages, watch the weather and count every harvest.
          </Text>
          <Button title="Add an edible" raised bg={c.sun} onPress={() => router.push('/add')} style={{ alignSelf: 'stretch', minHeight: 52 }} textStyle={{ ...type.headline }} />
        </Sticker>
      ) : (
        <>
          <WeatherStrip forecast={forecast} alerts={alerts} c={c} />
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} c={c} />
          ))}

          {tasks.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={[styles.section, { color: c.ink }]}>This month in {placeName(climate)}</Text>
              <Sticker drop={4} style={{ overflow: 'hidden' }}>
                {open.map((t, i) => (
                  <TaskRow key={t.id} task={t} done={false} onToggle={() => toggle(t)} onSkip={() => skip(t, true)} onOffSeason={() => {
                      haptics.tap();
                      offSeasonGrowTask(t.id, seasonEnd(t.id, climate, new Date()).toISOString());
                    }} plants={edibles} c={c} last={!finished.length && i === open.length - 1} />
                ))}
                {/* Done jobs fold away under one line; open it to untick a mis-tap. */}
                {finished.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: showDone }}
                    onPress={() => {
                      haptics.tap();
                      setShowDone(!showDone);
                    }}
                    style={({ pressed }) => [styles.doneRow, { borderColor: c.cloud }, !open.length && { borderTopWidth: 0 }, pressed && { backgroundColor: c.cloud }]}
                  >
                    <Icon d={GROW_ICON.check} color={c.good} size={18} width={2.6} />
                    <Text style={[styles.doneText, { color: c.inkMuted }]}>
                      {doneLine(finished.length - skipCount, skipCount, !open.length)}
                    </Text>
                    <Text style={[styles.doneText, { color: c.ink, textDecorationLine: 'underline' }]}>{showDone ? 'Hide' : 'Show'}</Text>
                  </Pressable>
                )}
                {showDone &&
                  finished.map((t, i) =>
                    skipped(t) ? (
                      <TaskRow key={t.id} task={t} done={false} skipped offUntil={offUntil(t)} onToggle={() => skip(t, false)} plants={edibles} c={c} last={i === finished.length - 1} />
                    ) : (
                      <TaskRow key={t.id} task={t} done onToggle={() => toggle(t)} plants={edibles} c={c} last={i === finished.length - 1} />
                    ),
                  )}
              </Sticker>
            </View>
          )}

          <View style={{ gap: 12 }}>
            <View style={styles.sectionRow}>
              <Text style={[styles.section, { color: c.ink }]}>Your crops</Text>
              <JungleViewToggle value={view} views={['grid', 'list']} onChange={(v) => setProfile({ growView: v })} />
            </View>
            {basket ? <Text style={[styles.basket, { color: c.inkMuted }]} numberOfLines={1}>Basket: {basket}</Text> : null}
            {view === 'grid' ? (
              <View style={styles.grid}>
                {crops.map((p) => {
                  const chip = chipFor(p.id);
                  return (
                    <CropTile
                      key={p.id}
                      plant={p}
                      chip={chip?.text}
                      chipTint={chip?.alert ? alertTint(chip.alert, c) : chip?.task ? taskTint(chip.task, c) : undefined}
                      onOpen={() => router.push(`/crop/${p.id}`)}
                      onHold={() => quick(p)}
                    />
                  );
                })}
              </View>
            ) : (
              crops.map((p) => <CropCard key={p.id} plant={p} total={formatTotals(stats.byPlant[p.id]?.totals)} now={now} />)
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const andList = (names: (string | undefined)[]) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

const styles = StyleSheet.create({
  skipRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16 },
  skipLink: { fontFamily: fonts.bodyHeavy, ...type.footnote, textDecorationLine: 'underline' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingHorizontal: 16, borderTopWidth: 1.5 },
  doneText: { fontFamily: fonts.bodyHeavy, ...type.callout },
  waiting: { marginTop: 6, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 7, overflow: 'hidden', fontFamily: fonts.bodyHeavy, ...type.footnote },
  page: { paddingHorizontal: space.xl, gap: space.lg },
  toolbar: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16 },
  offlineText: { flex: 1, fontFamily: fonts.bodyHeavy, ...type.footnote },
  strip: { flexDirection: 'row', gap: 5 },
  day: { flex: 1, borderWidth: 2, borderRadius: 14, alignItems: 'center', paddingVertical: 7, gap: 1 },
  dayName: { fontFamily: fonts.bodyHeavy, ...type.caption2 },
  dayMax: { fontFamily: fonts.display, ...type.headline },
  dayMin: { fontFamily: fonts.bodyHeavy, ...type.caption },
  alert: { flexDirection: 'row', gap: 12, padding: 12, alignItems: 'flex-start' },
  badge: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontFamily: fonts.display, ...type.headline },
  alertBody: { fontFamily: fonts.bodyHeavy, ...type.callout },
  section: { fontFamily: fonts.display, ...type.title3 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
  basket: { fontFamily: fonts.bodyHeavy, ...type.footnote, flexShrink: 1 },
  task: { flexDirection: 'row', gap: 12, padding: 12, alignItems: 'flex-start' },
  taskIcon: { width: 38, height: 38, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  taskHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  taskTitle: { fontFamily: fonts.displaySemi, ...type.body },
  strike: { textDecorationLine: 'line-through' },
  weekPill: { borderWidth: 2, borderRadius: 10, paddingHorizontal: 7, minHeight: 22, paddingVertical: 1, justifyContent: 'center' },
  weekText: { fontFamily: fonts.bodyHeavy, ...type.caption2 },
  taskBody: { fontFamily: fonts.body, ...type.footnote },
  taskWho: { fontFamily: fonts.bodyHeavy, ...type.caption },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  empty: { alignItems: 'center', padding: 20, gap: 10 },
  emptyTitle: { fontFamily: fonts.display, ...type.title2 },
  emptyBody: { fontFamily: fonts.bodyHeavy, ...type.callout, textAlign: 'center' },
});
