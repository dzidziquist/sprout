import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { canDeleteEvent, usePlantStore } from '@/store/plantStore';
import { GlassButton } from '@/components/GlassButton';
import { Icon } from '@/components/GrowTodayCard';
import { Title } from '@/components/ui';
import * as haptics from '@/lib/haptics';
import { useSheetTop } from '@/lib/sheetTop';
import { fonts } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import type { CareEvent } from '@/types';

const LABEL: Partial<Record<CareEvent['type'], string>> = {
  feed: 'Fed',
  prune: 'Trimmed',
  pest: 'Bug patrol',
  repot: 'Repotted',
  staked: 'Staked',
  refresh: 'Fresh water + nutrients',
  harvest: 'Harvest',
  check: 'Soil check',
  water: 'Watered',
};

/** One entry from a plant's Recent care: when it was, and Delete for ones logged by mistake. */
export default function EntrySheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const sheetTop = useSheetTop();
  const event = usePlantStore((s) => s.events.find((e) => e.id === id));
  const plant = usePlantStore((s) => s.plants.find((p) => p.id === event?.plantId));
  const deleteEvent = usePlantStore((s) => s.deleteEvent);
  const [confirm, setConfirm] = useState(false);
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!event) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  const when = new Date(event.at).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const label = LABEL[event.type] ?? 'Entry';
  const deletable = canDeleteEvent(event);
  const rhythm = event.type === 'check' || event.type === 'water';

  const remove = () => {
    if (!confirm) {
      haptics.tap();
      setConfirm(true);
      return;
    }
    deleteEvent(event.id);
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
      <Title>{label}</Title>
      <Text style={[styles.sub, { color: c.inkMuted }]}>
        {plant ? `${plant.name} · ` : ''}
        {when}
      </Text>
      {event.type === 'harvest' && !!event.amount && (
        <Text style={[styles.body, { color: c.ink }]}>
          {event.amount} {event.unit ?? ''}
        </Text>
      )}
      {deletable ? (
        <Pressable accessibilityRole="button" onPress={remove} style={[styles.delete, { borderColor: c.warn }]}>
          <Text style={[styles.deleteText, { color: c.warn }]}>{confirm ? 'Tap again to delete' : 'Delete this entry'}</Text>
        </Pressable>
      ) : (
        <Text style={[styles.body, { color: c.inkMuted }]}>
          {rhythm
            ? 'Waterings and soil checks stay in the history: the watering rhythm learned from them. If you log one by mistake, tap Undo on Today straight away.'
            : 'This is part of the plant’s story, so it stays in the history.'}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { paddingHorizontal: 20, gap: 14 },
  toolbar: { flexDirection: 'row' },
  sub: { fontFamily: fonts.bodyHeavy, fontSize: 14, marginTop: -8 },
  body: { fontFamily: fonts.bodyHeavy, fontSize: 15, lineHeight: 21 },
  delete: { alignSelf: 'stretch', alignItems: 'center', borderWidth: 2, borderRadius: 16, paddingVertical: 14 },
  deleteText: { fontFamily: fonts.bodyHeavy, fontSize: 16 },
});
