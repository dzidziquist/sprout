import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { useRewards } from '@/hooks/useRewards';
import { closestJoined, closestOption, CUT, daysAgo, JOINED, WATERED, type CutId, type JoinedId, type WateredId } from '@/lib/when';
import { isReservoir } from '@/engine/careEngine';
import { speciesOf, OTHER, isOtherId } from '@/data/species';
import { SOIL_LABEL } from '@/data/labels';
import { PlantBuddy } from '@/components/PlantBuddy';
import { GoldSparkles, goldFrame } from '@/components/GoldSparkles';
import { confirmDelete, deleteCopy, usePlantActions } from '@/components/PlantMenu';
import { GlassButton } from '@/components/GlassButton';
import { Dropdown, DropdownGroup } from '@/components/Dropdown';
import { Button, Label, Title } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { textOn, useColors, selectedFill } from '@/theme/theme';
import { LineIcon } from '@/components/LineIcon';
import { SunIcon } from '@/components/SunIcon';
import { fonts } from '@/theme/tokens';
import type { Light, Origin, Placement, PotColor, PotMaterial, Soil, SpeciesGroup } from '@/types';
import { edibleGuide } from '@/data/edibles';
import { useSheetTop } from '@/lib/sheetTop';
import { useDiscardGuard } from '@/hooks/useDiscardGuard';
import { Glyph } from '@/components/Glyph';

const CARD_COLORS: { id: PotColor; label: string }[] = [
  { id: 'yellow', label: 'Butter' },
  { id: 'blue', label: 'Sky' },
  { id: 'coral', label: 'Peach' },
  { id: 'grape', label: 'Lavender' },
  { id: 'bubblegum', label: 'Blush' },
  { id: 'gold', label: 'Gold' },
];

const LIGHTS: { id: Light; label: string; suns: number }[] = [
  { id: 'low', label: 'Shady', suns: 1 },
  { id: 'medium', label: 'Some', suns: 2 },
  { id: 'bright', label: 'Bright', suns: 3 },
  { id: 'direct', label: 'Direct sun', suns: 4 },
];
// Soil swatches are illustration colours (they depict the mix), not UI colours.
const SOILS: { id: Soil; swatch: string }[] = [
  { id: 'potting_mix', swatch: '#8B5E3C' },
  { id: 'chunky_aroid', swatch: '#C9A27E' },
  { id: 'gritty', swatch: '#D9CBB0' },
  { id: 'perlite_mix', swatch: '#B89A7A' },
  { id: 'bagged_cactus', swatch: '#C8AE8A' },
  { id: 'veg_mix', swatch: '#6B4A2E' },
  { id: 'coir', swatch: '#9A6B45' },
  { id: 'moisture_control', swatch: '#5E4330' },
  { id: 'leca', swatch: '#E07A4F' },
  { id: 'water', swatch: '#7FC8E8' },
  { id: 'moss', swatch: '#7CB86A' },
  { id: 'garden_soil', swatch: '#5A4632' },
  { id: 'unsure', swatch: '#FFFFFF' },
];
const POT_SIZES: { label: string; cm: number }[] = [
  { label: 'Small', cm: 10 },
  { label: 'Medium', cm: 15 },
  { label: 'Large', cm: 22 },
  { label: 'Huge', cm: 32 },
];
const MATERIALS: { id: PotMaterial; label: string }[] = [
  { id: 'plastic', label: 'Plastic' },
  { id: 'terracotta', label: 'Terracotta' },
  { id: 'glazed', label: 'Glazed' },
  { id: 'fabric', label: 'Grow bag' },
];
/** Where it lives. A grow light is a switch under Indoors (placement 'growlight'), so it keeps its room and spot. */
const PLACES: { id: Placement; label: string }[] = [
  { id: 'indoor', label: 'Indoors' },
  { id: 'covered_outdoor', label: 'Balcony, covered' },
  { id: 'outdoor', label: 'Outside, in a pot' },
  { id: 'ground', label: 'Garden bed' },
];

const nearestSize = (cm: number) => POT_SIZES.reduce((a, b) => (Math.abs(b.cm - cm) < Math.abs(a.cm - cm) ? b : a)).cm;

function Pill({ on, label, onPress, bg, children }: { on: boolean; label: string; onPress: () => void; bg: string; children?: React.ReactNode }) {
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
      style={[styles.pill, { backgroundColor: fill, borderColor: c.line }, on && { boxShadow: `0px 3px 0px ${c.drop}` }, !!children && styles.pillWithSwatch]}
    >
      {children}
      <Text style={[styles.pillText, { color: textOn(fill, c) }]}>{label}</Text>
    </Pressable>
  );
}

