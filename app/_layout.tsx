import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { usePlantStore } from '@/store/plantStore';
import { colors } from '@/theme/tokens';
import { rescheduleRounds } from '@/lib/notifications';

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.white } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="add" options={{ presentation: 'modal' }} />
        <Stack.Screen name="plant/[id]" />
        <Stack.Screen
          name="log/[id]"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.62, 1],
            sheetGrabberVisible: true,
            sheetCornerRadius: 38,
            contentStyle: { backgroundColor: colors.white },
          }}
        />
      </Stack>
    </GestureHandlerRootView>
  );
}
