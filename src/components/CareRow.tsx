import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import * as haptics from '@/lib/haptics';
import { fonts, type } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

/**
 * One line of a plant's Recent care. Notes and captions open to edit (onOpen); entries that can be deleted
 * get a small trash can that turns into "Delete" on the first tap and deletes on the second, so a stray tap
 * never loses anything. It goes back to the can after a few seconds.
 */
export function CareRow({ label, when, lines = 1, onOpen, onDelete }: { label: string; when: string; lines?: number; onOpen?: () => void; onDelete?: () => void }) {
  const c = useColors();
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);

  const text = (
    <>
      <Text style={[styles.text, { color: c.ink }]} numberOfLines={lines}>{label}</Text>
      <Text style={[styles.date, { color: c.inkMuted }]}>{when}</Text>
    </>
  );
  return (
    <View style={styles.row}>
      {onOpen ? (
        <Pressable accessibilityRole="button" accessibilityHint="Edit" onPress={onOpen} style={({ pressed }) => [styles.main, pressed && { opacity: 0.6 }]}>
          {text}
        </Pressable>
      ) : (
        <View style={styles.main}>{text}</View>
      )}
      {onDelete &&
        (armed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Confirm delete ${label}`}
            hitSlop={8}
            onPress={() => {
              haptics.success();
              onDelete();
            }}
            style={[styles.confirm, { backgroundColor: c.warn }]}
          >
            <Text style={[styles.confirmText, { color: c.bg }]}>Delete</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Delete ${label}`}
            hitSlop={10}
            onPress={() => {
              haptics.tap();
              setArmed(true);
            }}
            style={styles.trash}
          >
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3" stroke={c.inkMuted} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </Svg>
          </Pressable>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  main: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  text: { fontFamily: fonts.bodyHeavy, ...type.callout, flexShrink: 1 },
  date: { fontFamily: fonts.body, ...type.footnote },
  trash: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  confirm: { borderRadius: 12, paddingHorizontal: 14, minHeight: 36, justifyContent: 'center' },
  confirmText: { fontFamily: fonts.bodyHeavy, ...type.footnote },
});
