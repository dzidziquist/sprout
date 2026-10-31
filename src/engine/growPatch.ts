import { fmtRain, fmtTemp, type Units } from '../lib/units';
import { climateDate, localizeClimateText, modelOf } from '../lib/climate';
import { CALENDAR, edibleGuide, supportFor, type CalendarTask, type FeedWindow, type TaskKind, type TaskWindow } from '../data/edibles';
import { isFeedingPaused } from './careEngine';
import { fedWithin } from './feeding';
import { mixFeedsUntil, mixStillFeeds, mixWaitText } from './mix';
import type { CareEvent, ClimateProfile, EdibleStage, Placement, Plant } from '../types';

/*
 * Grow patch engine: pure functions over plants, events, the month calendar and a daily forecast.
 * No React, no store, so it's easy to test.
 */

const DAY = 86400000;

/** Live (not archived) plants we have grow guidance for. */
export function ediblePlants(plants: Plant[]): Plant[] {
  return plants.filter((p) => !p.archivedAt && !p.rooting && !!edibleGuide(p.speciesId));
}

export function stagesFor(speciesId: Plant['speciesId']): EdibleStage[] {
  return edibleGuide(speciesId)?.stages ?? [];
}

/** The stage after `stage` for this species, or undefined at the end. No stage yet → the first one. */
export function nextStage(speciesId: Plant['speciesId'], stage: EdibleStage | undefined): EdibleStage | undefined {
  const stages = stagesFor(speciesId);
  if (!stage) return stages[0];
  const i = stages.indexOf(stage);
  return i < 0 ? stages[0] : stages[i + 1];
}

export function daysInStage(plant: Pick<Plant, 'stageAt'>, now: Date): number | undefined {
  if (!plant.stageAt) return undefined;
  return Math.max(0, Math.floor((now.getTime() - new Date(plant.stageAt).getTime()) / DAY));
}

const OUTSIDE: Placement[] = ['outdoor', 'covered_outdoor', 'ground'];
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function inFeedWindow(w: FeedWindow, date: Date): boolean {
  const m = date.getMonth();
  return m >= w.from && (m < w.to || (m === w.to && date.getDate() <= (w.toDay ?? 31)));
}

/** The Seattle outdoor feeding window for this plant, when it has one and lives outside. */
function outdoorFeedWindow(plant: Pick<Plant, 'placement' | 'speciesId'>, climate: ClimateProfile): FeedWindow | undefined {
  if (modelOf(climate) !== 'seattle' || !OUTSIDE.includes(plant.placement)) return undefined;
  return edibleGuide(plant.speciesId)?.seattleOutdoorFeed;
}

/**
 * Feeding for edibles. Seattle balcony edibles with a feeding window (fruiting crops May to mid-August,
 * garlic in spring, blueberries spring only...) are fed only inside it (WSU / soil_and_seattle notes).
 * Everything else, and anything indoors, follows the houseplant pause, except an indoor fruiting crop
 * (tomato, pepper...) that's flowering or fruiting: it's busy making fruit, so it keeps eating. Resting plants never eat.
 */
export function edibleFeedingPaused(plant: Pick<Plant, 'placement' | 'stage' | 'speciesId'>, climate: ClimateProfile, date: Date): boolean {
  if (plant.stage === 'resting' || plant.stage === 'seed') return true;
  const w = outdoorFeedWindow(plant, climate);
  if (w) return !inFeedWindow(w, climateDate(climate, date));
  const cropping = plant.stage === 'flowering' || plant.stage === 'fruiting' || plant.stage === 'harvesting';
  if (!OUTSIDE.includes(plant.placement) && cropping && edibleGuide(plant.speciesId)?.fruitingFeed) return false;
  return isFeedingPaused(climate, plant.placement, date);
}

/**
 * Indoors (not under a grow light) in a climate's dark season, when houseplant feeding pauses: a fruiting
 * crop still eats, but slowly, so its feed goes to half strength every 2 weeks.
 */
