import { useUnits } from '@/hooks/useUnits';
import { localizeTemps } from '@/lib/units';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { OTHER, SPECIES, SPECIES_LIST, getSpecies, isOtherId, searchSpecies } from '@/data/species';
import { SOIL_LABEL } from '@/data/labels';
import { PlantBuddy } from '@/components/PlantBuddy';
import { GlassButton } from '@/components/GlassButton';
import { Button, Label, Title } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { fonts } from '@/theme/tokens';
import { textOn, useColors } from '@/theme/theme';
import { usePlus } from '@/hooks/usePlus';
import type { Light, Origin, PlantCategory, Placement, PotMaterial, Soil, SpeciesGroup, SpeciesId } from '@/types';

const isSpeciesId = (v: unknown): v is SpeciesId => typeof v === 'string' && v in SPECIES;

const NAMES: Partial<Record<SpeciesId, string[]>> = {
  monstera: ['Monty', 'Swiss Cheese', 'Big Leaf'],
  pothos: ['Queenie', 'Vinny', 'Marble'],
  fig: ['Big Fig', 'Figgy', 'Fiddle'],
  calathea: ['Cal', 'Stripes', 'Orbi'],
  snake: ['Snakey', 'Sir Hiss', 'Spike'],
  hoya: ['Waxy', 'Pearl', 'Hoya Lisa'],
  tomato: ['Tommy', 'Sungold', 'Cherry'],
  pepper: ['Chili', 'Spicy', 'Bonnet'],
  'spring-onion': ['Scallie', 'Oniony', 'Spring'],
};
const fallbackNames = ['Sprout', 'Leafy', 'Bud', 'Twiggy'];

const CATEGORIES: { id: PlantCategory | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'houseplant', label: 'Houseplants' },
  { id: 'succulent', label: 'Succulents' },
  { id: 'vegetable', label: 'Veg' },
  { id: 'herb', label: 'Herbs' },
  { id: 'fruit', label: 'Fruit' },
];
const PAGE = 48;

/** Care types for plants that aren't in the catalogue. */
const CARE_TYPES: { group: SpeciesGroup; title: string; sub: string }[] = [
  { group: 'tropical', title: 'Leafy tropical', sub: 'Philodendrons, aroids, most leafy houseplants' },
  { group: 'succulent', title: 'Succulent or cactus', sub: 'Fat leaves or spines; likes to dry right out' },
  { group: 'moisture', title: 'Moisture lover', sub: 'Ferns, prayer plants; likes to stay lightly damp' },
  { group: 'edible', title: 'Something tasty', sub: 'Veg, herbs or fruit for the grow patch' },
];
const PETS: { id: 'toxic' | 'safe' | 'unsure'; label: string }[] = [
  { id: 'unsure', label: 'Not sure' },
  { id: 'safe', label: 'Pet-safe' },
  { id: 'toxic', label: 'Toxic to pets' },
];

const LIGHTS: { id: Light; label: string; suns: number }[] = [
  { id: 'low', label: 'Shady', suns: 1 },
  { id: 'medium', label: 'Some', suns: 2 },
  { id: 'bright', label: 'Bright', suns: 3 },
  { id: 'direct', label: 'Sun!', suns: 4 },
];
const SOILS: { id: Soil; swatch: string; note: string }[] = [
  { id: 'potting_mix', swatch: '#8B5E3C', note: 'Holds water longest. Checks spaced out; repot every 1–2 years.' },
  { id: 'chunky_aroid', swatch: '#C9A27E', note: 'Bark + perlite drains fast. Checks come a bit sooner.' },
  { id: 'gritty', swatch: '#D9CBB0', note: 'For succulents and cacti. Dries quickest; we let it go bone dry.' },
  { id: 'veg_mix', swatch: '#6B4A2E', note: 'Container mix for edibles, pH around 6–7.' },
  { id: 'leca', swatch: '#E07A4F', note: 'Semi-hydro: you top up a reservoir and feed every watering.' },
  { id: 'moss', swatch: '#7CB86A', note: 'Sphagnum stays damp: great for rooting, easy to overwater.' },
  { id: 'garden_soil', swatch: '#5A4632', note: "Garden soil packs down and stays soggy in pots. Repot when you can." },
  { id: 'unsure', swatch: '#FFFFFF', note: 'No problem. We start cautious and learn from your soil checks.' },
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
const PLACES: { id: Placement; label: string }[] = [
  { id: 'indoor', label: 'Indoors' },
  { id: 'growlight', label: 'Grow light' },
  { id: 'covered_outdoor', label: 'Balcony, covered' },
  { id: 'outdoor', label: 'Outside' },
];
const ORIGINS: { id: Origin; label: string }[] = [
  { id: 'bought', label: 'Bought' },
  { id: 'cutting', label: 'My cutting' },
  { id: 'swap', label: 'Swap' },
  { id: 'gift', label: 'Gift' },
];

function Pill({ on, label, onPress, bg }: { on: boolean; label: string; onPress: () => void; bg?: string }) {
  const c = useColors();
  const fill = bg ?? c.mint;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={[styles.pill, { borderColor: c.line, backgroundColor: on ? fill : c.card }, on && { boxShadow: `0px 3px 0px ${c.drop}` }]}
    >
      <Text style={[styles.pillText, { color: on ? textOn(fill, c) : c.ink }]}>{label}</Text>
    </Pressable>
  );
}

