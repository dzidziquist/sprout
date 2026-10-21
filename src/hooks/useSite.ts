import { useMemo } from 'react';
import type { Site } from '../engine/light';
import { siteOf } from '../lib/site';
import { usePlantStore } from '../store/plantStore';

/** Where the home is, for the light estimates: latitude and each month's measured sunlight. */
export function useSite(): Site {
  const climate = usePlantStore((s) => s.profile.climate);
  const sunlight = usePlantStore((s) => s.profile.sunlight);
  return useMemo(() => siteOf(climate, sunlight), [climate, sunlight]);
}
