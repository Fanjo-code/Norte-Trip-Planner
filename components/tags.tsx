import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';

type ChipTone = 'default' | 'accent' | 'solid';

/** Small rounded tag used for categories, cuisines and prices. */
export function Chip({ label, tone = 'default' }: { label: string; tone?: ChipTone }) {
  const t = useTheme();
  const background = tone === 'default' ? t.hairline : tone === 'accent' ? t.accentSoft : t.accent;
  const foreground =
    tone === 'solid' ? t.badgeText : tone === 'accent' ? t.accent : t.textSecondary;

  return (
    <View style={[styles.chip, { backgroundColor: background }]}>
      <Text style={[styles.label, { color: foreground }]}>{label}</Text>
    </View>
  );
}

/** Solid accent pill for highlights like "Best", "Must-try", "Recommended". */
export function Badge({ label }: { label: string }) {
  const t = useTheme();

  return (
    <View style={[styles.badge, { backgroundColor: t.badge }]}>
      <Ionicons name="sparkles" size={10} color={t.badgeText} />
      <Text style={[styles.badgeLabel, { color: t.badgeText }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    borderRadius: 999,
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
