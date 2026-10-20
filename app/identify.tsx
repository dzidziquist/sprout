import { usePlantStore } from '@/store/plantStore';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { shrinkPhoto } from '@/lib/shrinkPhoto';
import Svg, { Path } from 'react-native-svg';
import { getSpecies } from '@/data/species';
import { PlantBuddy } from '@/components/PlantBuddy';
import { GlassButton } from '@/components/GlassButton';
import { Button, Sticker, Title } from '@/components/ui';
import { identifyPlant, plantIdConfigured, PlantIdError, type CatalogueMatch, type Confidence, type PlantIdErrorKind, type PlantNetResult, speciesFor } from '@/lib/plantId';
import * as haptics from '@/lib/haptics';
import { fonts } from '@/theme/tokens';
import { textOn, useColors, type Palette } from '@/theme/theme';
import { useSheetTop } from '@/lib/sheetTop';

type Problem = PlantIdErrorKind | 'camera-denied' | 'camera-failed' | 'daily-limit';

/** Photo ID is free for everyone; a small per-phone allowance keeps the shared free Pl@ntNet quota fair. */
export const DAILY_IDS = 5;
const today = () => new Date().toDateString();

type Phase =
  | { kind: 'empty' }
  | { kind: 'loading'; uri: string }
  | { kind: 'results'; uri: string; matches: CatalogueMatch[]; results: PlantNetResult[] }
  | { kind: 'error'; uri?: string; problem: Problem; mimeType?: string };

const PROBLEMS: Record<Problem, { title: string; body: string; retry?: boolean }> = {
  'no-key': { title: "Photo ID isn't set up yet", body: "This build doesn't have its Pl@ntNet key, so we can't look plants up. You can still pick your plant from the list." },
  'bad-key': { title: 'Photo ID is having a moment', body: "Our plant-ID service didn't accept this app's key. We're on it! Pick from the list for now." },
  offline: { title: 'You seem to be offline', body: 'Photo ID needs the internet. Try again once you’re back online, or pick from the list.', retry: true },
  quota: { title: 'Photo ID is all booked up today', body: "Everyone's free identifications for today are used up. Try again tomorrow, or use Look Up in your iPhone's Photos app, then search the name here." },
  'daily-limit': { title: `That's ${DAILY_IDS} photo looks today`, body: "Photo ID and the plant doctor's photo check share a few free looks a day. More tomorrow! Meanwhile, Look Up in your iPhone's Photos app can name plants too; then search the name here." },
  'bad-image': { title: "That photo didn't work", body: 'Try another one: a single leaf or flower, in focus, in good light.' },
  server: { title: "Pl@ntNet didn't answer", body: 'Their service had a hiccup. Give it another go in a moment.', retry: true },
  'camera-denied': { title: 'The camera is switched off', body: 'Allow camera access for PlantFam in Settings, or choose a photo from your library instead.' },
  'camera-failed': { title: "The camera didn't open", body: 'Choose a photo from your library instead.' },
};

const canUseCamera = Platform.OS === 'ios' || Platform.OS === 'android';

function confidenceFill(conf: Confidence, c: Palette) {
  return conf === 'Pretty sure' ? c.leaf : conf === 'Maybe' ? c.sun : c.bubblegum;
}

