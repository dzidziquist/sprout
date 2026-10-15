import { Platform } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { TabBar } from '@/components/TabBar';
import { colors } from '@/theme/tokens';
import { usePlantStore } from '@/store/plantStore';
import { useColors } from '@/theme/theme';

/**
 * iOS gets the system tab bar (Liquid Glass on iOS 26, SF Symbols, minimises on scroll).
 * Android and web keep the PlantFam sticker tab bar with the + button.
 */
export default function TabLayout() {
  const onboarded = usePlantStore((s) => s.onboarded);
  const c = useColors();
  if (!onboarded) return <Redirect href="/onboarding" />;

  if (Platform.OS === 'ios') {
    return (
      <NativeTabs tintColor={colors.leafDeep} minimizeBehavior="onScrollDown">
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: 'sun.max', selected: 'sun.max.fill' }} />
          <Label>Today</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="jungle">
          <Icon sf={{ default: 'leaf', selected: 'leaf.fill' }} />
          <Label>Jungle</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="offshoots">
          <Icon sf="point.3.connected.trianglepath.dotted" />
          <Label>Offshoots</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="me">
          <Icon sf={{ default: 'person', selected: 'person.fill' }} />
          <Label>Me</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: c.bg } }}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="jungle" />
      <Tabs.Screen name="offshoots" />
      <Tabs.Screen name="me" />
    </Tabs>
  );
}
