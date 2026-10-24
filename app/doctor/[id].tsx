import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { shrinkPhoto } from '@/lib/shrinkPhoto';
import { usePlantStore } from '@/store/plantStore';
import { AREAS, CAUSES, type Cause, type SymptomArea } from '@/data/diagnosis';
import { AREA_ICON, SYMPTOM_ART } from '@/data/symptomArt';
import { diagnose, speciesNote, symptomsFor, type Likelihood } from '@/engine/diagnose';
import { isReservoir } from '@/engine/careEngine';
import { checkPlantHealth, plantHealthConfigured, type HealthResult } from '@/lib/plantHealth';
import { PlantIdError } from '@/lib/plantId';
import { DAILY_IDS } from '../identify';
import { GlassButton } from '@/components/GlassButton';
import { Icon } from '@/components/GrowTodayCard';
import { Button, Label, Sticker, Title } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { fonts, type, space } from '@/theme/tokens';
import { useColors, type Palette } from '@/theme/theme';
import { PlantGone } from '@/components/PlantGone';
import { useSheetTop } from '@/lib/sheetTop';
import { Glyph } from '@/components/Glyph';

const canUseCamera = Platform.OS === 'ios' || Platform.OS === 'android';
const today = () => new Date().toDateString();

type PhotoPhase = { kind: 'idle' } | { kind: 'loading'; uri: string } | { kind: 'done'; uri: string; results: HealthResult[] } | { kind: 'error'; uri?: string; message: string };

const PHOTO_ERRORS: Record<string, string> = {
  'no-key': 'Photo check isn’t set up in this build.',
  'bad-key': 'Photo check is having a moment. Try the symptom list above.',
  offline: 'Photo check needs the internet. Try again once you’re online.',
  quota: 'Everyone’s free photo checks for today are used up. Try again tomorrow.',
  'daily-limit': `That's ${DAILY_IDS} photo looks today (plant ID and photo checks share them). More tomorrow!`,
  'bad-image': 'That photo didn’t work. Try a close-up of the problem, in focus and in good light.',
  server: 'Pl@ntNet didn’t answer. Give it another go in a moment.',
  'camera-denied': 'The camera is switched off for PlantFam. Choose a photo from your library instead.',
};

const likelihoodFill = (l: Likelihood, c: Palette) => (l === 'Likely' ? c.coral : l === 'Possible' ? c.sun : c.cloud);

