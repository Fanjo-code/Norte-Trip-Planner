import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import type { IoniconName } from '@/types/trip';

interface ScreenHeaderProps {
  icon: IoniconName;
  title: string;
  subtitle: string;
}

/** Compact page header used on the trip tab screens. */
export function ScreenHeader({ icon, title, subtitle }: ScreenHeaderProps) {
  const t = useTheme();

  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: t.accentSoft }]}>
        <Ionicons name={icon} size={22} color={t.accent} />
      </View>
      <View style={styles.grow}>
        <Text style={[styles.title, { color: t.text }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: t.textSecondary }]}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: {
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
  },
});
