import { Tabs, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useTrip } from '@/contexts/trip-context';
import type { IoniconName } from '@/types/trip';
const labels: Record<string, { label: string; icon: IoniconName }> = {
  overview: { label: 'City guide', icon: 'compass-outline' },
  itinerary: { label: 'Itinerary', icon: 'calendar-outline' },
  places: { label: 'Places', icon: 'map-outline' },
  food: { label: 'Eat & drink', icon: 'restaurant-outline' },
  journal: { label: 'Journal', icon: 'book-outline' },
};
export default function Layout() {
  const t = useTheme();
  const { trip } = useTrip();
  const { width } = useWindowDimensions();
  return (
    <Tabs
      screenOptions={{ headerShown: false, tabBarPosition: width > 700 ? 'top' : 'bottom' }}
      tabBar={({ state, navigation, insets }) => (
        <View
          style={{
            backgroundColor: t.background,
            borderTopWidth: 1,
            borderTopColor: t.hairline,
            paddingHorizontal: width > 900 ? 48 : 16,
            paddingBottom: width <= 700 ? Math.max(2, insets.bottom - 12) : 0,
            paddingTop: width <= 700 ? 2 : 0,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {width > 900 && (
            <Pressable
              onPress={() => router.navigate('/')}
              style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}
            >
              <Ionicons name="arrow-back" size={15} color={t.accent} />
              <Text style={{ fontSize: 12, color: t.textSecondary }}>{trip.destination}</Text>
            </Pressable>
          )}
          <View
            style={{
              flexDirection: 'row',
              flex: width > 900 ? undefined : 1,
              justifyContent: 'space-around',
              gap: width > 900 ? 16 : 0,
            }}
          >
            {state.routes.map((route, index) => {
              const l = labels[route.name];
              if (!l) return null;
              const active = index === state.index;
              return (
                <Pressable
                  key={route.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={l.label}
                  onPress={() => {
                    const e = navigation.emit({
                      type: 'tabPress',
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!e.defaultPrevented) navigation.navigate(route.name);
                  }}
                  style={{
                    paddingVertical: width > 700 ? 10 : 4,
                    minWidth: 44,
                    flex: width <= 700 ? 1 : undefined,
                    borderBottomWidth: 2,
                    borderColor: active ? t.accent : 'transparent',
                    flexDirection: width > 700 ? 'row' : 'column',
                    alignItems: 'center',
                    gap: 2,
                  }}
                >
                  <Ionicons
                    name={l.icon}
                    size={width > 700 ? 17 : 20}
                    color={active ? t.accent : t.textSecondary}
                  />
                  <Text
                    style={{
                      fontSize: width > 700 ? 12 : 9,
                      fontWeight: active ? '700' : '400',
                      color: active ? t.accent : t.textSecondary,
                      textAlign: 'center',
                    }}
                  >
                    {l.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {width > 1100 && (
            <Text style={{ fontSize: 10, letterSpacing: 1, color: t.textSecondary }}>
              YOUR CITY, YOUR WAY
            </Text>
          )}
        </View>
      )}
    >
      <Tabs.Screen name="overview" />
      <Tabs.Screen name="itinerary" />
      <Tabs.Screen name="places" />
      <Tabs.Screen name="food" />
      <Tabs.Screen name="journal" />
    </Tabs>
  );
}