export default function IdentifyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const sheetTop = useSheetTop();
  const c = useColors();
  const { profile, setProfile } = usePlantStore();
  const [phase, setPhase] = useState<Phase>(() => (plantIdConfigured() ? { kind: 'empty' } : { kind: 'error', problem: 'no-key' }));
  const [confirm, setConfirm] = useState<CatalogueMatch | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);
  const usedToday = profile.idUsage.day === today() ? profile.idUsage.count : 0;

  const run = async (uri: string, mimeType?: string) => {
    if (usedToday >= DAILY_IDS) return setPhase({ kind: 'error', uri, mimeType, problem: 'daily-limit' });
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setPhase({ kind: 'loading', uri });
    try {
      const out = await identifyPlant(uri, { mimeType, signal: ctrl.signal });
      if (ctrl.signal.aborted) return;
      const st = usePlantStore.getState().profile.idUsage;
      setProfile({ idUsage: { day: today(), count: (st.day === today() ? st.count : 0) + 1 } });
      if (out.matches.length) haptics.success();
      setPhase({ kind: 'results', uri, ...out });
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setPhase({ kind: 'error', uri, mimeType, problem: e instanceof PlantIdError ? e.kind : 'server' });
    }
  };

  const choose = async (source: 'camera' | 'library') => {
    haptics.tap();
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return setPhase({ kind: 'error', problem: 'camera-denied' });
      }
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, exif: false };
      const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled || !res.assets?.[0]) return;
      // Resized once before upload: a full-size shot is several MB and slow to send.
      const small = await shrinkPhoto(res.assets[0], 1280, 0.7);
      run(small.uri, small.mimeType);
    } catch {
      setPhase({ kind: 'error', problem: source === 'camera' ? 'camera-failed' : 'bad-image' });
    }
  };

  const toList = () => {
    haptics.tap();
    router.replace('/add');
  };

  /** Plants Pl@ntNet knows but our list doesn't: add them as themselves, with the name filled in. */
  const addAsItself = (r: PlantNetResult) => {
    haptics.tap();
    const common = r.commonNames[0] ? r.commonNames[0].replace(/^\w/, (ch) => ch.toUpperCase()) : r.latinName;
    router.replace(`/add?other=1&name=${encodeURIComponent(common)}&latin=${encodeURIComponent(r.latinName)}`);
  };
  const topUnlisted = phase.kind === 'results' ? phase.results.find((r) => !speciesFor(r.latinName, r.genus)?.exact) : undefined;
  const unlistedLeads = phase.kind === 'results' && !!topUnlisted && topUnlisted === phase.results[0];

  const photo = 'uri' in phase && phase.uri ? phase.uri : null;

  const pickButtons = (
    <View style={{ gap: 10 }}>
      {canUseCamera && <Button title="Take a photo" raised bg={c.leaf} onPress={() => choose('camera')} style={styles.bigBtn} textStyle={styles.bigBtnText} />}
      <Button
        title={canUseCamera ? 'Choose from my photos' : 'Choose a photo'}
        raised={!canUseCamera}
        bg={canUseCamera ? c.card : c.leaf}
        onPress={() => choose('library')}
        style={canUseCamera ? { minHeight: 50 } : styles.bigBtn}
        textStyle={canUseCamera ? undefined : styles.bigBtnText}
      />
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <ScrollView contentContainerStyle={[styles.page, { paddingTop: sheetTop + 12, paddingBottom: insets.bottom + 28 }]}>
        <View style={styles.header}>
          <Title style={{ flex: 1 }}>Who's this plant?</Title>
          <GlassButton accessibilityLabel="Close" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
            <Svg width={16} height={16} viewBox="0 0 24 24"><Path d="M6 6l12 12M18 6 6 18" stroke={c.ink} strokeWidth={2.8} strokeLinecap="round" /></Svg>
          </GlassButton>
        </View>

        {photo ? (
          <View style={[styles.photoWrap, { borderColor: c.line, backgroundColor: c.cloud, boxShadow: `0px 4px 0px ${c.drop}` }]}>
            <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel="Your plant photo" />
            {phase.kind === 'loading' && (
              <View style={[styles.scanning, { backgroundColor: c.card, borderColor: c.line }]}>
                <ActivityIndicator color={c.ink} />
                <Text style={[styles.scanText, { color: c.ink }]}>Asking Pl@ntNet…</Text>
              </View>
            )}
          </View>
        ) : (
          phase.kind === 'empty' && (
            <Sticker bg={c.mint} style={styles.hero}>
              <View style={styles.heroBuddies}>
                <View style={[styles.heroTile, { backgroundColor: c.butter, borderColor: c.line, transform: [{ rotate: '-6deg' }] }]}>
                  <PlantBuddy speciesId="pothos" size={78} />
                </View>
                <View style={[styles.heroTile, styles.heroQ, { backgroundColor: c.card, borderColor: c.line }]}>
                  <Text style={[styles.qMark, { color: c.ink }]}>?</Text>
                </View>
                <View style={[styles.heroTile, { backgroundColor: c.lavender, borderColor: c.line, transform: [{ rotate: '5deg' }] }]}>
                  <PlantBuddy speciesId="calathea" size={78} />
                </View>
              </View>
              <Text style={[styles.heroTitle, { color: c.ink }]}>Snap a leaf to find a match</Text>
              <Text style={[styles.body, { color: c.inkMuted }]}>Best results: one plant, a leaf or flower filling the frame, in good light. You always get the final say.</Text>
            </Sticker>
          )
        )}

        {phase.kind === 'empty' && pickButtons}
        {phase.kind === 'empty' && (
          <Text style={[styles.body, { color: c.inkMuted, textAlign: 'center' }]}>
            Free · {Math.max(0, DAILY_IDS - usedToday)} of {DAILY_IDS} looks left today
          </Text>
        )}

        {phase.kind === 'loading' && <Text style={[styles.body, { color: c.inkMuted, textAlign: 'center' }]}>Comparing your photo with thousands of plants. This takes a few seconds.</Text>}

        {phase.kind === 'error' && (
          <Sticker bg={c.peach} drop={0} style={styles.notice}>
            <View style={styles.noticeRow}>
              <PlantBuddy speciesId="snake" mood="snoozing" size={64} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.noticeTitle, { color: c.ink }]}>{PROBLEMS[phase.problem].title}</Text>
                <Text style={[styles.body, { color: c.ink }]}>{PROBLEMS[phase.problem].body}</Text>
              </View>
            </View>
          </Sticker>
        )}
        {phase.kind === 'error' && (
          <View style={{ gap: 10 }}>
            {PROBLEMS[phase.problem].retry && phase.uri && <Button title="Try again" raised onPress={() => run(phase.uri!, phase.mimeType)} style={styles.bigBtn} textStyle={styles.bigBtnText} />}
            {phase.problem !== 'no-key' && phase.problem !== 'bad-key' && phase.problem !== 'quota' && phase.problem !== 'daily-limit' && pickButtons}
            <Button title="Pick from the list" bg={c.card} onPress={toList} style={{ minHeight: 50 }} />
          </View>
        )}

        {phase.kind === 'results' && phase.matches.length > 0 && (
          <>
            <View style={{ gap: 2 }}>
              <Text style={[styles.sectionTitle, { color: c.ink }]}>Here's who we think it is</Text>
              <Text style={[styles.body, { color: c.inkMuted }]}>Tap the one that looks right. Photo ID can be wrong, so check the leaves match.</Text>
            </View>
            {phase.matches.map((m) => (
              <MatchCard key={m.speciesId} match={m} c={c} onPress={() => {
                haptics.tap();
                setConfirm(m);
              }} />
            ))}
            {unlistedLeads && topUnlisted && (
              <Button title={`It's ${topUnlisted.commonNames[0] ?? topUnlisted.latinName}: add as itself`} bg={c.mint} onPress={() => addAsItself(topUnlisted)} style={{ minHeight: 50 }} />
            )}
            <Button title="None of these" bg={c.card} onPress={toList} style={{ minHeight: 50 }} />
            <Button title="Try another photo" bg={c.cloud} onPress={() => setPhase({ kind: 'empty' })} style={{ minHeight: 46 }} />
          </>
        )}

        {phase.kind === 'results' && phase.matches.length === 0 && (
          <>
            <Sticker bg={c.ice} drop={0} style={styles.notice}>
              <View style={styles.noticeRow}>
                <PlantBuddy speciesId="cutting" size={64} />
                <View style={{ flex: 1, gap: 4 }}>
                  {phase.results.length ? (
                    <>
                      <Text style={[styles.noticeTitle, { color: c.ink }]}>Not in our fam yet</Text>
                      <Text style={[styles.body, { color: c.ink }]}>
                        Pl@ntNet's best guess is <Text style={{ fontStyle: 'italic' }}>{phase.results[0].latinName}</Text>
                        {phase.results[0].commonNames[0] ? ` (${phase.results[0].commonNames[0]})` : ''}, which isn't in our plant list yet. Add it as itself: just pick how it likes its water.
                      </Text>
                    </>
                  ) : (
                    <>
                      <Text style={[styles.noticeTitle, { color: c.ink }]}>We couldn't spot a plant</Text>
                      <Text style={[styles.body, { color: c.ink }]}>Try a closer photo of one leaf or flower, in focus and in good light.</Text>
                    </>
                  )}
                </View>
              </View>
            </Sticker>
            {phase.results.length > 0 && (
              <Button title={`Add ${phase.results[0].commonNames[0] ?? phase.results[0].latinName}`} raised onPress={() => addAsItself(phase.results[0])} style={styles.bigBtn} textStyle={styles.bigBtnText} />
            )}
            <Button title="Try another photo" raised={phase.results.length === 0} bg={phase.results.length ? c.card : undefined} onPress={() => setPhase({ kind: 'empty' })} style={phase.results.length ? { minHeight: 50 } : styles.bigBtn} textStyle={phase.results.length ? undefined : styles.bigBtnText} />
            <Button title="Pick from the list" bg={c.card} onPress={toList} style={{ minHeight: 50 }} />
          </>
        )}

        <Text style={[styles.credit, { color: c.inkMuted }]}>Photo ID powered by Pl@ntNet</Text>
      </ScrollView>

      <Modal visible={!!confirm} transparent animationType="fade" onRequestClose={() => setConfirm(null)}>
        <View style={styles.scrim}>
          {confirm && (
            <Sticker style={[styles.confirm, { marginBottom: insets.bottom + 16 }]}>
              <Text style={[styles.sectionTitle, { color: c.ink, textAlign: 'center' }]}>Is this your plant?</Text>
              <View style={styles.compare}>
                {photo && (
                  <View style={[styles.compareTile, { borderColor: c.line, backgroundColor: c.cloud }]}>
                    <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel="Your photo" />
                  </View>
                )}
                <View style={[styles.compareTile, { borderColor: c.line, backgroundColor: c.potTint[getSpecies(confirm.speciesId).artPot], alignItems: 'center', justifyContent: 'center' }]}>
                  <PlantBuddy speciesId={confirm.speciesId} size={104} />
                </View>
              </View>
              <View style={{ alignItems: 'center', gap: 2 }}>
                <Text style={[styles.matchName, { color: c.ink }]}>{getSpecies(confirm.speciesId).commonName}</Text>
                <Text style={[styles.latin, { color: c.inkMuted }]}>{getSpecies(confirm.speciesId).latinName}</Text>
              </View>
              <Button
                title="Yes, that's them!"
                raised
                onPress={() => {
                  haptics.success();
                  const id = confirm.speciesId;
                  setConfirm(null);
                  router.replace(`/add?species=${id}`);
                }}
                style={styles.bigBtn}
                textStyle={styles.bigBtnText}
              />
              <Button title="Not quite" bg={c.card} onPress={() => setConfirm(null)} style={{ minHeight: 48 }} />
            </Sticker>
          )}
        </View>
      </Modal>
    </View>
  );
}

