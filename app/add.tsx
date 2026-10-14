import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { SPECIES, SPECIES_LIST } from '@/data/species';
import { SOIL_LABEL } from '@/data/labels';
import { PlantBuddy } from '@/components/PlantBuddy';
import { GlassButton } from '@/components/GlassButton';
import { Button, Label, Title } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { colors, fonts, potTint } from '@/theme/tokens';
import type { Light, Origin, Placement, PotMaterial, Soil, SpeciesId } from '@/types';

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

function Pill({ on, label, onPress, bg = colors.mint }: { on: boolean; label: string; onPress: () => void; bg?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={() => {
        haptics.tap();
        onPress();
      }}
      style={[styles.pill, { backgroundColor: on ? bg : colors.white }, on && { boxShadow: `0px 3px 0px ${colors.ink}` }]}
    >
      <Text style={styles.pillText}>{label}</Text>
    </Pressable>
  );
}

export default function AddPlantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { plants, addPlant } = usePlantStore();
  const [speciesId, setSpeciesId] = useState<SpeciesId | null>(null);
  const [query, setQuery] = useState('');
  const [nameIdx, setNameIdx] = useState(0);
  const [name, setName] = useState('');
  const [light, setLight] = useState<Light>('bright');
  const [soil, setSoil] = useState<Soil>('potting_mix');
  const [size, setSize] = useState(15);
  const [material, setMaterial] = useState<PotMaterial>('plastic');
  const [placement, setPlacement] = useState<Placement>('indoor');
  const [room, setRoom] = useState('');
  const [origin, setOrigin] = useState<Origin>('bought');
  const [parentId, setParentId] = useState<string | undefined>();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SPECIES_LIST.filter((s) => !q || s.commonName.toLowerCase().includes(q) || s.latinName.toLowerCase().includes(q));
  }, [query]);

  const pick = (id: SpeciesId) => {
    haptics.tap();
    const sp = SPECIES[id];
    setSpeciesId(id);
    setSoil(sp.defaultSoil);
    setLight(sp.defaultLight);
    setPlacement(sp.edible ? 'covered_outdoor' : 'indoor');
    const suggestions = NAMES[id] ?? fallbackNames;
    setNameIdx(0);
    setName(suggestions[0]);
  };

  const close = (
    <GlassButton accessibilityLabel="Close" onPress={() => router.back()}>
      <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6 6 18" stroke={colors.ink} strokeWidth={2.8} strokeLinecap="round" /></Svg>
    </GlassButton>
  );

  if (!speciesId) {
    return (
      <ScrollView style={{ backgroundColor: colors.white }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Title style={{ flex: 1 }}>Who's joining the jungle?</Title>
          {close}
        </View>
        <TextInput value={query} onChangeText={setQuery} placeholder="Search plants" placeholderTextColor="#8A8A99" style={styles.search} accessibilityLabel="Search plants" />
        <View style={styles.grid}>
          {results.map((s) => (
            <Pressable key={s.id} accessibilityRole="button" accessibilityLabel={s.commonName} onPress={() => pick(s.id)} style={[styles.speciesTile, { backgroundColor: potTint[s.artPot] }]}>
              <PlantBuddy speciesId={s.id} size={84} />
              <Text style={styles.speciesName} numberOfLines={1}>{s.commonName}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    );
  }

  const sp = SPECIES[speciesId];
  const suggestions = NAMES[speciesId] ?? fallbackNames;
  const parents = plants.filter((p) => p.speciesId === speciesId);
  const soilInfo = SOILS.find((s) => s.id === soil);

  const save = () => {
    const plant = addPlant({
      name: name.trim() || suggestions[0],
      speciesId,
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
    <ScrollView style={{ backgroundColor: colors.white }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <GlassButton accessibilityLabel="Back to plant list" onPress={() => setSpeciesId(null)}>
          <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="m15 18-6-6 6-6" stroke={colors.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
        </GlassButton>
        {close}
      </View>

      <View style={[styles.hero, { backgroundColor: potTint[sp.artPot] }]}>
        <PlantBuddy speciesId={speciesId} size={96} />
        <View style={{ flex: 1 }}>
          <Text style={styles.heroKicker}>{sp.latinName}</Text>
          <Text style={styles.heroName}>{sp.commonName}</Text>
          <Text style={styles.heroKicker}>{sp.petToxic ? 'Toxic to cats and dogs' : 'Pet-friendly'}</Text>
        </View>
      </View>

      <Label>Give them a name</Label>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TextInput value={name} onChangeText={setName} style={[styles.search, { flex: 1, fontFamily: fonts.displaySemi, fontSize: 19 }]} accessibilityLabel="Plant name" />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Suggest another name"
          onPress={() => {
            haptics.tap();
            const n = (nameIdx + 1) % suggestions.length;
            setNameIdx(n);
            setName(suggestions[n]);
          }}
          style={styles.dice}
        >
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <Path d="M7.5 3.5h9a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4h-9a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4z" stroke={colors.ink} strokeWidth={2} fill="none" />
            <Path d="M8.5 8.5h.01M15.5 15.5h.01M15.5 8.5h.01M8.5 15.5h.01M12 12h.01" stroke={colors.ink} strokeWidth={3} strokeLinecap="round" />
          </Svg>
        </Pressable>
      </View>

      <Label>How sunny is its spot?</Label>
      <View style={styles.wrap}>
        {LIGHTS.map((l) => (
          <Pill key={l.id} on={light === l.id} bg={colors.sun} label={`${'☀'.repeat(l.suns)} ${l.label}`} onPress={() => setLight(l.id)} />
        ))}
      </View>

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
            style={[styles.pill, styles.soilPill, { backgroundColor: soil === s.id ? colors.mint : colors.white }, soil === s.id && { boxShadow: `0px 3px 0px ${colors.ink}` }]}
          >
            <View style={[styles.swatch, { backgroundColor: s.swatch }]} />
            <Text style={styles.pillText}>{SOIL_LABEL[s.id].replace(' (not ideal in pots)', '')}</Text>
          </Pressable>
        ))}
      </View>
      {soilInfo && <Text style={[styles.note, soil === 'garden_soil' && { color: colors.warn }]}>{soilInfo.note}</Text>}

      <Label>Pot</Label>
      <View style={styles.wrap}>
        {POT_SIZES.map((p) => (
          <Pill key={p.label} on={size === p.cm} label={p.label} onPress={() => setSize(p.cm)} />
        ))}
      </View>
      <View style={styles.wrap}>
        {MATERIALS.map((m) => (
          <Pill key={m.id} on={material === m.id} bg={colors.peach} label={m.label} onPress={() => setMaterial(m.id)} />
        ))}
      </View>

      <Label>Where does it live?</Label>
      <View style={styles.wrap}>
        {PLACES.map((p) => (
          <Pill key={p.id} on={placement === p.id} bg={colors.ice} label={p.label} onPress={() => setPlacement(p.id)} />
        ))}
      </View>
      <TextInput value={room} onChangeText={setRoom} placeholder="Room (optional), e.g. Living room" placeholderTextColor="#8A8A99" style={styles.search} accessibilityLabel="Room" />

      <Label>Where's it from?</Label>
      <View style={styles.wrap}>
        {ORIGINS.map((o) => (
          <Pill key={o.id} on={origin === o.id} bg={colors.grape} label={o.label} onPress={() => setOrigin(o.id)} />
        ))}
      </View>
      {origin === 'cutting' && parents.length > 0 && (
        <View style={{ gap: 6 }}>
          <Label muted>Cutting from which plant? It joins that plant's Offshoots.</Label>
          <View style={styles.wrap}>
            {parents.map((p) => (
              <Pill key={p.id} on={parentId === p.id} bg={colors.lavender} label={p.name} onPress={() => setParentId(p.id)} />
            ))}
          </View>
        </View>
      )}

      <Button title={`Welcome home, ${name.trim() || suggestions[0]}!`} raised onPress={save} style={{ minHeight: 58, marginTop: 8 }} textStyle={{ fontSize: 19, fontFamily: fonts.display }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  search: { minHeight: 50, borderRadius: 16, borderWidth: 2, borderColor: colors.ink, paddingHorizontal: 14, fontFamily: fonts.bodyHeavy, fontSize: 15, color: colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  speciesTile: { width: '31%', flexGrow: 1, borderRadius: 18, borderWidth: 2, borderColor: colors.ink, alignItems: 'center', paddingVertical: 8, gap: 2 },
  speciesName: { fontFamily: fonts.bodyHeavy, fontSize: 12, color: colors.ink, paddingHorizontal: 4 },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 22, borderWidth: 2, borderColor: colors.ink, boxShadow: `0px 4px 0px ${colors.ink}` },
  heroKicker: { fontFamily: fonts.bodyHeavy, fontSize: 12, color: colors.inkMuted },
  heroName: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  dice: { width: 50, height: 50, borderRadius: 16, borderWidth: 2, borderColor: colors.ink, backgroundColor: colors.lavender, alignItems: 'center', justifyContent: 'center' },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { minHeight: 42, paddingHorizontal: 14, borderRadius: 21, borderWidth: 2, borderColor: colors.ink, justifyContent: 'center' },
  soilPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 6 },
  swatch: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.ink },
  pillText: { fontFamily: fonts.bodyHeavy, fontSize: 14, color: colors.ink },
  note: { fontFamily: fonts.bodyHeavy, fontSize: 13, color: colors.inkMuted },
});
