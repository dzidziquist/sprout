import { isFeedingPaused } from '../engine/careEngine';
import { climateMonth, isPreset, localizeClimateText, modelOf } from './climate';
import type { SeasonArt } from '../data/art';
import type { ClimateProfile } from '../types';

export interface SeasonBanner {
  title: string;
  body: string;
  /** Which season illustration fits. */
  art: SeasonArt;
}

/** One friendly line about what the season means for checks right now, wherever the user lives. */
export function seasonBanner(profile: ClimateProfile, now: Date): SeasonBanner {
  const m = climateMonth(profile, now);
  if (modelOf(profile) === 'seattle') {
    const paused = isFeedingPaused(profile, 'indoor', now);
    if (m >= 9 || m <= 3) {
      const title = isPreset(profile, 'seattle') ? 'Grey season' : 'Cool season';
      return { title, body: `Short days, so checks are spaced out.${paused ? ' Houseplant feeding is paused till spring.' : ''}`, art: 'season-grey' };
    }
    if (m >= 6 && m <= 8) return { title: isPreset(profile, 'seattle') ? 'Dry summer' : 'Summer', body: 'Outdoor pots dry fast: checks come sooner.', art: 'season-dry-summer' };
    return { title: 'Spring', body: 'Days are getting longer. Feeding is back on.', art: 'season-spring' };
  }
  if (m === 11 || m <= 1) return { title: localizeClimateText('Harmattan', profile), body: 'Dry air dries pots faster, so checks come sooner.', art: 'season-harmattan' };
  if ((m >= 3 && m <= 5) || m === 8 || m === 9) return { title: 'Rainy season', body: 'Pots stay damp longer. Watch for gnats.', art: 'season-rains' };
  return { title: 'Dry season', body: 'Check pots a little more often.', art: 'season-dry-summer' };
}
