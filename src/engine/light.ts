import { speciesOf } from '../data/species';
import { skyOf, type DailyForecast } from './growPatch';
import type { Light, Plant, WindowSpot } from '../types';

export type { WindowSpot };

/*
 * How much light a plant gets, from where it sits: which way its room's windows face, what's in the
 * way, how far it is from the glass, and the sun's real path for the place and the date.
 *
 * The sun's path comes from the latitude alone (standard solar declination and hour angle), so it
 * works for any city: a north window gets the sun south of the equator, and near the equator the sun
 * is high enough that direction matters less. What a window lets in is the direct beam on a
 * vertical pane, cos(elevation) × cos(angle between the sun and the window's facing), so a high
 * midday sun barely reaches inside however the window faces. Plus diffuse sky light for every
 * hour of daylight. It's an estimate: it can't see the tree outside, so it only ever suggests.
 */

export type Facing = 'N' | 'E' | 'S' | 'W';
export type Shade = 'none' | 'sheer' | 'outside';

/** One window: which way it faces (none when not sure: worked out as an average window) and what's in the way. */
export interface WindowLight {
  id: string;
  facing?: Facing;
  shade: Shade;
}

/** A room's windows, each with its own view. Empty: no window (hallway, bathroom). */
export interface RoomLight {
  windows: WindowLight[];
}

/** How rooms were saved before each window had its own view: directions and one shade for the room. */
export interface LegacyRoomLight {
  windows: Facing[];
  shade: Shade;
  unsure?: boolean;
}

export type AnyRoomLight = RoomLight | LegacyRoomLight;

/** A room's windows, reading either shape. An older room's windows each get its one shade; ids are their directions. */
export function windowsOf(room: AnyRoomLight): WindowLight[] {
  const list = room.windows as unknown[];
  if (list.length && typeof list[0] === 'object') return room.windows as WindowLight[];
  const old = room as LegacyRoomLight;
  const shade = old.shade ?? 'none';
  if (!old.windows?.length) return old.unsure ? [{ id: 'unsure', shade }] : [];
  return old.windows.map((f) => ({ id: f, facing: f, shade }));
}

/** A room in today's shape. */
export const roomLight = (room: AnyRoomLight): RoomLight => ({ windows: windowsOf(room) });

/** Whether a room lets daylight in at all. */
export const hasWindow = (room: AnyRoomLight) => windowsOf(room).length > 0;
const FACINGS: Facing[] = ['N', 'E', 'S', 'W'];

export const FACING_LABEL: Record<Facing, string> = { N: 'north', E: 'east', S: 'south', W: 'west' };
/** Where a plant sits, as the app says it everywhere (rows, cards, sheets). */
export const SPOT_LABEL: Record<WindowSpot, string> = { sill: 'On the sill', below: 'Below the window', near: 'About 1 m from the window', far: 'Across the room' };
/** The same, after a window's name in a room with several: "West · 1 m". */
export const SPOT_SHORT: Record<WindowSpot, string> = { sill: 'sill', below: 'below', near: '1 m', far: 'across the room' };
export const SHADE_LABEL: Record<Shade, string> = { none: 'Nothing in the way', sheer: 'Curtain or frosted glass', outside: 'Tree or building' };
/** A window's view in a word or two, for lists: "West · tree or building". */
export const SHADE_SHORT: Record<Shade, string> = { none: 'clear', sheer: 'curtain or frosted', outside: 'tree or building' };

const AZIMUTH: Record<Facing, number> = { N: 0, E: 90, S: 180, W: 270 };
const RAD = Math.PI / 180;
const DAY_MS = 86400000;

/**
 * How much of the window's direct sun and of its sky light reaches each spot. Below the sill the wall blocks
 * the beam and most of the sky, so it gets less than a spot 1 m back at window height.
 */
