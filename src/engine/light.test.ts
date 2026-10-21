import { describe, expect, it } from 'vitest';
import { bestHome, facingOf, lightTip, placeOf, roomToday, roomsInUse, spotFits, spotLight, suits, sunDay, windowsLine, yearFit, yearLight, type RoomLight } from './light';
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
    // (Low winter sun is weak through all that air, so it's well under its hours.)
    expect(sunDay(SEATTLE, dec).direct.S).toBeGreaterThan(2.5);
    expect(sunDay(SEATTLE, dec).direct.N).toBe(0);
    // South of it, the other way round.
    expect(sunDay(SYDNEY, june).direct.N).toBeGreaterThan(sunDay(SYDNEY, june).direct.S + 3);
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

describe('review fixes', () => {
  it('only calls a tip seasonal when that season is now', () => {
    // Accra's dry-season sun pours through a south sill in December: harsh now, and not a summer thing.
    const south = { 'Living room': { windows: ['S'], shade: 'none' } as RoomLight };
    expect(lightTip(plant({ windowSpot: 'sill' }), { lat: ACCRA, now: dec, rooms: south })?.text).toBe('Strong sun here. Try about 1 m from the south window.');
    // Seattle's grey December doesn't make the same sill too sunny.
    expect(lightTip(plant({ windowSpot: 'sill' }), { lat: SEATTLE, now: dec, rooms: south })).toBeNull();
  });

  it('ignores forecast days that have already passed', () => {
    const yesterday = [{ date: '2026-06-20', minC: 20, maxC: 35, precipMm: 0, code: 0 }];
    expect(lightTip(plant({ speciesId: 'monstera', windowSpot: 'sill' }), { lat: SEATTLE, now: june, rooms: { 'Living room': west }, forecast: yesterday })).toBeNull();
  });

  it('forgets rooms nobody lives in any more', () => {
    expect(Object.keys(roomsInUse({ 'Living room': west, Office: west }, [plant()]))).toEqual(['Living room']);
  });
});

describe('room setup', () => {
  it('works out an unsure window as an average one, between the darkest and sunniest guesses', () => {
    const unsure: RoomLight = { windows: [], shade: 'none', unsure: true };
    const avg = spotLight(unsure, 'sill', SEATTLE, dec).score;
    expect(avg).toBeGreaterThan(spotLight({ windows: ['N'], shade: 'none' }, 'sill', SEATTLE, dec).score);
    expect(avg).toBeLessThan(spotLight({ windows: ['S'], shade: 'none' }, 'sill', SEATTLE, dec).score);
    expect(spotLight({ windows: [], shade: 'none' }, 'sill', SEATTLE, dec).level).toBe('low');
    expect(roomToday(unsure, SEATTLE, dec)).not.toBe('No window · low light');
  });

  it('describes windows the way a person would', () => {
    expect(windowsLine(west)).toBe('West-facing window');
    expect(windowsLine({ windows: ['E', 'S', 'W'], shade: 'none' })).toBe('East, south and west windows');
    expect(windowsLine({ windows: [], shade: 'none', unsure: true })).toBe('Window, direction not sure');
    expect(windowsLine({ windows: [], shade: 'none' })).toBe('No window');
  });

  it('rounds a compass heading to the nearest direction', () => {
    expect(facingOf(268)).toBe('W');
    expect(facingOf(359)).toBe('N');
    expect(facingOf(44)).toBe('N');
    expect(facingOf(46)).toBe('E');
    expect(facingOf(-90)).toBe('W');
  });

  it('rates every spot for a plant, darkest away from the window', () => {
    const fits = spotFits(plant(), west, SEATTLE, dec);
    expect(fits.far).toBe('dim');
    expect(fits.near).toBe('ok');
  });
});

describe('in your home', () => {
  it('names a room and spot that would suit a new plant, or says why none does', () => {
    const rooms = { 'Living room': west, Hallway: { windows: [], shade: 'none' } as RoomLight };
    expect(bestHome('medium', rooms, SEATTLE, june)).toEqual({ room: 'Living room', words: 'about 1 m from the west window' });
    expect(bestHome('direct', { Hallway: rooms.Hallway, North: { windows: ['N'], shade: 'outside' } }, SEATTLE, dec)).toEqual({ room: null, dim: true });
    expect(bestHome('medium', {}, SEATTLE, june)).toBeNull();
  });
});

describe('rooms without a window', () => {
  const dark: RoomLight = { windows: [], shade: 'none' };
  it('places a plant there without asking where it sits, and says why it is dim', () => {
    expect(placeOf(plant({ room: 'Bathroom', windowSpot: undefined }), { Bathroom: dark })?.spot).toBe('far');
    // With a window, the spot still has to be known.
    expect(placeOf(plant({ windowSpot: undefined }), { 'Living room': west })).toBeNull();
    expect(lightTip(plant({ room: 'Bathroom', windowSpot: undefined }), { lat: SEATTLE, now: june, rooms: { Bathroom: dark } })?.kind).toBe('dim');
  });

  it('tells a new plant the home is too dark when no set-up room has a window', () => {
    expect(bestHome('bright', { Bathroom: dark }, SEATTLE, june)).toEqual({ room: null, dim: true });
    expect(bestHome('low', { Bathroom: dark }, SEATTLE, june)).toEqual({ room: 'Bathroom', words: 'anywhere in it' });
  });
});

describe('light at a west window in a Seattle autumn', () => {
  const west: RoomLight = { windows: ['W'], shade: 'none' };
  const rooms = { 'Living room': west };
  const oct = new Date(2026, 9, 21, 12);
  const grey = [0, 1, 2, 3, 4].map((i) => ({ date: `2026-10-${21 + i}`, minC: 8, maxC: 12, precipMm: 6, code: 61 }));

  it('sends a grey-week plant to a spot that is clearly brighter, not one that is barely so', () => {
    // 1 m away and below the window get much the same light; the sill gets nearly twice it.
    const tip = lightTip(plant({ speciesId: 'heart-fern', name: 'Hearty', windowSpot: 'near' }), { lat: 47.6, now: oct, rooms, forecast: grey });
    expect(tip).toEqual({ kind: 'grey', text: 'Grey days ahead: Hearty would get more light on the west sill for now.' });
  });

  it('says when no spot in the home has enough light, instead of asking for a brighter one', () => {
    const tip = lightTip(plant({ speciesId: 'tomato', name: 'Tommy', windowSpot: 'sill' }), { lat: 47.6, now: oct, rooms });
    expect(tip?.growLight).toBe(true);
    expect(tip?.text).toBe('No spot in your home gets enough light for a cherry tomato at this time of year. A grow light would help till spring.');
  });

  it('warns about summer sun on a sill that only suits a fern for now', () => {
    expect(yearFit({ speciesId: 'heart-fern' }, west, 'sill', 47.6, oct)).toBe('Good for now. Summer sun gets too strong here, so move it back from the glass in late spring.');
    expect(yearFit({ speciesId: 'heart-fern' }, west, 'near', 47.6, oct)).toBe('Medium in winter · bright in summer');
  });
});
