import { describe, expect, it } from 'vitest';
import {
  daysInStage,
  seasonEnd,
  edibleFeedingPaused,
  ediblePlants,
  feedingAdvice,
  formatTotals,
  harvestStats,
  isFirstHarvest,
  isTicked,
  nextStage,
  tasksFor,
  weatherAlerts,
  withTickedSupport,
  type DailyForecast,
} from './growPatch';
import { CALENDAR, EDIBLES } from '../data/edibles';
import type { CareEvent, Plant } from '../types';

let n = 0;
function plant(p: Partial<Plant> = {}): Plant {
  n += 1;
  return {
    id: `p${n}`,
    name: `Plant ${n}`,
    speciesId: 'tomato',
    potColor: 'yellow',
    soil: 'veg_mix',
    potMaterial: 'fabric',
    potDiameterCm: 38,
    light: 'direct',
    placement: 'covered_outdoor',
    origin: 'bought',
    acquiredAt: '2026-05-01T00:00:00.000Z',
    k: 1,
    nextCheckAt: '2026-10-15T00:00:00.000Z',
    createdAt: '2026-05-01T00:00:00.000Z',
    ...p,
  };
}

const day = (date: string, minC: number, maxC: number, precipMm = 0): DailyForecast => ({ date, minC, maxC, precipMm });
const mild = (date: string) => day(date, 17, 24);

const midOct = new Date(2026, 9, 14, 12);

describe('edible data', () => {
  it('every species has info for each of its stages', () => {
    for (const g of Object.values(EDIBLES)) {
      for (const s of g.stages) expect(g.info[s], `${g.id}/${s}`).toBeDefined();
    }
  });

  it('calendar tasks have unique ids, valid months and known species', () => {
    for (const tasks of Object.values(CALENDAR)) {
      const ids = tasks.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const t of tasks) {
        expect(t.when.length).toBeGreaterThan(0);
        for (const w of t.when) expect(w.month).toBeGreaterThanOrEqual(0), expect(w.month).toBeLessThan(12);
        for (const s of t.species) expect(EDIBLES[s]).toBeDefined();
      }
    }
  });

  it('only counts live edibles', () => {
    const list = [plant(), plant({ speciesId: 'monstera' }), plant({ archivedAt: '2026-09-01' }), plant({ speciesId: 'mint' })];
    expect(ediblePlants(list).map((p) => p.speciesId)).toEqual(['tomato', 'mint']);
  });
});

describe('nextStage', () => {
  it('walks the tomato stages in order and stops at the end', () => {
    expect(nextStage('tomato', 'flowering')).toBe('fruiting');
    expect(nextStage('tomato', 'harvesting')).toBe('resting');
    expect(nextStage('tomato', 'resting')).toBeUndefined();
  });

  it('skips stages that do not apply (spring onions have no fruit)', () => {
    expect(nextStage('spring-onion', 'growing')).toBe('harvesting');
    expect(nextStage('spring-onion', 'harvesting')).toBeUndefined();
  });

  it('starts at the first stage when none is set, and handles non-edibles', () => {
    expect(nextStage('pepper', undefined)).toBe('seed');
    expect(nextStage('mint', undefined)).toBe('seedling');
    expect(nextStage('monstera', 'growing')).toBeUndefined();
  });

  it('counts whole days in stage', () => {
    expect(daysInStage({ stageAt: new Date(2026, 9, 4, 8).toISOString() }, midOct)).toBe(10);
    expect(daysInStage({}, midOct)).toBeUndefined();
  });
});

