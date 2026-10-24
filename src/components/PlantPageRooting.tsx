import { StyleSheet, Text, View } from 'react-native';
import { POT_UP_AFTER_DAYS, rootingDays } from '@/engine/treeLayout';
import { Sticker } from '@/components/ui';
import { METHOD_CARE, METHOD_LABEL, METHOD_WORD } from '@/components/CuttingMethods';
import { useColors } from '@/theme/theme';
import { fonts, type } from '@/theme/tokens';
import type { Plant } from '@/types';

type Rooting = NonNullable<Plant['rooting']>;

/** Days since it was taken (at least 1), matching the pot-up sheet. */
const dayOf = (r: Rooting, now: Date) => Math.max(1, rootingDays(r.startedAt, now));

/** Stats row for a rooting cutting: day N of ~21/28, the medium, and when it's likely ready. */
export function RootingStats({ rooting, now }: { rooting: Rooting; now: Date }) {
  const c = useColors();
  const target = POT_UP_AFTER_DAYS[rooting.method];
  const day = dayOf(rooting, now);
  const left = target - rootingDays(rooting.startedAt, now);
  const stats: [string, string, string][] = [
    [`Day ${day}`, `of ~${target}`, c.ice],
    [METHOD_WORD[rooting.method].replace('in ', '').replace(/^./, (s) => s.toUpperCase()), 'rooting in', c.lavender],
    [left > 0 ? `In ${left} ${left === 1 ? 'day' : 'days'}` : 'Ready now', left > 0 ? 'roots likely' : 'check the roots', c.mint],
  ];
  return (
    <View style={styles.stats}>
      {stats.map(([num, label, bg]) => (
        <Sticker key={label} drop={0} bg={bg} style={styles.stat}>
          <Text style={[styles.statNum, { color: c.ink }]} numberOfLines={1}>{num}</Text>
          <Text style={[styles.statLabel, { color: c.ink }]}>{label}</Text>
        </Sticker>
      ))}
    </View>
  );
}

/** Care table for a cutting that's still rooting (replaces the soil-plant water/soil/feed rows). */
export function RootingCare({ rooting, now, pets }: { rooting: Rooting; now: Date; pets: boolean | undefined }) {
  const c = useColors();
  const target = POT_UP_AFTER_DAYS[rooting.method];
  const rows: [string, string, boolean?][] = [
    ['Medium', METHOD_LABEL[rooting.method]],
    ['Progress', dayOf(rooting, now) > target ? `Day ${dayOf(rooting, now)}: past ~${target}, check the roots` : `Day ${dayOf(rooting, now)} of ~${target}`],
    ['Care', METHOD_CARE[rooting.method]],
    ['Light', 'Bright, out of direct sun'],
    ['Feed', 'None until it’s potted up'],
    ['Pot up', 'When roots are 2–5 cm long'],
    ['Pets', pets === undefined ? 'Not sure yet: check the ASPCA list' : pets ? 'Toxic to cats and dogs' : 'Pet-friendly', pets !== false],
  ];
  return (
    <Sticker drop={0} style={{ overflow: 'hidden' }}>
      {rows.map(([k, v, warn], i) => (
        <View key={k} style={[styles.row, i < rows.length - 1 && { borderBottomWidth: 2, borderColor: c.cloud }]}>
          <Text style={[styles.rowKey, { color: c.inkMuted }]}>{k}</Text>
          <Text style={[styles.rowVal, { color: warn ? c.warn : c.ink }]}>{v}</Text>
        </View>
      ))}
    </Sticker>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, padding: 10, borderRadius: 16 },
  statNum: { fontFamily: fonts.display, ...type.body },
  statLabel: { fontFamily: fonts.bodyHeavy, ...type.caption },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  rowKey: { fontFamily: fonts.bodyHeavy, ...type.callout },
  rowVal: { fontFamily: fonts.bodyHeavy, ...type.callout, flexShrink: 1, textAlign: 'right' },
});
