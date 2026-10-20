import { describe, expect, it } from 'vitest';
import { lightTip, roomToday, spotLight, suits, sunDay, yearLight, type RoomLight } from './light';
import type { Plant } from '../types';

const SEATTLE = 47.6;
const SYDNEY = -33.9;
const ACCRA = 5.6;
const june = new Date(2026, 5, 21, 12);
const dec = new Date(2026, 11, 21, 12);
const west: RoomLight = { windows: ['W'], shade: 'none' };

function plant(extra: Partial<Plant> = {}): Plant {
  return {
    id: 'p',
    name: 'Cal',
    speciesId: 'calathea',
    potColor: 'grape',
    soil: 'potting_mix',
    potMaterial: 'plastic',
    potDiameterCm: 15,
    light: 'medium',
    placement: 'indoor',
    room: 'Living room',
    windowSpot: 'far',
    origin: 'bought',
    acquiredAt: '2026-01-01T09:00:00',
    createdAt: '2026-01-01T09:00:00',
    k: 1,
    nextCheckAt: '2026-12-25T09:00:00',
    ...extra,
  };
}

describe('the sun', () => {
  it('follows the seasons and the hemisphere', () => {
    expect(sunDay(SEATTLE, june).daylight).toBeGreaterThan(15.5);
    expect(sunDay(SEATTLE, dec).daylight).toBeLessThan(8.6);
    // North of the equator a south window gets the winter sun and a north one none.
    expect(sunDay(SEATTLE, dec).direct.S).toBeGreaterThan(5);
    expect(sunDay(SEATTLE, dec).direct.N).toBe(0);
    // South of it, the other way round.
    expect(sunDay(SYDNEY, june).direct.N).toBeGreaterThan(sunDay(SYDNEY, june).direct.S + 5);
    // Near the equator the high sun barely favours north or south across the year.
    expect(sunDay(ACCRA, june).direct.N).toBeLessThan(5);
  });
});

describe('light at a spot', () => {
  it('drops away from the window and in winter', () => {
    expect(spotLight(west, 'sill', SEATTLE, june).level).toBe('direct');
    expect(spotLight(west, 'far', SEATTLE, dec).level).toBe('low');
    expect(spotLight({ windows: ['W'], shade: 'sheer' }, 'sill', SEATTLE, dec).level).toBe('medium');
    expect(spotLight({ windows: [], shade: 'none' }, 'sill', SEATTLE, june).level).toBe('low');
    // The brightest of a corner room's windows counts.
    expect(spotLight({ windows: ['N', 'S'], shade: 'none' }, 'sill', SEATTLE, dec).window).toBe('S');
  });

  it('says how the year goes', () => {
    expect(yearLight(west, 'near', SEATTLE, 2026)).toBe('Medium in winter · bright in summer');
    expect(yearLight(west, 'far', SEATTLE, 2026)).toBe('Low in winter · medium in summer');
  });

  it('matches plants to light', () => {
    expect(suits('low', 'medium')).toBe('dim');
    expect(suits('direct', 'medium')).toBe('harsh');
    expect(suits('bright', 'medium')).toBe('ok');
    expect(suits('direct', 'bright')).toBe('ok');
  });

  it('describes a room today', () => {
    expect(roomToday(west, SEATTLE, dec, { date: '2026-12-21', minC: 2, maxC: 6, precipMm: 4, code: 61 })).toBe('About 3 h of sun today · cloudy');
    expect(roomToday({ windows: [], shade: 'none' }, SEATTLE, dec)).toBe('No window · low light');
  });
});

describe('light tips', () => {
  const rooms = { 'Living room': west };
  const ctx = (now: Date, forecast?: Parameters<typeof lightTip>[1]['forecast']) => ({ lat: SEATTLE, now, rooms, forecast });

  it('stays quiet when nothing is wrong', () => {
    expect(lightTip(plant({ windowSpot: 'near' }), ctx(june))).toBeNull();
    // No room setup, no spot, or not indoors: nothing to say.
    expect(lightTip(plant({ windowSpot: undefined }), ctx(dec))).toBeNull();
    expect(lightTip(plant({ placement: 'growlight' }), ctx(dec))).toBeNull();
  });

  it('suggests a closer spot when it’s too dim, as a season thing when summer would do', () => {
    const tip = lightTip(plant(), ctx(dec));
    expect(tip?.kind).toBe('dim');
    expect(tip?.text).toBe('Short days: try about 1 m from the west window till spring.');
  });

  it('warns about harsh sun for a plant that wants gentle light', () => {
    expect(lightTip(plant({ windowSpot: 'sill' }), ctx(june))?.text).toBe('Summer sun is strong here: try about 1 m from the west window till autumn.');
  });

  it('warns before a hot day on a sunny sill', () => {
    const hot = [{ date: '2026-06-22', minC: 18, maxC: 33, precipMm: 0, code: 0 }];
    expect(lightTip(plant({ speciesId: 'monstera', name: 'Monsty', windowSpot: 'sill' }), ctx(june, hot))?.text).toBe('Hot Monday ahead: pull Monsty back from the sill that afternoon.');
  });

  it('nudges a borderline plant closer for a grey week', () => {
    const grey = [0, 1, 2, 3, 4].map((i) => ({ date: `2026-12-2${i + 1}`, minC: 3, maxC: 7, precipMm: 5, code: 61 }));
    expect(lightTip(plant({ speciesId: 'pothos', name: 'Goldie', windowSpot: 'near' }), ctx(dec, grey))?.kind).toBe('grey');
  });
});