describe('feeding', () => {
  it('Seattle balcony tomatoes are fed May to mid-August only', () => {
    const t = plant({ stage: 'fruiting' });
    expect(edibleFeedingPaused(t, 'seattle', new Date(2026, 6, 10))).toBe(false);
    expect(edibleFeedingPaused(t, 'seattle', new Date(2026, 7, 15))).toBe(false);
    expect(edibleFeedingPaused(t, 'seattle', new Date(2026, 7, 20))).toBe(true);
    expect(edibleFeedingPaused(t, 'seattle', new Date(2026, 3, 20))).toBe(true);
    expect(feedingAdvice(t, 'seattle', midOct)).toMatch(/ripening/);
  });

  it('Accra feeds all year, and resting plants never eat', () => {
    expect(edibleFeedingPaused(plant({ stage: 'fruiting' }), 'accra', midOct)).toBe(false);
    expect(feedingAdvice(plant({ stage: 'fruiting' }), 'accra', midOct)).toMatch(/High-potash/);
    expect(edibleFeedingPaused(plant({ speciesId: 'pepper', stage: 'resting' }), 'accra', midOct)).toBe(true);
  });

  it('indoor edibles follow the winter pause', () => {
    const scallion = plant({ speciesId: 'spring-onion', placement: 'indoor', stage: 'harvesting' });
    expect(edibleFeedingPaused(scallion, 'seattle', new Date(2026, 5, 1))).toBe(false);
    expect(edibleFeedingPaused(scallion, 'seattle', new Date(2026, 11, 1))).toBe(true);
  });

  it('keeps feeding an indoor tomato that is flowering or fruiting, even in winter', () => {
    const indoorTom = plant({ placement: 'indoor', stage: 'flowering' });
    expect(edibleFeedingPaused(indoorTom, 'seattle', new Date(2026, 11, 1))).toBe(false);
    expect(edibleFeedingPaused({ ...indoorTom, stage: 'growing' }, 'seattle', new Date(2026, 11, 1))).toBe(true);
  });
});

