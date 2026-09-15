import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';
import type { Activity } from '@/types/trip';

interface RouteMapProps {
  activities: Activity[];
  accent: string;
}

/** Web placeholder — react-native-maps is native only. */
export function RouteMap({ activities, accent }: RouteMapProps) {
  const t = useTheme();

  const hasCoords = activities.some((a) => a.lat != null && a.lng != null);

  if (!hasCoords) {
    return null;
  }

  return (
    <View style={[styles.container, { borderColor: t.hairline, backgroundColor: t.card }]}>
      <View style={styles.placeholder}>
        <Text style={[styles.placeholderText, { color: t.textSecondary }]}>
          Route map available on iOS & Android
        </Text>
        <Text style={[styles.placeholderSub, { color: t.textSecondary }]}>
          Open this trip on your phone to see the map
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.md,
  },
  placeholder: {
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  placeholderText: {
    fontSize: 14,
    fontWeight: '700',
  },
  placeholderSub: {
    fontSize: 12,
  },
});