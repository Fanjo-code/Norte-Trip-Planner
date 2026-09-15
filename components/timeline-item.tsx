import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { CheckButton } from '@/components/check-button';
import { useTheme } from '@/hooks/use-theme';
import { formatPrice } from '@/lib/format';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import type { Activity } from '@/types/trip';

interface TimelineItemProps {
  activity: Activity;
  isFirst?: boolean;
  isLast?: boolean;
  checked?: boolean;
  onToggle?: () => void;
}

/** A single row in the day-by-day itinerary timeline. */
export function TimelineItem({
  activity,
  isFirst = false,
  isLast = false,
  checked = false,
  onToggle,
}: TimelineItemProps) {
  const t = useTheme();

  return (
    <View style={styles.row}>
      <View style={styles.timeCol}>
        <Text style={[styles.time, { color: t.textSecondary }]}>{activity.time}</Text>
      </View>

      <View style={styles.rail}>
        {!isFirst ? <View style={[styles.line, { backgroundColor: t.hairline }]} /> : null}
        <View style={[styles.dot, { backgroundColor: checked ? t.accent : t.hairline }]} />
        {!isLast ? <View style={[styles.line, { backgroundColor: t.hairline }]} /> : null}
      </View>

      <View style={styles.body}>
        <View style={[styles.card, { backgroundColor: t.card, borderColor: t.hairline }]}>
          <View style={styles.cardHeader}>
            <View style={[styles.iconWrap, { backgroundColor: t.accentSoft }]}>
              <Ionicons name={activity.icon} size={18} color={t.accent} />
            </View>
            <View style={[styles.cardText, checked && { opacity: 0.55 }]}>
              <View style={styles.topRow}>
                <Text style={[styles.title, { color: t.text }]}>{activity.title}</Text>
                {activity.price > 0 ? (
                  <Text style={[styles.price, { color: t.textSecondary }]}>
                    {formatPrice(activity.price)}
                  </Text>
                ) : null}
              </View>
              <Text style={[styles.place, { color: t.textSecondary }]}>
                <Ionicons name="location" size={11} color={t.icon} /> {activity.place}
              </Text>
            </View>
            {onToggle ? (
              <CheckButton checked={checked} onToggle={onToggle} />
            ) : null}
          </View>
          <Text
            style={[
              styles.desc,
              { color: t.textSecondary, opacity: checked ? 0.55 : 1 },
            ]}>
            {activity.description}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  timeCol: {
    width: 44,
    paddingTop: Spacing.lg + 2,
    alignItems: 'flex-end',
  },
  time: {
    fontSize: FontSize.caption,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  rail: {
    alignItems: 'center',
    width: 18,
  },
  line: {
    flex: 1,
    width: 2,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginVertical: Spacing.sm,
  },
  body: {
    flex: 1,
    paddingBottom: Spacing.md,
  },
  card: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: FontSize.body,
    fontWeight: '700',
  },
  price: {
    fontSize: FontSize.small,
    fontWeight: '700',
  },
  place: {
    fontSize: FontSize.small,
  },
  desc: {
    fontSize: FontSize.small,
    lineHeight: 19,
  },
});