describe('tasksFor', () => {
  const tommy = plant({ name: 'Tommy', stage: 'fruiting' });
  const tina = plant({ name: 'Tina', stage: 'harvesting' });
  const chili = plant({ name: 'Chili', speciesId: 'pepper', stage: 'fruiting' });
  const scallie = plant({ name: 'Scallie', speciesId: 'spring-onion', placement: 'indoor', stage: 'harvesting' });

  it('mid-October in Seattle: pick green tomatoes and bring peppers in', () => {
    const tasks = tasksFor([tommy, chili, scallie], 'seattle', midOct);
    const ids = tasks.map((t) => t.id);
    expect(ids).toContain('sea-green-toms');
    expect(ids).toContain('sea-overwinter');
    expect(tasks.find((t) => t.id === 'sea-green-toms')!.plantIds).toEqual([tommy.id]);
  });

  it('only gives weather jobs to plants that live outside', () => {
    const indoorChili = { ...chili, id: 'in-chili', placement: 'indoor' as const };
    const outdoorScallie = { ...scallie, id: 'out-scallie', placement: 'outdoor' as const };
    const tasks = tasksFor([indoorChili, scallie, outdoorScallie], 'seattle', midOct);
    expect(tasks.find((t) => t.id === 'sea-overwinter')).toBeUndefined();
    expect(tasks.find((t) => t.id === 'sea-onion-eave')!.plantIds).toEqual(['out-scallie']);
  });

  it('lists each task once with every plant it applies to', () => {
    const tasks = tasksFor([tommy, tina], 'seattle', midOct);
    const green = tasks.filter((t) => t.id === 'sea-green-toms');
    expect(green).toHaveLength(1);
    expect(green[0].plantIds).toEqual([tommy.id, tina.id]);
  });

  it('only shows tasks for species the user grows', () => {
    const tasks = tasksFor([scallie], 'seattle', midOct);
    expect(tasks.every((t) => t.plantIds.every((id) => id === scallie.id))).toBe(true);
    expect(tasks.map((t) => t.id)).not.toContain('sea-green-toms');
    expect(tasksFor([], 'seattle', midOct)).toEqual([]);
    expect(tasksFor([plant({ speciesId: 'monstera' })], 'seattle', midOct)).toEqual([]);
  });

  it('flags tasks due in the next 7 days and puts them first', () => {
    // Late-March seed starting opens on the 15th.
    const early = tasksFor([tommy], 'seattle', new Date(2026, 2, 3));
    expect(early.find((t) => t.id === 'sea-sow-toms')!.thisWeek).toBe(false);
    const soon = tasksFor([tommy], 'seattle', new Date(2026, 2, 10));
    expect(soon.find((t) => t.id === 'sea-sow-toms')!.thisWeek).toBe(true);
    const flags = soon.map((t) => t.thisWeek);
    expect(flags).toEqual([...flags].sort((a, b) => Number(b) - Number(a)));
  });

  it('drops windows that already closed this month', () => {
    // "Stop feeding" runs Aug 10–25.
    expect(tasksFor([tommy], 'seattle', new Date(2026, 7, 20)).map((t) => t.id)).toContain('sea-feed-stop');
    expect(tasksFor([tommy], 'seattle', new Date(2026, 7, 28)).map((t) => t.id)).not.toContain('sea-feed-stop');
  });

  it('adds high-potash at fruit swell while feeding is on', () => {
    const july = tasksFor([tommy, chili], 'seattle', new Date(2026, 6, 10));
    const potash = july.find((t) => t.id === 'stage-potash')!;
    expect(potash.plantIds).toEqual([tommy.id, chili.id]);
    expect(potash.thisWeek).toBe(true);
    expect(tasksFor([tommy], 'seattle', midOct).map((t) => t.id)).not.toContain('stage-potash');
    expect(tasksFor([tommy], 'accra', midOct).map((t) => t.id)).toContain('stage-potash');
  });

  it('leaves plants out of feed tasks while their fresh mix still feeds them, saying until when', () => {
    const at = new Date(2026, 6, 10);
    const fresh = { ...tommy, id: 'fresh', mix: { fertiliser: 'yes' as const, kind: 'slow' as const, pottedAt: new Date(2026, 6, 1).toISOString() } };
    const potash = tasksFor([fresh, chili], 'seattle', at).find((t) => t.id === 'stage-potash')!;
    expect(potash.plantIds).toEqual([chili.id]);
    expect(potash.waiting?.plantIds).toEqual(['fresh']);
    expect(new Date(potash.waiting!.until).getTime()).toBe(new Date(2026, 6, 1).getTime() + 8 * 7 * 86_400_000);
    // Every plant waiting: no feed task at all. Once the mix is spent, back to normal.
    expect(tasksFor([fresh], 'seattle', at).map((t) => t.id)).not.toContain('stage-potash');
    expect(tasksFor([fresh], 'seattle', new Date(2026, 7, 28)).find((t) => t.id === 'stage-potash')?.waiting).toBeUndefined();
  });

  // The dark season starts Oct 15.
  const lateOct = new Date(2026, 9, 20, 12);

  it('indoors in the dark season, fruiting crops get half-strength feed every 2 weeks', () => {
    const inside = { ...tommy, id: 'inside', placement: 'indoor' as const };
    const tasks = tasksFor([inside, chili], 'seattle', lateOct);
    const slow = tasks.find((t) => t.id === 'stage-potash-slow')!;
    expect(slow.plantIds).toEqual(['inside']);
    expect(slow.repeatDays).toBe(14);
    expect(feedingAdvice(inside, 'seattle', lateOct)).toBe('Half-strength tomato feed every 2 weeks');
    // Accra has no dark season: the usual feed.
    expect(tasksFor([inside], 'accra', lateOct).map((t) => t.id)).toContain('stage-potash');
  });

  it('leaves out plants fed lately, and a feed logged by ticking the job keeps it on the list to untick', () => {
    const inside = { ...tommy, id: 'inside', placement: 'indoor' as const };
    const fed: CareEvent = { id: 'f', plantId: 'inside', type: 'feed', at: new Date(lateOct.getTime() - 3 * 86_400_000).toISOString() };
    expect(tasksFor([inside], 'seattle', lateOct, [fed]).map((t) => t.id)).not.toContain('stage-potash-slow');
    const ticks = { 'stage-potash-slow': fed.at };
    expect(tasksFor([inside], 'seattle', lateOct, withTickedSupport([fed], [inside], ticks, lateOct)).map((t) => t.id)).toContain('stage-potash-slow');
  });

  it('suggests hand pollination for flowering fruit plants outside the summer window', () => {
    const flowering = plant({ stage: 'flowering' });
    expect(tasksFor([flowering], 'accra', new Date(2026, 1, 5)).map((t) => t.id)).toContain('stage-pollinate');
    // In Seattle summer the calendar already says it, so no duplicate.
    const june = tasksFor([flowering], 'seattle', new Date(2026, 5, 5)).map((t) => t.id);
    expect(june).toContain('sea-pollinate');
    expect(june).not.toContain('stage-pollinate');
  });

  it('Accra harmattan reminders show in December and wrap into January', () => {
    expect(tasksFor([tommy], 'accra', new Date(2026, 11, 20)).map((t) => t.id)).toContain('acc-harmattan-water');
    expect(tasksFor([tommy], 'accra', new Date(2027, 0, 5)).map((t) => t.id)).toContain('acc-harmattan-water');
    expect(tasksFor([tommy], 'accra', new Date(2026, 6, 5)).map((t) => t.id)).not.toContain('acc-harmattan-water');
  });
});

