import { Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';
import { colors } from '@/theme/tokens';

export default function TabLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.white } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="jungle" />
      <Tabs.Screen name="offshoots" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
