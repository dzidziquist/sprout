import { ART } from '@/data/art';
import { placeName } from '@/lib/climate';
import { useUnits } from '@/hooks/useUnits';
import { degrees, localizeTemps } from '@/lib/units';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore } from '@/store/plantStore';
import { daysInStage, ediblePlants, feedingAdvice, formatTotals, harvestStats, isTicked, skyOf, tasksFor, weatherAlerts, type DailyForecast, type GrowAlert, type GrowTask, type Sky } from '@/engine/growPatch';
import { edibleGuide } from '@/data/edibles';
import { speciesOf } from '@/data/species';
import { useForecast } from '@/lib/weather';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Label, Sticker, Title } from '@/components/ui';
import { GlassButton } from '@/components/GlassButton';
import { ALERT_ICON, GROW_ICON, Icon, alertTint, taskTint } from '@/components/GrowTodayCard';
import * as haptics from '@/lib/haptics';
import { fonts, type, space } from '@/theme/tokens';
import { textOn, useColors, type Palette } from '@/theme/theme';
import type { EdibleStage, Plant } from '@/types';


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
  fog: { d: 'M7 11h10a4 4 0 0 0 .5-7.97A6 6 0 0 0 6 5.5 3 3 0 0 0 7 11zM4 15h16M6 19h12', word: 'foggy', tone: (c) => c.inkMuted },
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

function TaskRow({ task, done, onToggle, plants, c, last }: { task: GrowTask; done: boolean; onToggle: () => void; plants: Plant[]; c: Palette; last: boolean }) {
  const units = useUnits();
  const who = task.plantIds.map((id) => plants.find((p) => p.id === id)?.name).filter(Boolean).join(', ');
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: done }}
      accessibilityLabel={task.title}
      onPress={onToggle}
      style={[styles.task, !last && { borderBottomWidth: 2, borderColor: c.cloud }]}
    >
      <View style={[styles.taskIcon, { backgroundColor: taskTint(task.kind, c), borderColor: c.line }]}>
        <Icon d={GROW_ICON[task.kind]} color={c.ink} size={20} />
      </View>
      <View style={{ flex: 1, gap: 2, opacity: done ? 0.45 : 1 }}>
        <Text style={[styles.taskTitle, { color: c.ink }, done && styles.strike]}>{task.title}</Text>
        <Text style={[styles.taskBody, { color: c.ink }]}>{localizeTemps(task.body, units)}</Text>
        <View style={styles.taskHead}>
          {task.thisWeek && !done ? (
            <View style={[styles.weekPill, { backgroundColor: c.sun, borderColor: c.line }]}>
              <Text style={[styles.weekText, { color: textOn(c.sun, c) }]}>This week</Text>
            </View>
          ) : null}
          <Text style={[styles.taskWho, { color: c.inkMuted, flexShrink: 1 }]}>For {who}</Text>
        </View>
      </View>
      <View style={[styles.check, { borderColor: c.line, backgroundColor: done ? c.leaf : c.card }]}>
        {done ? <Icon d={GROW_ICON.check} color={textOn(c.leaf, c)} size={16} width={3} /> : null}
      </View>
    </Pressable>
  );
}

