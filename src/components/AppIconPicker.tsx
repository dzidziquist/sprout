import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { APP_ICONS, appIconsAvailable, currentAppIcon, setAppIcon, type AppIconId } from '../lib/appIcon';
import * as haptics from '../lib/haptics';
import { fonts, type } from '../theme/tokens';
import { useColors } from '../theme/theme';

/** Settings → App icon: a reward for 7 milestones. Hidden where the phone can't switch icons. */
export function AppIconPicker() {
  const c = useColors();
  const [icon, setIcon] = useState<AppIconId | null>(() => currentAppIcon());
  if (!appIconsAvailable()) return null;
  return (
    <View style={{ gap: 8 }}>
      <Text style={[styles.title, { color: c.inkMuted }]} accessibilityRole="header">APP ICON</Text>
      <View style={[styles.group, { backgroundColor: c.card, borderColor: c.line }]} accessibilityRole="radiogroup">
        {APP_ICONS.map((o) => {
          const on = icon === o.id;
          return (
            <Pressable
              key={o.label}
              accessibilityRole="radio"
              accessibilityLabel={`${o.label} app icon`}
              accessibilityState={{ selected: on }}
              onPress={async () => {
                haptics.tap();
                if (on) return;
                if (await setAppIcon(o.id)) setIcon(o.id);
              }}
              style={styles.option}
            >
              <Image source={c.scheme === 'dark' ? o.previewDark : o.preview} style={[styles.preview, { borderColor: on ? c.leafDeep : c.line, borderWidth: on ? 3 : 1.5 }]} />
              <Text style={[styles.label, { color: on ? c.ink : c.inkMuted }]}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.footer, { color: c.inkMuted }]}>A reward for 7 milestones. iPhone shows a short note when the icon changes.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: fonts.bodyHeavy, ...type.caption, letterSpacing: 0.6, paddingHorizontal: 4 },
  group: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12, padding: 14, borderRadius: 20, borderWidth: 2 },
  option: { alignItems: 'center', gap: 6 },
  preview: { width: 54, height: 54, borderRadius: 13 },
  label: { fontFamily: fonts.bodyHeavy, ...type.footnote },
  footer: { fontFamily: fonts.bodyHeavy, ...type.caption, paddingHorizontal: 4 },
});
