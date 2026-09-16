import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { useTrip } from '@/contexts/trip-context';
import { Empty, Action, Body } from '@/components/ui';
import { Screen } from '@/components/screen';
import { useTheme } from '@/hooks/use-theme';
export function TripState() {
  const { isLoading } = useTrip();
  const t = useTheme();
  return (
    <Screen>
      {isLoading ? (
        <View style={{ padding: 64, gap: 20, alignItems: 'center' }}>
          <ActivityIndicator color={t.accent} />
          <Body>Opening your journey…</Body>
        </View>
      ) : (
        <Empty
          title="A journey waiting to happen."
          description="This trip has no saved itinerary yet. Create a fresh plan to start exploring."
          action={
            <Action
              label="Create a journey"
              icon="arrow-forward"
              onPress={() => router.push('/new-trip')}
            />
          }
        />
      )}
    </Screen>
  );
}
