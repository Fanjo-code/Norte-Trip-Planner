import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';

import { Card } from '@/components/card';
import { Hero } from '@/components/hero';
import { Screen } from '@/components/screen';
import { SectionHeader } from '@/components/section-header';
import { StatTile } from '@/components/stat-tile';
import { TransportList } from '@/components/transport-list';
import { useCityProgress } from '@/contexts/city-progress-context';
import {
  BUDGET_LABELS,
  INTEREST_LABELS,
  PACE_LABELS,
  usePreferences,
} from '@/contexts/preferences-context';
import { useProgress } from '@/contexts/progress-context';
import { useTrip } from '@/contexts/trip-context';
import { getDestinationImage } from '@/data/destinations';
import { useTheme } from '@/hooks/use-theme';
import { daysBetween, formatDateRange, nightsBetween } from '@/lib/format';
import { FontSize, Radius, Spacing } from '@/constants/theme';

/** Quick-link into one of the trip tabs. */
const QUICK_LINKS = [
  { route: '/(trip)/itinerary' as const, icon: 'calendar', title: 'Itinerary', sub: 'Your day-by-day plan' },
  { route: '/(trip)/food' as const, icon: 'restaurant', title: 'Food', sub: 'Where to eat & drink' },
  { route: '/(trip)/places' as const, icon: 'map', title: 'Places', sub: 'Every must-see spot' },
];

