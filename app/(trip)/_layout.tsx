import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { TabIcon } from '@/components/tab-icon';
import { useTheme } from '@/hooks/use-theme';

export default function TripTabLayout() {
  const t = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.accent,
        tabBarInactiveTintColor: t.tabIconDefault,
        tabBarStyle: {
          backgroundColor: t.card,
          borderTopColor: t.hairline,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="overview"
        options={{
          title: 'Guide',
          tabBarIcon: ({ color, size }) => (
            <TabIcon sf="square.grid.2x2" fallback="compass" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="itinerary"
        options={{
          title: 'Itinerary',
          tabBarIcon: ({ color, size }) => (
            <TabIcon sf="calendar" fallback="calendar" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="food"
        options={{
          title: 'Food',
          tabBarIcon: ({ color, size }) => (
            <TabIcon sf="fork.knife" fallback="restaurant" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="places"
        options={{
          title: 'Places',
          tabBarIcon: ({ color, size }) => (
            <TabIcon sf="map" fallback="map" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ color, size }) => (
            <TabIcon sf="book.closed" fallback="book" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
