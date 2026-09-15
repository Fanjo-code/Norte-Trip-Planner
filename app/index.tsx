import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { useCityProgress } from '@/contexts/city-progress-context';
import { useTrip } from '@/contexts/trip-context';
import { useTheme } from '@/hooks/use-theme';
import { getDestinationImage } from '@/data/destinations';
import { formatDateRange, nightsBetween } from '@/lib/format';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import type { SavedTrip } from '@/types/trip';

export default function MyTripsScreen() {
  const t = useTheme();
  const { trips, selectTrip, deleteTrip } = useTrip();

  const openTrip = (id: string) => {
    selectTrip(id);
    router.push('/(trip)/overview');
  };

  const handleDelete = (trip: SavedTrip) => {
    Alert.alert(
      'Delete trip?',
      `Remove "${trip.destination}" and all its data?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => deleteTrip(trip.id) },
      ]
    );
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={[styles.logo, { backgroundColor: t.accent }]}>
          <Ionicons name="compass" size={18} color="#FFFFFF" />
        </View>
        <View>
          <Text style={[styles.title, { color: t.text }]}>My trips</Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>
            {trips.length} {trips.length === 1 ? 'plan' : 'plans'} saved on your device
          </Text>
        </View>
      </View>

      <View style={styles.list}>
        {trips.map((trip) => (
          <TripCard
            key={trip.id}
            trip={trip}
            onPress={() => openTrip(trip.id)}
            onDelete={() => handleDelete(trip)}
          />
        ))}
      </View>

      <Pressable
        onPress={() => router.push('/new-trip')}
        style={({ pressed }) => [
          styles.newTrip,
          {
            borderColor: t.accent,
            opacity: pressed ? 0.6 : 1,
          },
        ]}>
        <Ionicons name="add-circle" size={20} color={t.accent} />
        <Text style={[styles.newTripText, { color: t.accent }]}>Plan a new trip</Text>
      </Pressable>
    </Screen>
  );
}

function TripCard({
  trip,
  onPress,
  onDelete,
}: {
  trip: SavedTrip;
  onPress: () => void;
  onDelete: () => void;
}) {
  const t = useTheme();
  const start = new Date(trip.startDateISO);
  const end = new Date(trip.endDateISO);
  const imageUrl = getDestinationImage(trip.destination);
  const cityRecord = useCityProgress().getCityRecord(trip.destination);
  const cityPct = cityRecord.total > 0 ? Math.round((cityRecord.seen.length / cityRecord.total) * 100) : -1;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
      <Card elevated style={styles.card}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            contentFit="cover"
            transition={300}
            style={styles.cardImage}
          />
        ) : (
          <View style={[styles.cardImagePlaceholder, { backgroundColor: t.accent }]}>
            <Ionicons name="location" size={28} color="#FFFFFF" />
          </View>
        )}
        <View style={styles.cardOverlay}>
          <View style={styles.cardOverlayContent}>
            <Text style={styles.dest}>{trip.destination}</Text>
            <View style={styles.cardMeta}>
              <Ionicons name="calendar-outline" size={13} color="rgba(255,255,255,0.9)" />
              <Text style={styles.dates}>
                {formatDateRange(start, end)} · {nightsBetween(start, end)} nights
              </Text>
            </View>
            {cityPct >= 0 && cityRecord.total > 0 ? (
              <View style={styles.cityChip}>
                <Ionicons name="trophy" size={12} color="#FFD666" />
                <Text style={styles.cityChipText}>
                  {cityPct}% of {trip.destination} seen
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        <Pressable
          onPress={onDelete}
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={`Delete ${trip.destination} trip`}>
          <Ionicons name="trash-outline" size={17} color="#FFFFFF" />
        </Pressable>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FontSize.huge,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.small,
  },
  list: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  card: {
    padding: 0,
    height: 180,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  cardImage: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  cardImagePlaceholder: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  cardOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    padding: Spacing.md,
    justifyContent: 'flex-end',
  },
  cardOverlayContent: {
    width: '100%',
  },
  dest: {
    color: '#FFFFFF',
    fontSize: FontSize.huge,
    fontWeight: '800',
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  dates: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FontSize.small,
    fontWeight: '500',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    alignSelf: 'flex-start',
    marginTop: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 999,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  cityChipText: {
    color: '#FFFFFF',
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  newTrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xxl,
    marginBottom: Spacing.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    paddingVertical: Spacing.lg,
  },
  newTripText: {
    fontSize: FontSize.body,
    fontWeight: '700',
  },
});
