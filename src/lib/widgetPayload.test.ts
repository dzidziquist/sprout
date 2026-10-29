import { describe, expect, it } from 'vitest';
import { widgetPayload } from './widgetPayload';
import type { Plant } from '../types';

const plant = (name: string, extra: Partial<Plant> = {}): Plant =>
  ({ id: name, name, speciesId: 'pothos', potColor: 'blue', soil: 'potting_mix', potMaterial: 'plastic', potDiameterCm: 15, light: 'medium', placement: 'indoor', origin: 'bought', acquiredAt: '2026-01-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z', k: 1, nextCheckAt: '2026-10-29T09:00:00.000Z', ...extra }) as Plant;

describe('widgetPayload', () => {
  it('shares each plant on the round with its next check date, leaving out rooting and archived ones', () => {
    const out = JSON.parse(widgetPayload([plant('Queenie'), plant('Rootie', { rooting: { method: 'water', startedAt: '2026-10-01T00:00:00Z' } }), plant('Gone', { archivedAt: '2026-10-01T00:00:00Z' })], [], new Date('2026-10-28T12:00:00Z')));
    expect(out).toEqual({ plants: [{ n: 'Queenie', d: '2026-10-29T09:00:00.000Z' }], away: null });
  });
  it('says when a trip in progress ends, and nothing for one that hasn’t started', () => {
    const trips = [{ from: '2026-10-27T00:00:00.000Z', to: '2026-11-03T00:00:00.000Z' }];
    expect(JSON.parse(widgetPayload([plant('A')], trips, new Date('2026-10-28T12:00:00Z'))).away).toBe('2026-11-03T00:00:00.000Z');
    expect(JSON.parse(widgetPayload([plant('A')], trips, new Date('2026-10-20T12:00:00Z'))).away).toBeNull();
  });
});
