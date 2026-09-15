import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Card } from '@/components/card';
import { CheckButton } from '@/components/check-button';
import { Chip } from '@/components/tags';
import { Rating } from '@/components/rating';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { useCityProgress } from '@/contexts/city-progress-context';
import { useTrip } from '@/contexts/trip-context';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, formatPrice } from '@/lib/format';
import { FontSize, Radius, Spacing } from '@/constants/theme';

export default function PlacesScreen() {
  const t = useTheme();
  const { trip, currentTripData } = useTrip();
  const { countSeenInList, getCityRecord, getCityProgress, isPlaceSeen, togglePlaceSeen } = useCityProgress();
  const range = `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}`;

  if (!currentTripData) {
    return (
      <Screen>
        <View style={[styles.loading, { backgroundColor: t.background }]}>
          <ActivityIndicator size="large" color={t.accent} />
          <Text style={[styles.loadingTitle, { color: t.text }]}>Loading places…</Text>
          <Text style={[styles.loadingSub, { color: t.textSecondary }]}>Discovering real attractions and landmarks.</Text>
        </View>
      </Screen>
    );
  }

  const data = currentTripData;
  const destination = data.destination;
  const seenCount = countSeenInList(destination, data.places);
  const totalCount = Math.max(getCityRecord(destination).total, data.places.length);
  const percent = Math.round(getCityProgress(destination, data.places) * 100);

  return (
    <Screen>
      <ScreenHeader icon="map" title="Places to visit" subtitle={`${trip.destination} · ${range}`} />

      {/* Per-city completion header */}
      <View style={[styles.completionRow, { backgroundColor: t.card }]}>
        <Ionicons name="trophy" size={15} color={t.accent} />
        <Text style={[styles.completionText, { color: t.text }]}>
          You&apos;ve seen {seenCount} of {totalCount} · {percent}% of {destination}
        </Text>
      </View>

      <View style={styles.list}>
        {data.places.map((p) => {
          const checked = isPlaceSeen(destination, p.name);
          return (
            <Pressable key={p.id} onPress={() => p.url && Linking.openURL(p.url)}>
            <Card>
              <View style={styles.row}>
                <View style={[styles.iconWrap, { backgroundColor: t.accentSoft }]}>
                  <Ionicons name={p.icon} size={20} color={t.accent} />
                </View>
                <View style={[styles.grow, checked && { opacity: 0.55 }]}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                      {p.name}
                    </Text>
                    <Chip label={p.category} tone="accent" />
                  </View>
                  <Rating value={p.rating} />
                </View>
                <CheckButton checked={checked} onToggle={() => togglePlaceSeen(destination, p.name)} />
              </View>

              <Text
                style={[
                  styles.desc,
                  { color: t.textSecondary, opacity: checked ? 0.55 : 1 },
                ]}>
                {p.description}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Ionicons name="time" size={14} color={t.icon} />
                  <Text style={[styles.metaText, { color: t.textSecondary }]}>
                    {p.timeToSpend}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name={p.price > 0 ? 'ticket' : 'pricetag'} size={14} color={t.icon} />
                  <Text style={[styles.metaText, { color: t.textSecondary }]}>
                    {p.price > 0 ? formatPrice(p.price) : 'Free'}
                  </Text>
                </View>
              </View>

              {p.url ? (
                <Pressable onPress={() => Linking.openURL(p.url!).catch(() => {})}>
                  <Text style={[styles.viewLink, { color: t.accent }]}>View on Maps →</Text>
                </Pressable>
              ) : null}
            </Card>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  completionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.lg,
  },
  completionText: {
    fontSize: FontSize.small,
    fontWeight: '700',
    flex: 1,
  },
  list: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'center',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    fontSize: FontSize.label,
    fontWeight: '800',
    flexShrink: 1,
  },
  desc: {
    fontSize: FontSize.small,
    lineHeight: 19,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xl,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    fontSize: FontSize.small,
    fontWeight: '600',
  },
  viewLink: {
    fontSize: FontSize.small,
    fontWeight: '700',
    marginTop: Spacing.sm,
    textAlign: 'right',
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
