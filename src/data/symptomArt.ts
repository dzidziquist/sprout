import type { ImageSourcePropType } from 'react-native';
import type { SymptomArea } from './diagnosis';

/*
 * Pictures for the plant doctor's symptom tiles, saved as assets/symptoms/symptom-{id}.png
 * (prompts in docs/symptom-art-prompts.md). Symptoms without a picture yet show their area's icon.
 */
export const SYMPTOM_ART: Partial<Record<string, ImageSourcePropType>> = {};

/** Line icons (24×24 paths) for each area, used until the pictures arrive. */
export const AREA_ICON: Record<SymptomArea, string> = {
  leaves: 'M5 19c0-8 5-14 14-14 0 9-6 14-14 14zM5 19l7-7',
  stems: 'M12 21V8M12 12c-3 0-5-2-5-5 3 0 5 2 5 5zM12 9c3 0 5-2 5-5-3 0-5 2-5 5z',
  soil: 'M4 14h16l-2 7H6l-2-7zM8 14c0-2 1.5-3 4-3s4 1 4 3M12 11V5',
  bugs: 'M9 9a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0V9zM12 6V4M9 11H5M15 11h4M9 15H5M15 15h4M10 5 8 3M14 5l2-2',
  fruit: 'M12 8c-4 0-7 3-7 7s3 6 7 6 7-2 7-6-3-7-7-7zM12 8c0-2 1-4 3-5M12 8c-1-1-3-2-5-1',
};
