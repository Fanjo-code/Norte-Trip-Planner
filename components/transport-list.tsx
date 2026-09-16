import { Ionicons } from '@expo/vector-icons';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Chip } from '@/components/tags';
import { useTheme } from '@/hooks/use-theme';
import { FontSize, Radius, Spacing } from '@/constants/theme';
import type { TransportOption } from '@/types/trip';

/** Reference list of how to get around — shown on the Overview screen. */
export function TransportList({ transport }: { transport: TransportOption[] }) {
  const recommended = transport.find((o) => o.isRecommended);
  const others = transport.filter((o) => !o.isRecommended);

  return (
    <View style={styles.list}>
      {recommended ? <TransportCard option={recommended} highlighted /> : null}
      {others.map((o) => (
        <TransportCard key={o.id} option={o} />
      ))}
    </View>
  );
}

function TransportCard({
  option,
  highlighted = false,
}: {
  option: TransportOption;
  highlighted?: boolean;
}) {
  const t = useTheme();

  return (
    <Pressable onPress={() => option.url && Linking.openURL(option.url).catch(() => {})}>
      <Card
        elevated={highlighted}
        style={[styles.card, highlighted ? { borderColor: t.accent, borderWidth: 1.5 } : undefined]}
      >
        <View style={styles.content}>
          <View style={[styles.iconWrap, { backgroundColor: t.accentSoft }]}>
            <Ionicons name={option.icon} size={24} color={t.accent} />
          </View>
          <View style={styles.info}>
            <Text style={[styles.name, { color: t.text }]} numberOfLines={1}>
              {option.name}
            </Text>
            <Text style={[styles.desc, { color: t.textSecondary }]} numberOfLines={2}>
              {option.description}
            </Text>
            <View style={styles.bottomRow}>
              <Text style={[styles.cost, { color: t.accent }]}>{option.cost}</Text>
              <Chip label={option.bestFor} tone="accent" />
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.md,
  },
  card: {
    padding: Spacing.md,
  },
  content: {
    flexDirection: 'row',
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: Spacing.xs,
    minWidth: 0,
  },
  name: {
    fontSize: FontSize.label,
    fontWeight: '800',
  },
  desc: {
    fontSize: FontSize.small,
    lineHeight: 19,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
    flexWrap: 'wrap',
  },
  cost: {
    fontSize: FontSize.small,
    fontWeight: '700',
    flexShrink: 0,
  },
});
