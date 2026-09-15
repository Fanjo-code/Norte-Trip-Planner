import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { DateField, TextField } from '@/components/field';
import { PrimaryButton } from '@/components/primary-button';
import { Screen } from '@/components/screen';
import {
  BUDGET_LABELS,
  INTEREST_LABELS,
  PACE_LABELS,
  usePreferences,
} from '@/contexts/preferences-context';
import { useTrip } from '@/contexts/trip-context';
import { useTheme } from '@/hooks/use-theme';
import { PRIORITY_OPTIONS, type Priority } from '@/data/flexible-suggestions';
import { generateTrip as generateAITrip, type AiError } from '@/services/ai';
import { generateTrip as generateLiveTrip } from '@/services/travel';
import type { Trip } from '@/types/trip';
import { FontSize, Radius, Spacing } from '@/constants/theme';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DURATIONS = [3, 5, 7, 10, 14];

const LOADING_TIPS = [
  "We're building your trip for you — this might take a minute.",
  'Finding the best places, restaurants, and hidden gems…',
  'Picking the best dates and planning each day…',
  'Almost there — putting the finishing touches on your trip…',
];

function defaultEnd(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d;
}

export default function NewTripScreen() {
  const t = useTheme();
  const { addTrip, setTripData, setGenerating } = useTrip();
  const { prefs, hasCustomized } = usePreferences();

  const [destination, setDestination] = useState('');
  const [mode, setMode] = useState<'exact' | 'flexible'>('exact');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(defaultEnd);
  const [flexMonth, setFlexMonth] = useState(new Date().getMonth());
  const [flexDuration, setFlexDuration] = useState(7);
  const [selectedPriority, setSelectedPriority] = useState<Priority>('recommended');
  const [errors, setErrors] = useState<{ destination?: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiError, setAiError] = useState<AiError | null>(null);
  const [loadingTip, setLoadingTip] = useState(0);

  // Rotate friendly "hang tight" messages while the trip is being built.
  useEffect(() => {
    if (!loading) return;
    const id = setInterval(() => setLoadingTip((i) => (i + 1) % LOADING_TIPS.length), 4000);
    return () => clearInterval(id);
  }, [loading]);

  const handlePlan = async () => {
    if (!destination.trim()) {
      setErrors({ destination: 'Enter a destination' });
      return;
    }
    setErrors({});
    setError(null);
    setAiError(null);
    setLoading(true);
    setGenerating(true);

    const year = new Date().getFullYear();

    // Final dates: user's exact dates in exact mode; in flexible mode the AI picks them.
    let finalStart = startDate;
    let finalEnd = endDate;
    let tripData: Trip | null = null;

    try {
      if (mode === 'flexible') {
        // AI chooses the best dates within the month + picks the trip details.
        setError('AI is finding the best dates and building your trip…');
        const gen = await generateAITrip(destination.trim(), null, null, prefs, {
          month: flexMonth,
          year,
          durationDays: flexDuration,
          priority: selectedPriority,
        });
        if (gen) {
          tripData = gen.trip;
          if (gen.startDate) {
            finalStart = gen.startDate;
            finalEnd = gen.endDate ?? gen.startDate;
          }
        }
      } else {
        setError('AI is researching your trip…');
        const gen = await generateAITrip(destination.trim(), startDate, endDate, prefs);
        if (gen) tripData = gen.trip;
      }
    } catch (err) {
      setAiError(err as AiError);
      console.error('[Plan] AI failed, trying live data:', (err as AiError)?.code ?? err);
      setError('AI unavailable — fetching live data…');
    }

    // Live fallback if AI produced nothing (real API data, not mock).
    if (!tripData) {
      try {
        let ls = finalStart;
        let le = finalEnd;
        if (mode === 'flexible') {
          ls = new Date(year, flexMonth, 1);
          le = new Date(year, flexMonth, flexDuration);
        }
        tripData = await generateLiveTrip(destination.trim(), ls, le, prefs);
        if (tripData) {
          finalStart = ls;
          finalEnd = le;
        }
      } catch (e) {
        console.error('[Plan] Live fallback failed:', e);
        tripData = null;
      }
    }

    if (tripData) {
      const id = addTrip({ destination: destination.trim(), startDate: finalStart, endDate: finalEnd });
      setTripData(id, tripData);
      router.replace('/(trip)/overview');
    } else {
      setError('Could not generate trip. Please try again.');
    }

    setLoading(false);
    setGenerating(false);
  };

  if (loading) {
    let loadingSub = 'AI is thinking — researching the best places, food, and creating your itinerary…';
    if (error?.includes('live data')) loadingSub = 'AI unavailable, fetching live data from free APIs…';
    if (error?.includes('proxy')) loadingSub = 'Connecting to AI proxy…';
    if (error?.includes('timed out')) loadingSub = 'AI taking longer than expected…';

    return (
      <View style={[styles.loading, { backgroundColor: t.background }]}>
        <ActivityIndicator size="large" color={t.accent} />
        <Text style={[styles.loadingTitle, { color: t.text }]}>
          Building your trip to {destination || 'your destination'}…
        </Text>
        <Text style={[styles.loadingSub, { color: t.textSecondary }]}>{loadingSub}</Text>
        <View style={styles.loadingNoteRow}>
          <Ionicons name="sparkles" size={15} color={t.accent} />
          <Text style={[styles.loadingNote, { color: t.textSecondary }]}>
            {LOADING_TIPS[loadingTip]}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable hitSlop={10} onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color={t.text} />
        </Pressable>
        <Text style={[styles.title, { color: t.text }]}>New trip</Text>
      </View>
      <Text style={[styles.subtitle, { color: t.textSecondary }]}>
        Your trip in less than 2 minutes.
      </Text>

      {error ? (
        <View style={[styles.errorBanner, { backgroundColor: '#FEE2E2' }]}>
          <Ionicons name="alert-circle" size={16} color="#DC2626" />
          <Text style={[styles.errorText, { color: '#DC2626' }]}>{error}</Text>
          {aiError && aiError.code && (
            <Text style={{ color: '#DC2626', fontSize: 11, marginTop: 2, fontFamily: 'monospace' }}>
              Code: {aiError.code}{aiError.status ? ` (${aiError.status})` : ''}
            </Text>
          )}
        </View>
      ) : null}

      <Card style={styles.form}>
        <TextField
          label="Destination"
          icon="location"
          value={destination}
          onChangeText={setDestination}
          placeholder="Paris, Madrid, Rome…"
          error={errors.destination}
          autoCapitalize="words"
          autoCorrect={false}
        />

        <View style={styles.modeToggle}>
          <Pressable
            onPress={() => setMode('exact')}
            style={[styles.modeBtn, { backgroundColor: mode === 'exact' ? t.accent : t.hairline }]}>
            <Text style={[styles.modeText, { color: mode === 'exact' ? '#FFF' : t.textSecondary }]}>
              Exact dates
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('flexible')}
            style={[styles.modeBtn, { backgroundColor: mode === 'flexible' ? t.accent : t.hairline }]}>
            <Text style={[styles.modeText, { color: mode === 'flexible' ? '#FFF' : t.textSecondary }]}>
              Flexible month
            </Text>
          </Pressable>
        </View>

        {mode === 'exact' ? (
          <>
            <DateField label="Start date" value={startDate} onChange={setStartDate} minimumDate={new Date()} />
            <DateField label="End date" value={endDate} onChange={setEndDate} minimumDate={startDate} icon="flag" />
          </>
        ) : (
          <>
            <Text style={[styles.fieldLabel, { color: t.textSecondary }]}>Month</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {MONTH_ABBR.map((m, i) => (
                <Pressable key={m} onPress={() => setFlexMonth(i)} style={[styles.chip, { backgroundColor: i === flexMonth ? t.accent : t.hairline }]}>
                  <Text style={[styles.chipText, { color: i === flexMonth ? '#FFF' : t.textSecondary }]}>{m}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={[styles.fieldLabel, { color: t.textSecondary }]}>Duration</Text>
            <View style={styles.chipRow}>
              {DURATIONS.map((d) => (
                <Pressable key={d} onPress={() => setFlexDuration(d)} style={[styles.chip, { backgroundColor: d === flexDuration ? t.accent : t.hairline }]}>
                  <Text style={[styles.chipText, { color: d === flexDuration ? '#FFF' : t.textSecondary }]}>{d} days</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.fieldLabel, { color: t.textSecondary }]}>What matters most?</Text>
            <View style={styles.priorityRow}>
              {PRIORITY_OPTIONS.map((p) => (
                <Pressable
                  key={p.value}
                  onPress={() => setSelectedPriority(p.value)}
                  style={[
                    styles.priorityChip,
                    { backgroundColor: selectedPriority === p.value ? t.accent : t.hairline },
                  ]}>
                  <Ionicons name={p.icon} size={16} color={selectedPriority === p.value ? '#FFF' : t.textSecondary} />
                  <Text style={[styles.priorityChipText, { color: selectedPriority === p.value ? '#FFF' : t.textSecondary }]}>{p.label}</Text>
                </Pressable>
              ))}
            </View>
            <Text style={[styles.flexHint, { color: t.textSecondary }]}>
              The AI will find the best {PRIORITY_OPTIONS.find((p) => p.value === selectedPriority)?.label.toLowerCase()} dates in{' '}
              {MONTH_ABBR[flexMonth]} for a {flexDuration}-day trip.
            </Text>
          </>
        )}
      </Card>

      {/* Personalization */}
      <Card style={styles.form}>
        <View style={styles.prefHeaderRow}>
          <Ionicons name="sparkles" size={16} color={t.accent} />
          <Text style={[styles.prefTitle, { color: t.text }]}>Make it yours</Text>
        </View>
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
            <Text style={[styles.prefEmptyText, { color: t.textSecondary }]}>
              Tell us what you love and your itinerary will match it.
            </Text>
            <Pressable onPress={() => router.push('/preferences')}>
              <Text style={[styles.prefLink, { color: t.accent }]}>Personalize →</Text>
            </Pressable>
          </View>
        )}
      </Card>

      <PrimaryButton label="Plan my trip" icon="sparkles" onPress={handlePlan} style={styles.cta} disabled={loading} />
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
  loadingNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.xl,
    opacity: 0.9,
  },
  loadingNote: {
    fontSize: FontSize.small,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.sm },
  back: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: FontSize.huge, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { fontSize: FontSize.small, marginTop: Spacing.xs, marginBottom: Spacing.xl },
  form: { gap: Spacing.lg },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.md },
  errorText: { fontSize: FontSize.small, flex: 1 },
  modeToggle: { flexDirection: 'row', gap: Spacing.sm },
  modeBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radius.md },
  modeText: { fontSize: FontSize.small, fontWeight: '700' },
  fieldLabel: { fontSize: FontSize.small, fontWeight: '600', marginLeft: Spacing.xs },
  chipRow: { flexDirection: 'row', gap: Spacing.sm },
  chip: { borderRadius: 999, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm },
  chipText: { fontSize: FontSize.small, fontWeight: '700' },
  flexHint: { fontSize: FontSize.caption, marginLeft: Spacing.xs },
  cta: { marginTop: Spacing.xxl },
  priorityRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  priorityChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: 999,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  priorityChipText: { fontSize: FontSize.small, fontWeight: '700' },
  prefHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  prefTitle: { fontSize: FontSize.label, fontWeight: '800' },
  prefChips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  prefChip: { borderRadius: 999, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  prefChipText: { fontSize: FontSize.caption, fontWeight: '700' },
  prefLink: { fontSize: FontSize.small, fontWeight: '700', marginTop: Spacing.sm },
  prefEmptyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  prefEmptyText: { flex: 1, fontSize: FontSize.small, fontWeight: '600' },
});