export function darkIndoor(plant: Pick<Plant, 'placement'>, climate: ClimateProfile, date: Date): boolean {
  return !OUTSIDE.includes(plant.placement) && isFeedingPaused(climate, plant.placement, date);
}

const DARK_POTASH = 'Half-strength tomato feed every 2 weeks';

/** What to feed right now, in a few words. */
export function feedingAdvice(plant: Plant, climate: ClimateProfile, date: Date): string {
  const guide = edibleGuide(plant.speciesId);
  const info = plant.stage ? guide?.info[plant.stage] : undefined;
  if (!info) return 'Pick a stage for feeding tips';
  if (plant.stage !== 'seed' && plant.stage !== 'resting' && edibleFeedingPaused(plant, climate, date)) {
    const w = outdoorFeedWindow(plant, climate);
    if (!w) return 'Feeding paused for winter';
    const m = climateDate(climate, date).getMonth();
    // After the window and before November: the plant is finishing its season.
    if (m >= w.from && m < 10) return guide?.fruitingFeed ? 'No feed now: ripening season' : 'No feed now: winding down';
    // Before the window in spring: say when it starts.
    if (m < w.from && m >= 1) return localizeClimateText(`No feed yet: starts in ${MONTH_NAMES[w.from]}`, climate);
    return 'Feeding paused for winter';
  }
  // Fresh mix with fertiliser in it: feeding waits (engine/mix).
  const wait = mixWaitText(plant, date);
  if (wait) return wait;
  const cropping = plant.stage === 'flowering' || plant.stage === 'fruiting' || plant.stage === 'harvesting';
  if (cropping && guide?.fruitingFeed && darkIndoor(plant, climate, date)) return DARK_POTASH;
  return info.feed;
}

/** Tasks ----------------------------------------------------------------------------------- */

export interface GrowTask {
  id: string;
  kind: TaskKind;
  title: string;
  body: string;
  /** Plants this applies to (ids), in fam order. */
  plantIds: string[];
  /** Due in the coming 7 days (vs. sometime this month). */
  thisWeek: boolean;
  /** A repeating job: a tick lasts this many days. Without it, a tick lasts the rest of the month. */
  repeatDays?: number;
  /** Feed tasks: plants left out because their fresh mix still feeds them, and until about when. */
  waiting?: { plantIds: string[]; until: string };
}

/** Grow jobs that are feeds (ticking one logs a feed for its plants), with how long a tick lasts. */
export const FEED_TASKS = new Map<string, number | undefined>([
  ['stage-potash', 10],
  ['stage-potash-slow', 14],
  ...Object.values(CALENDAR).flatMap((tasks) => tasks.filter((t) => t.kind === 'feed').map((t) => [t.id, t.repeatDays] as [string, number | undefined])),
]);

/** When each grow task was last ticked off (task id → ISO time). */
export type GrowTicks = Record<string, string>;

/**
 * Whether a task still counts as done: ticked within its last `repeatDays` days (today only for a daily
 * job), or for a one-off, ticked this month. So "Shake the flowers" comes back after 3 days.
 */
export function isTicked(task: Pick<GrowTask, 'id' | 'repeatDays'>, ticks: GrowTicks, now: Date): boolean {
  const at = ticks[task.id];
  if (!at) return false;
  const then = new Date(at);
  if (task.repeatDays) {
    const days = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(then.getFullYear(), then.getMonth(), then.getDate()).getTime()) / DAY);
    return days >= 0 && days < task.repeatDays;
  }
  return then.getFullYear() === now.getFullYear() && then.getMonth() === now.getMonth();
}

/**
 * The events to plan grow jobs from, minus the "staked" events logged by ticking "Give it a stake" or
 * "Something to climb" while that tick lasts. Otherwise logging it would drop the job from the list,
 * leaving nothing to untick when it was a mis-tap.
 */