function StageTrack({ plant, pending, onPick, c }: { plant: Plant; pending?: EdibleStage; onPick: (s: EdibleStage) => void; c: Palette }) {
  const guide = edibleGuide(plant.speciesId)!;
  const at = plant.stage ? guide.stages.indexOf(plant.stage) : -1;
  return (
    <View style={styles.track}>
      <View style={[styles.trackLine, { backgroundColor: c.line, left: `${50 / guide.stages.length}%`, right: `${50 / guide.stages.length}%` }]} />
      {guide.stages.map((s, i) => {
        const done = i < at;
        const now = i === at;
        const picked = pending === s;
        const fill = picked ? c.grape : now ? c.sun : done ? c.leaf : c.card;
        return (
          <Pressable
            key={s}
            accessibilityRole="button"
            accessibilityLabel={`${guide.info[s]!.label}${now ? ', current stage' : ''}`}
            accessibilityState={{ selected: now }}
            disabled={now}
            onPress={() => onPick(s)}
            hitSlop={4}
            style={styles.stageCol}
          >
            <View
              style={[
                styles.dot,
                { borderColor: c.line, backgroundColor: fill },
                (now || picked) && { boxShadow: `0px 0px 0px 3px ${c.card}, 0px 0px 0px 5px ${c.line}` },
              ]}
            >
              {done && !picked ? (
                <Icon d={GROW_ICON.check} color={textOn(fill, c)} size={14} width={3.2} />
              ) : (
                <Text style={[styles.dotNum, { color: textOn(fill, c) }]}>{i + 1}</Text>
              )}
            </View>
            <Text style={[styles.stageLabel, { color: now || done || picked ? c.ink : c.inkMuted }]} numberOfLines={1}>
              {guide.info[s]!.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function CropCard({ plant, total, now }: { plant: Plant; total?: string; now: Date }) {
  const units = useUnits();
  const c = useColors();
  const router = useRouter();
  const climate = usePlantStore((s) => s.profile.climate);
  const faces = usePlantStore((s) => s.profile.faces);
  const setStage = usePlantStore((s) => s.setStage);
  const logRegrow = usePlantStore((s) => s.logRegrow);
  const [pending, setPending] = useState<EdibleStage | undefined>();
  const guide = edibleGuide(plant.speciesId)!;
  const species = speciesOf(plant);
  const tint = c.potTint[plant.potColor];
  const info = plant.stage ? guide.info[plant.stage] : undefined;
  const days = daysInStage(plant, now);

  const confirm = () => {
    if (!pending) return;
    setStage(plant.id, pending);
    haptics.success();
    setPending(undefined);
  };

  const regrow = () => {
    logRegrow(plant.id);
    // A fresh cut sends it back to growing.
    if (plant.stage === 'harvesting') setStage(plant.id, 'growing');
    haptics.success();
  };

  return (
    <Sticker drop={5} style={{ overflow: 'hidden' }}>
      <View style={[styles.cropHead, { backgroundColor: tint, borderColor: c.line }]}>
        <View style={{ flex: 1, gap: 2, paddingVertical: 14 }}>
          <Text style={[styles.cropName, { color: c.ink }]} numberOfLines={1}>{plant.name}</Text>
          <Text style={[styles.cropKind, { color: c.ink }]} numberOfLines={1}>
            {species.commonName}
            {plant.room ? ` · ${plant.room}` : ''}
          </Text>
          <View style={styles.pills}>
            <View style={[styles.pill, { backgroundColor: c.card, borderColor: c.line }]}>
              <Text style={[styles.pillText, { color: c.ink }]}>
                {info ? (days === undefined ? info.label : `${info.label} · day ${days + 1}`) : 'Set a stage'}
              </Text>
            </View>
            {guide.regrows && (plant.regrowCount ?? 0) > 0 ? (
              <View style={[styles.pill, { backgroundColor: c.grape, borderColor: c.line }]}>
                <Text style={[styles.pillText, { color: textOn(c.grape, c) }]}>Regrown ×{plant.regrowCount}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <View style={styles.cropBuddy}>
          <PlantBuddy speciesId={plant.speciesId} pot={plant.potColor} size={104} bg={tint} faces={faces} />
        </View>
      </View>

      <View style={styles.cropBody}>
        <StageTrack plant={plant} pending={pending} c={c} onPick={(s) => { haptics.tap(); setPending(s === pending ? undefined : s); }} />

        {pending ? (
          <View style={[styles.confirm, { backgroundColor: c.lavender, borderColor: c.line }]}>
            <Text style={[styles.confirmText, { color: c.ink }]}>
              Move {plant.name} to <Text style={{ fontFamily: fonts.display }}>{guide.info[pending]!.label}</Text>?
            </Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title="Not yet" bg={c.card} onPress={() => setPending(undefined)} style={styles.confirmBtn} />
              <Button title="Yes, move" bg={c.leaf} onPress={confirm} style={styles.confirmBtn} />
            </View>
          </View>
        ) : (
          <View style={{ gap: 6 }}>
            <Text style={[styles.tip, { color: c.ink }]}>{info ? localizeTemps(info.tip, units) : 'Tap the stage it’s at now and we’ll tailor the tips.'}</Text>
            <View style={styles.metaRow}>
              <Icon d={GROW_ICON.feed} color={c.inkMuted} size={16} />
              <Text style={[styles.meta, { color: c.inkMuted }]}>{localizeTemps(feedingAdvice(plant, climate, now), units)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Icon d={GROW_ICON.harvest} color={c.inkMuted} size={16} />
              <Text style={[styles.meta, { color: c.inkMuted }]}>{total ? `Harvested ${total}` : 'No harvest yet. The first one gets a party.'}</Text>
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <Button title="Log harvest" raised bg={c.leaf} onPress={() => router.push(`/harvest/${plant.id}`)} style={styles.action} />
          {guide.regrows ? <Button title="Cut and regrow" raised bg={c.card} onPress={regrow} style={styles.action} /> : null}
        </View>
      </View>
    </Sticker>
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
  // Read once: ticking "Give it a stake" logs it, but the row stays (ticked) until the next visit.
  const [eventsAtOpen] = useState(events);
  const setStaked = usePlantStore((s) => s.setStaked);
  const now = new Date();

  const edibles = useMemo(() => ediblePlants(plants), [plants]);
  const forecast = useForecast(climate, edibles.length > 0);
  const units = useUnits();
  const alerts = useMemo(() => weatherAlerts(edibles, forecast, units), [edibles, forecast, units]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tasks = useMemo(() => tasksFor(edibles, climate, new Date(), eventsAtOpen), [edibles, climate, eventsAtOpen]);
  const stats = useMemo(() => harvestStats(events, edibles), [events, edibles]);
  const basket = formatTotals(stats.totals);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  // Ticks are saved: a repeating job ("every 2–3 days") comes back unticked after that, others next month.
  const done = (t: GrowTask) => isTicked(t, ticks ?? {}, now);
  const toggle = (t: GrowTask) => {
    haptics.tap();
    const on = !done(t);
    if (t.id === 'stage-stake' || t.id === 'stage-trellis') setStaked(t.plantIds, on);
    tickGrowTask(t.id, on);
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
                {tasks.map((t, i) => (
                  <TaskRow key={t.id} task={t} done={done(t)} onToggle={() => toggle(t)} plants={edibles} c={c} last={i === tasks.length - 1} />
                ))}
              </Sticker>
            </View>
          )}

          <View style={{ gap: 12 }}>
            <View style={styles.sectionRow}>
              <Text style={[styles.section, { color: c.ink }]}>Your crops</Text>
              {basket ? <Text style={[styles.basket, { color: c.inkMuted }]} numberOfLines={1}>Basket: {basket}</Text> : null}
            </View>
            {edibles.map((p) => (
              <CropCard key={p.id} plant={p} total={formatTotals(stats.byPlant[p.id]?.totals)} now={now} />
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
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
  cropHead: { flexDirection: 'row', paddingLeft: 16, borderBottomWidth: 2, minHeight: 118 },
  cropName: { fontFamily: fonts.display, ...type.title2 },
  cropKind: { fontFamily: fonts.bodyHeavy, ...type.footnote },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  pill: { borderWidth: 2, borderRadius: 14, minHeight: 28, paddingVertical: 2, paddingHorizontal: 10, justifyContent: 'center' },
  pillText: { fontFamily: fonts.bodyHeavy, ...type.caption },
  cropBuddy: { width: 112, alignItems: 'center', justifyContent: 'flex-end', marginBottom: -6 },
  cropBody: { padding: 14, gap: 14 },
  track: { flexDirection: 'row', position: 'relative' },
  trackLine: { position: 'absolute', top: 14, height: 2 },
  stageCol: { flex: 1, alignItems: 'center', gap: 4 },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotNum: { fontFamily: fonts.bodyHeavy, ...type.caption },
  stageLabel: { fontFamily: fonts.bodyHeavy, ...type.caption2 },
  confirm: { borderWidth: 2, borderRadius: 16, padding: 12, gap: 10 },
  confirmText: { fontFamily: fonts.bodyHeavy, ...type.body },
  confirmBtn: { flex: 1, minHeight: 42 },
  tip: { fontFamily: fonts.bodyHeavy, ...type.callout },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontFamily: fonts.bodyHeavy, ...type.footnote, flexShrink: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, minHeight: 46 },
  empty: { alignItems: 'center', padding: 20, gap: 10 },
  emptyTitle: { fontFamily: fonts.display, ...type.title2 },
  emptyBody: { fontFamily: fonts.bodyHeavy, ...type.callout, textAlign: 'center' },
});
