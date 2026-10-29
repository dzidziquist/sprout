import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Dropdown, DropdownGroup } from '@/components/Dropdown';
import { Label } from '@/components/ui';
import { SOIL_LABEL } from '@/data/labels';
import { mixBrand, type MixKind } from '@/data/mixes';
import { mixWeeks, shortDay } from '@/engine/mix';
import * as haptics from '@/lib/haptics';
import { selectedFill, textOn, useColors } from '@/theme/theme';
import { fonts, type } from '@/theme/tokens';
import type { Plant, Soil } from '@/types';

/** What the mix questions hold while they're being answered. */
export interface MixDraft {
  soil: Soil;
  name: string;
  fertiliser: 'yes' | 'no' | 'unsure';
  /** Unset: not sure. */
  kind?: MixKind;
  bagMonths?: number;
  /** When it went into this mix (ISO). */
  pottedAt: string;
  /** Edit screen: give every edible the same mix and date. */
  allEdibles?: boolean;
}

/** Mixes a repot goes into (no LECA, water or garden soil: those aren't a bag of mix). */
const MIXES: Soil[] = ['potting_mix', 'veg_mix', 'perlite_mix', 'chunky_aroid', 'gritty', 'bagged_cactus', 'coir', 'moisture_control', 'unsure'];
const FERTILISER: { id: MixDraft['fertiliser']; label: string }[] = [
  { id: 'yes', label: 'Yes' },
  { id: 'no', label: 'No' },
  { id: 'unsure', label: 'Not sure' },
];
const KINDS: { id?: MixKind; label: string; hint: string }[] = [
  { id: 'organic', label: 'Organic, rich', hint: 'Worm castings, guano, fish or kelp meal, compost' },
  { id: 'slow', label: 'Slow-release', hint: 'The bag says it feeds for months' },
  { label: 'Not sure', hint: '' },
];
const BAG: { months?: number; label: string }[] = [{ months: 3, label: '3 months' }, { months: 6, label: 'Up to 6 months' }, { label: 'Not sure' }];
const QUICK: { days: number; label: string }[] = [
  { days: 0, label: 'Today' },
  { days: 7, label: 'A week ago' },
  { days: 14, label: '2 weeks ago' },
  { days: 30, label: 'A month ago' },
  { days: 60, label: '2 months ago' },
];

const DAY = 86_400_000;

/** The plant's mix from the answers (only what was answered). */
export function mixOf(d: MixDraft): NonNullable<Plant['mix']> {
  const yes = d.fertiliser === 'yes';
  return {
    ...(d.name.trim() ? { name: d.name.trim() } : {}),
    fertiliser: d.fertiliser,
    ...(yes && d.kind ? { kind: d.kind } : {}),
    ...(yes && d.kind === 'slow' && d.bagMonths ? { bagMonths: d.bagMonths } : {}),
    pottedAt: d.pottedAt,
  };
}
const dayStart = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);

/**
 * Which mix a plant is in and whether it has fertiliser in it, so feed reminders wait while it's fresh
 * (engine/mix). A known brand name fills in the kind (data/mixes). The repot log asks which mix too;
 * the edit screen has its own soil choice and asks when it was potted, to the day, and can give every
 * edible the same mix (`edibles`: how many others there are).
 */