export function withTickedSupport(events: CareEvent[], plants: Plant[], ticks: GrowTicks, now: Date): CareEvent[] {
  // Same for feeds logged by ticking a feed job: they'd drop the plants from it, leaving nothing to untick.
  const fedSince = Object.entries(ticks)
    .filter(([id]) => FEED_TASKS.has(id) && isTicked({ id, repeatDays: FEED_TASKS.get(id) }, ticks, now))
    .map(([, at]) => at)
    .sort()[0];
  if (fedSince) events = events.filter((e) => !(e.type === 'feed' && e.at >= fedSince));
  const since: Partial<Record<'stake' | 'trellis', string>> = {};
  for (const kind of ['stake', 'trellis'] as const) if (isTicked({ id: `stage-${kind}` }, ticks, now)) since[kind] = ticks[`stage-${kind}`];
  if (!since.stake && !since.trellis) return events;
  const kindOf = new Map(plants.map((p) => [p.id, supportFor(p.speciesId)]));
  return events.filter((e) => {
    if (e.type !== 'staked') return true;
    const kind = kindOf.get(e.plantId);
    const from = kind && since[kind];
    return !(from && e.at >= from);
  });
}

function windowRange(w: TaskWindow, year: number): [number, number] {
  const last = new Date(year, w.month + 1, 0).getDate();
  const start = new Date(year, w.month, w.from ?? 1).getTime();
  const end = new Date(year, w.month, Math.min(w.to ?? last, last), 23, 59, 59).getTime();
  return [start, end];
}

function overlaps(task: CalendarTask, from: number, to: number, year: number): boolean {
  // Check this year and neighbours so December/January windows work across New Year.
  return task.when.some((w) =>
    [year - 1, year, year + 1].some((y) => {
      const [s, e] = windowRange(w, y);
      return s <= to && e >= from;
    }),
  );
}

const KIND_ORDER: TaskKind[] = ['protect', 'harvest', 'plant', 'sow', 'feed', 'care'];

/**
 * Whether a calendar task fits where this plant is in its life. A task can list its stages; harvest jobs
 * otherwise wait for something to pick: fruit for fruiting crops, a grown plant for leaves and roots.
 * A plant with no stage logged gets every task, since we can't tell.
 */
export function taskFitsStage(task: Pick<CalendarTask, 'kind' | 'stages'>, plant: Pick<Plant, 'speciesId' | 'stage'>): boolean {
  if (!plant.stage) return true;
  if (task.stages) return task.stages.includes(plant.stage);
  if (task.kind !== 'harvest') return true;
  const stages = edibleGuide(plant.speciesId)?.stages;
  if (!stages) return true;
  const first = stages.includes('fruiting') ? 'fruiting' : stages.includes('growing') ? 'growing' : 'harvesting';
  const at = stages.indexOf(plant.stage);
  const end = stages.includes('harvesting') ? stages.indexOf('harvesting') : stages.length - 1;
  return at >= stages.indexOf(first) && at <= end;
}

/**
 * "Not this season" for a grow job: until its run in the calendar ends (the first month it isn't due),
 * or, for a job that follows the crop's stage (stake, flowers, feed), three months, about a season.
 */
export function seasonEnd(taskId: string, climate: ClimateProfile, realDate: Date): Date {
  const task = CALENDAR[modelOf(climate)].find((t) => t.id === taskId);
  const start = new Date(realDate.getFullYear(), realDate.getMonth(), 1);
  if (!task) return new Date(start.getFullYear(), start.getMonth() + 3, 1);
  const month = climateDate(climate, realDate).getMonth();
  let k = 1;
  while (k < 12 && task.when.some((w) => w.month === (month + k) % 12)) k++;
  return new Date(start.getFullYear(), start.getMonth() + k, 1);
}

/** Stages a staked or trellised crop needs its support by: once it's growing, until the season's done. */
const NEEDS_SUPPORT: EdibleStage[] = ['growing', 'flowering', 'fruiting', 'harvesting'];

