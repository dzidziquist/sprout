import { ART } from '@/data/art';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import Svg, { Path } from 'react-native-svg';
import { archiveFloor, usePlantStore } from '@/store/plantStore';
import { checkIntervalDays, isFeedingPaused, isReservoir, moodFor, refreshDueAt } from '@/engine/careEngine';
import { speciesOf, petToxicKnown } from '@/data/species';
import { SOIL_LABEL, LIGHT_LABEL } from '@/data/labels';
import { edibleGuide } from '@/data/edibles';
import { feedingAdvice } from '@/engine/growPatch';
import { growDay, stageAtPhoto } from '@/engine/photoDiary';
import { activeTrip } from '@/engine/away';
import { Dropdown, DropdownGroup } from '@/components/Dropdown';
import { closestOption, optionsSince, daysAgo as daysBefore, GONE } from '@/lib/when';
import { PlantBuddy } from '@/components/PlantBuddy';
import { GoldSparkles } from '@/components/GoldSparkles';
import { usePlantActions } from '@/components/PlantMenu';
import { Button, Label, Sticker, Title } from '@/components/ui';
import { GlassButton } from '@/components/GlassButton';
import { StagePanel } from '@/components/StagePanel';
import { LightCard } from '@/components/LightCard';
import { AboutCard } from '@/components/AboutCard';
import { RootingCare, RootingStats } from '@/components/PlantPageRooting';
import { PlantPageOffshoots } from '@/components/PlantPageOffshoots';
import { CUTTING_ICON, METHOD_WORD } from '@/components/CuttingMethods';

import { choosePhoto, photoSrc } from '@/lib/photos';
import * as haptics from '@/lib/haptics';
import { textOn, useColors } from '@/theme/theme';
import { fonts } from '@/theme/tokens';
import type { CareEvent, Plant } from '@/types';

/** Watering can, for Log care. */
const LOG_ICON = 'M4 10h11v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-7zM15 12l5-4M15 10V8a3 3 0 0 0-6 0v2';
/** Stethoscope, for the plant doctor. */
const DOCTOR_ICON = 'M6 3v6a4 4 0 0 0 8 0V3M10 13v3a4 4 0 0 0 8 0v-2M18 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z';

const CAMERA = 'M3 9a3 3 0 0 1 3-3h1.5L9 4h6l1.5 2H18a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z';

function daysAgo(iso: string | undefined, now: Date) {
  if (!iso) return '—';
  const d = Math.round((now.getTime() - new Date(iso).getTime()) / 86400000);
  return d <= 0 ? 'Today' : d === 1 ? 'Yesterday' : `${d} days ago`;
}

const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', ...(new Date(iso).getFullYear() !== new Date().getFullYear() ? { year: 'numeric' } : {}) });

function describe(e: CareEvent, plants: Plant[], reservoir: boolean): string {
  switch (e.type) {
    case 'check':
      if (reservoir) return e.result === 'dry' ? 'Water check: low, topped up' : 'Water check: plenty, skipped';
      return e.result === 'damp' ? 'Soil check: damp, smart skip' : e.result === 'soggy' ? 'Soil check: soggy' : 'Soil check: dry, watered';
    case 'water':
      return reservoir ? 'Topped up' : 'Watered';
    case 'refresh':
      return 'Fresh water + nutrients';
    case 'feed':
      return 'Fed';
    case 'repot':
      return 'Repotted';
    case 'prune':
      return 'Trimmed';
    case 'pest':
      return 'Bug patrol';
    case 'staked':
      return 'Staked';
    case 'diagnosis':
      return `Plant doctor: ${e.note}`;
    case 'cutting':
      {
        const baby = plants.find((p) => p.id === e.note);
        return baby ? `Took a cutting: ${baby.name}` : 'Took a cutting';
      }
    case 'photo':
      return e.note ? `Photo: ${e.note}` : 'Photo added';
    case 'note':
      return `Note: ${e.note}`;
    case 'harvest':
      return `Harvest${e.amount ? `: ${e.amount} ${e.unit ?? ''}` : ''}`.trim();
    case 'rooted':
      return 'Rooted and potted up!';
    case 'stage':
      return `New stage: ${e.stage}`;
    case 'regrow':
      return 'Cut and regrowing';
    case 'archived':
      return e.note === 'gifted' ? 'Gifted away' : 'Moved to In memory';
    case 'restored':
      return 'Back in the fam';
  }
}

