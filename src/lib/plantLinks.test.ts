import { describe, expect, it } from 'vitest';
import { addHref, displayName, homeFor, speciesHref } from './plantLinks';
import { siteOf } from './site';
import type { RoomLight } from '../engine/light';

const west: RoomLight = { windows: ['W'], shade: 'none' };
const june = new Date(2026, 5, 21, 12);

describe('plant links', () => {
  it('links catalogue plants by id and unlisted ones by name', () => {
    expect(speciesHref('calathea')).toBe('/species/calathea');
    expect(speciesHref('other-tropical', { commonName: 'Hindu rope', latinName: 'Hoya carnosa' })).toBe('/species/other?name=Hindu%20rope&latin=Hoya%20carnosa');
    expect(addHref('calathea', undefined, 'w1')).toBe('/add?species=calathea&wish=w1');
    expect(addHref('other-tropical', { commonName: 'Rex begonia' })).toBe('/add?other=1&name=Rex%20begonia&latin=');
  });

  it('capitalises photo ID names, falling back to the Latin name', () => {
    expect(displayName(['swiss cheese plant'], 'Monstera deliciosa')).toBe('Swiss cheese plant');
    expect(displayName([], 'Begonia rex')).toBe('Begonia rex');
  });

  it('says where a houseplant would suit, but not for edibles or unlisted plants', () => {
    expect(homeFor('calathea', { 'Living room': west }, siteOf('seattle'), june)?.suits).toBe('Living room');
    expect(homeFor('tomato', { 'Living room': west }, siteOf('seattle'), june)).toBeNull();
    expect(homeFor('other-tropical', { 'Living room': west }, siteOf('seattle'), june)).toBeNull();
    expect(homeFor('calathea', {}, siteOf('seattle'), june)).toBeNull();
  });
});
