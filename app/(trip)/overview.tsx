import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Text, View, Pressable, useWindowDimensions } from 'react-native';
import { Screen } from '@/components/screen';
import { Hero } from '@/components/hero';
import { TripState } from '@/components/trip-state';
import { Action, Body, Eyebrow, Heading, Panel, ProgressBar } from '@/components/ui';
import { TransportList } from '@/components/transport-list';
import { useTrip } from '@/contexts/trip-context';
import { useCityProgress } from '@/contexts/city-progress-context';
import { useProgress } from '@/contexts/progress-context';
import { usePreferences, PACE_LABELS, BUDGET_LABELS } from '@/contexts/preferences-context';
import { getDestinationImage } from '@/data/destinations';
import { formatDateRange, daysBetween } from '@/lib/format';
import { useTheme } from '@/hooks/use-theme';
import { Fonts } from '@/constants/theme';
export default function Guide() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const {
    trip,
    currentTripData: data,
    storageError,
    retryPlanningStage,
    applyAiSuggestion,
    dismissAiSuggestion,
  } = useTrip();
  const { getCityRecord, getCityProgress } = useCityProgress();
  const { isDone } = useProgress();
  const { prefs } = usePreferences();
  if (!data) return <TripState />;
  const record = getCityRecord(data.destination);
  const percent = Math.round(getCityProgress(data.destination, data.places) * 100);
  return (
    <Screen>
      <Eyebrow>YOUR JOURNEY, BEAUTIFULLY UNFOLDED</Eyebrow>
      <Hero
        title={trip.destination}
        subtitle={`${formatDateRange(trip.startDate, trip.endDate)}  ·  ${daysBetween(trip.startDate, trip.endDate)} days to explore`}
        footer="MAKE A LITTLE ROOM FOR WONDER"
        imageUrl={getDestinationImage(trip.destination)}
      />
      {storageError && <Body>{storageError}</Body>}
      {data.planning && (
        <Panel style={{ gap: 14 }}>
          <Eyebrow>PLANNING UPDATES</Eyebrow>
          {(['restaurants', 'transport', 'ai'] as const).map((name) => {
            const item = data.planning!.stages[name];
            if (name === 'ai' && !data.planning!.aiRequested) return null;
            const label =
              name === 'restaurants'
                ? 'Eat & Drink'
                : name === 'transport'
                  ? 'Transport'
                  : 'AI suggestion';
            return (
              <View key={name} style={{ gap: 6 }}>
                <Text style={{ color: t.text, fontSize: 13, fontWeight: '600' }}>
                  {label}: {item.state === 'running' ? 'updating…' : item.state}
                </Text>
                {item.message && <Body>{item.message}</Body>}
                {(item.state === 'failed' || item.state === 'interrupted') && item.retryable && (
                  <Pressable onPress={() => retryPlanningStage(trip.id, name, prefs)}>
                    <Text style={{ color: t.accent, fontSize: 12 }}>
                      Retry {label.toLowerCase()} ↗
                    </Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </Panel>
      )}
      {data.planning?.aiSuggestion && (
        <Panel style={{ gap: 14, borderColor: t.accent }}>
          <Eyebrow>AI ITINERARY SUGGESTION</Eyebrow>
          <Heading>Review before applying</Heading>
          <Body>The suggestion only rearranges verified places. It cannot change their facts.</Body>
          {data.planning.aiSuggestion.days.map((day) => (
            <View key={day.day} style={{ gap: 4 }}>
              <Text style={{ color: t.text, fontSize: 13, fontWeight: '600' }}>Day {day.day}</Text>
              <Text style={{ color: t.textSecondary, fontSize: 12, lineHeight: 18 }}>
                {day.placeIds
                  .map((id) => data.places.find((place) => place.id === id)?.name)
                  .filter(Boolean)
                  .join(' → ') || 'Flexible day'}
              </Text>
            </View>
          ))}
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Action label="Apply suggestion" onPress={() => applyAiSuggestion(trip.id)} />
            <Action label="Dismiss" subtle onPress={() => dismissAiSuggestion(trip.id)} />
          </View>
        </Panel>
      )}
      <View style={{ flexDirection: width > 850 ? 'row' : 'column', gap: 24 }}>
        <View style={{ flex: 1.8, gap: 24 }}>
          <View style={{ gap: 8 }}>
            <Eyebrow>THE CITY IS YOURS</Eyebrow>
            <Heading>A good place to get a little lost.</Heading>
            <Body>Your days are mapped out. The discoveries in between are up to you.</Body>
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {[
              { v: String(data.places.length), label: 'PLACES TO DISCOVER', icon: 'map-outline' },
              {
                v: String(data.restaurants.length),
                label: 'LOCAL TABLES',
                icon: 'restaurant-outline',
              },
              {
                v: String(daysBetween(trip.startDate, trip.endDate)),
                label: 'DAYS, YOUR WAY',
                icon: 'sunny-outline',
              },
            ].map((x) => (
              <Panel key={x.label} style={{ flex: 1, padding: 18, gap: 10 }}>
                <Ionicons name={x.icon as 'map-outline'} size={18} color={t.accent} />
                <Text style={{ fontFamily: Fonts.serif, fontSize: 32, color: t.text }}>{x.v}</Text>
                <Text style={{ color: t.textSecondary, fontSize: 8, letterSpacing: 1 }}>
                  {x.label}
                </Text>
              </Panel>
            ))}
          </View>
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
          >
            <Heading>Your first day</Heading>
            <Pressable onPress={() => router.navigate('/(trip)/itinerary')}>
              <Text style={{ fontSize: 12, color: t.accent }}>See full itinerary ↗</Text>
            </Pressable>
          </View>
          <Panel>
            {data.itinerary[0]?.activities.slice(0, 3).map((a, i) => (
              <View
                key={a.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 16,
                  paddingVertical: 8,
                  borderTopWidth: i ? 1 : 0,
                  borderColor: t.hairline,
                }}
              >
                <Text style={{ color: t.textSecondary, fontSize: 11, width: 38 }}>{a.time}</Text>
                <View
                  style={{
                    height: 36,
                    width: 36,
                    borderRadius: 18,
                    backgroundColor: t.accentSoft,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Ionicons name={isDone(a.id) ? 'checkmark' : a.icon} size={16} color={t.accent} />
                </View>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={{ fontSize: 14, color: t.text, fontWeight: '600' }}>{a.title}</Text>
                  <Text style={{ fontSize: 11, color: t.textSecondary }} numberOfLines={1}>
                    {a.place}
                  </Text>
                </View>
              </View>
            ))}
            {!data.itinerary[0]?.activities.length && (
              <Body>Explore your Places list to find a starting point.</Body>
            )}
          </Panel>
          <Heading>Getting around</Heading>
          <TransportList transport={data.transport} />
        </View>
        <View style={{ flex: 1, gap: 20 }}>
          <Panel style={{ backgroundColor: t.accentSoft, borderColor: t.accentSoft, gap: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Eyebrow>YOUR CITY COLLECTION</Eyebrow>
              <Ionicons name="flag-outline" size={18} color={t.accent} />
            </View>
            <Text style={{ fontFamily: Fonts.serif, fontSize: 60, color: t.accent }}>
              {percent}
              <Text style={{ fontSize: 25 }}>%</Text>
            </Text>
            <ProgressBar value={percent / 100} />
            <Text style={{ fontSize: 14, color: t.text }}>
              A little more {data.destination}, every day.
            </Text>
            <Body>
              {record.seen.length} of {record.total} collection places visited. Your discoveries
              stay with you across every trip here.
            </Body>
            <Action
              label="Explore your places"
              icon="arrow-forward"
              onPress={() => router.navigate('/(trip)/places')}
            />
          </Panel>
          <Panel>
            <Eyebrow>THE WAY YOU TRAVEL</Eyebrow>
            <Text style={{ fontFamily: Fonts.serif, fontSize: 24, color: t.text }}>
              {PACE_LABELS[prefs.pace]} & curious.
            </Text>
            <Body>
              {BUDGET_LABELS[prefs.budget]} dining ·{' '}
              {prefs.interests.length ? prefs.interests.join(', ') : 'A little bit of everything'}
            </Body>
            <Pressable onPress={() => router.push('/preferences')}>
              <Text style={{ fontSize: 12, color: t.accent }}>Refine your travel style ↗</Text>
            </Pressable>
          </Panel>
          <View style={{ paddingHorizontal: 8, gap: 9 }}>
            <Eyebrow>A NOTE ON YOUR GUIDE</Eyebrow>
            <Body>
              Places sourced from OpenStreetMap. Opening hours and availability can change; check
              before you go.
            </Body>
            {data.notes?.map((note) => (
              <Text key={note} style={{ fontSize: 12, lineHeight: 19, color: t.textSecondary }}>
                {note}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </Screen>
  );
}
