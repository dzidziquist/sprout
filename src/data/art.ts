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
 * the line icon. 'survived-winter' is the season badge's art in climates that freeze.
 */
export const BADGE_ART: Partial<Record<string, { earned: ImageSourcePropType; locked: ImageSourcePropType }>> = {
  'first-roots': { earned: require('../../assets/art/badge-first-root.png'), locked: require('../../assets/art/badge-first-root-locked.png') },
  'first-harvest': { earned: require('../../assets/art/badge-first-harvest.png'), locked: require('../../assets/art/badge-first-harvest-locked.png') },
  'streak-4': { earned: require('../../assets/art/badge-week-streak.png'), locked: require('../../assets/art/badge-week-streak-locked.png') },
  'fam-5': { earned: require('../../assets/art/badge-jungle-10.png'), locked: require('../../assets/art/badge-jungle-10-locked.png') },
  'first-photo': { earned: require('../../assets/art/badge-photo-diary.png'), locked: require('../../assets/art/badge-photo-diary-locked.png') },
  'first-cutting': { earned: require('../../assets/art/badge-offshoots.png'), locked: require('../../assets/art/badge-offshoots-locked.png') },
  'first-check': { earned: require('../../assets/art/badge-first-new-leaf.png'), locked: require('../../assets/art/badge-first-new-leaf-locked.png') },
  season: { earned: require('../../assets/art/badge-survived-grey-season.png'), locked: require('../../assets/art/badge-survived-grey-season-locked.png') },
  'first-skip': { earned: require('../../assets/art/badge-knows-when-to-wait.png'), locked: require('../../assets/art/badge-knows-when-to-wait-locked.png') },
  propagator: { earned: require('../../assets/art/badge-propagator.png'), locked: require('../../assets/art/badge-propagator-locked.png') },
  generous: { earned: require('../../assets/art/badge-generous.png'), locked: require('../../assets/art/badge-generous-locked.png') },
  'grandma-plant': { earned: require('../../assets/art/badge-grandma-plant.png'), locked: require('../../assets/art/badge-grandma-plant-locked.png') },
  'survived-winter': { earned: require('../../assets/art/badge-survived-winter.png'), locked: require('../../assets/art/badge-survived-winter-locked.png') },
};
