import { memo, useDeferredValue, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useDay } from '@/hooks/useDay';
import { useTabPadding } from '@/hooks/useTabPadding';
import Svg, { Path } from 'react-native-svg';
import { usePlantStore } from '@/store/plantStore';
import { isDue, moodFor } from '@/engine/careEngine';
import { activeTrip } from '@/engine/away';
import { rootingDays } from '@/engine/treeLayout';
import { speciesOf } from '@/data/species';
import { PlantBuddy } from '@/components/PlantBuddy';
import { GoldSparkles, goldFrame } from '@/components/GoldSparkles';
import { ART } from '@/data/art';
import { PlantMenu } from '@/components/PlantMenu';
import { Button, Label, Sticker, Title } from '@/components/ui';
import { GlassButton } from '@/components/GlassButton';
import { LightRooms } from '@/components/LightRooms';
import { JungleChips, JungleSearch, JungleViewToggle, type JungleChip, type JungleView } from '@/components/JungleControls';
import * as haptics from '@/lib/haptics';
import { textOn, useColors, type Palette } from '@/theme/theme';
import { fonts } from '@/theme/tokens';
import type { Mood, Plant, WishItem } from '@/types';

/** One shared empty list, so the store selector doesn't hand back a new array every render. */
const NO_WISHES: WishItem[] = [];

const moodBadge = (c: Palette): Record<Mood, { text: string; bg: string }> => ({
  thirsty: { text: 'Check me', bg: c.peach },
  happy: { text: 'Happy', bg: c.leaf },
  snoozing: { text: 'Resting', bg: c.lavender },
});

/** Whole-day distance to the next check, in friendly words. */
function nextCheckWords(plant: Plant, now: Date) {
  const days = Math.round((new Date(new Date(plant.nextCheckAt).toDateString()).getTime() - new Date(now.toDateString()).getTime()) / 86400000);
  if (days <= 0) return 'Check today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `In ${days} days`;
  return new Date(plant.nextCheckAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** The status pill shown on a card (short) or a row (with the next check). */
function statusOf(plant: Plant, faded: boolean | undefined, c: Palette, now: Date, long: boolean, away = false) {
  if (faded) return { text: plant.archivedReason === 'gifted' ? 'Gifted' : 'In memory', bg: c.cloud };
  if (plant.rooting) return { text: long ? `Rooting · day ${rootingDays(plant.rooting.startedAt, now)}` : 'Rooting', bg: c.ice };
  if (away && isDue(plant, now)) return { text: long ? 'Napping till you’re back' : 'Napping', bg: c.lavender };
  const mood = moodFor(plant, now);
  if (!long) return moodBadge(c)[mood];
  if (mood === 'thirsty') return { text: 'Check today', bg: c.peach };
  return { text: nextCheckWords(plant, now), bg: mood === 'snoozing' ? c.lavender : c.mint };
}

const PlantCard = memo(function PlantCard({ plant, faded }: { plant: Plant; faded?: boolean }) {
  const c = useColors();
  const faces = usePlantStore((s) => s.profile.faces);
  const away = !!activeTrip(usePlantStore((s) => s.profile.trips), new Date());
  const now = new Date();
  const mood = moodFor(plant, now, away);
  const tint = c.potTint[plant.potColor];
  const badge = statusOf(plant, faded, c, now, false, away);
  return (
    <PlantMenu plant={plant} style={{ flex: 1 }} label={[plant.name, speciesOf(plant).commonName, badge.text, plant.room].filter(Boolean).join(', ')}>
      <Sticker drop={faded ? 0 : 4} style={[{ flex: 1 }, faded && { opacity: 0.55 }]}>
        <View style={[styles.art, { backgroundColor: tint, borderColor: c.line }, goldFrame(plant.potColor)]}>
          <PlantBuddy speciesId={plant.rooting ? 'cutting' : plant.speciesId} mood={faded ? 'happy' : mood} pot={plant.potColor} size={96} bg={tint} faces={faded ? 'off' : faces} />
          <GoldSparkles pot={plant.potColor} />
          <View style={[styles.badge, { backgroundColor: badge.bg, borderColor: c.line }]}>
            <Text style={[styles.badgeText, { color: textOn(badge.bg, c) }]}>{badge.text}</Text>
          </View>
        </View>
        <View style={styles.meta}>
          <Text style={[styles.name, { color: c.ink }]} numberOfLines={1}>{plant.name}</Text>
          <Text style={[styles.kind, { color: c.inkMuted }]} numberOfLines={1}>
            {speciesOf(plant).commonName}
          </Text>
          {plant.room ? (
            <View style={styles.roomLine}>
              <Svg width={12} height={12} viewBox="0 0 24 24">
                <Path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" fill={c.inkMuted} />
              </Svg>
              <Text style={[styles.kind, { color: c.inkMuted, flex: 1 }]} numberOfLines={2}>{plant.room}</Text>
            </View>
          ) : null}
        </View>
      </Sticker>
    </PlantMenu>
  );
});

/** Compact ~64pt row for collectors: buddy thumb, name, species · room, and the next check. */
const PlantRow = memo(function PlantRow({ plant, faded }: { plant: Plant; faded?: boolean }) {
  const c = useColors();
  const faces = usePlantStore((s) => s.profile.faces);
  const away = !!activeTrip(usePlantStore((s) => s.profile.trips), new Date());
  const now = new Date();
  const mood = moodFor(plant, now, away);
  const tint = c.potTint[plant.potColor];
  const pill = statusOf(plant, faded, c, now, true, away);
  const kind = speciesOf(plant).commonName;
  return (
    <PlantMenu plant={plant} label={[plant.name, kind, pill.text, plant.room].filter(Boolean).join(', ')}>
      <View style={[styles.row, { borderColor: c.line, backgroundColor: c.card }, faded && { opacity: 0.6 }]}>
        <View style={[styles.thumb, { backgroundColor: tint, borderColor: c.line }]}>
          <PlantBuddy speciesId={plant.rooting ? 'cutting' : plant.speciesId} mood={faded ? 'happy' : mood} pot={plant.potColor} size={42} bg={tint} faces={faded ? 'off' : faces} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[styles.rowName, { color: c.ink }]} numberOfLines={1}>{plant.name}</Text>
          <Text style={[styles.kind, { color: c.inkMuted }]} numberOfLines={2}>
            {kind}
            {plant.room ? ` · ${plant.room}` : ''}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: pill.bg, borderColor: c.line }]}>
          <Text style={[styles.badgeText, { color: textOn(pill.bg, c) }]} numberOfLines={1}>{pill.text}</Text>
        </View>
      </View>
    </PlantMenu>
  );
});

