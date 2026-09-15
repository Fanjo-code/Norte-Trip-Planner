import { Pressable, StyleSheet, Text, type PressableProps, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';
import { Radius, Spacing } from '@/constants/theme';
import type { IoniconName } from '@/types/trip';

interface PrimaryButtonProps extends Omit<PressableProps, 'style'> {
  label: string;
  icon?: IoniconName;
  /** Extra static styles applied to the button. */
  style?: ViewStyle;
}

export function PrimaryButton({ label, icon, style, disabled, onPress, ...rest }: PrimaryButtonProps) {
  const t = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: t.accent, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        style,
      ]}
      {...rest}>

      <Text style={styles.label}>{label}</Text>
      {icon ? <Ionicons name={icon} size={18} color="#FFFFFF" /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