export default function GuideScreen() {
  const t = useTheme();
  const { trip, currentTripData } = useTrip();
  const { countSeenInList, getCityRecord, getCityProgress } = useCityProgress();
  const { isDone } = useProgress();
  const { prefs, hasCustomized } = usePreferences();

  if (!currentTripData) {
    return (
      <Screen>
        <View style={[styles.loading, { backgroundColor: t.background }]}>
          <ActivityIndicator size="large" color={t.accent} />
          <Text style={[styles.loadingTitle, { color: t.text }]}>Loading your trip…</Text>
          <Text style={[styles.loadingSub, { color: t.textSecondary }]}>Fetching real places, restaurants, and transport.</Text>
        </View>
      </Screen>
    );
  }

  const data = currentTripData;
  const days = daysBetween(trip.startDate, trip.endDate);
  const nights = nightsBetween(trip.startDate, trip.endDate);
  const imageUrl = getDestinationImage(trip.destination);

  // Per-city completion
  const totalPlaces = Math.max(getCityRecord(trip.destination).total, data.places.length);
  const seenPlaces = countSeenInList(trip.destination, data.places);
  const progress = getCityProgress(trip.destination, data.places);
  const percent = Math.round(progress * 100);
  const placesLeft = Math.max(0, totalPlaces - seenPlaces);

  // Trip-scoped progress (itinerary + restaurants)
  const restaurantsTried = data.restaurants.filter((r) => isDone(r.id)).length;

  const openTab = (route: string) => {
    // Navigate the current tab group to the sibling tab without stacking screens.
    (router as any).navigate(route);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={t.text} />
        </Pressable>
      </View>

      <Hero
        title={trip.destination}
        subtitle={`${formatDateRange(trip.startDate, trip.endDate)} · ${days} days · ${nights} nights`}
        footer="City guide"
        imageUrl={imageUrl}
      />

      {/* Completion card */}
      <Card elevated style={styles.completionCard}>
        <View style={styles.completionTop}>
          <View style={styles.completionIcon}>
            <Ionicons name="trophy" size={18} color={t.accent} />
          </View>
          <Text style={[styles.completionTitle, { color: t.text }]}>
            You&apos;ve seen {percent}% of {trip.destination}
          </Text>
        </View>
        <View style={[styles.progressTrack, { backgroundColor: t.hairline }]}>
          <View
            style={[
              styles.progressFill,
              { backgroundColor: t.accent, width: `${Math.max(2, percent)}%` as any },
            ]}
          />
        </View>
        <Text style={[styles.completionSub, { color: t.textSecondary }]}>
          {seenPlaces} of {totalPlaces} places seen · {placesLeft > 0 ? `${placesLeft} more to explore` : 'every spot explored! 🎉'}
        </Text>
      </Card>

      {/* Stats */}
      <View style={[styles.stats, { backgroundColor: t.card }]}>
        <StatTile value={String(totalPlaces)} label="Places" />
        <View style={[styles.divider, { backgroundColor: t.hairline }]} />
        <StatTile value={String(seenPlaces)} label="Seen" />
        <View style={[styles.divider, { backgroundColor: t.hairline }]} />
        <StatTile value={String(restaurantsTried)} label="Food tried" />
        <View style={[styles.divider, { backgroundColor: t.hairline }]} />
        <StatTile value="Guide" label="Your trip" />
      </View>

      {/* Preferences */}
      <SectionHeader title="Your style" />
      <Card elevated>
        {hasCustomized ? (
          <>
            <View style={styles.prefChips}>
              {prefs.interests.length > 0
                ? prefs.interests.map((i) => (
                    <View key={i} style={[styles.prefChip, { backgroundColor: t.accentSoft }]}>
                      <Text style={[styles.prefChipText, { color: t.accent }]}>{INTEREST_LABELS[i] ?? i}</Text>
                    </View>
                  ))
                : null}
              <View style={[styles.prefChip, { backgroundColor: t.hairline }]}>
                <Text style={[styles.prefChipText, { color: t.textSecondary }]}>{PACE_LABELS[prefs.pace]} pace</Text>
              </View>
              <View style={[styles.prefChip, { backgroundColor: t.hairline }]}>
                <Text style={[styles.prefChipText, { color: t.textSecondary }]}>{BUDGET_LABELS[prefs.budget]}</Text>
              </View>
            </View>
            <Pressable onPress={() => router.push('/preferences')}>
              <Text style={[styles.prefLink, { color: t.accent }]}>Edit preferences →</Text>
            </Pressable>
          </>
        ) : (
          <View style={styles.prefEmptyRow}>
            <Ionicons name="sparkles" size={18} color={t.accent} />
            <Text style={[styles.prefEmptyText, { color: t.text }]}>
              Tell us what you love and your itinerary will match it.
            </Text>
            <Pressable onPress={() => router.push('/preferences')}>
              <Text style={[styles.prefLink, { color: t.accent }]}>Personalize →</Text>
            </Pressable>
          </View>
        )}
      </Card>

      {/* Quick links */}
      <SectionHeader title="Continue exploring" />
      <View style={styles.quickRow}>
        {QUICK_LINKS.map((link) => (
          <Pressable
            key={link.route}
            onPress={() => openTab(link.route)}
            style={[styles.quickCard, { backgroundColor: t.card }]}>
            <View style={[styles.quickIcon, { backgroundColor: t.accentSoft }]}>
              <Ionicons name={link.icon as any} size={20} color={t.accent} />
            </View>
            <Text style={[styles.quickTitle, { color: t.text }]}>{link.title}</Text>
            <Text style={[styles.quickSub, { color: t.textSecondary }]}>{link.sub}</Text>
          </Pressable>
        ))}
      </View>

      <SectionHeader title="Getting around" />
      <TransportList transport={data.transport} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xxl,
  },
  loadingTitle: {
    fontSize: FontSize.label,
    fontWeight: '800',
    textAlign: 'center',
  },
  loadingSub: {
    fontSize: FontSize.small,
    textAlign: 'center',
  },
  header: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completionCard: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  completionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  completionIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14,124,102,0.12)',
  },
  completionTitle: {
    fontSize: FontSize.label,
    fontWeight: '800',
    flex: 1,
  },
  progressTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  completionSub: {
    fontSize: FontSize.small,
    fontWeight: '600',
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.lg,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
    marginVertical: Spacing.xs,
  },
  prefChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  prefChip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  prefChipText: {
    fontSize: FontSize.caption,
    fontWeight: '700',
  },
  prefLink: {
    fontSize: FontSize.small,
    fontWeight: '700',
    marginTop: Spacing.md,
    textAlign: 'right',
  },
  prefEmptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  prefEmptyText: {
    flex: 1,
    fontSize: FontSize.small,
    fontWeight: '600',
  },
  quickRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  quickCard: {
    flex: 1,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(128,128,128,0.2)',
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  quickTitle: {
    fontSize: FontSize.body,
    fontWeight: '800',
  },
  quickSub: {
    fontSize: FontSize.caption,
    lineHeight: 15,
  },
});