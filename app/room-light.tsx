import { useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore } from '@/store/plantStore';
import { FACING_LABEL, SHADE_LABEL, facingOf, windowName, windowsOf, type Facing, type Shade, type WindowLight } from '@/engine/light';
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
  { id: 'sheer', label: 'Curtain or frosted' },
  { id: 'outside', label: 'Trees / buildings' },
];
type Compass = 'off' | 'asking' | 'on' | 'denied' | 'unavailable';
/** The window being added (index null) or changed: which way it faces ('unsure' when not known) and what's in the way. */
type Draft = { index: number | null; facing: Facing | 'unsure' | null; shade: Shade };

const newId = () => `w${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/** One room's windows, each with which way it faces (by compass or by hand) and what's in its way. */
export default function RoomLightSheet() {
  const { room: param } = useLocalSearchParams<{ room: string }>();
  const name = typeof param === 'string' ? param : '';
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const sheetTop = useSheetTop();
  const saved = usePlantStore((s) => s.profile.rooms?.[name]);
  const setRoomLight = usePlantStore((s) => s.setRoomLight);
  const [windows, setWindows] = useState<WindowLight[]>(() => (saved ? windowsOf(saved) : []));
  // A room being set up for the first time starts by adding its first window.
  const [draft, setDraft] = useState<Draft | null>(() => (saved ? null : { index: null, facing: null, shade: 'none' }));
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

  const edit = (index: number | null) => {
    haptics.tap();
    const w = index === null ? undefined : windows[index];
    setDraft({ index, facing: w ? (w.facing ?? 'unsure') : null, shade: w?.shade ?? 'none' });
  };
  const closeDraft = () => {
    stopCompass();
    setCompass('off');
    setHeading(null);
    setDraft(null);
  };
  const keep = () => {
    if (!draft?.facing) return;
    haptics.success();
    const w: WindowLight = { id: draft.index === null ? newId() : windows[draft.index].id, shade: draft.shade, ...(draft.facing === 'unsure' ? {} : { facing: draft.facing }) };
    setWindows(draft.index === null ? [...windows, w] : windows.map((x, i) => (i === draft.index ? w : x)));
    closeDraft();
  };
  const remove = () => {
    if (draft?.index == null) return;
    haptics.tap();
    setWindows(windows.filter((_, i) => i !== draft.index));
    closeDraft();
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
    if (!pointed || !draft) return;
    haptics.success();
    setDraft({ ...draft, facing: pointed });
    stopCompass();
    setCompass('off');
    setHeading(null);
  };

  const save = () => {
    if (draft) return;
    setRoomLight(name, { windows });
    haptics.success();
    close();
  };

  const editor = draft && (
    <View style={[styles.editor, { borderColor: c.line }]}>
      <Text style={[styles.label, { color: c.ink }]}>{draft.index === null ? (windows.length ? 'Another window' : 'A window') : windowName(windows[draft.index])}</Text>
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
            <Button title={pointed ? `It faces ${FACING_LABEL[pointed]}` : 'Waiting…'} raised bg={c.leaf} disabled={!pointed} onPress={usePointed} style={[{ flex: 2 }, !pointed && { opacity: 0.5 }]} />
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

      <Text style={[styles.or, { color: c.inkMuted }]}>or choose which way it faces</Text>
      <View style={styles.dirs} accessibilityRole="radiogroup">
        {[...FACINGS, 'unsure' as const].map((f) => {
          const on = draft.facing === f;
          return (
            <Pressable
              key={f}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={f === 'unsure' ? 'Not sure which way' : `${FACING_LABEL[f]}`}
              onPress={() => {
                haptics.tap();
                setDraft({ ...draft, facing: f });
              }}
              style={[styles.dir, f === 'unsure' && styles.dashed, { borderColor: c.line, backgroundColor: on ? c.ink : c.card }]}
            >
              {f === 'unsure' ? <LineIcon name="help" color={on ? c.bg : c.ink} size={20} width={2} /> : <DirectionArrow to={f} color={on ? c.bg : c.ink} />}
              <Text style={[styles.dirText, { color: on ? c.bg : c.ink }, f === 'unsure' && { fontSize: 15 }]}>
                {f === 'unsure' ? 'Not sure' : FACING_LABEL[f][0].toUpperCase() + FACING_LABEL[f].slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ gap: 2 }}>
        <Text style={[styles.label, { color: c.ink }]}>What blocks the light?</Text>
        <Text style={[styles.cardSub, { color: c.inkMuted }]}>At this window. Choose the biggest thing.</Text>
      </View>
      <View style={styles.shades}>
        {SHADES.map((sh) => {
          const on = draft.shade === sh.id;
          return (
            <Pressable
              key={sh.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={sh.label}
              onPress={() => {
                haptics.tap();
                setDraft({ ...draft, shade: sh.id });
              }}
              style={[styles.shade, { borderColor: c.line, backgroundColor: on ? c.ice : c.card, borderWidth: on ? 3 : 2 }]}
            >
              <Image source={LIGHT_ART[sh.id]} style={styles.shadeArt} contentFit="contain" accessibilityElementsHidden />
              <Text style={[styles.shadeText, { color: on ? textOn(c.ice, c) : c.ink }]}>{sh.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={{ flexDirection: 'row', gap: 10 }}>
        {draft.index !== null ? (
          <Button title="Remove" bg={c.card} onPress={remove} style={{ flex: 1 }} textStyle={{ color: c.warn }} />
        ) : (
          <Button title="Cancel" bg={c.card} onPress={closeDraft} style={{ flex: 1 }} />
        )}
        <Button title={draft.index === null ? 'Add window' : 'Done'} raised bg={c.leaf} disabled={!draft.facing} onPress={keep} style={[{ flex: 2 }, !draft.facing && { opacity: 0.5 }]} />
      </View>
    </View>
  );

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: sheetTop + 8, paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
      <View style={styles.toolbar}>
        <GlassButton accessibilityLabel="Close" onPress={close}>
          <Icon d="M6 6l12 12M18 6 6 18" color={c.ink} size={16} width={2.8} />
        </GlassButton>
      </View>
      <View style={{ gap: 4 }}>
        <Title>{name} windows</Title>
        <Text style={[styles.sub, { color: c.inkMuted }]}>Add each window in the room. Open-plan spaces count as one room.</Text>
      </View>

      {windows.map((w, i) =>
        draft?.index === i ? (
          <View key={w.id}>{editor}</View>
        ) : (
          <Pressable
            key={w.id}
            accessibilityRole="button"
            accessibilityLabel={`${windowName(w)}, ${SHADE_LABEL[w.shade]}. Edit`}
            disabled={!!draft}
            onPress={() => edit(i)}
            style={({ pressed }) => [styles.card, { borderColor: c.line, backgroundColor: c.card }, (pressed || !!draft) && { opacity: draft ? 0.45 : 0.75 }]}
          >
            <Image source={LIGHT_ART[w.shade]} style={styles.cardArt} contentFit="contain" accessibilityElementsHidden />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.cardTitle, { color: c.ink }]}>{w.facing ? windowName(w) : 'Window, not sure which way'}</Text>
              <Text style={[styles.cardSub, { color: c.inkMuted }]}>{SHADE_LABEL[w.shade]}</Text>
            </View>
            <View style={[styles.chip, { borderColor: c.line }]}>
              <Text style={[styles.chipText, { color: c.ink }]}>Edit</Text>
            </View>
          </Pressable>
        ),
      )}

      {!windows.length && !draft && (
        <View style={[styles.empty, { borderColor: c.inkMuted }]}>
          <LineIcon name="no-window" color={c.inkMuted} size={24} width={2} />
          <Text style={[styles.cardSub, { color: c.inkMuted, flex: 1 }]}>No windows, so plants here get low light all year. Add one if the room has any.</Text>
        </View>
      )}

      {draft?.index === null ? (
        editor
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => edit(null)}
          disabled={!!draft}
          style={({ pressed }) => [styles.add, { borderColor: c.line }, (pressed || !!draft) && { opacity: draft ? 0.45 : 0.75 }]}
        >
          <Text style={[styles.addText, { color: c.ink }]}>＋ Add a window</Text>
        </Pressable>
      )}

      <Text style={[styles.or, { color: c.inkMuted }]}>{draft ? 'Finish this window to save the room.' : 'You can update this anytime.'}</Text>
      <Button title="Save room" raised bg={c.leaf} disabled={!!draft} onPress={save} style={[{ minHeight: 56 }, !!draft && { opacity: 0.45 }]} />
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
  editor: { borderWidth: 2, borderRadius: 22, padding: 14, gap: 12 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 2, borderRadius: 20, padding: 10 },
  cardArt: { width: 64, height: 54 },
  chip: { borderWidth: 2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 4 },
  chipText: { fontFamily: fonts.bodyHeavy, fontSize: 14 },
  empty: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 2, borderStyle: 'dashed', borderRadius: 18, padding: 12 },
  add: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 18, minHeight: 54, alignItems: 'center', justifyContent: 'center' },
  addText: { fontFamily: fonts.bodyHeavy, fontSize: 16 },
});