/**
 * This month's grow jobs for the user's edibles: calendar tasks for the species they own, plus stage
 * tasks (high-potash at fruit swell, pollination while flowering). Each task appears once, listing every
 * plant it applies to. Tasks due this week come first.
 */
export function tasksFor(plants: Plant[], climate: ClimateProfile, realDate: Date, events: CareEvent[] = []): GrowTask[] {
  const mine = ediblePlants(plants);
  if (!mine.length) return [];
  // Calendar windows are written in the model city's months; read them on the matching day there.
  const date = climateDate(climate, realDate);
  const y = date.getFullYear();
  const monthStart = new Date(y, date.getMonth(), 1).getTime();
  const monthEnd = new Date(y, date.getMonth() + 1, 0, 23, 59, 59).getTime();
  const dayStart = new Date(y, date.getMonth(), date.getDate()).getTime();
  const weekEnd = dayStart + 7 * DAY - 1;
  const out: GrowTask[] = [];

  for (const task of CALENDAR[modelOf(climate)]) {
    if (!overlaps(task, monthStart, monthEnd, y)) continue;
    const plantIds = mine
      .filter((p) => (task.species as string[]).includes(p.speciesId) && taskFitsStage(task, p) && (!task.outdoorOnly || OUTSIDE.includes(p.placement)))
      .map((p) => p.id);
    if (!plantIds.length) continue;
    // A window that has already closed this month isn't worth showing.
    if (!overlaps(task, dayStart, monthEnd, y)) continue;
    out.push({ id: task.id, kind: task.kind, title: localizeClimateText(task.title, climate), body: localizeClimateText(task.body, climate), plantIds, thisWeek: overlaps(task, dayStart, weekEnd, y), repeatDays: task.repeatDays });
  }

  // Support: tall croppers and climbers need it once they're growing, until it's been logged.
  const staked = new Set(events.filter((e) => e.type === 'staked').map((e) => e.plantId));
  const unsupported = (kind: 'stake' | 'trellis') =>
    mine.filter((p) => supportFor(p.speciesId) === kind && p.stage && NEEDS_SUPPORT.includes(p.stage) && !staked.has(p.id));
  const stake = unsupported('stake');
  if (stake.length) {
    out.push({ id: 'stage-stake', kind: 'care', title: 'Give it a stake', body: 'Push a sturdy stake in beside the stem and tie it loosely as it grows. Fruit gets heavy.', plantIds: stake.map((p) => p.id), thisWeek: true });
  }
  const trellis = unsupported('trellis');
  if (trellis.length) {
    out.push({ id: 'stage-trellis', kind: 'care', title: 'Something to climb', body: 'Set up a trellis, netting or poles now, and guide the first tendrils onto it.', plantIds: trellis.map((p) => p.id), thisWeek: true });
  }

  // Stage triggers, driven by guide flags.
  const guide = (p: Plant) => edibleGuide(p.speciesId);
  const swelling = mine.filter((p) => (p.stage === 'fruiting' || p.stage === 'harvesting') && guide(p)?.fruitingFeed && !edibleFeedingPaused(p, climate, realDate));
  // Indoors through the dark season they grow slowly, so half strength, half as often.
  const slow = swelling.filter((p) => darkIndoor(p, climate, realDate));
  const fast = swelling.filter((p) => !slow.includes(p));
  if (fast.length) {
    out.push({ id: 'stage-potash', repeatDays: 10, kind: 'feed', title: 'High-potash feed', body: 'Fruit is swelling: switch to a tomato feed every 10–14 days.', plantIds: fast.map((p) => p.id), thisWeek: true });
  }
  if (slow.length) {
    out.push({ id: 'stage-potash-slow', repeatDays: 14, kind: 'feed', title: 'High-potash feed', body: 'Half-strength tomato feed every 2 weeks while fruit swells. Short days mean slow growth, so go easy.', plantIds: slow.map((p) => p.id), thisWeek: true });
  }
  // Plants a calendar pollination task already covers this month don't need a second reminder.
  const pollinated = new Set(out.filter((t) => t.id.includes('pollinate')).flatMap((t) => t.plantIds));
  const flowering = (how: 'shake' | 'brush') => mine.filter((p) => p.stage === 'flowering' && guide(p)?.pollinate === how && !pollinated.has(p.id));
  const shake = flowering('shake');
  if (shake.length) {
    out.push({ id: 'stage-pollinate', repeatDays: 3, kind: 'care', title: 'Shake the flowers', body: 'Tap or buzz open flowers at midday every 2–3 days to help them set.', plantIds: shake.map((p) => p.id), thisWeek: true });
  }
  const brush = flowering('brush');
  if (brush.length) {
    out.push({ id: 'stage-hand-pollinate', repeatDays: 2, kind: 'care', title: 'Hand-pollinate', body: 'In the morning, dab pollen from a male flower into the female (the one with a tiny fruit).', plantIds: brush.map((p) => p.id), thisWeek: true });
  }
  const basilFlowers = mine.filter((p) => p.speciesId === 'basil' && p.stage === 'flowering');
  if (basilFlowers.length && !out.some((t) => t.id === 'sea-basil-pinch' || t.id === 'acc-basil-pinch')) {
    out.push({ id: 'stage-basil', repeatDays: 7, kind: 'harvest', title: 'Pinch basil flowers', body: 'Nip the flower spikes so the leaves stay sweet.', plantIds: basilFlowers.map((p) => p.id), thisWeek: true });
  }

  return withFeedWaits(out, mine, events, realDate).sort((a, b) => Number(b.thisWeek) - Number(a.thisWeek) || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind));
}

