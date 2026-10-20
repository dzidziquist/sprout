import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore } from '@/store/plantStore';
import { SHADE_LABEL, type Facing, type RoomLight, type Shade, type WindowSpot } from '@/engine/light';
import { PlantBuddy } from '@/components/PlantBuddy';
import { GlassButton } from '@/components/GlassButton';
import { Icon } from '@/components/GrowTodayCard';
import { Segmented } from '@/components/Segmented';
import { Title } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { useSheetTop } from '@/lib/sheetTop';
import { fonts } from '@/theme/tokens';
import { useColors } from '@/theme/theme';

const FACINGS: Facing[] = ['N', 'E', 'S', 'W'];
const SPOTS: { id: WindowSpot; label: string }[] = [
  { id: 'sill', label: 'Sill' },
  { id: 'below', label: 'Below' },
  { id: 'near', label: '1 m' },
  { id: 'far', label: 'Far' },
];

/** One room's light: which way its windows face, what's in the way, and where each plant sits. */
export default function RoomLightSheet() {
  const { room: param } = useLocalSearchParams<{ room: string }>();
  const name = typeof param === 'string' ? param : '';
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const sheetTop = useSheetTop();
  const saved = usePlantStore((s) => s.profile.rooms?.[name]);
  const setRoomLight = usePlantStore((s) => s.setRoomLight);
  const updatePlant = usePlantStore((s) => s.updatePlant);
  const plants = usePlantStore((s) => s.plants).filter((p) => !p.archivedAt && !p.rooting && p.placement === 'indoor' && p.room?.trim() === name);
  const room: RoomLight = saved ?? { windows: [], shade: 'none' };
  const close = () => (router.canGoBack() ? router.back() : router.replace('/jungle'));
  const save = (patch: Partial<RoomLight>) => setRoomLight(name, { ...room, ...patch });

  const toggleWindow = (f: Facing) => {
    haptics.tap();
    save({ windows: room.windows.includes(f) ? room.windows.filter((w) => w !== f) : FACINGS.filter((w) => w === f || room.windows.includes(w)) });
  };
  const noWindow = saved !== undefined && room.windows.length === 0;

  return (
    <ScrollView style={{ backgroundColor: c.bg }} contentContainerStyle={[styles.page, { paddingTop: sheetTop + 8, paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.toolbar}>
        <GlassButton accessibilityLabel="Close" onPress={close}>
          <Icon d="M6 6l12 12M18 6 6 18" color={c.ink} size={16} width={2.8} />
        </GlassButton>
      </View>
      <Title>{name} light</Title>

      <View style={{ gap: 8 }}>
        <Text style={[styles.label, { color: c.ink }]}>Windows face</Text>
        <View style={[styles.segment, { borderColor: c.line, backgroundColor: c.card }]}>
          {FACINGS.map((f) => {
            const on = room.windows.includes(f);
            return (
              <Pressable key={f} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={`${f} window`} onPress={() => toggleWindow(f)} style={[styles.segBtn, on && { backgroundColor: c.ink }]}>
                <Text style={[styles.segText, { color: on ? c.bg : c.ink }]}>{f}</Text>
              </Pressable>
            );
          })}
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: noWindow }}
            accessibilityLabel="No window"
            onPress={() => {
              haptics.tap();
              save({ windows: [] });
            }}
            style={[styles.segBtn, { flex: 1.4 }, noWindow && { backgroundColor: c.ink }]}
          >
            <Text style={[styles.segText, { color: noWindow ? c.bg : c.ink, fontSize: 13 }]}>None</Text>
          </Pressable>
        </View>
        <Text style={[styles.note, { color: c.inkMuted }]}>Pick every way the room’s windows face. Not sure? Your phone’s Compass app tells you, standing at the window. Open-plan spaces count as one room.</Text>
      </View>

      {room.windows.length > 0 && (
        <View style={{ gap: 8 }}>
          <Text style={[styles.label, { color: c.ink }]}>In the way</Text>
          <Segmented<Shade>
            label="In the way"
            value={room.shade}
            options={(['none', 'sheer', 'outside'] as Shade[]).map((s) => ({ id: s, label: SHADE_LABEL[s] }))}
            onChange={(shade) => save({ shade })}
          />
        </View>
      )}

      {plants.length > 0 && room.windows.length > 0 && (
        <View style={{ gap: 4 }}>
          <Text style={[styles.label, { color: c.ink, marginBottom: 4 }]}>Where each plant sits</Text>
          {plants.map((p, i) => (
            <View key={p.id} style={[styles.plantRow, i < plants.length - 1 && { borderBottomWidth: 1.5, borderColor: c.cloud }]}>
              <PlantBuddy speciesId={p.speciesId} pot={p.potColor} mood="happy" size={36} bg={c.bg} />
              <Text style={[styles.plantName, { color: c.ink }]} numberOfLines={1}>{p.name}</Text>
              <View style={styles.spots} accessibilityRole="radiogroup" accessibilityLabel={`Where ${p.name} sits`}>
                {SPOTS.map((s) => {
                  const on = p.windowSpot === s.id;
                  return (
                    <Pressable
                      key={s.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: on }}
                      accessibilityLabel={s.label}
                      onPress={() => {
                        haptics.tap();
                        updatePlant(p.id, { windowSpot: s.id });
                      }}
                      style={[styles.spot, { borderColor: on ? c.line : c.cloud, backgroundColor: on ? c.butter : c.card }]}
                    >
                      <Text style={[styles.spotText, { color: on ? c.onBright : c.inkMuted }]}>{s.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
          <Text style={[styles.note, { color: c.inkMuted, marginTop: 6 }]}>Below means on the floor or a stool under the window: bright, but little direct sun.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 18 },
  toolbar: { flexDirection: 'row' },
  label: { fontFamily: fonts.displaySemi, fontSize: 16 },
  note: { fontFamily: fonts.bodyHeavy, fontSize: 12, lineHeight: 17 },
  segment: { flexDirection: 'row', gap: 4, padding: 4, borderWidth: 2, borderRadius: 16 },
  segBtn: { flex: 1, minHeight: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  segText: { fontFamily: fonts.displaySemi, fontSize: 15 },
  plantRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  plantName: { flex: 1, fontFamily: fonts.displaySemi, fontSize: 15 },
  spots: { flexDirection: 'row', gap: 4 },
  spot: { borderWidth: 2, borderRadius: 10, minWidth: 44, minHeight: 34, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
  spotText: { fontFamily: fonts.bodyHeavy, fontSize: 12 },
});
