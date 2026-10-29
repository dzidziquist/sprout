import { describe, expect, it } from 'vitest';
import { orphanPhotos, diaryPhotos, fingerprint, fromItems, merge, nameOf, othersLately, signEvents, stableJson, toItems, type Jungle, type RemoteItem, type Synced } from './household';
import type { CareEvent, Plant } from '../types';

const plant = (id: string, extra: Partial<Plant> = {}): Plant =>
  ({ id, name: id, speciesId: 'pothos', createdAt: '2026-01-01T00:00:00Z', nextCheckAt: '2026-10-29T09:00:00Z', k: 1, ...extra }) as Plant;
const event = (id: string, extra: Partial<CareEvent> = {}): CareEvent => ({ id, plantId: 'a', type: 'check', at: '2026-10-28T08:00:00Z', ...extra });
const jungle = (plants: Plant[], events: CareEvent[] = [], shared: Jungle['shared'] = { city: 'Seattle' }): Jungle => ({ plants, events, shared, members: {} });

/** The agreed state for a jungle that every phone already has. */
const agreed = (j: Jungle, at = 1): Synced => Object.fromEntries([...toItems(j)].map(([id, it]) => [id, { h: fingerprint(it.json), at }]));
const remoteOf = (j: Jungle, id: string, at: number): RemoteItem => ({ ...toItems(j).get(id)!, at });

describe('records', () => {
  it('writes the same text whatever order the keys were in', () => {
    expect(stableJson({ b: 1, a: { d: 2, c: [3, { f: 4, e: 5 }] }, z: undefined })).toBe('{"a":{"c":[3,{"e":5,"f":4}],"d":2},"b":1}');
  });
  it('round-trips a jungle', () => {
    const j = { ...jungle([plant('a'), plant('b')], [event('e1')]), members: { u1: { name: 'Ama' } } };
    const back = fromItems(toItems(j).values());
    expect(back.plants.map((p) => p.id)).toEqual(['a', 'b']);
    expect(back.events.map((e) => e.id)).toEqual(['e1']);
    expect(back.shared).toEqual({ city: 'Seattle' });
    expect(back.members).toEqual({ u1: { name: 'Ama' } });
  });
});

describe('syncing', () => {
  const base = jungle([plant('a'), plant('b')], [event('e1')]);

  it('sends everything up the first time', () => {
    const r = merge(base, {}, [], [], 100);
    expect(r.save.map((s) => s.id).sort()).toEqual(['ev-e1', 'jungle', 'pl-a', 'pl-b']);
    expect(r.save.every((s) => s.at === 100)).toBe(true);
    expect(r.changed).toBe(false);
  });

  it('sends nothing when nothing changed', () => {
    const r = merge(base, agreed(base), [], [], 100);
    expect(r.save).toEqual([]);
    expect(r.remove).toEqual([]);
  });

  it('sends what changed here, and deletes what was deleted here', () => {
    const here = jungle([plant('a', { nextCheckAt: '2026-11-02T09:00:00Z' })], [event('e1'), event('e2')]);
    const r = merge(here, agreed(base), [], [], 100);
    expect(r.save.map((s) => s.id).sort()).toEqual(['ev-e2', 'pl-a']);
    expect(r.remove).toEqual(['pl-b']);
    expect(r.synced['pl-b']).toBeUndefined();
  });

  it('takes in what another phone changed, added and deleted', () => {
    const there = jungle([plant('a', { nextCheckAt: '2026-11-05T09:00:00Z' }), plant('c')], [event('e1'), event('e9', { by: 'kofi' })]);
    const r = merge(base, agreed(base), [remoteOf(there, 'pl-a', 50), remoteOf(there, 'pl-c', 50), remoteOf(there, 'ev-e9', 50)], ['pl-b'], 100);
    expect(r.changed).toBe(true);
    expect(r.jungle.plants.map((p) => [p.id, p.nextCheckAt])).toEqual([
      ['a', '2026-11-05T09:00:00Z'],
      ['c', '2026-10-29T09:00:00Z'],
    ]);
    expect(r.jungle.events.map((e) => e.id)).toEqual(['e1', 'e9']);
    expect(r.save).toEqual([]);
    expect(r.remove).toEqual([]);
    // Next round: nothing to do.
    const again = merge(r.jungle, r.synced, [], [], 200);
    expect(again.save).toEqual([]);
    expect(again.remove).toEqual([]);
  });

  it('when both phones change the same plant, this phone wins and sends it up', () => {
    const here = jungle([plant('a', { k: 1.2 }), plant('b')], [event('e1')]);
    const there = jungle([plant('a', { k: 0.8 }), plant('b')], [event('e1')]);
    const r = merge(here, agreed(base), [remoteOf(there, 'pl-a', 50)], [], 100);
    expect(r.jungle.plants[0].k).toBe(1.2);
    expect(r.save.map((s) => s.id)).toEqual(['pl-a']);
  });

  it('both checking the same plant keeps both diary entries', () => {
    const here = jungle([plant('a'), plant('b')], [event('e1'), event('mine')]);
    const there = jungle([plant('a'), plant('b')], [event('e1'), event('theirs', { by: 'kofi' })]);
    const r = merge(here, agreed(base), [remoteOf(there, 'ev-theirs', 50)], [], 100);
    expect(r.jungle.events.map((e) => e.id).sort()).toEqual(['e1', 'mine', 'theirs']);
    expect(r.save.map((s) => s.id)).toEqual(['ev-mine']);
  });

  it('a plant changed here but deleted there stays, and goes back up', () => {
    const here = jungle([plant('a'), plant('b', { name: 'Bee' })], [event('e1')]);
    const r = merge(here, agreed(base), [], ['pl-b'], 100);
    expect(r.jungle.plants.map((p) => p.id)).toEqual(['a', 'b']);
    expect(r.save.map((s) => s.id)).toEqual(['pl-b']);
  });

  it('a plant deleted here but changed there comes back', () => {
    const here = jungle([plant('a')], [event('e1')]);
    const there = jungle([plant('a'), plant('b', { name: 'Bee' })], [event('e1')]);
    const r = merge(here, agreed(base), [remoteOf(there, 'pl-b', 50)], [], 100);
    expect(r.jungle.plants.map((p) => p.name)).toEqual(['a', 'Bee']);
    expect(r.remove).toEqual([]);
  });

  it('this phone’s own upload coming back doesn’t undo a delete made since', () => {
    const here = jungle([plant('a')], [event('e1')]);
    const r = merge(here, agreed(base), [remoteOf(base, 'pl-b', 1)], [], 100);
    expect(r.jungle.plants.map((p) => p.id)).toEqual(['a']);
    expect(r.remove).toEqual(['pl-b']);
  });

  it('this phone’s own upload coming back doesn’t undo an edit made since', () => {
    const here = jungle([plant('a', { name: 'Ace' }), plant('b')], [event('e1')]);
    const r = merge(here, agreed(base), [remoteOf(base, 'pl-a', 1)], [], 100);
    expect(r.jungle.plants[0].name).toBe('Ace');
    expect(r.save.map((s) => s.id)).toEqual(['pl-a']);
  });

  it('after a full re-fetch, offline edits still win and what vanished counts as deleted', () => {
    // As the sync does when iCloud says the change token is too old: everything comes again, the old
    // agreement is kept, and records iCloud no longer has are passed as deleted.
    const here = jungle([plant('a', { name: 'Ace' }), plant('b')], [event('e1')]);
    const all = [remoteOf(base, 'pl-a', 1), remoteOf(base, 'ev-e1', 1), remoteOf(base, 'jungle', 1)];
    const r = merge(here, agreed(base), all, ['pl-b'], 100);
    expect(r.jungle.plants.map((p) => p.name)).toEqual(['Ace']);
    expect(r.save.map((s) => s.id)).toEqual(['pl-a']);
    expect(r.remove).toEqual([]);
  });

  it('a new member takes the household’s settings, not their own phone’s', () => {
    const mine = jungle([], [], { city: 'Accra' });
    const owners = jungle([plant('a')], [], { city: 'Seattle' });
    const r = merge(mine, {}, [remoteOf(owners, 'jungle', 50), remoteOf(owners, 'pl-a', 50)], [], 100);
    expect(r.jungle.shared.city).toBe('Seattle');
    expect(r.save).toEqual([]);
  });
});

