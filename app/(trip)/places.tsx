import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Linking, Pressable, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Screen } from '@/components/screen';
import { Body, Eyebrow, Heading, Panel, Pill, ProgressBar, Empty } from '@/components/ui';
import { CheckButton } from '@/components/check-button';
import { TripState } from '@/components/trip-state';
import { useTheme } from '@/hooks/use-theme';
import { useTrip } from '@/contexts/trip-context';
import { useCityProgress } from '@/contexts/city-progress-context';
import { formatPrice } from '@/lib/format';
export default function Places() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const { currentTripData: data } = useTrip();
  const { isPlaceSeen, togglePlaceSeen, getCityRecord, getCityProgress } = useCityProgress();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All places');
  const [status, setStatus] = useState('All');
  if (!data) return <TripState />;
  const categories = ['All places', ...new Set(data.places.map((p) => p.category))];
  const city = getCityRecord(data.destination);
  const items = data.places.filter(
    (p) =>
      (category === 'All places' || p.category === category) &&
      (p.name + ' ' + p.category).toLowerCase().includes(query.toLowerCase()) &&
      (status === 'All' ||
        (status === 'Visited'
          ? isPlaceSeen(data.destination, p.name)
          : !isPlaceSeen(data.destination, p.name))),
  );
  return (
    <Screen>
      <View
        style={{
          flexDirection: width > 800 ? 'row' : 'column',
          gap: 28,
          alignItems: width > 800 ? 'flex-end' : 'stretch',
          justifyContent: 'space-between',
        }}
      >
        <View style={{ gap: 8, flex: 1 }}>
          <Eyebrow>THE CITY, COLLECTED</Eyebrow>
          <Heading large>Places that stay with you.</Heading>
          <Body>Your essential {data.destination} collection. One discovery at a time.</Body>
        </View>
        <Panel style={{ minWidth: 230, padding: 20, gap: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 25 }}>
            <Text style={{ color: t.text, fontSize: 12 }}>
              {city.seen.length} of {city.total} visited
            </Text>
            <Text style={{ color: t.accent, fontWeight: '700', fontSize: 12 }}>
              {Math.round(getCityProgress(data.destination, data.places) * 100)}%
            </Text>
          </View>
          <ProgressBar value={getCityProgress(data.destination, data.places)} />
        </Panel>
      </View>
      <View
        style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'space-between' }}
      >
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: t.card,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: t.hairline,
            paddingHorizontal: 14,
            flex: 1,
            minWidth: 220,
          }}
        >
          <Ionicons name="search-outline" size={17} color={t.icon} />
          <TextInput
            accessibilityLabel="Search places"
            placeholder="Find a place or a little inspiration…"
            placeholderTextColor={t.placeholder}
            value={query}
            onChangeText={setQuery}
            style={{ paddingVertical: 14, color: t.text, flex: 1, fontSize: 13 }}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {['All', 'To visit', 'Visited'].map((s) => (
            <Pill key={s} label={s} active={s === status} onPress={() => setStatus(s)} />
          ))}
        </View>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {categories.map((c) => (
          <Pill key={c} label={c} active={category === c} onPress={() => setCategory(c)} />
        ))}
      </View>
      <Text style={{ fontSize: 11, color: t.textSecondary }}>
        {items.length} places · Sourced from OpenStreetMap
      </Text>
      {!items.length && (
        <Empty
          title="Nothing here, just yet."
          description="Try another search or filter to keep exploring."
        />
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 18 }}>
        {items.map((p, i) => {
          const checked = isPlaceSeen(data.destination, p.name);
          return (
            <Panel
              key={p.id}
              style={{ width: width > 1000 ? '48.8%' : '100%', padding: 24, gap: 18 }}
            >
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: t.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={p.icon} size={21} color={t.accent} />
                </View>
                <View style={{ flex: 1, gap: 7 }}>
                  <Eyebrow>{p.category}</Eyebrow>
                  <Text style={{ fontSize: 18, lineHeight: 25, fontWeight: '600', color: t.text }}>
                    {p.name}
                  </Text>
                </View>
                <CheckButton
                  checked={checked}
                  label={`Mark ${p.name} as ${checked ? 'not visited' : 'visited'}`}
                  onToggle={() => togglePlaceSeen(data.destination, p.name)}
                />
              </View>
              <Text
                style={{ color: t.textSecondary, fontSize: 13, lineHeight: 21 }}
                numberOfLines={3}
              >
                {p.description}
              </Text>
              <View
                style={{
                  borderTopWidth: 1,
                  borderColor: t.hairline,
                  paddingTop: 15,
                  flexDirection: 'row',
                  gap: 12,
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                }}
              >
                <Text style={{ fontSize: 10, color: t.textSecondary }}>
                  {checked ? '✓ In your collection' : p.timeToSpend} ·{' '}
                  {p.price === 0
                    ? 'Free entry'
                    : p.price != null
                      ? formatPrice(p.price)
                      : 'Check admission'}
                </Text>
                {p.url && (
                  <Pressable
                    accessibilityRole="link"
                    onPress={() => Linking.openURL(p.url!).catch(() => {})}
                  >
                    <Text style={{ fontSize: 11, fontWeight: '600', color: t.accent }}>
                      Explore on Maps ↗
                    </Text>
                  </Pressable>
                )}
              </View>
            </Panel>
          );
        })}
      </View>
    </Screen>
  );
}
