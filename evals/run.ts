import { diagnose } from '../src/engine/diagnose';
import { withNextFeed } from '../src/engine/feeding';
import { feedingAdvice, tasksFor } from '../src/engine/growPatch';
import { mixWeeks } from '../src/engine/mix';
import { mixBrand } from '../src/data/mixes';
import type { CareEvent, Plant } from '../src/types';
import type { EvalCase, PlantSpec } from './cases';

/** Runs one eval case against the app's own engine. Returns what went wrong, or nothing when it passed. */

let n = 0;
export function plantOf(spec: PlantSpec): Plant {
  n += 1;
  return {
    id: spec.id ?? `p${n}`,
    name: spec.name ?? `Plant ${n}`,
    speciesId: 'pothos',
    potColor: 'yellow',
    soil: 'potting_mix',
    potMaterial: 'plastic',
    potDiameterCm: 15,
    light: 'bright',
    placement: 'indoor',
    origin: 'bought',
    acquiredAt: '2026-01-01T00:00:00.000Z',
    createdAt: '2026-01-01T00:00:00.000Z',
    lastRepottedAt: '2026-03-01T00:00:00.000Z',
    k: 1,
    nextCheckAt: '2099-01-01T00:00:00.000Z',
    ...spec,
  } as Plant;
}
const eventsOf = (plantId: string, events: Partial<CareEvent>[] = []): CareEvent[] => events.map((e, i) => ({ id: `e${i}`, plantId, type: 'note', at: '2026-01-01T00:00:00.000Z', ...e }) as CareEvent);

export function run(c: EvalCase): string | undefined {
  switch (c.kind) {
    case 'diagnose': {
      const plant = plantOf(c.plant);
      const shown = diagnose(c.symptom, { plant, events: eventsOf(plant.id, c.events), climate: c.climate ?? 'seattle', now: new Date(c.now) }).map((d) => d.cause.id);
      if (!shown.length) return `nothing shown for ${c.symptom}`;
      if (c.top1 && shown[0] !== c.top1) return `first is ${shown[0]}, expected ${c.top1} (shown: ${shown.join(', ')})`;
      for (const id of c.inTop3 ?? []) if (!shown.includes(id)) return `${id} not shown (shown: ${shown.join(', ')})`;
      for (const id of c.notTop1 ?? []) if (shown[0] === id) return `first is ${id}, which it mustn’t be (shown: ${shown.join(', ')})`;
      for (const id of c.absent ?? []) if (shown.includes(id)) return `${id} shown, which it mustn’t be (shown: ${shown.join(', ')})`;
      return undefined;
    }
    case 'feed': {
      const plant = plantOf(c.plant);
      const now = new Date(c.now);
      const advice = withNextFeed(feedingAdvice(plant, c.climate ?? 'seattle', now), plant.id, eventsOf(plant.id, c.events), now);
      return c.advice.test(advice) ? undefined : `advice was "${advice}"`;
    }
    case 'mix': {
      if (c.name !== undefined) {
        const kind = mixBrand(c.name)?.kind;
        return kind === c.kind_ ? undefined : `"${c.name}" read as ${kind ?? 'unknown'}, expected ${c.kind_ ?? 'unknown'}`;
      }
      const weeks = mixWeeks(c.speciesId!, c.mix!);
      return weeks === c.weeks ? undefined : `waits ${weeks} weeks, expected ${c.weeks}`;
    }
    case 'tasks': {
      const plants = c.plants.map(plantOf);
      const events = plants.flatMap((p) => eventsOf(p.id, c.events));
      const ids = tasksFor(plants, c.climate ?? 'seattle', new Date(c.now), events).map((t) => t.id);
      for (const id of c.has ?? []) if (!ids.includes(id)) return `${id} missing (jobs: ${ids.join(', ') || 'none'})`;
      for (const id of c.hasNot ?? []) if (ids.includes(id)) return `${id} present, which it mustn’t be`;
      return undefined;
    }
  }
}