const SPOT_FACTOR: Record<WindowSpot, { direct: number; sky: number }> = {
  sill: { direct: 1, sky: 1 },
  below: { direct: 0.2, sky: 0.5 },
  near: { direct: 0.5, sky: 0.6 },
  far: { direct: 0.1, sky: 0.3 },
};
const SHADE_FACTOR: Record<Shade, number> = { none: 1, sheer: 0.6, outside: 0.5 };
/** Sky light per daylight hour, against a full hour of direct sun. */
const SKY_WEIGHT = 0.25;
/**
 * Where the home is, for its light: the latitude (the sun's path) and each month's clearness, the
 * sunlight measured at the ground against what arrives at the top of the atmosphere (January first).
 * Clearness comes from the city's own weather history; see lib/site.
 */
export interface Site {
  lat: number;
  clearness: readonly number[];
}

/** Clearness of a cloudless day: what's left after a clear atmosphere. */
const CLEAR_SKY = 0.72;
/** Share of the ground's sunlight that's diffuse sky light, for a month's clearness (Erbs et al., 1982, monthly). */
const diffuseShare = (kt: number) => 1.391 - 3.56 * kt + 4.189 * kt ** 2 - 2.137 * kt ** 3;
/** Direct sun reaching the ground for a clearness (the fit holds between 0.3 and 0.8). */
const beamOf = (kt: number) => {
  const k = Math.min(0.8, Math.max(0.3, kt));
  return k * (1 - diffuseShare(k));
};

/**
 * Typical share of a cloudless day's direct sun that gets through in this month, from the site's measured
 * clearness: about a fifth in a Seattle December, three quarters in its July.
 */
export function typicalSky(site: Site, date: Date): number {
  const kt = site.clearness[date.getMonth()];
  if (typeof kt !== 'number' || !Number.isFinite(kt)) return beamOf(0.5) / beamOf(CLEAR_SKY);
  return Math.min(1, beamOf(kt) / beamOf(CLEAR_SKY));
}

/**
 * Monthly clearness from daily history: each day's measured sunlight (MJ/m², Open-Meteo's
 * shortwave_radiation_sum) against the sunlight at the top of the atmosphere that day. Null unless every
 * month has at least 20 days of data.
 */
export function clearnessFrom(days: { date: string; radiation: number | null }[], lat: number): number[] | null {
  const ground = new Array(12).fill(0);
  const top = new Array(12).fill(0);
  const count = new Array(12).fill(0);
  const phi = lat * RAD;
  for (const d of days) {
    if (typeof d.radiation !== 'number' || !Number.isFinite(d.radiation)) continue;
    const [y, m, day] = d.date.split('-').map(Number);
    if (!y || !m || !day) continue;
    const n = dayOfYear(new Date(y, m - 1, day));
    const decl = 23.44 * Math.sin(((2 * Math.PI) / 365) * (284 + n)) * RAD;
    const ws = Math.acos(Math.max(-1, Math.min(1, -Math.tan(phi) * Math.tan(decl))));
    // Extraterrestrial sunlight on level ground over the day, MJ/m² (solar constant 1367 W/m²).
    const toa = ((24 * 3600) / Math.PI) * 1367e-6 * (1 + 0.033 * Math.cos((2 * Math.PI * n) / 365)) * (Math.cos(phi) * Math.cos(decl) * Math.sin(ws) + ws * Math.sin(phi) * Math.sin(decl));
    if (toa <= 0) continue;
    ground[m - 1] += d.radiation;
    top[m - 1] += toa;
    count[m - 1] += 1;
  }
  if (count.some((c) => c < 20)) return null;
  return ground.map((g, i) => Math.round((g / top[i]) * 1000) / 1000);
}

function dayOfYear(d: Date): number {
  return Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / DAY_MS);
}

export interface SunDay {
  /** Hours the sun is up. */
  daylight: number;
  /** Direct sun through a window facing each way, in full-strength hours. */
  direct: Record<Facing, number>;
  /** Hours each window gets any real direct sun. */
  sunHours: Record<Facing, number>;
}

const sunCache = new Map<string, SunDay>();

