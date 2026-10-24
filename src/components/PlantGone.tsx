import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Title } from '@/components/ui';
import { useColors } from '@/theme/theme';

/** Shown when a screen's plant no longer exists (deleted, or an old link), so it's never a blank dead end. */
export function PlantGone() {
  const c = useColors();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
      <Title style={{ textAlign: 'center' }}>This plant isn’t in your jungle</Title>
      <Button title="Close" bg={c.leaf} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </View>
  );
}
