import { Linking, Pressable, StyleSheet, Text } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import * as haptics from '@/lib/haptics';
import { fonts, type } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import type { WikiPhoto } from '@/lib/wiki';

/** "Photo: J. Smith · CC BY-SA 4.0 · Wikimedia Commons", linking to the file's page. Always shown with a real photo. */
export function PhotoCredit({ photo }: { photo: WikiPhoto }) {
  const c = useColors();
  return (
    <Text
      accessibilityRole="link"
      accessibilityLabel={`Photo by ${photo.author}, ${photo.license}, from Wikimedia Commons. Opens the photo's page.`}
      onPress={() => Linking.openURL(photo.page)}
      style={[styles.credit, { color: c.inkMuted }]}
      numberOfLines={2}
    >
      Photo: {photo.author} · {photo.license} · <Text style={{ textDecorationLine: 'underline' }}>Wikimedia Commons</Text>
    </Text>
  );
}

/** The small "Real photo" / "PlantFam art" switch. */
export function PhotoToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  const c = useColors();
  // Dark pill with page-coloured text until it's on, then a plain card. (textOn() can't be used here: it only
  // knows the bright accent fills, and gave ink-on-ink, so the label was invisible.)
  const fill = on ? c.card : c.ink;
  const ink = on ? c.ink : c.bg;
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: on }}
      accessibilityLabel="Real photo"
      hitSlop={8}
      onPress={() => {
        haptics.tap();
        onChange(!on);
      }}
      style={[styles.toggle, { backgroundColor: fill, borderColor: c.line }]}
    >
      <Svg width={14} height={14} viewBox="0 0 24 24">
        <Path d="M3 8.5A2.5 2.5 0 0 1 5.5 6h2l1.5-2h6L16.5 6h2A2.5 2.5 0 0 1 21 8.5v9a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5z" stroke={ink} strokeWidth={2.2} strokeLinejoin="round" fill="none" />
        <Circle cx={12} cy={13} r={3.2} stroke={ink} strokeWidth={2.2} fill="none" />
      </Svg>
      <Text style={[styles.toggleText, { color: ink }]}>{on ? 'PlantFam art' : 'Real photo'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  credit: { fontFamily: fonts.bodyHeavy, ...type.caption2 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 2, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 5 },
  toggleText: { fontFamily: fonts.bodyHeavy, ...type.caption },
});