/** The sun's day at a latitude: daylight, and how much direct sun each window direction catches. Cached per place and day. */
export function sunDay(lat: number, date: Date): SunDay {
  const key = `${lat.toFixed(2)}|${date.getFullYear()}-${dayOfYear(date)}`;
  const hit = sunCache.get(key);
  if (hit) return hit;
  if (sunCache.size > 400) sunCache.clear();
  const day = computeSunDay(lat, date);
  sunCache.set(key, day);
  return day;
}

function computeSunDay(lat: number, date: Date): SunDay {
  const decl = 23.44 * Math.sin(((2 * Math.PI) / 365) * (284 + dayOfYear(date))) * RAD;
  const phi = lat * RAD;
  const direct: Record<Facing, number> = { N: 0, E: 0, S: 0, W: 0 };
  const sunHours: Record<Facing, number> = { N: 0, E: 0, S: 0, W: 0 };
  let daylight = 0;
  const step = 0.25;
  for (let h = 0; h < 24; h += step) {
    const hour = (h + step / 2 - 12) * 15 * RAD;
    const sinEl = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(hour);
    const el = Math.asin(Math.max(-1, Math.min(1, sinEl)));
    if (el <= 0) continue;
    daylight += step;
    if (el < 2 * RAD) continue;
    // Azimuth clockwise from north.
    const az = Math.atan2(Math.sin(hour), Math.cos(hour) * Math.sin(phi) - Math.tan(decl) * Math.cos(phi)) / RAD + 180;
    // A low sun shines through more air, so it's weaker: about half strength at 15° up against overhead.
    const strength = beamStrength(el);
    for (const f of ['N', 'E', 'S', 'W'] as Facing[]) {
      const k = Math.cos(el) * Math.cos((az - AZIMUTH[f]) * RAD);
      if (k > 0) direct[f] += k * strength * step;
      if (k > 0.15) sunHours[f] += step;
    }
  }
  return { daylight, direct, sunHours };
}

/** Clear-sky strength of the sun's beam at an elevation, against the sun overhead (Kasten–Young air mass). */
function beamStrength(el: number): number {
  const deg = el / RAD;
  const airMass = 1 / (Math.sin(el) + 0.50572 * Math.pow(deg + 6.07995, -1.6364));
  return Math.pow(0.7, Math.pow(airMass, 0.678)) / 0.7;
}

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Forecast days from today on (a cached forecast can still hold yesterday). */
export function daysAhead(forecast: DailyForecast[] | null | undefined, now: Date): DailyForecast[] {
  const today = ymd(now);
  return (forecast ?? []).filter((d) => d.date >= today);
}

/** Today's forecast, if the forecast has it. */
export function forecastToday(forecast: DailyForecast[] | null | undefined, now: Date): DailyForecast | undefined {
  return (forecast ?? []).find((d) => d.date === ymd(now));
}

/** Share of direct sun that gets through a day's weather. */
export function skyFactor(day: Pick<DailyForecast, 'code' | 'precipMm'> | undefined): number {
  const sky = day ? skyOf(day) : undefined;
  if (!sky) return 0.5;
  return sky === 'sun' ? 1 : sky === 'partly' ? 0.7 : 0.3;
}

const RANK: Record<Light, number> = { low: 0, medium: 1, bright: 2, direct: 3 };

export interface SpotLight {
  level: Light;
  /** Light score: full-sun hours plus weighted sky light. */
  score: number;
  /** The direct-sun part of it. */
  direct: number;
  /** Which way the window this spot is by faces, when known. */
  window?: Facing;
  /** The window this spot is by. */
  windowId?: string;
}

/**
 * The light at a spot in a room on a date: by the window `windowId` when it's given and still there, else
 * by the room's brightest window. `sky` is the share of direct sun the weather lets through.
 */
