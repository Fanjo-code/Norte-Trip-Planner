import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';

import { RouteMap } from '@/components/route-map';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { TimelineItem } from '@/components/timeline-item';
import { useProgress } from '@/contexts/progress-context';
import { useTrip } from '@/contexts/trip-context';
import { useTheme } from '@/hooks/use-theme';
import { addDays, formatDate } from '@/lib/format';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function ItineraryScreen() {
  const t = useTheme();
  const { trip, currentTripData } = useTrip();
  const { isDone, toggle } = useProgress();
  const [currentDay, setCurrentDay] = useState(1);
  const range = `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}`;

  if (!currentTripData) {
    return (
      <Screen>
        <View style={[styles.loading, { backgroundColor: t.background }]}>
          <ActivityIndicator size="large" color={t.accent} />
          <Text style={[styles.loadingTitle, { color: t.text }]}>Loading itinerary…</Text>
          <Text style={[styles.loadingSub, { color: t.textSecondary }]}>Building your day-by-day plan from real places.</Text>
        </View>
      </Screen>
    );
  }

  const data = currentTripData;
  const day = data.itinerary.find((d) => d.day === currentDay) ?? data.itinerary[0];
  const totalDays = data.itinerary.length;
  const dayDate = formatDate(addDays(trip.startDate, currentDay - 1));

  const prev = () => setCurrentDay((d) => Math.max(1, d - 1));
  const next = () => setCurrentDay((d) => Math.min(totalDays, d + 1));

  return (
    <Screen>
      <ScreenHeader icon="calendar" title="Itinerary" subtitle={`${trip.destination} · ${range}`} />

      <View style={styles.dayNav}>
        <Pressable
          onPress={prev}
          disabled={currentDay <= 1}
          style={({ pressed }) => [
            styles.arrow,
            {
              backgroundColor: t.accentSoft,
              opacity: pressed || currentDay <= 1 ? 0.4 : 1,
            },
          ]}>
          <Ionicons name="chevron-back" size={20} color={t.accent} />
        </Pressable>
        <View style={styles.dayInfo}>
          <Text style={[styles.dayLabel, { color: t.accent }]}>Day {currentDay}</Text>
          <Text style={[styles.dayDate, { color: t.textSecondary }]}>{dayDate}</Text>
          <Text style={[styles.dayTitle, { color: t.text }]}>{day.title}</Text>
        </View>
        <Pressable
          onPress={next}
          disabled={currentDay >= totalDays}
          style={({ pressed }) => [
            styles.arrow,
            {
              backgroundColor: t.accentSoft,
              opacity: pressed || currentDay >= totalDays ? 0.4 : 1,
            },
          ]}>
          <Ionicons name="chevron-forward" size={20} color={t.accent} />
        </Pressable>
      </View>

      <RouteMap
        activities={day.activities}
        accent={t.accent}
      />

      {day.activities.map((activity, index) => (
        <TimelineItem
          key={activity.id}
          activity={activity}
          isFirst={index === 0}
          isLast={index === day.activities.length - 1}
          checked={isDone(activity.id)}
          onToggle={() => toggle(activity.id)}
        />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  arrow: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInfo: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  dayLabel: {
    fontSize: FontSize.small,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayDate: {
    fontSize: FontSize.caption,
    fontWeight: '600',
  },
  dayTitle: {
    fontSize: FontSize.body,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
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
});
