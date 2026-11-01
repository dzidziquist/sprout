/**
 * The colour of each badge art's enamel rim, earned and locked, measured from the artwork (median of the
 * outer ring's pixels). The badge screen paints the coin's edge and back in it, so a spin shows a solid
 * coin rather than a flat picture. Re-measure if the art changes. Keys match BADGE_ART.
 */
export const BADGE_RIMS: Partial<Record<string, { earned: string; locked: string }>> = {
  'first-check': { earned: '#5DA707', locked: '#A7ADB4' },
  'first-skip': { earned: '#77DF19', locked: '#A1A7AD' },
  'ten-skips': { earned: '#026AEB', locked: '#909092' },
  'first-photo': { earned: '#FCD02C', locked: '#B3B3B3' },
  'first-cutting': { earned: '#9518FA', locked: '#989EA9' },
  'first-roots': { earned: '#03CCFC', locked: '#A0A6B0' },
  'first-harvest': { earned: '#FC9D06', locked: '#A4A7AC' },
  propagator: { earned: '#16DEFC', locked: '#B1B8BF' },
  'fam-5': { earned: '#FBD532', locked: '#B0B0AF' },
  generous: { earned: '#FA1C9A', locked: '#A0A1A4' },
  'grandma-plant': { earned: '#FACC15', locked: '#B6B6B6' },
  'streak-4': { earned: '#FCC109', locked: '#B0B0B0' },
  season: { earned: '#FBCD25', locked: '#B4B4B5' },
  'survived-winter': { earned: '#31C5FC', locked: '#A4A5A7' },
  'survived-dry-season': { earned: '#FA9926', locked: '#9C9C9C' },
  medal: { earned: '#F7BD28', locked: '#F7BD28' },
};

/** Share of the art's width the coin fills (the PNGs have a little transparent margin). */
export const COIN_FILL = 0.89;

/** Blend two #RRGGBB colours: t = 0 gives `a`, 1 gives `b`. */
export function mixHex(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}
