import { useRef, useState } from 'react';
import { ActivityIndicator, Linking, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { File } from 'expo-file-system';
import { usePlantStore } from '@/store/plantStore';
import { forecastToday, lightNeed, placeOf, roomsInUse, skyFactor, spotLight, suits, typicalSky } from '@/engine/light';
import { exposureFromExif, luxFromExposure, readingFrom, readingPlace, readingsHere, spotShare, yearBands, yearWords, type LightReading } from '@/engine/lightMeter';
import { coordsFor, useForecast } from '@/lib/weather';
import { useSite } from '@/hooks/useSite';
import { GlassButton } from '@/components/GlassButton';
import { Glyph } from '@/components/Glyph';
import { PlantBuddy } from '@/components/PlantBuddy';
import { PlantGone } from '@/components/PlantGone';
import { Button, Sticker, Title } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { fonts, space, type } from '@/theme/tokens';
import { textOn, useColors } from '@/theme/theme';
import type { Light } from '@/types';

const BAND: { id: Light; label: string; tint: 'lavender' | 'ice' | 'mint' | 'butter' }[] = [
  { id: 'low', label: 'Shady', tint: 'lavender' },
  { id: 'medium', label: 'Some', tint: 'ice' },
  { id: 'bright', label: 'Bright', tint: 'mint' },
  { id: 'direct', label: 'Direct sun', tint: 'butter' },
];
const WORD: Record<Light, string> = { low: 'Shady', medium: 'Some light', bright: 'Bright', direct: 'Direct sun' };
const MONTHS = 'JFMAMJJASOND';
/** What each kind of plant wants, for "It likes …". */
const LIKES: Record<Light, string> = { low: 'a shady spot', medium: 'some light', bright: 'bright light without harsh sun', direct: 'direct sun' };

type Phase = { kind: 'aim' } | { kind: 'measuring' } | { kind: 'result'; reading: LightReading } | { kind: 'problem'; text: string };

/**
 * The camera light meter: hold the phone where the plant sits, its back camera facing the window, and tap
 * Measure. The back camera, so the screen (and the button) face you and you stand on the room side, out of the light.
 * The selfie camera's exposure gives the light there; the result is carried through the year (see
 * engine/lightMeter). The photo is only read for its exposure, then deleted.
 */
export default function MeasureLight() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const plant = usePlantStore((s) => s.plants.find((p) => p.id === id));
  const plants = usePlantStore((s) => s.plants);
  const roomsSaved = usePlantStore((s) => s.profile.rooms);
  const climate = usePlantStore((s) => s.profile.climate);
  const addLightReading = usePlantStore((s) => s.addLightReading);
  const site = useSite();
  const forecast = useForecast(climate, true);
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'aim' });
  const close = () => (router.canGoBack() ? router.back() : router.replace(`/plant/${id}`));

  if (!plant) return <PlantGone />;

  const measure = async () => {
    if (!camera.current) return;
    haptics.tap();
    setPhase({ kind: 'measuring' });
    try {
      const shot = await camera.current.takePictureAsync({ exif: true, quality: 0.05, shutterSound: false });
      // Only the exposure is wanted: the photo itself goes straight away.
      if (shot?.uri && Platform.OS !== 'web') {
        try {
          new File(shot.uri).delete();
        } catch {}
      }
      const exposure = exposureFromExif(shot?.exif);
      if (!exposure) return setPhase({ kind: 'problem', text: 'This camera didn’t say how bright it was. Try again, or set up the room’s windows instead.' });
      const now = new Date();
      const today = forecastToday(forecast, now);
      const sky = today ? skyFactor(today) : typicalSky(site, now);
      const reading = readingFrom(luxFromExposure(exposure), now, coordsFor(climate), sky);
      if (!reading) return setPhase({ kind: 'problem', text: 'The sun is too low to measure fairly right now. Try again in daylight, ideally around midday.' });
      haptics.success();
      setPhase({ kind: 'result', reading: { ...reading, place: readingPlace(plant) } });
    } catch {
      setPhase({ kind: 'problem', text: 'The camera couldn’t take a reading. Try again.' });
    }
  };

  if (phase.kind === 'result') {
    const { reading } = phase;
    const now = new Date(reading.at);
    // Only readings from where it sits now: after a move, the old spot's don't count.
    const all = [...readingsHere(plant), reading];
    const share = spotShare(all);
    const sunReaches = all.some((r) => r.sunny);
    const bands = share === null ? null : yearBands(share, site, now.getFullYear(), sunReaches);
    const level: Light = bands ? bands[now.getMonth()] : 'direct';
    const fit = suits(level, lightNeed(plant));
    const fill = fit === 'ok' ? c.mint : c.butter;
    const cloudy = (() => {
      const today = forecastToday(forecast, now);
      return today ? skyFactor(today) <= 0.5 : false;
    })();
    // What the windows said, if the room is set up: worth a word when the reading disagrees.
    const place = placeOf(plant, roomsInUse(roomsSaved, plants));
    const estimate = place ? spotLight(place.room, place.spot, site, now, { windowId: place.windowId }).level : null;
    const time = now.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
    const save = () => {
      addLightReading(plant.id, reading, bands ? level : undefined);
      haptics.success();
      close();
    };
    return (
      <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 32 }]}>
        <View style={{ flexDirection: 'row' }}>
          <GlassButton accessibilityLabel="Close" onPress={close}>
            <Glyph name="close" size={16} color={c.ink} width={2.8} />
          </GlassButton>
        </View>
        <View style={{ gap: 2 }}>
          <Title>{reading.sunny ? 'Sun on this spot' : WORD[level]}</Title>
          <Text style={[styles.sub, { color: c.inkMuted }]}>About {reading.lux.toLocaleString('en-US')} lux · {time}</Text>
        </View>

        <View style={{ marginTop: 22 }} accessible accessibilityLabel={`Light band: ${WORD[level]}`}>
          <View style={[styles.marker, { left: `${BAND.findIndex((b) => b.id === level) * 25 + 12.5}%`, backgroundColor: c.ink }]}>
            <Text style={[styles.markerText, { color: c.bg }]}>Here</Text>
          </View>
          <View style={[styles.meter, { borderColor: c.line }]}>
            {BAND.map((b, i) => (
              <View key={b.id} style={[styles.meterCell, { backgroundColor: c[b.tint], borderColor: c.line }, i === BAND.length - 1 && { borderRightWidth: 0 }]}>
                <Text style={[styles.meterText, { color: c.ink }]}>{b.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <Sticker bg={fill} style={styles.fit}>
          <PlantBuddy speciesId={plant.speciesId} pot={plant.potColor} size={64} bg={fill} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.head, { color: textOn(fill, c) }]}>{fit === 'ok' ? `Good for ${plant.name}` : fit === 'dim' ? `A bit dark for ${plant.name}` : `A lot of sun for ${plant.name}`}</Text>
            <Text style={[styles.body, { color: textOn(fill, c) }]}>It likes {LIKES[lightNeed(plant)]}.</Text>
          </View>
        </Sticker>

        {bands ? (
          <View style={{ gap: 8 }}>
            <Text style={[styles.head, { color: c.ink }]} accessibilityRole="header">Through the year</Text>
            <View style={[styles.year, { borderColor: c.line }]} accessible accessibilityLabel={yearWords(bands)}>
              {bands.map((b, m) => (
                <View
                  key={m}
                  style={[styles.month, { backgroundColor: c[BAND.find((x) => x.id === b)!.tint], borderColor: c.line }, m === 11 && { borderRightWidth: 0 }, m === now.getMonth() && { borderWidth: 3 }]}
                >
                  <Text style={[styles.monthText, { color: c.ink }]}>{MONTHS[m]}</Text>
                </View>
              ))}
            </View>
            <Text style={[styles.body, { color: c.ink }]}>
              This spot gets about <Text style={{ fontFamily: fonts.bodyHeavy }}>{Math.max(1, Math.round((share ?? 0) * 100))}% of the light outside</Text>. {yearWords(bands)}
            </Text>
          </View>
        ) : (
          <Text style={[styles.body, { color: c.ink }]}>The sun is shining right on this spot, so this reading can’t show the spot’s usual light. Measure again when it’s in shade to see the year.</Text>
        )}

        {reading.sunny && bands && <Text style={[styles.note, { color: c.inkMuted }]}>The sun reaches this spot around {now.toLocaleTimeString('en-US', { hour: 'numeric' })}. That’s noted; the year comes from your shade readings.</Text>}
        {reading.offPeak && !reading.sunny && (
          <Text style={[styles.note, { color: c.inkMuted }]}>
            {reading.offPeak === 'early' ? 'Early reading' : 'Late reading'}: with the sun low, the light here depends a lot on which way the window faces. Measure again around midday to be sure; this one counts for less.
          </Text>
        )}
        {cloudy && !reading.sunny && <Text style={[styles.note, { color: c.inkMuted }]}>It’s cloudy right now, so today reads lower than a clear day. The share of light stays the same.</Text>}
        {estimate && bands && estimate !== level && (
          <Text style={[styles.note, { color: c.inkMuted }]}>
            Your windows suggested {WORD[estimate].toLowerCase()}. {estimate === 'direct' || (estimate === 'bright' && level !== 'direct') ? 'A curtain, a tree or the angle may block more than expected.' : 'More light gets here than the windows suggested.'}
          </Text>
        )}

        <Button title="Use for this spot" raised bg={c.leaf} onPress={save} style={{ minHeight: 54, marginTop: 4 }} textStyle={styles.bigText} />
        <Button title="Measure again" bg={c.card} onPress={() => setPhase({ kind: 'aim' })} style={{ minHeight: 50 }} />
        <Text style={[styles.note, { color: c.inkMuted, textAlign: 'center' }]}>Using it sets {plant.name}’s light to {WORD[level].toLowerCase()} for now, which can move its next check.</Text>
      </ScrollView>
    );
  }

  const granted = permission?.granted;
  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {granted && <CameraView ref={camera} style={StyleSheet.absoluteFill} facing="back" animateShutter={false} />}
      <View style={[styles.camTop, { top: insets.top + 8 }]}>
        <GlassButton accessibilityLabel="Close" onPress={close}>
          <Glyph name="close" size={16} color={c.ink} width={2.8} />
        </GlassButton>
        <View style={[styles.namePill, { backgroundColor: c.card, borderColor: c.line }]}>
          <Text style={[styles.namePillText, { color: c.ink }]} numberOfLines={1}>{plant.name}</Text>
        </View>
      </View>
      <Sticker style={[styles.tip, { top: insets.top + 64 }]}>
        <Text style={[styles.head, { color: c.ink }]}>Hold it where the plant sits</Text>
        <Text style={[styles.body, { color: c.ink }]}>Back of the phone facing the window, at leaf height, so the window fills the picture.</Text>
        <Text style={[styles.note, { color: c.inkMuted, marginTop: 4 }]}>Best around midday, between about 10 and 3.</Text>
      </Sticker>
      <View style={[styles.camFoot, { backgroundColor: c.bg, borderColor: c.line, paddingBottom: insets.bottom + 20 }]}>
        {!permission ? (
          <ActivityIndicator color={c.ink} />
        ) : !granted ? (
          <>
            <Text style={[styles.body, { color: c.ink, textAlign: 'center' }]}>PlantFam needs the camera to read how bright it is. Nothing is saved or sent.</Text>
            <Button title={permission.canAskAgain ? 'Allow camera' : 'Open Settings'} raised bg={c.leaf} onPress={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())} style={{ alignSelf: 'stretch', minHeight: 52 }} />
          </>
        ) : phase.kind === 'problem' ? (
          <>
            <Text style={[styles.body, { color: c.ink, textAlign: 'center' }]}>{phase.text}</Text>
            <Button title="Try again" raised bg={c.sun} onPress={measure} style={{ alignSelf: 'stretch', minHeight: 52 }} />
          </>
        ) : (
          <>
            <Button
              title={phase.kind === 'measuring' ? '…' : 'Measure'}
              accessibilityLabel="Measure the light"
              disabled={phase.kind === 'measuring'}
              raised
              bg={c.sun}
              onPress={measure}
              style={[styles.shutter, { borderColor: c.line }]}
              textStyle={styles.shutterText}
            />
            <Text style={[styles.note, { color: c.inkMuted, textAlign: 'center' }]}>Nothing is saved or sent: PlantFam only reads how bright it is.</Text>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: space.xl, gap: space.lg },
  sub: { fontFamily: fonts.bodyHeavy, ...type.body },
  head: { fontFamily: fonts.display, ...type.headline },
  body: { fontFamily: fonts.body, ...type.callout },
  note: { fontFamily: fonts.bodyHeavy, ...type.footnote },
  bigText: { fontFamily: fonts.display, ...type.headline },
  marker: { position: 'absolute', top: -26, transform: [{ translateX: -24 }], width: 48, borderRadius: 8, alignItems: 'center', paddingVertical: 2 },
  markerText: { fontFamily: fonts.display, ...type.caption },
  meter: { flexDirection: 'row', borderWidth: 2, borderRadius: 14, overflow: 'hidden', minHeight: 44 },
  meterCell: { flex: 1, alignItems: 'center', justifyContent: 'center', borderRightWidth: 2, paddingHorizontal: 2 },
  meterText: { fontFamily: fonts.bodyHeavy, ...type.caption, textAlign: 'center' },
  fit: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  year: { flexDirection: 'row', borderWidth: 2, borderRadius: 10, overflow: 'hidden' },
  month: { flex: 1, minHeight: 32, alignItems: 'center', justifyContent: 'center', borderRightWidth: 2 },
  monthText: { fontFamily: fonts.bodyHeavy, ...type.caption2 },
  camTop: { position: 'absolute', left: space.xl, right: space.xl, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  namePill: { borderWidth: 2, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 4, maxWidth: 200 },
  namePillText: { fontFamily: fonts.bodyHeavy, ...type.footnote },
  tip: { position: 'absolute', left: space.xl, right: space.xl, padding: 14, gap: 2 },
  camFoot: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 2, borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingTop: 22, paddingHorizontal: space.xl, alignItems: 'center', gap: 12 },
  shutter: { width: 96, height: 96, borderRadius: 48, borderWidth: 3 },
  shutterText: { fontFamily: fonts.display, ...type.headline },
});
