import { describe, expect, it } from 'vitest';
import { fmtRain, fmtTemp, localizeTemps, resolveUnits } from './units';

describe('units', () => {
  it('follows the climate unless set', () => {
    expect(resolveUnits({ units: 'auto', climate: 'seattle' })).toBe('imperial');
    expect(resolveUnits({ units: 'auto', climate: 'accra' })).toBe('metric');
    expect(resolveUnits({ units: 'metric', climate: 'seattle' })).toBe('metric');
  });

  it('formats temperatures and rain', () => {
    expect(fmtTemp(13, 'imperial')).toBe('55°F');
    expect(fmtTemp(13, 'metric')).toBe('13°C');
    expect(fmtRain(25.4, 'imperial')).toBe('1 in');
    expect(fmtRain(20, 'metric')).toBe('20 mm');
  });

  it('localizes guide text', () => {
    expect(localizeTemps('Ripen at 13–21°C, about 18°C to sprout', 'imperial')).toBe('Ripen at 55–70°F, about 64°F to sprout');
    expect(localizeTemps('nights above 15.5°C', 'metric')).toBe('nights above 15.5°C');
  });
});