describe('who did what', () => {
  it('signs this phone’s unsigned diary entries and leaves others alone', () => {
    const { events, signed } = signEvents([event('a'), event('b', { by: 'kofi' })], 'ama');
    expect(signed).toBe(true);
    expect(events.map((e) => e.by)).toEqual(['ama', 'kofi']);
    expect(signEvents(events, 'ama').signed).toBe(false);
  });
  it('names people, with a fallback before their name arrives', () => {
    expect(nameOf({ k: { name: 'Kofi' } }, 'k')).toBe('Kofi');
    expect(nameOf({}, 'k')).toBe('Someone');
  });
  it('says what someone else did today, newest first', () => {
    const now = new Date('2026-10-29T12:00:00Z');
    const j = {
      plants: [plant('m', { name: 'Monty' }), plant('q', { name: 'Queenie' })],
      events: [
        event('1', { plantId: 'm', type: 'water', by: 'ama', at: '2026-10-29T08:00:00Z' }),
        event('2', { plantId: 'q', type: 'photo', by: 'ama', at: '2026-10-29T09:00:00Z' }),
        event('3', { plantId: 'q', type: 'check', by: 'kofi', at: '2026-10-29T10:00:00Z' }),
        event('4', { plantId: 'm', type: 'check', by: 'ama', at: '2026-10-26T10:00:00Z' }),
      ],
      members: { ama: { name: 'Ama' }, kofi: { name: 'Kofi' } },
    };
    expect(othersLately(j, 'kofi', now)).toBe('Ama added a photo of Queenie and watered Monty.');
    expect(othersLately(j, 'ama', now)).toBe('Kofi checked Queenie.');
    expect(othersLately({ ...j, events: [] }, 'kofi', now)).toBeNull();
  });
  it('lists diary photos once', () => {
    expect(diaryPhotos({ plants: [plant('a', { photoUri: 'diary/x.jpg' })], events: [event('e', { photoUri: 'diary/x.jpg' }), event('f', { photoUri: 'diary/y.jpg' })] })).toEqual(['x.jpg', 'y.jpg']);
  });
});

describe('household photo cleanup', () => {
  it('lets go of photos no plant or diary entry points at any more', () => {
    const j = { plants: [plant('a', { photoUri: 'diary/cover.jpg' })], events: [event('e', { photoUri: 'diary/kept.jpg' })] };
    expect(orphanPhotos(['cover.jpg', 'kept.jpg', 'deleted.jpg', 'deleted.jpg'], j)).toEqual(['deleted.jpg']);
  });
});
