import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Screen } from '@/components/screen';
import { Body, Eyebrow, Heading, Panel, Pill, Empty } from '@/components/ui';
import { CheckButton } from '@/components/check-button';
import { TripState } from '@/components/trip-state';
import { useTheme } from '@/hooks/use-theme';
import { useTrip } from '@/contexts/trip-context';
import { useProgress } from '@/contexts/progress-context';
export default function Food() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const { currentTripData: data } = useTrip();
  const { isDone, toggle } = useProgress();
  const [selected, setSelected] = useState('All tables');
  const [query, setQuery] = useState('');
  if (!data) return <TripState />;
  const groups = ['All tables', 'Cafés', 'Restaurants', 'Drinks', 'Tried & loved'];
  const match = (r: (typeof data.restaurants)[number]) =>
    selected === 'All tables' ||
    (selected === 'Cafés' && r.meal === 'Breakfast') ||
    (selected === 'Restaurants' && ['Lunch', 'Dinner'].includes(r.meal)) ||
    (selected === 'Drinks' && r.meal === 'Drinks') ||
    (selected === 'Tried & loved' && isDone(r.id));
  const items = data.restaurants.filter(
    (r) => match(r) && (r.name + ' ' + r.cuisine).toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Eyebrow>A TASTE OF THE NEIGHBOURHOOD</Eyebrow>
        <Heading large>Good days start at a table.</Heading>
        <Body>
          Morning coffee, long lunches, one more glass. Find your own favourites in{' '}
          {data.destination}.
        </Body>
      </View>
      <Panel
        style={{
          backgroundColor: t.accentSoft,
          borderColor: t.accentSoft,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <Ionicons name="restaurant-outline" size={28} color={t.accent} />
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={{ fontSize: 16, color: t.text, fontWeight: '600' }}>
            Local tables. Real discoveries.
          </Text>
          <Body>
            Independent cafés, restaurants, and bars from OpenStreetMap. Check opening hours before
            visiting.
          </Body>
        </View>
      </Panel>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {groups.map((g) => (
          <Pill key={g} label={g} active={selected === g} onPress={() => setSelected(g)} />
        ))}
      </View>
      <TextInput
        accessibilityLabel="Search restaurants"
        placeholder="Search by name or cuisine…"
        placeholderTextColor={t.placeholder}
        value={query}
        onChangeText={setQuery}
        style={{
          backgroundColor: t.card,
          padding: 15,
          borderWidth: 1,
          borderColor: t.hairline,
          borderRadius: 10,
          color: t.text,
          fontSize: 13,
        }}
      />
      {!items.length && (
        <Empty
          title={
            data.restaurants.length
              ? 'Room for a new favourite.'
              : 'The tables are still being set.'
          }
          description={
            data.restaurants.length
              ? 'Try a different filter, or check off a place after your visit.'
              : 'Restaurant data is unavailable for this journey. Explore the city map for local dining options.'
          }
        />
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
        {items.map((r, i) => (
          <Panel
            key={r.id}
            style={{
              width: width > 1000 ? '31.9%' : width > 700 ? '48.4%' : '100%',
              padding: 22,
              gap: 18,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  backgroundColor: t.accentSoft,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name={r.icon} size={21} color={t.accent} />
              </View>
              <CheckButton
                checked={isDone(r.id)}
                label={`Mark ${r.name} as tried`}
                onToggle={() => toggle(r.id)}
              />
            </View>
            <View style={{ gap: 9 }}>
              <Eyebrow>
                {r.meal === 'Breakfast'
                  ? 'COFFEE & SLOW MORNINGS'
                  : r.meal === 'Drinks'
                    ? 'ONE MORE GLASS'
                    : 'A SEAT AT THE TABLE'}
              </Eyebrow>
              <Text style={{ fontSize: 19, lineHeight: 27, color: t.text, fontWeight: '600' }}>
                {r.name}
              </Text>
              <Text style={{ color: t.accent, fontSize: 12 }}>
                {r.cuisine}
                {r.priceLevel ? ' · ' + '€'.repeat(r.priceLevel) : ''}
              </Text>
            </View>
            <Text
              style={{ fontSize: 12, color: t.textSecondary, lineHeight: 21 }}
              numberOfLines={3}
            >
              {r.description}
            </Text>
            <View
              style={{
                marginTop: 'auto',
                paddingTop: 16,
                borderTopWidth: 1,
                borderColor: t.hairline,
                gap: 10,
              }}
            >
              <Text numberOfLines={1} style={{ color: t.textSecondary, fontSize: 11 }}>
                <Ionicons name="location-outline" size={12} /> {r.neighborhood}
              </Text>
              {r.url && (
                <Pressable onPress={() => Linking.openURL(r.url!).catch(() => {})}>
                  <Text style={{ color: t.accent, fontSize: 12, fontWeight: '600' }}>
                    Find your table ↗
                  </Text>
                </Pressable>
              )}
            </View>
          </Panel>
        ))}
      </View>
    </Screen>
  );
}
