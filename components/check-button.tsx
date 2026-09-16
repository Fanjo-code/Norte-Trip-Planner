import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Platform, Pressable } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
export function CheckButton({
  checked,
  onToggle,
  label,
}: {
  checked: boolean;
  onToggle: () => void;
  label?: string;
}) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label ?? (checked ? 'Mark as not visited' : 'Mark as visited')}
      accessibilityState={{ checked }}
      hitSlop={8}
      onPress={(e) => {
        e.stopPropagation();
        if (Platform.OS === 'ios')
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onToggle();
      }}
      style={({ pressed }) => ({
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: checked ? t.accent : t.icon,
        backgroundColor: checked ? t.accent : 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.65 : 1,
      })}
    >
      <Ionicons
        name={checked ? 'checkmark' : 'add'}
        size={16}
        color={checked ? t.badgeText : t.icon}
      />
    </Pressable>
  );
}
