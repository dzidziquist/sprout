import { describe, expect, it } from 'vitest';
import { mixFeedsUntil, mixLine, mixStillFeeds, mixWaitText } from './mix';
import type { Plant } from '../types';

const potted = '2026-10-01T12:00:00.000Z';
const plant = (speciesId: string, mix?: Plant['mix']) => ({ speciesId: speciesId as Plant['speciesId'], mix });
const weeksAfter = (w: number) => new Date(new Date(potted).getTime() + w * 7 * 86_400_000);

describe('mix feeding', () => {
  it('waits about 8 weeks for fruiting crops, even when the bag says 6 months', () => {
    expect(mixFeedsUntil(plant('tomato', { fertiliser: 'yes', bagMonths: 6, pottedAt: potted }))).toEqual(weeksAfter(8));
  });
  it('waits about 3 months for other plants, or less when the bag says so', () => {
    expect(mixFeedsUntil(plant('pothos', { fertiliser: 'yes', pottedAt: potted }))).toEqual(weeksAfter(13));
    expect(mixFeedsUntil(plant('pothos', { fertiliser: 'yes', bagMonths: 1, pottedAt: potted }))).toEqual(weeksAfter(4));
  });
  it('never waits without fertiliser, when unsure, or with no mix noted', () => {
    expect(mixFeedsUntil(plant('tomato', { fertiliser: 'no', pottedAt: potted }))).toBeUndefined();
    expect(mixFeedsUntil(plant('tomato', { fertiliser: 'unsure', pottedAt: potted }))).toBeUndefined();
    expect(mixFeedsUntil(plant('tomato'))).toBeUndefined();
  });
  it('says until when while it lasts, and nothing after', () => {
    const p = plant('tomato', { fertiliser: 'yes', pottedAt: potted });
    expect(mixStillFeeds(p, weeksAfter(2))).toBe(true);
    expect(mixWaitText(p, weeksAfter(2))).toMatch(/^Not yet: the fresh mix feeds it till about Nov 2[56]$/);
    expect(mixStillFeeds(p, weeksAfter(9))).toBe(false);
    expect(mixWaitText(p, weeksAfter(9))).toBeUndefined();
  });
  it('describes the mix in a line', () => {
    expect(mixLine({ mix: { name: 'Miracle-Gro Potting Mix', fertiliser: 'yes', pottedAt: potted } })).toBe('Miracle-Gro Potting Mix · has fertiliser');
    expect(mixLine({ mix: { fertiliser: 'unsure', pottedAt: potted } })).toBeUndefined();
    expect(mixLine({})).toBeUndefined();
  });
});