/**
 * Feed tasks leave out plants fed lately (a feed logged within the task's repeat) and plants still fed by
 * a fresh mix with fertiliser in it (engine/mix), saying so, and wait altogether when every plant does.
 */
function withFeedWaits(tasks: GrowTask[], plants: Plant[], events: CareEvent[], now: Date): GrowTask[] {
  const byId = new Map(plants.map((p) => [p.id, p]));
  const fed = (id: string) => {
    const p = byId.get(id);
    return !!p && mixStillFeeds(p, now);
  };
  return tasks.flatMap((t) => {
    if (t.kind !== 'feed') return [t];
    const recent = t.plantIds.filter((id) => fedWithin(id, events, t.repeatDays ?? 14, now));
    if (recent.length) t = { ...t, plantIds: t.plantIds.filter((id) => !recent.includes(id)) };
    if (!t.plantIds.length) return [];
    const waiting = t.plantIds.filter(fed);
    if (!waiting.length) return [t];
    const left = t.plantIds.filter((id) => !fed(id));
    if (!left.length) return [];
    // The latest end, so "till about" is true for every plant named.
    const until = waiting.map((id) => mixFeedsUntil(byId.get(id)!)!.getTime()).reduce((a, b) => Math.max(a, b));
    return [{ ...t, plantIds: left, waiting: { plantIds: waiting, until: new Date(until).toISOString() } }];
  });
}

/** Weather ---------------------------------------------------------------------------------- */

export interface DailyForecast {
  /** Local date, YYYY-MM-DD. */
  date: string;
  minC: number;
  maxC: number;
  precipMm: number;
  /** WMO weather code from Open-Meteo (0 clear … 95+ thunderstorm), when the forecast has one. */
  code?: number;
}

export type Sky = 'sun' | 'partly' | 'cloud' | 'fog' | 'rain' | 'storm' | 'snow';