export function spotLight(room: AnyRoomLight, spot: WindowSpot, site: Site, date: Date, opts: { sky?: number; windowId?: string } = {}): SpotLight {
  const all = windowsOf(room);
  if (!all.length) return { level: 'low', score: 0, direct: 0 };
  const chosen = all.find((w) => w.id === opts.windowId);
  const sun = sunDay(site.lat, date);
  const sky = opts.sky ?? typicalSky(site, date);
  const f = SPOT_FACTOR[spot];
  let best: SpotLight | undefined;
  for (const w of chosen ? [chosen] : all) {
    // Direction unknown: an average window, neither the sunniest nor the darkest guess.
    const beam = w.facing ? sun.direct[w.facing] : FACINGS.reduce((sum, d) => sum + sun.direct[d], 0) / 4;
    const direct = beam * f.direct * SHADE_FACTOR[w.shade] * sky;
    const score = direct + sun.daylight * SKY_WEIGHT * f.sky;
    if (!best || score > best.score) best = { level: levelOf(score, direct), score, direct, window: w.facing, windowId: w.id };
  }
  return best!;
}

/**
 * Light levels from the score. Set so that a Seattle west sill is sunny in July and bright in October, a
 * south sill isn't too sunny for a pothos in winter, and 1 m from an east or west window still counts as
 * medium in December.
 */
function levelOf(score: number, direct: number): Light {
  if (score >= 5 && direct >= 1.5) return 'direct';
  if (score >= 2.3) return 'bright';
  if (score >= 1.2) return 'medium';
  return 'low';
}

/** What the plant's kind wants. */
export function lightNeed(plant: Pick<Plant, 'speciesId' | 'custom'>): Light {
  return speciesOf(plant).defaultLight;
}

/** Whether a light level suits a need: enough of it, and no harsh sun for plants that want shade or gentle light. */
export function suits(level: Light, need: Light): 'ok' | 'dim' | 'harsh' {
  if (RANK[level] < RANK[need]) return 'dim';
  if (level === 'direct' && RANK[need] <= RANK.medium) return 'harsh';
  return 'ok';
}

const SPOTS: WindowSpot[] = ['sill', 'below', 'near', 'far'];

/** Where to say a spot is, in words: "below the west window". */
export function spotWords(spot: WindowSpot, w: Facing | undefined): string {
  const win = w ? `the ${FACING_LABEL[w]} window` : 'the window';
  return spot === 'sill' ? `on ${w ? `the ${FACING_LABEL[w]}` : 'the'} sill` : spot === 'below' ? `below ${win}` : spot === 'near' ? `about 1 m from ${win}` : `across the room from ${win}`;
}

export interface LightTip {
  kind: 'heat' | 'harsh' | 'dim' | 'grey';
  text: string;
  /** Too dim, and no spot in the home has enough light: moving won't help, a grow light would. */
  growLight?: boolean;
}

export interface LightContext {
  site: Site;
  now: Date;
  /** Every room's light setup by name, to look for a better room when this one can't do. */
  rooms: Record<string, AnyRoomLight>;
  forecast?: DailyForecast[] | null;
}

/** Room setups for rooms that still have indoor plants: a renamed or emptied room isn't suggested any more. */
export function roomsInUse(rooms: Record<string, AnyRoomLight> | undefined, plants: Plant[]): Record<string, RoomLight> {
  const used = new Set(plants.filter((p) => !p.archivedAt && p.placement === 'indoor').map((p) => p.room?.trim()));
  return Object.fromEntries(Object.entries(rooms ?? {}).filter(([name]) => used.has(name)).map(([name, r]) => [name, roomLight(r)]));
}

/**
 * The plant's room light, spot and window, when the spot is set and it lives indoors in a room. `windowId` is
 * the window it's by, when the room has more than one and it was picked (else the brightest counts).
 */
