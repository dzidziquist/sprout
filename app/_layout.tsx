import { useEffect, useState } from 'react';
import { ActivityIndicator, Appearance, Platform, View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { usePlantStore } from '@/store/plantStore';
import { colors } from '@/theme/tokens';
import { useColors } from '@/theme/theme';
import { rescheduleRounds } from '@/lib/notifications';
import { configurePurchases } from '@/lib/purchases';

function useHydrated() {
  const [hydrated, setHydrated] = useState(() => usePlantStore.persist.hasHydrated());
  useEffect(() => {
    const unsub = usePlantStore.persist.onFinishHydration(() => setHydrated(true));
    setHydrated(usePlantStore.persist.hasHydrated());
    return unsub;
  }, []);
  return hydrated;
}

export default function RootLayout() {
  const hydrated = useHydrated();
  const c = useColors();
  const themePref = usePlantStore((s) => s.profile.theme);

  // A forced Light/Dark choice also drives native chrome (tabs, sheets, alerts).
  useEffect(() => {
    if (Platform.OS !== 'web') Appearance.setColorScheme(themePref === 'system' ? null : themePref);
  }, [themePref]);
  const [fontsLoaded, fontError] = useFonts({ Fredoka_600SemiBold, Fredoka_700Bold, Nunito_700Bold, Nunito_800ExtraBold });

  // Keep the daily plant round in sync with the latest checks and settings.
  useEffect(() => {
    if (!hydrated) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const { plants, profile } = usePlantStore.getState();
        rescheduleRounds(plants, profile.round.hour, profile.round.minute, profile.round.enabled).catch(() => {});
      }, 400);
    };
    sync();
    configurePurchases();
    const unsub = usePlantStore.subscribe((s, prev) => {
      if (s.plants !== prev.plants || s.profile.round !== prev.profile.round) sync();
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [hydrated]);

  if (!hydrated || !(fontsLoaded || fontError)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.leaf }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }

  return (
    <ThemeProvider value={c.scheme === 'dark' ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: c.bg, card: c.card } } : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: c.bg } }}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: c.bg }}>
      <StatusBar style={c.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="plant/[id]" />
        <Stack.Screen name="edit/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="plus" options={{ presentation: 'modal' }} />
        <Stack.Screen name="identify" options={{ presentation: 'modal' }} />
        <Stack.Screen name="grow" />
        <Stack.Screen name="help" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="privacy" />
        <Stack.Screen
          name="pot-up/[id]"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.85, 1], sheetGrabberVisible: true, sheetCornerRadius: 38, contentStyle: { backgroundColor: c.bg } }}
        />
        <Stack.Screen
          name="cuttings/[id]"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.9, 1], sheetGrabberVisible: true, sheetCornerRadius: 38, contentStyle: { backgroundColor: c.bg } }}
        />
        <Stack.Screen
          name="harvest/[id]"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true, sheetCornerRadius: 38, contentStyle: { backgroundColor: c.bg } }}
        />
        <Stack.Screen
          name="log/[id]"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.62, 1],
            sheetGrabberVisible: true,
            sheetCornerRadius: 38,
            contentStyle: { backgroundColor: c.bg },
          }}
        />
      </Stack>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
