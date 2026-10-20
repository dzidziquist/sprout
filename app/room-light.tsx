import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore } from '@/store/plantStore';
import { FACING_LABEL, facingOf, type Facing, type Shade } from '@/engine/light';
import { LIGHT_ART } from '@/data/art';
import { GlassButton } from '@/components/GlassButton';
import { Icon } from '@/components/GrowTodayCard';
import { DirectionArrow, LineIcon } from '@/components/LineIcon';
import { Button, Title } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { useSheetTop } from '@/lib/sheetTop';
import { fonts } from '@/theme/tokens';
import { textOn, useColors } from '@/theme/theme';

const FACINGS: Facing[] = ['N', 'E', 'S', 'W'];
const SHADES: { id: Shade; label: string }[] = [
  { id: 'none', label: 'Clear view' },
  { id: 'sheer', label: 'Curtains' },
  { id: 'outside', label: 'Trees / buildings' },
];
type Kind = 'dirs' | 'unsure' | 'none';
type Compass = 'off' | 'asking' | 'on' | 'denied' | 'unavailable';

/** One room's windows: which way they face (by compass or by hand) and what's in the way. */
export default function RoomLightSheet() {
  const { room: param } = useLocalSearchParams<{ room: string }>();
  const name = typeof param === 'string' ? param : '';
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const sheetTop = useSheetTop();
  const saved = usePlantStore((s) => s.profile.rooms?.[name]);
  const setRoomLight = usePlantStore((s) => s.setRoomLight);
  const [windows, setWindows] = useState<Facing[]>(saved?.windows ?? []);
  const [kind, setKind] = useState<Kind | null>(saved ? (saved.windows.length ? 'dirs' : saved.unsure ? 'unsure' : 'none') : null);
  const [shade, setShade] = useState<Shade>(saved?.shade ?? 'none');
  const [compass, setCompass] = useState<Compass>('off');
  const [heading, setHeading] = useState<number | null>(null);
  const [calibrated, setCalibrated] = useState(true);
  const watch = useRef<Location.LocationSubscription | null>(null);
  const stopCompass = () => {
    watch.current?.remove();
    watch.current = null;
  };
  // The permission prompt and the watch start are async: if the sheet closes meanwhile, the watch that
  // arrives afterwards is stopped at once instead of running on in the background.
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
      stopCompass();
    },
    [],
  );
  const close = () => (router.canGoBack() ? router.back() : router.replace('/jungle'));

  const toggle = (f: Facing) => {
    haptics.tap();
    const next = windows.includes(f) ? windows.filter((w) => w !== f) : FACINGS.filter((w) => w === f || windows.includes(w));
    setWindows(next);
    setKind(next.length ? 'dirs' : null);
  };
  const choose = (k: 'unsure' | 'none') => {
    haptics.tap();
    setWindows([]);
    setKind(k);
  };

  const startCompass = async () => {
    haptics.tap();
    if (Platform.OS === 'web') return setCompass('unavailable');
    setCompass('asking');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!mounted.current) return;
      if (status !== 'granted') return setCompass('denied');
      stopCompass();
      const sub = await Location.watchHeadingAsync((h) => {
        setHeading(h.trueHeading >= 0 ? h.trueHeading : h.magHeading);
        // iOS reports 0–3: below 2 the compass is off by more than ~35°.
        setCalibrated(h.accuracy >= 2);
      });
      if (!mounted.current) return sub.remove();
      watch.current = sub;
      setCompass('on');
    } catch {
      setCompass('unavailable');
    }
  };
  const pointed = heading === null ? null : facingOf(heading);
  const usePointed = () => {
    if (!pointed) return;
    haptics.success();
    if (!windows.includes(pointed)) toggle(pointed);
    stopCompass();
    setCompass('off');
    setHeading(null);
  };

  const save = () => {
    if (!kind) return;
    setRoomLight(name, { windows, shade, ...(kind === 'unsure' ? { unsure: true } : {}) });
    haptics.success();
    close();
  };

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: sheetTop + 8, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.toolbar}>
        <GlassButton accessibilityLabel="Close" onPress={close}>
          <Icon d="M6 6l12 12M18 6 6 18" color={c.ink} size={16} width={2.8} />
        </GlassButton>
      </View>
      <View style={{ gap: 4 }}>
        <Title>{name} windows</Title>
        <Text style={[styles.sub, { color: c.inkMuted }]}>Which way do your windows face? Open-plan spaces count as one room.</Text>
      </View>

      {compass === 'on' ? (
        <View style={[styles.compass, { borderColor: c.line, backgroundColor: c.ice }]}>
          <Text style={[styles.compassHint, { color: textOn(c.ice, c) }]}>Stand at the window and point the top of your phone out of it.</Text>
          <Text style={[styles.compassRead, { color: textOn(c.ice, c) }]} accessibilityLiveRegion="polite">
            {pointed ? `${FACING_LABEL[pointed][0].toUpperCase()}${FACING_LABEL[pointed].slice(1)}` : 'Finding north…'}
            {heading !== null && <Text style={styles.compassDeg}> {Math.round(heading)}°</Text>}
          </Text>
          {!calibrated && <Text style={[styles.compassHint, { color: textOn(c.ice, c) }]}>Compass unsure: move your phone in a figure 8, then try again.</Text>}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              title="Cancel"
              bg={c.card}
              onPress={() => {
                stopCompass();
                setCompass('off');
              }}
              style={{ flex: 1 }}
            />
            <Button title={pointed ? `Add ${FACING_LABEL[pointed]} window` : 'Waiting…'} raised bg={c.leaf} disabled={!pointed} onPress={usePointed} style={[{ flex: 2 }, !pointed && { opacity: 0.5 }]} />
          </View>
        </View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Use phone compass. Point your phone out of the window."
          onPress={startCompass}
          disabled={compass === 'asking'}
          style={({ pressed }) => [styles.compassCard, { borderColor: c.line, backgroundColor: c.ice }, pressed && { transform: [{ translateY: 2 }] }]}
        >
          <LineIcon name="compass" color={textOn(c.ice, c)} size={36} width={2} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.cardTitle, { color: textOn(c.ice, c) }]}>Use phone compass</Text>
            <Text style={[styles.cardSub, { color: textOn(c.ice, c) }]}>
              {compass === 'denied'
                ? 'Needs location access, which iOS uses for the compass. Pick below instead, or allow it in Settings.'
                : compass === 'unavailable'
                  ? 'The compass isn’t available here. Pick the direction below.'
                  : 'Point your phone out of the window.'}
            </Text>
          </View>
          <LineIcon name="chevron-right" color={textOn(c.ice, c)} size={18} width={2.4} />
        </Pressable>
      )}
      {compass === 'denied' && (
        <Text accessibilityRole="link" onPress={() => Linking.openSettings()} style={[styles.link, { color: c.ink }]}>
          Open Settings
        </Text>
      )}

      <Text style={[styles.or, { color: c.inkMuted }]}>or choose directions</Text>
      <View style={styles.dirs} accessibilityRole="none">
        {FACINGS.map((f) => {
          const on = windows.includes(f);
          return (
            <Pressable
              key={f}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${FACING_LABEL[f]} window`}
              onPress={() => toggle(f)}
              style={[styles.dir, { borderColor: c.line, backgroundColor: on ? c.ink : c.card }]}
            >
              <DirectionArrow to={f} color={on ? c.bg : c.ink} />
              <Text style={[styles.dirText, { color: on ? c.bg : c.ink }]}>{FACING_LABEL[f][0].toUpperCase() + FACING_LABEL[f].slice(1)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.or, { color: c.inkMuted }]}>Choose all that apply.</Text>
      <View style={styles.dirs}>
        {(['unsure', 'none'] as const).map((k) => {
          const on = kind === k;
          return (
            <Pressable
              key={k}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => choose(k)}
              style={[styles.dir, styles.dashed, { borderColor: c.line, backgroundColor: on ? c.ink : c.card }]}
            >
              <LineIcon name={k === 'unsure' ? 'help' : 'no-window'} color={on ? c.bg : c.ink} size={20} width={2} />
              <Text style={[styles.dirText, { color: on ? c.bg : c.ink, fontSize: 15 }]}>{k === 'unsure' ? 'Not sure' : 'No windows'}</Text>
            </Pressable>
          );
        })}
      </View>

      {kind !== 'none' && (
        <View style={{ gap: 8 }}>
          <View style={{ gap: 2 }}>
            <Text style={[styles.label, { color: c.ink }]}>What blocks the light?</Text>
            <Text style={[styles.cardSub, { color: c.inkMuted }]}>Choose the biggest thing.</Text>
          </View>
          <View style={styles.shades}>
            {SHADES.map((s) => {
              const on = shade === s.id;
              return (
                <Pressable
                  key={s.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={s.label}
                  onPress={() => {
                    haptics.tap();
                    setShade(s.id);
                  }}
                  style={[styles.shade, { borderColor: c.line, backgroundColor: on ? c.ice : c.card, borderWidth: on ? 3 : 2 }]}
                >
                  <Image source={LIGHT_ART[s.id]} style={styles.shadeArt} contentFit="contain" accessibilityElementsHidden />
                  <Text style={[styles.shadeText, { color: on ? textOn(c.ice, c) : c.ink }]}>{s.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

      <Text style={[styles.or, { color: c.inkMuted }]}>You can update this anytime.</Text>
      <Button title="Save room" raised bg={c.leaf} disabled={!kind} onPress={save} style={[{ minHeight: 56 }, !kind && { opacity: 0.45 }]} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 14 },
  toolbar: { flexDirection: 'row' },
  sub: { fontFamily: fonts.bodyHeavy, fontSize: 15 },
  compassCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderRadius: 20, padding: 14 },
  compass: { borderWidth: 2, borderRadius: 20, padding: 14, gap: 10 },
  compassHint: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  compassRead: { fontFamily: fonts.display, fontSize: 34, textAlign: 'center' },
  compassDeg: { fontFamily: fonts.bodyHeavy, fontSize: 18 },
  cardTitle: { fontFamily: fonts.display, fontSize: 18 },
  cardSub: { fontFamily: fonts.bodyHeavy, fontSize: 13 },
  link: { fontFamily: fonts.bodyHeavy, fontSize: 15, textDecorationLine: 'underline', marginTop: -6 },
  or: { fontFamily: fonts.bodyHeavy, fontSize: 14, textAlign: 'center' },
  dirs: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dir: { flexGrow: 1, flexBasis: '45%', minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 2, borderRadius: 16 },
  dashed: { borderStyle: 'dashed', minHeight: 48 },
  dirText: { fontFamily: fonts.bodyHeavy, fontSize: 17 },
  label: { fontFamily: fonts.display, fontSize: 19 },
  shades: { flexDirection: 'row', gap: 8 },
  shade: { flex: 1, alignItems: 'center', gap: 6, borderRadius: 18, padding: 8, paddingBottom: 10 },
  shadeArt: { width: '100%', height: 80 },
  shadeText: { fontFamily: fonts.bodyHeavy, fontSize: 13, textAlign: 'center' },
});