export function MixFields({ draft, onChange, speciesId, askSoil, askWhen, edibles = 0 }: { draft: MixDraft; onChange: (patch: Partial<MixDraft>) => void; speciesId: Plant['speciesId']; askSoil?: boolean; askWhen?: boolean; edibles?: number }) {
  const c = useColors();
  const weeks = mixWeeks(speciesId, { kind: draft.kind, bagMonths: draft.bagMonths });
  const potted = dayStart(new Date(draft.pottedAt));
  const today = dayStart(new Date());
  const setPotted = (d: Date) => onChange({ pottedAt: new Date(Math.min(d.getTime(), today.getTime())).toISOString() });
  const brand = mixBrand(draft.name);
  return (
    <View style={{ gap: 10 }}>
      {askSoil && (
        <>
          <Label>Which mix?</Label>
          <DropdownGroup>
            <Dropdown label="Mix" value={draft.soil} tint={c.mint} options={MIXES.map((s) => ({ id: s, label: SOIL_LABEL[s] }))} onChange={(soil) => onChange({ soil })} last />
          </DropdownGroup>
        </>
      )}
      <Label>Brand or name (optional)</Label>
      <TextInput
        value={draft.name}
        onChangeText={(name) => {
          // A well-known bag fills in what's in it (still changeable below).
          const known = mixBrand(name);
          onChange(known && known.kind !== 'none' ? { name, fertiliser: 'yes', kind: known.kind } : known?.kind === 'none' ? { name, fertiliser: 'no', kind: undefined } : { name });
        }}
        placeholder="e.g. FoxFarm Ocean Forest"
        placeholderTextColor={c.inkMuted}
        maxLength={60}
        style={[styles.input, { borderColor: c.line, color: c.ink, backgroundColor: c.card }]}
        accessibilityLabel="Mix brand or name"
        returnKeyType="done"
      />
      {brand && <Text style={[styles.small, { color: c.inkMuted }]}>{brand.name}: {brand.kind === 'organic' ? 'rich organic food' : brand.kind === 'slow' ? 'slow-release food' : 'no added fertiliser'}.</Text>}
      <Label>Fertiliser in the mix?</Label>
      <View style={styles.wrap}>
        {FERTILISER.map((f) => (
          <Choice key={f.id} on={draft.fertiliser === f.id} bg={c.butter} label={f.label} onPress={() => onChange({ fertiliser: f.id })} />
        ))}
      </View>
      {draft.fertiliser === 'yes' && (
        <>
          <Label>What kind?</Label>
          <View style={styles.wrap}>
            {KINDS.map((k) => (
              <Choice key={k.label} on={draft.kind === k.id} bg={c.butter} label={k.label} onPress={() => onChange({ kind: k.id })} />
            ))}
          </View>
          {!!KINDS.find((k) => k.id === draft.kind)?.hint && <Text style={[styles.small, { color: c.inkMuted }]}>{KINDS.find((k) => k.id === draft.kind)!.hint}</Text>}
          {draft.kind === 'slow' && (
            <>
              <Label>The bag says it feeds for</Label>
              <View style={styles.wrap}>
                {BAG.map((b) => (
                  <Choice key={b.label} on={draft.bagMonths === b.months} bg={c.butter} label={b.label} onPress={() => onChange({ bagMonths: b.months })} />
                ))}
              </View>
            </>
          )}
          <Text style={[styles.note, { color: textOn(c.butter, c), backgroundColor: c.butter, borderColor: c.line }]}>
            {draft.kind === 'organic'
              ? `Rich organic mixes are strongest at first and spent in about ${weeks} weeks. Feed reminders wait that long.`
              : draft.kind === 'slow'
                ? `A pot rinses slow-release food out sooner than the bag says. Feed reminders wait about ${weeks} weeks.`
                : `Feed reminders wait about ${weeks} weeks: a reminder a little early does less harm than a hungry plant.`}
          </Text>
        </>
      )}
      {askWhen && draft.fertiliser === 'yes' && (
        <>
          <Label>Potted into it</Label>
          <DropdownGroup>
            <Dropdown
              label="Roughly"
              value={QUICK.find((q) => Math.round((today.getTime() - potted.getTime()) / DAY) === q.days)?.label ?? null}
              placeholder="Exact day below"
              tint={c.peach}
              options={QUICK.map((q) => ({ id: q.label, label: q.label }))}
              onChange={(label) => {
                const q = QUICK.find((x) => x.label === label);
                if (q) setPotted(new Date(today.getTime() - q.days * DAY));
              }}
              last
            />
          </DropdownGroup>
          <View style={[styles.stepper, { borderColor: c.line, backgroundColor: c.card }]}>
            <Step label="A day earlier" glyph="−" onPress={() => setPotted(new Date(potted.getTime() - DAY))} />
            <Text style={[styles.date, { color: c.ink }]} accessibilityLiveRegion="polite">
              {potted.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
            <Step label="A day later" glyph="+" disabled={potted.getTime() >= today.getTime()} onPress={() => setPotted(new Date(potted.getTime() + DAY))} />
          </View>
          <Text style={[styles.small, { color: c.inkMuted }]}>Feeding picks up about {shortDay(new Date(potted.getTime() + weeks * 7 * DAY))}.</Text>
        </>
      )}
      {askWhen && edibles > 0 && draft.fertiliser !== 'unsure' && (
        <Choice
          on={!!draft.allEdibles}
          bg={c.mint}
          label={`Same mix for all my edibles (${edibles + 1})`}
          onPress={() => onChange({ allEdibles: !draft.allEdibles })}
        />
      )}
    </View>
  );
}

function Step({ label, glyph, onPress, disabled }: { label: string; glyph: string; onPress: () => void; disabled?: boolean }) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      hitSlop={6}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={[styles.step, { borderColor: c.line, backgroundColor: c.cloud }, disabled && { opacity: 0.35 }]}
    >
      <Text style={[styles.stepText, { color: c.ink }]}>{glyph}</Text>
    </Pressable>
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
  pill: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 2, justifyContent: 'center', alignSelf: 'flex-start' },
  pillText: { fontFamily: fonts.bodyHeavy, ...type.callout },
  input: { minHeight: 50, borderRadius: 16, borderWidth: 2, paddingHorizontal: 14, fontFamily: fonts.bodyHeavy, fontSize: type.body.fontSize },
  note: { borderWidth: 2, borderRadius: 14, padding: 11, overflow: 'hidden', fontFamily: fonts.bodyHeavy, ...type.footnote },
  small: { fontFamily: fonts.bodyHeavy, ...type.footnote, paddingHorizontal: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderRadius: 16, padding: 6 },
  step: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: fonts.display, ...type.title3 },
  date: { fontFamily: fonts.display, ...type.headline },
});