describe('weatherAlerts', () => {
  const tommy = plant({ name: 'Tommy', stage: 'fruiting' });
  const chili = plant({ name: 'Chili', speciesId: 'pepper', stage: 'flowering' });

  it('no forecast, no alerts', () => {
    expect(weatherAlerts([tommy], null)).toEqual([]);
    expect(weatherAlerts([tommy], [])).toEqual([]);
  });

  it('tomato nights under 13°C mean flower drop', () => {
    const a = weatherAlerts([tommy], [mild('d1'), day('d2', 11, 18)]);
    expect(a).toHaveLength(1);
    expect(a[0].kind).toBe('cold-set');
    expect(a[0].dates).toEqual(['d2']);
    expect(a[0].body).toContain('Tommy');
  });

  it('peppers are fussier: 14°C nights hit the pepper but not the tomato', () => {
    const a = weatherAlerts([tommy, chili], [day('d1', 14, 22)]);
    expect(a).toHaveLength(1);
    expect(a[0].plantIds).toEqual([chili.id]);
  });

  it('days above 32°C are flower-drop heat for tomatoes, peppers hold out to 35°C', () => {
    const a = weatherAlerts([tommy, chili], [day('d1', 22, 33)]);
    expect(a.map((x) => x.kind)).toEqual(['heat-set']);
    expect(a[0].plantIds).toEqual([tommy.id]);
    expect(weatherAlerts([tommy, chili], [day('d1', 22, 36)])[0].plantIds).toEqual([tommy.id, chili.id]);
  });

  it('warm nights above 24°C also hurt fruit set', () => {
    const a = weatherAlerts([tommy], [day('d1', 25, 30)]);
    expect(a.map((x) => x.kind)).toEqual(['warm-nights']);
  });

  it('only flowering or fruiting plants get flower-drop alerts', () => {
    const young = plant({ stage: 'growing' });
    expect(weatherAlerts([young], [day('d1', 9, 35)])).toEqual([]);
  });

  it('frost warns every outside edible, including resting ones, and replaces the cold-set alert', () => {
    const scallion = plant({ name: 'Scallie', speciesId: 'spring-onion', placement: 'outdoor', stage: 'growing' });
    const a = weatherAlerts([tommy, scallion], [day('d1', 1, 8)]);
    expect(a.map((x) => x.kind)).toEqual(['frost']);
    expect(a[0].plantIds).toEqual([tommy.id, scallion.id]);
    expect(a[0].body).toContain('Tommy and Scallie');
  });

  it('indoor edibles ignore the forecast', () => {
    const inside = plant({ placement: 'indoor', stage: 'fruiting' });
    expect(weatherAlerts([inside], [day('d1', -3, 40, 60)])).toEqual([]);
  });

  it('heavy rain only matters for uncovered pots', () => {
    const open = plant({ name: 'Open', placement: 'outdoor', stage: 'growing' });
    const a = weatherAlerts([tommy, open], [day('d1', 16, 20, 31)]);
    expect(a.map((x) => x.kind)).toEqual(['heavy-rain']);
    expect(a[0].plantIds).toEqual([open.id]);
    expect(weatherAlerts([tommy], [day('d1', 16, 20, 31)])).toEqual([]);
  });

  it('groups days into one alert per kind', () => {
    const a = weatherAlerts([tommy], [day('d1', 10, 15), day('d2', 9, 14), mild('d3'), day('d4', 12, 16)]);
    expect(a).toHaveLength(1);
    expect(a[0].dates).toEqual(['d1', 'd2', 'd4']);
    expect(a[0].title).toContain('9°C');
  });
});

