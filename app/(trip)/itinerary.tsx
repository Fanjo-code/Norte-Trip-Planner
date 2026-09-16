import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { Screen } from '@/components/screen';
import { Action, Body, Eyebrow, Heading, Panel, Pill, ProgressBar } from '@/components/ui';
import { CheckButton } from '@/components/check-button';
import { TripState } from '@/components/trip-state';
import { RouteMap } from '@/components/route-map';
import { useTheme } from '@/hooks/use-theme';
import { useTrip } from '@/contexts/trip-context';
import { useProgress } from '@/contexts/progress-context';
import { useCityProgress } from '@/contexts/city-progress-context';
import { addDays, formatDate } from '@/lib/format';
import { mapsUrl } from '@/lib/places';
export default function Itinerary() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const { trip, currentTripData: data } = useTrip();
  const { isDone, toggle } = useProgress();
  const { isPlaceSeen, togglePlaceSeen } = useCityProgress();
  const [index, setIndex] = useState(0);
  useEffect(() => setIndex(0), [trip.id]);
  if (!data) return <TripState />;
  const day = data.itinerary[Math.min(index, data.itinerary.length - 1)];
  if (!day)
    return (
      <Screen>
        <Heading>A day to make your own.</Heading>
        <Body>Visit your Places tab for ideas.</Body>
      </Screen>
    );
  const done = day.activities.filter((a) => isDone(a.id)).length;
  return (
    <Screen>
      <View style={{ gap: 8 }}>
        <Eyebrow>ONE DAY AT A TIME</Eyebrow>
        <Heading large>A rhythm for your days.</Heading>
        <Body>A thoughtful plan, with plenty of room to follow your curiosity.</Body>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 10 }}
      >
        {data.itinerary.map((d, i) => (
          <Pill
            key={d.day}
            label={`Day ${d.day} · ${formatDate(addDays(trip.startDate, i))}`}
            active={index === i}
            onPress={() => setIndex(i)}
          />
        ))}
      </ScrollView>
      <View style={{ flexDirection: width > 900 ? 'row' : 'column', gap: 28 }}>
        <View style={{ flex: 1.3, gap: 22 }}>
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <View style={{ gap: 6 }}>
              <Eyebrow>
                {formatDate(addDays(trip.startDate, index))} / DAY {day.day}
              </Eyebrow>
              <Heading>{day.title}</Heading>
            </View>
            <Text style={{ fontSize: 12, color: t.textSecondary }}>
              {done}/{day.activities.length} done
            </Text>
          </View>
          <ProgressBar value={done / day.activities.length} />
          {day.activities.map((a, i) => {
            const checked = isDone(a.id);
            return (
              <View key={a.id} style={{ flexDirection: 'row', gap: 16 }}>
                <View style={{ width: 40, alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 11, color: t.textSecondary }}>{a.time}</Text>
                  <View
                    style={{
                      width: 25,
                      height: 25,
                      borderRadius: 13,
                      borderWidth: 1,
                      borderColor: t.hairline,
                      backgroundColor: checked ? t.accent : t.card,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: checked ? t.badgeText : t.accent, fontSize: 10 }}>
                      {i + 1}
                    </Text>
                  </View>
                  {i < day.activities.length - 1 && (
                    <View style={{ width: 1, flex: 1, backgroundColor: t.hairline }} />
                  )}
                </View>
                <Panel style={{ flex: 1, padding: 20, gap: 12, opacity: checked ? 0.72 : 1 }}>
                  <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
                    <View style={{ flex: 1, gap: 8 }}>
                      <Eyebrow>{a.place}</Eyebrow>
                      <Text
                        style={{ fontSize: 17, fontWeight: '600', color: t.text, lineHeight: 23 }}
                      >
                        {a.title}
                      </Text>
                    </View>
                    <CheckButton
                      checked={checked}
                      label={`Complete ${a.title}`}
                      onToggle={() => {
                        toggle(a.id);
                        if (a.placeName && !checked && !isPlaceSeen(data.destination, a.placeName))
                          togglePlaceSeen(data.destination, a.placeName);
                      }}
                    />
                  </View>
                  <Text
                    style={{ fontSize: 12, lineHeight: 20, color: t.textSecondary }}
                    numberOfLines={3}
                  >
                    {a.description}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 10, color: t.textSecondary }}>
                      {a.duration ?? 'Take your time'}
                    </Text>
                    {a.url && (
                      <Pressable onPress={() => Linking.openURL(a.url!).catch(() => {})}>
                        <Text style={{ color: t.accent, fontSize: 11, fontWeight: '600' }}>
                          Details & directions ↗
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </Panel>
              </View>
            );
          })}
        </View>
        <View style={{ flex: 1, gap: 18 }}>
          <RouteMap key={day.day} activities={day.activities} accent={t.accent} height={400} />
          <Panel style={{ backgroundColor: t.accentSoft, borderColor: t.accentSoft }}>
            <Ionicons name="walk-outline" size={23} color={t.accent} />
            <Heading>The in-between matters.</Heading>
            <Body>
              Nearby sights are grouped together. Take the detour, find a café, and make this day
              your own.
            </Body>
            <Action
              label="Open the day’s route"
              subtle
              icon="arrow-forward"
              onPress={() => Linking.openURL(mapsUrl(day.activities)).catch(() => {})}
            />
          </Panel>
          <Body>
            Checking off a landmark also adds it to your city collection. Unchecking a day’s
            activity keeps your visited-place history.
          </Body>
        </View>
      </View>
    </Screen>
  );
}
