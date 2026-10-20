import type { ImageSourcePropType } from 'react-native';

/*
 * Illustrations from the PlantFam asset set (assets/art, sourced from assets/incoming/PlantFam).
 * Keyed by where they're used, so screens never reference files directly.
 */
export const ART = {
  logo: require('../../assets/art/logo-sticker.png'),
  welcome: require('../../assets/art/onboarding-welcome.png'),
  emptyJungle: require('../../assets/art/empty-jungle.png'),
  caughtUp: require('../../assets/art/empty-caught-up.png'),
  offline: require('../../assets/art/error-offline.png'),
  memorial: require('../../assets/art/memorial.png'),
  harvest: require('../../assets/art/moment-harvest.png'),
  roots: require('../../assets/art/moment-roots.png'),
  thanks: require('../../assets/art/celebrate-thanks.png'),
  weekSaver: require('../../assets/art/week-saver.png'),
  awayTrip: require('../../assets/art/away-trip.png'),
  newLeaf: require('../../assets/art/moment-new-leaf.png'),
  smartSkip: require('../../assets/art/moment-smart-skip.png'),
  away: require('../../assets/art/state-away-mode.png'),
  growHouseplants: require('../../assets/art/onboarding-grow-houseplants.png'),
  growEdibles: require('../../assets/art/onboarding-grow-edibles.png'),
  growCuttings: require('../../assets/art/onboarding-grow-cuttings.png'),
} satisfies Record<string, ImageSourcePropType>;

export type SeasonArt = 'season-grey' | 'season-dry-summer' | 'season-spring' | 'season-harmattan' | 'season-rains' | 'season-winter';

export const SEASON_ART: Record<SeasonArt, ImageSourcePropType> = {
  'season-grey': require('../../assets/art/season-grey.png'),
  'season-dry-summer': require('../../assets/art/season-dry-summer.png'),
  'season-spring': require('../../assets/art/season-spring.png'),
  'season-harmattan': require('../../assets/art/season-harmattan.png'),
  'season-rains': require('../../assets/art/season-rains.png'),
  'season-winter': require('../../assets/art/season-winter.png'),
};

/**
 * Milestone art per badge (or per `Badge.art` key), with the locked (faded) variant. Badges without art keep
 * the line icon. 'survived-winter' and 'survived-dry-season' are the season badge's art in frosty and tropical climates.
 */
export const BADGE_ART: Partial<Record<string, { earned: ImageSourcePropType; locked: ImageSourcePropType }>> = {
  'first-roots': { earned: require('../../assets/art/badge-first-roots.png'), locked: require('../../assets/art/badge-first-roots-locked.png') },
  'first-harvest': { earned: require('../../assets/art/badge-first-harvest.png'), locked: require('../../assets/art/badge-first-harvest-locked.png') },
  'streak-4': { earned: require('../../assets/art/badge-four-week-streak.png'), locked: require('../../assets/art/badge-four-week-streak-locked.png') },
  'fam-5': { earned: require('../../assets/art/badge-five-plant-fam.png'), locked: require('../../assets/art/badge-five-plant-fam-locked.png') },
  'first-photo': { earned: require('../../assets/art/badge-first-photo.png'), locked: require('../../assets/art/badge-first-photo-locked.png') },
  'first-cutting': { earned: require('../../assets/art/badge-first-cutting.png'), locked: require('../../assets/art/badge-first-cutting-locked.png') },
  'first-check': { earned: require('../../assets/art/badge-first-check.png'), locked: require('../../assets/art/badge-first-check-locked.png') },
  season: { earned: require('../../assets/art/badge-survived-grey-season.png'), locked: require('../../assets/art/badge-survived-grey-season-locked.png') },
  'first-skip': { earned: require('../../assets/art/badge-first-skip.png'), locked: require('../../assets/art/badge-first-skip-locked.png') },
  propagator: { earned: require('../../assets/art/badge-propagator.png'), locked: require('../../assets/art/badge-propagator-locked.png') },
  generous: { earned: require('../../assets/art/badge-generous.png'), locked: require('../../assets/art/badge-generous-locked.png') },
  'grandma-plant': { earned: require('../../assets/art/badge-grandma-plant.png'), locked: require('../../assets/art/badge-grandma-plant-locked.png') },
  'ten-skips': { earned: require('../../assets/art/badge-ten-skips.png'), locked: require('../../assets/art/badge-ten-skips-locked.png') },
  'survived-dry-season': { earned: require('../../assets/art/badge-survived-dry-season.png'), locked: require('../../assets/art/badge-survived-dry-season-locked.png') },
  // Only ever shown earned (see medalBadge), so it has no locked variant.
  medal: { earned: require('../../assets/art/badge-medal.png'), locked: require('../../assets/art/badge-medal.png') },
  'survived-winter': { earned: require('../../assets/art/badge-survived-winter.png'), locked: require('../../assets/art/badge-survived-winter-locked.png') },
};

/** Light setup pictures: where a plant sits by the window, and what's in the way of the light. */
export const LIGHT_ART = {
  sill: require('../../assets/art/light-spot-sill.png'),
  below: require('../../assets/art/light-spot-below.png'),
  near: require('../../assets/art/light-spot-near.png'),
  far: require('../../assets/art/light-spot-far.png'),
  none: require('../../assets/art/light-shade-none.png'),
  sheer: require('../../assets/art/light-shade-sheer.png'),
  outside: require('../../assets/art/light-shade-outside.png'),
} satisfies Record<string, ImageSourcePropType>;
