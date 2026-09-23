import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider, useAuth } from '../auth/AuthProvider';
import { PdfEngineProvider } from '../pdf/PdfEngine';
import { ScheduleProvider, useSchedule } from '../schedule/ScheduleProvider';
import { SettingsProvider, useSettings } from '../settings/SettingsProvider';
import { BootScreen } from '../ui/BootScreen';

// Закрывает окно браузера после возврата из FlowID (нужно для web, безвредно на native)
WebBrowser.maybeCompleteAuthSession();
SplashScreen.preventAutoHideAsync().catch(() => undefined);

/** Минимальное время показа заставки, чтобы она не мигала. */
const MIN_BOOT_MS = 900;

function RootNavigator() {
  const { theme, ready: settingsReady } = useSettings();
  const { loading: authLoading, user } = useAuth();
  const schedule = useSchedule();
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    SplashScreen.hideAsync().catch(() => undefined);
    const id = setTimeout(() => setMinTimePassed(true), MIN_BOOT_MS);
    return () => clearTimeout(id);
  }, []);

  if (!settingsReady || authLoading || schedule.booting || !minTimePassed) return <BootScreen />;

  const signedIn = user !== null;
  const hasGroup = schedule.group !== null;

  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      {/* вход ↔ онбординг ↔ приложение — мягкое затухание; экран пары въезжает справа */}
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg }, animation: 'fade' }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !hasGroup}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && hasGroup}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="lesson/[day]/[pair]" options={{ animation: 'ios_from_right' }} />
        </Stack.Protected>
        {/* сюда возвращается браузер после FlowID; сам вход обрабатывает AuthSession */}
        <Stack.Screen name="oauth" options={{ animation: 'none' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  // Без шрифтов (ошибка загрузки) продолжаем с системным — лучше, чем пустой экран
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <PdfEngineProvider>
          <AuthProvider>
            <ScheduleProvider>
              <RootNavigator />
            </ScheduleProvider>
          </AuthProvider>
        </PdfEngineProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