export default function PlantDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { plants, events, profile, addPhoto, setArchivedAt } = usePlantStore();
  const plant = plants.find((p) => p.id === id);
  const actions = usePlantActions(plant);
  const [showPhoto, setShowPhoto] = useState(true);
  // Gone (deleted, or an old notification tapped): say so and offer the way back.
  if (!plant || !actions)
    return (
      <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <Title style={{ textAlign: 'center' }}>This plant isn’t in your fam</Title>
        <Button title="Back to Today" bg={c.leaf} onPress={() => router.replace('/')} />
      </View>
    );

  const now = new Date();
  const species = speciesOf(plant);
  const pets = petToxicKnown(plant);
  const tint = c.potTint[plant.potColor];
  const archived = !!plant.archivedAt;
  const goneFloor = archiveFloor(plant, events);
  const goneOptions = optionsSince(GONE, goneFloor, now);
  const rhythm = Math.round(checkIntervalDays({ group: species.group, plant, profile: profile.climate, at: now }));
  const mine = events.filter((e) => e.plantId === plant.id);
  const lastWater = [...mine].reverse().find((e) => e.type === 'water');
  const parent = plants.find((p) => p.id === plant.parentId);
  const babies = plants.filter((p) => p.parentId === plant.id);
  const feedPaused = isFeedingPaused(profile.climate, plant.placement, now);
  const guide = edibleGuide(plant.speciesId);
  const hydro = isReservoir(plant.soil);
  const feed = hydro
    ? feedPaused
      ? 'Quarter-strength nutrients till spring'
      : 'Weak nutrients with every top-up'
    : guide
      ? feedingAdvice(plant, profile.climate, now)
      : feedPaused
        ? 'Paused till spring'
        : 'Monthly while growing';
  const refreshAt = refreshDueAt(plant);
  const refreshDays = refreshAt ? Math.round((new Date(refreshAt.toDateString()).getTime() - new Date(now.toDateString()).getTime()) / 86400000) : 0;
  const refresh = refreshDays <= 0 ? 'Due now' : refreshDays === 1 ? 'Tomorrow' : `In ${refreshDays} days`;
  const nextDays = Math.round((new Date(new Date(plant.nextCheckAt).toDateString()).getTime() - new Date(now.toDateString()).getTime()) / 86400000);
  const nextCheck = nextDays <= 0 ? 'Today' : nextDays === 1 ? 'Tomorrow' : nextDays < 7 ? `In ${nextDays} days` : new Date(plant.nextCheckAt).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  // A dry check already says "watered", so the watering it logged alongside isn't listed twice.
  const checkedAt = new Set(mine.filter((e) => e.type === 'check' && e.result === 'dry').map((e) => e.at));
  const history = mine.filter((e) => !(e.type === 'water' && checkedAt.has(e.at))).slice(-6).reverse();
  const photos = mine.filter((e) => e.type === 'photo' && e.photoUri).reverse();
  const heroPhoto = showPhoto && plant.photoUri;

  const addNewPhoto = async () => {
    const uri = await choosePhoto();
    if (!uri) return;
    addPhoto(plant.id, uri);
    setShowPhoto(true);
    haptics.success();
  };

  const toolbarIcon = (d: string, size = 18) => (
    <Svg width={size} height={size} viewBox="0 0 24 24"><Path d={d} stroke={c.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
      <View style={[styles.hero, { backgroundColor: tint, paddingTop: insets.top + 8, borderColor: c.line }]}>
        <View style={styles.heroBar}>
          <GlassButton accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
            {toolbarIcon('m15 18-6-6 6-6')}
          </GlassButton>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {plant.photoUri && (
              <GlassButton accessibilityLabel={heroPhoto ? 'Show illustration' : 'Show photo'} onPress={() => { haptics.tap(); setShowPhoto((v) => !v); }}>
                {heroPhoto ? toolbarIcon('M12 21v-8M12 13C12 8.5 8.5 5 3.5 5c0 4.5 3.5 8 8.5 8zM12 15.5c0-3.5 3.5-7 8.5-7 0 4.5-3.5 7-8.5 7z') : toolbarIcon(CAMERA)}
              </GlassButton>
            )}
            <GlassButton accessibilityLabel={`Edit ${plant.name}`} onPress={actions.edit}>
              {toolbarIcon('M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4')}
            </GlassButton>
          </View>
        </View>
        {heroPhoto ? (
          <View style={[styles.heroPhoto, { borderColor: c.line, boxShadow: `0px 4px 0px ${c.drop}` }]}>
            <Image source={{ uri: photoSrc(plant.photoUri!) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} accessibilityLabel={`Photo of ${plant.name}`} />
          </View>
        ) : (
          <View style={[styles.heroArt, archived && { opacity: 0.6 }]}>
            <PlantBuddy speciesId={plant.rooting ? 'cutting' : plant.speciesId} pot={plant.potColor} mood={archived ? 'happy' : moodFor(plant, now, !!activeTrip(profile.trips, now))} size={220} bg={tint} faces={archived ? 'off' : profile.faces} />
            {!archived && <GoldSparkles pot={plant.potColor} size={1.6} />}
            {plant.rooting && (
              <View style={[styles.heroChip, { backgroundColor: c.card, borderColor: c.line }]}>
                <Text style={[styles.heroChipText, { color: c.ink }]}>Rooting {METHOD_WORD[plant.rooting.method]}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View>
          <Title>{plant.name}</Title>
          <Label muted>
            {species.commonName}
            {plant.room ? ` · ${plant.room}` : ''}
            {plant.rooting ? ` · rooting in ${plant.rooting.method}` : ''}
          </Label>
        </View>

        {archived && (
          <Sticker drop={0} bg={plant.archivedReason === 'gifted' ? c.blush : c.cloud} style={styles.archived}>
            {plant.archivedReason !== 'gifted' && <Image source={ART.memorial} style={{ width: 96, height: 96, alignSelf: 'center' }} resizeMode="contain" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />}
            <Text style={[styles.archivedTitle, { color: c.ink }]}>
              {plant.archivedReason === 'gifted' ? `Gifted away on ${shortDate(plant.archivedAt!)}` : `In memory since ${shortDate(plant.archivedAt!)}`}
            </Text>
            <Text style={[styles.archivedBody, { color: c.ink }]}>
              {plant.archivedReason === 'gifted'
                ? `${plant.name} is growing somewhere new. Their story stays in your Offshoots.`
                : `Thanks for the leaves, ${plant.name}. Every plant teaches us something, and their diary stays here.`}
            </Text>
            {/* Sits on the card's own tint, with the chosen answer picked out in the card colour. */}
            <DropdownGroup bg="transparent">
              <Dropdown
                label={plant.archivedReason === 'gifted' ? 'Gifted' : 'Lost'}
                value={closestOption(goneOptions, plant.archivedAt!)}
                tint={c.card}
                options={goneOptions}
                onChange={(g) => setArchivedAt(plant.id, daysBefore(GONE.find((o) => o.id === g)?.days ?? 0))}
                last
              />
            </DropdownGroup>
            {goneOptions.length < GONE.length && (
              <Text style={[styles.archivedNote, { color: c.ink }]}>
                {goneFloor === plant.acquiredAt
                  ? `${plant.name} joined on ${shortDate(plant.acquiredAt)}, so it can’t have left before that. To go further back, change that date in Edit.`
                  : `${plant.name} came back on ${shortDate(goneFloor)}, so it can’t have left again before that.`}
              </Text>
            )}
            <Button title="Bring back to the jungle" bg={c.card} onPress={actions.restore} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
          </Sticker>
        )}

        {!archived && plant.rooting && <RootingStats rooting={plant.rooting} now={now} />}
        {!archived && !plant.rooting && (
          <View style={styles.stats}>
            <Sticker drop={0} bg={c.ice} style={styles.stat}>
              <Text style={[styles.statNum, { color: c.ink }]}>~{rhythm} days</Text>
              <Text style={[styles.statLabel, { color: c.ink }]}>check rhythm</Text>
            </Sticker>
            {hydro ? (
              <Sticker drop={0} bg={refreshDays <= 0 ? c.peach : c.butter} style={styles.stat}>
                <Text style={[styles.statNum, { color: c.ink }]}>{refresh}</Text>
                <Text style={[styles.statLabel, { color: c.ink }]}>{plant.soil === 'water' ? 'fresh water' : 'flush'}</Text>
              </Sticker>
            ) : (
              <Sticker drop={0} bg={c.butter} style={styles.stat}>
                <Text style={[styles.statNum, { color: c.ink }]}>{daysAgo(lastWater?.at, now)}</Text>
                <Text style={[styles.statLabel, { color: c.ink }]}>{plant.selfWatering === 'always' ? 'last topped up' : 'last watered'}</Text>
              </Sticker>
            )}
            <Sticker drop={0} bg={c.mint} style={styles.stat}>
              <Text style={[styles.statNum, { color: c.ink }]}>{nextCheck}</Text>
              <Text style={[styles.statLabel, { color: c.ink }]}>next check</Text>
            </Sticker>
          </View>
        )}

        {!archived && plant.rooting && (
          <>
            <Button title="Roots showing? Pot it up" raised onPress={() => router.push(`/pot-up/${plant.id}`)} style={{ minHeight: 56 }} textStyle={{ fontSize: 19, fontFamily: fonts.display }} />
            <Button title="Log care" bg={c.card} onPress={actions.log} style={{ minHeight: 48 }} />
          </>
        )}
        {!archived && !plant.rooting && (
          <>
            <View style={styles.actions}>
              <ActionTile label="Log care" icon={LOG_ICON} bg={c.leaf} big onPress={actions.log} />
              {!guide?.regrows && <ActionTile label="Take cuttings" a11y={`Take cuttings from ${plant.name}`} icon={CUTTING_ICON} bg={c.lavender} onPress={() => router.push(`/cuttings/${plant.id}`)} />}
              <ActionTile label="Something wrong?" a11y={`What's wrong with ${plant.name}?`} icon={DOCTOR_ICON} bg={c.peach} onPress={() => router.push(`/doctor/${plant.id}`)} />
            </View>
          </>
        )}
        {!archived && !plant.rooting && guide && <StagePanel plant={plant} now={now} />}
        {!archived && !plant.rooting && species.edible && !guide && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Log harvest" bg={c.peach} onPress={() => router.push(`/harvest/${plant.id}`)} style={{ flex: 1, minHeight: 48 }} />
            <Button title="Grow patch" bg={c.butter} onPress={() => router.push('/grow')} style={{ flex: 1, minHeight: 48 }} />
          </View>
        )}

        {!archived && <LightCard plant={plant} />}

        {(photos.length > 0 || !archived) && (
          <View style={{ gap: 8 }}>
            <View style={styles.rowBetween}>
              <Label>Photo diary</Label>
              {photos.length > 0 && <Label muted>{photos.length} {photos.length === 1 ? 'photo' : 'photos'}</Label>}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip} style={styles.stripWrap}>
              {!archived && (
                <Pressable accessibilityRole="button" accessibilityLabel="Add photo" onPress={addNewPhoto} style={[styles.addPhoto, { borderColor: c.line, backgroundColor: c.butter }]}>
                  <Svg width={26} height={26} viewBox="0 0 24 24"><Path d={CAMERA} stroke={c.ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
                  <Text style={[styles.addPhotoText, { color: c.ink }]}>Add photo</Text>
                </Pressable>
              )}
              {photos.map((e) => {
                const stage = guide ? stageAtPhoto(plant, events, e) : undefined;
                return (
                  <Pressable
                    key={e.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${plant.name} on ${shortDate(e.at)}. Open the photo diary`}
                    onPress={() => router.push(`/photos/${plant.id}?photo=${e.id}`)}
                    style={styles.photoItem}
                  >
                    <View style={[styles.photo, { borderColor: c.line }]}>
                      <Image source={{ uri: photoSrc(e.photoUri!) }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
                    </View>
                    {guide ? (
                      <>
                        <Text style={[styles.photoDate, { color: c.ink }]}>Day {growDay(plant, e)}</Text>
                        <Text style={[styles.photoStage, { color: c.inkMuted }]}>{(stage && guide.info[stage]?.label) ?? shortDate(e.at)}</Text>
                      </>
                    ) : (
                      <Text style={[styles.photoDate, { color: c.inkMuted }]}>{shortDate(e.at)}</Text>
                    )}
                  </Pressable>
                );
              })}
              {photos.length === 0 && !archived && (
                <Text style={[styles.stripHint, { color: c.inkMuted }]}>
                  {guide ? `Snap ${plant.name} every week or so. Each photo is marked with the grow day and stage, so you can watch it go from ${guide.stages[0] === 'seed' ? 'seed' : 'sprout'} to harvest.` : `Snap ${plant.name} now and then to watch them grow.`}
                </Text>
              )}
            </ScrollView>
          </View>
        )}

        {plant.rooting && !archived ? (
          <RootingCare rooting={plant.rooting} now={now} pets={pets} />
        ) : (
        <Sticker drop={0} style={{ overflow: 'hidden' }}>
          {(hydro
            ? [
                ['Water', plant.soil === 'water' ? 'Top up as the level drops; keep the crown dry' : 'Keep the water line at the bottom third of the pot'],
                ['Fresh water', plant.soil === 'water' ? 'Swap it all out every 2 weeks' : 'Flush with plain water monthly'],
              ]
            : plant.selfWatering === 'always'
              ? [['Water', 'Self-watering pot: keep the reservoir topped up. No need to water from the top.']]
              : [
                  ['Water', species.group === 'succulent' ? 'When the mix is dry all the way down' : species.group === 'moisture' ? 'When the surface just starts to dry' : 'When the top 2–3 cm feels dry'],
                  ...(plant.selfWatering === 'away' ? [['Reservoir', 'Fill it before a trip; Away mode reminds you']] : []),
                ]
          ).concat([
            ['Light', LIGHT_LABEL[plant.light]],
            [hydro ? 'Grows in' : 'Soil', SOIL_LABEL[plant.soil]],
            ['Feed', feed],
            ['Pets', pets === undefined ? 'Not sure yet: check the ASPCA list' : pets ? 'Toxic to cats and dogs' : 'Pet-friendly'],
          ]).map(([k, v], i, all) => (
            <View key={k} style={[styles.row, i < all.length - 1 && { borderBottomWidth: 2, borderColor: c.cloud }]}>
              <Text style={[styles.rowKey, { color: c.inkMuted }]}>{k}</Text>
              <Text style={[styles.rowVal, { color: k === 'Pets' && pets !== false ? c.warn : c.ink }]}>{v}</Text>
            </View>
          ))}
        </Sticker>
        )}
        {species.tip && !plant.rooting && (
          <Sticker drop={0} bg={c.butter} style={{ padding: 12 }}>
            <Text style={[styles.rowVal, { color: c.ink, textAlign: 'left' }]}>💡 {species.tip}</Text>
          </Sticker>
        )}

        <AboutCard plant={plant} />

        <PlantPageOffshoots parent={parent} babies={babies} />

        {history.length > 0 && (
          <View style={{ gap: 8 }}>
            <Label>Recent care</Label>
            {history.map((e) => {
              const row = (
                <>
                  <Text style={[styles.diaryText, { color: c.ink }]} numberOfLines={e.note && e.type !== 'cutting' ? 4 : 1}>{describe(e, plants, hydro)}</Text>
                  <Text style={[styles.diaryDate, { color: c.inkMuted }]}>{daysAgo(e.at, now)}</Text>
                </>
              );
              // Notes and photo captions open to be changed.
              return e.type === 'note' || e.type === 'photo' ? (
                <Pressable
                  key={e.id}
                  accessibilityRole="button"
                  accessibilityHint={e.type === 'note' ? 'Edit note' : 'Edit caption'}
                  onPress={() => router.push(`/note/${e.id}`)}
                  style={({ pressed }) => [styles.diaryRow, pressed && { opacity: 0.6 }]}
                >
                  {row}
                </Pressable>
              ) : (
                <View key={e.id} style={styles.diaryRow}>
                  {row}
                </View>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

/** One of the three main actions under the stats: icon on top, short label underneath. */
function ActionTile({ label, a11y, icon, bg, big, onPress }: { label: string; a11y?: string; icon: string; bg: string; big?: boolean; onPress: () => void }) {
  const c = useColors();
  const ink = textOn(bg, c);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y ?? label}
      onPress={onPress}
      style={({ pressed }) => [styles.actionTile, { backgroundColor: bg, borderColor: c.line, boxShadow: `0px ${pressed ? 1 : big ? 4 : 3}px 0px ${c.drop}` }, pressed && { transform: [{ translateY: 2 }] }]}
    >
      <Svg width={24} height={24} viewBox="0 0 24 24"><Path d={icon} stroke={ink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" /></Svg>
      <Text style={[styles.actionText, { color: ink }, big && { fontFamily: fonts.display }]} numberOfLines={2}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', borderBottomWidth: 2, paddingBottom: 4 },
  heroBar: { alignSelf: 'stretch', paddingHorizontal: 16, flexDirection: 'row', justifyContent: 'space-between' },
  heroArt: { width: 220, alignItems: 'center' },
  heroChip: { marginTop: -4, marginBottom: 8, borderWidth: 2, borderRadius: 14, paddingHorizontal: 10, height: 28, justifyContent: 'center' },
  heroChipText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 10 },
  actionTile: { flex: 1, minHeight: 84, borderWidth: 2, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6, paddingVertical: 10 },
  actionText: { fontFamily: fonts.displaySemi, fontSize: 14, lineHeight: 17, textAlign: 'center' },
  heroPhoto: { width: 210, height: 210, borderRadius: 28, borderWidth: 2, overflow: 'hidden', marginVertical: 10 },
  body: { padding: 20, gap: 16 },
  archived: { padding: 14, gap: 4 },
  archivedTitle: { fontFamily: fonts.display, fontSize: 18 },
  archivedNote: { fontFamily: fonts.bodyHeavy, fontSize: 12, lineHeight: 17, opacity: 0.75 },
  archivedBody: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, padding: 10, borderRadius: 16 },
  statNum: { fontFamily: fonts.display, fontSize: 16 },
  statLabel: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  stripWrap: { marginHorizontal: -20 },
  strip: { gap: 10, paddingHorizontal: 20, alignItems: 'flex-start' },
  addPhoto: { width: 96, height: 96, borderRadius: 18, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 4 },
  addPhotoText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  stripHint: { fontFamily: fonts.bodyHeavy, fontSize: 13, width: 200, alignSelf: 'center' },
  photoItem: { alignItems: 'center', gap: 4 },
  photo: { width: 96, height: 96, borderRadius: 18, borderWidth: 2, overflow: 'hidden' },
  photoDate: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
  photoStage: { fontFamily: fonts.bodyHeavy, fontSize: 11, marginTop: -3 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingHorizontal: 14, paddingVertical: 11 },
  rowKey: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  rowVal: { fontFamily: fonts.bodyHeavy, fontSize: 14, flexShrink: 1, textAlign: 'right' },
  diaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  diaryText: { fontFamily: fonts.bodyHeavy, fontSize: 14, flexShrink: 1 },
  diaryDate: { fontFamily: fonts.body, fontSize: 13 },
});
