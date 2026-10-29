import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Dropdown, DropdownGroup } from '@/components/Dropdown';
import { Label } from '@/components/ui';
import { SOIL_LABEL } from '@/data/labels';
import { mixFeedsUntil } from '@/engine/mix';
import * as haptics from '@/lib/haptics';
import { POTTED, type PottedId } from '@/lib/when';
import { selectedFill, textOn, useColors } from '@/theme/theme';
import { fonts, type } from '@/theme/tokens';
import type { Plant, Soil } from '@/types';

/** What the mix questions hold while they're being answered. */
export interface MixDraft {
  soil: Soil;
  name: string;
  fertiliser: 'yes' | 'no' | 'unsure';
  bagMonths?: number;
  potted: PottedId;
}

/** Mixes a repot goes into (no LECA, water or garden soil: those aren't a bag of mix). */
const MIXES: Soil[] = ['potting_mix', 'veg_mix', 'perlite_mix', 'chunky_aroid', 'gritty', 'bagged_cactus', 'coir', 'moisture_control', 'unsure'];
const FERTILISER: { id: MixDraft['fertiliser']; label: string }[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
  { id: 'unsure', label: 'Not sure' },
];
const BAG: { months?: number; label: string }[] = [{ months: 1, label: '1 month' }, { months: 3, label: '3 months' }, { months: 6, label: 'Up to 6 months' }, { label: 'Not sure' }];

/**
 * Which mix a plant is in and whether it has fertiliser in it, so feed reminders wait while it's fresh
 * (engine/mix). The repot log asks which mix too; the edit screen has its own soil choice and asks when
 * it was potted instead.
 */
export function MixFields({ draft, onChange, speciesId, askSoil, askWhen }: { draft: MixDraft; onChange: (patch: Partial<MixDraft>) => void; speciesId: Plant['speciesId']; askSoil?: boolean; askWhen?: boolean }) {
  const c = useColors();
  const weeks = Math.round((mixFeedsUntil({ speciesId, mix: { fertiliser: 'yes', bagMonths: draft.bagMonths, pottedAt: new Date(0).toISOString() } })?.getTime() ?? 0) / (7 * 86_400_000));
  return (
    <View style={{ gap: 10 }}>
      {askSoil && (
        <>
          <Label>Which mix?</Label>
          <View style={styles.wrap}>
            {MIXES.map((s) => (
              <Choice key={s} on={draft.soil === s} bg={c.mint} label={SOIL_LABEL[s]} onPress={() => onChange({ soil: s })} />
            ))}
          </View>
        </>
      )}
      <Label>Brand or name (optional)</Label>
      <TextInput
        value={draft.name}
        onChangeText={(name) => onChange({ name })}
        placeholder="e.g. the name on the bag"
        placeholderTextColor={c.inkMuted}
        maxLength={60}
        style={[styles.input, { borderColor: c.line, color: c.ink, backgroundColor: c.card }]}
        accessibilityLabel="Mix brand or name"
        returnKeyType="done"
      />
      <Label>Fertiliser in the mix?</Label>
      <View style={styles.wrap}>
        {FERTILISER.map((f) => (
          <Choice key={f.id} on={draft.fertiliser === f.id} bg={c.butter} label={f.label} onPress={() => onChange({ fertiliser: f.id })} />
        ))}
      </View>
      {draft.fertiliser === 'yes' && (
        <>
          <Label>The bag says it feeds for</Label>
          <View style={styles.wrap}>
            {BAG.map((b) => (
              <Choice key={b.label} on={draft.bagMonths === b.months} bg={c.butter} label={b.label} onPress={() => onChange({ bagMonths: b.months })} />
            ))}
          </View>
          <Text style={[styles.note, { color: textOn(c.butter, c), backgroundColor: c.butter, borderColor: c.line }]}>
            In a pot, watering rinses it out sooner than the bag says. Feed reminders wait about {weeks} weeks from potting.
          </Text>
        </>
      )}
      {askWhen && draft.fertiliser === 'yes' && (
        <DropdownGroup>
          <Dropdown label="Potted into it" value={draft.potted} tint={c.peach} options={POTTED} onChange={(potted) => onChange({ potted })} last />
        </DropdownGroup>
      )}
    </View>
  );
}

function Choice({ on, label, onPress, bg }: { on: boolean; label: string; onPress: () => void; bg: string }) {
  const c = useColors();
  const fill = on ? selectedFill(bg, c) : c.card;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: on }}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={[styles.pill, { backgroundColor: fill, borderColor: c.line }, on && { boxShadow: `0px 3px 0px ${c.drop}` }]}
    >
      <Text style={[styles.pillText, { color: textOn(fill, c) }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 2, justifyContent: 'center' },
  pillText: { fontFamily: fonts.bodyHeavy, ...type.callout },
  input: { minHeight: 50, borderRadius: 16, borderWidth: 2, paddingHorizontal: 14, fontFamily: fonts.bodyHeavy, fontSize: type.body.fontSize },
  note: { borderWidth: 2, borderRadius: 14, padding: 11, overflow: 'hidden', fontFamily: fonts.bodyHeavy, ...type.footnote },
});