/** Care defaults a freshly picked species starts with. */
/** A sensible first guess at the care type from the name someone typed. Leaning dry is the safer mistake. */
export function guessGroup(name: string): SpeciesGroup {
  const n = name.toLowerCase();
  if (/(cact|succulent|string of|haworth|echever|sedum|crassul|agave|aloe|lithop|euphorb|jade|hoya|senecio|ceropeg|kalanch|peperomia)/.test(n)) return 'succulent';
  if (/(fern|calathea|maranta|prayer|moss|carnivor|flytrap|pitcher|sundew|violet|fittonia|nerve|baby tear)/.test(n)) return 'moisture';
  if (/(tomato|pepper|chil|bean|pea\b|lettuce|kale|herb|basil|squash|berry|onion|garlic|veg|fruit|lemon|lime|melon|cucumber|okra|yam|cassava)/.test(n)) return 'edible';
  return 'tropical';
}

/** First suggested name for a species that nobody in the fam already has. */
function freeName(id: SpeciesId, taken: string[]): string {
  const used = new Set(taken.map((t) => t.toLowerCase()));
  const pool = NAMES[id] ?? fallbackNames;
  return pool.find((n) => !used.has(n.toLowerCase())) ?? `${pool[0]} ${taken.length + 1}`;
}

function defaultsFor(id: SpeciesId) {
  const sp = getSpecies(id);
  return { soil: sp.defaultSoil, light: sp.defaultLight, placement: (sp.edible ? 'covered_outdoor' : 'indoor') as Placement, name: (NAMES[id] ?? fallbackNames)[0] };
}

