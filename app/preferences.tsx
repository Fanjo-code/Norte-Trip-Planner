import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import { usePreferences } from '@/contexts/preferences-context';
import { useTheme } from '@/hooks/use-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import type { BudgetTier, IoniconName, Pace } from '@/types/trip';

interface InterestOption {
  value: string;
  label: string;
  icon: IoniconName;
}

const INTEREST_OPTIONS: InterestOption[] = [
  { value: 'art', label: 'Art & museums', icon: 'color-palette' },
  { value: 'food', label: 'Food & dining', icon: 'restaurant' },
  { value: 'history', label: 'History & heritage', icon: 'library' },
  { value: 'nature', label: 'Nature & outdoors', icon: 'leaf' },
  { value: 'nightlife', label: 'Nightlife', icon: 'moon' },
  { value: 'shopping', label: 'Shopping', icon: 'bag-handle' },
  { value: 'architecture', label: 'Architecture', icon: 'business' },
  { value: 'views', label: 'Viewpoints & panoramas', icon: 'eye' },
];

interface PaceOption {
  value: Pace;
  label: string;
  description: string;
  icon: IoniconName;
}

const PACE_OPTIONS: PaceOption[] = [
  { value: 'relaxed', label: 'Relaxed', description: '2–3 sights a day, slow mornings', icon: 'water' },
  { value: 'balanced', label: 'Balanced', description: '3–4 sights a day', icon: 'walk' },
  { value: 'packed', label: 'Packed', description: '5+ sights a day, see it all', icon: 'flash' },
];

interface BudgetOption {
  value: BudgetTier;
  label: string;
  description: string;
  icon: IoniconName;
}

const BUDGET_OPTIONS: BudgetOption[] = [
  { value: 'budget', label: 'Budget', description: 'Street food & casual spots', icon: 'pricetag' },
  { value: 'standard', label: 'Standard', description: 'Good local restaurants', icon: 'restaurant' },
  { value: 'premium', label: 'Premium', description: 'Highly-rated dining', icon: 'star' },
];

export default function PreferencesScreen() {
  const t = useTheme();
  const { prefs, updatePrefs } = usePreferences();

  const toggleInterest = (value: string) => {
    const has = prefs.interests.includes(value);
    updatePrefs({ interests: has ? prefs.interests.filter((i) => i !== value) : [...prefs.interests, value] });
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={t.text} />
        </Pressable>
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: t.text }]}>Personalize your trips</Text>
          <Text style={[styles.subtitle, { color: t.textSecondary }]}>
            A few questions so your itineraries feel like you. You can change these anytime.
          </Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Card style={styles.section}>
          <Text style={[styles.question, { color: t.text }]}>What do you love doing?</Text>
          <View style={styles.chipWrap}>
            {INTEREST_OPTIONS.map((opt) => {
              const active = prefs.interests.includes(opt.value);
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => toggleInterest(opt.value)}
                  style={[styles.chip, { backgroundColor: active ? t.accent : t.hairline }]}>
                  <Ionicons name={opt.icon} size={15} color={active ? t.badgeText : t.textSecondary} />
                  <Text style={[styles.chipText, { color: active ? t.badgeText : t.textSecondary }]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.question, { color: t.text }]}>What pace fits your trip?</Text>
          <View style={styles.optionList}>
            {PACE_OPTIONS.map((opt) => {
              const active = prefs.pace === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => updatePrefs({ pace: opt.value })}
                  style={[
                    styles.optionRow,
                    { backgroundColor: active ? t.accentSoft : t.hairline, borderColor: active ? t.accent : 'transparent' },
                  ]}>
                  <Ionicons name={opt.icon} size={18} color={active ? t.accent : t.textSecondary} />
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, { color: active ? t.accent : t.text }]}>{opt.label}</Text>
                    <Text style={[styles.optionDesc, { color: t.textSecondary }]}>{opt.description}</Text>
                  </View>
                  {active ? <Ionicons name="checkmark-circle" size={20} color={t.accent} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={styles.section}>
          <Text style={[styles.question, { color: t.text }]}>How do you like to spend on food?</Text>
          <View style={styles.optionList}>
            {BUDGET_OPTIONS.map((opt) => {
              const active = prefs.budget === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => updatePrefs({ budget: opt.value })}
                  style={[
                    styles.optionRow,
                    { backgroundColor: active ? t.accentSoft : t.hairline, borderColor: active ? t.accent : 'transparent' },
                  ]}>
                  <Ionicons name={opt.icon} size={18} color={active ? t.accent : t.textSecondary} />
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, { color: active ? t.accent : t.text }]}>{opt.label}</Text>
                    <Text style={[styles.optionDesc, { color: t.textSecondary }]}>{opt.description}</Text>
                  </View>
                  {active ? <Ionicons name="checkmark-circle" size={20} color={t.accent} /> : null}
                </Pressable>
              );
            })}
          </View>
        </Card>

        <PrimaryButton label="Done" icon="checkmark" onPress={() => router.back()} style={styles.cta} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: FontSize.huge,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.small,
    lineHeight: 18,
  },
  scroll: {
    paddingBottom: Spacing.xxl,
  },
  section: {
    marginTop: Spacing.lg,
    gap: Spacing.md,
  },
  question: {
    fontSize: FontSize.label,
    fontWeight: '800',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipText: {
    fontSize: FontSize.small,
    fontWeight: '700',
  },
  optionList: {
    gap: Spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  optionDesc: {
    fontSize: FontSize.caption,
  },
  cta: {
    marginTop: Spacing.xl,
  },
});