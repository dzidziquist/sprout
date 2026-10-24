import type { PotColor } from '../types';

export const colors = {
  ink: '#1B1B2F',
  inkMuted: '#55556B',
  white: '#FFFFFF',
  leaf: '#3DDC84',
  leafDeep: '#22B864',
  leafLight: '#7CEBA8',
  sun: '#FFD23F',
  coral: '#FF6B5B',
  sky: '#5AB8FF',
  grape: '#A78BFA',
  bubblegum: '#FFB3C7',
  orange: '#FF9F1C',
  // tints
  mint: '#D7F9E4',
  butter: '#FFF1B8',
  peach: '#FFD9CF',
  ice: '#D6EEFF',
  lavender: '#EDE7FF',
  blush: '#FFE1E8',
  cloud: '#F2F2F6',
  // status text
  warn: '#C2410C',
  good: '#14804A',
};

export const potHex: Record<PotColor, string> = {
  yellow: colors.sun,
  blue: colors.sky,
  coral: colors.coral,
  grape: colors.grape,
  bubblegum: colors.bubblegum,
  gold: '#E0A526',
};

/** A soft background tint that pairs with each pot colour. */
export const potTint: Record<PotColor, string> = {
  yellow: colors.butter,
  blue: colors.ice,
  coral: colors.peach,
  grape: colors.lavender,
  bubblegum: colors.blush,
  gold: '#F0C24B',
};

export const fonts = {
  display: 'Fredoka_700Bold',
  displaySemi: 'Fredoka_600SemiBold',
  body: 'Nunito_700Bold',
  bodyHeavy: 'Nunito_800ExtraBold',
};

export const radius = { chip: 16, button: 16, card: 22, sheet: 30 };

/** The "sticker" look: 2px ink outline plus a hard drop shadow straight down. */
export const sticker = {
  borderWidth: 2,
  borderColor: colors.ink,
};

/**
 * Spacing. xl is the page gutter everywhere and the gap between sections on tab screens; sheets and forms
 * use lg between sections, and dense forms md.
 */
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 };

/**
 * The type scale, after iOS's text styles (a step smaller below headline, since Nunito runs large).
 * Spread one into a text style: `{ fontFamily: fonts.bodyHeavy, ...type.footnote }`. Inputs take only
 * `fontSize`, because a line height on a single-line TextInput shifts its text on iOS.
 */
export const type = {
  display: { fontSize: 44, lineHeight: 48 },
  largeTitle: { fontSize: 36, lineHeight: 40 },
  title1: { fontSize: 30, lineHeight: 34 },
  title2: { fontSize: 24, lineHeight: 28 },
  title3: { fontSize: 20, lineHeight: 25 },
  headline: { fontSize: 17, lineHeight: 22 },
  body: { fontSize: 15, lineHeight: 21 },
  callout: { fontSize: 14, lineHeight: 19 },
  footnote: { fontSize: 13, lineHeight: 18 },
  caption: { fontSize: 12, lineHeight: 16 },
  caption2: { fontSize: 11, lineHeight: 14 },
} satisfies Record<string, { fontSize: number; lineHeight: number }>;

export type TypeStyle = keyof typeof type;