describe('stages and support', () => {
  it('holds harvest jobs until there is something to pick', () => {
    const young = plant({ name: 'Tommy', speciesId: 'tomato', stage: 'growing' });
    const fruiting = plant({ name: 'Sungold', speciesId: 'tomato', stage: 'fruiting' });
    const oct = tasksFor([young, fruiting], 'seattle', new Date(2026, 9, 5));
    expect(oct.find((t) => t.id === 'sea-green-toms')?.plantIds).toEqual([fruiting.id]);
    expect(oct.find((t) => t.id === 'sea-blight-bin')?.plantIds).toEqual([fruiting.id]);
    expect(tasksFor([young], 'seattle', new Date(2026, 9, 5)).map((t) => t.id)).not.toContain('sea-green-toms');
  });

  it('asks for a stake or trellis once growing, until one is logged', () => {
    const tom = plant({ name: 'Tommy', speciesId: 'tomato', stage: 'growing' });
    const cuke = plant({ name: 'Cuke', speciesId: 'cucumber', stage: 'flowering' });
    const seedling = plant({ name: 'Tiny', speciesId: 'tomato', stage: 'seedling' });
    const ids = tasksFor([tom, cuke, seedling], 'seattle', new Date(2026, 9, 5));
    expect(ids.find((t) => t.id === 'stage-stake')?.plantIds).toEqual([tom.id]);
    expect(ids.find((t) => t.id === 'stage-trellis')?.plantIds).toEqual([cuke.id]);
    const after = tasksFor([tom], 'seattle', new Date(2026, 9, 5), [{ id: 's', plantId: tom.id, type: 'staked', at: '2026-10-01T09:00:00' }]);
    expect(after.map((t) => t.id)).not.toContain('stage-stake');
  });

  it('keeps a ticked stake job on the list while the tick lasts, so it can be unticked', () => {
    const tom = plant({ name: 'Tommy', speciesId: 'tomato', stage: 'growing' });
    const cuke = plant({ name: 'Cuke', speciesId: 'cucumber', stage: 'flowering' });
    const at = '2026-10-05T09:00:00.000Z';
    const events: CareEvent[] = [
      { id: 's1', plantId: tom.id, type: 'staked', at },
      { id: 's2', plantId: cuke.id, type: 'staked', at },
    ];
    const now = new Date(2026, 9, 5, 12);
    const shown = withTickedSupport(events, [tom, cuke], { 'stage-stake': at }, now);
    // The stake ticked here is hidden (job stays, ticked); the trellis wasn't ticked, so it counts.
    expect(shown.map((e) => e.id)).toEqual(['s2']);
    expect(tasksFor([tom, cuke], 'seattle', now, shown).map((t) => t.id)).toContain('stage-stake');
    // Next month the tick has lapsed: the stake is logged and the job is gone.
    expect(withTickedSupport(events, [tom, cuke], { 'stage-stake': at }, new Date(2026, 10, 2))).toEqual(events);
  });
});

