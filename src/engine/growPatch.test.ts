import { describe, expect, it } from 'vitest';
import {
  daysInStage,
  edibleFeedingPaused,
  ediblePlants,
  feedingAdvice,
  formatTotals,
  harvestStats,
  isFirstHarvest,
  nextStage,
  tasksFor,
  weatherAlerts,
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
    expect(ids).toContain('sea-onion-eave');
    expect(tasks.find((t) => t.id === 'sea-green-toms')!.plantIds).toEqual([tommy.id]);
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
