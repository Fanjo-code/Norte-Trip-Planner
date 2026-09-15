import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { FontSize, Spacing } from '@/constants/theme';

interface StatTileProps {
  value: string;
  label: string;
}

export function StatTile({ value, label }: StatTileProps) {
  const t = useTheme();

  return (
    <View style={styles.base}>
      <Text style={[styles.value, { color: t.text }]}>{value}</Text>
      <Text style={[styles.label, { color: t.textSecondary }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  value: {
    fontSize: FontSize.title,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  label: {
    fontSize: FontSize.caption,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