describe('the wider edible patch', () => {
  it('October in Seattle: plant garlic once the window opens, lift it in July', () => {
    const garlic = plant({ name: 'Garlie', speciesId: 'garlic', placement: 'outdoor', stage: 'seed' });
    const oct20 = tasksFor([garlic], 'seattle', new Date(2026, 9, 20));
    const plantIt = oct20.find((t) => t.id === 'sea-plant-garlic')!;
    expect(plantIt.plantIds).toEqual([garlic.id]);
    expect(plantIt.thisWeek).toBe(true);
    // Early October: on the month list, not yet this week.
    expect(tasksFor([garlic], 'seattle', new Date(2026, 9, 2)).find((t) => t.id === 'sea-plant-garlic')!.thisWeek).toBe(false);
    const grown = { ...garlic, stage: 'growing' as const };
    expect(tasksFor([grown], 'seattle', new Date(2026, 6, 5)).map((t) => t.id)).toContain('sea-garlic-lift');
    expect(tasksFor([grown], 'seattle', new Date(2026, 6, 5)).map((t) => t.id)).not.toContain('sea-plant-garlic');
    // Still a clove in the ground: nothing to lift yet.
    expect(tasksFor([garlic], 'seattle', new Date(2026, 6, 5)).map((t) => t.id)).not.toContain('sea-garlic-lift');
  });

  it('lettuce gets a succession-sowing nudge every month from March to September', () => {
    const lettuce = plant({ speciesId: 'lettuce', placement: 'covered_outdoor', stage: 'harvesting' });
    for (let m = 2; m <= 8; m++) expect(tasksFor([lettuce], 'seattle', new Date(2026, m, 1)).map((t) => t.id), `month ${m}`).toContain('sea-lettuce-succession');
    expect(tasksFor([lettuce], 'seattle', new Date(2026, 10, 1)).map((t) => t.id)).not.toContain('sea-lettuce-succession');
    expect(nextStage('lettuce', 'harvesting')).toBe('resting');
  });

  it('slug patrol covers soft crops in spring and autumn, not tomatoes', () => {
    const lettuce = plant({ speciesId: 'lettuce', stage: 'growing' });
    const slugs = tasksFor([lettuce, plant({ stage: 'growing' })], 'seattle', new Date(2026, 3, 10)).find((t) => t.id === 'sea-slugs')!;
    expect(slugs.plantIds).toEqual([lettuce.id]);
    expect(tasksFor([lettuce], 'seattle', new Date(2026, 6, 10)).map((t) => t.id)).not.toContain('sea-slugs');
  });

  it('beans in flower get cold-night and heat alerts from their own limits', () => {
    const bean = plant({ name: 'Beanie', speciesId: 'bush-bean', stage: 'flowering' });
    const cold = weatherAlerts([bean], [day('d1', 8, 17)]);
    expect(cold.map((a) => a.kind)).toEqual(['cold-set']);
    expect(cold[0].body).toContain('Beanie');
    // 12°C nights are fine for beans but too cold for a tomato.
    const tommy = plant({ name: 'Tommy', stage: 'flowering' });
    expect(weatherAlerts([bean, tommy], [day('d1', 12, 22)])[0].plantIds).toEqual([tommy.id]);
    expect(weatherAlerts([bean], [day('d1', 18, 33)])[0].kind).toBe('heat-set');
  });

  it('a strawberry with only a heat limit gets heat alerts but no cold-set alert', () => {
    const berry = plant({ speciesId: 'strawberry', stage: 'flowering' });
    expect(weatherAlerts([berry], [day('d1', 5, 18)])).toEqual([]);
    expect(weatherAlerts([berry], [day('d1', 15, 31)]).map((a) => a.kind)).toEqual(['heat-set']);
  });

  it('fruiting crops beyond tomato and pepper get the potash nudge; leafy crops do not', () => {
    const cuke = plant({ speciesId: 'cucumber', stage: 'fruiting' });
    const kale = plant({ speciesId: 'kale', stage: 'harvesting' });
    const july = tasksFor([cuke, kale], 'seattle', new Date(2026, 6, 10));
    expect(july.find((t) => t.id === 'stage-potash')!.plantIds).toEqual([cuke.id]);
  });

  it('squash-type flowers get a hand-pollination task, tomato-type a shake', () => {
    const zuke = plant({ speciesId: 'zucchini', stage: 'flowering' });
    const egg = plant({ speciesId: 'garden-egg', stage: 'flowering' });
    const ids = tasksFor([zuke, egg], 'accra', new Date(2026, 1, 5));
    expect(ids.find((t) => t.id === 'stage-hand-pollinate')!.plantIds).toEqual([zuke.id]);
    expect(ids.find((t) => t.id === 'stage-pollinate')!.plantIds).toEqual([egg.id]);
    // In Seattle's July the calendar already says it.
    const july = tasksFor([zuke], 'seattle', new Date(2026, 6, 5)).map((t) => t.id);
    expect(july).toContain('sea-pollinate-vines');
    expect(july).not.toContain('stage-hand-pollinate');
  });

  it('feeding windows come from the guide: garlic in spring, blueberries before July', () => {
    const garlic = plant({ speciesId: 'garlic', placement: 'outdoor', stage: 'growing' });
    expect(edibleFeedingPaused(garlic, 'seattle', new Date(2026, 3, 20))).toBe(false);
    expect(edibleFeedingPaused(garlic, 'seattle', new Date(2026, 5, 10))).toBe(true);
    expect(feedingAdvice(garlic, 'seattle', new Date(2026, 5, 10))).toMatch(/winding down/);
    expect(feedingAdvice(garlic, 'seattle', new Date(2026, 1, 10))).toMatch(/starts in March/);
    const blue = plant({ speciesId: 'blueberry', stage: 'fruiting' });
    expect(edibleFeedingPaused(blue, 'seattle', new Date(2026, 4, 10))).toBe(false);
    expect(edibleFeedingPaused(blue, 'seattle', new Date(2026, 6, 10))).toBe(true);
    // Indoors (or in Accra) the window doesn't apply.
    expect(edibleFeedingPaused({ ...garlic, placement: 'indoor' }, 'seattle', new Date(2026, 5, 10))).toBe(false);
    expect(edibleFeedingPaused(garlic, 'accra', new Date(2026, 5, 10))).toBe(false);
  });

  it('Accra rains bring kontomire planting', () => {
    const koko = plant({ speciesId: 'kontomire', stage: 'seedling' });
    expect(tasksFor([koko], 'accra', new Date(2026, 3, 5)).map((t) => t.id)).toContain('acc-plant-cocoyam');
  });
});