const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

/** Light-weight search: every word of the query must appear in the name, species (incl. Latin and aliases) or room. */
function matches(p: Plant, words: string[]) {
  if (!words.length) return true;
  const s = speciesOf(p);
  const hay = norm([p.name, s.commonName, s.latinName, ...(s.aliases ?? []), p.room ?? ''].join(' '));
  return words.every((w) => hay.includes(w));
}

/** One line of the jungle list: plants (one row, or two cards in the grid), or a heading between groups. */
type Line =
  | { key: string; kind: 'plants'; plants: Plant[]; faded?: boolean }
  | { key: string; kind: 'label'; text: string; muted?: boolean }
  | { key: string; kind: 'memory' };

/** Plants as list lines: one per row, or in pairs for the two-column grid. */
function linesOf(plants: Plant[], view: JungleView, prefix: string, faded?: boolean): Line[] {
  const size = view === 'list' ? 1 : 2;
  const out: Line[] = [];
  for (let i = 0; i < plants.length; i += size) out.push({ key: `${prefix}${plants[i].id}`, kind: 'plants', plants: plants.slice(i, i + size), faded });
  return out;
}

export default function JungleScreen() {
  const pad = useTabPadding(8);
  const router = useRouter();
  const c = useColors();
  const plants = usePlantStore((s) => s.plants);
  const [showMemory, setShowMemory] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const living = useMemo(() => plants.filter((p) => !p.archivedAt), [plants]);
  // Saved with the other settings, so the layout survives closing the app.
  const saved = usePlantStore((s) => s.profile.jungleView);
  const setProfile = usePlantStore((s) => s.setProfile);
  const wishlist = usePlantStore((s) => s.profile.wishlist ?? NO_WISHES);
  const view: JungleView = saved ?? (living.length >= 16 ? 'list' : 'grid');
  const setView = (v: JungleView) => setProfile({ jungleView: v });
  // Re-renders at midnight so moods and "due" badges catch up.
  useDay();
  const now = new Date();
  const potted = useMemo(() => living.filter((p) => !p.rooting), [living]);
  const rooting = useMemo(() => living.filter((p) => p.rooting), [living]);
  const memory = useMemo(() => plants.filter((p) => p.archivedAt), [plants]);
  const edibles = useMemo(() => potted.filter((p) => speciesOf(p).edible), [potted]);
  const roomList = useMemo(
    () => [...new Set(living.map((p) => p.room?.trim()).filter((r): r is string => !!r))].sort((a, b) => a.localeCompare(b)),
    [living],
  );
  const potRooms = new Set(potted.map((p) => p.room?.trim()).filter(Boolean));

  // Search + filter chips (only once the jungle is big enough to need them).
  const showTools = living.length >= 6;
  const chips: JungleChip[] = [
    { key: 'all', label: 'All', count: living.length },
    { key: 'due', label: 'Needs check', count: potted.filter((p) => isDue(p, now)).length },
    ...(rooting.length ? [{ key: 'rooting', label: 'Rooting', count: rooting.length }] : []),
    ...(edibles.length ? [{ key: 'edibles', label: 'Edibles', count: edibles.length }] : []),
    ...roomList.map((r) => ({ key: `room:${r}`, label: r, count: living.filter((p) => p.room?.trim() === r).length })),
  ];
  const active = showTools && chips.some((ch) => ch.key === filter) ? filter : 'all';
  // Typing stays quick on a big jungle: the list catches up a moment after the keystroke.
  const search = useDeferredValue(query);
  const words = showTools ? norm(search).split(/\s+/).filter(Boolean) : [];
  const chipOk = (p: Plant) => {
    if (active === 'all') return true;
    if (active === 'due') return !p.rooting && !p.archivedAt && isDue(p, now);
    if (active === 'rooting') return !!p.rooting;
    if (active === 'edibles') return speciesOf(p).edible;
    return p.room?.trim() === active.slice(5);
  };
  const keep = (p: Plant) => chipOk(p) && matches(p, words);
  const shownPotted = potted.filter(keep);
  const shownRooting = rooting.filter(keep);
  // Memories follow the search and room chips; status chips (needs check, rooting, edibles) are about living plants.
  const shownMemory = memory.filter((p) => (active === 'all' || active.startsWith('room:') ? chipOk(p) : false) && matches(p, words));
  const filtering = active !== 'all' || words.length > 0;
  // The light view shows potted plants only, so rooting matches alone are still "nothing" there.
  const nothing = filtering && shownPotted.length + (view === 'light' ? 0 : shownRooting.length) === 0;
  const activeLabel = chips.find((ch) => ch.key === active)?.label;

  // Everything below the controls is one virtualized list, so a big jungle only draws what's on screen.
  const lines: Line[] = [];
  const listed = living.length > 0 && !nothing && view !== 'light';
  if (listed) {
    lines.push(...linesOf(shownPotted, view, 'p'));
    if (shownRooting.length) lines.push({ key: 'rooting', kind: 'label', text: 'Rooting babies' }, ...linesOf(shownRooting, view, 'r'));
    if (!filtering) lines.push({ key: 'tip', kind: 'label', text: 'Tip: press and hold a plant for quick actions.', muted: true });
  }
  if (view !== 'light' && shownMemory.length) {
    lines.push({ key: 'memory', kind: 'memory' });
    if (showMemory) lines.push({ key: 'memoryNote', kind: 'label', text: 'Gifted cuttings and plants that taught you something. They stay in Offshoots too.', muted: true }, ...linesOf(shownMemory, view, 'm', true));
  }

  const header = (
    <View style={styles.header}>
      <View style={styles.toolbar}>
        <View style={{ flex: 1 }}>
          <Title>My jungle</Title>
          <Label muted>
            {potted.length} {potted.length === 1 ? 'plant' : 'plants'}
            {potRooms.size ? ` · ${potRooms.size} ${potRooms.size === 1 ? 'room' : 'rooms'}` : ''}
            {rooting.length ? ` · ${rooting.length} rooting` : ''}
          </Label>
        </View>
        <GlassButton accessibilityLabel="Add a plant" onPress={() => router.push('/add')}>
          <Svg width={20} height={20} viewBox="0 0 24 24"><Path d="M12 5v14M5 12h14" stroke={c.ink} strokeWidth={2.6} strokeLinecap="round" /></Svg>
        </GlassButton>
      </View>

      {edibles.length > 0 && (
        <Pressable accessibilityRole="button" accessibilityLabel="Open grow patch" onPress={() => router.push('/grow')}>
          <Sticker bg={c.peach} style={styles.growLink}>
            <PlantBuddy speciesId={edibles[0].speciesId} pot={edibles[0].potColor} mood="happy" size={52} bg={c.peach} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.growTitle, { color: c.ink }]}>Grow patch</Text>
              <Text style={[styles.growSub, { color: c.ink }]}>{edibles.length} {edibles.length === 1 ? 'crop' : 'crops'} · stages, weather and harvests</Text>
            </View>
            <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="m9 6 6 6-6 6" stroke={c.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
          </Sticker>
        </Pressable>
      )}

      {wishlist.length > 0 && (
        <Pressable accessibilityRole="button" accessibilityLabel={`Open wishlist, ${wishlist.length} ${wishlist.length === 1 ? 'plant' : 'plants'}`} onPress={() => router.push('/wishlist')}>
          <Sticker bg={c.lavender} style={styles.growLink}>
            <PlantBuddy speciesId={wishlist[wishlist.length - 1].speciesId} mood="happy" size={52} bg={c.lavender} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.growTitle, { color: textOn(c.lavender, c) }]}>Wishlist</Text>
              <Text style={[styles.growSub, { color: textOn(c.lavender, c) }]}>{wishlist.length} {wishlist.length === 1 ? 'plant' : 'plants'} to get one day</Text>
            </View>
            <Svg width={18} height={18} viewBox="0 0 24 24"><Path d="m9 6 6 6-6 6" stroke={textOn(c.lavender, c)} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
          </Sticker>
        </Pressable>
      )}

      {living.length > 0 && (
        <View style={{ gap: 10 }}>
          <View style={styles.searchRow}>
            {showTools ? <JungleSearch value={query} onChange={setQuery} /> : <View style={{ flex: 1 }} />}
            <JungleViewToggle value={view} onChange={setView} />
          </View>
          {showTools && <JungleChips chips={chips} value={active} onChange={setFilter} bleed={20} />}
        </View>
      )}

      {living.length === 0 ? (
        <Sticker bg={c.mint} style={styles.empty}>
          <Image source={ART.emptyJungle} style={{ width: 150, height: 150 }} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
          <Text style={[styles.emptyTitle, { color: c.ink }]}>A jungle starts with one leaf</Text>
          <Text style={[styles.emptySub, { color: c.ink }]}>Add a plant and it’ll live here, with its mood, rhythm and family tree.</Text>
          <Button title="Add your first plant" raised onPress={() => router.push('/add')} style={{ alignSelf: 'stretch' }} />
        </Sticker>
      ) : nothing ? (
        <Sticker drop={0} bg={c.cloud} style={styles.noMatch}>
          <Text style={[styles.noMatchTitle, { color: c.ink }]}>
            {words.length ? `No plants match “${query.trim()}”` : active === 'due' ? 'Nobody needs a check right now' : `Nothing in ${activeLabel} yet`}
            {words.length && active !== 'all' ? ` in ${activeLabel}` : ''}
          </Text>
          <Button
            title="Show all plants"
            bg={c.card}
            onPress={() => {
              setQuery('');
              setFilter('all');
            }}
            style={{ alignSelf: 'center', paddingHorizontal: 18 }}
          />
        </Sticker>
      ) : null}
      {living.length > 0 && !nothing && filtering && (
        <Label muted>
          Showing {shownPotted.length + shownRooting.length} of {living.length}
        </Label>
      )}
      {living.length > 0 && !nothing && view === 'light' && shownPotted.length > 0 && <LightRooms plants={shownPotted} />}
    </View>
  );

  return (
    <FlatList
      data={lines}
      keyExtractor={(l) => l.key}
      ListHeaderComponent={header}
      renderItem={({ item }) => {
        if (item.kind === 'label') return <Label muted={item.muted} style={[styles.line, item.muted && item.key === 'tip' && { textAlign: 'center' }]}>{item.text}</Label>;
        if (item.kind === 'memory')
          return (
            <View style={styles.line}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: showMemory }}
                accessibilityLabel={`In memory, ${shownMemory.length} ${shownMemory.length === 1 ? 'plant' : 'plants'}`}
                onPress={() => {
                  haptics.tap();
                  setShowMemory((v) => !v);
                }}
                style={[styles.memoryHead, { borderColor: c.line, backgroundColor: c.cloud }]}
              >
                <Text style={[styles.memoryText, { color: c.ink }]}>In memory ({shownMemory.length})</Text>
                <Svg width={18} height={18} viewBox="0 0 24 24" style={{ transform: [{ rotate: showMemory ? '180deg' : '0deg' }] }}>
                  <Path d="m6 9 6 6 6-6" stroke={c.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </Svg>
              </Pressable>
            </View>
          );
        if (view === 'list') return <View style={styles.rowLine}><PlantRow plant={item.plants[0]} faded={item.faded} /></View>;
        return (
          <View style={[styles.grid, styles.gridLine]}>
            {item.plants.map((p) => (
              // The cell owns the width: on iOS the context-menu wrapper is a native view that would
              // otherwise stretch to the full row and stack the cards in one column.
              <View key={p.id} style={styles.card}>
                <PlantCard plant={p} faded={item.faded} />
              </View>
            ))}
          </View>
        );
      }}
      initialNumToRender={10}
      windowSize={7}
      style={{ flex: 1, backgroundColor: c.bg }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentInsetAdjustmentBehavior={pad.contentInsetAdjustmentBehavior}
      contentContainerStyle={[styles.page, { paddingTop: pad.paddingTop, paddingBottom: pad.paddingBottom }]}
    />
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20 },
  header: { gap: 16, marginBottom: 16 },
  line: { marginBottom: 12 },
  rowLine: { marginBottom: 8 },
  gridLine: { marginBottom: 12 },
  toolbar: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, minHeight: 44 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { width: '47.5%', flexGrow: 0 },
  roomLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 64, borderWidth: 2, borderRadius: 18, paddingHorizontal: 8, paddingVertical: 6 },
  thumb: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  rowName: { fontFamily: fonts.displaySemi, fontSize: 16 },
  pill: { borderWidth: 2, borderRadius: 13, paddingHorizontal: 8, paddingVertical: 2, minHeight: 26, justifyContent: 'center', maxWidth: 130 },
  noMatch: { alignItems: 'center', gap: 12, padding: 18 },
  noMatchTitle: { fontFamily: fonts.displaySemi, fontSize: 17, textAlign: 'center' },
  art: { height: 104, alignItems: 'center', justifyContent: 'flex-end', borderBottomWidth: 2, borderTopLeftRadius: 20, borderTopRightRadius: 20, overflow: 'hidden' },
  badge: { position: 'absolute', top: 8, left: 8, borderWidth: 2, borderRadius: 13, paddingHorizontal: 8, paddingVertical: 2, minHeight: 26, justifyContent: 'center' },
  badgeText: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
  meta: { paddingHorizontal: 12, paddingVertical: 8 },
  name: { fontFamily: fonts.displaySemi, fontSize: 17 },
  kind: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  empty: { alignItems: 'center', padding: 20, gap: 10 },
  growLink: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 20 },
  growTitle: { fontFamily: fonts.display, fontSize: 18 },
  growSub: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  emptyTitle: { fontFamily: fonts.display, fontSize: 22, textAlign: 'center' },
  emptySub: { fontFamily: fonts.bodyHeavy, fontSize: 14, textAlign: 'center' },
  memoryHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 2, borderRadius: 16, paddingHorizontal: 14, minHeight: 48 },
  memoryText: { fontFamily: fonts.displaySemi, fontSize: 16 },
});
