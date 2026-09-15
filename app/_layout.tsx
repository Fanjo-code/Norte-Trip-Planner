import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { CityProgressProvider } from '@/contexts/city-progress-context';
import { PreferencesProvider } from '@/contexts/preferences-context';
import { ProgressProvider } from '@/contexts/progress-context';
import { TripProvider } from '@/contexts/trip-context';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <TripProvider>
        <PreferencesProvider>
          <CityProgressProvider>
            <ProgressProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="new-trip" />
                <Stack.Screen name="preferences" />
                <Stack.Screen name="(trip)" />
              </Stack>
              <StatusBar style="auto" />
            </ProgressProvider>
          </CityProgressProvider>
        </PreferencesProvider>
      </TripProvider>
    </ThemeProvider>
  );
}