/** The day's sky in one word, for the forecast icon. Falls back to rainfall when there's no code. */
export function skyOf(d: Pick<DailyForecast, 'code' | 'precipMm'>): Sky | undefined {
  const c = d.code;
  if (c === undefined) return d.precipMm >= 1 ? 'rain' : undefined;
  if (c <= 1) return 'sun';
  if (c === 2) return 'partly';
  if (c === 3) return 'cloud';
  if (c === 45 || c === 48) return 'fog';
  if ((c >= 71 && c <= 77) || c === 85 || c === 86) return 'snow';
  if (c >= 95) return 'storm';
  if ((c >= 51 && c <= 67) || (c >= 80 && c <= 82)) return 'rain';
  return 'cloud';
}

export type AlertKind = 'frost' | 'cold-set' | 'heat-set' | 'warm-nights' | 'heavy-rain';

export interface GrowAlert {
  id: string;
  kind: AlertKind;
  title: string;
  body: string;
  plantIds: string[];
  /** Forecast days that trigger it. */
  dates: string[];
}

export const FROST_C = 2;
export const WARM_NIGHT_C = 24; // nights above ~75°F also sterilise tomato/pepper pollen
export const HEAVY_RAIN_MM = 20;

const SETTING: EdibleStage[] = ['flowering', 'fruiting'];

function names(ids: string[], plants: Plant[]): string {
  const n = ids.map((id) => plants.find((p) => p.id === id)?.name).filter(Boolean) as string[];
  if (n.length <= 1) return n[0] ?? '';
  return `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`;
}



/**
 * Weather alerts for edibles that live outside (balcony, covered or not). Indoor plants don't feel the
 * forecast. Each kind appears once, naming every plant and day it affects. Most urgent first.
 */
export function weatherAlerts(plants: Plant[], forecast: DailyForecast[] | null | undefined, units: Units = 'metric'): GrowAlert[] {
  const fmtC = (c: number) => fmtTemp(c, units);
  if (!forecast?.length) return [];
  const outside = ediblePlants(plants).filter((p) => OUTSIDE.includes(p.placement));
  if (!outside.length) return [];
  const alerts: GrowAlert[] = [];
  const add = (kind: AlertKind, hit: Plant[], days: DailyForecast[], text: (who: string, days: DailyForecast[]) => { title: string; body: string }) => {
    if (!hit.length || !days.length) return;
    const ids = hit.map((p) => p.id);
    alerts.push({ id: kind, kind, plantIds: ids, dates: days.map((d) => d.date), ...text(names(ids, plants), days) });
  };

  // Frost: anything living outside.
  const frostDays = forecast.filter((d) => d.minC <= FROST_C);
  add('frost', outside, frostDays, (who, days) => ({
    title: `Frost risk: ${fmtC(Math.min(...days.map((d) => d.minC)))}`,
    body: `Bring ${who} inside or cover them overnight.`,
  }));

  // Plants setting fruit, with their temperature limits.
  const setters = outside.filter((p) => {
    const g = edibleGuide(p.speciesId);
    return p.stage && SETTING.includes(p.stage) && (g?.setNightMinC !== undefined || g?.setDayMaxC !== undefined);
  });
  const nightMin = (p: Plant) => edibleGuide(p.speciesId)?.setNightMinC ?? -Infinity;
  const dayMax = (p: Plant) => edibleGuide(p.speciesId)?.setDayMaxC ?? Infinity;
  // Cold nights: tomatoes under 13°C, peppers under 15.5°C, beans and cucurbits under 10°C (frost days are covered above).
  const coldNight = (d: DailyForecast, p: Plant) => d.minC > FROST_C && d.minC < nightMin(p);
  const coldHit = setters.filter((p) => forecast.some((d) => coldNight(d, p)));
  const coldDays = forecast.filter((d) => coldHit.some((p) => coldNight(d, p)));
  add('cold-set', coldHit, coldDays, (who, days) => ({
    title: `Chilly nights: ${fmtC(Math.min(...days.map((d) => d.minC)))}`,
    body: `${who} may drop flowers and won’t set new fruit. Ripen what’s there; a sheltered wall helps.`,
  }));

  const heatHit = setters.filter((p) => forecast.some((d) => d.maxC > dayMax(p)));
  const heatDays = forecast.filter((d) => heatHit.some((p) => d.maxC > dayMax(p)));
  add('heat-set', heatHit, heatDays, (who, days) => ({
    title: `Hot days: ${fmtC(Math.max(...days.map((d) => d.maxC)))}`,
    body: `Flower-drop weather for ${who}. Afternoon shade, even watering, and shake the flowers in the morning.`,
  }));

  const warmDays = forecast.filter((d) => d.minC > WARM_NIGHT_C);
  add('warm-nights', setters, warmDays, (who, days) => ({
    title: `Warm nights: ${fmtC(Math.max(...days.map((d) => d.minC)))}`,
    body: `Pollen struggles above ${fmtC(WARM_NIGHT_C)} at night. Expect a few dropped flowers on ${who}.`,
  }));

  const rainDays = forecast.filter((d) => d.precipMm >= HEAVY_RAIN_MM);
  const exposed = outside.filter((p) => p.placement === 'outdoor');
  add('heavy-rain', exposed, rainDays, (who, days) => ({
    title: `Heavy rain: ${fmtRain(Math.max(...days.map((d) => d.precipMm)), units)}`,
    body: `Tuck ${who} under cover or tip out saucers so roots don’t sit in water.`,
  }));

  return alerts;
}

