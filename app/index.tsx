import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useState } from 'react';
import { Screen } from '@/components/screen';
import { Action, Body, Eyebrow, Heading, Panel, ProgressBar } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { useTrip } from '@/contexts/trip-context';
import { useCityProgress } from '@/contexts/city-progress-context';
import { getDestinationImage } from '@/data/destinations';
import { fetchImageForCity } from '@/services/ai';
import { daysBetween, formatDateRange, parseDate } from '@/lib/format';
import { Fonts } from '@/constants/theme';
const cities = [
  { name: 'Porto', country: 'PORTUGAL', caption: 'Slow days by the Douro.' },
  { name: 'Paris', country: 'FRANCE', caption: 'Always another reason to return.' },
  { name: 'Rome', country: 'ITALY', caption: 'A little history. A lot of life.' },
];
export default function Home() {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const wide = width > 1000;
  const { trips, selectTrip, deleteTrip, isLoading, storageError } = useTrip();
  const { getCityRecord } = useCityProgress();
  const [query, setQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [remove, setRemove] = useState<string | null>(null);
  const plan = (city: string) =>
    router.push({ pathname: '/new-trip', params: { destination: city } });
  return (
    <Screen>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 8,
        }}
      >
        <Eyebrow>YOUR PERSONAL ATLAS</Eyebrow>
        {wide && (
          <Text style={{ color: t.textSecondary, fontSize: 11 }}>
            Less planning. More being there.
          </Text>
        )}
      </View>
      <View
        style={{
          flexDirection: wide ? 'row' : 'column',
          minHeight: 370,
          borderRadius: 20,
          overflow: 'hidden',
          backgroundColor: t.accentSoft,
          borderWidth: 1,
          borderColor: t.hairline,
        }}
      >
        <View style={{ flex: 1, padding: wide ? 40 : 28, justifyContent: 'center', gap: 22 }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#A9784E' }} />
            <Text style={{ color: t.accent, fontSize: 10, fontWeight: '700', letterSpacing: 1.8 }}>
              GO SOMEWHERE. FEEL SOMETHING.
            </Text>
          </View>
          <Text
            accessibilityRole="header"
            style={{
              fontFamily: Fonts.serif,
              color: t.text,
              fontSize: wide ? 52 : 41,
              lineHeight: wide ? 57 : 47,
              letterSpacing: -1.8,
            }}
          >
            The world is better{wide ? '\n' : ' '}when you’re in it.
          </Text>
          <Body>
            Thoughtful journeys. Local discoveries. A collection of places that become part of you.
          </Body>
          <View style={{ alignSelf: 'flex-start' }}>
            <Action
              label="Find your next journey"
              icon="arrow-forward"
              onPress={() => router.push('/new-trip')}
            />
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Explore Porto"
          onPress={() => plan('Porto')}
          style={{ flex: 1.05, minHeight: wide ? 370 : 250 }}
        >
          <Image
            source={{ uri: getDestinationImage('porto')! }}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
            contentFit="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(19,32,25,.65)']}
            style={{ flex: 1, padding: 28, justifyContent: 'flex-end' }}
          >
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
              }}
            >
              <View style={{ gap: 8 }}>
                <Text style={{ color: '#FFF', letterSpacing: 2, fontSize: 9 }}>
                  THE ART OF TAKING IT SLOW
                </Text>
                <Text style={{ fontFamily: Fonts.serif, fontSize: 32, color: '#FFF' }}>
                  Somewhere in Porto.
                </Text>
                <Text style={{ fontSize: 12, color: '#EDEEE6' }}>41.1579° N · 8.6291° W</Text>
              </View>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  borderColor: '#FFFFFF70',
                  borderWidth: 1,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons
                  name="arrow-up-outline"
                  size={18}
                  color="#FFF"
                  style={{ transform: [{ rotate: '45deg' }] }}
                />
              </View>
            </View>
          </LinearGradient>
        </Pressable>
      </View>
      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          gap: 12,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderColor: t.hairline,
          justifyContent: 'space-between',
        }}
      >
        {[
          ['map-outline', 'Made for wandering'],
          ['leaf-outline', 'At your own pace'],
          ['bookmark-outline', 'Yours to keep'],
        ].map(([icon, label]) => (
          <View
            key={label}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 9, paddingBottom: 16 }}
          >
            <Ionicons name={icon as 'map-outline'} size={16} color={t.accent} />
            <Text style={{ fontSize: 12, color: t.textSecondary }}>{label}</Text>
          </View>
        ))}
      </View>
      {storageError && <Body>{storageError}</Body>}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 20,
        }}
      >
        <View style={{ gap: 5 }}>
          <Eyebrow>THE COLLECTION</Eyebrow>
          <Heading>
            Your journeys
            <Text style={{ color: t.textSecondary, fontSize: 21 }}>
              {' '}
              / {String(trips.length).padStart(2, '0')}
            </Text>
          </Heading>
        </View>
        {trips.length > 0 && (
          <Pressable
            onPress={() => setShowSearch(true)}
            accessibilityLabel="Search saved journeys"
            style={{
              backgroundColor: t.card,
              borderWidth: 1,
              borderColor: t.hairline,
              borderRadius: 8,
              padding: 12,
              minWidth: 44,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="search-outline" size={18} color={t.icon} />
          </Pressable>
        )}
      </View>
      {showSearch && trips.length > 0 && (
        <TextInput
          accessibilityLabel="Search saved journeys"
          placeholder="Search journeys…"
          value={query}
          onChangeText={setQuery}
          placeholderTextColor={t.placeholder}
          autoFocus
          onBlur={() => {
            if (!query) setShowSearch(false);
          }}
          style={{
            backgroundColor: t.card,
            borderWidth: 1,
            borderColor: t.hairline,
            borderRadius: 8,
            padding: 12,
            color: t.text,
            fontSize: 14,
          }}
        />
      )}
      {isLoading ? (
        <ActivityIndicator color={t.accent} />
      ) : trips.length === 0 ? (
        <Pressable
          onPress={() => router.push('/new-trip')}
          accessibilityRole="button"
          accessibilityLabel="Create your first journey"
        >
          <View
            style={{
              borderWidth: 1,
              borderStyle: 'dashed',
              borderColor: t.icon,
              borderRadius: 16,
              padding: 28,
              flexDirection: 'row',
              gap: 20,
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
              <Ionicons name="add" size={24} color={t.accent} />
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={{ fontSize: 16, color: t.text, fontWeight: '600' }}>
                Your next chapter starts here.
              </Text>
              <Body>Choose a city. We’ll help you make it your own.</Body>
            </View>
            <Ionicons name="arrow-forward" size={20} color={t.accent} />
          </View>
        </Pressable>
      ) : (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 20 }}>
          {trips
            .filter((trip) => trip.destination.toLowerCase().includes(query.toLowerCase()))
            .map((trip) => {
              const city = getCityRecord(trip.destination);
              return (
                <View
                  key={trip.id}
                  style={{
                    width: wide ? '31.9%' : '100%',
                    borderWidth: 1,
                    borderColor: t.hairline,
                    borderRadius: 16,
                    backgroundColor: t.card,
                    overflow: 'hidden',
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${trip.destination} journey`}
                    onPress={() => {
                      selectTrip(trip.id);
                      router.push('/(trip)/overview');
                    }}
                  >
                    <Image
                      source={{
                        uri: getDestinationImage(trip.destination) ?? undefined,
                      }}
                      style={{ height: 170, backgroundColor: t.accentSoft }}
                      contentFit="cover"
                    />
                    <View style={{ padding: 20, gap: 10 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontFamily: Fonts.serif, color: t.text, fontSize: 26 }}>
                          {trip.destination}
                        </Text>
                        <Ionicons name="arrow-forward" size={18} color={t.accent} />
                      </View>
                      <Text style={{ fontSize: 11, color: t.textSecondary }}>
                        {formatDateRange(parseDate(trip.startDateISO), parseDate(trip.endDateISO))}{' '}
                        · {daysBetween(parseDate(trip.startDateISO), parseDate(trip.endDateISO))}{' '}
                        days
                      </Text>
                      <ProgressBar value={city.total ? city.seen.length / city.total : 0} />
                      <Text style={{ fontSize: 10, color: t.textSecondary }}>
                        {city.seen.length} places collected
                      </Text>
                    </View>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${trip.destination} trip`}
                    onPress={() => setRemove(trip.id)}
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      padding: 9,
                      borderRadius: 20,
                      backgroundColor: '#FFFFFFE8',
                    }}
                  >
                    <Ionicons name="trash-outline" size={15} color="#414B38" />
                  </Pressable>
                </View>
              );
            })}
          {Boolean(query) &&
            !trips.some((x) => x.destination.toLowerCase().includes(query.toLowerCase())) && (
              <Body>No journeys match your search.</Body>
            )}
        </View>
      )}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginTop: 12,
        }}
      >
        <View style={{ gap: 6 }}>
          <Eyebrow>A LITTLE INSPIRATION</Eyebrow>
          <Heading>Where will curiosity take you?</Heading>
        </View>
        {wide && (
          <Text style={{ fontSize: 12, color: t.textSecondary }}>
            Places we keep coming back to ↗
          </Text>
        )}
      </View>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 20 }}>
        {cities.map((city) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Plan a trip to ${city.name}`}
            key={city.name}
            onPress={() => plan(city.name)}
            style={({ pressed }) => ({ flex: 1, gap: 12, opacity: pressed ? 0.8 : 1 })}
          >
            <View style={{ borderRadius: 14, overflow: 'hidden' }}>
              <Image
                source={{ uri: getDestinationImage(city.name)! }}
                style={{ height: 190 }}
                contentFit="cover"
              />
              <View
                style={{
                  position: 'absolute',
                  top: 14,
                  left: 14,
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 4,
                  backgroundColor: '#F7F7F2ED',
                }}
              >
                <Text style={{ fontSize: 9, letterSpacing: 1.4, color: '#414B38' }}>
                  {city.country}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontFamily: Fonts.serif, fontSize: 24, color: t.text }}>
                {city.name}
              </Text>
              <Ionicons name="arrow-forward" size={17} color={t.accent} />
            </View>
            <Text style={{ fontSize: 12, color: t.textSecondary }}>{city.caption}</Text>
          </Pressable>
        ))}
      </View>
      <View
        style={{
          marginTop: 20,
          paddingTop: 24,
          borderTopWidth: 1,
          borderColor: t.hairline,
          flexDirection: 'row',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontFamily: Fonts.serif, fontSize: 18, color: t.accent }}>
          A little further. A little closer to you.
        </Text>
        {wide && (
          <Text style={{ fontSize: 10, color: t.textSecondary }}>
            NORTE · TRAVEL WITH INTENTION
          </Text>
        )}
      </View>
      <Modal
        visible={Boolean(remove)}
        transparent
        animationType="fade"
        onRequestClose={() => setRemove(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: t.overlay,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <Panel style={{ maxWidth: 430, width: '100%' }}>
            <Heading>Delete this journey?</Heading>
            <Body>
              Your itinerary will be removed from this device. Places you’ve visited stay in your
              city collection.
            </Body>
            <Action label="Keep journey" onPress={() => setRemove(null)} />
            <Action
              label="Delete journey"
              subtle
              onPress={() => {
                if (remove) deleteTrip(remove);
                setRemove(null);
              }}
            />
          </Panel>
        </View>
      </Modal>
    </Screen>
  );
}