/** The plant doctor: tap what you see, get the likely causes for this plant, what to check and what to do. */
export default function DoctorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const sheetTop = useSheetTop();
  const plant = usePlantStore((s) => s.plants.find((p) => p.id === id));
  const events = usePlantStore((s) => s.events);
  const climate = usePlantStore((s) => s.profile.climate);
  const logDiagnosis = usePlantStore((s) => s.logDiagnosis);
  const [area, setArea] = useState<SymptomArea>('leaves');
  const [symptomId, setSymptomId] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [photo, setPhoto] = useState<PhotoPhase>({ kind: 'idle' });
  const scroll = useRef<ScrollView>(null);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);

  if (!plant) return <PlantGone />;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const symptoms = symptomsFor(plant);
  const water = isReservoir(plant.soil);
  const areas = AREAS.filter((a) => symptoms.some((s) => s.area === a.id)).map((a) => (water && a.id === 'soil' ? { ...a, label: 'Water' } : a));
  const symptom = symptomId ? symptoms.find((x) => x.id === symptomId) : undefined;
  const now = new Date();
  const results = symptom ? diagnose(symptom.id, { plant, events, climate, now }) : [];
  const note = symptom ? speciesNote(plant, symptom.id) : undefined;

  const pick = (sid: string) => {
    haptics.tap();
    setSymptomId(sid);
    setSaved(null);
    scroll.current?.scrollTo({ y: 0, animated: false });
  };

  const save = (cause: Cause, seen: string) => {
    haptics.success();
    logDiagnosis(plant.id, `${seen}: ${cause.title.toLowerCase()}`, cause.tweak);
    setSaved(
      cause.tweak === 'slow-water'
        ? `Saved to ${plant.name}'s diary. Checks will be spaced out a little.`
        : cause.tweak === 'more-water'
          ? `Saved to ${plant.name}'s diary. Checks will come a little sooner.`
          : `Saved to ${plant.name}'s diary.`,
    );
  };

  const runPhoto = async (source: 'camera' | 'library') => {
    haptics.tap();
    const { profile, setProfile } = usePlantStore.getState();
    const used = profile.idUsage.day === today() ? profile.idUsage.count : 0;
    if (used >= DAILY_IDS) return setPhoto({ kind: 'error', message: PHOTO_ERRORS['daily-limit'] });
    let uri: string;
    let mimeType: string | undefined;
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted)
          return setPhoto({
            kind: 'error',
            message: PHOTO_ERRORS['camera-denied'],
          });
      }
      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        quality: 1,
        exif: false,
      };
      const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
      if (res.canceled || !res.assets?.[0]) return;
      // Resized once before upload: a full-size shot is several MB and slow to send.
      ({ uri, mimeType } = await shrinkPhoto(res.assets[0], 1280, 0.7));
    } catch {
      return setPhoto({ kind: 'error', message: PHOTO_ERRORS['bad-image'] });
    }
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setPhoto({ kind: 'loading', uri });
    try {
      const out = await checkPlantHealth(uri, {
        mimeType,
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      const st = usePlantStore.getState().profile.idUsage;
      setProfile({
        idUsage: {
          day: today(),
          count: (st.day === today() ? st.count : 0) + 1,
        },
      });
      setPhoto({
        kind: 'done',
        uri,
        results: out.filter((r) => r.score >= 0.1).slice(0, 3),
      });
    } catch (e) {
      if (ctrl.signal.aborted) return;
      setPhoto({
        kind: 'error',
        uri,
        message: PHOTO_ERRORS[e instanceof PlantIdError ? e.kind : 'server'],
      });
    }
  };

  return (
    <ScrollView ref={scroll} style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: sheetTop + 8, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.toolbar}>
        <GlassButton accessibilityLabel="Close" onPress={close}>
          <Glyph name="close" size={16} color={c.ink} width={2.8} />
        </GlassButton>
      </View>

      <View style={{ gap: 6 }}>
        <Title>What’s up with {plant.name}?</Title>
        <Text style={[styles.sub, { color: c.inkMuted }]}>Tap what you see. We’ll use {plant.name}’s care history to work out the likely cause.</Text>
      </View>

      {symptom ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${symptom.label}. Change`}
          onPress={() => (haptics.tap(), setSymptomId(null), setSaved(null))}
          style={[styles.chosen, { borderColor: c.line, backgroundColor: c.mint }]}
        >
          {SYMPTOM_ART[symptom.id] ? (
            <Image source={SYMPTOM_ART[symptom.id]!} style={{ width: 52, height: 52 }} resizeMode="contain" />
          ) : (
            <View
              style={[
                styles.tileIcon,
                {
                  backgroundColor: c.butter,
                  borderColor: c.line,
                  marginBottom: 0,
                },
              ]}
            >
              <Icon d={AREA_ICON[symptom.area]} color={c.ink} size={22} />
            </View>
          )}
          <Text style={[styles.tileLabel, { color: c.ink, flex: 1 }]}>{symptom.label}</Text>
          <Text style={[styles.change, { color: c.ink }]}>Change</Text>
        </Pressable>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} style={{ marginHorizontal: -20 }}>
            <View style={{ width: 12 }} />
            {areas.map((a) => {
              const on = a.id === area;
              return (
                <Pressable
                  key={a.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  onPress={() => (haptics.tap(), setArea(a.id))}
                  style={[
                    styles.areaChip,
                    {
                      borderColor: c.line,
                      backgroundColor: on ? c.ink : c.card,
                    },
                  ]}
                >
                  <Icon d={AREA_ICON[a.id]} color={on ? c.bg : c.ink} size={16} width={2.2} />
                  <Text style={[styles.areaText, { color: on ? c.bg : c.ink }]}>{a.label}</Text>
                </Pressable>
              );
            })}
            <View style={{ width: 12 }} />
          </ScrollView>

          <View style={styles.grid}>
            {symptoms
              .filter((s) => s.area === area)
              .map((s) => {
                const on = s.id === symptomId;
                const art = SYMPTOM_ART[s.id];
                return (
                  <Pressable
                    key={s.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={`${s.label}. ${s.hint}`}
                    onPress={() => pick(s.id)}
                    style={({ pressed }) => [
                      styles.tile,
                      {
                        borderColor: c.line,
                        backgroundColor: on ? c.mint : c.card,
                        boxShadow: `0px ${pressed ? 1 : 3}px 0px ${c.drop}`,
                      },
                      pressed && { transform: [{ translateY: 2 }] },
                    ]}
                  >
                    {art ? (
                      <Image source={art} style={styles.tileArt} resizeMode="contain" />
                    ) : (
                      <View style={[styles.tileIcon, { backgroundColor: c.butter, borderColor: c.line }]}>
                        <Icon d={AREA_ICON[s.area]} color={c.ink} size={22} />
                      </View>
                    )}
                    <Text style={[styles.tileLabel, { color: c.ink }]}>{s.label}</Text>
                    <Text style={[styles.tileHint, { color: c.inkMuted }]}>{s.hint}</Text>
                  </Pressable>
                );
              })}
          </View>
        </>
      )}

      {symptom && (
        <View style={{ gap: 12 }}>
          <Label>Possible causes</Label>
          {note && (
            <Sticker drop={0} bg={c.butter} style={{ padding: 14 }}>
              <Text style={[styles.body, { color: c.ink }]}>{note}</Text>
            </Sticker>
          )}
          {results.map((r) => (
            <CauseCard
              key={r.cause.id}
              cause={r.cause}
              likelihood={r.likelihood}
              why={r.why}
              c={c}
              onSave={() => save(r.cause, symptom.label)}
              onCutting={() => router.push(`/cuttings/${plant.id}`)}
            />
          ))}
          {saved && <Text style={[styles.saved, { color: c.link }]}>{saved}</Text>}
        </View>
      )}

      <Sticker drop={0} bg={c.ice} style={{ padding: 16, gap: 10 }}>
        <Text style={[styles.cardTitle, { color: c.ink }]}>
          Photo check <Text style={[styles.beta, { color: c.inkMuted }]}>beta</Text>
        </Text>
        <Text style={[styles.body, { color: c.ink }]}>
          Snap a close-up of the problem and Pl@ntNet will look for known pests and diseases. It knows crop problems best, so treat it as a second opinion.
        </Text>
        {plantHealthConfigured() ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {canUseCamera && <Button title="Take a photo" bg={c.card} onPress={() => runPhoto('camera')} style={{ flex: 1, minHeight: 46 }} />}
            <Button title={canUseCamera ? 'Choose one' : 'Choose a photo'} bg={c.card} onPress={() => runPhoto('library')} style={{ flex: 1, minHeight: 46 }} />
          </View>
        ) : (
          <Text style={[styles.hint, { color: c.inkMuted }]}>{PHOTO_ERRORS['no-key']}</Text>
        )}
        {photo.kind === 'loading' && (
          <View style={styles.photoRow}>
            <Image source={{ uri: photo.uri }} style={[styles.thumb, { borderColor: c.line }]} />
            <ActivityIndicator color={c.ink} />
            <Text style={[styles.body, { color: c.ink }]}>Asking Pl@ntNet…</Text>
          </View>
        )}
        {photo.kind === 'error' && <Text style={[styles.body, { color: c.ink }]}>{photo.message}</Text>}
        {photo.kind === 'done' && (
          <View style={{ gap: 10 }}>
            <View style={styles.photoRow}>
              <Image source={{ uri: photo.uri }} style={[styles.thumb, { borderColor: c.line }]} />
              <Text style={[styles.body, { color: c.ink, flex: 1 }]}>
                {photo.results.length ? 'Here’s what it might be:' : 'Nothing it recognises. That’s often good news! Try the symptom list above for care problems.'}
              </Text>
            </View>
            {photo.results.map((r) => {
              const cause = r.causeId ? CAUSES[r.causeId] : undefined;
              return (
                <View key={r.code} style={{ gap: 8 }}>
                  <View style={styles.photoRow}>
                    <View
                      style={[
                        styles.pill,
                        {
                          backgroundColor: r.confidence === 'Pretty sure' ? c.coral : r.confidence === 'Maybe' ? c.sun : c.cloud,
                          borderColor: c.line,
                        },
                      ]}
                    >
                      <Text style={[styles.pillText, { color: r.confidence === 'Long shot' ? c.ink : c.onBright }]}>{r.confidence}</Text>
                    </View>
                    <Text style={[styles.cardTitle, { color: c.ink, flex: 1, ...type.body }]}>{r.name ?? r.code}</Text>
                  </View>
                  {cause && <CauseCard cause={cause} c={c} onSave={() => save(cause, 'Photo check')} onCutting={() => router.push(`/cuttings/${plant.id}`)} />}
                </View>
              );
            })}
          </View>
        )}
        <Text style={[styles.hint, { color: c.inkMuted }]}>Powered by Pl@ntNet. Uses one of your {DAILY_IDS} free photo looks a day.</Text>
      </Sticker>

      <Text style={[styles.hint, { color: c.inkMuted }]}>
        These are possible causes, not a diagnosis. Start with the gentle fixes, and if a plant is going downhill fast, save a healthy piece as a cutting. For edibles, never use a spray that isn’t
        labelled for food plants.
      </Text>
    </ScrollView>
  );
}

function CauseCard({ cause, likelihood, why, c, onSave, onCutting }: { cause: Cause; likelihood?: Likelihood; why?: string[]; c: Palette; onSave: () => void; onCutting: () => void }) {
  return (
    <Sticker drop={3} style={{ padding: 16, gap: 10 }}>
      <View style={styles.photoRow}>
        {likelihood && (
          <View
            style={[
              styles.pill,
              {
                backgroundColor: likelihoodFill(likelihood, c),
                borderColor: c.line,
              },
            ]}
          >
            <Text style={[styles.pillText, { color: likelihood === 'Less likely' ? c.ink : c.onBright }]}>{likelihood}</Text>
          </View>
        )}
        <Text style={[styles.cardTitle, { color: c.ink, flex: 1 }]}>{cause.title}</Text>
      </View>
      <Text style={[styles.body, { color: c.ink }]}>{cause.summary}</Text>
      {!!why?.length && (
        <View style={{ gap: 4 }}>
          <Text style={[styles.small, { color: c.inkMuted }]}>WHY WE THINK SO</Text>
          {why.map((w) => (
            <Bullet key={w} text={w} c={c} />
          ))}
        </View>
      )}
      <View style={{ gap: 4 }}>
        <Text style={[styles.small, { color: c.inkMuted }]}>CHECK</Text>
        {cause.check.map((w) => (
          <Bullet key={w} text={w} c={c} />
        ))}
      </View>
      <View style={{ gap: 4 }}>
        <Text style={[styles.small, { color: c.inkMuted }]}>WHAT TO DO</Text>
        {cause.fix.map((w, i) => (
          <Bullet key={w} text={w} n={i + 1} c={c} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
        <Button title="Save diagnosis" bg={c.leaf} onPress={onSave} style={{ flex: 1, minHeight: 44 }} />
        {cause.rescue && <Button title="Save a cutting" bg={c.lavender} onPress={onCutting} style={{ flex: 1, minHeight: 44 }} />}
      </View>
    </Sticker>
  );
}

function Bullet({ text, n, c }: { text: string; n?: number; c: Palette }) {
  return (
    <View style={styles.bullet}>
      <Text style={[styles.bulletMark, { color: c.inkMuted }]}>{n ? `${n}.` : '•'}</Text>
      <Text style={[styles.body, { color: c.ink, flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.xl, gap: space.lg },
  toolbar: { flexDirection: 'row' },
  sub: { fontFamily: fonts.bodyHeavy, ...type.body },
  areaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 14,
    height: 40,
  },
  areaText: { fontFamily: fonts.bodyHeavy, ...type.callout },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    width: '48%',
    flexGrow: 1,
    borderWidth: 2,
    borderRadius: 18,
    padding: 12,
    gap: 4,
  },
  tileArt: { width: '100%', height: 88 },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  tileLabel: { fontFamily: fonts.displaySemi, ...type.body },
  tileHint: { fontFamily: fonts.bodyHeavy, ...type.caption },
  cardTitle: { fontFamily: fonts.display, ...type.headline },
  beta: { fontFamily: fonts.bodyHeavy, ...type.caption },
  body: { fontFamily: fonts.bodyHeavy, ...type.callout },
  small: { fontFamily: fonts.bodyHeavy, ...type.caption2, letterSpacing: 0.6 },
  hint: { fontFamily: fonts.bodyHeavy, ...type.caption },
  saved: { fontFamily: fonts.bodyHeavy, ...type.callout, textAlign: 'center' },
  pill: {
    borderWidth: 2,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  pillText: { fontFamily: fonts.bodyHeavy, ...type.caption },
  bullet: { flexDirection: 'row', gap: 8 },
  bulletMark: {
    fontFamily: fonts.bodyHeavy,
    ...type.callout,
    minWidth: 14,
  },
  chosen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 2,
    borderRadius: 18,
    padding: 12,
  },
  change: {
    fontFamily: fonts.bodyHeavy,
    ...type.callout,
    textDecorationLine: 'underline',
  },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  thumb: { width: 56, height: 56, borderRadius: 12, borderWidth: 2 },
});
