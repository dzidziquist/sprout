import { describe, expect, it } from 'vitest';
import { widgetPayload } from './widgetPayload';
import type { Plant } from '../types';

const plant = (name: string, extra: Partial<Plant> = {}): Plant =>
  ({ id: name, name, speciesId: 'pothos', potColor: 'blue', soil: 'potting_mix', potMaterial: 'plastic', potDiameterCm: 15, light: 'medium', placement: 'indoor', origin: 'bought', acquiredAt: '2026-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z', k: 1, nextCheckAt: '2026-10-29T09:00:00.000Z', ...extra }) as Plant;

describe('widgetPayload', () => {
  it('shares each plant on the round with its next check date, leaving out rooting and archived ones', () => {
    const out = JSON.parse(widgetPayload([plant('Queenie'), plant('Rootie', { rooting: { method: 'water', startedAt: '2026-10-01T00:00:00Z' } }), plant('Gone', { archivedAt: '2026-10-01T00:00:00Z' })], [], new Date('2026-10-28T12:00:00Z')));
    expect(out).toEqual({ plants: [{ n: 'Queenie', d: '2026-10-29T09:00:00.000Z' }], trips: [] });
  });
  it('shares trips in progress and planned ones (so the widget can switch to Away by itself), not past ones', () => {
    const trips = [
      { from: '2026-09-01T00:00:00.000Z', to: '2026-09-08T00:00:00.000Z' },
      { from: '2026-10-27T00:00:00.000Z', to: '2026-11-03T00:00:00.000Z' },
      { from: '2026-12-20T00:00:00.000Z', to: '2027-01-02T00:00:00.000Z' },
    ];
    expect(JSON.parse(widgetPayload([plant('A')], trips, new Date('2026-10-28T12:00:00Z'))).trips).toEqual([
      { f: '2026-10-27T00:00:00.000Z', t: '2026-11-03T00:00:00.000Z' },
      { f: '2026-12-20T00:00:00.000Z', t: '2027-01-02T00:00:00.000Z' },
    ]);
  });
});
