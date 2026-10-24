import { Platform } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import Svg, { Path } from 'react-native-svg';

/** Toolbar and control icons: Apple's SF Symbols on iPhone, the same shapes drawn elsewhere. */
const GLYPHS = {
  close: { sf: 'xmark', d: 'M6 6l12 12M18 6 6 18' },
  back: { sf: 'chevron.left', d: 'm15 18-6-6 6-6' },
} satisfies Record<string, { sf: SFSymbol; d: string }>;

export type GlyphName = keyof typeof GLYPHS;

export function Glyph({ name, color, size = 16, width = 2.8 }: { name: GlyphName; color: string; size?: number; width?: number }) {
  const g = GLYPHS[name];
  const drawn = (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={g.d} stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
  if (Platform.OS !== 'ios') return drawn;
  return <SymbolView name={g.sf} size={size} tintColor={color} weight="bold" fallback={drawn} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />;
}
