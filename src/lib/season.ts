import { isFeedingPaused } from '../engine/careEngine';
import type { ClimateProfile } from '../types';

export interface SeasonBanner {
  title: string;
  body: string;
}

/** One friendly line about what the season means for checks right now. */
export function seasonBanner(profile: ClimateProfile, now: Date): SeasonBanner {
  const m = now.getMonth();
  if (profile === 'seattle') {
    const paused = isFeedingPaused('seattle', 'indoor', now);
    if (m >= 9 || m <= 3) {
      return { title: 'Grey season', body: `Short days, so checks are spaced out.${paused ? ' Feeding paused till March.' : ''}` };
    }
    if (m >= 6 && m <= 8) return { title: 'Dry summer', body: 'Outdoor pots dry fast: checks come sooner.' };
    return { title: 'Spring', body: 'Days are getting longer. Feeding is back on.' };
  }
  if (m === 11 || m <= 1) return { title: 'Harmattan', body: 'Dry air dries pots faster, so checks come sooner.' };
  if ((m >= 3 && m <= 5) || m === 8 || m === 9) return { title: 'Rainy season', body: 'Pots stay damp longer. Watch for gnats.' };
  return { title: 'Dry season', body: 'Check pots a little more often.' };
}