function MatchCard({ match, c, onPress }: { match: CatalogueMatch; c: Palette; onPress: () => void }) {
  const sp = getSpecies(match.speciesId);
  const fill = confidenceFill(match.confidence, c);
  const pct = Math.round(match.score * 100);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${sp.commonName}, ${match.confidence}, ${pct} percent`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: c.card, borderColor: c.line, boxShadow: `0px ${pressed ? 1 : 4}px 0px ${c.drop}` }, pressed && { transform: [{ translateY: 3 }] }]}
    >
      <View style={[styles.buddyTile, { backgroundColor: c.potTint[sp.artPot], borderColor: c.line }]}>
        <PlantBuddy speciesId={match.speciesId} size={76} />
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <View style={styles.nameRow}>
          <Text style={[styles.matchName, { color: c.ink }]} numberOfLines={1}>{sp.commonName}</Text>
          <View style={[styles.confChip, { backgroundColor: fill, borderColor: c.line }]}>
            <Text style={[styles.confText, { color: textOn(fill, c) }]}>{match.confidence}</Text>
          </View>
        </View>
        <Text style={[styles.latin, { color: c.inkMuted }]} numberOfLines={2}>
          {match.exact ? match.latinName : `Close relative: ${match.latinName}`}
        </Text>
        <View style={styles.barRow}>
          <View style={[styles.barTrack, { borderColor: c.line, backgroundColor: c.cloud }]}>
            <View style={[styles.barFill, { width: `${Math.max(4, pct)}%`, backgroundColor: fill }]} />
          </View>
          <Text style={[styles.pct, { color: c.ink }]}>{pct}%</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  hero: { padding: 16, gap: 8, alignItems: 'center' },
  heroBuddies: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 },
  heroTile: { width: 92, height: 92, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  heroQ: { width: 64, height: 64, borderRadius: 32 },
  qMark: { fontFamily: fonts.display, fontSize: 36 },
  heroTitle: { fontFamily: fonts.display, fontSize: 21, textAlign: 'center' },
  body: { fontFamily: fonts.bodyHeavy, fontSize: 14, lineHeight: 20 },
  bigBtn: { minHeight: 56 },
  bigBtnText: { fontSize: 18, fontFamily: fonts.display },
  photoWrap: { height: 240, borderRadius: 24, borderWidth: 2, overflow: 'hidden', justifyContent: 'flex-end', alignItems: 'center' },
  scanning: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 2, borderRadius: 20, paddingHorizontal: 14, height: 40, marginBottom: 14 },
  scanText: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  notice: { padding: 14 },
  noticeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  noticeTitle: { fontFamily: fonts.display, fontSize: 18 },
  sectionTitle: { fontFamily: fonts.display, fontSize: 21 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 22, borderWidth: 2 },
  buddyTile: { width: 84, height: 84, borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  matchName: { fontFamily: fonts.display, fontSize: 19, flexShrink: 1 },
  confChip: { borderWidth: 2, borderRadius: 11, height: 24, paddingHorizontal: 8, justifyContent: 'center' },
  confText: { fontFamily: fonts.bodyHeavy, fontSize: 11 },
  latin: { fontFamily: fonts.body, fontSize: 13, fontStyle: 'italic' },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barTrack: { flex: 1, height: 12, borderRadius: 6, borderWidth: 2, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  pct: { fontFamily: fonts.bodyHeavy, fontSize: 12, minWidth: 34, textAlign: 'right' },
  credit: { fontFamily: fonts.body, fontSize: 12, textAlign: 'center', marginTop: 4 },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', paddingHorizontal: 16 },
  confirm: { padding: 18, gap: 12 },
  compare: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  compareTile: { width: 140, height: 140, borderRadius: 22, borderWidth: 2, overflow: 'hidden' },
});
