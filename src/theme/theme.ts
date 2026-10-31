import { useColorScheme } from 'react-native';
import { usePlantStore } from '../store/plantStore';
import { colors } from './tokens';
import type { Accent, PotColor } from '../types';

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
  /** Link and accent-coloured text: leafDeep is for fills and fails contrast as text, this passes 4.5:1. */
  link: string;
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
  link: '#11733F',
  leafLight: colors.leafLight,
  sun: colors.sun,
  coral: colors.coral,
  sky: colors.sky,
  grape: colors.grape,
  bubblegum: colors.bubblegum,
  orange: colors.orange,
  onBright: colors.ink,
  pot: { yellow: colors.sun, blue: colors.sky, coral: colors.coral, grape: colors.grape, bubblegum: colors.bubblegum, green: colors.leaf, gold: '#E0A526' },
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
  potTint: { yellow: colors.butter, blue: colors.ice, coral: colors.peach, grape: colors.lavender, bubblegum: colors.blush, green: colors.mint, gold: '#F0C24B' },
};

export const dark: Palette = {
  ...shared,
  scheme: 'dark',
  bg: '#14141F',
  link: '#22B864',
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
  potTint: { yellow: '#3D3418', blue: '#1D3245', coral: '#46271F', grape: '#2D2648', bubblegum: '#45222E', green: '#1C3A2A', gold: '#4A3A10' },
};

/**
 * Accent colours: each swaps the leaf family (leaf, leafDeep, leafLight and the mint tint) so buttons,
 * highlights and heroes follow the person's pick. Status text (`good`) and plant art stay green.
 */
export const ACCENTS: Record<Accent, { label: string; leaf: string; leafDeep: string; leafLight: string; mint: string; mintDark: string; link: string; linkDark: string }> = {
  leaf: { label: 'Leaf', leaf: colors.leaf, leafDeep: colors.leafDeep, leafLight: colors.leafLight, mint: colors.mint, mintDark: '#17372A', link: '#11733F', linkDark: '#22B864' },
  sky: { label: 'Sky', leaf: colors.sky, leafDeep: '#2E8FE0', leafLight: '#9ED4FF', mint: colors.ice, mintDark: '#1D3245', link: '#1A6CB5', linkDark: '#5AAEF2' },
  grape: { label: 'Grape', leaf: colors.grape, leafDeep: '#7C5CE6', leafLight: '#C9B8FF', mint: colors.lavender, mintDark: '#2D2648', link: '#5E3FD0', linkDark: '#A58DFF' },
  coral: { label: 'Coral', leaf: colors.coral, leafDeep: '#E04A3A', leafLight: '#FFA197', mint: colors.peach, mintDark: '#46271F', link: '#B8362A', linkDark: '#FF8A7D' },
  bubblegum: { label: 'Bubblegum', leaf: colors.bubblegum, leafDeep: '#E8789A', leafLight: '#FFD1DD', mint: colors.blush, mintDark: '#45222E', link: '#B4406A', linkDark: '#FF9DBA' },
};

const BRIGHT = new Set<string>([
  colors.sun, colors.coral, colors.sky, colors.grape, colors.bubblegum, colors.orange,
  ...Object.values(ACCENTS).flatMap((a) => [a.leaf, a.leafDeep, a.leafLight]),
]);

/** Text colour that reads on a given fill: dark ink on saturated colours, theme ink elsewhere. */
export function textOn(bg: string, c: Palette): string {
  return BRIGHT.has(bg) ? c.onBright : c.ink;
}

/**
 * Fill for a selected chip. Dark tints sit too close to the card colour to read as selected, so dark mode
 * uses the bright twin (mint → leaf, butter → sun…). Pair with textOn() for its label.
 */
export function selectedFill(bg: string, c: Palette): string {
  if (c.scheme !== 'dark') return bg;
  const twin: Record<string, string> = { [c.mint]: c.leaf, [c.peach]: c.coral, [c.ice]: c.sky, [c.butter]: c.sun, [c.lavender]: c.grape };
  return twin[bg] ?? bg;
}

export function useColors(): Palette {
  const system = useColorScheme();
  const pref = usePlantStore((s) => s.profile.theme);
  const scheme = pref === 'system' ? (system === 'dark' ? 'dark' : 'light') : pref;
  const accent = usePlantStore((s) => s.profile.accent) ?? 'leaf';
  return paletteFor(scheme, accent);
}

const cache = new Map<string, Palette>();
/** The light or dark palette with an accent swapped in. Cached so screens get a stable object. */
export function paletteFor(scheme: 'light' | 'dark', accent: Accent): Palette {
  const base = scheme === 'dark' ? dark : light;
  if (accent === 'leaf') return base;
  const key = `${scheme}-${accent}`;
  let p = cache.get(key);
  if (!p) {
    const a = ACCENTS[accent];
    p = { ...base, leaf: a.leaf, leafDeep: a.leafDeep, leafLight: a.leafLight, mint: scheme === 'dark' ? a.mintDark : a.mint, link: scheme === 'dark' ? a.linkDark : a.link };
    cache.set(key, p);
  }
  return p;
}
