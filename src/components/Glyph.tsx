import { Platform } from 'react-native';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import Svg, { Path } from 'react-native-svg';

/** Toolbar and control icons: Apple's SF Symbols on iPhone, the same shapes drawn elsewhere. */
const GLYPHS = {
  close: { sf: 'xmark', d: 'M6 6l12 12M18 6 6 18' },
  back: { sf: 'chevron.left', d: 'm15 18-6-6 6-6' },
  add: { sf: 'plus', d: 'M12 5v14M5 12h14' },
  edit: { sf: 'pencil', d: 'M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4' },
  trash: { sf: 'trash', d: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3' },
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
