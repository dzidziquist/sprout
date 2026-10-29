import { describe, expect, it } from 'vitest';
import { mixFeedsUntil, mixLine, mixStillFeeds, mixWaitText } from './mix';
import { MIX_BRANDS, mixBrand } from '../data/mixes';
import type { Plant } from '../types';

const potted = '2026-10-01T12:00:00.000Z';
const plant = (speciesId: string, mix?: Plant['mix']) => ({ speciesId: speciesId as Plant['speciesId'], mix });
const weeksAfter = (w: number) => new Date(new Date(potted).getTime() + w * 7 * 86_400_000);

describe('mix feeding', () => {
  it('slow-release: about 8 weeks for fruiting crops, even when the bag says 6 months', () => {
    expect(mixFeedsUntil(plant('tomato', { fertiliser: 'yes', kind: 'slow', bagMonths: 6, pottedAt: potted }))).toEqual(weeksAfter(8));
    expect(mixFeedsUntil(plant('tomato', { fertiliser: 'yes', kind: 'slow', pottedAt: potted }))).toEqual(weeksAfter(8));
  });
  it('slow-release: about 3 months for other plants, or less when the bag says so', () => {
    expect(mixFeedsUntil(plant('pothos', { fertiliser: 'yes', kind: 'slow', pottedAt: potted }))).toEqual(weeksAfter(13));
    expect(mixFeedsUntil(plant('pothos', { fertiliser: 'yes', kind: 'slow', bagMonths: 1, pottedAt: potted }))).toEqual(weeksAfter(4));
  });
  it('rich organic mixes and "not sure" feed for about 4 weeks', () => {
    expect(mixFeedsUntil(plant('tomato', { fertiliser: 'yes', kind: 'organic', pottedAt: potted }))).toEqual(weeksAfter(4));
    expect(mixFeedsUntil(plant('pothos', { fertiliser: 'yes', kind: 'organic', pottedAt: potted }))).toEqual(weeksAfter(4));
    expect(mixFeedsUntil(plant('tomato', { fertiliser: 'yes', pottedAt: potted }))).toEqual(weeksAfter(4));
  });
  it('never waits without fertiliser, when unsure, or with no mix noted', () => {
    expect(mixFeedsUntil(plant('tomato', { fertiliser: 'no', pottedAt: potted }))).toBeUndefined();
    expect(mixFeedsUntil(plant('tomato', { fertiliser: 'unsure', pottedAt: potted }))).toBeUndefined();
    expect(mixFeedsUntil(plant('tomato'))).toBeUndefined();
  });
  it('says until when while it lasts, and nothing after', () => {
    const p = plant('tomato', { fertiliser: 'yes', kind: 'slow', pottedAt: potted });
    expect(mixStillFeeds(p, weeksAfter(2))).toBe(true);
    expect(mixWaitText(p, weeksAfter(2))).toMatch(/^Not yet: the fresh mix feeds it till about Nov 2[56]$/);
    expect(mixStillFeeds(p, weeksAfter(9))).toBe(false);
    expect(mixWaitText(p, weeksAfter(9))).toBeUndefined();
  });
  it('describes the mix in a line', () => {
    expect(mixLine({ mix: { name: 'Miracle-Gro Potting Mix', fertiliser: 'yes', pottedAt: potted } })).toBe('Miracle-Gro Potting Mix · has fertiliser');
    expect(mixLine({ mix: { name: 'FoxFarm Ocean Forest', fertiliser: 'yes', kind: 'organic', pottedAt: potted } })).toBe('FoxFarm Ocean Forest · rich organic food');
    expect(mixLine({ mix: { fertiliser: 'unsure', pottedAt: potted } })).toBeUndefined();
    expect(mixLine({})).toBeUndefined();
  });
});

describe('mix brands', () => {
  it('knows well-known bags by name', () => {
    expect(mixBrand('FoxFarm ocean forest')?.kind).toBe('organic');
    expect(mixBrand('Miracle Gro potting mix')?.kind).toBe('slow');
    expect(mixBrand('some local compost')).toBeUndefined();
    expect(mixBrand('')).toBeUndefined();
  });
  it('gives every brand a source', () => {
    for (const b of MIX_BRANDS) expect(b.source.length).toBeGreaterThan(10);
  });
});
