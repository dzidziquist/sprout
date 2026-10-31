import { useUnits } from '@/hooks/useUnits';
import { localizeTemps } from '@/lib/units';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { useShallow } from 'zustand/react/shallow';
import { OTHER, SPECIES_LIST, getSpecies, isOtherId, isSpeciesId, searchSpecies } from '@/data/species';
import { SOIL_LABEL } from '@/data/labels';
import { isReservoir } from '@/engine/careEngine';
import { Dropdown, DropdownGroup } from '@/components/Dropdown';
import { defaultSpot, type Spot } from '@/lib/spots';
import { daysAgo, JOINED, WATERED, type JoinedId, type WateredId } from '@/lib/when';
import { edibleGuide, type EdibleGuide } from '@/data/edibles';
import { PlantBuddy } from '@/components/PlantBuddy';
import { AboutCard } from '@/components/AboutCard';
import { GlassButton } from '@/components/GlassButton';
import { Button, Label, Title } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { fonts, type, space } from '@/theme/tokens';
import { textOn, useColors, selectedFill } from '@/theme/theme';
import { LineIcon } from '@/components/LineIcon';
import { SunIcon } from '@/components/SunIcon';
import type { EdibleStage, Light, Origin, PlantCategory, Placement, PotMaterial, Soil, SpeciesGroup, SpeciesId } from '@/types';
import { useSheetTop } from '@/lib/sheetTop';
import { Glyph } from '@/components/Glyph';
import { useDiscardGuard } from '@/hooks/useDiscardGuard';


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
  { id: 'direct', label: 'Direct sun', suns: 4 },
];
const SOILS: { id: Soil; swatch: string; note: string }[] = [
  { id: 'potting_mix', swatch: '#8B5E3C', note: 'Holds water longest. Checks spaced out; repot every 1–2 years.' },
  { id: 'chunky_aroid', swatch: '#C9A27E', note: 'Bark + perlite drains fast. Checks come a bit sooner.' },
  { id: 'gritty', swatch: '#D9CBB0', note: 'For succulents and cacti. Dries quickest; we let it go bone dry.' },
  { id: 'veg_mix', swatch: '#6B4A2E', note: 'Container mix for edibles, pH around 6–7.' },
  { id: 'leca', swatch: '#E07A4F', note: 'Semi-hydro: clay balls over a reservoir. You check the water line, not the soil.' },
  { id: 'water', swatch: '#7FC8E8', note: 'Hydroponic: roots in water (a jar, Kratky, or a countertop hydro garden). Water line checks plus a fresh change every 2 weeks.' },
  { id: 'moss', swatch: '#7CB86A', note: 'Sphagnum stays damp: great for rooting, easy to overwater.' },
  { id: 'garden_soil', swatch: '#5A4632', note: "Garden soil packs down and stays soggy in pots. Repot when you can." },
  { id: 'unsure', swatch: '#FFFFFF', note: 'No problem. We start cautious and learn from your checks.' },
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
// Ordered so the pills sit in two rows on a phone (with Grow light after Indoors): the short ones first.
const PLACES: { id: Placement; label: string }[] = [
  { id: 'indoor', label: 'Indoors' },
  { id: 'ground', label: 'Garden bed' },
  { id: 'covered_outdoor', label: 'Balcony, covered' },
  { id: 'outdoor', label: 'Outside, in a pot' },
];
/** Everything without a growing guide, including plants that aren't in the library. */
const ORIGINS: { id: Origin; label: string }[] = [
  { id: 'bought', label: 'Bought as a plant' },
  { id: 'seed', label: 'From seed' },
  { id: 'cutting', label: 'My cutting' },
  { id: 'gift', label: 'Gift' },
  { id: 'swap', label: 'Swap' },
];

/** Edibles: how it started, which also sets the stage it starts at. */
const EDIBLE_ORIGINS: { id: Origin; label: string; regrowOnly?: boolean }[] = [
  { id: 'seed', label: 'From seed' },
  { id: 'bought', label: 'Bought as a plant' },
  { id: 'scraps', label: 'Regrown from scraps', regrowOnly: true },
  { id: 'cutting', label: 'My cutting' },
  { id: 'gift', label: 'Gift or swap' },
];

/** The stage a new edible most likely starts at, given how it started. */
function startStage(guide: EdibleGuide, origin: Origin): EdibleStage {
  const has = (s: EdibleStage) => guide.stages.includes(s);
  if (origin === 'seed') return has('seed') ? 'seed' : guide.stages[0];
  if (origin === 'scraps' || origin === 'cutting') return has('growing') ? 'growing' : guide.stages[0];
  return has('seedling') ? 'seedling' : (guide.stages.find((s) => s !== 'seed') ?? guide.stages[0]);
}

function Pill({ on, label, onPress, bg, children }: { on: boolean; label: string; onPress: () => void; bg?: string; children?: React.ReactNode }) {
  const c = useColors();
  const fill = selectedFill(bg ?? c.mint, c);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={[styles.pill, { borderColor: c.line, backgroundColor: on ? fill : c.card }, on && { boxShadow: `0px 3px 0px ${c.drop}` }, !!children && styles.pillWithIcon]}
    >
      {children}
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

/** Species defaults, moved to where this person actually grows (onboarding's "Where do your plants live?"). */
function defaultsFor(id: SpeciesId, spots?: Spot[]) {
  const sp = getSpecies(id);
  const spot = defaultSpot(spots, sp.edible);
  const placement: Placement = spot?.placement ?? (sp.edible ? 'covered_outdoor' : 'indoor');
  const soil = placement === 'ground' && !isReservoir(sp.defaultSoil) ? 'garden_soil' : sp.defaultSoil;
  return { soil, light: spot?.light ?? sp.defaultLight, placement, name: (NAMES[id] ?? fallbackNames)[0] };
}

const SELF_WATER: { id: 'no' | 'always' | 'away'; label: string }[] = [
  { id: 'no', label: 'No' },
  { id: 'always', label: 'Yes, I keep it filled' },
  { id: 'away', label: 'Only fill it when I’m away' },
];

export default function AddPlantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sheetTop = useSheetTop();
  const c = useColors();
  // /add?species=pothos (from photo ID) skips the picker; /add?other=1&name=…&latin=… starts an "other" plant.
  const params = useLocalSearchParams<{ species?: string; other?: string; name?: string; latin?: string; wish?: string; pick?: string }>();
  // Arriving from photo ID (/add?species=pothos) skips the picker.
  const otherPreset = params.other ? OTHER.tropical.id : null;
  const preset = isSpeciesId(params.species) ? params.species : otherPreset;
  const { plants, addPlant, profile, removeWish } = usePlantStore(useShallow((s) => ({ plants: s.plants, addPlant: s.addPlant, profile: s.profile, removeWish: s.removeWish })));
  const presetDefaults = preset ? defaultsFor(preset, profile.spots) : null;
  const units = useUnits();
  const [speciesId, setSpeciesId] = useState<SpeciesId | null>(preset);
  const [query, setQuery] = useState('');
  const [nameIdx, setNameIdx] = useState(0);
  const [name, setName] = useState(presetDefaults?.name ?? '');
  const [light, setLight] = useState<Light>(presetDefaults?.light ?? 'bright');
  const [soil, setSoil] = useState<Soil>(presetDefaults?.soil ?? 'potting_mix');
  const [size, setSize] = useState(15);
  const [selfWatering, setSelfWatering] = useState<'always' | 'away' | undefined>(undefined);
  const [material, setMaterial] = useState<PotMaterial>('plastic');
  const [placement, setPlacement] = useState<Placement>(presetDefaults?.placement ?? 'indoor');
  const indoors = placement === 'indoor' || placement === 'growlight';
  const [joined, setJoined] = useState<JoinedId>('today');
  const [watered, setWatered] = useState<WateredId>('unsure');
  const [room, setRoom] = useState('');
  const [originPick, setOrigin] = useState<Origin>('bought');
  // Edibles: null means "the usual stage for how it started".
  const [stage, setStage] = useState<EdibleStage | null>(null);
  const [parentId, setParentId] = useState<string | undefined>();
  const [category, setCategory] = useState<PlantCategory | 'all'>('all');
  // Quick add: name and light up front, the rest tucked behind sensible defaults.
  const [showMore, setShowMore] = useState(false);
  const [limit, setLimit] = useState(PAGE);
  // "Other" plants: the user's own species name, optional Latin name, and what they know about pets.
  const [customName, setCustomName] = useState(typeof params.name === 'string' ? params.name : '');
  const [customLatin, setCustomLatin] = useState(typeof params.latin === 'string' ? params.latin : '');
  const [pets, setPets] = useState<'toxic' | 'safe' | 'unsure'>('unsure');
  // The wishlist entry this screen was opened for, until the person goes back and picks another plant.
  const [fromWish, setFromWish] = useState<string | undefined>(typeof params.wish === 'string' ? params.wish : undefined);
  // Hydro growers: new plants follow the medium of the last plant added in LECA or water.
  // Picked a plant (or changed the one from photo ID): closing asks before throwing that away.
  const leave = useDiscardGuard(speciesId !== null && (speciesId !== preset || name !== (presetDefaults?.name ?? '') || room.trim() !== ''));
  const lastHydro = profile.grows.hydro ? [...plants].reverse().find((p) => !p.archivedAt && isReservoir(p.soil))?.soil : undefined;
  const mediumFor = (speciesSoil: Soil) => lastHydro ?? speciesSoil;
  const soilBase = speciesId && !isReservoir(getSpecies(speciesId).defaultSoil) ? getSpecies(speciesId).defaultSoil : 'potting_mix';

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
    const d = defaultsFor(id, profile.spots);
    setSpeciesId(id);
    setCustomName(query.trim().replace(/^\w/, (ch) => ch.toUpperCase()));
    setSoil(mediumFor(d.soil));
    setLight(d.light);
    setPlacement(d.placement);
    setNameIdx(0);
    setName(freeName(id, plants.map((p) => p.name)));
  };

  const setCareType = (group: SpeciesGroup) => {
    haptics.tap();
    const d = defaultsFor(OTHER[group].id, profile.spots);
    setSpeciesId(OTHER[group].id);
    setSoil(mediumFor(d.soil));
    setLight(d.light);
    setPlacement(d.placement);
  };

  const pick = (id: SpeciesId) => {
    haptics.tap();
    const d = defaultsFor(id, profile.spots);
    setSpeciesId(id);
    setSoil(mediumFor(d.soil));
    setLight(d.light);
    setPlacement(d.placement);
    setNameIdx(0);
    setName(freeName(id, plants.map((p) => p.name)));
  };

  // Back from a species page's "Add to my jungle" (?species=…&pick=<new each time>): pick that plant, even if
  // it's the same one as last time.
  useEffect(() => {
    if (params.pick && isSpeciesId(params.species)) {
      pick(params.species);
      setFromWish(typeof params.wish === 'string' ? params.wish : undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.pick]);

  const inputStyle = [styles.search, { borderColor: c.line, color: c.ink, backgroundColor: c.card }];

  const close = (
    <GlassButton accessibilityLabel="Close" onPress={() => router.back()}>
      <Glyph name="close" size={16} color={c.ink} width={2.8} />
    </GlassButton>
  );

  const identifyTile = (
<Pressable
      accessibilityRole="button"
      accessibilityLabel="Identify from a photo"
      onPress={() => {
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
          <View style={[styles.plusBadge, { backgroundColor: c.leaf, borderColor: c.line }]}>
            <Text style={[styles.plusBadgeText, { color: textOn(c.leaf, c) }]}>Free</Text>
          </View>
        </View>
        <Text style={[styles.idSub, { color: c.inkMuted }]}>Not sure who they are? Snap a leaf and we'll suggest a match.</Text>
      </View>
    </Pressable>
  );

  if (!speciesId) {
    return (
      <ScrollView automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: sheetTop + 12, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Title style={{ flex: 1 }}>Who's joining the jungle?</Title>
          {close}
        </View>
        {identifyTile}
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
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {/* Edge-to-edge strip: the padding lines the first chip up with the page, and the bottom padding
            leaves room for the selected chip's drop shadow, which a horizontal ScrollView would clip. */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 20, paddingBottom: 5 }} style={{ marginHorizontal: -20, flexGrow: 0 }}>
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
        </ScrollView>
        {results.length === 0 && (
          <Text style={[styles.note, { color: c.inkMuted }]}>No match for “{query.trim()}” in our list yet. You can still add it below.</Text>
        )}
        <View style={styles.grid}>
          {results.slice(0, limit).map((s) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={s.commonName}
              // The tile is one VoiceOver element, so its About button is offered as an action on it.
              accessibilityActions={[{ name: 'about', label: `About ${s.commonName}` }]}
              onAccessibilityAction={(e) => e.nativeEvent.actionName === 'about' && router.push(`/species/${s.id}?from=add`)}
              onPress={() => pick(s.id)}
              style={[styles.speciesTile, { backgroundColor: c.potTint[s.artPot], borderColor: c.line }]}
            >
              <PlantBuddy speciesId={s.id} size={84} />
              <Text style={[styles.speciesName, { color: c.ink }]} numberOfLines={1}>{s.commonName}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`About ${s.commonName}`}
                hitSlop={8}
                onPress={() => {
                  router.push(`/species/${s.id}?from=add`);
                }}
                style={[styles.info, { borderColor: c.line, backgroundColor: c.card }]}
              >
                <Svg width={14} height={14} viewBox="0 0 24 24">
                  <Path d="M12 11v6M12 7h.01" stroke={c.ink} strokeWidth={3} strokeLinecap="round" />
                </Svg>
              </Pressable>
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

  const lastWateredDays = WATERED.find((w) => w.id === watered)?.days ?? null;
  const guide = sp.edible && !isOther ? edibleGuide(speciesId) : undefined;
  // What was picked may not fit a plant chosen afterwards (scraps for a monstera, swap for an edible).
  const originOptions = guide ? EDIBLE_ORIGINS.filter((o) => !o.regrowOnly || guide.regrows) : ORIGINS;
  const origin: Origin = originOptions.some((o) => o.id === originPick) ? originPick : originPick === 'swap' ? 'gift' : 'bought';
  const nowStage = guide ? (stage && guide.stages.includes(stage) ? stage : startStage(guide, origin)) : undefined;
  const joinedLabel = origin === 'seed' ? 'Sown' : origin === 'scraps' ? 'Started' : 'Joined the fam';
  const save = () => {
    const plant = addPlant({
      name: name.trim() || suggestions[0],
      speciesId,
      custom: isOther ? { commonName: customName.trim() || 'New plant', latinName: customLatin.trim() || undefined, petToxic } : undefined,
      potColor: sp.artPot,
      soil,
      potMaterial: material,
      potDiameterCm: size,
      selfWatering: placement !== 'ground' && !isReservoir(soil) ? selfWatering : undefined,
      light,
      placement,
      room: room.trim() || undefined,
      origin,
      parentId: origin === 'cutting' && parents.some((p) => p.id === parentId) ? parentId : undefined,
      acquiredAt: daysAgo(JOINED.find((j) => j.id === joined)?.days ?? 0).toISOString(),
      ...(nowStage ? { stage: nowStage, stageAt: new Date().toISOString() } : {}),
    }, new Date(), { lastWateredAt: lastWateredDays === null ? undefined : daysAgo(lastWateredDays) });
    // Bought one from the wishlist: it's in the jungle now. Only if it's that plant being added, not one picked instead.
    // (Editing an unlisted plant's names doesn't change which plant it is.)
    if (fromWish) removeWish(fromWish);
    haptics.success();
    leave(() => router.replace(`/plant/${plant.id}`));
  };

  return (
    <ScrollView automaticallyAdjustKeyboardInsets keyboardDismissMode="interactive" style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: sheetTop + 12, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <GlassButton
          accessibilityLabel="Back to plant list"
          onPress={() => {
            setSpeciesId(null);
            // Picking something else now: the wishlist plant this screen opened with isn't the one being added.
            setFromWish(undefined);
          }}
        >
          <Glyph name="back" size={18} color={c.ink} width={2.6} />
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
      {/* Unlisted plants: only while the names are still the ones photo ID gave, so editing them never shows
          another plant's intro, and typing doesn't send a lookup per keystroke. */}
      {(!isOther || (typeof params.latin === 'string' && customLatin === params.latin)) && <AboutCard speciesId={speciesId} latin={isOther ? customLatin : sp.latinName} common={isOther ? String(params.name ?? '') : sp.commonName} />}

      {isOther && (
        <View style={{ gap: 10 }}>
          <Label>What kind of plant is it?</Label>
          <TextInput value={customName} onChangeText={setCustomName} placeholder="e.g. Hindu rope plant" placeholderTextColor={c.inkMuted} style={inputStyle} accessibilityLabel="Kind of plant" autoCapitalize="words" returnKeyType="next" />
          <Label>Latin name (optional)</Label>
          <TextInput value={customLatin} onChangeText={setCustomLatin} placeholder="e.g. Ceropegia woodii" placeholderTextColor={c.inkMuted} style={inputStyle} accessibilityLabel="Latin name" autoCapitalize="words" autoCorrect={false} returnKeyType="done" />
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
          <Text style={[styles.note, { color: c.inkMuted }]}>Not sure? Leafy tropical is a safe start. Your checks fine-tune the rhythm either way.</Text>
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
        <TextInput value={name} onChangeText={setName} style={[inputStyle, { flex: 1, fontFamily: fonts.displaySemi, fontSize: type.title3.fontSize }]} accessibilityLabel="Plant name" autoCapitalize="words" returnKeyType="done" />
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
          <Pill key={l.id} on={light === l.id} bg={c.sun} label={l.label} onPress={() => setLight(l.id)}>
            <View style={{ flexDirection: 'row' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              {Array.from({ length: l.suns }, (_, i) => <SunIcon key={i} color={light === l.id ? textOn(selectedFill(c.sun, c), c) : c.ink} size={14} width={2.4} />)}
            </View>
          </Pill>
        ))}
      </View>

      <Label>Where does it live?</Label>
      <View style={styles.wrap}>
        {PLACES.map((p) => (
          <Fragment key={p.id}>
            <Pill
              on={p.id === 'indoor' ? indoors : placement === p.id}
              bg={c.ice}
              label={p.label}
              onPress={() => {
                setPlacement(p.id === 'indoor' && indoors ? placement : p.id);
                // Beds are made of garden soil; moving out of one goes back to a potting mix.
                if (p.id === 'ground' && !isReservoir(soil)) setSoil('garden_soil');
                else if (p.id !== 'ground' && soil === 'garden_soil') setSoil(soilBase);
              }}
            />
            {/* Grow lights are an indoor spot: offered next to Indoors once it's picked. */}
            {p.id === 'indoor' && indoors && (
              <Pill on={placement === 'growlight'} bg={c.butter} label="Grow light" onPress={() => setPlacement(placement === 'growlight' ? 'indoor' : 'growlight')}>
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                  <LineIcon name="bulb" color={placement === 'growlight' ? textOn(selectedFill(c.butter, c), c) : c.ink} size={16} width={2.2} />
                </View>
              </Pill>
            )}
          </Fragment>
        ))}
      </View>
      <Text style={[styles.note, { color: c.inkMuted }]}>
        {placement === 'growlight'
          ? 'Its light comes from the lamp, so it isn’t in the Light view.'
          : 'Windowsills and shelves count as Indoors. How sunny the spot is tells them apart.'}
      </Text>

      <Label>A little history</Label>
      <DropdownGroup>
        <Dropdown
          label="How it started"
          value={origin}
          tint={c.mint}
          options={originOptions}
          onChange={(o) => {
            setOrigin(o);
            setStage(null);
          }}
        />
        {origin === 'cutting' && parents.length > 0 && (
          <Dropdown
            label="Cut from"
            value={parentId ?? null}
            tint={c.lavender}
            placeholder="Choose"
            options={parents.map((p) => ({ id: p.id, label: p.name }))}
            onChange={(id) => setParentId(id ?? undefined)}
          />
        )}
        {guide && (
          <Dropdown label="Stage now" value={nowStage ?? null} tint={c.butter} options={guide.stages.map((s) => ({ id: s, label: guide.info[s]?.label ?? s }))} onChange={(s) => s && setStage(s)} />
        )}
        <Dropdown label={joinedLabel} value={joined} tint={c.lavender} options={JOINED} onChange={setJoined} />
        <Dropdown label={isReservoir(soil) ? 'Last topped up' : 'Last watered'} value={watered} tint={c.ice} options={WATERED} onChange={setWatered} last />
      </DropdownGroup>
      <Text style={[styles.note, { color: c.inkMuted }]}>
        {lastWateredDays === null ? 'Not sure? No problem: we’ll ask you to check its soil today.' : 'Its first check is planned from that watering.'}
      </Text>

      {/* Edibles often grow in jars or countertop hydro gardens, so they always get the choice. */}
      {(profile.grows.hydro || (sp.edible && !isOther)) && placement !== 'ground' && (
        <>
          <Label>What does it grow in?</Label>
          <View style={styles.wrap}>
            <Pill on={!isReservoir(soil)} bg={c.peach} label="Soil" onPress={() => setSoil(soilBase)} />
            <Pill on={soil === 'leca'} bg={c.peach} label="LECA" onPress={() => setSoil('leca')} />
            <Pill on={soil === 'water'} bg={c.ice} label="Water · hydro" onPress={() => setSoil('water')} />
          </View>
          {soil === 'water' && <Text style={[styles.note, { color: c.inkMuted }]}>Roots in water: a jar, Kratky or a countertop garden. You’ll top up and feed weak nutrients instead of checking soil.</Text>}
        </>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showMore }}
        accessibilityLabel={showMore ? 'Hide pot and soil details' : 'Change pot, soil and more'}
        onPress={() => {
          haptics.tap();
          setShowMore(!showMore);
        }}
        style={[styles.moreCard, { borderColor: c.line, backgroundColor: c.cloud }]}
      >
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.careTitle, { color: c.ink }]}>{showMore ? 'Pot, soil and more' : 'Pot, soil and more (optional)'}</Text>
          {!showMore && (
            <Text style={[styles.careSub, { color: c.inkMuted }]} numberOfLines={2}>
              {SOIL_LABEL[soil].replace(' (not ideal in pots)', '')}
              {placement === 'ground' ? '' : ` · ${POT_SIZES.find((x) => x.cm === size)?.label ?? 'Medium'} ${MATERIALS.find((m) => m.id === material)?.label.toLowerCase()} pot`} · {originOptions.find((o) => o.id === origin)?.label}
            </Text>
          )}
        </View>
        <Text style={[styles.moreLink, { color: c.link }]}>{showMore ? 'Done' : 'Change'}</Text>
      </Pressable>
      {!showMore && <Text style={[styles.note, { color: c.inkMuted }]}>Good defaults are set. Your checks fine-tune everything over time.</Text>}
      {showMore && (
        <View style={{ gap: 12 }}>
          <Label>{placement === 'ground' ? "What's the soil like?" : "What's it potted in?"}</Label>
          <DropdownGroup>
            <Dropdown
              label={placement === 'ground' ? 'Soil' : 'Mix'}
              value={soil}
              tint={c.mint}
              options={(profile.grows.hydro ? [...SOILS.filter((s) => isReservoir(s.id)), ...SOILS.filter((s) => !isReservoir(s.id))] : SOILS).map((s) => ({ id: s.id, label: SOIL_LABEL[s.id].replace(' (not ideal in pots)', ''), swatch: s.swatch }))}
              onChange={setSoil}
              last
            />
          </DropdownGroup>
          {soilInfo && <Text style={[styles.note, { color: soil === 'garden_soil' ? c.warn : c.inkMuted }]}>{soilInfo.note}</Text>}

          {placement !== 'ground' && (
            <>
              <Label>Pot</Label>
              <DropdownGroup>
                <Dropdown label="Size" value={String(size)} tint={c.mint} options={POT_SIZES.map((o) => ({ id: String(o.cm), label: o.label }))} onChange={(v) => setSize(Number(v))} />
                <Dropdown label="Material" value={material} tint={c.peach} options={MATERIALS} onChange={setMaterial} last />
              </DropdownGroup>
              {!isReservoir(soil) && (
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
            </>
          )}

          <Label>Room (optional)</Label>
          <TextInput value={room} onChangeText={setRoom} placeholder="e.g. Living room" placeholderTextColor={c.inkMuted} style={inputStyle} accessibilityLabel="Room" autoCapitalize="words" returnKeyType="done" />

        </View>
      )}

      <Button title={`Add ${name.trim() || suggestions[0]}`} raised onPress={save} style={{ minHeight: 58, marginTop: 8 }} textStyle={{ ...type.title3, fontFamily: fonts.display }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.xl, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  search: { minHeight: 50, borderRadius: 16, borderWidth: 2, paddingHorizontal: 14, fontFamily: fonts.bodyHeavy, fontSize: type.body.fontSize },
  idTile: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: 20, borderWidth: 2, marginBottom: 4 },
  idIcon: { width: 52, height: 52, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  idTitle: { fontFamily: fonts.display, ...type.headline, flexShrink: 1 },
  idSub: { fontFamily: fonts.bodyHeavy, ...type.footnote },
  plusBadge: { borderWidth: 2, borderRadius: 10, paddingHorizontal: 7, minHeight: 22, paddingVertical: 1, justifyContent: 'center' },
  plusBadgeText: { fontFamily: fonts.bodyHeavy, ...type.caption2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  moreCard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: 18, padding: 12 },
  moreLink: { fontFamily: fonts.displaySemi, ...type.body },
  careType: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderRadius: 18, padding: 8 },
  careTitle: { fontFamily: fonts.displaySemi, ...type.body },
  careSub: { fontFamily: fonts.bodyHeavy, ...type.caption },
  speciesTile: { width: '31%', flexGrow: 1, borderRadius: 18, borderWidth: 2, alignItems: 'center', paddingVertical: 8, gap: 2 },
  info: { position: 'absolute', top: 6, right: 6, width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  speciesName: { fontFamily: fonts.bodyHeavy, ...type.caption, paddingHorizontal: 4 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 22, borderWidth: 2 },
  heroKicker: { fontFamily: fonts.bodyHeavy, ...type.caption },
  heroName: { fontFamily: fonts.display, ...type.title2 },
  dice: { width: 50, height: 50, borderRadius: 16, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { minHeight: 44, paddingHorizontal: 14, borderRadius: 22, borderWidth: 2, justifyContent: 'center' },
  pillWithIcon: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  swatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 2 },
  pillText: { fontFamily: fonts.bodyHeavy, ...type.callout },
  note: { fontFamily: fonts.bodyHeavy, ...type.footnote },
});
