import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Image } from 'expo-image';

import { Card } from '@/components/card';
import { CheckButton } from '@/components/check-button';
import { Badge } from '@/components/tags';
import { Rating } from '@/components/rating';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { useProgress } from '@/contexts/progress-context';
import { useTrip } from '@/contexts/trip-context';
import { useTheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/format';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import type { Meal } from '@/types/trip';

const MEALS: { key: Meal; label: string; icon: string; image: string }[] = [
  {
    key: 'Breakfast',
    label: 'Breakfast',
    icon: 'cafe',
    image: 'https://images.unsplash.com/photo-1504754524776-8f4f37790ca0?w=400&h=400&fit=crop&q=80',
  },
  {
    key: 'Lunch',
    label: 'Lunch',
    icon: 'restaurant',
    image: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&h=400&fit=crop&q=80',
  },
  {
    key: 'Dinner',
    label: 'Dinner',
    icon: 'wine',
    image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=400&fit=crop&q=80',
  },
  {
    key: 'Drinks',
    label: 'Drinks',
    icon: 'beer',
    image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400&h=400&fit=crop&q=80',
  },
];

export default function FoodScreen() {
  const t = useTheme();
  const { trip, currentTripData } = useTrip();
  const { isDone, toggle } = useProgress();
  const [selected, setSelected] = useState<Meal>('Breakfast');
  const range = `${formatDate(trip.startDate)} – ${formatDate(trip.endDate)}`;

  if (!currentTripData) {
    return (
      <Screen>
        <View style={[styles.loading, { backgroundColor: t.background }]}>
          <ActivityIndicator size="large" color={t.accent} />
          <Text style={[styles.loadingTitle, { color: t.text }]}>Loading restaurants…</Text>
          <Text style={[styles.loadingSub, { color: t.textSecondary }]}>Finding real places to eat & drink.</Text>
        </View>
      </Screen>
    );
  }

  const data = currentTripData;
  const items = data.restaurants.filter((r) => r.meal === selected);

  return (
    <Screen>
      <ScreenHeader icon="restaurant" title="Eat & drink" subtitle={`${trip.destination} · ${range}`} />

      <View style={styles.grid}>
        {MEALS.map((m) => {
          const active = m.key === selected;
          const count = data.restaurants.filter((r) => r.meal === m.key).length;
          return (
            <Pressable
              key={m.key}
              onPress={() => setSelected(m.key)}
              style={({ pressed }) => [
                styles.card,
                {
                  opacity: pressed ? 0.85 : 1,
                  borderWidth: active ? 2 : 0,
                  borderColor: active ? t.accent : 'transparent',
                },
              ]}>
              <Image source={{ uri: m.image }} contentFit="cover" transition={300} style={styles.cardImage} />
              <View style={styles.cardOverlay}>
                <Ionicons name={m.icon as any} size={22} color="#FFFFFF" />
                <Text style={styles.cardLabel}>{m.label}</Text>
                <Text style={styles.cardCount}>{count} places</Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}
        style={styles.chipBar}>
        {MEALS.map((m) => {
          const active = m.key === selected;
          return (
            <Pressable
              key={m.key}
              onPress={() => setSelected(m.key)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: active ? t.accent : t.hairline,
                  opacity: pressed ? 0.7 : 1,
                },
              ]}>
              <Ionicons name={m.icon as any} size={14} color={active ? t.badgeText : t.textSecondary} />
              <Text style={[styles.chipLabel, { color: active ? t.badgeText : t.textSecondary }]}>
                {m.key}
              </Text>
            </Pressable>
          );
        })}
        {/* Spacer to allow last chip to reach screen edge */}
        <View style={styles.chipSpacer} />
      </ScrollView>

      <View style={styles.list}>
        {items.map((r) => {
          const checked = isDone(r.id);
          return (
            <Pressable key={r.id} onPress={() => r.url && Linking.openURL(r.url)}>
            <Card>
              <View style={styles.cardRow}>
                <View style={[styles.iconWrap, { backgroundColor: t.accentSoft }]}>
                  <Ionicons name={r.icon} size={20} color={t.accent} />
                </View>
                <View style={[styles.grow, checked && { opacity: 0.55 }]}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
                      {r.name}
                    </Text>
                    {r.isMustTry ? <Badge label="Must-try" /> : null}
                  </View>
                  <Text style={[styles.meta, { color: t.textSecondary }]} numberOfLines={1}>
                    {r.cuisine} · {'€'.repeat(r.priceLevel)} · {r.neighborhood}
                  </Text>
                  <Rating value={r.rating} />
                </View>
                <CheckButton checked={checked} onToggle={() => toggle(r.id)} />
              </View>
              <Text
                style={[styles.desc, { color: t.textSecondary, opacity: checked ? 0.55 : 1 }]}>
                {r.description}
              </Text>
              {r.url ? (
                <Pressable onPress={() => Linking.openURL(r.url!).catch(() => {})}>
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  card: {
    width: '48%' as any,
    height: 150,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    padding: Spacing.md,
    gap: 4,
  },
  cardLabel: {
    color: '#FFFFFF',
    fontSize: FontSize.label,
    fontWeight: '800',
  },
  cardCount: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSize.caption,
    fontWeight: '500',
  },
  chipBar: {
    marginTop: Spacing.xl,
  },
  chipScroll: {
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: 999,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  chipLabel: {
    fontSize: FontSize.small,
    fontWeight: '700',
  },
  chipSpacer: {
    width: Spacing.lg * 4, // Allow last chip to reach screen edge
  },
  list: {
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  cardRow: {
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  name: {
    fontSize: FontSize.label,
    fontWeight: '800',
    flexShrink: 1,
  },
  meta: {
    fontSize: FontSize.small,
  },
  desc: {
    fontSize: FontSize.small,
    lineHeight: 19,
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
