import { useEffect, useState } from 'react';
import { Appearance, Platform, View } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { Fredoka_600SemiBold, Fredoka_700Bold } from '@expo-google-fonts/fredoka';
import { Nunito_700Bold, Nunito_800ExtraBold } from '@expo-google-fonts/nunito';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { usePlantStore } from '@/store/plantStore';
import { useColors } from '@/theme/theme';
import { rescheduleRounds, roundAllowed, useNotificationRoute } from '@/lib/notifications';
import { configurePurchases } from '@/lib/purchases';
import { TIPS_ENABLED } from '@/config';
import { refreshSunlight } from '@/lib/site';

// Keep the launch screen up until saved plants and fonts are loaded, so it goes straight to the app
// instead of launch screen, then a spinner, then the app.
SplashScreen.preventAutoHideAsync().catch(() => {});

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
  const router = useRouter();
  // Tapping a photo-day notification opens that plant's page.
  useNotificationRoute(hydrated && !!(fontsLoaded || fontError), (route) => router.push(route as never));

  // Keep the daily plant round in sync with the latest checks and settings.
  useEffect(() => {
    if (!hydrated) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sync = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const { plants, events, profile } = usePlantStore.getState();
        rescheduleRounds(plants, events, profile.round, profile.photos ?? 'monthly', profile.trips).catch(() => {});
      }, 400);
    };
    sync();
    // Reminders shown as on but not allowed (turned off in iOS Settings, or set up before the app asked):
    // show them as off rather than prompting at launch. Turning them on in Settings asks in context.
    const { onboarded, profile, setProfile } = usePlantStore.getState();
    if (onboarded && profile.round.enabled)
      roundAllowed()
        .then((ok) => !ok && setProfile({ round: { ...usePlantStore.getState().profile.round, enabled: false } }))
        .catch(() => {});
    if (TIPS_ENABLED) configurePurchases();
    // The city's measured sunlight for the light estimates: looked up when missing or a year old, and for a new city.
    const sunlight = () => {
      const st = usePlantStore.getState();
      refreshSunlight(st.profile.climate, st.profile.sunlight, st.setSunlight).catch(() => {});
    };
    sunlight();
    const unsub = usePlantStore.subscribe((s, prev) => {
      if (s.plants !== prev.plants || s.profile.round !== prev.profile.round || s.profile.photos !== prev.profile.photos || s.profile.trips !== prev.profile.trips) sync();
      if (s.profile.climate !== prev.profile.climate) sunlight();
    });
    return () => {
      clearTimeout(timer);
      unsub();
    };
  }, [hydrated]);

  const ready = hydrated && !!(fontsLoaded || fontError);
  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  // The launch screen is still showing; this only fills the frame behind it.
  if (!ready) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

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
        <Stack.Screen name="support" options={{ presentation: 'modal' }} />
        <Stack.Screen name="identify" options={{ presentation: 'modal' }} />
        <Stack.Screen name="species/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="wishlist" options={{ presentation: 'modal' }} />
        <Stack.Screen name="photos/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="away" options={{ presentation: 'modal' }} />
        <Stack.Screen name="doctor/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="grow" />
        <Stack.Screen name="help" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="privacy" />
        <Stack.Screen name="coming-up" />
        <Stack.Screen
          name="pot-up/[id]"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.85, 1], sheetGrabberVisible: true, sheetCornerRadius: 38, contentStyle: { backgroundColor: c.bg } }}
        />
        <Stack.Screen
          name="cuttings/[id]"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.9, 1], sheetGrabberVisible: true, sheetCornerRadius: 38, contentStyle: { backgroundColor: c.bg } }}
        />
        <Stack.Screen
          name="badge/[id]"
          options={{ presentation: 'fullScreenModal', animation: 'fade', contentStyle: { backgroundColor: c.bg } }}
        />
        <Stack.Screen
          name="harvest/[id]"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true, sheetCornerRadius: 38, contentStyle: { backgroundColor: c.bg } }}
        />
        <Stack.Screen
          name="room-light"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.9, 1], sheetGrabberVisible: true, sheetCornerRadius: 38, contentStyle: { backgroundColor: c.bg } }}
        />
        <Stack.Screen
          name="spot/[id]"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.9, 1], sheetGrabberVisible: true, sheetCornerRadius: 38, contentStyle: { backgroundColor: c.bg } }}
        />
        <Stack.Screen
          name="note/[id]"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.75, 1], sheetGrabberVisible: true, sheetCornerRadius: 38, contentStyle: { backgroundColor: c.bg } }}
        />
        <Stack.Screen
          name="streak-help"
          options={{ presentation: 'formSheet', sheetAllowedDetents: [0.8, 1], sheetGrabberVisible: true, sheetCornerRadius: 38, contentStyle: { backgroundColor: c.bg } }}
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