describe('harvestStats', () => {
  const tommy = plant({ name: 'Tommy' });
  const scallie = plant({ name: 'Scallie', speciesId: 'spring-onion' });
  const ev = (plantId: string, at: string, amount?: number, unit?: string): CareEvent => ({ id: at + plantId, plantId, type: 'harvest', amount, unit, at });
  const events: CareEvent[] = [
    ev(tommy.id, '2026-08-20T10:00:00Z', 5, 'fruit'),
    ev(tommy.id, '2026-08-02T10:00:00Z', 3, 'fruit'),
    ev(tommy.id, '2026-09-01T10:00:00Z', 200, 'grams'),
    ev(scallie.id, '2026-09-10T10:00:00Z', 1, 'bunch'),
    ev('gone', '2026-07-01T10:00:00Z', 9, 'fruit'),
    { id: 'w', plantId: tommy.id, type: 'water', at: '2026-07-01T10:00:00Z' },
  ];

  it('totals per plant and unit, with first and last pick', () => {
    const s = harvestStats(events, [tommy, scallie]);
    expect(s.byPlant[tommy.id]).toEqual({ totals: { fruit: 8, grams: 200 }, picks: 3, firstAt: '2026-08-02T10:00:00Z', lastAt: '2026-09-01T10:00:00Z' });
    expect(s.byPlant[scallie.id].totals).toEqual({ bunch: 1 });
    expect(s.totals).toEqual({ fruit: 8, grams: 200, bunch: 1 });
    expect(s.picks).toBe(4);
    expect(s.firstAt).toBe('2026-08-02T10:00:00Z');
  });

  it('defaults a bare harvest to one fruit', () => {
    expect(harvestStats([ev(tommy.id, '2026-08-01T00:00:00Z')], [tommy]).totals).toEqual({ fruit: 1 });
  });

  it('knows a first harvest', () => {
    expect(isFirstHarvest(events, scallie.id)).toBe(false);
    expect(isFirstHarvest(events, 'new')).toBe(true);
  });

  it('formats totals for the card', () => {
    expect(formatTotals({ fruit: 8, grams: 200 })).toBe('8 fruit · 200 g');
    expect(formatTotals({ handful: 1, bunch: 2 })).toBe('1 handful · 2 bunches');
    expect(formatTotals({})).toBeUndefined();
    expect(formatTotals(undefined)).toBeUndefined();
  });
});

