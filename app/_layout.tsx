import { AppearanceProvider } from '@/contexts/appearance-context';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { CityProgressProvider } from '@/contexts/city-progress-context';
import { PreferencesProvider } from '@/contexts/preferences-context';
import { ProgressProvider } from '@/contexts/progress-context';
import { TripProvider } from '@/contexts/trip-context';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppShell } from '@/components/app-shell';
import Head from 'expo-router/head';
function NavigationRoot() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Head>
        <title>Norte — Travel with intention</title>
        <meta
          name="description"
          content="Thoughtful city guides, personal itineraries, and a journal of everywhere you go."
        />
      </Head>
      <TripProvider>
        <PreferencesProvider>
          <CityProgressProvider>
            <ProgressProvider>
              <AppShell>
                <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
                  <Stack.Screen name="index" />
                  <Stack.Screen name="new-trip" />
                  <Stack.Screen name="preferences" />
                  <Stack.Screen name="(trip)" />
                </Stack>
              </AppShell>
              <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
            </ProgressProvider>
          </CityProgressProvider>
        </PreferencesProvider>
      </TripProvider>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppearanceProvider>
      <NavigationRoot />
    </AppearanceProvider>
  );
}
