import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore } from '@/store/plantStore';
import { daysInStage, ediblePlants, feedingAdvice, formatTotals, harvestStats, tasksFor, weatherAlerts, type DailyForecast, type GrowAlert, type GrowTask } from '@/engine/growPatch';
import { edibleGuide } from '@/data/edibles';
import { SPECIES } from '@/data/species';
import { useForecast } from '@/lib/weather';
import { PlantBuddy } from '@/components/PlantBuddy';
import { Button, Label, Sticker, Title } from '@/components/ui';
import { GlassButton } from '@/components/GlassButton';
import { ALERT_ICON, GROW_ICON, Icon, alertTint, taskTint } from '@/components/GrowTodayCard';
import * as haptics from '@/lib/haptics';
import { fonts } from '@/theme/tokens';
import { textOn, useColors, type Palette } from '@/theme/theme';
import type { EdibleStage, Plant } from '@/types';

const CITY_NAME = { seattle: 'Seattle', accra: 'Accra' } as const;

function weekday(iso: string, i: number) {
  if (i === 0) return 'Today';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short' });
}

function WeatherStrip({ forecast, alerts, c }: { forecast: DailyForecast[] | null; alerts: GrowAlert[]; c: Palette }) {
  if (!forecast) {
    return (
      <Sticker drop={0} bg={c.cloud} style={styles.offline}>
        <Icon d={GROW_ICON.rain} color={c.inkMuted} />
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
        return (
          <View
            key={d.date}
            accessibilityLabel={`${weekday(d.date, i)}: high ${Math.round(d.maxC)}, low ${Math.round(d.minC)} degrees${tint ? ', alert' : ''}`}
            style={[styles.day, { borderColor: c.line, backgroundColor: tint ?? c.card }, tint && { boxShadow: `0px 3px 0px ${c.drop}` }]}
          >
            <Text style={[styles.dayName, { color: c.ink }]} numberOfLines={1}>{weekday(d.date, i)}</Text>
            <Text style={[styles.dayMax, { color: c.ink }]}>{Math.round(d.maxC)}°</Text>
            <Text style={[styles.dayMin, { color: c.inkMuted }]}>{Math.round(d.minC)}°</Text>
            <View style={{ height: 14, justifyContent: 'center' }}>
              {d.precipMm >= 5 ? <Icon d={GROW_ICON.rain} color={c.ink} size={14} width={2.4} /> : null}
            </View>
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
        <Text style={[styles.taskBody, { color: c.ink }]}>{task.body}</Text>
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
  const c = useColors();
  const router = useRouter();
  const climate = usePlantStore((s) => s.profile.climate);
  const faces = usePlantStore((s) => s.profile.faces);
  const setStage = usePlantStore((s) => s.setStage);
  const logRegrow = usePlantStore((s) => s.logRegrow);
  const [pending, setPending] = useState<EdibleStage | undefined>();
  const guide = edibleGuide(plant.speciesId)!;
  const species = SPECIES[plant.speciesId];
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
            <Text style={[styles.tip, { color: c.ink }]}>{info ? info.tip : 'Tap the stage it’s at now and we’ll tailor the tips.'}</Text>
            <View style={styles.metaRow}>
              <Icon d={GROW_ICON.feed} color={c.inkMuted} size={16} />
              <Text style={[styles.meta, { color: c.inkMuted }]}>{feedingAdvice(plant, climate, now)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Icon d={GROW_ICON.harvest} color={c.inkMuted} size={16} />
              <Text style={[styles.meta, { color: c.inkMuted }]}>{total ? `Harvested ${total}` : 'No harvest yet. The first one gets a party.'}</Text>
            </View>
          </View>
        )}

        <View style={styles.actions}>
          <Button title="Log harvest" raised bg={c.leaf} onPress={() => router.push(`/harvest/${plant.id}`)} style={styles.action} />
          {guide.regrows ? <Button title="Cut & regrow" raised bg={c.card} onPress={regrow} style={styles.action} /> : null}
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
  const [done, setDone] = useState<Set<string>>(new Set());
  const now = new Date();

  const edibles = useMemo(() => ediblePlants(plants), [plants]);
  const forecast = useForecast(climate, edibles.length > 0);
  const alerts = useMemo(() => weatherAlerts(edibles, forecast), [edibles, forecast]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tasks = useMemo(() => tasksFor(edibles, climate, new Date()), [edibles, climate]);
  const stats = useMemo(() => harvestStats(events, edibles), [events, edibles]);
  const basket = formatTotals(stats.totals);

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const toggle = (id: string) => {
    haptics.tap();
    setDone((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
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
        <Title style={{ fontSize: 36, lineHeight: 40 }}>Grow patch</Title>
        <Label muted>
          {CITY_NAME[climate]}
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
          <Button title="Add an edible" raised bg={c.sun} onPress={() => router.push('/add')} style={{ alignSelf: 'stretch', minHeight: 52 }} textStyle={{ fontSize: 17 }} />
        </Sticker>
      ) : (
        <>
          <WeatherStrip forecast={forecast} alerts={alerts} c={c} />
          {alerts.map((a) => (
            <AlertCard key={a.id} alert={a} c={c} />
          ))}

          {tasks.length > 0 && (
            <View style={{ gap: 8 }}>
              <Text style={[styles.section, { color: c.ink }]}>This month in {CITY_NAME[climate]}</Text>
              <Sticker drop={4} style={{ overflow: 'hidden' }}>
                {tasks.map((t, i) => (
                  <TaskRow key={t.id} task={t} done={done.has(t.id)} onToggle={() => toggle(t.id)} plants={edibles} c={c} last={i === tasks.length - 1} />
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
  page: { paddingHorizontal: 20, gap: 16 },
  toolbar: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  offline: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 16 },
  offlineText: { flex: 1, fontFamily: fonts.bodyHeavy, fontSize: 13, lineHeight: 18 },
  strip: { flexDirection: 'row', gap: 5 },
  day: { flex: 1, borderWidth: 2, borderRadius: 14, alignItems: 'center', paddingVertical: 7, gap: 1 },
  dayName: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
  dayMax: { fontFamily: fonts.display, fontSize: 17 },
  dayMin: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  alert: { flexDirection: 'row', gap: 12, padding: 12, alignItems: 'flex-start' },
  badge: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  alertTitle: { fontFamily: fonts.display, fontSize: 18 },
  alertBody: { fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 19 },
  section: { fontFamily: fonts.display, fontSize: 21 },
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 10 },
  basket: { fontFamily: fonts.bodyHeavy, fontSize: 13, flexShrink: 1 },
  task: { flexDirection: 'row', gap: 12, padding: 12, alignItems: 'flex-start' },
  taskIcon: { width: 38, height: 38, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  taskHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  taskTitle: { fontFamily: fonts.displaySemi, fontSize: 16 },
  strike: { textDecorationLine: 'line-through' },
  weekPill: { borderWidth: 2, borderRadius: 10, paddingHorizontal: 7, height: 22, justifyContent: 'center' },
  weekText: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
  taskBody: { fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  taskWho: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  check: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  cropHead: { flexDirection: 'row', paddingLeft: 16, borderBottomWidth: 2, minHeight: 118 },
  cropName: { fontFamily: fonts.display, fontSize: 24, lineHeight: 28 },
  cropKind: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  pill: { borderWidth: 2, borderRadius: 14, height: 28, paddingHorizontal: 10, justifyContent: 'center' },
  pillText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  cropBuddy: { width: 112, alignItems: 'center', justifyContent: 'flex-end', marginBottom: -6 },
  cropBody: { padding: 14, gap: 14 },
  track: { flexDirection: 'row', position: 'relative' },
  trackLine: { position: 'absolute', top: 14, height: 2 },
  stageCol: { flex: 1, alignItems: 'center', gap: 4 },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotNum: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  stageLabel: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
  confirm: { borderWidth: 2, borderRadius: 16, padding: 12, gap: 10 },
  confirmText: { fontFamily: fonts.bodyHeavy, fontSize: 15 },
  confirmBtn: { flex: 1, minHeight: 42 },
  tip: { fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 19 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  meta: { fontFamily: fonts.bodyHeavy, fontSize: 13, flexShrink: 1 },
  actions: { flexDirection: 'row', gap: 8 },
  action: { flex: 1, minHeight: 46 },
  empty: { alignItems: 'center', padding: 20, gap: 10 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 24 },
  emptyBody: { fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
