import { useMemo } from 'react';
import { ScrollView } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlantStore } from '@/store/plantStore';
import { formatTotals, harvestStats } from '@/engine/growPatch';
import { CropCard } from '@/components/CropCard';
import { PlantGone } from '@/components/PlantGone';
import { useSheetTop } from '@/lib/sheetTop';
import { useColors } from '@/theme/theme';
import { space } from '@/theme/tokens';

/** One crop's full card, opened from a tile in the Grow patch grid. */
export default function CropSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const sheetTop = useSheetTop();
  const plant = usePlantStore((s) => s.plants.find((p) => p.id === id));
  const events = usePlantStore((s) => s.events);
  const total = useMemo(() => (plant ? formatTotals(harvestStats(events, [plant]).byPlant[plant.id]?.totals) : undefined), [events, plant]);
  if (!plant) return <PlantGone />;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.bg }} contentContainerStyle={{ padding: space.xl, paddingTop: sheetTop + space.lg, paddingBottom: insets.bottom + 32 }}>
      <CropCard plant={plant} total={total} now={new Date()} />
    </ScrollView>
  );
}
