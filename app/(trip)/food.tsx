import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ImageBackground,
  Linking,
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Screen } from '@/components/screen';
import { Body, Eyebrow, Heading, Panel, Pill, Empty } from '@/components/ui';
import { CheckButton } from '@/components/check-button';
import { TripState } from '@/components/trip-state';
import { useTheme } from '@/hooks/use-theme';
import { useTrip } from '@/contexts/trip-context';
import { useProgress } from '@/contexts/progress-context';

const MEAL_IMAGES = {
  Breakfast: 'https://images.unsplash.com/photo-1528699633788-424224dc89b5?w=800&h=600&fit=crop&q=80',
  Meals: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800&h=600&fit=crop&q=80',
  Drinks: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800&h=600&fit=crop&q=80',
};

export default function Food() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const { currentTripData: data } = useTrip();
  const { isDone, toggle } = useProgress();
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  if (!data) return <TripState />;

  const mealCategories = [
    { key: 'Breakfast', label: 'Morning coffee', icon: 'cafe-outline' as const },
    { key: 'Meals', label: 'Lunch & dinner', icon: 'restaurant-outline' as const },
    { key: 'Drinks', label: 'Drinks', icon: 'wine-outline' as const },
  ];

  const mealMap: Record<string, string[]> = {
    Breakfast: ['Breakfast'],
    Meals: ['Lunch', 'Dinner'],
    Drinks: ['Drinks'],
  };

  const match = (r: (typeof data.restaurants)[number]) =>
    !selected ||
    (selected === 'Tried & loved' && isDone(r.id)) ||
    (selected && mealMap[selected] && mealMap[selected].includes(r.meal));

  const items = data.restaurants.filter(
    (r) => match(r) && (r.name + ' ' + r.cuisine).toLowerCase().includes(query.toLowerCase()),
  );

  const getCategoryCount = (mealKey: string) =>
    data.restaurants.filter((r) => mealMap[mealKey]?.includes(r.meal)).length;

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

      {!data.restaurants.length ? (
        <Empty
          title="The tables are still being set."
          description="Restaurant data is unavailable for this journey. Explore the city map for local dining options."
        />
      ) : (
        <>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            {mealCategories.map((cat) => {
              const count = getCategoryCount(cat.key);
              const isActive = selected === cat.key;
              return (
                <Pressable
                  key={cat.key}
                  onPress={() => setSelected(isActive ? null : cat.key)}
                  style={{
                    width: width > 800 ? '48.5%' : '100%',
                    height: 180,
                    borderRadius: 14,
                    overflow: 'hidden',
                    borderWidth: 3,
                    borderColor: isActive ? t.accent : 'transparent',
                  }}
                >
                  <ImageBackground
                    source={{ uri: MEAL_IMAGES[cat.key as keyof typeof MEAL_IMAGES] }}
                    style={{ flex: 1, justifyContent: 'flex-end' }}
                    imageStyle={{ opacity: 0.85 }}
                  >
                    <View
                      style={{
                        backgroundColor: 'rgba(0,0,0,0.65)',
                        padding: 20,
                        gap: 6,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Ionicons name={cat.icon} size={20} color="#FFFFFF" />
                        <Text style={{ fontSize: 20, fontWeight: '700', color: '#FFFFFF', letterSpacing: -0.5, fontFamily: 'Georgia' }}>
                          {cat.label}
                        </Text>
                      </View>
                      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)' }}>
                        {count} {count === 1 ? 'place' : 'places'} to discover
                      </Text>
                    </View>
                  </ImageBackground>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <Pill label="All tables" active={selected === null} onPress={() => setSelected(null)} />
            <Pill
              label="Tried & loved"
              active={selected === 'Tried & loved'}
              onPress={() => setSelected(selected === 'Tried & loved' ? null : 'Tried & loved')}
            />
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
              title="Room for a new favourite."
              description="Try a different filter, or check off a place after your visit."
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
                  numberOfLines={2}
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
        </>
      )}
    </Screen>
  );
}
