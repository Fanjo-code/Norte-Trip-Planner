import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';
import { FontSize, Spacing } from '@/constants/theme';

/** Five-star rating row with the numeric value. */
export function Rating({ value, showValue = true }: { value: number; showValue?: boolean }) {
  const t = useTheme();
  const full = Math.floor(value);
  const hasHalf = value - full >= 0.25 && value - full < 0.75;
  const empty = 5 - full - (hasHalf ? 1 : 0);

  return (
    <View style={styles.row}>
      {Array.from({ length: full }).map((_, i) => (
        <Ionicons key={`full-${i}`} name="star" size={12} color={t.rating} />
      ))}
      {hasHalf ? <Ionicons name="star-half" size={12} color={t.rating} /> : null}
      {Array.from({ length: empty }).map((_, i) => (
        <Ionicons key={`empty-${i}`} name="star-outline" size={12} color={t.rating} />
      ))}
      {showValue ? (
        <Text style={[styles.value, { color: t.text }]}>{value.toFixed(1)}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  value: {
    fontSize: FontSize.small,
    fontWeight: '700',
    marginLeft: Spacing.xs,
  },
});