export function placeOf(plant: Plant, rooms: Record<string, AnyRoomLight>): { name: string; room: RoomLight; spot: WindowSpot; windowId?: string } | null {
  const name = plant.room?.trim();
  if (!name || plant.placement !== 'indoor' || plant.archivedAt || plant.rooting) return null;
  const saved = rooms[name];
  if (!saved) return null;
  const room = roomLight(saved);
  // With no window every spot is the same, so there's no position to ask for.
  const spot = plant.windowSpot ?? (hasWindow(room) ? undefined : 'far');
  const windowId = room.windows.some((w) => w.id === plant.windowId) ? plant.windowId : undefined;
  return spot ? { name, room, spot, windowId } : null;
}

const shiftDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);

/**
 * One tip for a plant, only when there's a reason: a hot day ahead on a sunny sill, harsh sun for a
 * shade lover, too little light for its kind (said as a season thing when summer would be fine), or a
 * grey stretch for a plant that's only just getting enough. Null on ordinary days.
 */
export function lightTip(plant: Plant, ctx: LightContext): LightTip | null {
  const place = placeOf(plant, ctx.rooms);
  if (!place) return null;
  const { room, spot, windowId } = place;
  const need = lightNeed(plant);
  const here = spotLight(room, spot, ctx.site, ctx.now, { windowId });
  // The other season at its height (midsummer in winter, midwinter in summer), to tell a seasonal problem from a lasting one.
  const name = plant.name;
  const days = daysAhead(ctx.forecast, ctx.now).slice(0, 5);
  // Which half of the year it is here: a tip only calls something seasonal when the season it names is now.
  const longDays = sunDay(ctx.site.lat, ctx.now).daylight >= sunDay(ctx.site.lat, shiftDays(ctx.now, 182)).daylight;
  const peak = new Date(ctx.now.getFullYear(), (longDays ? 0 : 6) + (ctx.site.lat < 0 ? 6 : 0), 15);
  const halfYear = spotLight(room, spot, ctx.site, peak, { windowId });

  // A hot day on a sill that takes strong sun: worth pulling back for the afternoon.
  const hot = days.slice(0, 3).find((d) => d.maxC >= 30);
  if (hot && spot === 'sill' && here.direct >= 1.5 && need !== 'direct') {
    const day = new Date(`${hot.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long' });
    return { kind: 'heat', text: `Hot ${day} ahead: pull ${name} back from the sill that afternoon.` };
  }

  const fit = suits(here.level, need);
  if (fit === 'harsh') {
    const seasonal = longDays && suits(halfYear.level, need) === 'ok';
    return { kind: 'harsh', text: seasonal ? `Summer sun is strong here: try ${spotWords('near', here.window)} till autumn.` : `Strong sun here. Try ${spotWords('near', here.window)}.` };
  }

  if (fit === 'dim') {
    const better = brighterSpot(place.name, room, spot, here, need, ctx);
    const seasonal = !longDays && suits(halfYear.level, need) === 'ok';
    const sp = speciesOf(plant);
    const kind = sp.commonName.toLowerCase();
    if (!better) {
      if (!seasonal) return { kind: 'dim', growLight: true, text: `No spot in your home gets enough light for a ${kind}. A grow light would help.` };
      // Fruit and veg need the light to crop; a houseplant just rests through winter.
      return sp.edible
        ? { kind: 'dim', growLight: true, text: `No spot in your home gets enough light for a ${kind} at this time of year. A grow light would help till spring.` }
        : { kind: 'dim', growLight: true, text: `Less light than a ${kind} likes, which is normal in winter. It’ll grow slowly till spring; a grow light helps if it struggles.` };
    }
    return { kind: 'dim', text: seasonal ? `Short days: try ${better} till spring.` : `A bit dim here. Try ${better}.` };
  }

  // Only just enough light, and a grey stretch coming: a clearly brighter spot by the same window for now
  // (one that gets only a little more, like below the window against 1 m away, isn't worth the move).
  const grey = days.filter((d) => skyFactor(d) <= 0.3).length >= 4;
  if (grey && here.level === need && need !== 'low') {
    const closer = SPOTS.find((s) => {
      const there = spotLight(room, s, ctx.site, ctx.now, { windowId: here.windowId });
      return there.score >= here.score * 1.3 && suits(there.level, need) === 'ok';
    });
    if (closer) return { kind: 'grey', text: `Grey days ahead: ${name} would get more light ${spotWords(closer, here.window)} for now.` };
  }
  return null;
}

/**
 * The smallest move that would suit the plant: a brighter spot in this room (by its own window first, then
 * by another window), else another room.
 */
function brighterSpot(roomName: string, room: RoomLight, spot: WindowSpot, here: SpotLight, need: Light, ctx: LightContext): string | null {
  const ok = (l: SpotLight) => suits(l.level, need) === 'ok';
  const options = (ids: (string | undefined)[]) =>
    ids
      .flatMap((windowId) => SPOTS.map((s) => ({ s, light: spotLight(room, s, ctx.site, ctx.now, { windowId }) })))
      .filter(({ light }) => light.score > here.score && ok(light))
      .sort((a, b) => a.light.score - b.light.score);
  const others = room.windows.map((w) => w.id).filter((id) => id !== here.windowId);
  const move = options([here.windowId])[0] ?? options(others)[0];
  if (move) return spotWords(move.s, move.light.window);
  for (const [name, other] of Object.entries(ctx.rooms)) {
    if (name === roomName || !hasWindow(other)) continue;
    for (const s of ['near', 'below', 'sill'] as WindowSpot[]) {
      const there = spotLight(other, s, ctx.site, ctx.now);
      if (ok(there)) return `${spotWords(s, there.window)} in the ${name.toLowerCase()}`;
    }
  }
  return null;
}

/**
 * How a spot will suit the plant through the year, for a spot that suits it now: a warning when summer sun
 * or winter gloom would be too much for it here, else the spot's light over the year.
 */
export function yearFit(plant: Pick<Plant, 'speciesId' | 'custom'>, room: AnyRoomLight, spot: WindowSpot, site: Site, now: Date, windowId?: string): string {
  const need = lightNeed(plant);
  const year = now.getFullYear();
  const [winter, summer] = (site.lat >= 0 ? [new Date(year, 11, 21), new Date(year, 5, 21)] : [new Date(year, 5, 21), new Date(year, 11, 21)]).map((d) => suits(spotLight(room, spot, site, d, { windowId }).level, need));
  const longDays = sunDay(site.lat, now).daylight >= sunDay(site.lat, shiftDays(now, 182)).daylight;
  if (summer === 'harsh' && !longDays) return 'Good for now. Summer sun gets too strong here, so move it back from the glass in late spring.';
  if (winter === 'dim' && longDays) return 'Good for now. Too dim here in winter, so move it closer to the glass in autumn.';
  return yearLight(room, spot, site, year, windowId);
}

/** How a spot's light changes over the year: "Medium all year" or "Low in winter · bright in summer". */
export function yearLight(room: AnyRoomLight, spot: WindowSpot, site: Site, year: number, windowId?: string): string {
  const june = spotLight(room, spot, site, new Date(year, 5, 21), { windowId }).level;
  const dec = spotLight(room, spot, site, new Date(year, 11, 21), { windowId }).level;
  const [winter, summer] = site.lat >= 0 ? [dec, june] : [june, dec];
  const word = (l: Light) => (l === 'direct' ? 'sunny' : l);
  return winter === summer ? `${word(winter)[0].toUpperCase()}${word(winter).slice(1)} all year` : `${word(winter)[0].toUpperCase()}${word(winter).slice(1)} in winter · ${word(summer)} in summer`;
}

/** A room's light today in a few words: "About 3 h of sun today · cloudy". */
export function roomToday(room: AnyRoomLight, lat: number, now: Date, today?: DailyForecast): string {
  const windows = windowsOf(room);
  if (!windows.length) return 'No window · low light';
  const sun = sunDay(lat, now);
  const hours = Math.max(...windows.map((w) => (w.facing ? sun.sunHours[w.facing] : FACINGS.reduce((sum, d) => sum + sun.sunHours[d], 0) / 4)));
  const sky = today ? skyOf(today) : undefined;
  const weather = sky === 'sun' ? ' · clear' : sky === 'partly' ? ' · some cloud' : sky ? ' · cloudy' : '';
  if (hours < 0.5) return `Indirect light only today${weather}`;
  return `About ${Math.round(hours)} h of sun today${weather}`;
}

/** How well a spot suits a plant, in the same words everywhere (plant page, spot sheet, jungle light view). "Likely": it's a prediction. */
export const FIT_LABEL: Record<'ok' | 'dim' | 'harsh', string> = { ok: 'Likely suitable', dim: 'Likely too dark', harsh: 'Likely too sunny' };

const cap = (t: string) => `${t[0].toUpperCase()}${t.slice(1)}`;

/** A window's name: "West window", or "Window" when which way it faces isn't known. */
export const windowName = (w: Pick<WindowLight, 'facing'>) => (w.facing ? `${cap(FACING_LABEL[w.facing])} window` : 'Window');

/** Which way a window faces, in a word: "West", or "Not sure which way". */
export const windowDir = (w: Pick<WindowLight, 'facing'>) => (w.facing ? cap(FACING_LABEL[w.facing]) : 'Not sure which way');

/** A window in a few words, for lists: "West · tree or building", "Not sure which way · clear". */
export const windowShort = (w: Pick<WindowLight, 'facing' | 'shade'>) => `${windowDir(w)} · ${SHADE_SHORT[w.shade]}`;

/** A room's windows in a line: "South · clear, West · tree or building", or "No window". */
export function windowsLine(room: AnyRoomLight): string {
  const windows = windowsOf(room);
  return windows.length ? windows.map(windowShort).join(', ') : 'No window';
}

/**
 * How each spot by this room's window would suit the plant at this time of year, on a typical day. Weather is
 * left out on purpose so verdicts don't flip with each cloudy day; hot and grey spells come through lightTip.
 */
export function spotFits(plant: Pick<Plant, 'speciesId' | 'custom'>, room: AnyRoomLight, site: Site, now: Date, windowId?: string): Record<WindowSpot, 'ok' | 'dim' | 'harsh'> {
  const need = lightNeed(plant);
  return Object.fromEntries(SPOTS.map((s) => [s, suits(spotLight(room, s, site, now, { windowId }).level, need)])) as Record<WindowSpot, 'ok' | 'dim' | 'harsh'>;
}

/** A compass heading (degrees from north) rounded to the nearest of north, east, south and west. */
export const facingOf = (heading: number): Facing => FACINGS[Math.round((((heading % 360) + 360) % 360) / 90) % 4];

/**
 * Where a plant that wants `need` light would do best in this home today: the first set-up room and spot
 * that suits it, trying a comfortable distance from the window before the sill. Null when no room suits
 * (or none is set up); `dim` says whether every room is too dark for it rather than too sunny.
 */
export function bestHome(need: Light, rooms: Record<string, AnyRoomLight>, site: Site, now: Date): { room: string; words: string } | { room: null; dim: boolean } | null {
  if (!Object.keys(rooms).length) return null;
  const lit = Object.entries(rooms).filter(([, r]) => hasWindow(r));
  // Rooms set up, all without windows: too dark for anything that wants light.
  if (!lit.length) return need === 'low' ? { room: Object.keys(rooms).sort()[0], words: 'anywhere in it' } : { room: null, dim: true };
  let dim = true;
  for (const [name, room] of lit.sort(([a], [b]) => a.localeCompare(b))) {
    for (const spot of ['near', 'below', 'sill', 'far'] as WindowSpot[]) {
      for (const w of windowsOf(room)) {
        const here = spotLight(room, spot, site, now, { windowId: w.id });
        const fit = suits(here.level, need);
        if (fit === 'ok') return { room: name, words: spotWords(spot, here.window) };
        if (fit === 'harsh') dim = false;
      }
    }
  }
  return { room: null, dim };
}
