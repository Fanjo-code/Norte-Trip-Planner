import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
export function Rating({ value, showValue = true }: { value: number | null; showValue?: boolean }) {
  const t = useTheme();
  if (value == null || !Number.isFinite(value) || value < 0 || value > 5) return null;
  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
      <Ionicons name="star" size={12} color={t.rating} />
      {showValue && <Text style={{ fontSize: 12, color: t.text }}>{value.toFixed(1)}</Text>}
    </View>
  );
}