/** How a plant started. Seeds for everything; scraps only for crops that regrow from a base. */
function originOptions(speciesId: string): { id: Origin; label: string }[] {
  const regrows = edibleGuide(speciesId)?.regrows;
  return [
    { id: 'bought', label: 'Bought as a plant' },
    { id: 'seed', label: 'From seed' },
    ...(regrows ? [{ id: 'scraps' as const, label: 'Regrown from scraps' }] : []),
    { id: 'cutting', label: 'My cutting' },
    { id: 'gift', label: 'Gift' },
    { id: 'swap', label: 'Swap' },
  ];
}

const SELF_WATER: { id: 'no' | 'always' | 'away'; label: string }[] = [
  { id: 'no', label: 'No' },
  { id: 'always', label: 'Yes, I keep it filled' },
  { id: 'away', label: 'Only fill it when I’m away' },
];

export default function EditPlantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sheetTop = useSheetTop();
  const c = useColors();
  const plant = usePlantStore((s) => s.plants.find((p) => p.id === id));
  const updatePlant = usePlantStore((s) => s.updatePlant);
  const setLastWatered = usePlantStore((s) => s.setLastWatered);
  const lastWater = usePlantStore((s) => s.events.filter((e) => e.plantId === id && e.type === 'water').reduce((m, e) => (e.at > m ? e.at : m), ''));
  const faces = usePlantStore((s) => s.profile.faces);
  const rewards = useRewards();
  const leave = () =>
    go(() => {
      if (router.canDismiss()) router.dismissAll();
      else router.replace('/');
    });
  const actions = usePlantActions(plant, { onDeleted: leave });

  const [name, setName] = useState(plant?.name ?? '');
  const [light, setLight] = useState<Light>(plant?.light ?? 'bright');
  const [soil, setSoil] = useState<Soil>(plant?.soil ?? 'potting_mix');
  const [size, setSize] = useState(plant ? nearestSize(plant.potDiameterCm) : 15);
  const [selfWatering, setSelfWatering] = useState<'always' | 'away' | undefined>(plant?.selfWatering);
  const [material, setMaterial] = useState<PotMaterial>(plant?.potMaterial ?? 'plastic');
  const [placement, setPlacement] = useState<Placement>(plant?.placement ?? 'indoor');
  const [room, setRoom] = useState(plant?.room ?? '');
  const indoors = placement === 'indoor' || placement === 'growlight';
  const [potColor, setPotColor] = useState<PotColor>(plant?.potColor ?? 'yellow');
  const initialJoined = plant ? closestJoined(plant.acquiredAt) : 'today';
  const [joined, setJoined] = useState<JoinedId>(initialJoined);
  const initialCut = plant?.rooting ? closestOption(CUT, plant.rooting.startedAt) : 'today';
  const [cut, setCut] = useState<CutId>(initialCut);
  const [origin, setOrigin] = useState<Origin>(plant?.origin ?? 'bought');
  const [watered, setWatered] = useState<WateredId | null>(null);
  const [confirming, setConfirming] = useState(false);
  // "Other" plants (not in the catalogue) can change their species name, care type and pet info.
  const [kind, setKind] = useState(plant?.custom?.commonName ?? '');
  const [latin, setLatin] = useState(plant?.custom?.latinName ?? '');
  const [otherId, setOtherId] = useState(plant?.speciesId ?? '');
  const [pets, setPets] = useState<'toxic' | 'safe' | 'unsure'>(plant?.custom?.petToxic === true ? 'toxic' : plant?.custom?.petToxic === false ? 'safe' : 'unsure');

  // Everything the form can change, to tell whether closing would lose anything.
  const form = JSON.stringify([name, light, soil, size, selfWatering, material, placement, room, potColor, joined, cut, origin, watered, kind, latin, otherId, pets]);
  const [pristine] = useState(form);
  const go = useDiscardGuard(form !== pristine);

  if (!plant || !actions) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  const sp = speciesOf(plant);
  const isOther = isOtherId(plant.speciesId);
  const tint = c.potTint[potColor];
  // Gold is a reward for 3 milestones; a gold card stays gold either way.
  const colors = CARD_COLORS.filter((o) => o.id !== 'gold' || rewards.gold.unlocked || plant.potColor === 'gold');
  const archived = !!plant.archivedAt;
  const back = () => (router.canGoBack() ? router.back() : router.replace(`/plant/${plant.id}`));

  // Writes the form. Archiving goes through here too, so edits made just before aren't lost.
  const commit = () => {
    updatePlant(plant.id, {
      origin,
      name: name.trim() || plant.name,
      light,
      soil,
      // Only touch the exact diameter if the size bucket actually changed.
      ...(size !== nearestSize(plant.potDiameterCm) ? { potDiameterCm: size } : {}),
      potMaterial: material,
      selfWatering: placement !== 'ground' && !isReservoir(soil) ? selfWatering : undefined,
      placement,
      room: room.trim() || undefined,
      potColor,
      // Only move the date when the chip changed, so an exact date isn't rounded away.
      ...(joined !== initialJoined && !plant.rooting ? { acquiredAt: daysAgo(JOINED.find((j) => j.id === joined)?.days ?? 0).toISOString() } : {}),
      // A rooting cutting joined the day it was taken, so both dates move together.
      ...(plant.rooting && cut !== initialCut
        ? (() => {
            const at = daysAgo(CUT.find((t) => t.id === cut)?.days ?? 0).toISOString();
            return { acquiredAt: at, rooting: { ...plant.rooting, startedAt: at } };
          })()
        : {}),
      ...(isOther
        ? {
            speciesId: otherId,
            custom: { commonName: kind.trim() || sp.commonName, latinName: latin.trim() || undefined, petToxic: pets === 'toxic' ? true : pets === 'safe' ? false : undefined },
          }
        : {}),
    });
    const days = watered ? WATERED.find((w) => w.id === watered)?.days : null;
    if (days !== null && days !== undefined) setLastWatered(plant.id, daysAgo(days));
  };
  const save = () => {
    commit();
    haptics.success();
    go(back);
  };
  const archive = (reason: 'gifted' | 'died') => {
    if (form !== pristine) commit();
    actions.archive(reason);
    go(back);
  };

  const askDelete = () => {
    if (Platform.OS === 'web') setConfirming(true);
    else confirmDelete(plant.name, actions.remove);
  };

  const input = [styles.input, { borderColor: c.line, color: c.ink, backgroundColor: c.card }];

  return (
    <ScrollView automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: sheetTop + 12, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <GlassButton accessibilityLabel="Cancel" onPress={back}>
          <Glyph name="close" size={16} color={c.ink} width={2.8} />
        </GlassButton>
        <Text style={[styles.headerTitle, { color: c.ink }]}>Edit plant</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Save changes" onPress={save} style={[styles.save, { backgroundColor: c.leafDeep, borderColor: c.line }]}>
          <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="m5 12 5 5 9-10" stroke={textOn(c.leafDeep, c)} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
        </Pressable>
      </View>

      <View style={[styles.hero, { backgroundColor: tint, borderColor: c.line, boxShadow: `0px 4px 0px ${c.drop}` }, goldFrame(potColor)]}>
        <GoldSparkles pot={potColor} />
        <PlantBuddy speciesId={plant.rooting ? 'cutting' : plant.speciesId} pot={potColor} size={88} bg={tint} faces={faces} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroKicker, { color: c.inkMuted }]}>Species</Text>
          <Text style={[styles.heroName, { color: c.ink }]}>{sp.commonName}</Text>
          <Text style={[styles.heroKicker, { color: c.inkMuted }]}>{sp.latinName}</Text>
        </View>
      </View>

      {isOther && (
        <View style={{ gap: 10 }}>
          <Label>What kind of plant is it?</Label>
          <TextInput value={kind} onChangeText={setKind} style={input} accessibilityLabel="Kind of plant" autoCapitalize="words" returnKeyType="next" placeholder="e.g. Hindu rope plant" placeholderTextColor={c.inkMuted} />
          <TextInput value={latin} onChangeText={setLatin} style={input} accessibilityLabel="Latin name" placeholder="Latin name (optional)" placeholderTextColor={c.inkMuted} autoCorrect={false} autoCapitalize="words" returnKeyType="done" />
          <Label>How does it like its water?</Label>
          <View style={styles.wrap}>
            {(Object.keys(OTHER) as SpeciesGroup[]).map((g) => (
              <Pill key={g} on={otherId === OTHER[g].id} bg={c.mint} label={OTHER[g].commonName} onPress={() => setOtherId(OTHER[g].id)} />
            ))}
          </View>
          <Label>Is it safe around pets?</Label>
          <View style={styles.wrap}>
            {([['unsure', 'Not sure'], ['safe', 'Pet-safe'], ['toxic', 'Toxic to pets']] as const).map(([id, label]) => (
              <Pill key={id} on={pets === id} bg={id === 'toxic' ? c.peach : c.mint} label={label} onPress={() => setPets(id)} />
            ))}
          </View>
        </View>
      )}

      <Label>Name</Label>
      <TextInput value={name} onChangeText={setName} style={[input, { fontFamily: fonts.displaySemi, fontSize: 19 }]} accessibilityLabel="Plant name" autoCapitalize="words" returnKeyType="done" placeholder={plant.name} placeholderTextColor={c.inkMuted} />

      <Label>Card colour</Label>
      <View style={styles.wrap} accessibilityRole="radiogroup">
        {colors.map((o) => (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityLabel={o.id === 'gold' ? 'Gold, a milestone reward' : o.label}
            accessibilityState={{ selected: potColor === o.id }}
            onPress={() => {
              haptics.tap();
              setPotColor(o.id);
            }}
            style={[styles.color, { backgroundColor: c.potTint[o.id], borderColor: c.line, borderWidth: potColor === o.id ? 4 : 2 }]}
          >
            {o.id === 'gold' && (
              <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="M12 3l2.2 6.8L21 12l-6.8 2.2L12 21l-2.2-6.8L3 12l6.8-2.2z" fill={c.pot.gold} stroke={c.line} strokeWidth={1.5} strokeLinejoin="round" /></Svg>
            )}
          </Pressable>
        ))}
      </View>

      <Label>A little history</Label>
      <DropdownGroup>
        {plant.rooting ? (
          <Dropdown label="Cutting taken" value={cut} tint={c.ice} options={CUT} onChange={setCut} last />
        ) : (
          <>
            <Dropdown label="How it started" value={origin} tint={c.mint} options={originOptions(plant.speciesId)} onChange={setOrigin} />
            <Dropdown label={origin === 'seed' ? 'Sown' : origin === 'scraps' ? 'Started' : 'Joined the fam'} value={joined} tint={c.lavender} options={JOINED} onChange={setJoined} />
          </>
        )}
        {!plant.rooting && (
          <Dropdown
            label={isReservoir(soil) ? 'Last topped up' : 'Last watered'}
            value={watered}
            tint={c.ice}
            placeholder="No change"
            options={[{ id: null, label: 'No change' }, ...WATERED.filter((w) => w.days !== null)]}
            onChange={setWatered}
            last
          />
        )}
      </DropdownGroup>
      {!plant.rooting && (
        <Text style={[styles.note, { color: c.inkMuted }]}>
          {watered
            ? 'Saving logs that watering and plans the next check from it.'
            : lastWater
              ? `Last logged ${new Date(lastWater).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}. Pick one if you've watered since.`
              : "Nothing logged yet. Pick one if you know."}
        </Text>
      )}

      <Label>How sunny is its spot?</Label>
      <View style={styles.wrap}>
        {LIGHTS.map((l) => (
          <Pill key={l.id} on={light === l.id} bg={c.sun} label={l.label} onPress={() => setLight(l.id)}>
            <View style={{ flexDirection: 'row' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {Array.from({ length: l.suns }, (_, i) => <SunIcon key={i} color={light === l.id ? textOn(selectedFill(c.sun, c), c) : c.ink} size={14} width={2.4} />)}
            </View>
          </Pill>
        ))}
      </View>

      <Label>What's it potted in?</Label>
      <View style={styles.wrap}>
        {SOILS.map((s) => (
          <Pill key={s.id} on={soil === s.id} bg={c.mint} label={SOIL_LABEL[s.id].replace(' (not ideal in pots)', '')} onPress={() => setSoil(s.id)}>
            <View style={[styles.swatch, { backgroundColor: s.swatch, borderColor: c.line }]} />
          </Pill>
        ))}
      </View>
      {soil === 'garden_soil' && placement !== 'ground' && <Text style={[styles.note, { color: c.warn }]}>Garden soil packs down and stays soggy in pots. Repot when you can.</Text>}

      <Label>Pot</Label>
      <View style={styles.wrap}>
        {POT_SIZES.map((p) => (
          <Pill key={p.label} on={size === p.cm} bg={c.mint} label={p.label} onPress={() => setSize(p.cm)} />
        ))}
      </View>
      <View style={styles.wrap}>
        {MATERIALS.map((m) => (
          <Pill key={m.id} on={material === m.id} bg={c.peach} label={m.label} onPress={() => setMaterial(m.id)} />
        ))}
      </View>
      {!isReservoir(soil) && placement !== 'ground' && (
        <>
          <Label>Self-watering pot?</Label>
          <View style={styles.wrap}>
            {SELF_WATER.map((o) => (
              <Pill key={o.id} on={(selfWatering ?? 'no') === o.id} bg={c.ice} label={o.label} onPress={() => setSelfWatering(o.id === 'no' ? undefined : o.id)} />
            ))}
          </View>
          {selfWatering && <Text style={[styles.note, { color: c.inkMuted }]}>{selfWatering === 'always' ? 'Checks become a quick peek at the water line, about half as often.' : 'Care stays the same. Away mode reminds you to fill it before a trip.'}</Text>}
        </>
      )}

      <Label>Where does it live?</Label>
      <View style={styles.wrap}>
        {PLACES.map((p) => (
          <Pill key={p.id} on={p.id === 'indoor' ? indoors : placement === p.id} bg={c.ice} label={p.label} onPress={() => setPlacement(p.id === 'indoor' && indoors ? placement : p.id)} />
        ))}
      </View>
      {indoors && (
        <View style={styles.wrap}>
          <Pill on={placement === 'growlight'} bg={c.butter} label="Under a grow light" onPress={() => setPlacement(placement === 'growlight' ? 'indoor' : 'growlight')}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <LineIcon name="bulb" color={placement === 'growlight' ? textOn(selectedFill(c.butter, c), c) : c.ink} size={16} width={2.2} />
            </View>
          </Pill>
        </View>
      )}
      <Text style={[styles.note, { color: c.inkMuted }]}>
        {placement === 'growlight'
          ? 'Its light comes from the lamp, so it isn’t in the Light view.'
          : 'Windowsills and shelves count as Indoors. How sunny the spot is tells them apart.'}
      </Text>
      <TextInput value={room} onChangeText={setRoom} placeholder="Room (optional), e.g. Living room" placeholderTextColor={c.inkMuted} style={input} accessibilityLabel="Room" autoCapitalize="words" returnKeyType="done" />
      <Text style={[styles.note, { color: c.inkMuted }]}>Changing light, soil, pot or spot re-plans the next check.</Text>

      <Button title="Save changes" raised onPress={save} style={{ minHeight: 56, marginTop: 6 }} textStyle={{ fontSize: 18, fontFamily: fonts.display }} />

      <View style={[styles.danger, { borderColor: c.line, backgroundColor: c.cloud }]}>
        <Text style={[styles.dangerTitle, { color: c.ink }]}>Archive or delete</Text>
        {archived ? (
          <>
            <Text style={[styles.note, { color: c.inkMuted }]}>{plant.name} is in memory. Bring them back if that was a mix-up.</Text>
            <Button title="Restore to jungle" bg={c.card} onPress={() => { actions.restore(); back(); }} />
          </>
        ) : (
          <>
            <Text style={[styles.note, { color: c.inkMuted }]}>Archiving takes {plant.name} off the round but keeps their diary and family tree.</Text>
            <View style={styles.row}>
              <Button title="Archive as gifted" bg={c.blush} style={{ flex: 1 }} onPress={() => archive('gifted')} />
              <Button title="Archive as lost" bg={c.card} style={{ flex: 1 }} onPress={() => archive('died')} />
            </View>
          </>
        )}
        {confirming ? (
          <View style={{ gap: 8 }}>
            <Text style={[styles.dangerTitle, { color: c.ink, fontSize: 16 }]}>{deleteCopy(plant.name).title}</Text>
            <Text style={[styles.note, { color: c.inkMuted }]}>{deleteCopy(plant.name).body}</Text>
            <View style={styles.row}>
              <Button title="Cancel" bg={c.card} style={{ flex: 1 }} onPress={() => setConfirming(false)} />
              <Button title="Delete" bg={c.coral} style={{ flex: 1 }} onPress={actions.remove} />
            </View>
          </View>
        ) : (
          <Pressable accessibilityRole="button" onPress={askDelete} style={styles.deleteLink} hitSlop={8}>
            <Text style={[styles.deleteText, { color: c.warn }]}>Delete {plant.name}…</Text>
          </Pressable>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  headerTitle: { fontFamily: fonts.displaySemi, fontSize: 17 },
  save: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 22, borderWidth: 2, marginBottom: 4 },
  heroKicker: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  heroName: { fontFamily: fonts.display, fontSize: 22 },
  input: { minHeight: 50, borderRadius: 16, borderWidth: 2, paddingHorizontal: 14, fontFamily: fonts.bodyHeavy, fontSize: 15 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 2, justifyContent: 'center' },
  pillWithSwatch: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6 },
  swatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
  color: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pillText: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  note: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  danger: { marginTop: 16, borderWidth: 2, borderRadius: 22, padding: 14, gap: 10 },
  dangerTitle: { fontFamily: fonts.display, fontSize: 18 },
  row: { flexDirection: 'row', gap: 8 },
  deleteLink: { alignSelf: 'center', paddingVertical: 6 },
  deleteText: { fontFamily: fonts.bodyHeavy, fontSize: 15 },
});
