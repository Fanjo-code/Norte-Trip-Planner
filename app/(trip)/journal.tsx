import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Screen } from '@/components/screen';
import { Action, Body, Eyebrow, Heading, Panel, Empty } from '@/components/ui';
import { TripState } from '@/components/trip-state';
import { useTheme } from '@/hooks/use-theme';
import { useTrip } from '@/contexts/trip-context';
import { useProgress } from '@/contexts/progress-context';
import { useCityProgress } from '@/contexts/city-progress-context';
import { addDays, formatDate } from '@/lib/format';
import { Fonts } from '@/constants/theme';
export default function Journal() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const { trip, currentTripData: data } = useTrip();
  const { isDone, doneCount, tripStreak } = useProgress();
  const { isPlaceSeen } = useCityProgress();
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    setReady(false);
    setNote('');
    setMessage('');
    AsyncStorage.getItem('norte.note.v1:' + trip.id)
      .then((value) => {
        if (active) setNote(value ?? '');
      })
      .catch(() => {
        if (active) setMessage('Your note could not be loaded.');
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [trip.id]);
  if (!data) return <TripState />;
  const places = data.places.filter((p) => isPlaceSeen(data.destination, p.name));
  const restaurants = data.restaurants.filter((r) => isDone(r.id));
  const days = data.itinerary
    .map((d) => ({ ...d, activities: d.activities.filter((a) => isDone(a.id)) }))
    .filter((d) => d.activities.length);
  const count = doneCount + places.length;
  return (
    <Screen>
      <View style={{ gap: 9 }}>
        <Eyebrow>THE PART YOU TAKE HOME</Eyebrow>
        <Heading large>A journey becomes a memory.</Heading>
        <Body>Your moments in {data.destination}, collected along the way.</Body>
      </View>
      <View style={{ flexDirection: width > 850 ? 'row' : 'column', gap: 28 }}>
        <View style={{ flex: 1.5, gap: 22 }}>
          {!count ? (
            <Empty
              title="The best pages are still unwritten."
              description="Check off a place, a meal, or a moment in your itinerary. It will find a home here."
            />
          ) : (
            <>
              <Panel
                style={{
                  backgroundColor: t.accentSoft,
                  borderColor: t.accentSoft,
                  flexDirection: 'row',
                  justifyContent: 'space-around',
                }}
              >
                {[
                  { value: places.length, label: 'PLACES VISITED' },
                  { value: restaurants.length, label: 'TABLES TRIED' },
                  { value: tripStreak, label: 'DAY STREAK' },
                ].map((x) => (
                  <View key={x.label} style={{ alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontFamily: Fonts.serif, fontSize: 40, color: t.accent }}>
                      {x.value}
                    </Text>
                    <Text style={{ fontSize: 9, letterSpacing: 1, color: t.textSecondary }}>
                      {x.label}
                    </Text>
                  </View>
                ))}
              </Panel>
              {days.map((day) => (
                <View key={day.day} style={{ gap: 14 }}>
                  <Eyebrow>
                    DAY {day.day} · {formatDate(addDays(trip.startDate, day.day - 1))}
                  </Eyebrow>
                  <Panel>
                    {day.activities.map((a, i) => (
                      <View
                        key={a.id}
                        style={{
                          flexDirection: 'row',
                          gap: 14,
                          alignItems: 'center',
                          paddingTop: i ? 15 : 0,
                          borderTopWidth: i ? 1 : 0,
                          borderColor: t.hairline,
                        }}
                      >
                        <Ionicons name={a.icon} size={18} color={t.accent} />
                        <View style={{ gap: 6, flex: 1 }}>
                          <Text style={{ color: t.text, fontSize: 14, fontWeight: '600' }}>
                            {a.title}
                          </Text>
                          <Text style={{ color: t.textSecondary, fontSize: 11 }}>
                            {a.time} · {a.place}
                          </Text>
                        </View>
                        <Ionicons name="checkmark" size={15} color={t.accent} />
                      </View>
                    ))}
                  </Panel>
                </View>
              ))}
              {places.length > 0 && (
                <View style={{ gap: 14 }}>
                  <Heading>Places you made your own</Heading>
                  <Panel>
                    {places.map((p, i) => (
                      <View
                        key={p.id}
                        style={{
                          flexDirection: 'row',
                          gap: 14,
                          alignItems: 'center',
                          paddingTop: i ? 14 : 0,
                          borderTopWidth: i ? 1 : 0,
                          borderColor: t.hairline,
                        }}
                      >
                        <Ionicons name={p.icon} size={18} color={t.accent} />
                        <View style={{ flex: 1, gap: 5 }}>
                          <Text style={{ color: t.text, fontSize: 14 }}>{p.name}</Text>
                          <Text style={{ color: t.textSecondary, fontSize: 11 }}>{p.category}</Text>
                        </View>
                        <Ionicons name="bookmark" size={15} color={t.accent} />
                      </View>
                    ))}
                  </Panel>
                </View>
              )}
              {restaurants.length > 0 && (
                <View style={{ gap: 14 }}>
                  <Heading>A taste to remember</Heading>
                  <Panel>
                    {restaurants.map((r) => (
                      <View
                        key={r.id}
                        style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}
                      >
                        <Ionicons name={r.icon} size={18} color={t.accent} />
                        <View style={{ flex: 1, gap: 6 }}>
                          <Text style={{ color: t.text, fontSize: 14 }}>{r.name}</Text>
                          <Text style={{ color: t.textSecondary, fontSize: 11 }}>{r.cuisine}</Text>
                        </View>
                      </View>
                    ))}
                  </Panel>
                </View>
              )}
            </>
          )}
        </View>
        <View style={{ flex: 1, gap: 20 }}>
          <Panel>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Eyebrow>A NOTE TO YOUR FUTURE SELF</Eyebrow>
              <Ionicons name="pencil-outline" size={18} color={t.accent} />
            </View>
            <Heading>Remember this.</Heading>
            <Body>A little detail. A favourite corner. Something you don’t want to forget.</Body>
            <TextInput
              accessibilityLabel="Journey note"
              multiline
              maxLength={5000}
              placeholder="That first coffee by the river…"
              placeholderTextColor={t.placeholder}
              value={note}
              editable={ready}
              onChangeText={(s) => {
                setNote(s);
                setMessage('Unsaved changes');
              }}
              style={{
                minHeight: 200,
                textAlignVertical: 'top',
                padding: 16,
                backgroundColor: t.background,
                borderWidth: 1,
                borderColor: t.hairline,
                borderRadius: 9,
                fontSize: 14,
                lineHeight: 24,
                color: t.text,
              }}
            />
            <Action
              label="Save this memory"
              icon="bookmark-outline"
              disabled={!ready}
              onPress={async () => {
                try {
                  await AsyncStorage.setItem('norte.note.v1:' + trip.id, note);
                  setMessage('Saved on this device.');
                } catch {
                  setMessage('Could not save. Please try again.');
                }
              }}
            />
            <Text accessibilityLiveRegion="polite" style={{ fontSize: 11, color: t.textSecondary }}>
              {message || 'Private to this device. Just for you.'}
            </Text>
          </Panel>
          <Text
            style={{
              fontFamily: Fonts.serif,
              fontSize: 25,
              lineHeight: 35,
              color: t.accent,
              padding: 20,
            }}
          >
            “Not all those who wander are lost.”
            <Text style={{ fontFamily: Fonts.sans, fontSize: 10 }}>\nJ. R. R. TOLKIEN</Text>
          </Text>
        </View>
      </View>
    </Screen>
  );
}
