import type { ImageSourcePropType } from 'react-native';
import type { SymptomArea } from './diagnosis';

/*
 * Pictures for the plant doctor's symptom tiles, saved as assets/symptoms/symptom-{id}.png
 * (prompts in docs/symptom-art-prompts.md), resized to 384 px. A symptom without a picture shows its area's icon.
 */
export const SYMPTOM_ART: Partial<Record<string, ImageSourcePropType>> = {
  'yellow-lower': require('../../assets/symptoms/symptom-yellow-lower.png'),
  'yellow-pale': require('../../assets/symptoms/symptom-yellow-pale.png'),
  'brown-tips': require('../../assets/symptoms/symptom-brown-tips.png'),
  'brown-spots': require('../../assets/symptoms/symptom-brown-spots.png'),
  'bleached': require('../../assets/symptoms/symptom-bleached.png'),
  'drooping': require('../../assets/symptoms/symptom-drooping.png'),
  'curling': require('../../assets/symptoms/symptom-curling.png'),
  'dropping': require('../../assets/symptoms/symptom-dropping.png'),
  'speckled': require('../../assets/symptoms/symptom-speckled.png'),
  'holes': require('../../assets/symptoms/symptom-holes.png'),
  'white-powder': require('../../assets/symptoms/symptom-white-powder.png'),
  'leggy': require('../../assets/symptoms/symptom-leggy.png'),
  'mushy-stem': require('../../assets/symptoms/symptom-mushy-stem.png'),
  'no-growth': require('../../assets/symptoms/symptom-no-growth.png'),
  'bolting': require('../../assets/symptoms/symptom-bolting.png'),
  'soil-fuzz': require('../../assets/symptoms/symptom-soil-fuzz.png'),
  'soil-crust': require('../../assets/symptoms/symptom-soil-crust.png'),
  'soil-smell': require('../../assets/symptoms/symptom-soil-smell.png'),
  'soil-dry': require('../../assets/symptoms/symptom-soil-dry.png'),
  'tiny-flies': require('../../assets/symptoms/symptom-tiny-flies.png'),
  'webbing': require('../../assets/symptoms/symptom-webbing.png'),
  'sticky': require('../../assets/symptoms/symptom-sticky.png'),
  'cotton': require('../../assets/symptoms/symptom-cotton.png'),
  'clusters': require('../../assets/symptoms/symptom-clusters.png'),
  'bumps': require('../../assets/symptoms/symptom-bumps.png'),
  'white-flies': require('../../assets/symptoms/symptom-white-flies.png'),
  'fruit-rot-end': require('../../assets/symptoms/symptom-fruit-rot-end.png'),
  'flower-drop': require('../../assets/symptoms/symptom-flower-drop.png'),
  'fruit-split': require('../../assets/symptoms/symptom-fruit-split.png'),
  'fruit-holes': require('../../assets/symptoms/symptom-fruit-holes.png'),
};

/** Line icons (24×24 paths) for each area: the area tabs, and the fallback for a symptom with no picture. */
export const AREA_ICON: Record<SymptomArea, string> = {
  leaves: 'M5 19c0-8 5-14 14-14 0 9-6 14-14 14zM5 19l7-7',
  stems: 'M12 21V8M12 12c-3 0-5-2-5-5 3 0 5 2 5 5zM12 9c3 0 5-2 5-5-3 0-5 2-5 5z',
  soil: 'M4 14h16l-2 7H6l-2-7zM8 14c0-2 1.5-3 4-3s4 1 4 3M12 11V5',
  bugs: 'M9 9a3 3 0 0 1 6 0v6a3 3 0 0 1-6 0V9zM12 6V4M9 11H5M15 11h4M9 15H5M15 15h4M10 5 8 3M14 5l2-2',
  fruit: 'M12 8c-4 0-7 3-7 7s3 6 7 6 7-2 7-6-3-7-7-7zM12 8c0-2 1-4 3-5M12 8c-1-1-3-2-5-1',
};
