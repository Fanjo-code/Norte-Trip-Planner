import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';

import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { SectionHeader } from '@/components/section-header';
import { useCityProgress } from '@/contexts/city-progress-context';
import { useProgress } from '@/contexts/progress-context';
import { useTrip } from '@/contexts/trip-context';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDate, formatPrice } from '@/lib/format';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import type { IoniconName } from '@/types/trip';

const MILESTONES = [25, 50, 75, 100];

export default function JournalScreen() {
  const t = useTheme();
  const { trip, currentTripData } = useTrip();
  const { isDone, doneCount, tripStreak } = useProgress();
  const { countSeenInList, getCityProgress, getCityRecord, isPlaceSeen } = useCityProgress();

  // Milestone animation state
  const [celebrateMilestone, setCelebrateMilestone] = React.useState<number | null>(null);
  const celebrationAnim = React.useRef(new Animated.Value(0)).current;

  // Total possible items (safe before the loading guard). Places are tracked
  // per-city (CityProgressContext), not per-trip, so they don't count here.
  const totalActivities = currentTripData?.itinerary.reduce((sum, day) => sum + day.activities.length, 0) ?? 0;
  const totalRestaurants = currentTripData?.restaurants.length ?? 0;
  const totalItems = totalActivities + totalRestaurants;

  // Check for milestone reached
  React.useEffect(() => {
    if (!currentTripData) return;
    if (doneCount === 0 || totalItems === 0) return;
    const percent = Math.round((doneCount / totalItems) * 100);
    const prevPercent = doneCount > 1 ? Math.round(((doneCount - 1) / totalItems) * 100) : 0;
    const hitMilestone = MILESTONES.find((m) => percent >= m && prevPercent < m);
    if (hitMilestone) {
      setCelebrateMilestone(hitMilestone);
      celebrationAnim.setValue(0);
      Animated.timing(celebrationAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(() => {
        setTimeout(() => setCelebrateMilestone(null), 1500);
      });
    }
  }, [doneCount, totalItems, currentTripData, celebrationAnim]);

  if (!currentTripData) {
    return (
      <Screen>
        <View style={[styles.loading, { backgroundColor: t.background }]}>
          <ActivityIndicator size="large" color={t.accent} />
          <Text style={[styles.loadingTitle, { color: t.text }]}>Loading journal…</Text>
          <Text style={[styles.loadingSub, { color: t.textSecondary }]}>Preparing your memories.</Text>
        </View>
      </Screen>
    );
  }

  const data = currentTripData;
  const destination = data.destination;

  // Completion percentage
  const completionPercent = totalItems > 0 ? Math.round((doneCount / totalItems) * 100) : 0;

  // Per-city completion (persisted across trips)
  const seenPlaces = countSeenInList(destination, data.places);
  const totalPlaces = Math.max(getCityRecord(destination).total, data.places.length);
  const cityPercent = getCityProgress(destination, data.places);

  const doneByDay = data.itinerary
    .map((day) => ({
      day,
      items: day.activities.filter((a) => isDone(a.id)),
    }))
    .filter((d) => d.items.length > 0);

  const foodDone = data.restaurants.filter((r) => isDone(r.id));
  const placesDone = data.places.filter((p) => isPlaceSeen(destination, p.name));

  return (
    <Screen>
      <ScreenHeader icon="book" title="Journal" subtitle={`${trip.destination} · your memories`} />

      {/* Milestone celebration overlay */}
      {celebrateMilestone && (
        <Animated.View style={styles.celebrationOverlay}>
          <Animated.Text
            style={[
              styles.celebrationText,
              {
                transform: [
                  { scale: celebrationAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.5, 1.2, 1] }) },
                  { translateY: celebrationAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
                ],
                opacity: celebrationAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 0] }),
              },
            ]}>
            🎉 {celebrateMilestone}% complete!
          </Animated.Text>
        </Animated.View>
      )}

      {doneCount === 0 ? (
        <Card elevated style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: t.accentSoft }]}>
            <Ionicons name="book-outline" size={28} color={t.accent} />
          </View>
          <Text style={[styles.emptyTitle, { color: t.text }]}>Nothing checked yet</Text>
          <Text style={[styles.emptyBody, { color: t.textSecondary }]}>
            Check off things on your itinerary, food, and places as you do them — they&apos;ll be
            collected here as memories.
          </Text>
        </Card>
      ) : (
        <>
          <View style={[styles.summary, { backgroundColor: t.card, borderColor: t.hairline }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: t.text }]}>{doneCount}</Text>
              <Text style={[styles.summaryLabel, { color: t.textSecondary }]}>things done</Text>
            </View>
            <View
              style={[
                styles.summaryItem,
                styles.summaryDivider,
                { borderLeftColor: t.hairline },
              ]}>
              <Text style={[styles.summaryValue, { color: t.accent }]}>{completionPercent}%</Text>
              <Text style={[styles.summaryLabel, { color: t.textSecondary }]}>{trip.destination} done</Text>
            </View>
            {tripStreak > 0 ? (
              <View
                style={[
                  styles.summaryItem,
                  styles.summaryDivider,
                  { borderLeftColor: t.hairline },
                ]}>
                <Text style={[styles.summaryValue, { color: t.accent }]}>
                  {tripStreak} <Ionicons name="flame" size={15} color={t.accent} />
                </Text>
                <Text style={[styles.summaryLabel, { color: t.textSecondary }]}>day streak</Text>
              </View>
            ) : null}
          </View>

          {/* Per-city completion line */}
          {totalPlaces > 0 ? (
            <View style={[styles.cityRow, { backgroundColor: t.card, borderColor: t.hairline }]}>
              <View style={[styles.cityIcon, { backgroundColor: t.accentSoft }]}>
                <Ionicons name="trophy" size={14} color={t.accent} />
              </View>
              <View style={styles.cityGrow}>
                <Text style={[styles.cityText, { color: t.text }]}>
                  You&apos;ve visited {Math.round(cityPercent * 100)}% of {destination}
                </Text>
                <View style={[styles.cityBar, { backgroundColor: t.hairline }]}>
                  <View
                    style={[
                      styles.cityFill,
                      { backgroundColor: t.accent, width: `${Math.max(2, Math.round(cityPercent * 100))}%` as any },
                    ]}
                  />
                </View>
              </View>
              <Text style={[styles.cityCount, { color: t.textSecondary }]}>
                {seenPlaces}/{totalPlaces}
              </Text>
            </View>
          ) : null}

          {doneByDay.map(({ day, items }) => (
            <View key={day.day}>
              <SectionHeader
                title={`Day ${day.day} · ${formatDate(addDays(trip.startDate, day.day - 1))}`}
              />
              <Card>
                {items.map((a, i) => (
                  <MemoryRow
                    key={a.id}
                    icon={a.icon}
                    title={a.title}
                    meta={`${a.time} · ${a.place}`}
                    price={a.price}
                    separator={i > 0}
                  />
                ))}
              </Card>
            </View>
          ))}

          {foodDone.length > 0 ? (
            <View>
              <SectionHeader title="Food you tried" />
              <Card>
                {foodDone.map((r, i) => (
                  <MemoryRow
                    key={r.id}
                    icon={r.icon}
                    title={r.name}
                    meta={`${r.cuisine} · ${r.neighborhood}`}
                    separator={i > 0}
                  />
                ))}
              </Card>
            </View>
          ) : null}

          {placesDone.length > 0 ? (
            <View>
              <SectionHeader title="Places you visited" />
              <Card>
                {placesDone.map((p, i) => (
                  <MemoryRow
                    key={p.id}
                    icon={p.icon}
                    title={p.name}
                    meta={p.category}
                    separator={i > 0}
                  />
                ))}
              </Card>
            </View>
          ) : null}
        </>
      )}
    </Screen>
  );
}

