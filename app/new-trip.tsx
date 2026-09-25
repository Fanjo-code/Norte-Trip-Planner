import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { Screen } from '@/components/screen';
import { Action, Body, Eyebrow, Heading, Panel, Pill } from '@/components/ui';
import { DateField, TextField } from '@/components/field';
import { useTheme } from '@/hooks/use-theme';
import { useTrip } from '@/contexts/trip-context';
import { usePreferences, PACE_LABELS, BUDGET_LABELS } from '@/contexts/preferences-context';
import { createCoreTrip, searchCities } from '@/services/travel';
import { isAiAvailable } from '@/services/ai';
import type { LocationIdentity } from '@/types/trip';
import { addDays, daysBetween, formatDateRange, localISO } from '@/lib/format';
import { getDestinationImage } from '@/data/destinations';
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export default function NewTrip() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ destination?: string }>();
  const [destination, setDestination] = useState(params.destination ?? '');
  const { prefs } = usePreferences();
  const { addTrip, beginEnrichment, setGenerating } = useTrip();
  const [start, setStart] = useState(addDays(new Date(), 1));
  const [end, setEnd] = useState(addDays(new Date(), 4));
  const [mode, setMode] = useState<'exact' | 'flexible'>('exact');
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [duration, setDuration] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [planningMessage, setPlanningMessage] = useState('Resolving your destination…');
  const [locations, setLocations] = useState<LocationIdentity[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<LocationIdentity | null>(null);
  const abort = useRef<AbortController | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [useAi, setUseAi] = useState(true);
  useEffect(() => {
    let active = true;
    void isAiAvailable().then((value) => {
      if (active) setAiAvailable(value);
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(
    () => () => {
      abort.current?.abort();
    },
    [],
  );
  let flexibleStart = new Date(year, month, 1, 12);
  if (localISO(flexibleStart) < localISO(new Date())) flexibleStart = addDays(new Date(), 1);
  while (flexibleStart.getDay() !== 2) flexibleStart = addDays(flexibleStart, 1);
  const flexibleEnd = addDays(flexibleStart, duration - 1);
  const flexibleValid = flexibleStart.getMonth() === month && flexibleEnd.getMonth() === month;
  const finalStart = mode === 'exact' ? start : flexibleStart,
    finalEnd = mode === 'exact' ? end : flexibleEnd;
  const handlePlan = async () => {
    if (!destination.trim()) {
      setError('Where would you like to go? Enter a city name.');
      return;
    }
    if (
      !Number.isFinite(finalStart.getTime()) ||
      !Number.isFinite(finalEnd.getTime()) ||
      localISO(finalEnd) < localISO(finalStart) ||
      localISO(finalStart) < localISO(new Date())
    ) {
      setError('Choose a start date from today onwards, with an end date on or after it.');
      return;
    }
    if (mode === 'flexible' && !flexibleValid) {
      setError('There isn’t enough room left in this month. Choose another month.');
      return;
    }
    if (daysBetween(finalStart, finalEnd) > 30) {
      setError('Keep each city journey to 30 days or fewer.');
      return;
    }
    const controller = new AbortController();
    abort.current = controller;
    setLoading(true);
    setGenerating(true);
    setError('');
    try {
      let location = selectedLocation;
      if (!location) {
        setPlanningMessage('Finding matching cities…');
        const matches = await searchCities(destination.trim(), controller.signal);
        if (controller.signal.aborted) return;
        setLocations(matches);
        if (!matches.length) throw new Error('No matching city was found. Try a nearby city name.');
        if (matches.length > 1) return;
        location = matches[0];
        setSelectedLocation(location);
      }
      setPlanningMessage('Finding verified landmarks…');
      const data = await createCoreTrip(
        location,
        finalStart,
        finalEnd,
        prefs,
        useAi,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      if (!data) throw new Error('No plan was returned. Please try again.');
      const id = addTrip(
        { destination: data.destination, startDate: finalStart, endDate: finalEnd },
        data,
      );
      beginEnrichment(id, prefs);
      router.replace('/(trip)/overview');
    } catch (e) {
      if (!controller.signal.aborted)
        setError(
          e instanceof Error &&
            e.name !== 'AbortError' &&
            e.name !== 'FetchRequestCanceledException'
            ? e.message
            : 'The city service took too long to respond. Please try again.',
        );
    } finally {
      if (abort.current === controller) {
        setLoading(false);
        setGenerating(false);
      }
    }
  };
  return (
    <Screen contentStyle={{ maxWidth: 1120 }}>
      <Pressable
        onPress={() => router.navigate('/')}
        style={{ alignSelf: 'flex-start', flexDirection: 'row', gap: 7, alignItems: 'center' }}
      >
        <Ionicons name="arrow-back" size={15} color={t.accent} />
        <Text style={{ fontSize: 12, color: t.accent }}>Back to your journeys</Text>
      </Pressable>
      <View style={{ flexDirection: width > 800 ? 'row' : 'column', gap: width > 800 ? 52 : 24 }}>
        <View style={{ flex: 1.3, gap: 24 }}>
          <View style={{ gap: 10 }}>
            <Eyebrow>A NEW CHAPTER</Eyebrow>
            <Heading large>Where to next?</Heading>
            <Body>A few little details. A whole city of possibilities.</Body>
          </View>
          {loading ? (
            <Panel style={{ paddingVertical: 48, alignItems: 'center', gap: 25 }}>
              <ActivityIndicator size="large" color={t.accent} />
              <Heading>Getting to know {destination}.</Heading>
              <Body>{planningMessage}</Body>
              <Text style={{ color: t.textSecondary, fontSize: 12 }}>
                Your plan uses real places, with room for spontaneity.
              </Text>
              <Action
                label="Cancel planning"
                subtle
                onPress={() => {
                  abort.current?.abort();
                  setLoading(false);
                  setGenerating(false);
                }}
              />
            </Panel>
          ) : (
            <>
              <Panel style={{ gap: 24 }}>
                <TextField
                  label="Which city is calling?"
                  icon="location-outline"
                  placeholder="Try Porto, Paris, or Rome…"
                  value={destination}
                  onChangeText={(value) => {
                    setDestination(value);
                    setSelectedLocation(null);
                    setLocations([]);
                  }}
                  autoCapitalize="words"
                />
                {locations.length > 0 && (
                  <View style={{ gap: 8 }}>
                    <Text style={{ color: t.text, fontSize: 13, fontWeight: '600' }}>
                      Choose the right place
                    </Text>
                    {locations.map((location) => (
                      <Pressable
                        key={location.id}
                        onPress={() => setSelectedLocation(location)}
                        style={{
                          padding: 12,
                          borderRadius: 10,
                          borderWidth: 1,
                          borderColor: selectedLocation?.id === location.id ? t.accent : t.hairline,
                          backgroundColor:
                            selectedLocation?.id === location.id ? t.accentSoft : t.card,
                        }}
                      >
                        <Text style={{ color: t.text, fontSize: 13 }}>{location.displayName}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pill
                    label="I know my dates"
                    active={mode === 'exact'}
                    onPress={() => setMode('exact')}
                  />
                  <Pill
                    label="I’m flexible"
                    active={mode === 'flexible'}
                    onPress={() => setMode('flexible')}
                  />
                </View>
                {mode === 'exact' ? (
                  <View style={{ flexDirection: width < 600 ? 'column' : 'row', gap: 16 }}>
                    <DateField
                      label="Arriving"
                      value={start}
                      minimumDate={new Date()}
                      onChange={(d) => {
                        setStart(d);
                        if (d > end) setEnd(addDays(d, 3));
                      }}
                    />
                    <DateField
                      label="Heading home"
                      value={end}
                      minimumDate={start}
                      onChange={setEnd}
                    />
                  </View>
                ) : (
                  <View style={{ gap: 16 }}>
                    <Body>
                      Start on a Tuesday, with a little more room to wander. Review the suggested
                      dates below.
                    </Body>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      {[new Date().getFullYear(), new Date().getFullYear() + 1].map((y) => (
                        <Pill
                          key={y}
                          label={String(y)}
                          active={y === year}
                          onPress={() => setYear(y)}
                        />
                      ))}
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
                      {months.map((m, i) => (
                        <Pill key={m} label={m} active={i === month} onPress={() => setMonth(i)} />
                      ))}
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {[3, 5, 7, 10, 14].map((n) => (
                        <Pill
                          key={n}
                          label={n + ' days'}
                          active={duration === n}
                          onPress={() => setDuration(n)}
                        />
                      ))}
                    </View>
                    <Text style={{ color: flexibleValid ? t.accent : t.danger, fontSize: 12 }}>
                      {flexibleValid
                        ? formatDateRange(flexibleStart, flexibleEnd)
                        : 'Choose a later month for this length of trip.'}
                    </Text>
                  </View>
                )}
                <View style={{ height: 1, backgroundColor: t.hairline }} />
                <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                  <Ionicons name="options-outline" size={20} color={t.accent} />
                  <View style={{ flex: 1, gap: 5 }}>
                    <Text style={{ fontSize: 13, color: t.text, fontWeight: '600' }}>
                      A journey that feels like you
                    </Text>
                    <Text style={{ fontSize: 12, color: t.textSecondary }}>
                      {PACE_LABELS[prefs.pace]} pace · {BUDGET_LABELS[prefs.budget]} dining
                    </Text>
                  </View>
                  <Pressable onPress={() => router.push('/preferences')}>
                    <Text style={{ fontSize: 12, color: t.accent }}>Edit ↗</Text>
                  </Pressable>
                </View>
                <Text style={{ fontSize: 11, color: t.textSecondary }}>
                  AI itinerary — always on.
                </Text>
              </Panel>
              {Boolean(error) && (
                <View
                  accessibilityRole="alert"
                  style={{
                    backgroundColor: t.card,
                    padding: 18,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: t.danger,
                    gap: 8,
                  }}
                >
                  <Text selectable style={{ color: t.danger, fontSize: 13, lineHeight: 21 }}>
                    {error}
                  </Text>
                  <Text style={{ color: t.textSecondary, fontSize: 12 }}>
                    Your details are kept here so you can try again.
                  </Text>
                </View>
              )}
              <Action
                label={selectedLocation ? 'Create my journey' : 'Find my city'}
                icon="arrow-forward"
                onPress={handlePlan}
              />
              <Text style={{ textAlign: 'center', fontSize: 11, color: t.textSecondary }}>
                No bookings. No rush. Just a very good plan.
              </Text>
            </>
          )}
        </View>
        <View style={{ flex: 1, gap: 24 }}>
          <View style={{ borderRadius: 18, overflow: 'hidden' }}>
            <Image
              source={{ uri: getDestinationImage(destination) || getDestinationImage('porto')! }}
              style={{ height: width > 800 ? 360 : 220 }}
              contentFit="cover"
            />
          </View>
          <Panel style={{ backgroundColor: t.accentSoft, borderColor: t.accentSoft }}>
            <Eyebrow>LESS ADMIN. MORE ADVENTURE.</Eyebrow>
            <Heading>The details, considered.</Heading>
            {[
              ['map-outline', 'Real places worth your time'],
              ['walk-outline', 'Sights grouped by neighbourhood'],
              ['bookmark-outline', 'Your itinerary, saved for later'],
            ].map(([icon, title]) => (
              <View key={title} style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Ionicons name={icon as 'map-outline'} size={17} color={t.accent} />
                <Text style={{ color: t.text, fontSize: 13 }}>{title}</Text>
              </View>
            ))}
          </Panel>
        </View>
      </View>
    </Screen>
  );
}