export default function AddPlantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { isPlus } = usePlus();
  // /add?species=pothos (from photo ID) skips the picker; /add?other=1&name=…&latin=… starts an "other" plant.
  const params = useLocalSearchParams<{ species?: string; other?: string; name?: string; latin?: string }>();
  // Arriving from photo ID (/add?species=pothos) skips the picker.
  const otherPreset = params.other ? OTHER.tropical.id : null;
  const preset = isSpeciesId(params.species) ? params.species : otherPreset;
  const presetDefaults = preset ? defaultsFor(preset) : null;
  const { plants, addPlant, profile } = usePlantStore();
  const units = useUnits();
  const [speciesId, setSpeciesId] = useState<SpeciesId | null>(preset);
  const [query, setQuery] = useState('');
  const [nameIdx, setNameIdx] = useState(0);
  const [name, setName] = useState(presetDefaults?.name ?? '');
  const [light, setLight] = useState<Light>(presetDefaults?.light ?? 'bright');
  const [soil, setSoil] = useState<Soil>(presetDefaults?.soil ?? 'potting_mix');
  const [size, setSize] = useState(15);
  const [material, setMaterial] = useState<PotMaterial>('plastic');
  const [placement, setPlacement] = useState<Placement>(presetDefaults?.placement ?? 'indoor');
  const [room, setRoom] = useState('');
  const [origin, setOrigin] = useState<Origin>('bought');
  const [parentId, setParentId] = useState<string | undefined>();
  const [category, setCategory] = useState<PlantCategory | 'all'>('all');
  // Quick add: name and light up front, the rest tucked behind sensible defaults.
  const [showMore, setShowMore] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  // "Other" plants: the user's own species name, optional Latin name, and what they know about pets.
  const [customName, setCustomName] = useState(typeof params.name === 'string' ? params.name : '');
  const [customLatin, setCustomLatin] = useState(typeof params.latin === 'string' ? params.latin : '');
  const [pets, setPets] = useState<'toxic' | 'safe' | 'unsure'>('unsure');

  const results = useMemo(() => {
    const pool = category === 'all' ? SPECIES_LIST : SPECIES_LIST.filter((s) => s.category === category);
    const found = searchSpecies(query, pool);
    if (query.trim()) return found;
    // Browsing: what you told us you grow comes first.
    const grows = (s: (typeof found)[number]) => (s.edible ? profile.grows.edibles : profile.grows.houseplants);
    return [...found.filter(grows), ...found.filter((s) => !grows(s))];
  }, [query, category, profile.grows]);

  const startOther = () => {
    haptics.tap();
    const id = OTHER[guessGroup(query)].id;
    const d = defaultsFor(id);
    setSpeciesId(id);
    setCustomName(query.trim().replace(/^\w/, (ch) => ch.toUpperCase()));
    setSoil(d.soil);
    setLight(d.light);
    setPlacement(d.placement);
    setNameIdx(0);
    setName(freeName(id, plants.map((p) => p.name)));
  };

  const setCareType = (group: SpeciesGroup) => {
    haptics.tap();
    const d = defaultsFor(OTHER[group].id);
    setSpeciesId(OTHER[group].id);
    setSoil(d.soil);
    setLight(d.light);
    setPlacement(d.placement);
  };

  const pick = (id: SpeciesId) => {
    haptics.tap();
    const d = defaultsFor(id);
    setSpeciesId(id);
    setSoil(d.soil);
    setLight(d.light);
    setPlacement(d.placement);
    setNameIdx(0);
    setName(freeName(id, plants.map((p) => p.name)));
  };

  const inputStyle = [styles.search, { borderColor: c.line, color: c.ink, backgroundColor: c.card }];

  const close = (
    <GlassButton accessibilityLabel="Close" onPress={() => router.back()}>
      <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6 6 18" stroke={c.ink} strokeWidth={2.8} strokeLinecap="round" /></Svg>
    </GlassButton>
  );

  // Plus members get photo ID first; for everyone else it waits below search, so the free path leads.
  const identifyTile = (
<Pressable
      accessibilityRole="button"
      accessibilityLabel="Identify from a photo"
      accessibilityHint={isPlus ? undefined : 'Part of PlantFam Plus'}
      onPress={() => {
        haptics.tap();
        // Replace so confirming a match lands back on a single add screen.
        router.replace('/identify');
      }}
      style={({ pressed }) => [styles.idTile, { backgroundColor: c.butter, borderColor: c.line, boxShadow: `0px ${pressed ? 1 : 4}px 0px ${c.drop}` }, pressed && { transform: [{ translateY: 3 }] }]}
    >
      <View style={[styles.idIcon, { backgroundColor: c.sun, borderColor: c.line }]}>
        <Svg width={26} height={26} viewBox="0 0 24 24">
          <Path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.6l1.3-2h5.2l1.3 2h1.6A2.5 2.5 0 0 1 20 8.5v8A2.5 2.5 0 0 1 17.5 19h-11A2.5 2.5 0 0 1 4 16.5z" stroke={c.onBright} strokeWidth={2} strokeLinejoin="round" fill="none" />
          <Path d="M12 9.2a3.3 3.3 0 1 0 0 6.6 3.3 3.3 0 0 0 0-6.6z" stroke={c.onBright} strokeWidth={2} fill="none" />
        </Svg>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.idTitle, { color: c.ink }]}>Identify from a photo</Text>
          {!isPlus && (
            <View style={[styles.plusBadge, { backgroundColor: c.grape, borderColor: c.line }]}>
              <Text style={[styles.plusBadgeText, { color: textOn(c.grape, c) }]}>Plus</Text>
            </View>
          )}
        </View>
        <Text style={[styles.idSub, { color: c.inkMuted }]}>Not sure who they are? Snap a leaf and we'll suggest a match.</Text>
      </View>
    </Pressable>
  );

  if (!speciesId) {
    return (
      <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Title style={{ flex: 1 }}>Who's joining the jungle?</Title>
          {close}
        </View>
        {isPlus && identifyTile}
        <TextInput
          value={query}
          onChangeText={(t) => {
            setQuery(t);
            setLimit(PAGE);
          }}
          placeholder={`Search ${SPECIES_LIST.length} plants, veg and herbs`}
          placeholderTextColor={c.inkMuted}
          style={inputStyle}
          accessibilityLabel="Search plants"
          autoCorrect={false}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -20, flexGrow: 0 }} contentInset={{ left: 20, right: 20 }}>
          <View style={{ width: 12 }} />
          {CATEGORIES.map((cat) => (
            <Pill
              key={cat.id}
              on={category === cat.id}
              label={cat.label}
              onPress={() => {
                setCategory(cat.id);
                setLimit(PAGE);
              }}
            />
          ))}
          <View style={{ width: 12 }} />
        </ScrollView>
        {results.length === 0 && (
          <Text style={[styles.note, { color: c.inkMuted }]}>No match for “{query.trim()}” in our list yet. You can still add it below.</Text>
        )}
        <View style={styles.grid}>
          {results.slice(0, limit).map((s) => (
            <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={s.commonName} onPress={() => pick(s.id)} style={[styles.speciesTile, { backgroundColor: c.potTint[s.artPot], borderColor: c.line }]}>
              <PlantBuddy speciesId={s.id} size={84} />
              <Text style={[styles.speciesName, { color: c.ink }]} numberOfLines={1}>{s.commonName}</Text>
            </Pressable>
          ))}
        </View>
        {results.length > limit && (
          <Button title={`Show ${Math.min(PAGE, results.length - limit)} more`} bg={c.card} onPress={() => setLimit(limit + PAGE)} />
        )}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add a plant that isn't listed"
          onPress={startOther}
          style={({ pressed }) => [styles.idTile, { backgroundColor: c.mint, borderColor: c.line, boxShadow: `0px ${pressed ? 1 : 4}px 0px ${c.drop}` }, pressed && { transform: [{ translateY: 3 }] }]}
        >
          <PlantBuddy speciesId="other-tropical" size={56} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.idTitle, { color: c.ink }]}>{query.trim() ? `Add “${query.trim()}” anyway` : "Can't find it? Add it anyway"}</Text>
            <Text style={[styles.idSub, { color: c.inkMuted }]}>Pick a care type and it gets the same smart checks, diary and family tree.</Text>
          </View>
        </Pressable>
        {!isPlus && identifyTile}
      </ScrollView>
    );
  }

  const isOther = isOtherId(speciesId);
  const base = getSpecies(speciesId);
  const petToxic = pets === 'toxic' ? true : pets === 'safe' ? false : undefined;
  const sp = isOther ? { ...base, commonName: customName.trim() || 'New plant', latinName: customLatin.trim(), petToxic: petToxic ?? false } : base;
  const taken = new Set(plants.map((p) => p.name.toLowerCase()));
  const pool = NAMES[speciesId] ?? fallbackNames;
  const fresh = pool.filter((n) => !taken.has(n.toLowerCase()));
  // Never offer a name that's already in the fam; number it if the list runs out.
  const suggestions = fresh.length ? fresh : pool.map((n, i) => `${n} ${i + 2}`);
  const parents = plants.filter((p) => !p.archivedAt && (isOther ? !!p.custom && p.custom.commonName.toLowerCase() === customName.trim().toLowerCase() : p.speciesId === speciesId));
  const soilInfo = SOILS.find((s) => s.id === soil);

  const save = () => {
    const plant = addPlant({
      name: name.trim() || suggestions[0],
      speciesId,
      custom: isOther ? { commonName: customName.trim() || 'New plant', latinName: customLatin.trim() || undefined, petToxic } : undefined,
      potColor: sp.artPot,
      soil,
      potMaterial: material,
      potDiameterCm: size,
      light,
      placement,
      room: room.trim() || undefined,
      origin,
      parentId: origin === 'cutting' ? parentId : undefined,
      acquiredAt: new Date().toISOString(),
    });
    haptics.success();
    router.replace(`/plant/${plant.id}`);
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <GlassButton accessibilityLabel="Back to plant list" onPress={() => setSpeciesId(null)}>
          <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="m15 18-6-6 6-6" stroke={c.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
        </GlassButton>
        {close}
      </View>

      <View style={[styles.hero, { backgroundColor: c.potTint[sp.artPot], borderColor: c.line, boxShadow: `0px 4px 0px ${c.drop}` }]}>
        <PlantBuddy speciesId={speciesId} size={96} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.heroKicker, { color: c.inkMuted }]}>{sp.latinName}</Text>
          <Text style={[styles.heroName, { color: c.ink }]}>{sp.commonName}</Text>
          <Text style={[styles.heroKicker, { color: c.inkMuted }]}>
            {isOther ? (petToxic === undefined ? 'Pet safety: not sure yet' : petToxic ? 'Toxic to cats and dogs' : 'Pet-friendly') : sp.petToxic ? 'Toxic to cats and dogs' : 'Pet-friendly'}
          </Text>
        </View>
      </View>
      {!isOther && sp.tip && <Text style={[styles.note, { color: c.inkMuted }]}>{localizeTemps(sp.tip, units)}</Text>}

      {isOther && (
        <View style={{ gap: 10 }}>
          <Label>What kind of plant is it?</Label>
          <TextInput value={customName} onChangeText={setCustomName} placeholder="e.g. Hindu rope plant" placeholderTextColor={c.inkMuted} style={inputStyle} accessibilityLabel="Kind of plant" />
          <TextInput value={customLatin} onChangeText={setCustomLatin} placeholder="Latin name (optional)" placeholderTextColor={c.inkMuted} style={inputStyle} accessibilityLabel="Latin name" autoCapitalize="words" autoCorrect={false} />
          <Label>How does it like its water?</Label>
          <View style={{ gap: 8 }}>
            {CARE_TYPES.map((t) => {
              const on = speciesId === OTHER[t.group].id;
              return (
                <Pressable
                  key={t.group}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  onPress={() => setCareType(t.group)}
                  style={[styles.careType, { borderColor: c.line, backgroundColor: on ? c.mint : c.card }, on && { boxShadow: `0px 3px 0px ${c.drop}` }]}
                >
                  <PlantBuddy speciesId={OTHER[t.group].id} size={44} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.careTitle, { color: c.ink }]}>{t.title}</Text>
                    <Text style={[styles.careSub, { color: c.inkMuted }]}>{t.sub}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Text style={[styles.note, { color: c.inkMuted }]}>Not sure? Leafy tropical is a safe start. Your soil checks fine-tune the rhythm either way.</Text>
          <Label>Is it safe around pets?</Label>
          <View style={styles.wrap}>
            {PETS.map((p) => (
              <Pill key={p.id} on={pets === p.id} bg={p.id === 'toxic' ? c.peach : c.mint} label={p.label} onPress={() => setPets(p.id)} />
            ))}
          </View>
        </View>
      )}

      <Label>Give them a name</Label>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput value={name} onChangeText={setName} style={[inputStyle, { flex: 1, fontFamily: fonts.displaySemi, fontSize: 19 }]} accessibilityLabel="Plant name" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Suggest another name"
          onPress={() => {
            haptics.tap();
            const n = (nameIdx + 1) % suggestions.length;
            setNameIdx(n);
            setName(suggestions[n]);
          }}
          style={[styles.dice, { borderColor: c.line, backgroundColor: c.lavender }]}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path d="M7.5 3.5h9a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4z" stroke={c.ink} strokeWidth={2} fill="none" />
            <Path d="M8.5 8.5h.01M15.5 15.5h.01M15.5 8.5h.01M8.5 15.5h.01M12 12h.01" stroke={c.ink} strokeWidth={3} strokeLinecap="round" />
          </Svg>
        </Pressable>
      </View>

      <Label>How sunny is its spot?</Label>
      <View style={styles.wrap}>
        {LIGHTS.map((l) => (
          <Pill key={l.id} on={light === l.id} bg={c.sun} label={`${'☀'.repeat(l.suns)} ${l.label}`} onPress={() => setLight(l.id)} />
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showMore }}
        accessibilityLabel={showMore ? 'Hide pot and soil details' : 'Change pot, soil and spot'}
        onPress={() => {
          haptics.tap();
          setShowMore(!showMore);
        }}
        style={[styles.moreCard, { borderColor: c.line, backgroundColor: c.cloud }]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.careTitle, { color: c.ink }]}>{showMore ? 'Pot, soil and spot' : 'Pot, soil and spot (optional)'}</Text>
          {!showMore && (
            <Text style={[styles.careSub, { color: c.inkMuted }]} numberOfLines={2}>
              {SOIL_LABEL[soil].replace(' (not ideal in pots)', '')} · {POT_SIZES.find((x) => x.cm === size)?.label ?? 'Medium'} {MATERIALS.find((m) => m.id === material)?.label.toLowerCase()} pot · {PLACES.find((x) => x.id === placement)?.label} · {ORIGINS.find((o) => o.id === origin)?.label}
            </Text>
          )}
        </View>
        <Text style={[styles.moreLink, { color: c.leafDeep }]}>{showMore ? 'Done' : 'Change'}</Text>
      </Pressable>
      {!showMore && <Text style={[styles.note, { color: c.inkMuted }]}>Good defaults are set. Your soil checks fine-tune everything over time.</Text>}
      {showMore && (
        <View style={{ gap: 12 }}>
          <Label>What's it potted in?</Label>
          <View style={styles.wrap}>
            {SOILS.map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                accessibilityState={{ selected: soil === s.id }}
                onPress={() => {
                  haptics.tap();
                  setSoil(s.id);
                }}
                style={[styles.pill, styles.soilPill, { borderColor: c.line, backgroundColor: soil === s.id ? c.mint : c.card }, soil === s.id && { boxShadow: `0px 3px 0px ${c.drop}` }]}
              >
                <View style={[styles.swatch, { backgroundColor: s.swatch, borderColor: c.line }]} />
                <Text style={[styles.pillText, { color: c.ink }]}>{SOIL_LABEL[s.id].replace(' (not ideal in pots)', '')}</Text>
              </Pressable>
            ))}
          </View>
          {soilInfo && <Text style={[styles.note, { color: soil === 'garden_soil' ? c.warn : c.inkMuted }]}>{soilInfo.note}</Text>}

          <Label>Pot</Label>
          <View style={styles.wrap}>
            {POT_SIZES.map((p) => (
              <Pill key={p.label} on={size === p.cm} label={p.label} onPress={() => setSize(p.cm)} />
            ))}
          </View>
          <View style={styles.wrap}>
            {MATERIALS.map((m) => (
              <Pill key={m.id} on={material === m.id} bg={c.peach} label={m.label} onPress={() => setMaterial(m.id)} />
            ))}
          </View>

          <Label>Where does it live?</Label>
          <View style={styles.wrap}>
            {PLACES.map((p) => (
              <Pill key={p.id} on={placement === p.id} bg={c.ice} label={p.label} onPress={() => setPlacement(p.id)} />
            ))}
          </View>
          <TextInput value={room} onChangeText={setRoom} placeholder="Room (optional), e.g. Living room" placeholderTextColor={c.inkMuted} style={inputStyle} accessibilityLabel="Room" />

          <Label>Where's it from?</Label>
          <View style={styles.wrap}>
            {ORIGINS.map((o) => (
              <Pill key={o.id} on={origin === o.id} bg={c.grape} label={o.label} onPress={() => setOrigin(o.id)} />
            ))}
          </View>
          {origin === 'cutting' && parents.length > 0 && (
            <View style={{ gap: 6 }}>
              <Label muted>Cutting from which plant? It joins that plant's Offshoots.</Label>
              <View style={styles.wrap}>
                {parents.map((p) => (
                  <Pill key={p.id} on={parentId === p.id} bg={c.lavender} label={p.name} onPress={() => setParentId(p.id)} />
                ))}
              </View>
            </View>
          )}

        </View>
      )}

      <Button title={`Welcome home, ${name.trim() || suggestions[0]}!`} raised onPress={save} style={{ minHeight: 58, marginTop: 8 }} textStyle={{ fontSize: 19, fontFamily: fonts.display }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  search: { minHeight: 50, borderRadius: 16, borderWidth: 2, paddingHorizontal: 14, fontFamily: fonts.bodyHeavy, fontSize: 15 },
  idTile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, borderWidth: 2, marginBottom: 4 },
  idIcon: { width: 52, height: 52, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  idTitle: { fontFamily: fonts.display, fontSize: 18, flexShrink: 1 },
  idSub: { fontFamily: fonts.bodyHeavy, fontSize: 13, lineHeight: 17 },
  plusBadge: { borderWidth: 2, borderRadius: 10, paddingHorizontal: 7, height: 22, justifyContent: 'center' },
  plusBadgeText: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moreCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: 18, padding: 12 },
  moreLink: { fontFamily: fonts.displaySemi, fontSize: 15 },
  careType: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: 18, padding: 8 },
  careTitle: { fontFamily: fonts.displaySemi, fontSize: 16 },
  careSub: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  speciesTile: { width: '31%', flexGrow: 1, borderRadius: 18, borderWidth: 2, alignItems: 'center', paddingVertical: 8, gap: 2 },
  speciesName: { fontFamily: fonts.bodyHeavy, fontSize: 12, paddingHorizontal: 4 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 22, borderWidth: 2 },
  heroKicker: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  heroName: { fontFamily: fonts.display, fontSize: 22 },
  dice: { width: 50, height: 50, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { minHeight: 42, paddingHorizontal: 14, borderRadius: 21, borderWidth: 2, justifyContent: 'center' },
  soilPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6 },
  swatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
  pillText: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  note: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
});