function MemoryRow({
  icon,
  title,
  meta,
  price,
  separator = false,
}: {
  icon: IoniconName;
  title: string;
  meta: string;
  price?: number;
  separator?: boolean;
}) {
  const t = useTheme();

  return (
    <View
      style={[
        styles.row,
        separator && {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: t.hairline,
          paddingTop: Spacing.md,
        },
      ]}>
      <View style={[styles.rowIcon, { backgroundColor: t.accentSoft }]}>
        <Ionicons name={icon} size={16} color={t.accent} />
      </View>
      <View style={styles.grow}>
        <Text style={[styles.rowTitle, { color: t.text }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.rowMeta, { color: t.textSecondary }]} numberOfLines={1}>
          {meta}
        </Text>
      </View>
      {price !== undefined && price > 0 ? (
        <Text style={[styles.rowPrice, { color: t.textSecondary }]}>{formatPrice(price)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
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
  empty: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    paddingVertical: Spacing.xxl,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    fontSize: FontSize.label,
    fontWeight: '800',
    marginBottom: Spacing.xs,
  },
  emptyBody: {
    fontSize: FontSize.small,
    lineHeight: 19,
    textAlign: 'center',
    maxWidth: 300,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  summaryDivider: {
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  summaryValue: {
    fontSize: FontSize.title,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  summaryLabel: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  cityIcon: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cityGrow: {
    flex: 1,
    gap: Spacing.xs,
  },
  cityText: {
    fontSize: FontSize.small,
    fontWeight: '700',
  },
  cityBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  cityFill: {
    height: '100%',
    borderRadius: 3,
  },
  cityCount: {
    fontSize: FontSize.small,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: {
    flex: 1,
    gap: 1,
  },
  rowTitle: {
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  rowMeta: {
    fontSize: FontSize.small,
  },
  rowPrice: {
    fontSize: FontSize.small,
    fontWeight: '700',
  },
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'none',
    zIndex: 100,
  },
  celebrationText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0E7C66',
    textShadowColor: 'rgba(14,124,102,0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
});
