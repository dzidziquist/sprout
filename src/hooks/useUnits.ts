import { usePlantStore } from '../store/plantStore';
import { resolveUnits, type Units } from '../lib/units';

export function useUnits(): Units {
  return usePlantStore((s) => resolveUnits(s.profile));
}
