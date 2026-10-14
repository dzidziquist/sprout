import { useColorScheme } from 'react-native';
import { usePlantStore } from '../store/plantStore';
import { colors } from './tokens';
import type { PotColor } from '../types';

/**
 * Theme-aware colours. Every screen reads these through `useColors()` so Dark Mode works everywhere.
 * - bg: page background · card: sticker/card surface · line: sticker outline · drop: hard shadow
 * - ink / inkMuted: text · onBright: text on saturated fills (leaf, sun, coral, sky, grape, bubblegum)
 * - tints (mint, butter, peach, ice, lavender, blush, cloud) are soft backgrounds that carry `ink` text
 */
export interface Palette {
  scheme: 'light' | 'dark';
  bg: string;
  card: string;
  line: string;
  drop: string;
  ink: string;
  inkMuted: string;
  onBright: string;
  white: string;
  leaf: string;
  leafDeep: string;
  leafLight: string;
  sun: string;
  coral: string;
  sky: string;
  grape: string;
  bubblegum: string;
  orange: string;
  mint: string;
  butter: string;
  peach: string;
  ice: string;
  lavender: string;
  blush: string;
  cloud: string;
  warn: string;
  good: string;
  glass: string;
  pot: Record<PotColor, string>;
  potTint: Record<PotColor, string>;
}

const shared = {
  leaf: colors.leaf,
  leafDeep: colors.leafDeep,
  leafLight: colors.leafLight,
  sun: colors.sun,
  coral: colors.coral,
  sky: colors.sky,
  grape: colors.grape,
  bubblegum: colors.bubblegum,
  orange: colors.orange,
  onBright: colors.ink,
  pot: { yellow: colors.sun, blue: colors.sky, coral: colors.coral, grape: colors.grape, bubblegum: colors.bubblegum },
};

export const light: Palette = {
  ...shared,
  scheme: 'light',
  bg: colors.white,
  card: colors.white,
  line: colors.ink,
  drop: colors.ink,
  ink: colors.ink,
  inkMuted: colors.inkMuted,
  white: colors.white,
  mint: colors.mint,
  butter: colors.butter,
  peach: colors.peach,
  ice: colors.ice,
  lavender: colors.lavender,
  blush: colors.blush,
  cloud: colors.cloud,
  warn: colors.warn,
  good: colors.good,
  glass: 'rgba(255,255,255,0.55)',
  potTint: { yellow: colors.butter, blue: colors.ice, coral: colors.peach, grape: colors.lavender, bubblegum: colors.blush },
};

export const dark: Palette = {
  ...shared,
  scheme: 'dark',
  bg: '#14141F',
  card: '#1F1E30',
  line: '#D8D4F5',
  drop: '#000000',
  ink: '#F4F2FF',
  inkMuted: '#A9A6C4',
  white: '#1F1E30',
  mint: '#17372A',
  butter: '#3D3418',
  peach: '#46271F',
  ice: '#1D3245',
  lavender: '#2D2648',
  blush: '#45222E',
  cloud: '#26253A',
  warn: '#FF9F7A',
  good: '#7CEBA8',
  glass: 'rgba(40,38,62,0.55)',
  potTint: { yellow: '#3D3418', blue: '#1D3245', coral: '#46271F', grape: '#2D2648', bubblegum: '#45222E' },
};

const BRIGHT = new Set<string>([colors.leaf, colors.leafDeep, colors.leafLight, colors.sun, colors.coral, colors.sky, colors.grape, colors.bubblegum, colors.orange]);

/** Text colour that reads on a given fill: dark ink on saturated colours, theme ink elsewhere. */
export function textOn(bg: string, c: Palette): string {
  return BRIGHT.has(bg) ? c.onBright : c.ink;
}

export function useColors(): Palette {
  const system = useColorScheme();
  const pref = usePlantStore((s) => s.profile.theme);
  const scheme = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  return scheme === 'dark' ? dark : light;
}