/** Harvests --------------------------------------------------------------------------------- */

export interface PlantHarvest {
  totals: Record<string, number>;
  picks: number;
  firstAt?: string;
  lastAt?: string;
}

export interface HarvestStats {
  byPlant: Record<string, PlantHarvest>;
  /** Totals per unit across the patch. */
  totals: Record<string, number>;
  picks: number;
  firstAt?: string;
}

/** Harvest totals per plant and unit. Events for plants not in `plants` are ignored. */
export function harvestStats(events: CareEvent[], plants: Plant[]): HarvestStats {
  const known = new Set(plants.map((p) => p.id));
  const out: HarvestStats = { byPlant: {}, totals: {}, picks: 0 };
  const harvests = events.filter((e) => e.type === 'harvest' && known.has(e.plantId)).sort((a, b) => a.at.localeCompare(b.at));
  for (const e of harvests) {
    const unit = e.unit ?? 'fruit';
    const amount = e.amount ?? 1;
    const ph = (out.byPlant[e.plantId] ??= { totals: {}, picks: 0 });
    ph.totals[unit] = (ph.totals[unit] ?? 0) + amount;
    ph.picks += 1;
    ph.firstAt ??= e.at;
    ph.lastAt = e.at;
    out.totals[unit] = (out.totals[unit] ?? 0) + amount;
    out.picks += 1;
    out.firstAt ??= e.at;
  }
  return out;
}

export function isFirstHarvest(events: CareEvent[], plantId: string): boolean {
  return !events.some((e) => e.type === 'harvest' && e.plantId === plantId);
}

const PLURAL: Record<string, [string, string]> = {
  fruit: ['fruit', 'fruit'],
  handful: ['handful', 'handfuls'],
  bunch: ['bunch', 'bunches'],
  bulb: ['bulb', 'bulbs'],
  grams: ['g', 'g'],
};

export function formatAmount(amount: number, unit: string): string {
  const [one, many] = PLURAL[unit] ?? [unit, unit];
  return unit === 'grams' ? `${amount} g` : `${amount} ${amount === 1 ? one : many}`;
}

/** "12 fruit · 2 handfuls", or undefined when nothing has been picked. */
export function formatTotals(totals: Record<string, number> | undefined): string | undefined {
  if (!totals) return undefined;
  const parts = Object.entries(totals).filter(([, n]) => n > 0).map(([u, n]) => formatAmount(n, u));
  return parts.length ? parts.join(' · ') : undefined;
}
