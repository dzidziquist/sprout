import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Button, Title } from '@/components/ui';
import { useColors } from '@/theme/theme';

/** An old or mistyped link: a friendly way home instead of the default "Unmatched Route" page. */
export default function NotFound() {
  const c = useColors();
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
      <Title style={{ textAlign: 'center' }}>This page wandered off</Title>
      <Button title="Back to Today" bg={c.leaf} onPress={() => router.replace('/')} />
    </View>
  );
}