describe('isTicked', () => {
  const at = (iso: string) => new Date(iso);
  it('keeps a repeating job ticked for its window, then brings it back', () => {
    const shake = { id: 'stage-pollinate', repeatDays: 3 };
    const ticks = { 'stage-pollinate': '2026-07-10T18:00:00' };
    expect(isTicked(shake, ticks, at('2026-07-10T20:00:00'))).toBe(true);
    expect(isTicked(shake, ticks, at('2026-07-12T09:00:00'))).toBe(true);
    expect(isTicked(shake, ticks, at('2026-07-13T09:00:00'))).toBe(false);
  });
  it('keeps a daily job ticked only for that day', () => {
    const daily = { id: 'sea-water-daily', repeatDays: 1 };
    const ticks = { 'sea-water-daily': '2026-07-10T23:30:00' };
    expect(isTicked(daily, ticks, at('2026-07-10T23:59:00'))).toBe(true);
    expect(isTicked(daily, ticks, at('2026-07-11T00:05:00'))).toBe(false);
  });
  it('keeps a one-off job ticked for the rest of the month', () => {
    const once = { id: 'sea-harden' };
    const ticks = { 'sea-harden': '2026-05-03T10:00:00' };
    expect(isTicked(once, ticks, at('2026-05-31T22:00:00'))).toBe(true);
    expect(isTicked(once, ticks, at('2026-06-01T08:00:00'))).toBe(false);
    expect(isTicked(once, {}, at('2026-05-04T08:00:00'))).toBe(false);
  });
  it('gives the stage and calendar pollination jobs a repeat window', () => {
    expect(CALENDAR.seattle.find((t) => t.id === 'sea-pollinate')?.repeatDays).toBe(3);
  });
});


describe('not this season', () => {
  it('turns a calendar job off until its run ends, and a stage job for about a season', () => {
    const oct31 = new Date(2026, 9, 31, 12);
    expect(seasonEnd('sea-blight-bin', 'seattle', oct31)).toEqual(new Date(2026, 11, 1));
    expect(seasonEnd('stage-stake', 'seattle', oct31)).toEqual(new Date(2027, 0, 1));
  });

  it('keeps outdoor clean-up jobs away from indoor crops', () => {
    const tomato = (placement: Plant['placement']) => ({ id: placement, name: 'T', speciesId: 'tomato', stage: 'fruiting', placement, potColor: 'yellow', soil: 'veg_mix', potMaterial: 'plastic', potDiameterCm: 30, light: 'bright', origin: 'seed', acquiredAt: '2026-04-01T00:00:00Z', createdAt: '2026-04-01T00:00:00Z', k: 1, nextCheckAt: '2026-11-01T00:00:00Z' }) as Plant;
    const ids = (p: Plant) => tasksFor([p], 'seattle', new Date(2026, 9, 20, 12)).map((t) => t.id);
    expect(ids(tomato('indoor'))).not.toContain('sea-blight-bin');
    expect(ids(tomato('outdoor'))).toContain('sea-blight-bin');
  });
});
