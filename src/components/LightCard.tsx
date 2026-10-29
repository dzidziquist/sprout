import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlantStore } from '@/store/plantStore';
import { FIT_LABEL, SPOT_LABEL, hasWindow, lightNeed, lightTip, placeOf, roomsInUse, spotLight, suits, yearFit, windowName } from '@/engine/light';
import { readingsHere, spotShare, yearBands, yearWords } from '@/engine/lightMeter';
import { useForecast } from '@/lib/weather';
import { useSite } from '@/hooks/useSite';
import { LineIcon } from '@/components/LineIcon';
import { SunIcon } from '@/components/SunIcon';
import { Button, Sticker } from '@/components/ui';
import { fonts, type } from '@/theme/tokens';
import { textOn, useColors } from '@/theme/theme';
import type { Plant, WindowSpot } from '@/types';


/**
 * "Light at this spot" on a plant's page: how its spot suits it (with what to do when it doesn't),
 * where it sits, and a way to compare spots. Indoor plants only; outdoor and grow-light plants keep
 * their light setting in the care rows.
 */
export function LightCard({ plant }: { plant: Plant }) {
  const c = useColors();
  const router = useRouter();
  const climate = usePlantStore((s) => s.profile.climate);
  const plants = usePlantStore((s) => s.plants);
  const rooms = roomsInUse(usePlantStore((s) => s.profile.rooms), plants);
  const roomName = plant.room?.trim();
  const room = roomName ? rooms[roomName] : undefined;
  const place = placeOf(plant, rooms);
  const forecast = useForecast(climate, !!place);
  const site = useSite();
  if (plant.placement !== 'indoor' || plant.rooting || plant.archivedAt) return null;

  const spot = () => router.push(`/spot/${plant.id}`);
  const measure = () => router.push(`/measure/${plant.id}`);
  const now = new Date();
  // Camera readings, when there are any, beat the estimate from the windows: the share of outdoor light
  // they found, carried through each month (see engine/lightMeter).
  // Readings from another spot (before a move) don't count here.
  const readings = readingsHere(plant);
  const share = spotShare(readings);
  const bands = share === null ? null : yearBands(share, site, now.getFullYear(), readings.some((r) => r.sunny));
  const measuredFit = bands ? suits(bands[now.getMonth()], lightNeed(plant)) : null;
  const lastReading = readings[readings.length - 1];
  const measuredOn = lastReading ? new Date(lastReading.at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  // The spot sheet's words, so both say the same thing; a grow-light plant that's dim is short on light, not in the wrong spot.
  const verdictOf = (fit: 'ok' | 'dim' | 'harsh', growLight = false) => (fit === 'dim' && growLight ? 'Short on light' : FIT_LABEL[fit]);
  const measureButton = (
    <Button title={bands ? 'Measure again' : 'Measure with camera'} bg={c.butter} onPress={measure} style={{ minHeight: 48 }} />
  );
  const head = (
    <Text style={[styles.title, { color: c.ink }]} accessibilityRole="header">Light at this spot</Text>
  );

  // Not set up yet: one clear next step.
  if (!place || !room) {
    const [text, action, go] = !roomName
      ? [`Give ${plant.name} a room to see how its light suits it.`, 'Choose a room', () => router.push(`/edit/${plant.id}`)]
      : !room
        ? [`Tell us about the ${roomName.toLowerCase()}’s windows to see how ${plant.name}’s light suits it.`, `Set up ${roomName}`, () => router.push({ pathname: '/room-light', params: { room: roomName } })]
        : [`Where does ${plant.name} sit in the ${roomName.toLowerCase()}?`, 'Set position', spot];
    if (bands && measuredFit) {
      const fill = measuredFit === 'ok' ? c.mint : c.butter;
      return (
        <Sticker drop={3} style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
          <View style={{ padding: 14, paddingBottom: 0 }}>{head}</View>
          <View style={[styles.verdict, { backgroundColor: fill, borderColor: c.line }]}>
            <SunIcon color={textOn(fill, c)} size={26} width={2.2} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.headline, { color: textOn(fill, c) }]}>{verdictOf(measuredFit)}</Text>
              <Text style={[styles.detail, { color: textOn(fill, c) }]}>{yearWords(bands)}</Text>
            </View>
          </View>
          <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
            {measureButton}
            <Text style={[styles.small, { color: c.inkMuted, textAlign: 'center' }]}>From your camera reading on {measuredOn}, carried through the seasons.</Text>
          </View>
        </Sticker>
      );
    }
    return (
      <Sticker drop={3} style={styles.card}>
        {head}
        <Text style={[styles.body, { color: c.ink }]}>{text}</Text>
        <Button title={action} raised bg={c.leaf} onPress={go} style={{ minHeight: 50 }} />
        {measureButton}
        <Text style={[styles.small, { color: c.inkMuted, textAlign: 'center' }]}>Or measure the light where {plant.name} sits right now.</Text>
      </Sticker>
    );
  }

  const windowless = !hasWindow(room);
  const here = spotLight(place.room, place.spot, site, now, { windowId: place.windowId });
  const fit = measuredFit ?? suits(here.level, lightNeed(plant));
  const tip = lightTip(plant, { site, now, rooms, forecast });
  // The verdict is the spot on a typical day, the same as the spot sheet says. A hot day or a grey week only
  // adds a note under it, so a good spot doesn't turn into a warning with the weather.
  const weather = tip?.kind === 'heat' || tip?.kind === 'grey' ? tip.text : null;
  const advice = weather ? null : tip?.text;
  const headline = verdictOf(fit, tip?.growLight);
  const detail = bands ? yearWords(bands) : advice ?? (windowless ? 'No window here, so low light all year.' : yearFit(plant, place.room, place.spot, site, now, here.windowId));
  const fill = fit === 'ok' ? c.mint : c.butter;
  const ink = textOn(fill, c);
  const by = place.room.windows.find((w) => w.id === here.windowId);
  const window = by ? windowName(by) : roomName;

  return (
    <Sticker drop={3} style={[styles.card, { padding: 0, overflow: 'hidden' }]}>
      <View style={{ padding: 14, paddingBottom: 0 }}>{head}</View>
      <View style={[styles.verdict, { backgroundColor: fill, borderColor: c.line }]}>
        <SunIcon color={ink} size={26} width={2.2} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.headline, { color: ink }]}>{headline}</Text>
          <Text style={[styles.detail, { color: ink }]}>{detail}</Text>
          {!!weather && <Text style={[styles.detail, { color: ink, marginTop: 6 }]}>{weather}</Text>}
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={windowless ? `In the ${roomName}, which has no window. Edit room` : `Sits ${SPOT_LABEL[place.spot].toLowerCase()}, ${window}. Change`}
        onPress={windowless ? () => router.push({ pathname: '/room-light', params: { room: place.name } }) : spot}
        style={({ pressed }) => [styles.sits, { borderColor: c.cloud }, pressed && { opacity: 0.7 }]}
      >
        <LineIcon name={windowless ? 'no-window' : 'window'} color={c.ink} size={24} width={2} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.small, { color: c.inkMuted }]}>{windowless ? 'In' : 'Sits at'}</Text>
          <Text style={[styles.body, { color: c.ink }]}>{windowless ? `${place.name} · no window` : `${SPOT_LABEL[place.spot]} · ${window}`}</Text>
        </View>
        <View style={[styles.change, { borderColor: c.line }]}>
          <Text style={[styles.changeText, { color: c.ink }]}>{windowless ? 'Edit room' : 'Change'}</Text>
        </View>
      </Pressable>
      <View style={{ paddingHorizontal: 14, paddingBottom: 14, gap: 8 }}>
        {!windowless && <Button title="Compare spots" raised bg={c.leaf} onPress={spot} style={{ minHeight: 50 }} />}
        {measureButton}
        <Text style={[styles.small, { color: c.inkMuted, textAlign: 'center' }]}>
          {bands
            ? `From your camera reading on ${measuredOn}, carried through the seasons.`
            : `Estimated from your windows, where ${plant.name} sits and the sun at this time of year.`}
        </Text>
      </View>
    </Sticker>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, padding: 14 },
  title: { fontFamily: fonts.display, ...type.title3 },
  verdict: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderTopWidth: 2, borderBottomWidth: 2 },
  headline: { fontFamily: fonts.display, ...type.headline },
  detail: { fontFamily: fonts.bodyHeavy, ...type.callout },
  sits: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 4 },
  small: { fontFamily: fonts.bodyHeavy, ...type.caption },
  body: { fontFamily: fonts.bodyHeavy, ...type.body },
  change: { borderWidth: 2, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  changeText: { fontFamily: fonts.bodyHeavy, ...type.callout },
});
